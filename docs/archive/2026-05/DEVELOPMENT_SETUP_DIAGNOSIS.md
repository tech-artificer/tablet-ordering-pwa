---
status: archived
archived_reason: One-off diagnosis; not maintained.
superseded_by: tablet-ordering-pwa/README.md
archived_on: 2026-05-14
---
# Tablet Ordering PWA - Development Setup Diagnosis

**Generated**: 2026-05-07
**Status**: RUNNING ✓
**Container**: tablet-ordering-pwa-nuxt-dev-1
**Runtime**: 45+ seconds uptime

---

## SYSTEM STATUS

### Container Health
- **Status**: Up and running
- **Image**: tablet-ordering-pwa-nuxt-dev:latest
- **Port**: 3000/tcp (0.0.0.0:3000)
- **Network**: tablet-ordering-pwa_default (172.19.0.2/16)
- **Memory**: 652.9MiB / 2GiB (31.88%) ✓
- **CPU**: 0.25% ✓
- **Processes**: 90 PIDs ✓

### Dev Server Status
- **Nuxt**: 3.21.2 ✓
- **Vite**: 7.3.2 ✓
- **Nitro**: 2.13.3 ✓
- **Build Time**: ~9.8 seconds ✓
- **Client Build**: 184ms ✓
- **Server Build**: 679ms ✓
- **HMR Ready**: Yes ✓

---

## CONFIGURATION ANALYSIS

### Environment Variables (Container)
```
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
NUXT_DEV_HMR_HOST=192.168.1.100
NUXT_DEV_HMR_PORT=3000
NUXT_PUBLIC_REVERB_HOST=192.168.100.7
NUXT_PUBLIC_REVERB_PORT=443
NUXT_PUBLIC_REVERB_SCHEME=https
NUXT_PUBLIC_API_BASE_URL=http://192.168.1.100/api
```

### File Watching Configuration
- **Polling**: Enabled (NODE_ENV=development)
- **Poll Interval**: 2000ms ✓ (changed from problematic 100ms)
- **Binary Interval**: 2000ms ✓
- **Ignored Patterns**: /node_modules, /.nuxt, /.output ✓

### HMR (Hot Module Replacement)
- **Host**: 192.168.1.100 (dev machine IP) ✓
- **Port**: 3000 ✓
- **Protocol**: ws (WebSocket)
- **Status**: Configured for local network ✓

---

## STORAGE & DEPENDENCIES

### Mounted Volumes
```
Host Path           →  Container Path    Type        Purpose
.                   →  /app              bind        Source code sync
/app/node_modules   →  named volume      volume      Persist node_modules
/app/.nuxt          →  named volume      volume      Build cache
/app/.output        →  named volume      volume      Build output
```

### Build Artifacts
- **.nuxt**: 208 entries, fully initialized ✓
- **node_modules**: 803.5 MiB, 927 top-level packages ✓
- **Memory Maps**: 1351 entries (heavy build tooling)

### .dockerignore Coverage
- ✓ Git files excluded
- ✓ node_modules excluded (installed in container)
- ✓ Build outputs excluded
- ✓ Environment files handled correctly
- ✓ IDE/editor files excluded
- ✓ CI/CD configs excluded

---

## NETWORK CONFIGURATION

### Docker Network
- **Network Name**: tablet-ordering-pwa_default
- **Driver**: bridge
- **Subnet**: 172.19.0.0/16
- **Gateway**: 172.19.0.1
- **IPv6**: Disabled

### Container Networking
- **IP Address**: 172.19.0.2
- **MAC Address**: 46:70:67:e0:96:4c
- **Port Binding**: 0.0.0.0:3000 → 3000/tcp
- **IPv6**: Not applicable

### External Network Access
- **Host Machine IP**: 192.168.1.100 (as configured)
- **Backend Server IP**: 192.168.100.7 (Reverb/API)
- **Access URL**: http://192.168.1.100:3000 (local network only)

---

## POTENTIAL ISSUES & RISKS

### 🟡 CRITICAL: HMR Connectivity from Local Network
**Problem**: Browser clients on local network connect to HMR at `192.168.1.100:3000`, but this requires:
- Your dev machine to have that IP address (`ipconfig` on Windows)
- No firewall blocking port 3000 TCP
- The IP address configured in compose.dev.yaml must match your actual network IP

**Risk Level**: HIGH
**Impact**: Hot reload will NOT work if IP mismatch
**Solution**: Verify and update IP in compose.dev.yaml

### 🟡 API Connectivity Issue
**Problem**: `NUXT_PUBLIC_API_BASE_URL=http://192.168.1.100/api` assumes:
- API is running on port 80 (default HTTP)
- No HTTPS required in dev
- Your backend nginx is listening on 192.168.1.100

