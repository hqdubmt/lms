#!/usr/bin/env bash
# db-backup.sh — Backup PostgreSQL, MongoDB, Redis, MinIO
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/dumps"
KEEP_DAYS="${KEEP_DAYS:-7}"
TS="$(date '+%Y-%m-%d_%H-%M-%S')"
DISK_DEST="${DISK_DEST:-}"
RCLONE_BIN="$(dirname "$SCRIPT_DIR")/codebackup/rclone_bin"
[[ ! -f "$RCLONE_BIN" ]] && RCLONE_BIN="$(which rclone 2>/dev/null || echo '')"

# Parse --disk argument
_POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --disk) DISK_DEST="${2:-}"; shift 2 ;;
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

# ── Chọn đích backup ─────────────────────────────────────────────────────────
select_dest() {
  echo ""
  echo -e "  ${BOLD}Chọn đích lưu backup:${NC}"
  echo -e "  ${CYAN}[1]${NC} Chỉ lưu cục bộ  (${DUMP_DIR})"
  echo -e "  ${CYAN}[2]${NC} Lưu cục bộ + sao chép ra ổ cứng ngoài"
  echo -e "  ${CYAN}[0]${NC} Thoát"
  echo ""
  read -rp "  Chọn [0-2]: " dest_choice
  case "$dest_choice" in
    1) ;;
    2)
      read -rp "  Nhập đường dẫn ổ cứng: " disk_path
      disk_path="${disk_path%/}"
      if [[ ! -d "$disk_path" ]]; then
        err "Đường dẫn không tồn tại: $disk_path"; exit 1
      fi
      DISK_DEST="$disk_path"
      ok "Sẽ sao chép sang: $DISK_DEST"
      ;;
    0) echo "Thoát."; exit 0 ;;
    *) err "Lựa chọn không hợp lệ"; exit 1 ;;
  esac
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
  postgres) backup_postgres; copy_to_disk; rotate_dumps; summary ;;
  mongo)    backup_mongo;    copy_to_disk; rotate_dumps; summary ;;
  redis)    backup_redis;    copy_to_disk; rotate_dumps; summary ;;
  minio)    backup_minio;    copy_to_disk; summary ;;
  all)
    backup_postgres
    backup_mongo
    backup_redis
    backup_minio
    rotate_dumps
    copy_to_disk
    summary
    ;;
  menu|*)
    [[ -z "$DISK_DEST" ]] && select_dest
    main_menu
    ;;
esac
