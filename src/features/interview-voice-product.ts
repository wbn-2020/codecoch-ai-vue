import type {
  InterviewRubricDimensionSummary,
  InterviewScenarioStage,
  InterviewScenarioSummary,
  InterviewScenarioVersionVO,
  InterviewVoiceDeliveryAnalysisVO,
  InterviewVoiceDeliveryFact,
  InterviewVoiceDeliverySummaryVO,
  InterviewVoiceDeliveryTimelinePoint,
  InterviewVoiceProductContext,
  InterviewVoiceTaskStatus
} from '@/types/interviewVoiceProduct'

const CONTEXT_KEY_PREFIX = 'codecoachai:interview-voice-product:'

export type InterviewVoiceRecorderEncoding = 'WEBM_OPUS' | 'OGG_OPUS'

export interface InterviewVoiceRecorderProfile {
  mimeType: string
  encoding: InterviewVoiceRecorderEncoding
}

const supportedRecorderProfiles: InterviewVoiceRecorderProfile[] = [
  { mimeType: 'audio/webm;codecs=opus', encoding: 'WEBM_OPUS' },
  { mimeType: 'audio/ogg;codecs=opus', encoding: 'OGG_OPUS' }
]

export const chooseInterviewVoiceRecorderProfile = (
  recorderConstructor?: typeof MediaRecorder
): InterviewVoiceRecorderProfile | null => {
  const recorder = recorderConstructor
    || (typeof MediaRecorder === 'undefined' ? undefined : MediaRecorder)
  if (!recorder || typeof recorder.isTypeSupported !== 'function') return null
  return supportedRecorderProfiles.find((profile) =>
    recorder.isTypeSupported(profile.mimeType)
  ) || null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const firstText = (source: Record<string, unknown>, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

const firstNumber = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = source[key]
    if (candidate === null || candidate === undefined || candidate === '') continue
    if (typeof candidate !== 'number' && typeof candidate !== 'string') continue
    const value = Number(candidate)
    if (Number.isFinite(value) && value >= 0) return value
  }
  return undefined
}

const firstBoolean = (source: Record<string, unknown>, keys: string[], fallback = false) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
    if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true
    if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') return false
  }
  return fallback
}

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export const normalizeVoiceDeliverySummary = (
  value: unknown,
  fallbackSessionId?: number
): InterviewVoiceDeliverySummaryVO => {
  const source = asRecord(value)
  const status = firstText(source, ['status', 'taskStatus', 'task_status'], 'NOT_ANALYZED').toUpperCase()
  return {
    sessionId: firstNumber(source, ['sessionId', 'session_id']) ?? fallbackSessionId ?? 0,
    analysisId: firstNumber(source, ['analysisId', 'analysis_id', 'id']),
    available: firstBoolean(source, ['available'], status === 'SUCCEEDED'),
    status,
    missingReason: firstText(source, ['missingReason', 'missing_reason', 'errorCode', 'error_code']) || undefined,
    audioDurationMs: firstNumber(source, ['audioDurationMs', 'audio_duration_ms']),
    wordCount: firstNumber(source, ['wordCount', 'word_count']),
    speakingRatePerMinute: firstNumber(source, ['speakingRatePerMinute', 'speaking_rate_per_minute']),
    fillerCount: firstNumber(source, ['fillerCount', 'filler_count']),
    pauseMetricsAvailable: firstBoolean(source, ['pauseMetricsAvailable', 'pause_metrics_available']),
    pauseCount: firstNumber(source, ['pauseCount', 'pause_count']),
    averagePauseMs: firstNumber(source, ['averagePauseMs', 'average_pause_ms']),
    longestPauseMs: firstNumber(source, ['longestPauseMs', 'longest_pause_ms']),
    warningCodes: stringArray(source.warningCodes ?? source.warning_codes),
    completedAt: firstText(source, ['completedAt', 'completed_at']) || undefined
  }
}

