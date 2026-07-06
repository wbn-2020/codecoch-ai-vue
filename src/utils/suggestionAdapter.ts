import type { AgentMemoryVO, KnowledgeAskVO, KnowledgeSearchResultVO } from '@/api/v4'
import type { AgentTaskVO } from '@/types/agent'
import type { JobSearchExperimentStrategyVO } from '@/types/jobExperiment'
import type {
  EvidenceSourceVO,
  ExplainableSuggestionVO,
  SuggestionBizType,
  SuggestionConfidenceLevel,
  SuggestionQualityGateVO,
  SuggestionResultSource,
  SuggestionScene,
  SuggestionTrustStatus,
  SuggestionTraceVO
} from '@/types/suggestion'
import {
  SUGGESTION_SCHEMA_VERSION,
  SUGGESTION_SOURCE_TYPE_LABELS
} from '@/types/suggestion'

export { SUGGESTION_SCHEMA_VERSION } from '@/types/suggestion'

type UnknownRecord = Record<string, unknown>

type TraceCarrier = Partial<SuggestionTraceVO> & {
  runId?: number | null
}

export type AgentTaskSuggestionInput = AgentTaskVO & TraceCarrier

export interface JobExperimentSuggestionContext extends TraceCarrier {
  experimentId?: number | string | null
  bizId?: number | string | null
  scene?: SuggestionScene
  bizType?: SuggestionBizType
  resultSource?: string | null
  fallback?: boolean | null
}

const trimText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text || undefined
}

const normalizeCode = (value: unknown): string | undefined => {
  const text = trimText(value)
  return text ? text.toUpperCase() : undefined
}

const normalizeSourceId = (value: unknown): number | string | null | undefined => {
  if (value === null) return null
  if (value === undefined || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const text = trimText(value)
  if (!text) return undefined
  const numeric = Number(text)
  return Number.isFinite(numeric) && String(numeric) === text ? numeric : text
}

const normalizeOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : undefined
  }
  return undefined
}

const normalizeOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'enabled'].includes(normalized)) return true
    if (['false', '0', 'no', 'disabled', 'deleted'].includes(normalized)) return false
  }
  return undefined
}

const compactTrace = (trace: SuggestionTraceVO): SuggestionTraceVO | undefined => {
  const entries = Object.entries(trace).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) as SuggestionTraceVO : undefined
}

const compactNextAction = (actionUrl?: string, actionType?: string | null) => {
  const url = trimText(actionUrl)
  const type = trimText(actionType)
  if (!url && !type) return undefined
  return {
    ...(url ? { actionUrl: url, path: url } : {}),
    ...(type ? { actionType: type } : {})
  }
}

const normalizeResultSource = (value: unknown, fallback?: boolean | null): SuggestionResultSource => {
  const source = normalizeCode(value)
  if (source) return source
  if (fallback) return 'FALLBACK'
  return 'LLM'
}

const KNOWN_TRUST_STATUSES = new Set(['VERIFIED', 'PARTIAL', 'FALLBACK', 'DISABLED', 'STALE', 'UNKNOWN'])

const normalizeTrustStatus = (
  value: unknown,
  defaultStatus: SuggestionTrustStatus = 'UNKNOWN'
): SuggestionTrustStatus => {
  const status = normalizeCode(value)
  return status && KNOWN_TRUST_STATUSES.has(status) ? status as SuggestionTrustStatus : defaultStatus
}

const normalizeOptionalTrustStatus = (value: unknown): SuggestionTrustStatus | undefined => {
  const status = normalizeCode(value)
  return status && KNOWN_TRUST_STATUSES.has(status) ? status as SuggestionTrustStatus : undefined
}

const knownSourceType = (value?: string | null): boolean => {
  const type = normalizeCode(value)
  return Boolean(type && SUGGESTION_SOURCE_TYPE_LABELS[type])
}

const traceAvailable = (trace?: SuggestionTraceVO): boolean => Boolean(
  trimText(trace?.traceId) ||
  trace?.aiCallLogId !== undefined && trace?.aiCallLogId !== null ||
  trace?.agentRunId !== undefined && trace?.agentRunId !== null
)

export const normalizeConfidenceLevel = (
  value?: string | null,
  options: {
    fallback?: boolean | null
    mock?: boolean | null
    sampleInsufficient?: boolean | null
    defaultLevel?: SuggestionConfidenceLevel
  } = {}
): SuggestionConfidenceLevel => {
  if (options.fallback || options.mock || options.sampleInsufficient) return 'LOW'

  const level = normalizeCode(value)
  if (level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') return level
  return options.defaultLevel || 'UNKNOWN'
}

const compactMetadata = (metadata: NonNullable<EvidenceSourceVO['metadata']>): EvidenceSourceVO['metadata'] | undefined => {
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) as EvidenceSourceVO['metadata'] : undefined
}

