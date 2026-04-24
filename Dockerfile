# Multi-stage Dockerfile for tablet-ordering-pwa (Nuxt 3 SPA)
# Supports linux/arm64 (Pi5) and linux/amd64 (dev/CI)

ARG NODE_VERSION=22

# ============================================================================
# Stage: dependencies - Install Node.js dependencies
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# ============================================================================
# Stage: build - Build Nuxt SPA output (static assets + config)
# ============================================================================
FROM dependencies AS build

COPY . .

# nuxi generate = build + prerender. Outputs to dist/ (nitro.output.publicDir).
# Plain "nuxi build" skips prerendering and won't produce the SPA index.html.
RUN npx nuxi generate

# ============================================================================
# Stage: app - Nginx server for static PWA assets with caching strategy
# ============================================================================
FROM nginx:alpine AS app

# Prepare application and nginx runtime directories for the existing non-root nginx user.
# Also patch the pid path: newer nginx images use /run/nginx.pid which is a root-owned tmpfs
# at runtime; /tmp is always writable by all users.
RUN mkdir -p /app/public /var/cache/nginx /var/run && \
    chown -R nginx:nginx /app /var/cache/nginx /var/run && \
    sed -i 's|pid\s*/run/nginx.pid;|pid        /tmp/nginx.pid;|' /etc/nginx/nginx.conf

WORKDIR /app

# Copy built assets from build stage
# nuxi generate outputs to dist/ (via nitro.output.publicDir in nuxt.config.ts)
COPY --from=build --chown=nginx:nginx /app/dist ./public

# Create nginx config for PWA serving
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 3000 default_server;
    listen [::]:3000 default_server;
    
    server_name _;
    
    root /app/public;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Nuxt build assets must never fall back to index.html.
    # Missing module files should return 404, not HTML (prevents MIME errors in browsers).
    location ^~ /_nuxt/ {
        try_files $uri =404;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Cache strategy: hashed assets are immutable
    location ~* "^/.+\\.[a-f0-9]{8}\\.(js|mjs|css|woff|woff2|ttf)$" {
        try_files $uri =404;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Service worker and manifest should be served directly
    location = /sw.js {
        try_files $uri =404;
        add_header Cache-Control "no-cache";
    }

    location = /manifest.webmanifest {
        try_files $uri =404;
    }
    
    # HTML entry points: no-cache
    location ~* \.html?$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }
    
    # Default to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /\.(git|hg|svn|lock) {
        deny all;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

USER nginx

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Final production image label
# ============================================================================
LABEL maintainer="Woosoo Operations" \
      version="1.0" \
      description="Production Nuxt 3 tablet-ordering-pwa client"
