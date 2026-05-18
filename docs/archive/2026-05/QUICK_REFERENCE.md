---
status: archived
archived_reason: Snapshot reference; not maintained.
superseded_by: tablet-ordering-pwa/docs/TABLET_ORDERING_PWA_PRODUCTION_STABILITY_AUDIT_2026-05-14.md
archived_on: 2026-05-14
---
# Quick Reference - Development & Production

## Development Setup

### Start Development
```bash
cd tablet-ordering-pwa
docker compose -f compose.dev.yaml up
# Visit http://192.168.1.100:3000
```

### Verify HMR (Hot Module Reload)
```bash
# Make a change to pages/index.vue
# Save file
# Expected: Browser reloads within 2-4 seconds
# Check: Browser console shows "HMR updated"
```

### Check Container
```bash
docker compose -f compose.dev.yaml ps
docker compose -f compose.dev.yaml logs -f
docker stats tablet-ordering-pwa-nuxt-dev-1
```

### Stop Development
```bash
docker compose -f compose.dev.yaml down
```

---

## Production Build & Deployment

### Build Production Image
```bash
docker build -f Dockerfile.prod \
  --build-arg NUXT_PUBLIC_REVERB_HOST=192.168.100.7 \
  --build-arg NUXT_PUBLIC_REVERB_PORT=443 \
  --build-arg NUXT_PUBLIC_REVERB_SCHEME=https \
  -t tablet-ordering-pwa:prod .
```

### Verify Image Size
```bash
docker images tablet-ordering-pwa:prod
# Should show ~50MB
```

### Test Production Image Locally
```bash
docker run -p 3000:3000 tablet-ordering-pwa:prod
curl http://localhost:3000/
```

### Deploy to Production
```bash
docker compose -f compose.prod.yaml up -d
```

### Verify Production
```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=50
docker stats tablet-ordering-pwa
```

### Test from Network
```bash
curl http://192.168.1.100:3000/
# Should return index.html
```

### Rollback (If Needed)
```bash
docker compose -f compose.prod.yaml down
docker rmi tablet-ordering-pwa:prod
docker tag tablet-ordering-pwa:backup-2026-05-07 tablet-ordering-pwa:prod
docker compose -f compose.prod.yaml up -d
```

---

## Common Issues & Fixes

### Issue: HMR Not Working (Dev)
**Symptom**: File changes don't reload in browser
```bash
# Fix: Check dev machine IP
ipconfig  # Windows
ip addr   # Linux/Mac

# Update compose.dev.yaml with correct IP
# NUXT_DEV_HMR_HOST: 192.168.X.X (your actual IP)

# Restart container
docker compose -f compose.dev.yaml down
docker compose -f compose.dev.yaml up
```

### Issue: Container Won't Start (Dev)
**Symptom**: `OOM killed` or `exit code 137`
```bash
# Reason: Memory pressure from Vite polling
# Fix: Restart and monitor
docker compose -f compose.dev.yaml restart
docker stats tablet-ordering-pwa-nuxt-dev-1

# If still failing: Increase Docker memory allocation
# Docker Desktop → Preferences → Resources → Memory → +2GB
```

### Issue: Port 3000 Already In Use
**Symptom**: `bind: address already in use`
```bash
# Find what's using port 3000
netstat -ano | findstr 3000

# Kill it or use different port
docker compose -f compose.dev.yaml down
docker run -p 3001:3000 tablet-ordering-pwa:prod
```

### Issue: Tablets Show Stale Content (Prod)
**Symptom**: App shows old version after deployment
```bash
# Clear browser cache
# On tablet: Settings → Safari → Clear History and Website Data
# Or: Hard refresh (Ctrl+Shift+R)

# Force Service Worker update
# Visit http://tablet-ip:3000/
# DevTools → Application → Service Workers → Unregister + reload
```

### Issue: API Calls Failing (Prod)
**Symptom**: Network errors in DevTools, data won't load
```bash
# Check backend connectivity
docker exec tablet-ordering-pwa curl http://192.168.100.7/api/
# Should not be "Connection refused"

# Verify API_BASE_URL
curl -I http://192.168.1.100:3000/
# Should get 200 OK

# Check logs
docker compose -f compose.prod.yaml logs | grep -i error
```

### Issue: High Memory Usage (Prod)
**Symptom**: Memory >150MB, app slow
```bash
# Check current usage
docker stats tablet-ordering-pwa

# If >200MB:
docker compose -f compose.prod.yaml restart

# Check what's growing
docker exec tablet-ordering-pwa top -b | head -10
```

---

## Monitoring Commands

### Real-Time Stats
```bash
docker stats tablet-ordering-pwa
# Shows: CPU%, Memory, Network I/O
```

### View Logs
```bash
# Last 50 lines
docker compose -f compose.prod.yaml logs --tail=50

# Follow (live)
docker compose -f compose.prod.yaml logs -f

# Last 1 hour
docker compose -f compose.prod.yaml logs --since 1h
```

