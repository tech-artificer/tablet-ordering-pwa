import { logger } from './logger'

export async function getLocalIp(timeout = 1500): Promise<string | null> {
  // Try to extract local LAN IP using WebRTC ICE candidates.
  // This may be blocked or return mDNS names in some browsers; handle gracefully.
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !(window as any).RTCPeerConnection) {
      resolve(null)
      return
    }

    const ipRegex = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/
    const pc: RTCPeerConnection = new (window as any).RTCPeerConnection({ iceServers: [] })
    let resolved = false

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        try { pc.close() } catch (e) { logger.debug('[getLocalIp] pc.close failed', e) }
        resolve(null)
      }
    }, timeout)

    const handleIp = (ip: string | null) => {
      if (resolved) return
      if (ip) {
        resolved = true
        clearTimeout(timer)
        try { pc.close() } catch (e) { logger.debug('[getLocalIp] pc.close failed', e) }
        resolve(ip)
      }
    }

    try {
      // Create a bogus data channel to prompt ICE gathering
      pc.createDataChannel('ip-detect')
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        const cand = event.candidate && event.candidate.candidate
        if (!cand) return
        const m = cand.match(ipRegex)
        if (m && m[1]) {
          const ip = m[1]
          // Prefer private LAN addresses
          if (ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || ip.startsWith('169.254.')) {
            handleIp(ip)
          } else {
            // If no private IP found yet, keep as candidate but don't resolve immediately
            handleIp(ip)
          }
        }
      }

      pc.createOffer().then((sdp) => pc.setLocalDescription(sdp)).catch((e) => logger.debug('[getLocalIp] createOffer failed', e))
    } catch (e) {
      clearTimeout(timer)
      logger.debug('[getLocalIp] RTC init failed', e)
      try { pc.close() } catch (ee) { logger.debug('[getLocalIp] pc.close failed', ee) }
      resolve(null)
    }
  })
}
