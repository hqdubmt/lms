#!/usr/bin/env bash
# db-backup.sh — Dump PostgreSQL, MongoDB, Redis vào database/dumps/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/dumps"
KEEP_DAYS="${KEEP_DAYS:-7}"
TS="$(date '+%Y-%m-%d_%H-%M-%S')"

# ── Màu terminal ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }
info() { echo -e "${YELLOW}→${NC} $*"; }

ERRORS=0

# ── PostgreSQL ────────────────────────────────────────────────────────────────
info "Dump PostgreSQL..."
PG_DIR="$DUMP_DIR/postgres"
mkdir -p "$PG_DIR"
PG_FILE="$PG_DIR/mydb_${TS}.sql.gz"

if docker exec lms_postgres pg_dump \
    -U admin \
    --no-password \
    -d mydb \
    --format=plain \
    --no-owner \
    --no-acl \
  2>/dev/null | gzip > "$PG_FILE"; then
  SIZE=$(du -sh "$PG_FILE" | cut -f1)
  ok "PostgreSQL → $PG_FILE ($SIZE)"
else
  err "PostgreSQL dump thất bại"
  rm -f "$PG_FILE"
  ERRORS=$((ERRORS+1))
fi

# ── MongoDB ───────────────────────────────────────────────────────────────────
info "Dump MongoDB..."
MONGO_DIR="$DUMP_DIR/mongo"
mkdir -p "$MONGO_DIR"
MONGO_FILE="$MONGO_DIR/mongo_du_${TS}.archive.gz"

if docker exec lms_mongo mongodump \
    -u admin \
    -p "2c6206fb8880eed9722ffb95694f7b7e72f10cfad6c78d45c8cfdea34e3f00e0" \
    --authenticationDatabase admin \
    --db mongo_du \
    --archive \
    --gzip \
    --quiet \
  > "$MONGO_FILE" 2>/dev/null; then
  SIZE=$(du -sh "$MONGO_FILE" | cut -f1)
  ok "MongoDB → $MONGO_FILE ($SIZE)"
else
  err "MongoDB dump thất bại"
  rm -f "$MONGO_FILE"
  ERRORS=$((ERRORS+1))
fi

# ── Redis ─────────────────────────────────────────────────────────────────────
info "Dump Redis..."
REDIS_DIR="$DUMP_DIR/redis"
mkdir -p "$REDIS_DIR"
REDIS_FILE="$REDIS_DIR/dump_${TS}.rdb.gz"

if docker exec redis_du redis-cli \
    -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
    --no-auth-warning \
    BGSAVE > /dev/null 2>&1; then
  # Đợi BGSAVE hoàn thành
  for i in $(seq 1 10); do
    STATUS=$(docker exec redis_du redis-cli \
      -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
      --no-auth-warning LASTSAVE 2>/dev/null)
    sleep 1
    AFTER=$(docker exec redis_du redis-cli \
      -a "f4cca1e58ceff5def2579aa1f1eec08f743aec826b12097a5d06ea935f5d4e8e" \
      --no-auth-warning LASTSAVE 2>/dev/null)
    [[ "$AFTER" != "$STATUS" ]] && break
  done
  # Copy dump.rdb từ container
  docker cp redis_du:/data/dump.rdb - 2>/dev/null | gzip > "$REDIS_FILE" && {
    SIZE=$(du -sh "$REDIS_FILE" | cut -f1)
    ok "Redis → $REDIS_FILE ($SIZE)"
  } || {
    err "Redis copy dump.rdb thất bại"
    rm -f "$REDIS_FILE"
    ERRORS=$((ERRORS+1))
  }
else
  err "Redis BGSAVE thất bại"
  ERRORS=$((ERRORS+1))
fi

# ── Xoay vòng: giữ $KEEP_DAYS ngày gần nhất ─────────────────────────────────
info "Xóa dump cũ hơn ${KEEP_DAYS} ngày..."
find "$DUMP_DIR" -type f \( -name "*.gz" -o -name "*.rdb" \) -mtime +${KEEP_DAYS} -delete 2>/dev/null && ok "Xoay vòng xong"

# ── Tổng kết ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}✓ Tất cả database dump thành công${NC} — $(date '+%H:%M:%S %d/%m/%Y')"
else
  echo -e "${RED}✗ Có $ERRORS lỗi khi dump database${NC}" >&2
  exit 1
fi
