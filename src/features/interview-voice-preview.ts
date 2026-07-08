import { computed, ref } from 'vue'

import type {
  InterviewTranscriptVO,
  InterviewVoicePreviewFallbackReason,
  InterviewVoicePreviewState,
  InterviewVoiceSubmissionVO
} from '@/types/interview'

export interface InterviewVoiceRecordedAudio {
  blob: Blob
  mimeType: string
  durationMs?: number
}

export interface InterviewVoiceConfirmedMeta {
  voiceSubmissionId?: number
  transcriptId?: number
  transcriptConfidence?: number
  answerSource?: 'VOICE_TRANSCRIPT' | 'MANUAL_TRANSCRIPT' | string
  lowConfidence?: boolean
  fallback?: boolean
  traceId?: string
}

interface UseInterviewVoicePreviewOptions {
  onConfirmedText: (text: string, meta?: InterviewVoiceConfirmedMeta) => void
  onRecordedAudio?: (audio: InterviewVoiceRecordedAudio) => void | Promise<void>
  onFallbackText?: () => void
}

const unsupportedMessage = 'Current browser cannot record audio. Please answer with text.'
const emptyAudioMessage = 'No usable audio was captured. Please record again or answer with text.'
const unavailableTranscriptMessage = 'ASR is unavailable. Please edit a manual transcript before confirming.'
const manualFallbackMessage = 'Manual text fallback is active. Draft text must be confirmed before submission.'

const preferredMimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'video/webm;codecs=opus',
  'video/webm',
  'audio/ogg;codecs=opus'
]

const stopTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop())
}

const chooseMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }
  return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || ''
}

const isLowConfidenceTranscript = (item?: InterviewTranscriptVO | null) => {
  if (!item) return false
  return Boolean(item.lowConfidence) || String(item.transcriptStatus || '').toUpperCase() === 'LOW_CONFIDENCE'
}

