#!/usr/bin/env bash
# db-restore.sh — Restore PostgreSQL / MongoDB / Redis / MinIO từ bản dump
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/dumps"
RCLONE_BIN="$(dirname "$SCRIPT_DIR")/codebackup/rclone_bin"
[[ ! -f "$RCLONE_BIN" ]] && RCLONE_BIN="$(which rclone 2>/dev/null || echo '')"

# Parse --disk / --gdrive arguments
_DISK_OVERRIDE=""
_GDRIVE_REMOTE=""
_GDRIVE_TMP=""
_POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --disk)   _DISK_OVERRIDE="${2:-}";   shift 2 ;;
    --gdrive) _GDRIVE_REMOTE="${2:-}";   shift 2 ;;
    *) _POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${_POSITIONAL[@]+"${_POSITIONAL[@]}"}"

# Ưu tiên: gdrive > disk > local
if [[ -n "$_GDRIVE_REMOTE" ]]; then
  if [[ -z "$RCLONE_BIN" ]] || ! command -v "$RCLONE_BIN" &>/dev/null && [[ ! -f "$RCLONE_BIN" ]]; then
    echo -e "\033[0;31m✗\033[0m Không tìm thấy rclone — không thể restore từ Drive" >&2; exit 1
  fi
  # Tìm session backup mới nhất trên Drive
  echo -e "\033[1;33m→\033[0m Tìm kiếm backup trên Drive: ${_GDRIVE_REMOTE}:"
  _LATEST_SESSION=""
  while IFS= read -r line; do
    local_name=$(echo "$line" | awk '{print $NF}')
    if [[ "$local_name" == lms_backup_* ]]; then
      _LATEST_SESSION="$local_name"
      break
    fi
  done < <("$RCLONE_BIN" lsd "${_GDRIVE_REMOTE}:" 2>/dev/null | sort -rk5)

  if [[ -z "$_LATEST_SESSION" ]]; then
    echo -e "\033[0;31m✗\033[0m Không tìm thấy backup nào trên Drive ${_GDRIVE_REMOTE}:" >&2; exit 1
  fi

  _GDRIVE_TMP="/tmp/lms_gdrive_restore_$$"
  mkdir -p "$_GDRIVE_TMP"
  echo -e "\033[1;33m→\033[0m Tải xuống: ${_GDRIVE_REMOTE}:${_LATEST_SESSION}/ → ${_GDRIVE_TMP}"
  "$RCLONE_BIN" copy "${_GDRIVE_REMOTE}:${_LATEST_SESSION}/" "$_GDRIVE_TMP/" 2>&1 || {
    echo -e "\033[0;31m✗\033[0m Tải xuống từ Drive thất bại" >&2
    rm -rf "$_GDRIVE_TMP"; exit 1
  }
  echo -e "\033[0;32m✓\033[0m Đã tải từ Drive: ${_LATEST_SESSION}"
  DUMP_DIR="$_GDRIVE_TMP"

elif [[ -n "$_DISK_OVERRIDE" ]]; then
  if [[ ! -d "$_DISK_OVERRIDE" ]]; then
    echo -e "\033[0;31m✗\033[0m Đường dẫn không tồn tại: $_DISK_OVERRIDE" >&2; exit 1
  fi
  DUMP_DIR="$_DISK_OVERRIDE"

  # Tự chọn session mới nhất nếu có
  _LATEST=$(ls -dt "$DUMP_DIR"/lms_backup_* 2>/dev/null | head -1 || true)
  [[ -n "$_LATEST" ]] && DUMP_DIR="$_LATEST" && echo -e "\033[1;33m→\033[0m Dùng session: $(basename "$DUMP_DIR")"
fi

# Dọn thư mục tạm khi thoát
[[ -n "$_GDRIVE_TMP" ]] && trap 'rm -rf "$_GDRIVE_TMP"' EXIT

# ── Màu ──────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()      { echo -e "${GREEN}✓${NC} $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
info()    { echo -e "${YELLOW}→${NC} $*"; }
heading() { echo -e "\n${BOLD}${CYAN}$*${NC}"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }

