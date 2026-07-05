import type { AgentMemoryVO, KnowledgeAskVO, KnowledgeSearchResultVO } from '@/api/v4'
import type { AgentTaskVO } from '@/types/agent'
import type { JobSearchExperimentStrategyVO } from '@/types/jobExperiment'
import type {
  EvidenceSourceVO,
  ExplainableSuggestionVO,
  SuggestionBizType,
  SuggestionConfidenceLevel,
  SuggestionResultSource,
  SuggestionScene,
  SuggestionTrustStatus,
  SuggestionTraceVO
} from '@/types/suggestion'

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
    ...(url ? { actionUrl: url } : {}),
    ...(type ? { actionType: type } : {})
  }
}

const normalizeResultSource = (value: unknown, fallback?: boolean | null): SuggestionResultSource => {
  if (fallback) return 'FALLBACK'
  return normalizeCode(value) || 'LLM'
}

export const normalizeConfidenceLevel = (
  value?: string | null,
  options: { fallback?: boolean | null; defaultLevel?: SuggestionConfidenceLevel } = {}
): SuggestionConfidenceLevel => {
  if (options.fallback) return 'LOW'

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
    const sourceType = normalizeCode(source.sourceType)
    const sourceId = normalizeSourceId(source.sourceId ?? source.sourceBizId ?? source.relationId)
    const sourceTitle = trimText(source.sourceTitle ?? source.title)
    const sourceLabel = trimText(source.sourceLabel ?? source.label)
    const evidenceSummary = trimText(
      source.evidenceSummary ?? source.sourceSummary ?? source.relationSummary ?? source.summary
    )
    const trustStatus = normalizeCode(source.trustStatus) as SuggestionTrustStatus | undefined
    const metadata = compactMetadata({
      documentId: normalizeOptionalNumber(source.documentId),
      chunkId: normalizeOptionalNumber(source.chunkId),
      chunkIndex: normalizeOptionalNumber(source.chunkIndex),
      documentType: trimText(source.documentType),
      sourceRef: trimText(source.sourceRef),
      score: normalizeOptionalNumber(source.score),
      matchType: normalizeCode(source.matchType),
      citationValid: normalizeOptionalBoolean(source.citationValid),
      answerGrounded: normalizeOptionalBoolean(source.answerGrounded),
      insufficientReferences: normalizeOptionalBoolean(source.insufficientReferences),
      memoryType: normalizeCode(source.memoryType),
      confidence: normalizeOptionalNumber(source.confidence),
      enabled: normalizeOptionalBoolean(source.enabled),
      active: normalizeOptionalBoolean(source.active),
      memorySourceType: normalizeCode(source.memorySourceType),
      memorySourceId: normalizeSourceId(source.memorySourceId),
      deleted: normalizeOptionalBoolean(source.deleted),
      stale: normalizeOptionalBoolean(source.stale)
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

export interface KnowledgeEvidenceOptions {
  citationValid?: boolean
  answerGrounded?: boolean
  insufficientReferences?: boolean
  disabled?: boolean
  stale?: boolean
  trustStatus?: SuggestionTrustStatus
}

export const knowledgeTrustStatus = (
  options: KnowledgeEvidenceOptions = {}
): SuggestionTrustStatus => {
  if (options.trustStatus) return normalizeCode(options.trustStatus) as SuggestionTrustStatus
  if (options.disabled) return 'DISABLED'
  if (options.stale) return 'STALE'
  if (options.insufficientReferences) return 'FALLBACK'
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

  if (sourceId === undefined && !summary && !title) return undefined

  const metadata = compactMetadata({
    documentId: result.documentId,
    chunkId: result.chunkId,
    chunkIndex: result.chunkIndex,
    documentType: trimText(result.documentType),
    sourceRef: trimText(result.sourceRef),
    score: normalizeOptionalNumber(result.score),
    matchType: normalizeCode(result.matchType),
    citationValid: options.citationValid,
    answerGrounded: options.answerGrounded,
    insufficientReferences: options.insufficientReferences
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
    trustStatus: knowledgeTrustStatus(options),
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

export const isAgentMemoryActive = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): boolean => {
  if (options.deleted) return false
  const enabled = normalizeOptionalBoolean(memory.enabled)
  if (enabled !== true) return false
  const deleted = normalizeOptionalBoolean(memory.deleted ?? memory.deleteFlag ?? memory.isDeleted)
  if (deleted === true) return false
  if (trimText(memory.deletedAt)) return false
  const status = normalizeCode(memory.status)
  if (status === 'DELETED' || status === 'REMOVED' || status === 'DISABLED') return false
  return true
}

export const memoryTrustStatus = (
  memory: AgentMemoryVO & Record<string, unknown>,
  options: AgentMemoryEvidenceOptions = {}
): SuggestionTrustStatus => {
  if (!isAgentMemoryActive(memory, options)) return 'DISABLED'
  if (options.stale) return 'STALE'
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
  const summary = trimText(memory.content)
  const metadata = compactMetadata({
    memoryType,
    confidence: normalizeOptionalNumber(memory.confidence),
    enabled,
    active,
    memorySourceType: normalizeCode(memory.sourceType),
    memorySourceId: normalizeSourceId(memory.sourceId),
    deleted: Boolean(options.deleted) || normalizeOptionalBoolean(memory.deleted ?? memory.deleteFlag ?? memory.isDeleted) === true,
    stale: Boolean(options.stale)
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
  if (!source) return false
  const trustStatus = normalizeCode(source.trustStatus)
  if (trustStatus === 'DISABLED') return false
  const metadata = source.metadata || {}
  if (metadata.enabled === false || metadata.active === false || metadata.deleted === true) return false
  return true
}

const agentConfidence = (task: AgentTaskSuggestionInput): SuggestionConfidenceLevel => {
  const trustStatus = normalizeCode(task.trustStatus)
  if (trustStatus === 'VERIFIED') return 'HIGH'
  if (trustStatus === 'FALLBACK' || task.fallback) return 'LOW'
  return normalizeConfidenceLevel(undefined, { defaultLevel: 'MEDIUM' })
}

export const fromAgentTask = (task: AgentTaskSuggestionInput): ExplainableSuggestionVO => {
  const fallback = Boolean(task.fallback || normalizeCode(task.trustStatus) === 'FALLBACK')
  const bizId = task.id
  const sourceType = task.sourceType || task.relatedBizType || task.taskType
  const sourceId = task.sourceId ?? task.relatedBizId ?? null
  const evidenceSummary = task.evidenceSummary || task.reason || task.reviewSummary

  return {
    id: `agent-task:${bizId}`,
    scene: 'AGENT_TASK_RECOMMENDATION',
    bizType: 'AGENT_TASK',
    bizId,
    title: trimText(task.title),
    content: trimText(task.description || task.reviewSummary),
    reason: trimText(task.reason),
    confidenceLevel: fallback ? 'LOW' : agentConfidence(task),
    resultSource: normalizeResultSource(task.reviewSource, fallback),
    fallback,
    evidenceSources: normalizeEvidenceSources([{ sourceType, sourceId, evidenceSummary, trustStatus: task.trustStatus }]),
    trace: compactTrace({
      agentRunId: task.agentRunId ?? task.runId ?? null,
      traceId: task.traceId ?? null,
      aiCallLogId: task.aiCallLogId ?? null,
      promptVersionId: task.promptVersionId ?? null
    }),
    nextAction: compactNextAction(task.actionUrl, task.actionType)
  }
}

export const fromJobExperimentStrategy = (
  strategy: JobSearchExperimentStrategyVO,
  context: JobExperimentSuggestionContext = {}
): ExplainableSuggestionVO => {
  const fallback = Boolean(context.fallback || normalizeCode(context.resultSource) === 'FALLBACK')
  const bizId = context.bizId ?? context.experimentId ?? null

  return {
    id: bizId == null ? 'job-experiment:strategy' : `job-experiment:${bizId}:strategy`,
    scene: context.scene || 'JOB_EXPERIMENT_STRATEGY',
    bizType: context.bizType || 'JOB_EXPERIMENT',
    bizId,
    title: trimText(strategy.title),
    content: trimText(strategy.content),
    confidenceLevel: normalizeConfidenceLevel(strategy.confidenceLevel, {
      fallback,
      defaultLevel: 'MEDIUM'
    }),
    resultSource: normalizeResultSource(context.resultSource, fallback),
    fallback,
    evidenceSources: normalizeEvidenceSources(strategy.evidenceSources),
    trace: compactTrace({
      agentRunId: context.agentRunId ?? context.runId ?? null,
      traceId: context.traceId ?? null,
      aiCallLogId: context.aiCallLogId ?? null,
      promptVersionId: context.promptVersionId ?? null
    }),
    nextAction: compactNextAction(strategy.actionUrl),
    sampleInsufficient: strategy.sampleInsufficient,
    sampleWarning: trimText(strategy.sampleWarning),
    unsupportedConclusions: Array.isArray(strategy.unsupportedConclusions)
      ? strategy.unsupportedConclusions.filter(Boolean)
      : undefined,
    weakObservations: Array.isArray(strategy.weakObservations)
      ? strategy.weakObservations.filter(Boolean)
      : undefined
  }
}
