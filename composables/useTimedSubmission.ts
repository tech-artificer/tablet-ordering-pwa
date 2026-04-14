import { computed, onUnmounted, ref } from 'vue'

type SubmissionPhase = 'idle' | 'countdown' | 'submitting' | 'success' | 'error'

interface SubmissionSuccessState {
  title: string
  message: string
}

interface SubmissionOptions<TResult> {
  countdownFrom?: number
  successTitle: string
  successMessage: string
  successDelayMs?: number
  onSuccess?: (result: TResult) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}

const DEFAULT_COUNTDOWN = 3

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

export const useTimedSubmission = () => {
  const phase = ref<SubmissionPhase>('idle')
  const countdown = ref(DEFAULT_COUNTDOWN)
  const errorMessage = ref<string | null>(null)
  const successState = ref<SubmissionSuccessState | null>(null)

  let countdownTimer: number | null = null
  let successTimer: number | null = null

  const isCountdowning = computed(() => phase.value === 'countdown')
  const isSubmitting = computed(() => phase.value === 'submitting')
  const isBusy = computed(() => phase.value === 'countdown' || phase.value === 'submitting')
  const hasSuccess = computed(() => phase.value === 'success')

  const clearCountdownTimer = () => {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  const clearSuccessTimer = () => {
    if (successTimer !== null) {
      window.clearTimeout(successTimer)
      successTimer = null
    }
  }

  const reset = () => {
    clearCountdownTimer()
    clearSuccessTimer()
    phase.value = 'idle'
    countdown.value = DEFAULT_COUNTDOWN
    errorMessage.value = null
    successState.value = null
  }

  const cancelCountdown = () => {
    if (phase.value !== 'countdown') {
      return
    }

    clearCountdownTimer()
    phase.value = 'idle'
    countdown.value = DEFAULT_COUNTDOWN
  }

  const runSubmission = async <TResult>(
    task: () => Promise<TResult>,
    options: SubmissionOptions<TResult>,
  ) => {
    clearCountdownTimer()
    phase.value = 'submitting'

    try {
      const result = await task()
      phase.value = 'success'
      successState.value = {
        title: options.successTitle,
        message: options.successMessage,
      }
      vibrate([18, 40, 18])

      const finalize = async () => {
        if (options.onSuccess) {
          await options.onSuccess(result)
        }
      }

      if (options.successDelayMs && options.successDelayMs > 0) {
        successTimer = window.setTimeout(() => {
          void finalize()
        }, options.successDelayMs)
      } else {
        await finalize()
      }

      return result
    } catch (error: any) {
      phase.value = 'error'
      errorMessage.value = error?.message || 'Unable to complete the request.'
      successState.value = null

      if (options.onError) {
        await options.onError(error)
      }

      throw error
    }
  }

  const start = async <TResult>(
    task: () => Promise<TResult>,
    options: SubmissionOptions<TResult>,
  ) => {
    if (isBusy.value) {
      return
    }

    clearSuccessTimer()
    errorMessage.value = null
    successState.value = null
    phase.value = 'countdown'
    countdown.value = options.countdownFrom ?? DEFAULT_COUNTDOWN
    vibrate(12)

    countdownTimer = window.setInterval(() => {
      countdown.value -= 1

      if (countdown.value <= 0) {
        void runSubmission(task, options)
      }
    }, 1000)
  }

  onUnmounted(() => {
    clearCountdownTimer()
    clearSuccessTimer()
  })

  return {
    phase,
    countdown,
    errorMessage,
    successState,
    isCountdowning,
    isSubmitting,
    isBusy,
    hasSuccess,
    start,
    cancelCountdown,
    reset,
  }
}