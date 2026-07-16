import type {
  ResumeArtifactStatus,
  ResumeArtifactVO,
  ResumeAtsTemplateVO,
  ResumeAuditEvidenceStatus,
  ResumeClaimAuditFindingVO,
  ResumeClaimAuditVO,
  ResumeExportVO,
  ResumeSuggestionStatus,
  ResumeSuggestionRiskLevel,
  ResumeSuggestionVO,
  ResumeSuggestionView
} from '@/types/resumeDelivery'

const asArray = <T>(value: T[] | null | undefined) => Array.isArray(value) ? value : []
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeSuggestionStatus = (value: unknown): ResumeSuggestionStatus => {
  const status = String(value || '').trim().toUpperCase()
  return ['PENDING', 'ACCEPTED', 'REJECTED', 'UNDONE'].includes(status)
    ? status as ResumeSuggestionStatus
    : 'UNKNOWN'
}

const normalizeEvidenceStatus = (value: unknown): ResumeAuditEvidenceStatus => {
  const status = String(value || '').trim().toUpperCase()
  return ['VERIFIED', 'PARTIAL', 'RISK', 'UNSUPPORTED'].includes(status)
    ? status as ResumeAuditEvidenceStatus
    : 'UNKNOWN'
}

const normalizeArtifactStatus = (value: unknown): ResumeArtifactStatus => {
  const status = String(value || '').trim().toUpperCase()
  return ['GENERATING', 'READY', 'FAILED'].includes(status)
    ? status as ResumeArtifactStatus
    : 'UNKNOWN'
}

const normalizeSuggestionRiskLevel = (value: unknown): ResumeSuggestionRiskLevel => {
  const level = String(value || '').trim().toUpperCase()
  return ['LOW', 'MEDIUM', 'HIGH'].includes(level)
    ? level as ResumeSuggestionRiskLevel
    : 'UNKNOWN'
}

const latestBatchUndoVersionId = (
  source: Partial<ResumeSuggestionVO>,
  appliedVersionId: number | undefined,
  suggestions: Array<Partial<ResumeSuggestionVO>>
) => {
  if (!appliedVersionId || source.resumeId == null) return appliedVersionId
  return suggestions.reduce((latestVersionId, candidate) => {
    const sameBatch = candidate.resumeId === source.resumeId
      && toNumber(candidate.sourceResumeVersionId) === toNumber(source.sourceResumeVersionId)
      && toNumber(candidate.appliedResumeVersionId) === appliedVersionId
    if (!sameBatch || candidate.undoResumeVersionId == null) return latestVersionId
    return Math.max(latestVersionId, toNumber(candidate.undoResumeVersionId))
  }, appliedVersionId)
}

export const normalizeResumeSuggestion = (
  source: Partial<ResumeSuggestionVO>,
  currentVersionId?: number,
  suggestions: Array<Partial<ResumeSuggestionVO>> = []
): ResumeSuggestionView => {
  const status = normalizeSuggestionStatus(source.status)
  const sourceVersionId = toNumber(source.sourceResumeVersionId)
  const appliedVersionId = source.appliedResumeVersionId == null
    ? undefined
    : toNumber(source.appliedResumeVersionId)
  const expectedVersionId = status === 'ACCEPTED'
    ? latestBatchUndoVersionId(source, appliedVersionId, suggestions)
    : sourceVersionId
  const stale = Boolean(currentVersionId && expectedVersionId && currentVersionId !== expectedVersionId)
  const staleReason = stale
    ? status === 'ACCEPTED'
      ? `当前简历已不是建议应用后的版本 #${expectedVersionId}，撤销可能覆盖后续修改。`
      : `建议基于版本 #${sourceVersionId}，当前版本为 #${currentVersionId}。`
    : undefined

  return {
    id: toNumber(source.id),
    resumeId: source.resumeId,
    sourceResumeVersionId: sourceVersionId,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion,
    sectionKey: String(source.sectionKey || 'unknown'),
    sectionId: source.sectionId,
    fieldPath: source.fieldPath,
    anchorStart: toNumber(source.anchorStart),
    anchorEnd: toNumber(source.anchorEnd),
    anchorTextHash: source.anchorTextHash,
    originalText: String(source.originalText || ''),
    suggestedText: String(source.suggestedText || ''),
    acceptedText: source.acceptedText,
    evidenceReferences: asArray(source.evidenceReferences),
    riskLevel: normalizeSuggestionRiskLevel(source.riskLevel),
    rationale: source.rationale,
    status,
    decisionVersion: source.decisionVersion,
    appliedResumeVersionId: appliedVersionId,
    undoResumeVersionId: source.undoResumeVersionId,
    decidedAt: source.decidedAt,
    createdAt: source.createdAt,
    decisions: asArray(source.decisions),
    stale,
    staleReason,
    canAccept: status === 'PENDING' && !stale,
    canReject: status === 'PENDING',
    canUndo: status === 'ACCEPTED' && !stale
  }
}

