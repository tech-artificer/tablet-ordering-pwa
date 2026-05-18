import { ref, readonly } from "vue"
import { v4 as uuidv4 } from "uuid"

export interface SubmissionState {
  isSubmitting: boolean
  submissionId: string | null
  lastSubmissionTime: number | null
}

export function useSubmissionIdempotency () {
    const submissionState = ref<SubmissionState>({
        isSubmitting: false,
        submissionId: null,
        lastSubmissionTime: null
    })

    const generateSubmissionId = (): string => {
        return uuidv4()
    }

    const createSubmission = (): string => {
        const submissionId = generateSubmissionId()
        submissionState.value = {
            isSubmitting: true,
            submissionId,
            lastSubmissionTime: Date.now()
        }
        return submissionId
    }

    const completeSubmission = (): void => {
        submissionState.value.isSubmitting = false
    }

    const resetSubmission = (): void => {
        submissionState.value = {
            isSubmitting: false,
            submissionId: null,
            lastSubmissionTime: null
        }
    }

    const isDuplicateSubmission = (newSubmissionId: string): boolean => {
        return submissionState.value.submissionId === newSubmissionId &&
           submissionState.value.isSubmitting
    }

    const canSubmit = (): boolean => {
        return !submissionState.value.isSubmitting
    }

    return {
        submissionState: readonly(submissionState),
        generateSubmissionId,
        createSubmission,
        completeSubmission,
        resetSubmission,
        isDuplicateSubmission,
        canSubmit
    }
}
