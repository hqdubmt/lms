#!/bin/bash
# MasterLMS - Script cài đặt và chạy lần đầu trên server
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"
ENV_FILE="$DEPLOY_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── 1. Kiểm tra prerequisites ───────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════╗"
echo "║        MasterLMS - Setup Script        ║"
echo "╚════════════════════════════════════════╝"
echo ""

info "Kiểm tra prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker chưa được cài. Xem: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 chưa được cài."
success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
success "Docker Compose $(docker compose version --short)"

# ─── 2. Tạo file .env ────────────────────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  warn ".env đã tồn tại, bỏ qua bước tạo."
  warn "Xóa $ENV_FILE và chạy lại nếu muốn reset."
else
  info "Tạo file .env từ template..."
  cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"

  # Sinh passwords ngẫu nhiên
  gen_secret() { openssl rand -hex 32; }

  sed -i "s|CHANGE_ME_STRONG_PASSWORD_32CHARS|$(gen_secret)|g" "$ENV_FILE"

  # Minio cần ít nhất 8 ký tự
  MINIO_SECRET=$(openssl rand -hex 20)
  sed -i "s|CHANGE_ME_MINIO_SECRET_MIN_12CHARS|$MINIO_SECRET|" "$ENV_FILE"

  # JWT secrets 64 chars
  sed -i "s|CHANGE_ME_VERY_LONG_RANDOM_64CHAR_ACCESS_SECRET_HERE|$(gen_secret)$(gen_secret)|" "$ENV_FILE"
  sed -i "s|CHANGE_ME_VERY_LONG_RANDOM_64CHAR_REFRESH_SECRET_HERE|$(gen_secret)$(gen_secret)|" "$ENV_FILE"

  success ".env đã được tạo với passwords ngẫu nhiên"
  echo ""
  warn "QUAN TRỌNG: Mở file deploy/.env và điền:"
  warn "  - FRONTEND_URL=http://IP_hoặc_domain_server"
  warn "  - SMTP_USER, SMTP_PASS (nếu cần gửi email)"
  warn "  - AI keys (tuỳ chọn, miễn phí):"
  warn "      GROQ_API_KEY=gsk_...          (console.groq.com)"
  warn "      GOOGLE_GEMINI_API_KEY=AIza... (aistudio.google.com)"
  warn "  - Các API keys tuỳ chọn khác (Google OAuth, VNPay...)"
  echo ""
  read -p "Nhấn Enter sau khi đã chỉnh sửa .env để tiếp tục..."
fi

# ─── 3. Validate .env ────────────────────────────────────────────────────────
source "$ENV_FILE"

[ -z "${FRONTEND_URL:-}" ] && error "FRONTEND_URL chưa được đặt trong .env"
[[ "$FRONTEND_URL" == *"your-server"* ]] && error "Hãy thay FRONTEND_URL bằng IP/domain thực của server"
[ -z "${POSTGRES_PASSWORD:-}" ] && error "POSTGRES_PASSWORD chưa được đặt"
[ -z "${JWT_ACCESS_SECRET:-}" ] && error "JWT_ACCESS_SECRET chưa được đặt"

success "Cấu hình .env hợp lệ"
info "Frontend URL: $FRONTEND_URL"

# ─── 4. Build Docker images ──────────────────────────────────────────────────
echo ""
info "Build Docker images (lần đầu có thể mất 5-10 phút)..."
cd "$DEPLOY_DIR"
docker compose build --no-cache
success "Build hoàn tất"

# ─── 5. Khởi động databases trước ────────────────────────────────────────────
echo ""
info "Khởi động databases..."
docker compose up -d postgres redis mongodb minio
info "Chờ databases sẵn sàng..."

wait_healthy() {
  local name=$1
  local max=60
  for i in $(seq 1 $max); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "none")
    [ "$STATUS" = "healthy" ] && { success "$name sẵn sàng"; return 0; }
    [ $((i % 10)) -eq 0 ] && info "Đang chờ $name... ($i/${max}s)"
    sleep 1
  done
  error "$name không khởi động được sau ${max}s. Kiểm tra: docker logs $name"
}

