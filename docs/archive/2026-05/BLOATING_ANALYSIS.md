---
status: archived
archived_reason: Superseded by the Tablet PWA audit's cleanup recommendations.
superseded_by: tablet-ordering-pwa/docs/TABLET_ORDERING_PWA_PRODUCTION_STABILITY_AUDIT_2026-05-14.md
archived_on: 2026-05-14
---
# Tablet Ordering PWA - Bloating Analysis & Production Configuration

**Analysis Date**: 2026-05-07
**Purpose**: Identify and eliminate bloat, optimize caching, prepare stable production config
**Status**: CRITICAL ISSUES FOUND

---

## BLOAT ANALYSIS

### Current Build Artifacts (In Container)

| Directory | Size | Purpose | Issue |
|-----------|------|---------|-------|
| node_modules | 803.5 MB | Dependencies | ✓ Expected, dev+prod deps combined |
| .nuxt | 1.2 MB | Build cache | ⚠ Should not ship to production |
| .output | 4.0 KB | Runtime output | ⚠ Incomplete (dev server) |

### Current Local Build Artifacts (Host)

| Directory | Size | Notes |
|-----------|------|-------|
| .nuxt | 12 MB | Build artifacts, should be .gitignore'd |
| .output | 58 MB | Production build output, bloated |
| node_modules | 800+ MB | Not measured (Windows slow), should not commit |

### Production .output Bloat Analysis

**Problem**: `.output` is 58MB when it should be ~5-10MB max

**Likely Culprits**:
1. **Prerendered pages** - `crawlLinks: false` should prevent, but verify
2. **Asset duplication** - Images/fonts not deduplicated across chunks
3. **Source maps** - Not stripped in production build
4. **Unused CSS** - Tailwind not properly purged
5. **Large dependencies bundled**:
   - `element-plus` - Heavy UI library (~5MB gzipped)
   - `axios` - HTTP client (~1.5MB)
   - `laravel-echo` + `pusher-js` - WebSocket libs (~2MB)
   - `canvas-confetti` - Particle effects (~400KB)
   - `dexie` - IndexedDB wrapper (~400KB)

### Service Worker Caching Issue

**Problem**: PWA configured to cache up to 10MB
```typescript
injectManifest: {
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
    globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
}
```

**Issue**: 
- Caches ALL matching files (js, css, svg, png, woff2)
- No version control for breaking changes
- Old cached files persist across deployments
- Causes "stale content" bugs on tablets

---

## PRODUCTION ISSUES & RISKS

### 🔴 CRITICAL: Service Worker Cache Poisoning
**Problem**: Old PWA cache persists indefinitely
```
Deployment 1.0 → SWv1 caches all assets
Deployment 2.0 → SWv2 tries to install, but SWv1 still controls clients
Result: Tablets stuck on old version, showing stale data
```

**Impact**: HIGH
**Current Config**: `registerType: "autoUpdate"` doesn't force immediate update
**Solution**: Add cache versioning + unregister old SW

### 🔴 CRITICAL: No Cache Busting Strategy
**Problem**: Assets served with no `Cache-Control` headers
- Browsers cache indefinitely
- CDN caches indefinitely
- Deployments don't invalidate cache
- Tablets show outdated UI/API responses

**Impact**: HIGH (data corruption risk)
**Current Status**: Not configured in Nuxt
**Solution**: Add explicit cache headers in HTTP response

### 🟠 HIGH: Unused Dependency Bloat
**Problem**: Dependencies included but unused or underutilized
- `canvas-confetti` - Particle effects, rarely used
- `element-plus` - Full UI library, only use subset
- `@vueuse/motion` - Animation library, could be CSS-only
- `sharp` - Image processing (dev only, should be devDependency)

**Impact**: HIGH (bundle size, startup time)
**Current Size**: ~2MB extra
**Solution**: Remove unused deps, replace with lighter alternatives

### 🟠 HIGH: SSR Disabled But Still Compiled
**Problem**: `ssr: false` but Nuxt still generates SSR code
- Server bundle built but unused
- Hydration code in client bundle
- Nitro server initialized but idle

**Impact**: MEDIUM (wasted build time, larger bundle)
**Current Status**: Not optimized for SPA mode
**Solution**: Set proper SPA preset, disable server generation

### 🟠 HIGH: Prerender Misconfiguration
**Problem**: 
```typescript
nitro: {
    prerender: {
        crawlLinks: false,  // Good, don't crawl
        routes: ["/"],      // Only root prerendered
    },
}
```

**Issue**: 
- Prerendering root page is unnecessary for SPA
- Still triggers HTML generation + SSR overhead
- Adds latency to build process

**Impact**: MEDIUM (slower builds)
**Solution**: Disable prerendering for SPA

### 🟠 MEDIUM: No Asset Optimization
**Problem**: No configuration for:
- Image compression/optimization
- CSS minification settings
- JavaScript splitting strategy
- Chunk size targets

**Impact**: MEDIUM (slower page loads, higher bandwidth)
**Solution**: Add asset optimization config

### 🟡 MEDIUM: PWA Max Cache Size Too Large
**Problem**: 10MB cache limit
- Tablets with limited storage waste 10MB per app
- Multiple deployments = multiple caches
- No cleanup of old versions

**Impact**: MEDIUM (storage bloat on tablets)
**Solution**: Reduce to 5MB, implement cache cleanup

### 🟡 MEDIUM: No Production Health Checks
**Problem**: No monitoring of:
- Cache hit rates
- Bundle size growth
- Memory usage on devices
- Deployment success verification

**Impact**: MEDIUM (hidden issues detected too late)
**Solution**: Add production telemetry

### 🟡 LOW: Debug Logs in Production
**Problem**: `NUXT_PUBLIC_DEBUG=true` in .env (if left enabled)
- Increases bundle size (debug statements compiled in)
- Reveals internal state in browser console
- Potential security issue

**Impact**: LOW (minor perf, security)
**Solution**: Ensure DEBUG=false in production .env

---

## PRODUCTION DOCKERFILE ISSUES

### Current Dockerfile Analysis

```dockerfile
FROM node:22-alpine AS builder
RUN npm ci  # ✓ Good: uses lock file
RUN npm run build  # ⚠ Problem: no optimization

FROM node:22-alpine
COPY --from=builder /app/.output ./.output  # ⚠ Copies entire .output (58MB!)
RUN addgroup ... adduser ...  # ✓ Good: non-root user
CMD ["node", ".output/server/index.mjs"]  # ⚠ Node server for SPA?
```

### Issues:

1. **Stage 2 Still Has Node.js Full** - Should be Alpine base only
2. **No Cleanup** - node_modules, source files remain in build context
3. **Large Final Image** - Probably 300MB+ (node:22-alpine = 200MB)
4. **Server Preset Wrong** - Using `node-server` for SPA, should use `static`

### Production Image Size

**Current**: ~300MB (estimated)
- node:22-alpine: ~200MB
- .output: 58MB
- Overhead: ~42MB

**Optimized**: ~50MB (with static preset)
- nginx:alpine: ~40MB
- .output/public: ~8MB
- Overhead: ~2MB

---

## STABLE PRODUCTION CONFIGURATION

I'll create three files:

1. **Dockerfile.prod** - Multi-stage, static preset, nginx
2. **nuxt.config.prod.ts** - Production optimizations
3. **compose.yaml.prod** - Production docker-compose

---

## IMPLEMENTATION

### 1. Production Dockerfile (nginx + static)
