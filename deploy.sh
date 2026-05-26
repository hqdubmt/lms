#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  MasterLMS — Deploy Script
#  Dùng: ./deploy.sh "commit message"
#  Ví dụ: ./deploy.sh "fix: sửa lỗi đăng nhập"
# ─────────────────────────────────────────────

DOCKER_USER="hqdu"
API_IMAGE="$DOCKER_USER/lms-api"
WEB_IMAGE="$DOCKER_USER/lms-web"
COMMIT_MSG="${1:-chore: deploy}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[•]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
sep()  { echo -e "${BOLD}─────────────────────────────────────${NC}"; }

echo ""
echo -e "${BOLD}🚀 MasterLMS Deploy${NC}"
sep

# ─── 1. KIỂM TRA DOCKER LOGIN ───────────────
log "Kiểm tra Docker login..."
DOCKER_USERNAME=$(docker info 2>/dev/null | grep Username | awk '{print $2}')
if [ -z "$DOCKER_USERNAME" ]; then
  err "Chưa đăng nhập Docker Hub. Chạy: docker login -u $DOCKER_USER"
fi
ok "Docker: $DOCKER_USERNAME"

# ─── 2. GIT COMMIT & PUSH ───────────────────
sep
log "Git commit & push..."

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$COMMIT_MSG"
  ok "Committed: $COMMIT_MSG"
else
  ok "Không có thay đổi mới — bỏ qua commit"
fi

git push origin master
ok "Pushed to GitHub"

COMMIT=$(git rev-parse --short HEAD)
ok "Commit: $COMMIT"

# ─── 3. BUILD DOCKER IMAGES ─────────────────
sep
log "Build Docker image: lms-api..."
docker build \
  -t "$API_IMAGE:latest" \
  -t "$API_IMAGE:$COMMIT" \
  -f apps/api/Dockerfile \
  apps/api/
ok "Built $API_IMAGE:$COMMIT"

sep
log "Build Docker image: lms-web..."

# Đọc biến môi trường web (nếu có)
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000/api}"
SOCKET_URL="${NEXT_PUBLIC_SOCKET_URL:-http://localhost:4000}"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

docker build \
  --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
  --build-arg NEXT_PUBLIC_SOCKET_URL="$SOCKET_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" \
  -t "$WEB_IMAGE:latest" \
  -t "$WEB_IMAGE:$COMMIT" \
  -f apps/web/Dockerfile \
  apps/web/
ok "Built $WEB_IMAGE:$COMMIT"

# ─── 4. PUSH DOCKER HUB ─────────────────────
sep
log "Push $API_IMAGE..."
docker push "$API_IMAGE:latest"
docker push "$API_IMAGE:$COMMIT"
ok "Pushed $API_IMAGE:latest & :$COMMIT"

log "Push $WEB_IMAGE..."
docker push "$WEB_IMAGE:latest"
docker push "$WEB_IMAGE:$COMMIT"
ok "Pushed $WEB_IMAGE:latest & :$COMMIT"

# ─── 5. XONG ────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}✅ Deploy hoàn tất!${NC}"
echo ""
echo -e "  Git commit : ${BOLD}$COMMIT${NC}"
echo -e "  GitHub     : ${BOLD}https://github.com/hqdubmt/lms${NC}"
echo -e "  API image  : ${BOLD}$API_IMAGE:$COMMIT${NC}"
echo -e "  Web image  : ${BOLD}$WEB_IMAGE:$COMMIT${NC}"
echo ""
