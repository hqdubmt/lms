.PHONY: up down build restart logs ps migrate seed setup update pull clean scale stats

# ─── Cài đặt lần đầu ─────────────────────────────────────────────────────────
setup:
	bash setup.sh

# ─── Cập nhật / redeploy ──────────────────────────────────────────────────────
update:
	bash update.sh

# ─── Chạy hệ thống ───────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

# ─── Build ───────────────────────────────────────────────────────────────────
build:
	docker compose build --no-cache

# Build và start
deploy: build up

# ─── Quản lý services ────────────────────────────────────────────────────────

# Restart một service: make restart s=api
restart:
	docker compose restart $(s)

# Xem logs: make logs s=api
logs:
	docker compose logs -f $(s)

# Danh sách containers
ps:
	docker compose ps

# ─── Database ─────────────────────────────────────────────────────────────────

# Chạy migrations
migrate:
	docker compose run --rm --no-deps api sh -c "npx prisma migrate deploy"

# Seed dữ liệu mẫu
seed:
	docker compose run --rm --no-deps api sh -c "npx tsx prisma/seed.ts"

# Mở Prisma Studio (chỉ dùng để debug, cần DATABASE_URL)
studio:
	docker compose exec api npx prisma studio

# ─── Dọn dẹp ─────────────────────────────────────────────────────────────────

# Xóa images cũ
prune:
	docker image prune -f

# Xóa toàn bộ data (NGUY HIỂM!)
clean:
	docker compose down -v --remove-orphans
	docker image prune -f

# ─── Scale & Monitoring ───────────────────────────────────────────────────────

# Scale API: make scale n=3
scale:
	docker compose up -d --scale api=$(n) --no-recreate

# Resource usage
stats:
	docker stats --no-stream

# Pull latest base images
pull:
	docker compose pull
