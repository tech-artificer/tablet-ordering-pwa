// // utils/pollQueue.ts
// // Small helper to queue a start function until a session (or other condition) becomes true.
// export class PollQueue {
//   private queued = false
//   private queuedFn: (() => void) | null = null

//   requestStart(sessionStarted: boolean, fn: () => void) {
//     if (sessionStarted) {
//       // start immediately
//       try { fn() } catch (e) { /* ignore */ }
//       return
//     }

//     // queue start for when session starts
//     this.queued = true
//     this.queuedFn = fn
//   }

//   onSessionStarted() {
//     if (this.queued && this.queuedFn) {
//       try { this.queuedFn() } catch (e) { /* ignore */ }
//       this.queued = false
//       this.queuedFn = null
//     }
//   }

//   clear() {
//     this.queued = false
//     this.queuedFn = null
//   }
// }

// export default PollQueue