export const useInterviewVoicePreview = (options: UseInterviewVoicePreviewOptions) => {
  const state = ref<InterviewVoicePreviewState>('idle')
  const fallbackReason = ref<InterviewVoicePreviewFallbackReason>()
  const draftText = ref('')
  const confirmedText = ref('')
  const errorMessage = ref('')
  const audioCaptured = ref(false)
  const audioBlob = ref<Blob | null>(null)
  const audioMimeType = ref('')
  const audioDurationMs = ref<number | null>(null)
  const recordingStartedAt = ref<number | null>(null)
  const submission = ref<InterviewVoiceSubmissionVO | null>(null)
  const transcript = ref<InterviewTranscriptVO | null>(null)
  const confirmedMeta = ref<InterviewVoiceConfirmedMeta | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let audioChunks: BlobPart[] = []

  const isBusy = computed(() => state.value === 'uploading' || state.value === 'transcribing')
  const canRecord = computed(() => ['idle', 'submitted', 'fallback_text'].includes(state.value) && !isBusy.value)
  const canStopRecording = computed(() => state.value === 'recording')
  const canEditDraft = computed(() => ['recorded', 'draft', 'fallback_text'].includes(state.value) && !isBusy.value)
  const canConfirmDraft = computed(() => canEditDraft.value && Boolean(draftText.value.trim()))
  const hasPendingUnconfirmedTranscript = computed(() =>
    isBusy.value || (['recorded', 'draft', 'fallback_text'].includes(state.value) && Boolean(draftText.value.trim()))
  )
  const isUnconfirmedDraft = hasPendingUnconfirmedTranscript

  const clearRecorderResources = () => {
    stopTracks(mediaStream)
    mediaStream = null
    mediaRecorder = null
    audioChunks = []
    recordingStartedAt.value = null
  }

  const clearCapturedAudio = () => {
    audioCaptured.value = false
    audioBlob.value = null
    audioMimeType.value = ''
    audioDurationMs.value = null
  }

  const clearBackendState = () => {
    submission.value = null
    transcript.value = null
    confirmedMeta.value = null
    confirmedText.value = ''
  }

  const enterFallback = (reason: InterviewVoicePreviewFallbackReason, message: string) => {
    clearRecorderResources()
    fallbackReason.value = reason
    errorMessage.value = message
    state.value = 'fallback_text'
    options.onFallbackText?.()
  }

  const setError = (reason: InterviewVoicePreviewFallbackReason, message: string) => {
    fallbackReason.value = reason
    errorMessage.value = message
    state.value = 'fallback_text'
    options.onFallbackText?.()
  }

  const handleRecordedAudio = (blob: Blob, mimeType: string, durationMs?: number) => {
    audioBlob.value = blob
    audioMimeType.value = mimeType
    audioDurationMs.value = durationMs || null
    audioCaptured.value = true
    state.value = 'recorded'
    if (!options.onRecordedAudio) {
      fallbackReason.value = 'transcription_unavailable'
      errorMessage.value = unavailableTranscriptMessage
      return
    }
    void Promise.resolve(options.onRecordedAudio({ blob, mimeType, durationMs })).catch((error) => {
      const message = error instanceof Error ? error.message : unavailableTranscriptMessage
      setError('upload_failed', message || unavailableTranscriptMessage)
    })
  }

  const startRecording = async () => {
    if (!canRecord.value || state.value === 'recording') return
    errorMessage.value = ''
    fallbackReason.value = undefined
    draftText.value = ''
    clearCapturedAudio()
    clearBackendState()

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      enterFallback('recording_failed', unsupportedMessage)
      return
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = chooseMimeType()
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream)
      audioChunks = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data)
      }
      mediaRecorder.onstop = () => {
        const stoppedRecorder = mediaRecorder
        const capturedChunks = audioChunks
        const stoppedAt = Date.now()
        const startedAt = recordingStartedAt.value
        const durationMs = startedAt ? Math.max(1, stoppedAt - startedAt) : undefined
        const capturedMimeType = stoppedRecorder?.mimeType || mimeType || 'audio/webm'
        clearRecorderResources()
        if (!capturedChunks.length) {
          clearCapturedAudio()
          enterFallback('recording_failed', emptyAudioMessage)
          return
        }
        const blob = new Blob(capturedChunks, { type: capturedMimeType })
        if (!blob.size) {
          clearCapturedAudio()
          enterFallback('recording_failed', emptyAudioMessage)
          return
        }
        handleRecordedAudio(blob, capturedMimeType, durationMs)
      }
      mediaRecorder.onerror = () => {
        enterFallback('recording_failed', 'Recording failed. Please answer with text.')
      }
      recordingStartedAt.value = Date.now()
      mediaRecorder.start()
      state.value = 'recording'
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      const isPermissionDenied = name === 'NotAllowedError' || name === 'PermissionDeniedError'
      enterFallback(
        isPermissionDenied ? 'permission_denied' : 'recording_failed',
        isPermissionDenied ? 'Microphone permission was denied. Please answer with text.' : unsupportedMessage
      )
    }
  }

  const stopRecording = () => {
    if (state.value !== 'recording' || !mediaRecorder) return
    mediaRecorder.stop()
  }

  const updateDraft = (value: string) => {
    draftText.value = value
    if (state.value === 'recorded' || state.value === 'fallback_text') {
      state.value = 'draft'
    }
  }

  const setUploading = () => {
    errorMessage.value = ''
    fallbackReason.value = undefined
    state.value = 'uploading'
  }

  const setTranscribing = (value?: InterviewVoiceSubmissionVO) => {
    if (value) submission.value = value
    errorMessage.value = ''
    fallbackReason.value = undefined
    state.value = 'transcribing'
  }

  const applySubmission = (value: InterviewVoiceSubmissionVO) => {
    submission.value = value
    if (value.transcript) {
      transcript.value = value.transcript
    }
  }

  const applyTranscriptDraft = (value: InterviewTranscriptVO) => {
    transcript.value = value
    draftText.value = value.draftText || value.confirmedText || ''
    state.value = 'draft'
    if (isLowConfidenceTranscript(value)) {
      fallbackReason.value = 'low_confidence'
      errorMessage.value = 'Low-confidence transcript. Please review and confirm manually.'
    } else {
      fallbackReason.value = undefined
      errorMessage.value = ''
    }
  }

  const applyTranscriptionFallback = (
    message?: string,
    value?: InterviewVoiceSubmissionVO | null
  ) => {
    if (value) applySubmission(value)
    fallbackReason.value = 'transcription_unavailable'
    errorMessage.value = message || unavailableTranscriptMessage
    state.value = 'fallback_text'
    options.onFallbackText?.()
  }

  const confirmDraft = (meta?: InterviewVoiceConfirmedMeta) => {
    const text = draftText.value.trim()
    if (!text) return false
    const nextMeta = meta || confirmedMeta.value || undefined
    confirmedText.value = text
    confirmedMeta.value = nextMeta || null
    options.onConfirmedText(text, nextMeta)
    clearRecorderResources()
    clearCapturedAudio()
    state.value = 'confirmed'
    errorMessage.value = ''
    fallbackReason.value = undefined
    return true
  }

  const useTextFallback = () => {
    clearRecorderResources()
    clearCapturedAudio()
    clearBackendState()
    enterFallback('manual_text', manualFallbackMessage)
  }

  const reset = () => {
    clearRecorderResources()
    clearCapturedAudio()
    clearBackendState()
    draftText.value = ''
    errorMessage.value = ''
    fallbackReason.value = undefined
    state.value = 'idle'
  }

  const markSubmitted = () => {
    if (state.value === 'confirmed') {
      state.value = 'submitted'
      draftText.value = ''
      clearCapturedAudio()
      clearBackendState()
    }
  }

  return {
    state,
    fallbackReason,
    draftText,
    confirmedText,
    errorMessage,
    audioCaptured,
    audioBlob,
    audioMimeType,
    audioDurationMs,
    recordingStartedAt,
    submission,
    transcript,
    confirmedMeta,
    isBusy,
    canRecord,
    canStopRecording,
    canEditDraft,
    canConfirmDraft,
    hasPendingUnconfirmedTranscript,
    isUnconfirmedDraft,
    startRecording,
    stopRecording,
    updateDraft,
    setUploading,
    setTranscribing,
    applySubmission,
    applyTranscriptDraft,
    applyTranscriptionFallback,
    setError,
    confirmDraft,
    useTextFallback,
    reset,
    markSubmitted
  }
}
