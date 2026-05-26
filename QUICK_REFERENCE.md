# Quick Reference — Development and Production

> **IP address note:** This guide uses placeholder IPs from the standalone Docker setup for the
> tablet PWA. In the restaurant production environment, the tablet PWA is served through the
> Woosoo Nexus nginx stack at `https://192.168.1.31:4443` — not as a standalone container.
> Replace any IP below with your actual environment values.
>
> | Context | Host |
> |---|---|
> | Restaurant Nexus/PWA server | `192.168.1.31` |
> | Standalone PWA dev container | `192.168.1.100` (example, replace with your PC IP) |
> | Nexus API backend (standalone dev) | `192.168.100.7` (example from docker compose env) |

---

## Development Setup

### Start Development
```bash
cd tablet-ordering-pwa
docker compose -f compose.dev.yaml up
# Visit http://<your-dev-machine-ip>:3000
```

### Verify HMR (Hot Module Reload)
```bash
# Make a change to pages/index.vue and save
# Expected: browser reloads within 2-4 seconds
# Check: browser console shows "HMR updated"
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

## Production Build and Deployment (Standalone)

> Use this section when deploying the tablet PWA as a standalone Docker container.
> For the canonical restaurant deployment via the Nexus stack, see
> `woosoo-nexus/docs/deployment/production-docker.md`.

### Build Production Image
```bash
docker build -f Dockerfile.prod \
  --build-arg NUXT_PUBLIC_REVERB_HOST=<your-server-ip> \
  --build-arg NUXT_PUBLIC_REVERB_PORT=443 \
  --build-arg NUXT_PUBLIC_REVERB_SCHEME=https \
  -t tablet-ordering-pwa:prod .
```

### Verify Image Size
```bash
docker images tablet-ordering-pwa:prod
# Should show ~50 MB
```

### Test Production Image Locally
```bash
docker run -p 3000:3000 tablet-ordering-pwa:prod
curl http://localhost:3000/
```

### Deploy to Production (Standalone)
```bash
docker compose -f compose.prod.yaml up -d
```

### Verify
```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=50
docker stats tablet-ordering-pwa
```

### Rollback (If Needed)
```bash
docker compose -f compose.prod.yaml down
docker rmi tablet-ordering-pwa:prod
docker tag tablet-ordering-pwa:backup-<date> tablet-ordering-pwa:prod
docker compose -f compose.prod.yaml up -d
```

---

## Common Issues and Fixes

### Issue: HMR Not Working (Dev)
**Symptom:** File changes don't reload in browser
```bash
# Check your dev machine IP
ipconfig                        # Windows
ip addr                         # Linux
ifconfig                        # macOS (or: ipconfig getifaddr en0)

# Update compose.dev.yaml with the correct IP
# NUXT_DEV_HMR_HOST: <your-actual-dev-ip>

# Restart the container
docker compose -f compose.dev.yaml down
docker compose -f compose.dev.yaml up
```

### Issue: Container Won't Start (Dev)
**Symptom:** `OOM killed` or `exit code 137`
```bash
# Fix: restart and monitor memory
docker compose -f compose.dev.yaml restart
docker stats tablet-ordering-pwa-nuxt-dev-1

# If still failing: increase Docker memory allocation
# Docker Desktop → Preferences → Resources → Memory → +2 GB
```

### Issue: Port 3000 Already In Use
**Symptom:** `bind: address already in use`
```bash
netstat -ano | findstr 3000   # Windows
lsof -i :3000                 # Linux/Mac

# Kill the process or use a different port
docker run -p 3001:3000 tablet-ordering-pwa:prod
```

### Issue: Tablets Show Stale Content (Prod)
**Symptom:** App shows old version after deployment
```bash
# Hard refresh on tablet
# Android Chrome: tap three-dot menu → Reload
# Or: Settings → Privacy → Clear browsing data

# Force service worker update (DevTools)
# Application → Service Workers → Unregister → reload
```

### Issue: API Calls Failing (Prod)
**Symptom:** Network errors in DevTools, data won't load
```bash
# Check backend connectivity from inside the container
docker exec tablet-ordering-pwa curl http://<nexus-host>/api/

# Check logs
docker compose -f compose.prod.yaml logs | grep -i error
```

### Issue: High Memory Usage (Prod)
**Symptom:** Memory >150 MB, app slow
```bash
docker stats tablet-ordering-pwa

# If >200 MB, restart
docker compose -f compose.prod.yaml restart
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
docker compose -f compose.prod.yaml logs --tail=50   # last 50 lines
docker compose -f compose.prod.yaml logs -f           # follow (live)
docker compose -f compose.prod.yaml logs --since 1h   # last 1 hour
```

### Check Health
```bash
docker compose -f compose.prod.yaml ps
docker inspect tablet-ordering-pwa | grep -A 10 Health
```

---

## Cache Header Verification

```bash
# HTML — should be short-lived (60 seconds)
curl -I http://<pwa-host>:3000/
# Look for: Cache-Control: public, max-age=60, must-revalidate

# Hashed assets — should be immutable (1 year)
curl -I http://<pwa-host>:3000/_nuxt/<hash>.js
# Look for: Cache-Control: public, max-age=31536000, immutable

# Service worker — should never be cached
curl -I http://<pwa-host>:3000/sw.js
# Look for: Cache-Control: public, max-age=0, must-revalidate
```

---

## Key Metrics

| Metric | Dev | Prod | Alert threshold |
|---|---|---|---|
| Memory | <1 GB | <100 MB | >200 MB |
| CPU | <10% | <2% | >50% |
| Error rate | any | <1% | >5% |
| Response time | <200 ms | <500 ms | >1000 ms |
| Image size | 200 MB | ~50 MB | >100 MB |

---

## File Locations

| File | Purpose | Used in |
|---|---|---|
| `nuxt.config.ts` | Nuxt configuration | Development |
| `compose.dev.yaml` | Dev container orchestration | Development |
| `compose.prod.yaml` | Standalone prod orchestration | Standalone prod |
| `Dockerfile.dev` | Dev container image | Development |
| `Dockerfile.prod` | Prod container image | Standalone and Nexus-stack prod |
| `docker/nginx/tablet-pwa.conf` | nginx config for standalone | Standalone prod |

---

## Environment Variables

### Development (`compose.dev.yaml`)
```yaml
NODE_ENV: development
NUXT_DEV_HMR_HOST: <your-dev-machine-ip>
NUXT_PUBLIC_REVERB_HOST: <nexus-host>
NUXT_PUBLIC_API_BASE_URL: http://<your-dev-machine-ip>/api
```

> **Note:** `NUXT_PUBLIC_API_BASE_URL` uses the **dev machine's own IP** (same host as the
> PWA container), not the Nexus host. The dev nginx proxy on the same machine forwards
> `/api` requests to the Nexus backend. Setting this to the Nexus host directly bypasses
> the expected proxy path and can cause CORS or routing failures.

### Production Build Args
```bash
NUXT_PUBLIC_REVERB_HOST=<your-server-ip>
NUXT_PUBLIC_REVERB_PORT=443
NUXT_PUBLIC_REVERB_SCHEME=https
```

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

```bash
# Stop everything
docker compose -f compose.dev.yaml down
docker compose -f compose.prod.yaml down

# View all Docker resources
docker ps -a
docker images
docker volume ls

# Cleanup unused images and volumes (careful!)
docker image prune -a
docker volume prune

# Shell into container for debugging
docker exec -it tablet-ordering-pwa /bin/sh
```

---

**Last Updated:** 2026-05-26
