import type {
  JobReadinessDimensionVO,
  JobReadinessSnapshotVO,
  JobRequirementActionVO,
  JobRequirementEvidenceVO,
  JobRequirementGroupVO,
  JobRequirementItemVO,
  JobRequirementMatrixSummaryVO,
  JobRequirementMatrixVO,
  JobRequirementStatus
} from '@/types/jobRequirement'

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeStatus = (value: unknown): JobRequirementStatus => {
  const normalized = String(value || '').trim().toUpperCase()
  if (['COVERED', 'WEAK', 'MISSING', 'UNVERIFIED', 'CONFLICT'].includes(normalized)) return normalized
  return 'UNVERIFIED'
}

const asArray = <T>(value: T[] | null | undefined) => (Array.isArray(value) ? value : [])

const normalizeAction = (action: JobRequirementActionVO): JobRequirementActionVO => {
  const actionCode = action.actionCode || action.actionType
  const path = action.path || action.actionUrl
  return {
    actionCode,
    path,
    actionType: actionCode,
    title: action.title,
    description: action.description,
    actionUrl: path,
    priority: action.priority
  }
}

type JobRequirementEvidenceInput = JobRequirementEvidenceVO & {
  projectEvidenceId?: number
  projectSkillEvidenceId?: number
  projectTitle?: string
  skillName?: string
  matchType?: string
  coverageLevel?: string
  evidenceText?: string
}

const normalizeEvidence = (
  evidence: JobRequirementEvidenceInput
): JobRequirementEvidenceVO => {
  const confidenceLevel = evidence.confidenceLevel ?? evidence.confidence
  return {
    id: evidence.id,
    evidenceType: evidence.evidenceType
      || (evidence.projectSkillEvidenceId ? 'PROJECT_SKILL' : 'PROJECT'),
    evidenceId: evidence.evidenceId
      ?? evidence.projectSkillEvidenceId
      ?? evidence.projectEvidenceId,
    evidenceSubId: evidence.evidenceSubId ?? evidence.projectEvidenceId,
    title: evidence.title || evidence.projectTitle || evidence.skillName,
    excerpt: evidence.excerpt || evidence.evidenceText,
    resultSource: evidence.resultSource,
    score: evidence.score,
    occurredAt: evidence.occurredAt,
    matchStatus: evidence.matchStatus
      ?? (evidence.coverageLevel === 'STRONG' ? 'COVERED' : evidence.coverageLevel),
    matchScore: evidence.matchScore,
    confidenceLevel,
    confidence: confidenceLevel,
    matchReason: evidence.matchReason,
    sourceType: evidence.sourceType,
    confirmed: evidence.confirmed,
    fallback: evidence.fallback
  }
}

const normalizeRequirement = (item: Partial<JobRequirementItemVO>, index: number): JobRequirementItemVO => ({
  requirementId: toNumber(item.requirementId, -(index + 1)),
  requirementType: String(item.requirementType || 'OTHER').toUpperCase(),
  requirementKey: item.requirementKey,
  title: String(item.title || item.skillName || item.description || `岗位要求 ${index + 1}`),
  description: item.description,
  skillName: item.skillName,
  skillCategory: item.skillCategory,
  requiredLevel: item.requiredLevel,
  weight: item.weight == null ? undefined : toNumber(item.weight),
  priority: item.priority == null ? undefined : toNumber(item.priority),
  status: normalizeStatus(item.status),
  confidence: String(item.confidence || 'LOW').toUpperCase(),
  evidences: asArray(item.evidences).map(normalizeEvidence),
  gaps: asArray(item.gaps).map(String).filter(Boolean),
  nextActions: asArray(item.nextActions).map(normalizeAction)
})

const flattenGroups = (groups: JobRequirementGroupVO[]) => groups.flatMap((group) => group.items)

const buildSummary = (
  items: JobRequirementItemVO[],
  source?: Partial<JobRequirementMatrixSummaryVO>
): JobRequirementMatrixSummaryVO => {
  const count = (status: JobRequirementStatus) => items.filter((item) => item.status === status).length
  const total = toNumber(source?.total, items.length)
  const covered = toNumber(source?.covered, count('COVERED'))
  const weak = toNumber(source?.weak, count('WEAK'))
  const missing = toNumber(source?.missing, count('MISSING'))
  const unverified = toNumber(source?.unverified, count('UNVERIFIED'))
  const conflict = toNumber(source?.conflict, count('CONFLICT'))
  const weightedCoverage = covered + weak * 0.5

  return {
    total,
    covered,
    weak,
    missing,
    unverified,
    conflict,
    coveragePercent: source?.coveragePercent == null
      ? (total ? Math.round((weightedCoverage / total) * 100) : 0)
      : Math.max(0, Math.min(100, toNumber(source.coveragePercent))),
    confidence: String(source?.confidence || (covered ? 'MEDIUM' : 'LOW')).toUpperCase(),
    sampleInsufficient: Boolean(source?.sampleInsufficient)
  }
}