export const isLowRiskBatchCandidate = (
  suggestion: ResumeSuggestionView,
  editedText?: string
) => suggestion.status === 'PENDING'
  && suggestion.riskLevel === 'LOW'
  && suggestion.canAccept
  && !suggestion.stale
  && (editedText == null || editedText.trim() === suggestion.suggestedText.trim())

export const normalizeResumeAuditFinding = (
  source: Partial<ResumeClaimAuditFindingVO>
): ResumeClaimAuditFindingVO => ({
  id: source.id,
  sectionKey: source.sectionKey,
  claimIndex: source.claimIndex,
  claimType: source.claimType,
  claimText: source.claimText,
  claimHash: source.claimHash,
  quantities: asArray(source.quantities).map(String).filter(Boolean),
  evidenceStatus: normalizeEvidenceStatus(source.evidenceStatus),
  evidenceRefs: asArray(source.evidenceRefs),
  reason: source.reason
})

export const normalizeResumeAudit = (
  source: Partial<ResumeClaimAuditVO>
): ResumeClaimAuditVO => ({
  id: toNumber(source.id),
  resumeId: source.resumeId,
  resumeVersionId: toNumber(source.resumeVersionId),
  sourceHash: source.sourceHash,
  auditVersion: source.auditVersion,
  status: String(source.status || 'UNKNOWN').toUpperCase(),
  claimCount: toNumber(source.claimCount),
  verifiedCount: toNumber(source.verifiedCount),
  partialCount: toNumber(source.partialCount),
  unsupportedCount: toNumber(source.unsupportedCount),
  riskCount: toNumber(source.riskCount),
  errorMessage: source.errorMessage,
  completedAt: source.completedAt,
  createdAt: source.createdAt,
  findings: asArray(source.findings).map(normalizeResumeAuditFinding)
})

export const normalizeResumeTemplate = (
  source: Partial<ResumeAtsTemplateVO>
): ResumeAtsTemplateVO => ({
  id: source.id,
  templateCode: String(source.templateCode || 'ATS_SINGLE_COLUMN'),
  templateVersion: Math.max(1, toNumber(source.templateVersion, 1)),
  templateName: String(source.templateName || 'ATS 单栏模板'),
  layoutType: source.layoutType,
  definition: source.definition,
  definitionHash: source.definitionHash,
  status: source.status
})

export const normalizeResumeArtifact = (
  source: Partial<ResumeArtifactVO>
): ResumeArtifactVO => ({
  id: toNumber(source.id),
  artifactType: String(source.artifactType || 'RESUME_EXPORT').toUpperCase(),
  sourceResumeId: source.sourceResumeId,
  sourceResumeVersionId: source.sourceResumeVersionId,
  sourceApplicationPackageId: source.sourceApplicationPackageId,
  sourceHash: source.sourceHash,
  templateCode: source.templateCode,
  templateVersion: source.templateVersion,
  fileName: String(source.fileName || `resume-artifact-${source.id || 'unknown'}`),
  mimeType: source.mimeType,
  fileSize: source.fileSize == null ? undefined : toNumber(source.fileSize),
  sha256: source.sha256,
  status: normalizeArtifactStatus(source.status),
  manifest: source.manifest,
  errorMessage: source.errorMessage,
  createdAt: source.createdAt,
  updatedAt: source.updatedAt
})

