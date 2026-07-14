export type InterviewVoiceTaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'OPEN'
  | 'SUCCEEDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'FAILED'

export interface InterviewScenarioStage {
  code: string
  name: string
  description?: string
  questionCount?: number
  estimatedMinutes?: number
}

export interface InterviewRubricDimensionSummary {
  code: string
  name: string
  weight?: number
  description?: string
}

export interface InterviewScenarioVersionVO {
  scenarioVersionId: number
  scenarioCode: string
  versionNo: number
  scenarioName: string
  description?: string
  locale?: string
  script?: Record<string, unknown>
  rubricVersionId: number
  versionStatus: string
  publishedAt?: string
  createdAt?: string
}

export interface InterviewScenarioSummary extends InterviewScenarioVersionVO {
  stages: InterviewScenarioStage[]
  questionCount?: number
  estimatedMinutes?: number
  rubricDimensions: InterviewRubricDimensionSummary[]
  rubricSummary: string
}

export interface InterviewScenarioBindingCreateDTO {
  scenarioVersionId: number
  bindingSource?: string
}

export interface InterviewScenarioBindingVO {
  bindingId: number
  sessionId: number
  scenarioVersionId: number
  rubricVersionId: number
  bindingSource: string
  createdAt?: string
}

export interface InterviewTtsTaskCreateDTO {
  text: string
  voice?: string
  locale?: string
  audioFormat?: string
  timeoutMs?: number
}

export interface InterviewTtsTaskVO {
  taskId: string
  provider: string
  status: InterviewVoiceTaskStatus
  contentType?: string
  audioBase64?: string
  estimatedDurationMs?: number
  errorCode?: string
  errorMessage?: string
  deadlineAt?: string
  completedAt?: string
}

export interface InterviewStreamingAsrWord {
  text: string
  startMs?: number
  endMs?: number
}

export interface InterviewStreamingAsrSessionCreateDTO {
  language?: string
  sampleRateHz?: number
  channels?: number
  encoding?: string
  timeoutMs?: number
}

export interface InterviewStreamingAsrChunkDTO {
  sequence: number
  audioBase64: string
  endOfStream?: boolean
}

export interface InterviewStreamingAsrSessionVO {
  sessionId: string
  provider: string
  status: InterviewVoiceTaskStatus
  partialTranscript?: string
  finalTranscript?: string
  timestampMode?: string
  words?: InterviewStreamingAsrWord[]
  acceptedChunks?: number
  acceptedBytes?: number
  errorCode?: string
  errorMessage?: string
  deadlineAt?: string
}

export interface InterviewVoiceDeliveryAnalysisCreateDTO {
  voiceSubmissionId: number
  deviceCheckId?: number
  timeoutMs?: number
}

export interface InterviewRealtimeVoicePersistenceRequest {
  blob: Blob
  mimeType: string
  durationMs: number
  confirmedText: string
}

export interface InterviewRealtimeVoicePersistenceResult {
  voiceSubmissionId: number
  transcriptId: number
  transcriptConfidence?: number
  answerSource?: 'VOICE_TRANSCRIPT' | 'MANUAL_TRANSCRIPT' | string
  lowConfidence?: boolean
  fallback?: boolean
  traceId?: string
}

export interface InterviewVoiceDeviceCheckCreateDTO {
  permissionState: string
  sampleRateHz?: number
  channels?: number
  inputDetected: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  averageRmsDbfs?: number
  clippingRatio?: number
}

export interface InterviewVoiceDeviceCheckVO extends InterviewVoiceDeviceCheckCreateDTO {
  deviceCheckId: number
  sessionId: number
  checkStatus?: string
  warningCodes?: string[]
  createdAt?: string
}

export interface InterviewVoiceDeliveryAnalysisVO {
  analysisId: number
  sessionId: number
  voiceSubmissionId?: number
  deviceCheckId?: number
  taskStatus: InterviewVoiceTaskStatus
  timestampSource?: string
  timestampsAvailable?: boolean
  audioDurationMs?: number
  wordCount?: number
  speakingRatePerMinute?: number
  fillerCount?: number
  pauseMetricsAvailable?: boolean
  pauseCount?: number
  averagePauseMs?: number
  longestPauseMs?: number
  warningCodes?: string[]
  deadlineAt?: string
  completedAt?: string
  cancelledAt?: string
  errorCode?: string
  errorMessage?: string
}

export interface InterviewVoiceDeliverySummaryVO {
  sessionId: number
  analysisId?: number
  available: boolean
  status: InterviewVoiceTaskStatus | 'NOT_ANALYZED' | string
  missingReason?: string
  audioDurationMs?: number
  wordCount?: number
  speakingRatePerMinute?: number
  fillerCount?: number
  pauseMetricsAvailable?: boolean
  pauseCount?: number
  averagePauseMs?: number
  longestPauseMs?: number
  warningCodes?: string[]
  completedAt?: string
}

export interface InterviewVoiceDeliveryTimelinePoint extends InterviewVoiceDeliverySummaryVO {
  interviewId: number
  interviewName: string
  occurredAt: string
}

export interface InterviewVoiceProductContext {
  sessionId: number
  voicePreflightReady: boolean
  scenario?: InterviewScenarioSummary
  scenarioBindingStatus?: 'BOUND' | 'PENDING' | 'NONE'
  scenarioBinding?: InterviewScenarioBindingVO
  bindingMessage?: string
  savedAt: string
}

export interface InterviewVoiceDeliveryFact {
  key: string
  label: string
  value: string
  available: boolean
  hint?: string
}