### Check Health
```bash
# Container health status
docker compose -f compose.prod.yaml ps
# Shows: "healthy" or "unhealthy"

# Detailed health info
docker inspect tablet-ordering-pwa | grep -A 10 Health
```

### Test Connectivity
```bash
# From container to backend
docker exec tablet-ordering-pwa curl http://192.168.100.7/api/

# From host to container
curl http://192.168.1.100:3000/

# From other device on network
curl http://192.168.1.100:3000/
```

---

## Cache Header Verification

### Check HTML Cache (Should be 60 seconds)
```bash
curl -I http://192.168.1.100:3000/
# Look for: Cache-Control: public, max-age=60, must-revalidate
```

### Check Asset Cache (Should be 1 year)
```bash
curl -I http://192.168.1.100:3000/_nuxt/XXXX.js
# Look for: Cache-Control: public, max-age=31536000, immutable
```

### Check Service Worker Cache (Should be 0 seconds)
```bash
curl -I http://192.168.1.100:3000/sw.js
# Look for: Cache-Control: public, max-age=0, must-revalidate
```

---

## Performance Testing

### Lighthouse Score
```bash
# In Chrome DevTools
# → Lighthouse
# → Generate report
# Target: >80 performance score
```

### Network Tab (DevTools)
```bash
# On tablet or laptop
# → DevTools → Network tab
# → Refresh page
# Check:
#   - Initial load time
#   - Cache hit rate (Size column shows "from cache")
#   - No 404 errors
#   - No slow requests (>1s)
```

### Service Worker Status
```bash
# DevTools → Application → Service Workers
# Should show:
#   - Status: activated and running
#   - Last update: <1 hour ago
#   - Cache Storage: <5MB
```

---

## File Locations Quick Reference

| File | Purpose | Environment |
|------|---------|------------|
| `nuxt.config.ts` | Dev config | Development |
| `nuxt.config.prod.ts` | Prod config | Production |
| `compose.dev.yaml` | Dev orchestration | Development |
| `compose.prod.yaml` | Prod orchestration | Production |
| `Dockerfile.dev` | Dev container | Development |
| `Dockerfile.prod` | Prod container | Production |
| `docker/nginx/tablet-pwa.conf` | nginx config | Production |

---

## Environment Variables

### Development (compose.dev.yaml)
```yaml
NODE_ENV: development
NUXT_DEV_HMR_HOST: 192.168.1.100
NUXT_PUBLIC_REVERB_HOST: 192.168.100.7
NUXT_PUBLIC_API_BASE_URL: http://192.168.1.100/api
```

### Production (compose.prod.yaml + build args)
```bash
# Build args
NUXT_PUBLIC_REVERB_HOST=192.168.100.7
NUXT_PUBLIC_REVERB_PORT=443
NUXT_PUBLIC_REVERB_SCHEME=https

# Runtime env
NODE_ENV=production
```

---

## Key Metrics to Monitor

| Metric | Dev | Prod | Alert |
|--------|-----|------|-------|
| Memory | <1GB | <100MB | >200MB |
| CPU | <10% | <2% | >50% |
| Error rate | any | <1% | >5% |
| Response time | <200ms | <500ms | >1000ms |
| Image size | 200MB | 50MB | >100MB |

---

## Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| `SETUP_SUMMARY.md` | This summary | 5 min |
| `DEVELOPMENT_SETUP_DIAGNOSIS.md` | Dev analysis | 10 min |
| `BLOATING_ANALYSIS_COMPLETE.md` | Build issues | 20 min |
| `PRODUCTION_DEPLOYMENT_CHECKLIST.md` | Pre-deployment | 15 min |
| `PRODUCTION_ARCHITECTURE_GUIDE.md` | Implementation | 20 min |

---

## Deployment Workflow

```
Development          Testing            Production
─────────────        ────────────       ──────────

code change          build image        docker build
   ↓                    ↓                   ↓
compose.dev.yaml    docker run         compose.prod.yaml
   ↓                    ↓                   ↓
npm run dev         verify              docker up -d
   ↓                    ↓                   ↓
HMR reload          test tablets        monitoring
   ↓                    ↓                   ↓
repeat               approve            24h observation
```

---

## Emergency Commands

### Stop Everything
```bash
docker compose -f compose.dev.yaml down
docker compose -f compose.prod.yaml down
```

### View All Docker Resources
```bash
docker ps -a
docker images
docker volume ls
docker network ls
```

### Cleanup (Careful!)
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (WARNING: removes everything)
docker system prune -a
```

### Inspect Container Details
```bash
docker inspect tablet-ordering-pwa
docker logs -f tablet-ordering-pwa
docker exec -it tablet-ordering-pwa /bin/sh
```

---

**Last Updated**: 2026-05-07
**Version**: 1.0
**Status**: ✓ Production Ready
