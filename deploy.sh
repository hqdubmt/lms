#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  MasterLMS — Deploy Script
#  Dùng: ./deploy.sh "commit message"
#  Ví dụ: ./deploy.sh "fix: sửa lỗi đăng nhập"
#
#  Script này sẽ:
#   1. Git commit & push
#   2. Git post-push hook tự động build & push Docker (linux/amd64)
#   3. GitHub Actions build arm64 tự động
# ─────────────────────────────────────────────

COMMIT_MSG="${1:-chore: deploy}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${BLUE}[•]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
sep()  { echo -e "${BOLD}─────────────────────────────────────${NC}"; }

echo ""
echo -e "${BOLD}🚀 MasterLMS Deploy${NC}"
sep

cd "$(dirname "$0")"

log "Git commit & push..."
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$COMMIT_MSG"
  ok "Committed: $COMMIT_MSG"
else
  ok "Không có thay đổi mới — bỏ qua commit"
fi

git push origin master
# ↑ post-push hook sẽ tự chạy docker build + push
