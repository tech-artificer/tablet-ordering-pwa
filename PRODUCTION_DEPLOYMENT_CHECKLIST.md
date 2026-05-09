# Production Deployment Checklist

## Pre-Deployment (48 hours before)

- [ ] **Code Review**
  - [ ] All features tested locally
  - [ ] No console errors in dev tools
  - [ ] No memory leaks detected
  - [ ] No infinite loops or hangs

- [ ] **Build Verification**
  - [ ] `docker build -f Dockerfile.prod` succeeds
  - [ ] Final image size ~50MB
  - [ ] No build warnings or errors
  - [ ] Build completes in <2 minutes

- [ ] **Security Audit**
  - [ ] No hardcoded credentials in code
  - [ ] Environment variables properly injected
  - [ ] No dangerous permissions in nginx
  - [ ] HTTPS enabled for Reverb connection

- [ ] **Configuration Review**
  - [ ] `compose.prod.yaml` reviewed
  - [ ] Memory limits appropriate for target hardware
  - [ ] Health check parameters tested
  - [ ] Logging configuration verified

## Pre-Deployment Testing (24 hours before)

- [ ] **Local Container Testing**
  ```bash
  docker build -f Dockerfile.prod -t tablet-pwa:test .
  docker run -p 3000:3000 tablet-pwa:test
  ```
  - [ ] Container starts without errors
  - [ ] Page loads in browser
  - [ ] SPA routing works (navigate to /settings, /menu, etc.)
  - [ ] Assets load correctly
  - [ ] No 404 errors in browser console

- [ ] **Cache Headers Verification**
  ```bash
  curl -I http://localhost:3000/
  # Check: Cache-Control: public, max-age=60, must-revalidate
  
  curl -I http://localhost:3000/favicon.ico
  # Check: Cache-Control: public, max-age=300, must-revalidate
  ```

- [ ] **Service Worker Testing**
  - [ ] DevTools → Application → Service Workers
  - [ ] SW installs successfully
  - [ ] Offline mode works (DevTools → Network → offline)
  - [ ] Cached resources load from cache
  - [ ] Cache Storage shows <5MB total

- [ ] **Performance Testing**
  - [ ] Lighthouse score >80
  - [ ] First Contentful Paint <2 seconds
  - [ ] Time to Interactive <3 seconds
  - [ ] Bundle size report reviewed

- [ ] **API Integration Testing**
  - [ ] API calls work from container
  - [ ] Reverb WebSocket connects
  - [ ] Real-time updates function
  - [ ] Error handling works

## Deployment Day (Go/No-Go)

### Pre-Deployment (2 hours before)

- [ ] **Stakeholder Communication**
  - [ ] Team notified of deployment window
  - [ ] Support staff briefed on changes
  - [ ] Rollback plan documented
  - [ ] On-call engineer assigned

- [ ] **Database & Backend Checks**
  - [ ] Backend API is healthy
  - [ ] Reverb server running
  - [ ] Database responsive
  - [ ] All microservices operational

- [ ] **Infrastructure Checks**
  - [ ] Target servers have capacity
  - [ ] Network connectivity verified
  - [ ] Firewall rules confirmed
  - [ ] SSL certificates valid

- [ ] **Monitoring Setup**
  - [ ] Error tracking enabled (Sentry, etc.)
  - [ ] Performance monitoring active
  - [ ] Uptime monitoring running
  - [ ] Alert channels tested

### Deployment Phase

- [ ] **Stop Old Container**
  ```bash
  docker compose -f compose.prod.yaml down
  ```

- [ ] **Deploy New Version**
  ```bash
  docker compose -f compose.prod.yaml up -d
  ```

- [ ] **Verify Deployment**
  ```bash
  docker compose -f compose.prod.yaml ps
  # Should show: "Up" status
  
  docker compose -f compose.prod.yaml logs -f --tail=50
  # Should show: no errors, healthy status
  ```

- [ ] **Health Check Validation**
  - [ ] Container health status: "healthy"
  - [ ] HTTP response 200 from container
  - [ ] nginx logging normally

- [ ] **Network Accessibility**
  ```bash
  curl http://192.168.1.100:3000/
  # Should return index.html content
  ```

- [ ] **Functional Testing** (5-10 minutes)
  - [ ] Load app in browser
  - [ ] Navigate through all pages
  - [ ] Test menu ordering flow
  - [ ] Test settings changes
  - [ ] No JavaScript errors in console
  - [ ] Verify network tab (assets load, no 404s)

