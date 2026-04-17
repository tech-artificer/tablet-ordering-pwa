// tests/offline-sync-ui.spec.ts
// Unit tests for components/ui/OfflineSyncStatus.vue

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsOnline = ref(true)
vi.mock('~/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

const mockSyncStore = {
  isSyncing: false,
  pendingCount: 0,
  lastError: null,
}
vi.mock('~/stores/OfflineSync', () => ({
  useOfflineSyncStore: () => mockSyncStore,
}))

vi.mock('~/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------

import OfflineSyncStatus from '../components/ui/OfflineSyncStatus.vue'

describe('OfflineSyncStatus.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsOnline.value = true
    mockSyncStore.isSyncing = false
    mockSyncStore.pendingCount = 0
  })

  it('renders nothing when online and queue empty', () => {
    const wrapper = mount(OfflineSyncStatus)
    // The inner div is conditionally shown via v-if; when hidden it should not be in DOM
    expect(wrapper.find('[class*="fixed"]').exists()).toBe(false)
  })

  it('shows offline message when isOnline is false', async () => {
    mockIsOnline.value = false
    const wrapper = mount(OfflineSyncStatus)
    // Wait for reactive updates
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('Connection Lost')
  })

  it('shows syncing message when online with pending orders', async () => {
    mockIsOnline.value = true
    mockSyncStore.isSyncing = true
    mockSyncStore.pendingCount = 2
    const wrapper = mount(OfflineSyncStatus)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Syncing')
    expect(wrapper.text()).toContain('2')
  })

  it('shows syncing message when pendingCount > 0 even if not actively syncing', async () => {
    mockIsOnline.value = true
    mockSyncStore.isSyncing = false
    mockSyncStore.pendingCount = 1
    const wrapper = mount(OfflineSyncStatus)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Syncing')
  })

  it('banner is hidden when queue empty and not syncing', async () => {
    mockIsOnline.value = true
    mockSyncStore.isSyncing = false
    mockSyncStore.pendingCount = 0
    const wrapper = mount(OfflineSyncStatus)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[class*="fixed"]').exists()).toBe(false)
  })
})