**Risk Level**: MEDIUM
**Current Status**: Not verified (app not tested with network requests)
**Solution**: Test API calls from browser dev console after accessing app

### 🟡 Reverb WebSocket Configuration
**Problem**: 
- `REVERB_HOST=192.168.100.7` is hardcoded (different IP from dev machine)
- `REVERB_SCHEME=https` requires valid SSL certificate
- Browser will fail WS handshake if certificate is self-signed or invalid

**Risk Level**: MEDIUM
**Current Status**: Not verified in browser
**Solution**: Test WebSocket connection; may need cert configuration

### 🟡 File Sync Reliability
**Problem**: 
- Polling interval 2000ms = 2-second delay before changes detected
- Bind mount on Windows (WSL2/Docker Desktop) can have sync issues
- Large node_modules (803.5MB) can cause polling lag

**Risk Level**: LOW-MEDIUM
**Current Status**: Polling configured correctly, but not tested
**Solution**: Make test change to verify sync; increase interval if too slow

### 🔴 Missing .env.dev & .env.local
**Problem**: 
- `.env.dev` and `.env.local` created but Docker Compose doesn't auto-load them
- Only `.env` is loaded via compose.dev.yaml (if at all)
- Environment variables are hardcoded in compose.dev.yaml instead

**Risk Level**: MEDIUM
**Current Status**: IPs hardcoded in YAML (workaround active)
**Solution**: Remove hardcoded IPs, use proper env file loading

### 🟡 Memory & CPU Constraints
**Problem**:
- Mem limit: 2GiB, reservation: 1GiB
- Current usage: 652.9MiB (31.88%)
- Node.js + Vite + Nitro + 1473 npm packages = heavy workload
- Future builds or hot reload cycles could spike memory

**Risk Level**: LOW-MEDIUM
**Current Status**: Safe margin (1.3GB free), but monitor during development
**Solution**: Pre-allocate 2GB minimum; reduce if host memory is constrained

### 🟡 File Change Detection Delay
**Problem**:
- 2000ms polling means changes take up to 2 seconds to be detected
- User expects near-instant HMR
- Large node_modules traversal can slow polling further

**Risk Level**: LOW
**Current Status**: Acceptable for development, not production-grade
**Solution**: Acceptable; can reduce interval if polling doesn't cause lag

### 🟠 Development Security Issues
**Problem**:
- Container running as root (no user isolation)
- Credentials hardcoded in environment (REVERB_APP_KEY)
- No authentication on dev server (accessible from entire local network)
- Debug logs enabled (NUXT_PUBLIC_DEBUG=true in .env)

**Risk Level**: MEDIUM (development only, but insecure habits)
**Current Status**: Acceptable for dev, but note security concerns
**Solution**: Add non-root user to Dockerfile.dev; rotate keys before production

