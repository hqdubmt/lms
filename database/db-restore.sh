#!/usr/bin/env bash
# db-restore.sh — Restore PostgreSQL / MongoDB / Redis / MinIO từ bản dump
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/dumps"
RCLONE_BIN="$(dirname "$SCRIPT_DIR")/codebackup/rclone_bin"
[[ ! -f "$RCLONE_BIN" ]] && RCLONE_BIN="$(which rclone 2>/dev/null || echo '')"

# ── Màu ──────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()      { echo -e "${GREEN}✓${NC} $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
info()    { echo -e "${YELLOW}→${NC} $*"; }
heading() { echo -e "\n${BOLD}${CYAN}$*${NC}"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }

# ── Chọn file từ danh sách ───────────────────────────────────────────────────
pick_file() {
  local dir="$1" pattern="$2" label="$3"
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(ls -t "$dir"/$pattern 2>/dev/null)
  if [[ ${#files[@]} -eq 0 ]]; then
    err "Không tìm thấy bản dump nào trong $dir"
    return 1
  fi
  echo ""
  echo -e "  Các bản $label có sẵn:"
  for i in "${!files[@]}"; do
    local ts
    ts=$(basename "${files[$i]}" | grep -oP '\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}' || echo "")
    local size
    size=$(du -sh "${files[$i]}" 2>/dev/null | cut -f1)
    printf "  ${CYAN}[%d]${NC} %s  ${GREEN}%s${NC}\n" "$((i+1))" "$(basename "${files[$i]}")" "$size"
  done
  echo -e "  ${CYAN}[0]${NC} Hủy"
  echo ""
  read -rp "  Chọn [0-${#files[@]}]: " choice
  if [[ "$choice" == "0" || -z "$choice" ]]; then return 1; fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#files[@]} )); then
    err "Lựa chọn không hợp lệ"; return 1
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
  read -rp "  Chọn [0-$((${#buckets[@]}+1))]: " choice

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
  menu|*) main_menu ;;
esac