export const normalizeResumeExport = (source: Partial<ResumeExportVO>): ResumeExportVO => ({
  id: toNumber(source.id),
  resumeId: source.resumeId,
  resumeVersionId: toNumber(source.resumeVersionId),
  sourceHash: source.sourceHash,
  templateId: source.templateId,
  templateCode: source.templateCode,
  templateVersion: source.templateVersion,
  exportFormat: String(source.exportFormat || 'PDF').toUpperCase() === 'DOCX' ? 'DOCX' : 'PDF',
  status: normalizeArtifactStatus(source.status),
  contentHash: source.contentHash,
  errorMessage: source.errorMessage,
  artifact: source.artifact ? normalizeResumeArtifact(source.artifact) : undefined,
  createdAt: source.createdAt
})

export const suggestionStatusMeta = (status?: string) => ({
  PENDING: { label: '待审阅', type: 'warning' as const },
  ACCEPTED: { label: '已接受', type: 'success' as const },
  REJECTED: { label: '已拒绝', type: 'info' as const },
  UNDONE: { label: '已撤销', type: 'info' as const },
  UNKNOWN: { label: '状态待确认', type: 'info' as const }
}[normalizeSuggestionStatus(status)])

export const auditEvidenceMeta = (status?: string) => ({
  VERIFIED: { label: '已有证据', type: 'success' as const, conclusion: '当前有证据引用，仍建议核对原始材料。' },
  PARTIAL: { label: '部分证据', type: 'warning' as const, conclusion: '证据覆盖不完整，只能作为待复核提示。' },
  RISK: { label: '量化风险', type: 'danger' as const, conclusion: '量化表达未找到对应佐证，请核对数字并补充证据；不代表经历为假。' },
  UNSUPPORTED: { label: '未找到证据', type: 'danger' as const, conclusion: '未找到证据不等于事实为假，请人工补证或降级表述。' },
  UNKNOWN: { label: '无法判断', type: 'info' as const, conclusion: '当前信息不足，不输出强结论。' }
}[normalizeEvidenceStatus(status)])

export const artifactStatusMeta = (status?: string) => ({
  GENERATING: { label: '生成中', type: 'warning' as const },
  READY: { label: '可下载', type: 'success' as const },
  FAILED: { label: '生成失败', type: 'danger' as const },
  UNKNOWN: { label: '状态待确认', type: 'info' as const }
}[normalizeArtifactStatus(status)])

export const resumeSectionLabel = (sectionKey?: string) => {
  const key = String(sectionKey || '')
  if (key.startsWith('projects[')) return '项目经历'
  return ({
    title: '简历名称',
    realName: '姓名',
    email: '邮箱',
    phone: '手机号',
    targetPosition: '目标岗位',
    skillStack: '技能栈',
    workExperience: '工作经历',
    educationExperience: '教育经历',
    summary: '个人摘要'
  } as Record<string, string>)[key] || key || '未知区块'
}

export const formatArtifactSize = (bytes?: number) => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '--'
  const value = Number(bytes)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export const findAnchorOccurrences = (sourceText: string, originalText: string) => {
  if (!sourceText || !originalText) return []
  const indexes: number[] = []
  let cursor = 0
  while (cursor <= sourceText.length - originalText.length) {
    const index = sourceText.indexOf(originalText, cursor)
    if (index < 0) break
    indexes.push(index)
    cursor = index + Math.max(1, originalText.length)
  }
  return indexes
}
