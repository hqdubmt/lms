# ═══════════════════════════════════════════════════════════════════════════════
# MasterLMS - Combined image: API + Worker + Web + Nginx
# Build: docker build -t hqdu/webhoctapquanganh:latest \
#          --build-arg NEXT_PUBLIC_API_URL=http://your-server \
#          --build-arg NEXT_PUBLIC_SOCKET_URL=http://your-server \
#          --build-arg NEXT_PUBLIC_APP_URL=http://your-server .
# Run:   docker run -d -p 80:80 --env-file deploy/.env hqdu/webhoctapquanganh:latest
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Install dependencies (monorepo root) ────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /mono
RUN apk add --no-cache libc6-compat openssl

# Copy manifests first for better layer caching
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci

# Generate Prisma client into root node_modules
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# ─── Stage 2: Build API + Worker ──────────────────────────────────────────────
FROM deps AS api-builder
COPY apps/api/ ./apps/api/
RUN cd apps/api && npm run build

# ─── Stage 3: Build Web (Next.js standalone) ──────────────────────────────────
FROM deps AS web-builder
COPY apps/web/ ./apps/web/
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=MasterLMS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
RUN cd apps/web && npm run build

# ─── Stage 4: Final combined image ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache nginx supervisor ffmpeg curl openssl espeak-ng

# ── node_modules (hoisted at monorepo root) → shared by api + worker ──
COPY --from=api-builder /mono/node_modules ./node_modules

# ── API build (dist reads node_modules from parent /app/node_modules) ──
COPY --from=api-builder /mono/apps/api/dist    ./api/dist
COPY --from=api-builder /mono/apps/api/prisma  ./api/prisma

# ── Web build (Next.js standalone is self-contained) ──
COPY --from=web-builder /mono/apps/web/.next/standalone/   ./web/
COPY --from=web-builder /mono/apps/web/.next/static        ./web/.next/static
COPY --from=web-builder /mono/apps/web/public              ./web/public

# ── Config files ──
COPY docker/nginx.conf       /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh    /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /var/log/supervisor /var/log/nginx /run/nginx

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV INTERNAL_API_URL=http://127.0.0.1:4000

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
