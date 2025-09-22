# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install dependencies (only package.json and lock file for cache efficiency)
COPY --link package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the application source
COPY --link . .

# Build the Nuxt app
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --ingroup appuser appuser

# Copy built app and production node_modules from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy public assets and any static files needed at runtime
COPY --from=builder /app/public ./public

ENV NODE_ENV=developement
ENV NODE_OPTIONS="--max-old-space-size=4096"

USER appuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
