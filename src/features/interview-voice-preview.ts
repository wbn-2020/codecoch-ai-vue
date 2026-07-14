import { computed, ref } from 'vue'

import { chooseInterviewVoiceRecorderProfile } from '@/features/interview-voice-product'
import type {
  InterviewTranscriptVO,
  InterviewVoicePreviewFallbackReason,
  InterviewVoicePreviewState,
  InterviewVoiceSubmissionVO
} from '@/types/interview'

export interface InterviewVoiceRecordedAudio {
  blob: Blob
  mimeType: string
  durationMs: number
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

export const INTERVIEW_VOICE_MAX_DURATION_MS = 120_000
export const INTERVIEW_VOICE_MAX_BYTES = 10 * 1024 * 1024

interface UseInterviewVoicePreviewOptions {
  onConfirmedText: (text: string, meta?: InterviewVoiceConfirmedMeta) => void
  onRecordedAudio?: (audio: InterviewVoiceRecordedAudio) => void | Promise<void>
  onFallbackText?: () => void
}

const unsupportedMessage = '当前浏览器无法录音，请使用文本回答。'
const emptyAudioMessage = '没有捕获到可用音频，请重新录音或使用文本回答。'
const unavailableTranscriptMessage = '当前 ASR 不可用，请先手动编辑转写草稿再确认。'
const manualFallbackMessage = '已切换到文本降级，草稿确认后才会进入正式回答。'
const sizeLimitMessage = '录音文件超过 10 MB，请缩短回答后重试。'

const stopTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop())
}

const isLowConfidenceTranscript = (item?: InterviewTranscriptVO | null) => {
  if (!item) return false
  return Boolean(item.lowConfidence) || String(item.transcriptStatus || '').toUpperCase() === 'LOW_CONFIDENCE'
}

export const mergeConfirmedVoiceText = (
  answerText: string,
  previousConfirmedText: string,
  nextConfirmedText: string
) => {
  const answer = answerText.trim()
  const previous = previousConfirmedText.trim()
  const next = nextConfirmedText.trim()
  if (!next) return answer
  if (previous && answer.includes(previous)) {
    return answer.replace(previous, next).trim()
  }
  return answer ? `${answer}\n\n${next}` : next
}

export const answerContainsConfirmedVoiceText = (answerText: string, confirmedText: string) => {
  const answer = answerText.trim().replace(/\r\n/g, '\n')
  const confirmed = confirmedText.trim().replace(/\r\n/g, '\n')
  return Boolean(answer && confirmed && answer.includes(confirmed))
}

