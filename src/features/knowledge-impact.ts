export type KnowledgeImpactTargetKind = 'DOCUMENT' | 'CHUNK'

export type KnowledgeInfluenceEvidenceState =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'DEGRADED'
  | 'REVIEW_REQUIRED'

export type KnowledgeGovernanceActionCode =
  | 'ADD_KNOWLEDGE_DOCUMENT'
  | 'REINDEX_KNOWLEDGE'
  | 'REVIEW_KNOWLEDGE_CITATION'
  | 'MERGE_DUPLICATE_KNOWLEDGE'

export interface KnowledgeImpactDocument {
  id?: number
  title?: string | null
  documentType?: string | null
  status?: string | null
  chunkCount?: number | null
  duplicateChunkCount?: number | null
  nearDuplicateChunkCount?: number | null
  updatedAt?: string | null
  createdAt?: string | null
}

export interface KnowledgeImpactChunk {
  id?: number
  documentId?: number | null
  chunkIndex?: number | null
  content?: string | null
  sourceRef?: string | null
  indexStatus?: string | null
  lastError?: string | null
  duplicateInDocument?: boolean | null
  cleanupCandidate?: boolean | null
  indexedAt?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

export interface KnowledgeImpactSearchResult {
  documentId?: number | null
  chunkId?: number | null
  title?: string | null
  documentType?: string | null
  snippet?: string | null
  sourceRef?: string | null
  score?: number | null
  matchType?: string | null
}

export interface KnowledgeImpactSearchTrace {
  vectorEnabled?: boolean | null
  finalCandidateCount?: number | null
  finalResults?: KnowledgeImpactSearchResult[] | null
  warnings?: string[] | null
  generatedAt?: string | null
}

export interface KnowledgeImpactEvaluationItem {
  passed?: boolean | null
  topDocumentId?: number | null
  expectedDocumentId?: number | null
  retrievalDocumentId?: number | null
  topScore?: number | null
  referenceCount?: number | null
  citationValid?: boolean | null
  answerGrounded?: boolean | null
  failureReason?: string | null
  citationWarning?: string | null
  references?: KnowledgeImpactSearchResult[] | null
}

export interface KnowledgeImpactEvaluation {
  evaluatedCount?: number | null
  failedCount?: number | null
  passRate?: number | null
  items?: KnowledgeImpactEvaluationItem[] | null
  results?: KnowledgeImpactEvaluationItem[] | null
}

export interface KnowledgeImpactDuplicateReview {
  candidateCount?: number | null
  items?: Array<{
    documentId?: number | null
    chunkId?: number | null
    topScore?: number | null
    matches?: KnowledgeImpactSearchResult[] | null
  }> | null
}

export interface KnowledgeImpactStats {
  documentCount?: number | null
  chunkCount?: number | null
  duplicateChunkCount?: number | null
  indexStatusCounts?: Record<string, number> | null
  semanticEnabled?: boolean | null
  vectorEnabled?: boolean | null
}

export interface KnowledgeImpactMemory {
  id?: number
  sourceType?: string | null
  sourceId?: number | null
  confidence?: number | null
  enabled?: number | boolean | null
  memoryStatus?: string | null
  trustStatus?: string | null
  stale?: boolean | null
  expiresAt?: string | null
  impactScopes?: string[] | null
  riskFlags?: string[] | null
}

export interface BuildKnowledgeInfluencePreviewInput {
  targetKind: KnowledgeImpactTargetKind
  document?: KnowledgeImpactDocument | null
  chunk?: KnowledgeImpactChunk | null
  chunks?: KnowledgeImpactChunk[] | null
  searchResults?: KnowledgeImpactSearchResult[] | null
  askReferences?: KnowledgeImpactSearchResult[] | null
  searchTrace?: KnowledgeImpactSearchTrace | null
  knowledgeEvaluation?: KnowledgeImpactEvaluation | null
  latestEvalRun?: KnowledgeImpactEvaluation | null
  duplicateReview?: KnowledgeImpactDuplicateReview | null
  stats?: KnowledgeImpactStats | null
  memories?: KnowledgeImpactMemory[] | null
  minScore?: number | null
  now?: Date
}

export interface KnowledgeInfluenceItem {
  key: string
  label: string
  status: KnowledgeInfluenceEvidenceState
  summary: string
  evidence?: string
}

export interface KnowledgeGovernanceActionPreview {
  code: KnowledgeGovernanceActionCode
  title: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceState: KnowledgeInfluenceEvidenceState
}

export interface KnowledgeInfluencePreview {
  targetKind: KnowledgeImpactTargetKind
  targetId?: number
  title: string
  confidence: KnowledgeInfluenceEvidenceState
  evidenceSummary: string
  referenceCount?: number
  recentReferenceCount?: number
  futureContextImpact?: boolean
  historicalOnly?: boolean
  safeToDisable?: boolean
  previewSource?: 'BACKEND_REFERENCES' | 'ESTIMATED' | string
  resultSource?: 'BACKEND_REFERENCES' | 'ESTIMATED' | string
  fallbackReason?: string
  directImpacts: KnowledgeInfluenceItem[]
  indirectImpacts: KnowledgeInfluenceItem[]
  governanceActions: KnowledgeGovernanceActionPreview[]
  warnings: string[]
}

const defaultMinScore = 0.65
const staleAfterDays = 180

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toToken = (value?: string | null) => String(value || '').trim().toUpperCase()

const daysSince = (value?: string | null, now = new Date()) => {
  if (!value) return undefined
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return undefined
  return Math.floor((now.getTime() - time) / 86400000)
}

const isExpired = (value?: string | null, now = new Date()) => {
  if (!value) return false
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time < now.getTime()
}

const matchesTarget = (
  item: KnowledgeImpactSearchResult | undefined | null,
  documentId?: number,
  chunkId?: number
) => {
  if (!item) return false
  if (chunkId && item.chunkId === chunkId) return true
  if (documentId && item.documentId === documentId) return true
  return false
}

const itemState = (supported: boolean, risky: boolean, hasEvidence: boolean): KnowledgeInfluenceEvidenceState => {
  if (!hasEvidence) return 'REVIEW_REQUIRED'
  if (risky) return 'DEGRADED'
  return supported ? 'SUPPORTED' : 'PARTIAL'
}

const pushAction = (
  actions: KnowledgeGovernanceActionPreview[],
  action: KnowledgeGovernanceActionPreview
) => {
  if (actions.some((item) => item.code === action.code && item.reason === action.reason)) return
  actions.push(action)
}

export const buildKnowledgeInfluencePreview = (
  input: BuildKnowledgeInfluencePreviewInput
): KnowledgeInfluencePreview => {
  const now = input.now || new Date()
  const document = input.document || null
  const chunk = input.chunk || null
  const documentId = document?.id ?? chunk?.documentId ?? undefined
  const chunkId = chunk?.id ?? undefined
  const title = document?.title || chunk?.sourceRef || (chunkId ? `片段 #${chunkId}` : '知识项')
  const minScore = input.minScore ?? defaultMinScore
  const targetChunks = (input.chunks || []).filter((item) =>
    chunkId ? item.id === chunkId : !documentId || item.documentId === documentId
  )
  const searchEvidence = [
    ...(input.searchResults || []),
    ...(input.askReferences || []),
    ...(input.searchTrace?.finalResults || [])
  ].filter((item) => matchesTarget(item, documentId, chunkId))
  const bestScore = searchEvidence.reduce(
    (score, item) => Math.max(score, toNumber(item.score, 0)),
    0
  )
  const currentEvalItems = input.knowledgeEvaluation?.items || []
  const latestEvalItems = input.latestEvalRun?.items || input.latestEvalRun?.results || []
  const evalItems = (currentEvalItems.length ? currentEvalItems : latestEvalItems).filter((item) => {
    if (chunkId && item.references?.some((ref) => ref.chunkId === chunkId)) return true
    return Boolean(
      documentId &&
      (
        item.topDocumentId === documentId ||
        item.expectedDocumentId === documentId ||
        item.retrievalDocumentId === documentId ||
        item.references?.some((ref) => ref.documentId === documentId)
      )
    )
  })
  const duplicateItems = (input.duplicateReview?.items || []).filter((item) => {
    if (chunkId && item.chunkId === chunkId) return true
    return Boolean(documentId && item.documentId === documentId)
  })
  const relatedMemories = (input.memories || []).filter((item) => {
    if (!item.sourceType || item.sourceId === undefined || item.sourceId === null) return false
    const sourceType = toToken(item.sourceType)
    if (chunkId && sourceType.includes('KNOWLEDGE_CHUNK') && item.sourceId === chunkId) return true
    return Boolean(documentId && sourceType.includes('KNOWLEDGE') && item.sourceId === documentId)
  })

  const warnings: string[] = []
  const governanceActions: KnowledgeGovernanceActionPreview[] = []
  const directImpacts: KnowledgeInfluenceItem[] = []
  const indirectImpacts: KnowledgeInfluenceItem[] = []

  const chunkCount = chunk ? 1 : toNumber(document?.chunkCount, targetChunks.length)
  const failedChunks = targetChunks.filter((item) => toToken(item.indexStatus) === 'FAILED' || Boolean(item.lastError)).length
  const pendingChunks = targetChunks.filter((item) => ['PENDING', 'PROCESSING', 'EMPTY'].includes(toToken(item.indexStatus))).length
  const duplicateCount = toNumber(document?.duplicateChunkCount) +
    toNumber(document?.nearDuplicateChunkCount) +
    targetChunks.filter((item) => item.duplicateInDocument || item.cleanupCandidate).length +
    duplicateItems.length
  const staleDays = daysSince(chunk?.updatedAt || chunk?.indexedAt || document?.updatedAt || document?.createdAt, now)
  const stale = staleDays !== undefined && staleDays > staleAfterDays
  const lowScore = searchEvidence.length > 0 && bestScore < minScore
  const evalFailed = evalItems.some((item) =>
    item.passed === false ||
    item.citationValid === false ||
    item.answerGrounded === false ||
    Boolean(item.failureReason || item.citationWarning)
  )
  const memoryRisk = relatedMemories.some((item) =>
    item.stale ||
    isExpired(item.expiresAt, now) ||
    toNumber(item.confidence, 1) < 0.6 ||
    ['STALE', 'DISABLED', 'CANDIDATE', 'PENDING_CONFIRMATION'].includes(toToken(item.trustStatus || item.memoryStatus)) ||
    item.enabled === 0 ||
    item.enabled === false ||
    Boolean(item.riskFlags?.length)
  )
  const hasAnyEvidence = Boolean(
    searchEvidence.length ||
    evalItems.length ||
    targetChunks.length ||
    duplicateItems.length ||
    relatedMemories.length ||
    document ||
    chunk
  )

  if (!hasAnyEvidence) {
    warnings.push('没有可追溯证据，只能展示待复核影响预览。')
  }
  if (failedChunks || pendingChunks || toToken(document?.status) === 'FAILED' || toToken(chunk?.indexStatus) === 'FAILED') {
    warnings.push('存在失败或待索引片段，检索、问答和评测影响只能降级判断。')
    pushAction(governanceActions, {
      code: 'REINDEX_KNOWLEDGE',
      title: '重建或重试知识索引',
      reason: `失败 ${failedChunks} 个，待处理 ${pendingChunks} 个`,
      priority: failedChunks ? 'HIGH' : 'MEDIUM',
      evidenceState: 'DEGRADED'
    })
  }
  if (lowScore) {
    warnings.push(`最高匹配分 ${Math.round(bestScore * 100)}% 低于阈值 ${Math.round(minScore * 100)}%，不能输出强影响结论。`)
    pushAction(governanceActions, {
      code: 'REVIEW_KNOWLEDGE_CITATION',
      title: '复核低置信引用',
      reason: '命中分低于当前最低引用分',
      priority: 'MEDIUM',
      evidenceState: 'DEGRADED'
    })
  }
  if (stale) {
    warnings.push(`资料或片段已超过 ${staleAfterDays} 天未更新，建议复核时效性。`)
    pushAction(governanceActions, {
      code: 'REINDEX_KNOWLEDGE',
      title: '复核过期资料并重建索引',
      reason: `约 ${staleDays} 天未更新`,
      priority: 'MEDIUM',
      evidenceState: 'REVIEW_REQUIRED'
    })
  }
  if (evalFailed) {
    warnings.push('关联评测存在失败、引用异常或答案依据不足。')
    pushAction(governanceActions, {
      code: 'REVIEW_KNOWLEDGE_CITATION',
      title: '复核评测失败引用',
      reason: `${evalItems.length} 条关联评测需复核`,
      priority: 'HIGH',
      evidenceState: 'DEGRADED'
    })
  }
  if (duplicateCount > 0) {
    warnings.push('存在重复或近重复片段，可能放大同一证据权重。')
    pushAction(governanceActions, {
      code: 'MERGE_DUPLICATE_KNOWLEDGE',
      title: '合并或清理重复知识',
      reason: `命中 ${duplicateCount} 个重复信号`,
      priority: 'MEDIUM',
      evidenceState: 'PARTIAL'
    })
  }
  if (!document && !chunk) {
    pushAction(governanceActions, {
      code: 'ADD_KNOWLEDGE_DOCUMENT',
      title: '补充知识资料',
      reason: '当前没有明确知识目标',
      priority: 'HIGH',
      evidenceState: 'REVIEW_REQUIRED'
    })
  }

  const directState = itemState(searchEvidence.length > 0, lowScore || evalFailed, hasAnyEvidence)
  directImpacts.push({
    key: 'suggestions',
    label: '建议/行动',
    status: directState,
    summary: searchEvidence.length
      ? `当前检索或问答命中 ${searchEvidence.length} 条，最高分 ${bestScore ? `${Math.round(bestScore * 100)}%` : '待确认'}。`
      : '没有当前检索或问答命中，建议只作为待复核影响。',
    evidence: searchEvidence.slice(0, 3).map((item) => item.title || item.sourceRef || item.matchType || '引用片段').join(' / ')
  })
  directImpacts.push({
    key: 'delivery-package',
    label: '投递包',
    status: itemState(Boolean(documentId || chunkId), stale || duplicateCount > 0, hasAnyEvidence),
    summary: documentId || chunkId
      ? '可能影响简历素材、项目证据和投递包中的个人资料引用。'
      : '缺少资料目标，投递包影响待人工确认。'
  })
  directImpacts.push({
    key: 'interview-training',
    label: '面试训练/报告',
    status: itemState(Boolean(evalItems.length || searchEvidence.length), evalFailed || lowScore, hasAnyEvidence),
    summary: evalItems.length
      ? `关联 ${evalItems.length} 条评测或训练样本，失败项会转为复核。`
      : '未发现明确训练样本关联，只提示潜在影响。'
  })

  indirectImpacts.push({
    key: 'agent-plan',
    label: 'Agent 计划',
    status: itemState(Boolean(relatedMemories.length || searchEvidence.length), memoryRisk || lowScore, hasAnyEvidence),
    summary: relatedMemories.length
      ? `关联 ${relatedMemories.length} 条长期记忆，低置信或过期记忆不会进入强建议。`
      : '未发现明确长期记忆关联，计划影响降级为待复核。'
  })
  indirectImpacts.push({
    key: 'training-queue',
    label: '训练队列',
    status: itemState(Boolean(chunkCount || evalItems.length), failedChunks > 0 || pendingChunks > 0 || evalFailed, hasAnyEvidence),
    summary: chunkCount
      ? `覆盖约 ${chunkCount} 个片段；失败、待索引或评测失败时进入治理队列。`
      : '没有片段证据，训练队列影响待复核。'
  })

  const riskCount = warnings.length + governanceActions.length
  const confidence: KnowledgeInfluenceEvidenceState =
    !hasAnyEvidence ? 'REVIEW_REQUIRED' :
      riskCount > 1 ? 'DEGRADED' :
        riskCount === 1 ? 'PARTIAL' :
          'SUPPORTED'

  return {
    targetKind: input.targetKind,
    targetId: chunkId || documentId,
    title,
    confidence,
    previewSource: 'ESTIMATED',
    resultSource: 'ESTIMATED',
    evidenceSummary: hasAnyEvidence
      ? `证据：检索 ${searchEvidence.length} 条，评测 ${evalItems.length} 条，片段 ${chunkCount} 个，重复信号 ${duplicateCount} 个。`
      : '没有可追溯证据，当前预览仅用于人工复核。',
    directImpacts,
    indirectImpacts,
    governanceActions,
    warnings: Array.from(new Set(warnings))
  }
}
