# Multi-stage Dockerfile for tablet-ordering-pwa (Nuxt 3 SPA/SSR)
# Supports linux/arm64 (Pi5) and linux/amd64 (dev/CI)

ARG NODE_VERSION=22

# ============================================================================
# Stage: dependencies - Install Node.js dependencies
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================================================
# Stage: build - Build Nuxt SPA output (static assets + config)
# ============================================================================
FROM dependencies AS build

COPY . .

# Build static output
RUN npm run build

# ============================================================================
# Stage: app - Nginx server for static PWA assets with caching strategy
# ============================================================================
FROM nginx:alpine AS app

# Create non-root user for nginx (already exists in alpine, but explicit for clarity)
RUN addgroup -g 1001 -S nginx-app && \
    adduser -u 1001 -S nginx-app -G nginx-app || true

# Create app directory with proper permissions
RUN mkdir -p /app/public && chown -R nginx:nginx /app

WORKDIR /app

# Copy built assets from build stage
COPY --from=build --chown=nginx:nginx /app/.output/public ./public
COPY --from=build --chown=nginx:nginx /app/.output/server ./server

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
    
    # Cache strategy: hashed assets are immutable
    location ~* ^/.+\.[a-f0-9]{8}\.(js|css|woff|woff2|ttf)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML entry points: no-cache
    location ~* \.html?$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }
    
    # Default to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html =404;
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

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Final production image label
# ============================================================================
LABEL maintainer="Woosoo Operations" \
      version="1.0" \
      description="Production Nuxt 3 tablet-ordering-pwa client"
