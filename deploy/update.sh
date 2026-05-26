#!/bin/bash
# MasterLMS - Script cập nhật lên phiên bản mới
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[ -f "$ENV_FILE" ] || error ".env không tồn tại. Chạy setup.sh trước."

cd "$DEPLOY_DIR"

echo ""
echo "╔═════════════════════════════════════╗"
echo "║      MasterLMS - Update Script      ║"
echo "╚═════════════════════════════════════╝"
echo ""

# Pull images mới nhất từ Docker Hub
info "Pull images mới từ Docker Hub..."
docker compose pull
success "Pull images hoàn tất"

# Chạy migrations
info "Chạy database migrations..."
docker compose run --rm --no-deps api sh -c "npx prisma migrate deploy"
success "Migrations hoàn tất"

# Rolling restart: không có downtime
info "Restart services..."
docker compose up -d --remove-orphans
success "Tất cả services đã được cập nhật"

# Dọn dẹp images cũ
info "Dọn dẹp Docker images cũ..."
docker image prune -f >/dev/null 2>&1
success "Dọn dẹp hoàn tất"

echo ""
success "Cập nhật hoàn tất!"
docker compose ps