wait_healthy lms_postgres
wait_healthy lms_redis
wait_healthy lms_mongodb
wait_healthy lms_minio

# ─── 6. Khởi tạo MinIO buckets ───────────────────────────────────────────────
info "Khởi tạo MinIO buckets..."
docker run --rm --network lms_backend \
  -e MC_HOST_minio="http://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@minio:9000" \
  minio/mc:latest \
  sh -c "
    mc mb --ignore-existing minio/${MINIO_BUCKET_VIDEOS:-lms-videos}
    mc mb --ignore-existing minio/${MINIO_BUCKET_ATTACHMENTS:-lms-attachments}
    mc mb --ignore-existing minio/${MINIO_BUCKET_AVATARS:-lms-avatars}
    mc anonymous set download minio/${MINIO_BUCKET_AVATARS:-lms-avatars}
  " 2>/dev/null && success "MinIO buckets đã được tạo" || warn "Bỏ qua tạo buckets (có thể đã tồn tại)"

# ─── 7. Chạy database migrations ─────────────────────────────────────────────
echo ""
info "Chạy database migrations..."
docker compose run --rm --no-deps api sh -c "npx prisma migrate deploy"
success "Migrations hoàn tất"

# ─── 8. Seed dữ liệu mẫu ─────────────────────────────────────────────────────
echo ""
read -p "Seed dữ liệu mẫu (tài khoản admin/instructor)? [Y/n] " SEED_CONFIRM
SEED_CONFIRM="${SEED_CONFIRM:-Y}"
if [[ "$SEED_CONFIRM" =~ ^[Yy]$ ]]; then
  info "Seed database..."
  docker compose run --rm --no-deps api sh -c "npx tsx prisma/seed.ts" && success "Seed hoàn tất" || warn "Seed thất bại (dữ liệu có thể đã tồn tại)"
fi

# ─── 9. Khởi động toàn bộ stack ──────────────────────────────────────────────
echo ""
info "Khởi động toàn bộ hệ thống..."
docker compose up -d
success "Tất cả services đã khởi động"

# ─── 10. Health check ────────────────────────────────────────────────────────
echo ""
info "Kiểm tra hệ thống..."
sleep 10

API_STATUS=$(curl -sf http://localhost/api/health 2>/dev/null && echo "OK" || echo "FAIL")
WEB_STATUS=$(curl -sf http://localhost/ 2>/dev/null | grep -q "MasterLMS" && echo "OK" || echo "FAIL")
AI_RAW=$(curl -sf http://localhost/api/ai/health 2>/dev/null || echo "{}")
AI_STATUS=$(echo "$AI_RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Online — ' + (d.get('provider') or 'unknown')) if d.get('available') else print('Offline (rule-based)')" 2>/dev/null || echo "Không kiểm tra được")

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║              Kết quả cài đặt                  ║"
echo "╠════════════════════════════════════════════════╣"
printf "║  API:    %-38s║\n" "$([ "$API_STATUS" = "OK" ] && echo "✓ http://localhost/api/health" || echo "✗ Chưa phản hồi")"
printf "║  Web:    %-38s║\n" "$([ "$WEB_STATUS" = "OK" ] && echo "✓ http://localhost" || echo "✗ Chưa phản hồi")"
printf "║  AI:     %-38s║\n" "$AI_STATUS"
echo "╠════════════════════════════════════════════════╣"
echo "║  Truy cập:  $FRONTEND_URL"
echo "║"
echo "║  Tài khoản mặc định:"
echo "║    Admin:      admin@masterlms.com / Admin@123456"
echo "║    Instructor: instructor@masterlms.com / Instructor@123456"
echo "╠════════════════════════════════════════════════╣"
echo "║  Lệnh hữu ích:"
echo "║    Xem logs:     cd deploy && make logs s=api"
echo "║    Dừng:         cd deploy && make down"
echo "║    Cập nhật:     cd deploy && ./update.sh"
echo "╚════════════════════════════════════════════════╝"
echo ""

[ "$API_STATUS" != "OK" ] && warn "API chưa phản hồi. Kiểm tra: docker logs lms_api"
[ "$WEB_STATUS" != "OK" ] && warn "Web chưa phản hồi. Kiểm tra: docker logs lms_web"