export const normalizeEvidenceSources = (value?: unknown): EvidenceSourceVO[] => {
  const items = Array.isArray(value) ? value : value ? [value] : []

  return items.reduce<EvidenceSourceVO[]>((sources, item) => {
    if (!item || typeof item !== 'object') return sources

    const source = item as UnknownRecord
    const existingMetadata = source.metadata && typeof source.metadata === 'object'
      ? source.metadata as UnknownRecord
      : {}
    const sourceType = normalizeCode(source.sourceType)
    const sourceId = normalizeSourceId(source.sourceId ?? source.sourceBizId ?? source.relationId)
    const sourceTitle = trimText(source.sourceTitle ?? source.title)
    const sourceLabel = trimText(source.sourceLabel ?? source.label)
    const evidenceSummary = trimText(
      source.evidenceSummary ?? source.sourceSummary ?? source.relationSummary ?? source.summary
    )
    const trustStatus = source.trustStatus !== undefined
      ? normalizeTrustStatus(source.trustStatus)
      : undefined
    const metadata = compactMetadata({
      documentId: normalizeOptionalNumber(source.documentId ?? existingMetadata.documentId),
      chunkId: normalizeOptionalNumber(source.chunkId ?? existingMetadata.chunkId),
      chunkIndex: normalizeOptionalNumber(source.chunkIndex ?? existingMetadata.chunkIndex),
      documentType: trimText(source.documentType ?? existingMetadata.documentType),
      sourceRef: trimText(source.sourceRef ?? existingMetadata.sourceRef),
      score: normalizeOptionalNumber(source.score ?? existingMetadata.score),
      matchType: normalizeCode(source.matchType ?? existingMetadata.matchType),
      citationValid: normalizeOptionalBoolean(source.citationValid ?? existingMetadata.citationValid),
      answerGrounded: normalizeOptionalBoolean(source.answerGrounded ?? existingMetadata.answerGrounded),
      insufficientReferences: normalizeOptionalBoolean(
        source.insufficientReferences ?? existingMetadata.insufficientReferences
      ),
      citationWarning: trimText(source.citationWarning ?? existingMetadata.citationWarning),
      minScore: normalizeOptionalNumber(source.minScore ?? existingMetadata.minScore),
      lowConfidence: normalizeOptionalBoolean(source.lowConfidence ?? existingMetadata.lowConfidence),
      memoryType: normalizeCode(source.memoryType ?? existingMetadata.memoryType),
      memoryStatus: normalizeCode(source.memoryStatus ?? existingMetadata.memoryStatus),
      confirmed: normalizeOptionalBoolean(source.confirmed ?? existingMetadata.confirmed),
      confirmedAt: trimText(source.confirmedAt ?? existingMetadata.confirmedAt),
      disabledAt: trimText(source.disabledAt ?? existingMetadata.disabledAt),
      expiresAt: trimText(source.expiresAt ?? existingMetadata.expiresAt),
      activeBlockedReason: trimText(source.activeBlockedReason ?? existingMetadata.activeBlockedReason),
      confidence: normalizeOptionalNumber(source.confidence ?? existingMetadata.confidence),
      enabled: normalizeOptionalBoolean(source.enabled ?? existingMetadata.enabled),
      active: normalizeOptionalBoolean(source.active ?? existingMetadata.active),
      memorySourceType: normalizeCode(source.memorySourceType ?? existingMetadata.memorySourceType),
      memorySourceId: normalizeSourceId(source.memorySourceId ?? existingMetadata.memorySourceId),
      deleted: normalizeOptionalBoolean(source.deleted ?? existingMetadata.deleted),
      stale: normalizeOptionalBoolean(source.stale ?? existingMetadata.stale)
    })

    if (!sourceType && sourceId === undefined && !evidenceSummary && !sourceTitle && !sourceLabel && !metadata) return sources

    sources.push({
      ...(source.id !== undefined ? { id: String(source.id) } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(sourceId !== undefined ? { sourceId } : {}),
      ...(sourceTitle ? { sourceTitle, title: sourceTitle } : {}),
      ...(sourceLabel ? { sourceLabel, label: sourceLabel } : {}),
      ...(evidenceSummary ? { evidenceSummary, sourceSummary: evidenceSummary, summary: evidenceSummary } : {}),
      ...(trustStatus ? { trustStatus } : {}),
      ...(trimText(source.sourceUpdatedAt) ? { sourceUpdatedAt: trimText(source.sourceUpdatedAt) } : {}),
      ...(trimText(source.actionUrl) ? { actionUrl: trimText(source.actionUrl) } : {}),
      ...(metadata ? { metadata } : {})
    })
    return sources
  }, [])
}

const evidenceHasDisplayableIdentity = (source: EvidenceSourceVO): boolean => Boolean(
  source.sourceId !== undefined ||
  trimText(source.sourceSummary) ||
  trimText(source.evidenceSummary) ||
  trimText(source.summary) ||
  trimText(source.sourceTitle) ||
  trimText(source.title) ||
  trimText(source.sourceLabel) ||
  trimText(source.label)
)

const evidenceUnavailableReason = (source: EvidenceSourceVO): string | undefined => {
  const trustStatus = normalizeTrustStatus(source.trustStatus)
  const metadata = source.metadata || {}
  if (trustStatus === 'DISABLED') return '证据来源已停用'
  if (trustStatus === 'STALE' || metadata.stale === true) return '证据来源可能过期，需要复核'
  if (trustStatus === 'UNKNOWN') return '证据可信状态未知'
  if (metadata.deleted === true) return '证据来源已删除'
  if (metadata.enabled === false) return '证据来源未启用'
  if (metadata.active === false) return trimText(metadata.activeBlockedReason) || '证据来源未启用'
  return undefined
}

export const isEffectiveEvidenceSource = (source?: EvidenceSourceVO | null): boolean => {
  if (!source) return false
  if (!normalizeCode(source.sourceType)) return false
  if (!evidenceHasDisplayableIdentity(source)) return false
  return !evidenceUnavailableReason(source)
}

const evidenceStrongBlockReason = (source: EvidenceSourceVO): string | undefined => {
  const unavailableReason = evidenceUnavailableReason(source)
  if (unavailableReason) return unavailableReason
  if (!knownSourceType(source.sourceType)) return '存在未知来源类型，不能作为强证据'

  const trustStatus = normalizeTrustStatus(source.trustStatus)
  if (trustStatus !== 'VERIFIED') return '证据未达到已验证状态'

  const metadata = source.metadata || {}
  if (source.sourceType === 'KNOWLEDGE_CHUNK' || source.sourceType === 'KNOWLEDGE_ASK') {
    if (metadata.insufficientReferences === true) return '知识引用不足，不能作为强证据'
    if (metadata.lowConfidence === true) return '知识引用置信度不足，不能作为强证据'
    if (metadata.citationValid === false || metadata.answerGrounded === false) {
      return '知识引用不足，不能作为强证据'
    }
  }
  if (source.sourceType === 'AGENT_MEMORY') {
    if (metadata.enabled !== true || metadata.active === false || metadata.deleted === true || metadata.stale === true) {
      return '长期记忆未处于当前启用状态'
    }
    if (metadata.confirmed === false) return '候选记忆尚未确认，不能作为强证据'
    const confidence = normalizeOptionalNumber(metadata.confidence)
    if (confidence !== undefined) {
      const normalized = confidence > 1 ? confidence / 100 : confidence
      if (normalized < 0.8) return '长期记忆置信度不足，不能作为强证据'
    }
  }
  return undefined
}

export const isStrongEvidenceSource = (source?: EvidenceSourceVO | null): boolean => {
  if (!source) return false
  return isEffectiveEvidenceSource(source) && !evidenceStrongBlockReason(source)
}

const uniqueReasons = (reasons: string[]): string[] => Array.from(new Set(reasons.filter(Boolean)))

const deriveQualityGate = (
  input: Pick<ExplainableSuggestionVO,
    | 'confidenceLevel'
    | 'resultSource'
    | 'fallback'
    | 'mock'
    | 'sampleInsufficient'
    | 'sampleWarning'
    | 'unsupportedConclusions'
    | 'evidenceSources'
    | 'trace'
  >
): SuggestionQualityGateVO => {
  const evidenceSources = input.evidenceSources || []
  const effectiveEvidence = evidenceSources.filter(isEffectiveEvidenceSource)
  const strongEvidence = evidenceSources.filter(isStrongEvidenceSource)
  const strongBlockReasons = uniqueReasons(evidenceSources.map(evidenceStrongBlockReason).filter(Boolean) as string[])
  const resultSource = normalizeResultSource(input.resultSource, input.fallback)
  const mock = Boolean(input.mock || resultSource === 'MOCK')
  const fallback = Boolean(input.fallback || resultSource === 'FALLBACK')
  const confidenceLevel = normalizeConfidenceLevel(input.confidenceLevel, {
    fallback,
    mock,
    sampleInsufficient: input.sampleInsufficient
  })

  if (mock) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'MOCK',
      reasons: ['演示或模拟数据不能作为真实建议依据'],
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (fallback) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'FALLBACK',
      reasons: uniqueReasons(['当前结果为降级输出', input.sampleWarning || '']),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (input.sampleInsufficient) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'LOW_SAMPLE',
      reasons: uniqueReasons(['样本不足，不能作为强结论', input.sampleWarning || '']),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (!effectiveEvidence.length) {
    return {
      gateStatus: 'BLOCKED',
      suggestionStrength: 'WEAK',
      reasons: uniqueReasons(['缺少当前有效证据来源', ...strongBlockReasons]),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (confidenceLevel === 'UNKNOWN') {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'WEAK',
      reasons: uniqueReasons(['置信度待确认', ...strongBlockReasons]),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (confidenceLevel === 'LOW') {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'WEAK',
      reasons: uniqueReasons(['低置信结果只能作为弱观察', ...strongBlockReasons]),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (!traceAvailable(input.trace)) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: confidenceLevel === 'HIGH' ? 'NORMAL' : 'WEAK',
      reasons: uniqueReasons(['缺少可追踪 trace，不能作为强建议', ...strongBlockReasons]),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (!strongEvidence.length) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'NORMAL',
      reasons: uniqueReasons(strongBlockReasons.length ? strongBlockReasons : ['缺少可支撑强建议的已验证证据']),
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  if (confidenceLevel === 'HIGH') {
    return {
      gateStatus: 'PASS',
      suggestionStrength: 'STRONG',
      reasons: ['证据、置信度和追踪信息满足强建议门槛'],
      blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
    }
  }

  return {
    gateStatus: 'PASS',
    suggestionStrength: 'NORMAL',
    reasons: ['证据和追踪信息满足普通建议门槛'],
    blockedConclusions: input.unsupportedConclusions?.filter(Boolean)
  }
}

const deriveTrustStatus = (
  input: Pick<ExplainableSuggestionVO,
    | 'resultSource'
    | 'fallback'
    | 'mock'
    | 'sampleInsufficient'
    | 'evidenceSources'
  >,
  qualityGate: SuggestionQualityGateVO
): SuggestionTrustStatus => {
  const resultSource = normalizeResultSource(input.resultSource, input.fallback)
  if (input.mock || resultSource === 'MOCK' || input.fallback || resultSource === 'FALLBACK') return 'FALLBACK'
  if (input.sampleInsufficient) return 'PARTIAL'
  if (qualityGate.suggestionStrength === 'STRONG' && qualityGate.gateStatus === 'PASS') return 'VERIFIED'
  if ((input.evidenceSources || []).some(isEffectiveEvidenceSource)) return 'PARTIAL'
  return 'UNKNOWN'
}

const QUALITY_GATE_STATUS_RANK: Record<string, number> = {
  BLOCKED: 0,
  WARN: 1,
  PASS: 2
}

const SUGGESTION_STRENGTH_RANK: Record<string, number> = {
  MOCK: 0,
  FALLBACK: 0,
  LOW_SAMPLE: 0,
  WEAK: 0,
  NORMAL: 1,
  STRONG: 2
}

const qualityGateStatusRank = (status?: string): number =>
  QUALITY_GATE_STATUS_RANK[normalizeCode(status) || ''] ?? 0

const suggestionStrengthRank = (strength?: string): number =>
  SUGGESTION_STRENGTH_RANK[normalizeCode(strength) || ''] ?? 0

const mergeQualityGate = (
  provided: SuggestionQualityGateVO | undefined,
  derived: SuggestionQualityGateVO
): SuggestionQualityGateVO => {
  if (!provided) return derived

  const normalizedProvided: SuggestionQualityGateVO = {
    ...provided,
    gateStatus: normalizeCode(provided.gateStatus) || derived.gateStatus,
    suggestionStrength: normalizeCode(provided.suggestionStrength) || derived.suggestionStrength,
    reasons: provided.reasons?.filter(Boolean) || []
  }
  const providedIsStronger = qualityGateStatusRank(normalizedProvided.gateStatus) > qualityGateStatusRank(derived.gateStatus) ||
    suggestionStrengthRank(normalizedProvided.suggestionStrength) > suggestionStrengthRank(derived.suggestionStrength)

  if (providedIsStronger) {
    return {
      ...derived,
      reasons: uniqueReasons([...(derived.reasons || []), ...normalizedProvided.reasons])
    }
  }

  return {
    ...normalizedProvided,
    reasons: normalizedProvided.reasons.length ? normalizedProvided.reasons : derived.reasons
  }
}

const withTrustedResultFields = (suggestion: ExplainableSuggestionVO): ExplainableSuggestionVO => {
  const resultSource = normalizeResultSource(suggestion.resultSource, suggestion.fallback)
  const mock = Boolean(suggestion.mock || resultSource === 'MOCK')
  const fallback = Boolean(suggestion.fallback || resultSource === 'FALLBACK')
  const sampleInsufficient = Boolean(suggestion.sampleInsufficient)
  const confidenceLevel = normalizeConfidenceLevel(suggestion.confidenceLevel, {
    fallback,
    mock,
    sampleInsufficient,
    defaultLevel: 'UNKNOWN'
  })
  const trace = suggestion.trace ? compactTrace(suggestion.trace) : undefined
  const base: ExplainableSuggestionVO = {
    ...suggestion,
    schemaVersion: suggestion.schemaVersion || SUGGESTION_SCHEMA_VERSION,
    resultSource,
    fallback,
    degraded: suggestion.degraded ?? fallback,
    mock,
    confidenceLevel,
    confidence: suggestion.confidence ?? confidenceLevel,
    evidenceSources: suggestion.evidenceSources || [],
    evidences: suggestion.evidences || suggestion.evidenceSources || [],
    ...(trace ? { trace } : {})
  }
  const qualityGate = mergeQualityGate(suggestion.qualityGate, deriveQualityGate(base))
  const trustStatus = suggestion.trustStatus && suggestion.trustStatus !== 'VERIFIED'
    ? normalizeTrustStatus(suggestion.trustStatus)
    : deriveTrustStatus(base, qualityGate)
  const nextActions = suggestion.nextActions || (suggestion.nextAction ? [suggestion.nextAction] : undefined)

  return {
    ...base,
    trustStatus,
    qualityGate,
    ...(suggestion.reason ? { why: suggestion.why || suggestion.reason } : {}),
    ...(nextActions ? { nextActions } : {})
  }
}

export interface KnowledgeEvidenceOptions {
  citationValid?: boolean
  answerGrounded?: boolean
  insufficientReferences?: boolean
  citationWarning?: string
  minScore?: number
  lowConfidence?: boolean
  disabled?: boolean
  stale?: boolean
  trustStatus?: SuggestionTrustStatus
}

export const knowledgeTrustStatus = (
  options: KnowledgeEvidenceOptions = {}
): SuggestionTrustStatus => {
  if (options.disabled) return 'DISABLED'
  if (options.stale) return 'STALE'
  if (options.insufficientReferences) return 'FALLBACK'
  if (options.lowConfidence) return 'FALLBACK'
  if (trimText(options.citationWarning)) return 'FALLBACK'
  if (options.citationValid === false || options.answerGrounded === false) return 'FALLBACK'
  const providedTrustStatus = normalizeOptionalTrustStatus(options.trustStatus)
  if (providedTrustStatus) return providedTrustStatus
  if (options.citationValid === true && options.answerGrounded === true) return 'VERIFIED'
  return 'PARTIAL'
}

export const fromKnowledgeSearchResult = (
  result: KnowledgeSearchResultVO,
  index = 0,
  options: KnowledgeEvidenceOptions = {}
): EvidenceSourceVO | undefined => {
  const sourceId = normalizeSourceId(result.chunkId ?? result.documentId)
  const summary = trimText(result.snippet) || trimText(result.highlightedSnippet)
  const title = trimText(result.title) || trimText(result.sourceRef) || `Knowledge chunk ${index + 1}`
  const score = normalizeOptionalNumber(result.score)
  const minScore = normalizeOptionalNumber(options.minScore)
  const lowConfidence = Boolean(options.lowConfidence || score !== undefined && minScore !== undefined && score < minScore)

  if (sourceId === undefined && !summary && !title) return undefined

  const metadata = compactMetadata({
    documentId: result.documentId,
    chunkId: result.chunkId,
    chunkIndex: result.chunkIndex,
    documentType: trimText(result.documentType),
    sourceRef: trimText(result.sourceRef),
    score,
    matchType: normalizeCode(result.matchType),
    citationValid: options.citationValid,
    answerGrounded: options.answerGrounded,
    insufficientReferences: options.insufficientReferences,
    citationWarning: trimText(options.citationWarning),
    minScore,
    lowConfidence
  })

  return {
    id: `knowledge-chunk:${result.documentId ?? 'unknown'}:${result.chunkId ?? index}`,
    sourceType: 'KNOWLEDGE_CHUNK',
    ...(sourceId !== undefined ? { sourceId } : {}),
    title,
    sourceTitle: title,
    sourceLabel: trimText(result.sourceRef) || title,
    ...(summary ? { summary, evidenceSummary: summary, sourceSummary: summary } : {}),
    ...(result.indexedAt ? { sourceUpdatedAt: result.indexedAt } : {}),
    trustStatus: knowledgeTrustStatus({ ...options, lowConfidence }),
    ...(metadata ? { metadata } : {})
  }
}

export const fromKnowledgeAskReferences = (
  askOrReferences?: KnowledgeAskVO | KnowledgeSearchResultVO[] | null,
  options: KnowledgeEvidenceOptions = {}
): EvidenceSourceVO[] => {
  const references = Array.isArray(askOrReferences) ? askOrReferences : askOrReferences?.references
  if (!references?.length) return []

  const askOptions = Array.isArray(askOrReferences)
    ? options
    : {
        citationValid: askOrReferences?.citationValid,
        answerGrounded: askOrReferences?.answerGrounded,
        insufficientReferences: askOrReferences?.insufficientReferences,
        citationWarning: askOrReferences?.citationWarning,
        minScore: normalizeOptionalNumber(askOrReferences?.minReferenceScore),
        ...options
      }

  return references
    .map((reference, index) => fromKnowledgeSearchResult(reference, index, askOptions))
    .filter((source): source is EvidenceSourceVO => Boolean(source))
}

export interface AgentMemoryEvidenceOptions {
  deleted?: boolean
  stale?: boolean
}

const MANUAL_MEMORY_SOURCE_TYPES = new Set(['MANUAL', 'USER_MANUAL', 'USER_NOTE'])
const CANDIDATE_MEMORY_STATUSES = new Set(['CANDIDATE', 'PENDING_CONFIRMATION', 'UNCONFIRMED'])
const DISABLED_MEMORY_STATUSES = new Set(['DELETED', 'REMOVED', 'DISABLED', 'INACTIVE'])
const STALE_MEMORY_STATUSES = new Set(['STALE', 'EXPIRED'])

const isPastTimestamp = (value: unknown): boolean => {
  const text = trimText(value)
  if (!text) return false
  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

const memorySourceType = (memory: AgentMemoryVO & Record<string, unknown>): string =>
  normalizeCode(memory.sourceType) || 'MANUAL'

const memoryStatus = (memory: AgentMemoryVO & Record<string, unknown>, enabled: boolean): string => {
  const status = normalizeCode(memory.memoryStatus ?? memory.status)
  const manual = MANUAL_MEMORY_SOURCE_TYPES.has(memorySourceType(memory))
  if (status && (manual || memoryConfirmedAt(memory) || !['CONFIRMED', 'ENABLED', 'ACTIVE'].includes(status))) return status
  if (!manual && !memoryConfirmedAt(memory)) return 'CANDIDATE'
  return enabled ? 'ENABLED' : 'DISABLED'
}

const memoryConfirmedAt = (memory: AgentMemoryVO & Record<string, unknown>): string | undefined =>
  trimText(memory.confirmedAt)

const isAgentMemoryConfirmed = (memory: AgentMemoryVO & Record<string, unknown>, enabled: boolean): boolean => {
  const sourceType = memorySourceType(memory)
  if (MANUAL_MEMORY_SOURCE_TYPES.has(sourceType)) return true
  if (memoryConfirmedAt(memory)) return true
  return false
}

const agentMemoryInactiveReason = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): string | undefined => {
  const enabled = normalizeOptionalBoolean(memory.enabled)
  const status = memoryStatus(memory, enabled === true)
  const deleted = normalizeOptionalBoolean(memory.deleted ?? memory.deleteFlag ?? memory.isDeleted)
  if (options.deleted || deleted === true || trimText(memory.deletedAt) || status === 'DELETED' || status === 'REMOVED') {
    return '长期记忆已删除'
  }
  if (enabled !== true || trimText(memory.disabledAt) || status === 'DISABLED' || status === 'INACTIVE') {
    return '长期记忆未启用'
  }
  if (options.stale || normalizeOptionalBoolean(memory.stale) === true || STALE_MEMORY_STATUSES.has(status) || isPastTimestamp(memory.expiresAt)) {
    return '长期记忆可能过期，需要复核'
  }
  if (CANDIDATE_MEMORY_STATUSES.has(status)) {
    return '候选记忆尚未确认，不能作为当前有效证据'
  }
  if (!isAgentMemoryConfirmed(memory, true)) {
    return '候选或 AI 生成长期记忆需要用户确认后才能作为当前有效证据'
  }
  return undefined
}

export const isAgentMemoryActive = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): boolean => {
  return !agentMemoryInactiveReason(memory, options)
}

export const memoryTrustStatus = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): SuggestionTrustStatus => {
  const enabled = normalizeOptionalBoolean(memory.enabled)
  const deleted = normalizeOptionalBoolean(memory.deleted ?? memory.deleteFlag ?? memory.isDeleted)
  const status = memoryStatus(memory, enabled === true)
  if (options.deleted || deleted === true || trimText(memory.deletedAt) || status === 'DELETED' || status === 'REMOVED') {
    return 'DISABLED'
  }
  if (options.stale || normalizeOptionalBoolean(memory.stale) === true || STALE_MEMORY_STATUSES.has(status) || isPastTimestamp(memory.expiresAt)) {
    return 'STALE'
  }
  if (enabled !== true || trimText(memory.disabledAt) || DISABLED_MEMORY_STATUSES.has(status)) return 'DISABLED'
  if (!isAgentMemoryConfirmed(memory, true)) return 'PARTIAL'
  const providedTrustStatus = normalizeOptionalTrustStatus(memory.trustStatus)
  if (providedTrustStatus && providedTrustStatus !== 'VERIFIED') return providedTrustStatus
  const confidence = normalizeOptionalNumber(memory.confidence)
  if (confidence === undefined) return 'PARTIAL'
  const normalized = confidence > 1 ? confidence / 100 : confidence
  if (normalized >= 0.8) return 'VERIFIED'
  if (normalized >= 0.45) return 'PARTIAL'
  return 'FALLBACK'
}

export const fromAgentMemory = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): EvidenceSourceVO => {
  const memoryType = normalizeCode(memory.memoryType) || 'USER_NOTE'
  const active = isAgentMemoryActive(memory, options)
  const enabled = normalizeOptionalBoolean(memory.enabled) ?? false
  const status = memoryStatus(memory, enabled)
  const confirmedAt = memoryConfirmedAt(memory)
  const confirmed = isAgentMemoryConfirmed(memory, enabled)
  const summary = trimText(memory.content)
  const metadata = compactMetadata({
    memoryType,
    confidence: normalizeOptionalNumber(memory.confidence),
    enabled,
    active,
    memoryStatus: status,
    confirmed,
    confirmedAt,
    disabledAt: trimText(memory.disabledAt),
    expiresAt: trimText(memory.expiresAt),
    activeBlockedReason: active ? undefined : agentMemoryInactiveReason(memory, options),
    memorySourceType: memorySourceType(memory),
    memorySourceId: normalizeSourceId(memory.sourceId),
    deleted: Boolean(options.deleted) || normalizeOptionalBoolean(memory.deleted ?? memory.deleteFlag ?? memory.isDeleted) === true,
    stale: Boolean(options.stale) || normalizeOptionalBoolean(memory.stale) === true || STALE_MEMORY_STATUSES.has(status) || isPastTimestamp(memory.expiresAt)
  })

  return {
    id: `agent-memory:${memory.id}`,
    sourceType: 'AGENT_MEMORY',
    sourceId: memory.id,
    title: memoryType,
    sourceTitle: memoryType,
    sourceLabel: memoryType,
    ...(summary ? { summary, evidenceSummary: summary, sourceSummary: summary } : {}),
    sourceUpdatedAt: memory.updatedAt || memory.createdAt,
    trustStatus: memoryTrustStatus(memory, options),
    ...(metadata ? { metadata } : {})
  }
}

export const fromAgentMemories = (
  memories?: Array<AgentMemoryVO & Record<string, unknown>> | null,
  options: AgentMemoryEvidenceOptions & { activeOnly?: boolean } = {}
): EvidenceSourceVO[] => {
  if (!memories?.length) return []
  const activeOnly = options.activeOnly !== false
  return memories
    .filter((memory) => !activeOnly || isAgentMemoryActive(memory, options))
    .map((memory) => fromAgentMemory(memory, options))
}

export const isEvidenceSourceActive = (source?: EvidenceSourceVO | null): boolean => {
  return isEffectiveEvidenceSource(source)
}

const agentConfidence = (task: AgentTaskSuggestionInput): SuggestionConfidenceLevel => {
  const trustStatus = normalizeCode(task.trustStatus)
  if (trustStatus === 'VERIFIED') return 'HIGH'
  if (trustStatus === 'FALLBACK' || task.fallback) return 'LOW'
  return normalizeConfidenceLevel(undefined, { defaultLevel: 'MEDIUM' })
}

export const fromAgentTask = (task: AgentTaskSuggestionInput): ExplainableSuggestionVO => {
  const fallback = Boolean(task.fallback || normalizeCode(task.trustStatus) === 'FALLBACK')
  const resultSource = normalizeResultSource(task.resultSource ?? task.reviewSource, fallback)
  const mock = resultSource === 'MOCK'
  const bizId = task.id
  const sourceType = task.sourceType || task.relatedBizType || task.taskType
  const sourceId = task.sourceId ?? task.relatedBizId ?? null
  const evidenceSummary = task.evidenceSummary || task.reason || task.reviewSummary
  const evidenceSources = normalizeEvidenceSources(
    task.evidenceSources?.length ? task.evidenceSources : [{ sourceType, sourceId, evidenceSummary, trustStatus: task.trustStatus }]
  )

  return withTrustedResultFields({
    id: `agent-task:${bizId}`,
    scene: 'AGENT_TASK_RECOMMENDATION',
    bizType: 'AGENT_TASK',
    bizId,
    title: trimText(task.title),
    content: trimText(task.description || task.reviewSummary),
    reason: trimText(task.reason),
    confidenceLevel: mock || fallback ? 'LOW' : agentConfidence(task),
    resultSource,
    fallback,
    mock,
    evidenceSources,
    trace: compactTrace({
      agentRunId: task.agentRunId ?? task.runId ?? null,
      traceId: task.traceId ?? null,
      aiCallLogId: task.aiCallLogId ?? null,
      promptVersionId: task.promptVersionId ?? null,
      asyncTaskId: task.asyncTaskId ?? null
    }),
    nextAction: compactNextAction(task.actionUrl, task.actionType),
    qualityGate: task.qualityGate || undefined
  })
}

export const fromJobExperimentStrategy = (
  strategy: JobSearchExperimentStrategyVO,
  context: JobExperimentSuggestionContext = {}
): ExplainableSuggestionVO => {
  const fallback = Boolean(strategy.fallback || context.fallback || normalizeCode(strategy.resultSource ?? context.resultSource) === 'FALLBACK')
  const resultSource = normalizeResultSource(strategy.resultSource ?? context.resultSource ?? 'RULE', fallback)
  const mock = resultSource === 'MOCK'
  const bizId = context.bizId ?? context.experimentId ?? null
  const reviewDsl = strategy.reviewDsl
  const sampleBoundary = reviewDsl?.limits || reviewDsl?.sampleBoundary
  const sampleInsufficient = strategy.sampleInsufficient ?? sampleBoundary?.sampleInsufficient
  const sampleWarning = trimText(strategy.sampleWarning || sampleBoundary?.sampleWarning)
  const evidenceSources = normalizeEvidenceSources(
    strategy.evidenceSources?.length ? strategy.evidenceSources : reviewDsl?.evidenceSources
  )
  const unsupportedConclusions = Array.isArray(strategy.unsupportedConclusions)
    ? strategy.unsupportedConclusions.filter(Boolean)
    : reviewDsl?.unsupportedConclusions?.map((item) => item.blockedReason).filter(Boolean)
  const weakObservations = Array.isArray(strategy.weakObservations)
    ? strategy.weakObservations.filter(Boolean)
    : reviewDsl?.weakObservations?.map((item) => item.text).filter(Boolean)
  const candidateActions = strategy.nextActions?.length ? strategy.nextActions : strategy.actionCandidates
  const dslNextActions = candidateActions
    ?.map((action) => compactNextAction(action.targetRoute || action.actionUrl, action.actionType))
    .filter((action): action is NonNullable<typeof action> => Boolean(action))

  return withTrustedResultFields({
    id: bizId == null ? 'job-experiment:strategy' : `job-experiment:${bizId}:strategy`,
    scene: context.scene || 'JOB_EXPERIMENT_STRATEGY',
    bizType: context.bizType || 'JOB_EXPERIMENT',
    bizId,
    title: trimText(strategy.title),
    content: trimText(strategy.content),
    confidenceLevel: normalizeConfidenceLevel(strategy.confidenceLevel, {
      fallback,
      mock,
      sampleInsufficient,
      defaultLevel: 'MEDIUM'
    }),
    resultSource,
    fallback,
    mock,
    evidenceSources,
    trace: compactTrace({
      agentRunId: context.agentRunId ?? context.runId ?? null,
      traceId: context.traceId ?? null,
      aiCallLogId: context.aiCallLogId ?? null,
      promptVersionId: context.promptVersionId ?? null,
      asyncTaskId: context.asyncTaskId ?? null
    }),
    nextAction: compactNextAction(strategy.actionUrl || candidateActions?.[0]?.targetRoute || candidateActions?.[0]?.actionUrl),
    ...(dslNextActions?.length ? { nextActions: dslNextActions } : {}),
    sampleInsufficient,
    sampleWarning,
    unsupportedConclusions,
    weakObservations,
    qualityGate: strategy.qualityGate || reviewDsl?.qualityGate || undefined
  })
}
