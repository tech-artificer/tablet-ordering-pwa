import { ElMessage } from 'element-plus'

export function notifyInfo(message: string) {
  try { ElMessage.info({ message, duration: 3000 }) } catch (e) { /* ignore */ }
}

export function notifyWarning(message: string) {
  try { ElMessage.warning({ message, duration: 4000 }) } catch (e) { /* ignore */ }
}

export function notifyError(message: string) {
  try { ElMessage.error({ message, duration: 5000 }) } catch (e) { /* ignore */ }
}

export function notifyBlockedAction(message?: string) {
  notifyWarning(message || 'Action blocked: initial order placed — use Refill mode to add items')
}