export const normalizeJobRequirementMatrix = (
  source: Partial<JobRequirementMatrixVO> | null | undefined,
  targetJobId: number
): JobRequirementMatrixVO | null => {
  if (!source) return null
  const formalRequirements = asArray(source.requirements).map((item, index) => normalizeRequirement({
    requirementId: item.requirementId,
    requirementKey: item.requirementKey,
    requirementType: item.requirementType || 'OTHER',
    title: item.requirementName,
    priority: typeof item.priority === 'number' ? item.priority : undefined,
    weight: item.weight,
    status: item.coverageLevel === 'STRONG' ? 'COVERED' : item.coverageLevel,
    confidence: item.requirementConfidence,
    evidences: asArray(item.evidences).map(normalizeEvidence),
    gaps: item.coverageLevel === 'MISSING' ? ['当前要求缺少可确认的项目或简历证据。'] : [],
    nextActions: asArray(item.nextActions)
  }, index))
  const formalGroups = Array.from(new Set(formalRequirements.map((item) => item.requirementType))).map((type) => ({
    requirementType: type,
    items: formalRequirements.filter((item) => item.requirementType === type)
  }))
  const groups: JobRequirementGroupVO[] = (formalGroups.length ? formalGroups : asArray(source.groups))
    .map((group, groupIndex) => {
      const rawTitle = 'title' in group ? group.title : undefined
      return {
        requirementType: String(group.requirementType || `OTHER_${groupIndex}`).toUpperCase(),
        title: typeof rawTitle === 'string' ? rawTitle : undefined,
        items: asArray(group.items).map(normalizeRequirement)
      }
    })
  const items = flattenGroups(groups)

  return {
    targetJobId: toNumber(source.targetJobId, targetJobId),
    jdAnalysisId: source.jdAnalysisId == null ? undefined : toNumber(source.jdAnalysisId),
    generatedAt: source.generatedAt,
    summary: buildSummary(items, {
      ...source.summary,
      total: source.requirementCount ?? source.summary?.total,
      covered: source.strongCount ?? source.summary?.covered,
      weak: source.weakCount ?? source.summary?.weak,
      missing: source.missingCount ?? source.summary?.missing
    }),
    groups,
    requirements: source.requirements,
    requirementCount: source.requirementCount,
    strongCount: source.strongCount,
    weakCount: source.weakCount,
    missingCount: source.missingCount,
    warnings: asArray(source.warnings).map(String).filter(Boolean),
    traceId: source.traceId
  }
}

export const normalizeJobReadiness = (
  source: Partial<JobReadinessSnapshotVO> | null | undefined,
  targetJobId: number
): JobReadinessSnapshotVO | null => {
  if (!source) return null
  const dimensions: JobReadinessDimensionVO[] = asArray(source.dimensions).map((item) => {
    const confidenceLevel = String(item.confidenceLevel || item.confidence || 'LOW').toUpperCase()
    const fallback = Boolean(item.fallback)
    return {
      ...item,
      dimension: String(item.dimension || 'OTHER').toUpperCase(),
      title: item.title,
      score: item.score == null ? undefined : Math.max(0, Math.min(100, toNumber(item.score))),
      confidence: confidenceLevel,
      confidenceLevel,
      fallback,
      sampleCount: toNumber(item.sampleCount, item.evidenceCount),
      evidenceCount: toNumber(item.evidenceCount),
      coveredRequirementCount: toNumber(item.coveredRequirementCount),
      missingRequirementCount: toNumber(item.missingRequirementCount),
      sampleInsufficient: Boolean(item.sampleInsufficient) || fallback,
      warnings: asArray(item.warnings).map(String).filter(Boolean)
    }
  })
  const readinessScore = source.readinessScore ?? source.overallScore
  const readinessLevel = source.readinessLevel || source.overallLevel
  const confidenceLevel = String(source.confidenceLevel || source.confidence || 'LOW').toUpperCase()

  return {
    id: source.id == null ? undefined : toNumber(source.id),
    targetJobId: toNumber(source.targetJobId, targetJobId),
    jdAnalysisId: source.jdAnalysisId == null ? undefined : toNumber(source.jdAnalysisId),
    overallScore: readinessScore == null
      ? undefined
      : Math.max(0, Math.min(100, toNumber(readinessScore))),
    overallLevel: readinessLevel,
    readinessScore: readinessScore == null
      ? undefined
      : Math.max(0, Math.min(100, toNumber(readinessScore))),
    readinessLevel,
    confidence: confidenceLevel,
    confidenceLevel,
    fallback: Boolean(source.fallback),
    sampleCount: toNumber(source.sampleCount, source.requirementCount),
    sampleInsufficient: Boolean(source.sampleInsufficient) || Boolean(source.fallback),
    algorithmVersion: source.policyVersion || source.algorithmVersion,
    policyVersion: source.policyVersion,
    requirementCount: toNumber(source.requirementCount),
    strongCount: toNumber(source.strongCount),
    weakCount: toNumber(source.weakCount),
    missingCount: toNumber(source.missingCount),
    mustRequirementCount: toNumber(source.mustRequirementCount),
    mustMissingCount: toNumber(source.mustMissingCount),
    summary: source.summary,
    matrix: source.matrix,
    generatedAt: source.generatedAt || source.createdAt,
    createdAt: source.createdAt,
    dimensions,
    warnings: asArray(source.warnings).map(String).filter(Boolean),
    traceId: source.traceId
  }
}