### Post-Deployment (30 minutes)

- [ ] **Real-time Monitoring**
  - [ ] Error rate normal (0-1%)
  - [ ] Response time <500ms
  - [ ] Memory usage stable <100MB
  - [ ] CPU usage <50%

- [ ] **User Testing** (on actual tablet if possible)
  - [ ] App loads on tablet
  - [ ] Touch interactions work
  - [ ] Network requests succeed
  - [ ] Orders can be placed
  - [ ] UI responsive (no lag)

- [ ] **Log Review**
  - [ ] No ERROR level logs
  - [ ] No warnings about cache conflicts
  - [ ] No API timeout errors
  - [ ] Deployment log saved for audit

- [ ] **Notification**
  - [ ] Team notified: deployment successful
  - [ ] Stakeholders updated
  - [ ] Monitoring active
  - [ ] Rollback standby cancelled

## Post-Deployment (First 24 hours)

### Immediate (0-1 hour)

- [ ] **Continuous Monitoring**
  - [ ] Error rates remain low
  - [ ] Performance metrics normal
  - [ ] No spike in support tickets
  - [ ] Team alert channels monitored

- [ ] **User Feedback Collection**
  - [ ] Any issues reported?
  - [ ] Performance feedback?
  - [ ] Ordering flow working?

### Extended (4-24 hours)

- [ ] **Cache Health**
  - [ ] Service Worker cache populated
  - [ ] Old cache versions cleanup
  - [ ] Tablet cache growth normal

- [ ] **Data Integrity**
  - [ ] Orders processing correctly
  - [ ] No data corruption
  - [ ] API responses consistent
  - [ ] Offline sync working if enabled

- [ ] **Performance Stability**
  - [ ] No memory leaks
  - [ ] CPU usage stable
  - [ ] Response times consistent
  - [ ] No hung requests

- [ ] **Documentation**
  - [ ] Deployment logged
  - [ ] Version tagged in git
  - [ ] Release notes published
  - [ ] Known issues documented

## Rollback Plan

**If Critical Issue Detected** (within 1 hour of deployment):

```bash
# Immediately revert to previous image
docker compose -f compose.prod.yaml down
docker rmi tablet-ordering-pwa:prod  # Remove broken image
docker pull tablet-ordering-pwa:previous
docker compose -f compose.prod.yaml up -d
```

**Rollback Criteria**:
- [ ] Error rate >5%
- [ ] API failures
- [ ] Service Worker corruption detected
- [ ] Memory leak or OOM
- [ ] Unable to place orders
- [ ] Tablet crashes or freezes

**Post-Rollback**:
- [ ] Notify stakeholders immediately
- [ ] Investigation begins
- [ ] Review logs for root cause
- [ ] Schedule hotfix deployment

## Post-Rollback Investigation

- [ ] Review deployment logs
- [ ] Check browser console on tablets
- [ ] Inspect network requests
- [ ] Monitor error tracking
- [ ] Gather tablet device metrics
- [ ] Root cause analysis
- [ ] Issue ticket created

## Success Criteria

**Deployment is successful if within 24 hours**:

- ✓ Error rate remains <1%
- ✓ Response time average <500ms
- ✓ No crash loops or restarts
- ✓ Memory usage <100MB sustained
- ✓ All orders processed correctly
- ✓ Real-time updates working
- ✓ Offline mode functional
- ✓ No support escalations related to the deployment
- ✓ All monitoring metrics normal

---

## Quick Reference Commands

### Pre-Deployment
```bash
# Build production image
docker build -f Dockerfile.prod -t tablet-ordering-pwa:prod .

# Test locally
docker run -p 3000:3000 tablet-ordering-pwa:prod

# Check image size
docker images tablet-ordering-pwa:prod
```

### Deployment
```bash
# Stop current
docker compose -f compose.prod.yaml down

# Start new
docker compose -f compose.prod.yaml up -d

# Check status
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f
```

### Monitoring
```bash
# CPU/Memory stats
docker stats tablet-ordering-pwa

# Access logs
docker exec <container> tail -f /var/log/nginx/access.log

# Error logs
docker exec <container> tail -f /var/log/nginx/error.log
```

### Rollback
```bash
docker compose -f compose.prod.yaml down
docker rmi tablet-ordering-pwa:prod
docker pull tablet-ordering-pwa:previous
docker compose -f compose.prod.yaml up -d
```

---

**Last Updated**: 2026-05-07
**Version**: 1.0
**Status**: Production Ready ✓