export const INTERVIEW_SCENARIO_CODES_BY_MODE: Record<string, string[]> = {
  resume: ['PROJECT_DEEP_DIVE'],
  project: ['PROJECT_DEEP_DIVE'],
  technical: ['TECHNICAL_FOUNDATION', 'TECHNICAL_ROUND_1', 'TECHNICAL_ROUND_2'],
  system: ['SYSTEM_DESIGN'],
  hr: ['HR_SCREENING', 'BEHAVIORAL'],
  pressure: ['STRESS_COMPREHENSIVE'],
  industry: ['PROJECT_DEEP_DIVE', 'SYSTEM_DESIGN', 'BEHAVIORAL']
}

export const interviewScenarioCandidateCodes = (modeKey?: string) => {
  const preferred = modeKey ? INTERVIEW_SCENARIO_CODES_BY_MODE[modeKey] || [] : []
  return Array.from(new Set([
    ...preferred,
    ...Object.values(INTERVIEW_SCENARIO_CODES_BY_MODE).flat()
  ]))
}

const normalizeScenarioStage = (value: unknown, index: number): InterviewScenarioStage => {
  const source = asRecord(value)
  return {
    code: firstText(source, ['code', 'stageCode', 'type'], `STAGE_${index + 1}`),
    name: firstText(source, ['name', 'stageName', 'title', 'label'], `阶段 ${index + 1}`),
    description: firstText(source, ['description', 'desc', 'objective', 'focus']) || undefined,
    questionCount: firstNumber(source, ['questionCount', 'expectedQuestionCount', 'questions', 'count']),
    estimatedMinutes: firstNumber(source, ['estimatedMinutes', 'minutes', 'timeBudgetMinutes', 'durationMinutes'])
  }
}

const normalizeRubricDimension = (value: unknown, index: number): InterviewRubricDimensionSummary => {
  const source = asRecord(value)
  return {
    code: firstText(source, ['code', 'dimension', 'key'], `DIMENSION_${index + 1}`),
    name: firstText(source, ['name', 'label', 'title', 'dimensionName'], `评分维度 ${index + 1}`),
    weight: firstNumber(source, ['weight', 'scoreWeight', 'ratio']),
    description: firstText(source, ['description', 'desc', 'criteria']) || undefined
  }
}

export const normalizeInterviewScenario = (
  value: InterviewScenarioVersionVO
): InterviewScenarioSummary => {
  const script = asRecord(value.script)
  const stages = asArray(script.stages).map(normalizeScenarioStage)
  const rubric = asRecord(script.rubric)
  const rubricDimensions = asArray(
    script.rubricDimensions || rubric.dimensions || script.dimensions
  ).map(normalizeRubricDimension)
  const questionCount =
    firstNumber(script, ['questionCount', 'totalQuestionCount', 'expectedQuestionCount'])
    ?? (stages.some((item) => item.questionCount !== undefined)
      ? stages.reduce((total, item) => total + (item.questionCount || 0), 0)
      : undefined)
  const estimatedMinutes =
    firstNumber(script, ['estimatedMinutes', 'timeBudgetMinutes', 'durationMinutes'])
    ?? (stages.some((item) => item.estimatedMinutes !== undefined)
      ? stages.reduce((total, item) => total + (item.estimatedMinutes || 0), 0)
      : undefined)
  const explicitRubricSummary = firstText(script, ['rubricSummary', 'scoringSummary'])

  return {
    ...value,
    stages,
    questionCount,
    estimatedMinutes,
    rubricDimensions,
    rubricSummary: explicitRubricSummary
      || (rubricDimensions.length
        ? rubricDimensions.map((item) => item.weight === undefined ? item.name : `${item.name} ${item.weight}`).join('、')
        : `使用量表版本 #${value.rubricVersionId}`)
  }
}

export const isInterviewVoiceTaskTerminal = (status?: InterviewVoiceTaskStatus | string) =>
  ['SUCCEEDED', 'COMPLETED', 'CANCELLED', 'TIMED_OUT', 'FAILED']
    .includes(String(status || '').toUpperCase())

export const isInterviewVoiceTaskSuccessful = (status?: InterviewVoiceTaskStatus | string) =>
  ['SUCCEEDED', 'COMPLETED'].includes(String(status || '').toUpperCase())

export const blobToBase64 = async (blob: Blob) => {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const stride = 0x8000
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride))
  }
  return btoa(binary)
}