export interface JobReadinessTrendPoint {
  id?: number
  generatedAt?: string
  score?: number
  sampleInsufficient: boolean
  strongCount: number
  missingCount: number
}

export interface JobReadinessChangeSummary {
  scoreDelta?: number
  strongDelta: number
  missingDelta: number
  reasons: string[]
}

export const buildJobReadinessTrend = (
  snapshots: JobReadinessSnapshotVO[]
): { points: JobReadinessTrendPoint[]; change: JobReadinessChangeSummary | null } => {
  const ordered = [...snapshots]
    .filter((item) => item && (item.id != null || item.generatedAt || item.createdAt))
    .sort((left, right) => {
      const leftTime = new Date(left.generatedAt || left.createdAt || 0).getTime()
      const rightTime = new Date(right.generatedAt || right.createdAt || 0).getTime()
      if (leftTime !== rightTime) return leftTime - rightTime
      return toNumber(left.id) - toNumber(right.id)
    })
    .slice(-8)

  const points = ordered.map((item) => ({
    id: item.id,
    generatedAt: item.generatedAt || item.createdAt,
    score: item.sampleInsufficient ? undefined : item.overallScore,
    sampleInsufficient: Boolean(item.sampleInsufficient),
    strongCount: toNumber(item.strongCount),
    missingCount: toNumber(item.missingCount)
  }))
  if (ordered.length < 2) return { points, change: null }

  const previous = ordered[ordered.length - 2]
  const latest = ordered[ordered.length - 1]
  const strongDelta = toNumber(latest.strongCount) - toNumber(previous.strongCount)
  const missingDelta = toNumber(latest.missingCount) - toNumber(previous.missingCount)
  const scoreDelta = latest.sampleInsufficient
    || previous.sampleInsufficient
    || latest.overallScore == null
    || previous.overallScore == null
    ? undefined
    : latest.overallScore - previous.overallScore
  const reasons: string[] = []

  if (strongDelta > 0) reasons.push(`新增 ${strongDelta} 项强证据覆盖`)
  if (strongDelta < 0) reasons.push(`${Math.abs(strongDelta)} 项强覆盖不再成立`)
  if (missingDelta < 0) reasons.push(`减少 ${Math.abs(missingDelta)} 项缺失要求`)
  if (missingDelta > 0) reasons.push(`新增 ${missingDelta} 项缺失要求`)

  const previousDimensions = new Map(previous.dimensions.map((item) => [item.dimension, item]))
  const dimensionChanges = latest.dimensions
    .map((item) => {
      const before = previousDimensions.get(item.dimension)
      if (!before || item.score == null || before.score == null
          || item.sampleInsufficient || before.sampleInsufficient) {
        return null
      }
      return { dimension: item.dimension, delta: item.score - before.score }
    })
    .filter((item): item is { dimension: string; delta: number } => Boolean(item?.delta))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 2)
  dimensionChanges.forEach((item) => {
    reasons.push(`${readinessDimensionLabel(item.dimension)}${item.delta > 0 ? '提升' : '下降'} ${Math.abs(item.delta)} 分`)
  })

  if (previous.algorithmVersion && latest.algorithmVersion
      && previous.algorithmVersion !== latest.algorithmVersion) {
    reasons.push('就绪度计算版本已变化，分数不宜直接作强比较')
  }
  if (!reasons.length) reasons.push('证据结构未发生可解释的显著变化')

  return {
    points,
    change: {
      scoreDelta,
      strongDelta,
      missingDelta,
      reasons
    }
  }
}

export const requirementTypeLabel = (type?: string) => ({
  RESPONSIBILITY: '核心职责',
  REQUIRED_SKILL: '必备技能',
  BONUS_SKILL: '加分技能',
  EXPERIENCE: '经验要求',
  PROJECT_EXPERIENCE: '项目经验',
  INTERVIEW_FOCUS: '面试重点'
}[String(type || '').toUpperCase()] || '其它要求')

export const requirementStatusMeta = (status?: string) => ({
  COVERED: { label: '已覆盖', tone: 'success' },
  WEAK: { label: '弱覆盖', tone: 'warning' },
  MISSING: { label: '缺失', tone: 'danger' },
  CONFLICT: { label: '有冲突', tone: 'danger' },
  UNVERIFIED: { label: '待确认', tone: 'info' }
}[normalizeStatus(status)] || { label: '待确认', tone: 'info' })

export const readinessDimensionLabel = (dimension?: string) => ({
  RESUME: '简历准备',
  PROJECT_EVIDENCE: '项目证据',
  KNOWLEDGE: '知识掌握',
  INTERVIEW: '面试准备',
  APPLICATION: '投递准备'
}[String(dimension || '').toUpperCase()] || '其它维度')
