
import { ref } from 'vue'
import { useDeviceStore } from '~/stores/Device'
import { useApi } from './useApi'
export const useDeviceAuth = () => {

  const device = useDeviceStore()
  const loading = ref(false)

  const register = async (payload: any) => {
    loading.value = true
    const api = useApi()
    try {
      const res = await api.post('/api/devices/register', payload)
      // assume backend returns token + device
      // Update nested refs on the device store
      try { device.device = res.data.device || device.device } catch (e) { /* ignore */ }
      try { device.token = res.data.token ?? device.token } catch (e) { /* ignore */ }
      return res.data
    } finally {
      loading.value = false
    }
  }

  const verifyToken = async () => {
    const api = useApi()
    
    try {
      const res = await api.get('/api/token/verify')
      return res.data
    } catch (err) {
      return null
    }
  }

  return { register, verifyToken, loading }
}