### 🟠 Volume Mount Issues
**Problem**:
- `/app/node_modules` and `/.nuxt` are named volumes
- Named volumes survive container restart
- But if you change package.json, volume is stale (npm ci won't run again)

**Risk Level**: LOW
**Current Status**: Not an issue yet, but remember for troubleshooting
**Solution**: `docker volume rm tablet-ordering-pwa_*` if dependencies get corrupted

### 🟠 No Health Check
**Problem**:
- No healthcheck defined in compose.dev.yaml
- Container appears "Up" but Nuxt might be crashing silently
- Docker won't auto-restart on failure

**Risk Level**: LOW
**Current Status**: Server is running, but no monitoring
**Solution**: Add healthcheck (curl localhost:3000 or similar)

### 🟠 Single Points of Failure
**Problem**:
- No load balancing (single container)
- No automatic restart policy (unless docker daemon restarts)
- `restart: unless-stopped` only works for docker-managed failures

**Risk Level**: LOW (acceptable for dev)
**Current Status**: Fine for development, but note for production
**Solution**: Acceptable for dev environment

---

## NETWORK ACCESSIBILITY CHECKLIST

- [ ] **Dev machine IP is correct** — Verify with `ipconfig` (Windows) or `ip addr` (Linux/Mac)
- [ ] **Port 3000 is open** — `netstat -an | findstr 3000` shows LISTENING
- [ ] **Firewall allows port 3000** — Test from another device on LAN: `curl http://192.168.1.100:3000`
- [ ] **Backend (192.168.100.7) is accessible** — Verify API and WebSocket endpoints
- [ ] **DNS resolution works** — If using hostnames instead of IPs, test resolution
- [ ] **HMR connects in browser** — Check browser console for WebSocket connection
- [ ] **API calls work** — Test network tab in browser dev tools

---

## FILE SYNC TEST

**To verify hot reload works:**

1. Make a change to `/pages/index.vue` (e.g., add text to a template)
2. Save the file
3. **Expected**: Console shows `ℹ files changed: 1` within 2-4 seconds
4. **Expected**: Browser reloads automatically (or shows HMR notification)
5. **If not**: Check file sync issue or polling configuration

---

## COMPOSE.DEV.YAML ISSUES

### ✓ Correct
- Host/PORT configuration correct
- Node.js environment variables set
- Memory limits appropriate
- Named volumes for node_modules persistence

### ⚠ Warnings
- IPs hardcoded instead of using .env file loading
- No healthcheck
- No logging configuration
- No restart policy beyond default (would be better: restart: always)
- No resource limits on CPU (only memory)

### ❌ Missing
- `depends_on` - No dependency on other services (if any exist)
- `networks` - Should explicitly define network attachment
- `cap_drop` - For security (container running as root)
- `.dockerignore` properly referenced in build context

---

## NUXT.CONFIG.TS ANALYSIS

### ✓ Correct
- HMR configured with environment variables
- Polling enabled for development
- Vite server listening on 0.0.0.0 (all interfaces)
- Watch ignored patterns exclude heavy directories
- PWA configuration appropriate
- Environment-specific config (NODE_ENV checks)

### ⚠ Warnings
- `ssr: false` - Not ideal for PWA SEO, but acceptable for tablet kiosk
- `typeCheck: false` - Faster builds but misses errors early
- `payloadExtraction: false` - May impact performance
- No production-specific optimizations

### ✓ HMR Configuration
- Respects `NUXT_DEV_HMR_HOST` environment variable
- Falls back to undefined (auto-detect) if not set
- WebSocket protocol configured
- Port 3000 hardcoded in compose.dev.yaml

---

## DOCKER IMAGE BUILD

### Build Performance
- Layers cached effectively
- npm ci used (good for reproducibility)
- Total build time: ~1 minute (acceptable)
- Final image size: Not measured, but ~1.5GB estimated

### Runtime Performance
- Startup time: ~10 seconds from container start
- Memory usage: Stable at 652MB
- CPU usage: 0.25% idle (low, acceptable)
- No memory leaks observed (short runtime)

---

## RECOMMENDATIONS (Priority Order)

### P1 - Critical (Do Now)
1. **Verify dev machine IP**: `ipconfig` → update compose.dev.yaml if needed
2. **Test API connectivity**: Access http://192.168.1.100:3000 from another device
3. **Verify HMR**: Make a test file change and confirm hot reload works
4. **Test Reverb WebSocket**: Check browser console for WS connection

### P2 - Important (Should Do)
1. Create `.env.dev` and implement proper env file loading (don't hardcode IPs in YAML)
2. Add healthcheck to compose.dev.yaml
3. Add non-root user to Dockerfile.dev (security)
4. Document network IPs in README (so team knows to update them)

### P3 - Nice to Have (Can Do)
1. Add logging configuration (structured logs for debugging)
2. Add CPU limits to compose.dev.yaml
3. Add explicit network definition in compose.dev.yaml
4. Create a `.env.dev.example` template for team onboarding

---

## NEXT STEPS

1. **Access the app**: Open browser to `http://192.168.1.100:3000`
2. **Test navigation**: Click through pages to verify routing
3. **Test hot reload**: Edit a `.vue` file and save — should see HMR in browser
4. **Check browser console**: Look for any JavaScript errors, API failures, WebSocket issues
5. **Test API calls**: Open Network tab, trigger API request, verify response
6. **Verify Reverb connection**: Check for WebSocket connection in Network tab
7. **Run on device**: If this is for tablets, test from actual device on LAN

---

## TROUBLESHOOTING QUICK REFERENCE

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| "Cannot reach http://192.168.1.100:3000" | IP mismatch or firewall | Update IP in compose.dev.yaml, check firewall |
| HMR not working (file changes don't reload) | Polling not detecting changes | Verify bind mount, reduce interval, check file write |
| "Connection refused" on API calls | API not running or wrong IP | Verify backend is running, update API_BASE_URL |
| WebSocket connection fails | Reverb server unreachable | Verify REVERB_HOST, check certificate if HTTPS |
| Container crashes with OOM | Memory limit exceeded | Increase mem_limit in compose.dev.yaml |
| Build is slow | Polling traversing node_modules | Verify ignored patterns in nuxt.config.ts |
| Port 3000 already in use | Conflict with other service | `docker ps` to find other container, or change port |

---

**Diagnosis Complete** | **Status**: Operational ✓ | **Ready for Development** ✓