# ── Liệt kê ổ/phân vùng để chọn ─────────────────────────────────────────────
_pick_drive_restore() {
  # df -hT: $1=filesystem $2=type $3=size $4=used $5=avail $6=use% $7=mountpoint
  local mounts=() sizes=() avails=() fstypes=()
  while IFS= read -r line; do
    local fstype size avail mp
    fstype=$(echo "$line" | awk '{print $2}')
    size=$(echo  "$line" | awk '{print $3}')
    avail=$(echo "$line" | awk '{print $5}')
    mp=$(echo   "$line" | awk '{print $7}')
    mounts+=("$mp"); sizes+=("$size"); avails+=("$avail"); fstypes+=("$fstype")
  done < <(df -hT 2>/dev/null | awk 'NR>1' \
    | grep -vE '^(tmpfs|devtmpfs|overlay|squashfs|none|udev)|/dev/loop' \
    | grep -vE '/proc|/sys|/run/user|/snap' \
    | sort -k7)

  local disk_path=""
  if [[ ${#mounts[@]} -eq 0 ]]; then
    read -rp "  Nhập đường dẫn ổ cứng: " disk_path
  else
    echo ""
    echo -e "  ${BOLD}Chọn ổ/phân vùng nguồn:${NC}"
    for i in "${!mounts[@]}"; do
      local label=""
      [[ "${mounts[$i]}" == "/" ]] && label=" ${YELLOW}(hệ thống)${NC}"
      printf "  ${CYAN}[%d]${NC} %-28s  %s  %s còn trống%b\n" \
        "$((i+1))" "${mounts[$i]}" "${fstypes[$i]}" "${avails[$i]}" "$label"
    done
    echo -e "  ${CYAN}[m]${NC} Nhập đường dẫn thủ công"
    echo -e "  ${CYAN}[0]${NC} Hủy"
    echo ""
    read -rp "  Chọn [0-${#mounts[@]}/m]: " drive_choice || true

    if [[ "$drive_choice" == "0" || -z "$drive_choice" ]]; then
      info "Đã hủy — dùng dumps cục bộ."; return
    elif [[ "$drive_choice" == "m" || "$drive_choice" == "M" ]]; then
      read -rp "  Nhập đường dẫn: " disk_path
    elif [[ "$drive_choice" =~ ^[0-9]+$ ]] && (( drive_choice >= 1 && drive_choice <= ${#mounts[@]} )); then
      disk_path="${mounts[$((drive_choice-1))]}"
    else
      err "Lựa chọn không hợp lệ"; exit 1
    fi
  fi

  disk_path="${disk_path%/}"
  [[ -d "$disk_path" ]] || { err "Đường dẫn không tồn tại: $disk_path"; exit 1; }

  # Tìm các phiên lms_backup_* trong thư mục đã chọn
  local sessions=()
  while IFS= read -r d; do sessions+=("$d"); done \
    < <(ls -dt "$disk_path"/lms_backup_* 2>/dev/null || true)

  if [[ ${#sessions[@]} -gt 0 ]]; then
    echo ""
    echo -e "  Các phiên backup có sẵn:"
    for i in "${!sessions[@]}"; do
      local size; size=$(du -sh "${sessions[$i]}" 2>/dev/null | cut -f1)
      printf "  ${CYAN}[%d]${NC} %-45s %s\n" "$((i+1))" "$(basename "${sessions[$i]}")" "$size"
    done
    echo -e "  ${CYAN}[0]${NC} Dùng thư mục gốc trực tiếp"
    echo ""
    read -rp "  Chọn phiên [0-${#sessions[@]}]: " sess_choice || true
    if [[ "$sess_choice" =~ ^[0-9]+$ ]] && (( sess_choice >= 1 && sess_choice <= ${#sessions[@]} )); then
      DUMP_DIR="${sessions[$((sess_choice-1))]}"
    else
      DUMP_DIR="$disk_path"
    fi
  else
    DUMP_DIR="$disk_path"
  fi
  ok "Nguồn restore: $DUMP_DIR"
}

# ── Chọn nguồn restore ───────────────────────────────────────────────────────
select_source() {
  echo ""
  echo -e "  ${BOLD}Chọn nguồn restore:${NC}"
  echo -e "  ${CYAN}[1]${NC} Từ thư mục dumps cục bộ  (${DUMP_DIR})"
  echo -e "  ${CYAN}[2]${NC} Từ ổ/drive ngoài"
  echo -e "  ${CYAN}[0]${NC} Thoát"
  echo ""
  read -rp "  Chọn [0-2]: " src_choice
  case "$src_choice" in
    1) ;;
    2) _pick_drive_restore ;;
    0) echo "Thoát."; exit 0 ;;
    *) err "Lựa chọn không hợp lệ"; exit 1 ;;
  esac
}

# ── Chọn file từ danh sách ───────────────────────────────────────────────────
# Tất cả display output → >&2 để không bị capture khi gọi qua $()
pick_file() {
  local dir="$1" pattern="$2" label="$3"
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(ls -t "$dir"/$pattern 2>/dev/null)
  if [[ ${#files[@]} -eq 0 ]]; then
    err "Không tìm thấy bản dump nào trong $dir"
    return 1
  fi
  echo "" >&2
  echo -e "  Các bản $label có sẵn:" >&2
  for i in "${!files[@]}"; do
    local size
    size=$(du -sh "${files[$i]}" 2>/dev/null | cut -f1)
    printf "  ${CYAN}[%d]${NC} %s  ${GREEN}%s${NC}\n" \
      "$((i+1))" "$(basename "${files[$i]}")" "$size" >&2
  done
  echo -e "  ${CYAN}[0]${NC} Hủy" >&2
  echo "" >&2
  local choice
  read -rp "  Chọn [0-${#files[@]}]: " choice || true
  if [[ "$choice" == "0" || -z "$choice" ]]; then return 1; fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#files[@]} )); then
    err "Lựa chọn không hợp lệ" >&2; return 1
  fi
  echo "${files[$((choice-1))]}"
}

# ── Xác nhận nguy hiểm ───────────────────────────────────────────────────────
confirm() {
  warn "$1"
  read -rp "  Nhập 'yes' để xác nhận: " ans
  [[ "$ans" == "yes" ]]
}

# ── RESTORE POSTGRESQL ────────────────────────────────────────────────────────
restore_postgres() {
  heading "=== RESTORE PostgreSQL ==="
  local file
  file=$(pick_file "$DUMP_DIR/postgres" "*.sql.gz" "PostgreSQL") || return 0

  echo ""
  info "File: $(basename "$file")"
  confirm "Toàn bộ dữ liệu trong database 'mydb' sẽ bị XÓA và thay thế!" || { info "Đã hủy."; return 0; }

  info "Đang restore PostgreSQL..."
  # Drop và tạo lại database
  docker exec lms_postgres psql -U admin -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='mydb' AND pid<>pg_backend_pid();" \
    > /dev/null 2>&1 || true
  docker exec lms_postgres psql -U admin -d postgres -c "DROP DATABASE IF EXISTS mydb;" > /dev/null 2>&1
  docker exec lms_postgres psql -U admin -d postgres -c "CREATE DATABASE mydb OWNER admin;" > /dev/null 2>&1

  # Restore
  if zcat "$file" | docker exec -i lms_postgres psql -U admin -d mydb -q > /dev/null 2>&1; then
    ok "PostgreSQL restore thành công từ $(basename "$file")"
  else
    err "PostgreSQL restore thất bại"; return 1
  fi
}

# ── RESTORE MONGODB ───────────────────────────────────────────────────────────
restore_mongo() {
  heading "=== RESTORE MongoDB ==="
  local file
  file=$(pick_file "$DUMP_DIR/mongo" "*.archive.gz" "MongoDB") || return 0

  echo ""
  info "File: $(basename "$file")"
  confirm "Toàn bộ dữ liệu trong database 'mongo_du' sẽ bị XÓA và thay thế!" || { info "Đã hủy."; return 0; }

  info "Đang restore MongoDB..."
  if docker exec -i lms_mongo mongorestore \
      -u admin \
      -p "2c6206fb8880eed9722ffb95694f7b7e72f10cfad6c78d45c8cfdea34e3f00e0" \
      --authenticationDatabase admin \
      --db mongo_du \
      --drop \
      --archive \
      --gzip \
      --quiet \
      < "$file" 2>/dev/null; then
    ok "MongoDB restore thành công từ $(basename "$file")"
  else
    err "MongoDB restore thất bại"; return 1
  fi
}

# ── RESTORE REDIS ─────────────────────────────────────────────────────────────
restore_redis() {
  heading "=== RESTORE Redis ==="
  local file
  file=$(pick_file "$DUMP_DIR/redis" "*.rdb.gz" "Redis") || return 0

  echo ""
  info "File: $(basename "$file")"
  confirm "Toàn bộ dữ liệu Redis hiện tại sẽ bị XÓA và thay thế!" || { info "Đã hủy."; return 0; }

  info "Đang restore Redis..."
  # Dừng ghi, copy file, khởi động lại
  docker exec redis_du redis-cli \
    -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
    --no-auth-warning CONFIG SET save "" > /dev/null 2>&1 || true

  local tmp="/tmp/dump_restore_$$.rdb"
  zcat "$file" > "$tmp"
  docker cp "$tmp" redis_du:/data/dump.rdb
  rm -f "$tmp"

  docker restart redis_du > /dev/null 2>&1
  sleep 2

  if docker exec redis_du redis-cli \
      -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
      --no-auth-warning PING > /dev/null 2>&1; then
    local keys
    keys=$(docker exec redis_du redis-cli \
      -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
      --no-auth-warning DBSIZE 2>/dev/null)
    ok "Redis restore thành công — $keys keys từ $(basename "$file")"
  else
    err "Redis không phản hồi sau restore"; return 1
  fi
}

# ── RESTORE MINIO ─────────────────────────────────────────────────────────────
restore_minio() {
  heading "=== RESTORE MinIO ==="
  if [[ ! -f "$RCLONE_BIN" ]]; then
    err "Không tìm thấy rclone binary"; return 1
  fi

  local minio_dump="$DUMP_DIR/minio"
  if [[ ! -d "$minio_dump" ]]; then
    err "Không tìm thấy $minio_dump"; return 1
  fi

  local buckets=()
  while IFS= read -r d; do buckets+=("$(basename "$d")"); done < <(ls -d "$minio_dump"/*/ 2>/dev/null)
  if [[ ${#buckets[@]} -eq 0 ]]; then
    err "Không có bucket nào trong $minio_dump"; return 1
  fi

  echo ""
  echo -e "  Buckets có sẵn:"
  for i in "${!buckets[@]}"; do
    local count
    count=$(find "$minio_dump/${buckets[$i]}" -type f 2>/dev/null | wc -l)
    printf "  ${CYAN}[%d]${NC} %-30s %d files\n" "$((i+1))" "${buckets[$i]}" "$count"
  done
  printf "  ${CYAN}[%d]${NC} Tất cả buckets\n" "$((${#buckets[@]}+1))"
  echo -e "  ${CYAN}[0]${NC} Hủy"
  echo ""
  local choice
  read -rp "  Chọn [0-$((${#buckets[@]}+1))]: " choice || true

  [[ "$choice" == "0" || -z "$choice" ]] && { info "Đã hủy."; return 0; }

  local selected=()
  if (( choice == ${#buckets[@]}+1 )); then
    selected=("${buckets[@]}")
  elif [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#buckets[@]} )); then
    selected=("${buckets[$((choice-1))]}")
  else
    err "Lựa chọn không hợp lệ"; return 1
  fi

  echo ""
  confirm "Files trong bucket(s) [${selected[*]}] trên MinIO sẽ bị ghi đè!" || { info "Đã hủy."; return 0; }

  info "Đang restore MinIO..."
  local ok_count=0 fail_count=0
  for bucket in "${selected[@]}"; do
    local src="$minio_dump/$bucket"
    if "$RCLONE_BIN" sync "$src" "minio:$bucket" \
        --transfers 4 --checkers 8 -q 2>/dev/null; then
      local count; count=$(find "$src" -type f | wc -l)
      ok "MinIO $bucket ← $src ($count files)"
      ok_count=$((ok_count+1))
    else
      err "MinIO $bucket restore thất bại"
      fail_count=$((fail_count+1))
    fi
  done
  [[ $fail_count -eq 0 ]] && ok "MinIO: $ok_count bucket(s) restore OK"
}

# ── MENU CHÍNH ────────────────────────────────────────────────────────────────
main_menu() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║         LMS — DB RESTORE TOOL        ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
  echo -e "  Nguồn: ${CYAN}${DUMP_DIR}${NC}"
  echo ""
  echo -e "  ${CYAN}[1]${NC} Restore PostgreSQL"
  echo -e "  ${CYAN}[2]${NC} Restore MongoDB"
  echo -e "  ${CYAN}[3]${NC} Restore Redis"
  echo -e "  ${CYAN}[4]${NC} Restore MinIO (files/media)"
  echo -e "  ${CYAN}[5]${NC} Restore TẤT CẢ (theo thứ tự)"
  echo -e "  ${CYAN}[0]${NC} Thoát"
  echo ""
  read -rp "  Chọn [0-5]: " choice

  case "$choice" in
    1) restore_postgres ;;
    2) restore_mongo ;;
    3) restore_redis ;;
    4) restore_minio ;;
    5)
      restore_postgres
      restore_mongo
      restore_redis
      restore_minio
      ;;
    0) echo "Thoát."; exit 0 ;;
    *) err "Lựa chọn không hợp lệ" ;;
  esac

  echo ""
  read -rp "  Tiếp tục restore? [y/N]: " again
  [[ "$again" =~ ^[yY]$ ]] && main_menu
}

# ── Cho phép gọi thẳng từ argument ───────────────────────────────────────────
case "${1:-menu}" in
  postgres) restore_postgres ;;
  mongo)    restore_mongo ;;
  redis)    restore_redis ;;
  minio)    restore_minio ;;
  all)
    restore_postgres
    restore_mongo
    restore_redis
    restore_minio
    ;;
  menu|*)
    [[ -z "$_DISK_OVERRIDE" ]] && select_source
    main_menu
    ;;
esac