export const resolveConfirmedVoiceAnswerSource = (
  meta: InterviewVoiceConfirmedMeta,
  answerText: string,
  confirmedText: string
) => {
  const manual = Boolean(meta.fallback) || String(meta.answerSource || '').startsWith('MANUAL_TRANSCRIPT')
  const combinedWithText = answerText.trim().replace(/\r\n/g, '\n') !== confirmedText.trim().replace(/\r\n/g, '\n')
  if (manual) return combinedWithText ? 'MANUAL_TRANSCRIPT_WITH_TEXT' : 'MANUAL_TRANSCRIPT'
  return combinedWithText ? 'VOICE_TRANSCRIPT_WITH_TEXT' : 'VOICE_TRANSCRIPT'
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
  let recordedBytes = 0
  let recordingLimitError = ''
  let recordingStopTimer: number | undefined
  let recordingOperationVersion = 0
  let recorderFinalized = true

  const isBusy = computed(() =>
    ['opening', 'recording', 'stopping', 'uploading', 'transcribing'].includes(state.value)
  )
  const canRecord = computed(() => ['idle', 'submitted', 'fallback_text'].includes(state.value) && !isBusy.value)
  const canStopRecording = computed(() => state.value === 'recording')
  const canEditDraft = computed(() => ['recorded', 'draft', 'fallback_text'].includes(state.value) && !isBusy.value)
  const canConfirmDraft = computed(() => canEditDraft.value && Boolean(draftText.value.trim()))
  const hasPendingUnconfirmedTranscript = computed(() =>
    isBusy.value || (['recorded', 'draft', 'fallback_text'].includes(state.value) && Boolean(draftText.value.trim()))
  )
  const isUnconfirmedDraft = hasPendingUnconfirmedTranscript

  const clearRecorderResources = () => {
    if (recordingStopTimer) {
      window.clearTimeout(recordingStopTimer)
      recordingStopTimer = undefined
    }
    stopTracks(mediaStream)
    mediaStream = null
    mediaRecorder = null
    audioChunks = []
    recordedBytes = 0
    recordingLimitError = ''
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
    const normalizedDurationMs = Math.max(1, durationMs || 1)
    audioBlob.value = blob
    audioMimeType.value = mimeType
    audioDurationMs.value = normalizedDurationMs
    audioCaptured.value = true
    state.value = 'recorded'
    if (!options.onRecordedAudio) {
      fallbackReason.value = 'transcription_unavailable'
      errorMessage.value = unavailableTranscriptMessage
      return
    }
    void Promise.resolve(options.onRecordedAudio({ blob, mimeType, durationMs: normalizedDurationMs })).catch((error) => {
      const message = error instanceof Error ? error.message : unavailableTranscriptMessage
      setError('upload_failed', message || unavailableTranscriptMessage)
    })
  }

  const startRecording = async () => {
    if (!canRecord.value) return
    const operationVersion = ++recordingOperationVersion
    errorMessage.value = ''
    fallbackReason.value = undefined
    draftText.value = ''
    clearCapturedAudio()
    clearBackendState()
    state.value = 'opening'

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      enterFallback('recording_failed', unsupportedMessage)
      return
    }

    try {
      const openedStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (operationVersion !== recordingOperationVersion) {
        stopTracks(openedStream)
        return
      }
      mediaStream = openedStream
      const recorderProfile = chooseInterviewVoiceRecorderProfile()
      if (!recorderProfile) {
        enterFallback('recording_failed', unsupportedMessage)
        return
      }
      const mimeType = recorderProfile.mimeType
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
      const activeRecorder = mediaRecorder
      recorderFinalized = false
      audioChunks = []
      recordedBytes = 0
      recordingLimitError = ''
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size <= 0 || recordingLimitError) return
        recordedBytes += event.data.size
        if (recordedBytes > INTERVIEW_VOICE_MAX_BYTES) {
          recordingLimitError = sizeLimitMessage
          if (activeRecorder.state !== 'inactive') activeRecorder.stop()
          return
        }
        audioChunks.push(event.data)
      }
      activeRecorder.onstop = () => {
        if (recorderFinalized) return
        recorderFinalized = true
        const capturedChunks = audioChunks
        const limitError = recordingLimitError
        const stoppedAt = Date.now()
        const startedAt = recordingStartedAt.value
        const durationMs = startedAt
          ? Math.min(INTERVIEW_VOICE_MAX_DURATION_MS, Math.max(1, stoppedAt - startedAt))
          : undefined
        const capturedMimeType = activeRecorder.mimeType || mimeType || 'audio/webm'
        clearRecorderResources()
        if (limitError) {
          clearCapturedAudio()
          enterFallback('recording_failed', limitError)
          return
        }
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
      activeRecorder.onerror = () => {
        if (recorderFinalized) return
        recorderFinalized = true
        activeRecorder.ondataavailable = null
        activeRecorder.onstop = null
        activeRecorder.onerror = null
        if (activeRecorder.state !== 'inactive') activeRecorder.stop()
        enterFallback('recording_failed', '录音失败，请使用文本回答。')
      }
      recordingStartedAt.value = Date.now()
      activeRecorder.start(1000)
      recordingStopTimer = window.setTimeout(() => {
        if (state.value === 'recording' && activeRecorder.state !== 'inactive') {
          state.value = 'stopping'
          activeRecorder.stop()
        }
      }, INTERVIEW_VOICE_MAX_DURATION_MS)
      state.value = 'recording'
    } catch (error) {
      if (operationVersion !== recordingOperationVersion) return
      const name = error instanceof DOMException ? error.name : ''
      const isPermissionDenied = name === 'NotAllowedError' || name === 'PermissionDeniedError'
      enterFallback(
        isPermissionDenied ? 'permission_denied' : 'recording_failed',
        isPermissionDenied ? '麦克风权限被拒绝，请使用文本回答。' : unsupportedMessage
      )
    }
  }

  const stopRecording = () => {
    if (state.value !== 'recording' || !mediaRecorder) return
    state.value = 'stopping'
    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
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
      errorMessage.value = '转写置信度较低，请人工复核后再确认。'
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

  const cancel = async () => {
    recordingOperationVersion += 1
    const recorder = mediaRecorder
    recorderFinalized = true
    if (recorder) {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.onerror = null
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }
    clearRecorderResources()
    clearCapturedAudio()
    clearBackendState()
    draftText.value = ''
    errorMessage.value = ''
    fallbackReason.value = undefined
    state.value = 'idle'
  }

  const reset = () => {
    cancel()
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
    cancel,
    reset,
    markSubmitted
  }
}
