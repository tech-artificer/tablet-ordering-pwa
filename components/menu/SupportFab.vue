<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import { Paintbrush, Droplets, CreditCard, Bell, Hand, X } from 'lucide-vue-next'

interface SupportButton {
  id: string
  label: string
  icon: Component
  gradient: string
  action: () => void
}

const emit = defineEmits<{
  'requestSupport': [type: string]
}>()

const isExpanded = ref(false)
const isSending = ref(false)

const toggleMenu = () => {
  isExpanded.value = !isExpanded.value
}

const handleRequest = async (type: string, label: string) => {
  if (isSending.value) return
  
  isSending.value = true
  isExpanded.value = false
  
  try {
    emit('requestSupport', type)
    // ElMessage.success(`${label} request sent — staff will assist shortly`)
  } catch (error) {
    // ElMessage.error('Failed to send request')
  } finally {
    isSending.value = false
  }
}

const supportButtons: SupportButton[] = [
  {
    id: 'clean',
    label: 'Clean Table',
    icon: Paintbrush,
    gradient: 'from-orange-400 to-orange-600',
    action: () => handleRequest('clean', 'Clean Table')
  },
  {
    id: 'water',
    label: 'Water',
    icon: Droplets,
    gradient: 'from-blue-400 to-blue-600',
    action: () => handleRequest('water', 'Water')
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    gradient: 'from-green-400 to-green-600',
    action: () => handleRequest('billing', 'Billing/Checkout')
  },
  {
    id: 'support',
    label: 'Call Staff',
    icon: Bell,
    gradient: 'from-purple-400 to-purple-600',
    action: () => handleRequest('support', 'Staff Call')
  }
]
</script>

<template>
  <div class="support-fab-container">
    <!-- Backdrop -->
    <Transition name="backdrop">
      <div 
        v-if="isExpanded" 
        class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        @click="isExpanded = false"
      />
    </Transition>

    <!-- Support Buttons (appear when expanded) -->
    <Transition name="menu">
      <div v-if="isExpanded" class="support-menu z-50">
        <div 
          v-for="(button, index) in supportButtons" 
          :key="button.id"
          class="support-button-wrapper"
          :style="{ 
            transitionDelay: `${index * 50}ms`,
            bottom: `${80 + (index * 72)}px`
          }"
        >
          <button
            :class="[
              'support-button',
              'bg-gradient-to-br',
              button.gradient
            ]"
            @click="button.action"
            :disabled="isSending"
          >
            <component :is="button.icon" :size="24" :stroke-width="2" class="support-icon" />
          </button>
          <span class="support-label">{{ button.label }}</span>
        </div>
      </div>
    </Transition>

    <!-- Main FAB -->
    <button
      :class="[
        'main-fab',
        isExpanded && 'expanded',
        isSending && 'loading'
      ]"
      @click="toggleMenu"
      :disabled="isSending"
    >
      <Transition name="icon-rotate" mode="out-in">
        <span v-if="!isExpanded"><Hand :size="28" :stroke-width="2" /></span>
        <span v-else><X :size="28" :stroke-width="2" /></span>
      </Transition>
    </button>

    <!-- Pulse ring animation when not expanded -->
    <div v-if="!isExpanded" class="pulse-ring" />
  </div>
</template>

<style scoped>
.support-fab-container {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 50;
}

/* Main FAB */
.main-fab {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.5),
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(59, 130, 246, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 51;
}

.main-fab:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 
    0 6px 16px rgba(59, 130, 246, 0.6),
    0 12px 32px rgba(0, 0, 0, 0.3),
    0 0 0 4px rgba(59, 130, 246, 0.3);
}

.main-fab:active:not(:disabled) {
  transform: scale(0.95);
}

.main-fab.expanded {
  background: linear-gradient(135deg, #252525 0%, #1a1a1a 100%);
  box-shadow: 
    0 6px 16px rgba(37, 37, 37, 0.5),
    0 12px 32px rgba(0, 0, 0, 0.3);
}

.main-fab.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Pulse ring animation */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid #3b82f6;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.4);
  }
}

/* Support Menu */
.support-menu {
  position: absolute;
  bottom: 0;
  left: 0;
}

.support-button-wrapper {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.support-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.support-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.support-button:hover::before {
  opacity: 1;
}

.support-button:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.2),
    0 3px 10px rgba(0, 0, 0, 0.15);
}

.support-button:active:not(:disabled) {
  transform: scale(0.95);
}

.support-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.support-icon {
  font-size: 24px;
  position: relative;
  z-index: 1;
}

.support-label {
  font-size: 14px;
  font-weight: 600;
  color: #252525;
  background: white;
  padding: 8px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  min-width: 100px;
  text-align: center;
}

/* Transitions */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: all 0.3s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
  backdrop-filter: blur(0);
}

.menu-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-leave-active {
  transition: all 0.3s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.icon-rotate-enter-active,
.icon-rotate-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-rotate-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.icon-rotate-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>
