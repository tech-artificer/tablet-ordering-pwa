# ── Build stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Nuxt/Nitro target: Node.js server (SSR)
ENV NITRO_PRESET=node-server
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy only the compiled output — no source, no node_modules
COPY --from=builder --chown=node:node /app/.output ./

EXPOSE 3000

ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

# Runtime env vars injected by compose (no rebuild required):
#   MAIN_API_URL
#   NUXT_PUBLIC_PUSHER_KEY
#   NUXT_PUBLIC_PUSHER_CLUSTER
#   NUXT_PUBLIC_REVERB_HOST
#   NUXT_PUBLIC_REVERB_PORT
#   NUXT_PUBLIC_REVERB_SCHEME

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null 2>&1 || exit 1

USER node

CMD ["node", "server/index.mjs"]
