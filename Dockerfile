# HanUstoz — Dokploy / har qanday Docker server uchun production image.
# Next.js "standalone" rejimida build qilinadi: image kichik, faqat kerakli fayllar bilan.

FROM node:22-alpine AS base

# ---------- 1. Bog'liqliklar ----------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3. Ishga tushirish ----------
FROM base AS runner
WORKDIR /app

# Redis (Upstash) ulanmagan bo'lsa, ma'lumotlar /app/data/db.json fayliga yoziladi.
# Dokploy'da /app/data papkasiga Volume ulang, aks holda har deploy'da ma'lumotlar o'chadi.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    ALLOW_FILE_DB=1 \
    FILE_DB_PATH=/app/data/db.json

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
    && mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server.js"]
