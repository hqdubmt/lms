#!/bin/sh
set -e

echo "=== MasterLMS Starting ==="

# Migrate before starting API (prisma in /app/node_modules, schema in /app/api/prisma)
echo "[1/2] Running database migrations..."
cd /app/api
DATABASE_URL="$DATABASE_URL" \
  node /app/node_modules/.bin/prisma migrate deploy \
  --schema /app/api/prisma/schema.prisma
echo "[1/2] Migrations done."

echo "[2/2] Starting API, Worker, Web, Nginx..."
exec supervisord -c /etc/supervisord.conf