export const audioBase64ToBlob = (base64: string, contentType = 'audio/mpeg') => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: contentType })
}

export const appendConfirmedVoiceTranscript = (answer: string, transcript: string) => {
  const current = answer.trim()
  const next = transcript.trim()
  if (!next) return current
  if (!current) return next
  if (current.includes(next)) return current
  return `${current}\n\n${next}`
}

export const hasVoiceDeliveryEvidence = (
  audioDurationMs?: number,
  acceptedAudioChunks?: number
) =>
  Number.isFinite(audioDurationMs)
  && Number(audioDurationMs) > 0
  && Number.isFinite(acceptedAudioChunks)
  && Number(acceptedAudioChunks) > 0

export const buildVoiceDeliveryFacts = (
  analysis?: InterviewVoiceDeliveryAnalysisVO | InterviewVoiceDeliverySummaryVO | null
): InterviewVoiceDeliveryFact[] => {
  const status = 'taskStatus' in (analysis || {})
    ? (analysis as InterviewVoiceDeliveryAnalysisVO).taskStatus
    : (analysis as InterviewVoiceDeliverySummaryVO | null)?.status
  if (!analysis || status !== 'SUCCEEDED') return []
  const facts: InterviewVoiceDeliveryFact[] = [
    {
      key: 'rate',
      label: '语速',
      value: analysis.speakingRatePerMinute === undefined
        ? '暂无'
        : `${Math.round(analysis.speakingRatePerMinute)} 字/词每分钟`,
      available: analysis.speakingRatePerMinute !== undefined
    },
    {
      key: 'fillers',
      label: '口头填充词',
      value: analysis.fillerCount === undefined ? '暂无' : `${analysis.fillerCount} 次`,
      available: analysis.fillerCount !== undefined
    }
  ]

  if (analysis.pauseMetricsAvailable) {
    facts.push(
      {
        key: 'pauses',
        label: '明显停顿',
        value: `${analysis.pauseCount || 0} 次`,
        available: true
      },
      {
        key: 'longest-pause',
        label: '最长停顿',
        value: `${analysis.longestPauseMs || 0} ms`,
        available: true
      }
    )
  } else {
    facts.push({
      key: 'pauses',
      label: '停顿指标',
      value: '不可用',
      available: false,
      hint: '本次转写没有逐词时间戳，系统不会推测停顿次数。'
    })
  }

  return facts
}

interface VoiceDeliveryTimelineSource {
  interviewId: number
  interviewName?: string
  targetPosition?: string
  finishedAt?: string
  startedAt?: string
  createdAt?: string
  voiceDeliverySummary?: InterviewVoiceDeliverySummaryVO
}

export const buildVoiceDeliveryTimeline = (
  items: VoiceDeliveryTimelineSource[]
): InterviewVoiceDeliveryTimelinePoint[] =>
  (items || [])
    .filter((item) =>
      item.voiceDeliverySummary?.available
      && item.voiceDeliverySummary.status === 'SUCCEEDED'
    )
    .map((item) => ({
      ...item.voiceDeliverySummary!,
      interviewId: item.interviewId,
      interviewName: item.interviewName || item.targetPosition || `面试 #${item.interviewId}`,
      occurredAt: item.voiceDeliverySummary?.completedAt
        || item.finishedAt
        || item.startedAt
        || item.createdAt
        || ''
    }))
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .slice(-50)

export const saveInterviewVoiceProductContext = (
  context: InterviewVoiceProductContext,
  storage: Storage | undefined = typeof sessionStorage === 'undefined' ? undefined : sessionStorage
) => {
  storage?.setItem(`${CONTEXT_KEY_PREFIX}${context.sessionId}`, JSON.stringify(context))
}

export const loadInterviewVoiceProductContext = (
  sessionId: number,
  storage: Storage | undefined = typeof sessionStorage === 'undefined' ? undefined : sessionStorage
): InterviewVoiceProductContext | null => {
  const raw = storage?.getItem(`${CONTEXT_KEY_PREFIX}${sessionId}`)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as InterviewVoiceProductContext
    return Number(parsed.sessionId) === Number(sessionId) ? parsed : null
  } catch {
    return null
  }
}
