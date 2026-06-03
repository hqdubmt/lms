#!/usr/bin/env bash
# db-backup.sh — Backup PostgreSQL, MongoDB, Redis, MinIO
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/dumps"
KEEP_DAYS="${KEEP_DAYS:-7}"
TS="$(date '+%Y-%m-%d_%H-%M-%S')"
DISK_DEST="${DISK_DEST:-}"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-}"
RCLONE_BIN="$(dirname "$SCRIPT_DIR")/codebackup/rclone_bin"
[[ ! -f "$RCLONE_BIN" ]] && RCLONE_BIN="$(which rclone 2>/dev/null || echo '')"

# Parse --disk / --gdrive arguments
_POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --disk)   DISK_DEST="${2:-}";    shift 2 ;;
    --gdrive) GDRIVE_REMOTE="${2:-}"; shift 2 ;;
    *) _POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${_POSITIONAL[@]+"${_POSITIONAL[@]}"}"

# ── Màu terminal ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()      { echo -e "${GREEN}✓${NC} $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
info()    { echo -e "${YELLOW}→${NC} $*"; }
heading() { echo -e "\n${BOLD}${CYAN}$*${NC}"; }

ERRORS=0
PG_FILE=""; MONGO_FILE=""; REDIS_FILE=""; MINIO_DEST=""

# ── Liệt kê các ổ/phân vùng đang mount ──────────────────────────────────────
list_drives() {
  # Lấy danh sách mount points thực (bỏ qua tmpfs, devtmpfs, overlay, loop, sysfs...)
  local drives=()
  while IFS= read -r line; do
    local mp size avail fstype
    mp=$(echo "$line" | awk '{print $6}')
    size=$(echo "$line" | awk '{print $2}')
    avail=$(echo "$line" | awk '{print $4}')
    fstype=$(echo "$line" | awk '{print $1}')
    drives+=("$mp|$size|$avail|$fstype")
  done < <(df -hT 2>/dev/null | awk 'NR>1' \
    | grep -vE '^(tmpfs|devtmpfs|overlay|squashfs|nsfs|cgroupfs|none|udev|sysfs|proc|devpts|hugetlbfs|mqueue|pstore|cgroup|bpf|tracefs|debugfs|fusectl|efivarfs)|/dev/loop|/proc|/sys|/run/user' \
    | sort -k6)
  echo "${drives[@]}"
}

# ── Chọn đích backup ─────────────────────────────────────────────────────────
select_dest() {
  echo ""
  echo -e "  ${BOLD}Chọn đích lưu backup:${NC}"
  echo -e "  ${CYAN}[1]${NC} Chỉ lưu cục bộ  (${DUMP_DIR})"
  echo -e "  ${CYAN}[2]${NC} Lưu cục bộ + sao chép ra ổ/drive ngoài"
  echo -e "  ${CYAN}[0]${NC} Thoát"
  echo ""
  read -rp "  Chọn [0-2]: " dest_choice
  case "$dest_choice" in
    1) ;;
    2) _pick_drive ;;
    0) echo "Thoát."; exit 0 ;;
    *) err "Lựa chọn không hợp lệ"; exit 1 ;;
  esac
}

