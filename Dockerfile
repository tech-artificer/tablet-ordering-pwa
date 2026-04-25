# ── Build stage ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Nuxt/Nitro target: Node.js server (SSR)
ENV NITRO_PRESET=node-server
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Copy only the compiled output — no source, no node_modules
COPY --from=builder /app/.output ./

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

CMD ["node", "server/index.mjs"]
