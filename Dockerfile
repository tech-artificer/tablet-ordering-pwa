FROM node:20-alpine AS builder
WORKDIR /app

# NODE_ENV must NOT be production here — npm ci skips devDependencies otherwise,
# breaking Nuxt modules (@element-plus/nuxt, @nuxt/icon, etc.) required at build time.
ENV NITRO_PRESET=node-server

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
