FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --legacy-peer-deps && npx prisma@5 generate

FROM base AS builder
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma@5 generate && npm run build

FROM base AS runner
RUN apk add --no-cache espeak-ng
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