_pick_drive() {
  # Thu thập danh sách ổ  (df -hT: $1=fs $2=type $3=size $4=used $5=avail $6=use% $7=mountpoint)
  local mounts=() sizes=() avails=() fstypes=()
  while IFS= read -r line; do
    local mp size avail fstype
    fstype=$(echo "$line" | awk '{print $2}')
    size=$(echo  "$line" | awk '{print $3}')
    avail=$(echo "$line" | awk '{print $5}')
    mp=$(echo   "$line" | awk '{print $7}')
    mounts+=("$mp"); sizes+=("$size"); avails+=("$avail"); fstypes+=("$fstype")
  done < <(df -hT 2>/dev/null | awk 'NR>1' \
    | grep -vE '^(tmpfs|devtmpfs|overlay|squashfs|nsfs|none|udev)|/dev/loop' \
    | grep -vE '/proc|/sys|/run/user|/snap' \
    | sort -k7)

  if [[ ${#mounts[@]} -eq 0 ]]; then
    warn "Không tìm thấy ổ nào. Nhập đường dẫn thủ công:"
    read -rp "  Đường dẫn: " disk_path
    disk_path="${disk_path%/}"
    [[ -d "$disk_path" ]] || { err "Đường dẫn không tồn tại: $disk_path"; exit 1; }
    DISK_DEST="$disk_path"; ok "Sẽ sao chép sang: $DISK_DEST"; return
  fi

  echo ""
  echo -e "  ${BOLD}Chọn ổ/phân vùng đích:${NC}"
  for i in "${!mounts[@]}"; do
    local label=""
    [[ "${mounts[$i]}" == "/" ]]      && label=" ${YELLOW}(hệ thống)${NC}"
    [[ "${mounts[$i]}" == "$SCRIPT_DIR"* ]] && label=" ${YELLOW}(thư mục hiện tại)${NC}"
    printf "  ${CYAN}[%d]${NC} %-28s  %s  %s còn trống  %s%b\n" \
      "$((i+1))" "${mounts[$i]}" "${fstypes[$i]}" "${avails[$i]}" "${sizes[$i]}" "$label"
  done
  echo -e "  ${CYAN}[m]${NC} Nhập đường dẫn thủ công"
  echo -e "  ${CYAN}[0]${NC} Hủy"
  echo ""
  read -rp "  Chọn [0-${#mounts[@]}/m]: " drive_choice

  if [[ "$drive_choice" == "0" || -z "$drive_choice" ]]; then
    info "Đã hủy chọn ổ — chỉ lưu cục bộ."; return
  elif [[ "$drive_choice" == "m" || "$drive_choice" == "M" ]]; then
    read -rp "  Nhập đường dẫn: " disk_path
    disk_path="${disk_path%/}"
    [[ -d "$disk_path" ]] || { err "Đường dẫn không tồn tại: $disk_path"; exit 1; }
    DISK_DEST="$disk_path"
  elif [[ "$drive_choice" =~ ^[0-9]+$ ]] && (( drive_choice >= 1 && drive_choice <= ${#mounts[@]} )); then
    DISK_DEST="${mounts[$((drive_choice-1))]}"
  else
    err "Lựa chọn không hợp lệ"; exit 1
  fi
  ok "Sẽ sao chép sang: $DISK_DEST"
}

# ── BACKUP POSTGRESQL ─────────────────────────────────────────────────────────
backup_postgres() {
  heading "=== BACKUP PostgreSQL ==="
  local pg_dir="$DUMP_DIR/postgres"
  mkdir -p "$pg_dir"
  PG_FILE="$pg_dir/mydb_${TS}.sql.gz"
  if docker exec lms_postgres pg_dump \
      -U admin --no-password -d mydb \
      --format=plain --no-owner --no-acl \
    2>/dev/null | gzip > "$PG_FILE"; then
    local size; size=$(du -sh "$PG_FILE" | cut -f1)
    ok "PostgreSQL → $PG_FILE ($size)"
  else
    err "PostgreSQL dump thất bại"
    rm -f "$PG_FILE"; PG_FILE=""
    ERRORS=$((ERRORS+1))
  fi
}

# ── BACKUP MONGODB ────────────────────────────────────────────────────────────
backup_mongo() {
  heading "=== BACKUP MongoDB ==="
  local mongo_dir="$DUMP_DIR/mongo"
  mkdir -p "$mongo_dir"
  MONGO_FILE="$mongo_dir/mongo_du_${TS}.archive.gz"
  if docker exec lms_mongo mongodump \
      -u admin \
      -p "2c6206fb8880eed9722ffb95694f7b7e72f10cfad6c78d45c8cfdea34e3f00e0" \
      --authenticationDatabase admin \
      --db mongo_du --archive --gzip --quiet \
    > "$MONGO_FILE" 2>/dev/null; then
    local size; size=$(du -sh "$MONGO_FILE" | cut -f1)
    ok "MongoDB → $MONGO_FILE ($size)"
  else
    err "MongoDB dump thất bại"
    rm -f "$MONGO_FILE"; MONGO_FILE=""
    ERRORS=$((ERRORS+1))
  fi
}

# ── BACKUP REDIS ──────────────────────────────────────────────────────────────
backup_redis() {
  heading "=== BACKUP Redis ==="
  local redis_dir="$DUMP_DIR/redis"
  mkdir -p "$redis_dir"
  REDIS_FILE="$redis_dir/dump_${TS}.rdb.gz"
  if docker exec redis_du redis-cli \
      -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
      --no-auth-warning BGSAVE > /dev/null 2>&1; then
    for i in $(seq 1 10); do
      local before after
      before=$(docker exec redis_du redis-cli \
        -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
        --no-auth-warning LASTSAVE 2>/dev/null)
      sleep 1
      after=$(docker exec redis_du redis-cli \
        -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
        --no-auth-warning LASTSAVE 2>/dev/null)
      [[ "$after" != "$before" ]] && break
    done
    local tmp_rdb="/tmp/redis_dump_$$.rdb"
    if docker cp redis_du:/data/dump.rdb "$tmp_rdb" 2>/dev/null && \
       gzip -c "$tmp_rdb" > "$REDIS_FILE"; then
      rm -f "$tmp_rdb"
      local size; size=$(du -sh "$REDIS_FILE" | cut -f1)
      ok "Redis → $REDIS_FILE ($size)"
    else
      err "Redis copy dump.rdb thất bại"
      rm -f "$REDIS_FILE" "$tmp_rdb"; REDIS_FILE=""
      ERRORS=$((ERRORS+1))
    fi
  else
    err "Redis BGSAVE thất bại"
    REDIS_FILE=""; ERRORS=$((ERRORS+1))
  fi
}

# ── BACKUP MINIO ──────────────────────────────────────────────────────────────
backup_minio() {
  heading "=== BACKUP MinIO ==="
  MINIO_DEST="$DUMP_DIR/minio"
  mkdir -p "$MINIO_DEST"
  if [[ -z "$RCLONE_BIN" || ! -f "$RCLONE_BIN" ]]; then
    err "Không tìm thấy rclone binary — bỏ qua MinIO"
    ERRORS=$((ERRORS+1)); return
  fi
  local minio_ok=0 minio_fail=0
  for bucket in lms-videos lms-attachments lms-avatars lms-math-docs lms-media; do
    local bucket_dest="$MINIO_DEST/$bucket"
    mkdir -p "$bucket_dest"
    if "$RCLONE_BIN" sync "minio:$bucket" "$bucket_dest" \
        --transfers 4 --checkers 8 -q 2>/dev/null; then
      local count; count=$(find "$bucket_dest" -type f | wc -l)
      ok "MinIO $bucket → $bucket_dest ($count files)"
      minio_ok=$((minio_ok+1))
    else
      err "MinIO $bucket sync thất bại"
      minio_fail=$((minio_fail+1)); ERRORS=$((ERRORS+1))
    fi
  done
  [[ $minio_fail -eq 0 ]] && ok "MinIO: tất cả $minio_ok buckets OK"
}

# ── Sao chép sang ổ cứng ─────────────────────────────────────────────────────
copy_to_disk() {
  [[ -z "$DISK_DEST" ]] && return
  if [[ ! -d "$DISK_DEST" ]]; then
    err "Đường dẫn ổ cứng không tồn tại: $DISK_DEST"
    ERRORS=$((ERRORS+1)); return
  fi
  info "Sao chép sang ổ cứng: $DISK_DEST"
  local disk_session="$DISK_DEST/lms_backup_$TS"
  mkdir -p "$disk_session"
  [[ -n "${PG_FILE:-}"    && -f "$PG_FILE" ]]    && { mkdir -p "$disk_session/postgres"; cp "$PG_FILE" "$disk_session/postgres/"; }
  [[ -n "${MONGO_FILE:-}" && -f "$MONGO_FILE" ]] && { mkdir -p "$disk_session/mongo";    cp "$MONGO_FILE" "$disk_session/mongo/"; }
  [[ -n "${REDIS_FILE:-}" && -f "$REDIS_FILE" ]] && { mkdir -p "$disk_session/redis";    cp "$REDIS_FILE" "$disk_session/redis/"; }
  [[ -n "${MINIO_DEST:-}" && -d "$MINIO_DEST" ]] && cp -r "$MINIO_DEST" "$disk_session/minio"
  local size; size=$(du -sh "$disk_session" | cut -f1)
  ok "Ổ cứng → $disk_session ($size)"
}

# ── Sao chép lên Google Drive ────────────────────────────────────────────────
copy_to_gdrive() {
  [[ -z "$GDRIVE_REMOTE" ]] && return
  if [[ -z "$RCLONE_BIN" || ! -x "$(command -v "$RCLONE_BIN" 2>/dev/null || echo "$RCLONE_BIN")" ]]; then
    err "Không tìm thấy rclone — bỏ qua Google Drive"
    ERRORS=$((ERRORS+1)); return
  fi
  local remote_path="${GDRIVE_REMOTE}lms_backup_${TS}/"
  info "Sao chép lên Google Drive: ${remote_path}"
  local gdrive_ok=0
  if [[ -n "${PG_FILE:-}" && -f "$PG_FILE" ]]; then
    "$RCLONE_BIN" copy "$PG_FILE" "${remote_path}postgres/" --quiet \
      && { ok "PostgreSQL → Drive OK"; gdrive_ok=$((gdrive_ok+1)); } \
      || { err "PostgreSQL → Drive THẤT BẠI"; ERRORS=$((ERRORS+1)); }
  fi
  if [[ -n "${MONGO_FILE:-}" && -f "$MONGO_FILE" ]]; then
    "$RCLONE_BIN" copy "$MONGO_FILE" "${remote_path}mongo/" --quiet \
      && { ok "MongoDB → Drive OK"; gdrive_ok=$((gdrive_ok+1)); } \
      || { err "MongoDB → Drive THẤT BẠI"; ERRORS=$((ERRORS+1)); }
  fi
  if [[ -n "${REDIS_FILE:-}" && -f "$REDIS_FILE" ]]; then
    "$RCLONE_BIN" copy "$REDIS_FILE" "${remote_path}redis/" --quiet \
      && { ok "Redis → Drive OK"; gdrive_ok=$((gdrive_ok+1)); } \
      || { err "Redis → Drive THẤT BẠI"; ERRORS=$((ERRORS+1)); }
  fi
  if [[ -n "${MINIO_DEST:-}" && -d "$MINIO_DEST" ]]; then
    "$RCLONE_BIN" copy "$MINIO_DEST" "${remote_path}minio/" --quiet \
      && { ok "MinIO → Drive OK"; gdrive_ok=$((gdrive_ok+1)); } \
      || { err "MinIO → Drive THẤT BẠI"; ERRORS=$((ERRORS+1)); }
  fi
  [[ $gdrive_ok -gt 0 ]] && ok "Google Drive → ${remote_path} (${gdrive_ok} dịch vụ)"
}

# ── Xoay vòng dump cũ ────────────────────────────────────────────────────────
rotate_dumps() {
  info "Xóa dump cũ hơn ${KEEP_DAYS} ngày..."
  find "$DUMP_DIR" -type f \( -name "*.gz" -o -name "*.rdb" \) \
    -mtime +${KEEP_DAYS} -delete 2>/dev/null
  ok "Xoay vòng xong"
}

# ── Tổng kết ─────────────────────────────────────────────────────────────────
summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}✓ Backup thành công${NC} — $(date '+%H:%M:%S %d/%m/%Y')"
  else
    echo -e "${RED}✗ Có $ERRORS lỗi khi backup${NC}" >&2
    exit 1
  fi
}

# ── Menu chính ────────────────────────────────────────────────────────────────
main_menu() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║          LMS — DB BACKUP TOOL        ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
  echo -e "  Cục bộ: ${CYAN}${DUMP_DIR}${NC}"
  [[ -n "$DISK_DEST" ]] && echo -e "  Ổ cứng: ${CYAN}${DISK_DEST}${NC}"
  echo ""
  echo -e "  ${CYAN}[1]${NC} Backup PostgreSQL"
  echo -e "  ${CYAN}[2]${NC} Backup MongoDB"
  echo -e "  ${CYAN}[3]${NC} Backup Redis"
  echo -e "  ${CYAN}[4]${NC} Backup MinIO (files/media)"
  echo -e "  ${CYAN}[5]${NC} Backup TẤT CẢ"
  echo -e "  ${CYAN}[0]${NC} Thoát"
  echo ""
  read -rp "  Chọn [0-5]: " choice

  ERRORS=0; PG_FILE=""; MONGO_FILE=""; REDIS_FILE=""; MINIO_DEST=""
  case "$choice" in
    1) backup_postgres; copy_to_disk; rotate_dumps ;;
    2) backup_mongo;    copy_to_disk; rotate_dumps ;;
    3) backup_redis;    copy_to_disk; rotate_dumps ;;
    4) backup_minio;    copy_to_disk ;;
    5)
      backup_postgres
      backup_mongo
      backup_redis
      backup_minio
      rotate_dumps
      copy_to_disk
      ;;
    0) echo "Thoát."; exit 0 ;;
    *) err "Lựa chọn không hợp lệ"; return ;;
  esac

  summary

  echo ""
  read -rp "  Tiếp tục backup? [y/N]: " again
  [[ "$again" =~ ^[yY]$ ]] && main_menu
}

# ── Entry point ───────────────────────────────────────────────────────────────
case "${1:-menu}" in
  postgres) backup_postgres; copy_to_disk; copy_to_gdrive; rotate_dumps; summary ;;
  mongo)    backup_mongo;    copy_to_disk; copy_to_gdrive; rotate_dumps; summary ;;
  redis)    backup_redis;    copy_to_disk; copy_to_gdrive; rotate_dumps; summary ;;
  minio)    backup_minio;    copy_to_disk; copy_to_gdrive; summary ;;
  all)
    backup_postgres
    backup_mongo
    backup_redis
    backup_minio
    rotate_dumps
    copy_to_disk
    copy_to_gdrive
    summary
    ;;
  menu|*)
    [[ -z "$DISK_DEST" ]] && select_dest
    main_menu
    ;;
esac
