import type {
  InterviewComparisonReasonVO,
  InterviewComparisonRoundVO,
  InterviewComparisonSelectionValidation,
  InterviewComparisonVO,
  InterviewDimensionComparisonVO,
  InterviewHistoryComparisonCandidate,
  InterviewRemediationOptionVO,
  InterviewRemediationOptionsVO,
  InterviewRemediationVO,
  InterviewReportAdvancedMeta,
  InterviewRequirementImprovementVO
} from '@/types/interviewAdvanced'

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const arrayValue = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const numberValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

const stringValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}

const booleanValue = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  if (value === 1) return true
  if (value === 0) return false
  return undefined
}

const comparisonReasonMessages: Record<string, string> = {
  REPORT_COUNT_INSUFFICIENT: '至少需要两份已生成的面试报告才能比较。',
  DUPLICATE_REPORT_ID: '所选报告中存在重复项，请重新选择。',
  REPORT_NOT_FOUND: '部分面试报告不存在。',
  REPORT_UNAVAILABLE: '部分面试报告不存在或当前不可用。',
  SESSION_NOT_FOUND: '部分报告缺少对应的面试场次。',
  REPORT_USER_MISMATCH: '部分报告不属于当前账号。',
  REPORT_SESSION_USER_MISMATCH: '报告与面试场次的归属不一致。',
  REPORT_NOT_GENERATED: '只有已成功生成的报告才能参与比较。',
  TARGET_JOB_MISSING: '部分报告没有关联目标岗位。',
  TARGET_JOB_MISMATCH: '所选报告并非来自同一目标岗位。',
  RUBRIC_VERSION_MISSING: '部分报告缺少评分量表版本。',
  RUBRIC_VERSION_MISMATCH: '所选报告使用了不同的评分量表版本。',
  RUBRIC_DIMENSION_MISMATCH: '所选报告的评分维度不一致。',
  RUBRIC_DATA_MISSING: '部分报告缺少可比较的评分维度。',
  RUBRIC_DATA_MALFORMED: '部分报告的评分数据格式不完整。',
  RUBRIC_DIMENSION_LIMIT_EXCEEDED: '部分报告包含过多评分维度，暂不支持比较。',
  RUBRIC_DIMENSION_DUPLICATE: '部分报告包含重复的评分维度。',
  REPORT_UNTRUSTED: '报告评分为降级、数据不完整或可信度不足，暂不生成趋势结论。',
  LEGACY_REPORT_UNTRUSTED: '历史报告缺少足够的可信评分证据，暂不参与比较。',
  TOTAL_SCORE_MISSING: '部分报告缺少总分。',
  TOTAL_SCORE_INVALID: '部分报告的总分不在支持的 1 到 100 分范围内。',
  TOTAL_SCORE_RECOVERED_FROM_SESSION: '报告总分缺失，已使用同一面试场次中保存的总分。',
  RUBRIC_RECOVERED_FROM_STAGE_SCORES: '已从历史阶段评分中恢复准确的评分维度。',
  RUBRIC_RECOVERED_FROM_REPORT_CONTENT: '已从历史报告的结构化内容中恢复评分维度。',
  RUBRIC_VERSION_INFERRED: '历史报告未保存量表标识，已按原有评分维度生成兼容量表版本。',
  RUBRIC_VERSION_NORMALIZED: '已将已知的历史评分维度合同规范化为统一量表版本。',
  SAMPLE_INSUFFICIENT_REPORT: '部分报告样本不足，本次变化仅作为弱观察依据。'
}

const localizedComparisonReasonMessage = (code: string, message: string) => {
  const normalizedCode = code.trim().toUpperCase()
  if (comparisonReasonMessages[normalizedCode]) return comparisonReasonMessages[normalizedCode]
  if (/[\u3400-\u9fff]/.test(message)) return message
  return '该项数据未满足当前比较合同要求，页面不会据此生成趋势结论。'
}

const positiveIds = (value: unknown, max = Number.POSITIVE_INFINITY) =>
  Array.from(new Set(arrayValue(value)
    .map(numberValue)
    .filter((id): id is number => Boolean(id && id > 0))))
    .slice(0, max)

const normalizeReason = (value: unknown): InterviewComparisonReasonVO | null => {
  const source = objectValue(value)
  const code = stringValue(source.code) || 'UNKNOWN'
  const message = stringValue(source.message)
  if (!message) return null
  return { code, message: localizedComparisonReasonMessage(code, message) }
}

const normalizeReasons = (value: unknown) =>
  arrayValue(value)
    .map(normalizeReason)
    .filter((item): item is InterviewComparisonReasonVO => Boolean(item))

const normalizeRubricScores = (value: unknown) => {
  const source = objectValue(value)
  return Object.entries(source).reduce<Record<string, number>>((result, [key, score]) => {
    const normalizedScore = numberValue(score)
    if (key.trim() && normalizedScore !== undefined) result[key] = normalizedScore
    return result
  }, {})
}

const normalizeRound = (value: unknown): InterviewComparisonRoundVO => {
  const source = objectValue(value)
  return {
    reportId: numberValue(source.reportId),
    sessionId: numberValue(source.sessionId),
    totalScore: numberValue(source.totalScore),
    generatedAt: stringValue(source.generatedAt),
    trustStatus: stringValue(source.trustStatus),
    sampleInsufficient: booleanValue(source.sampleInsufficient) === true,
    rubricVersion: stringValue(source.rubricVersion),
    normalizationSource: stringValue(source.normalizationSource),
    unavailableReasons: normalizeReasons(source.unavailableReasons),
    warnings: normalizeReasons(source.warnings),
    rubricScores: normalizeRubricScores(source.rubricScores)
  }
}

const normalizeDimension = (value: unknown): InterviewDimensionComparisonVO | null => {
  const source = objectValue(value)
  const dimension = stringValue(source.dimension)
  if (!dimension) return null
  return {
    dimension,
    firstScore: numberValue(source.firstScore),
    latestScore: numberValue(source.latestScore),
    delta: numberValue(source.delta),
    points: arrayValue(source.points).map((point) => {
      const item = objectValue(point)
      return {
        reportId: numberValue(item.reportId),
        score: numberValue(item.score),
        deltaFromPrevious: numberValue(item.deltaFromPrevious)
      }
    })
  }
}

const normalizeRequirementImprovement = (value: unknown): InterviewRequirementImprovementVO | null => {
  const source = objectValue(value)
  const requirementId = numberValue(source.requirementId)
  const requirementName = stringValue(source.requirementName || source.title)
  if (!requirementId && !requirementName) return null
  return {
    requirementId,
    requirementName,
    firstStatus: stringValue(source.firstStatus),
    latestStatus: stringValue(source.latestStatus),
    improvement: stringValue(source.improvement || source.change),
    evidence: stringValue(source.evidence || source.evidenceSummary)
  }
}

export const normalizeInterviewReportAdvanced = (
  value: unknown,
  interviewId?: number
): InterviewReportAdvancedMeta => {
  const root = objectValue(value)
  const nested = objectValue(root.report)
  const source = { ...nested, ...root }
  return {
    reportId: numberValue(source.reportId || source.id),
    interviewId: numberValue(source.interviewId || source.sessionId) || interviewId,
    targetJobId: numberValue(source.targetJobId),
    rubricVersion: stringValue(source.rubricVersion),
    trustStatus: stringValue(source.trustStatus),
    fallback: booleanValue(source.fallback) === true,
    remediationAvailable: booleanValue(source.remediationAvailable) === true,
    strongRemediationAvailable: booleanValue(source.strongRemediationAvailable) === true,
    strongRemediationUnavailableReason: stringValue(source.strongRemediationUnavailableReason),
    comparisonAvailable: booleanValue(source.comparisonAvailable),
    comparisonUnavailableReason: stringValue(source.comparisonUnavailableReason),
    sourceRequirementIds: positiveIds(source.sourceRequirementIds, 20),
    practicePurpose: stringValue(source.practicePurpose),
    remediationStrength: stringValue(source.remediationStrength),
    remediationCreated: booleanValue(source.remediationCreated) === true,
    remediationId: numberValue(source.remediationId),
    remediationTargetSessionId: numberValue(source.remediationTargetSessionId),
    remediationStatus: stringValue(source.remediationStatus)
  }
}

export const normalizeInterviewRemediation = (value: unknown): InterviewRemediationVO => {
  const source = objectValue(value)
  const interview = objectValue(source.interview)
  return {
    id: numberValue(source.id),
    sourceReportId: numberValue(source.sourceReportId),
    sourceSessionId: numberValue(source.sourceSessionId),
    targetSessionId: numberValue(source.targetSessionId || interview.id || interview.interviewId),
    targetJobId: numberValue(source.targetJobId),
    sourceRequirementIds: positiveIds(source.sourceRequirementIds, 20),
    practicePurpose: stringValue(source.practicePurpose),
    remediationStrength: stringValue(source.remediationStrength),
    rubricVersion: stringValue(source.rubricVersion),
    status: stringValue(source.status),
    idempotentReplay: booleanValue(source.idempotentReplay) === true,
    interview: Object.keys(interview).length
      ? {
          id: numberValue(interview.id),
          interviewId: numberValue(interview.interviewId),
          title: stringValue(interview.title || interview.interviewName),
          status: stringValue(interview.status),
          reportStatus: stringValue(interview.reportStatus)
        }
      : undefined
  }
}

export const normalizeInterviewRemediationOptions = (value: unknown): InterviewRemediationOptionsVO => {
  const source = objectValue(value)
  const options = arrayValue(source.options)
    .map((value): InterviewRemediationOptionVO | null => {
      const item = objectValue(value)
      const optionKey = stringValue(item.optionKey)
      const reasonType = stringValue(item.reasonType)
      const title = stringValue(item.title)
      const practicePurpose = stringValue(item.practicePurpose)
      if (!optionKey || !reasonType || !title || !practicePurpose) return null
      return {
        optionKey,
        reasonType,
        title,
        description: stringValue(item.description),
        evidence: stringValue(item.evidence),
        sourceRequirementIds: positiveIds(item.sourceRequirementIds, 20),
        practicePurpose,
        strongRemediation: booleanValue(item.strongRemediation) === true
      }
    })
    .filter((item): item is InterviewRemediationOptionVO => Boolean(item))
  return {
    interviewId: numberValue(source.interviewId),
    sourceReportId: numberValue(source.sourceReportId),
    targetJobId: numberValue(source.targetJobId),
    rubricVersion: stringValue(source.rubricVersion),
    trustStatus: stringValue(source.trustStatus),
    options
  }
}

export const normalizeInterviewComparison = (value: unknown): InterviewComparisonVO => {
  const source = objectValue(value)
  const unavailableReasons = normalizeReasons(source.unavailableReasons)
  const rounds = arrayValue(source.rounds).map(normalizeRound)
  const comparable = booleanValue(source.comparable) === true
    && rounds.length >= 2
    && unavailableReasons.length === 0
  const requirementSource = source.requirementImprovements || source.requirementChanges
  return {
    id: numberValue(source.id),
    contractVersion: stringValue(source.contractVersion),
    legacySnapshotNormalized: booleanValue(source.legacySnapshotNormalized) === true,
    comparable,
    targetJobId: numberValue(source.targetJobId),
    rubricVersion: stringValue(source.rubricVersion),
    reportIds: positiveIds(source.reportIds, 10),
    firstTotalScore: numberValue(source.firstTotalScore),
    latestTotalScore: numberValue(source.latestTotalScore),
    totalScoreDelta: numberValue(source.totalScoreDelta),
    unavailableReasons,
    warnings: normalizeReasons(source.warnings),
    rounds,
    dimensions: arrayValue(source.dimensions)
      .map(normalizeDimension)
      .filter((item): item is InterviewDimensionComparisonVO => Boolean(item)),
    requirementImprovements: arrayValue(requirementSource)
      .map(normalizeRequirementImprovement)
      .filter((item): item is InterviewRequirementImprovementVO => Boolean(item)),
    idempotentReplay: booleanValue(source.idempotentReplay) === true,
    createdAt: stringValue(source.createdAt)
  }
}

export const toInterviewComparisonCandidate = (value: unknown): InterviewHistoryComparisonCandidate => {
  const source = objectValue(value)
  return {
    interviewId: numberValue(source.interviewId || source.id) || 0,
    reportId: numberValue(source.reportId),
    targetJobId: numberValue(source.targetJobId),
    title: stringValue(source.interviewName || source.title || source.targetPosition) || '未命名模拟面试',
    targetPosition: stringValue(source.targetPosition),
    reportStatus: stringValue(source.reportStatus),
    generatedAt: stringValue(source.finishedAt || source.generatedAt || source.createdAt || source.updatedAt),
    comparisonAvailable: booleanValue(source.comparisonAvailable),
    comparisonUnavailableReason: stringValue(source.comparisonUnavailableReason)
  }
}

export const validateInterviewComparisonSelection = (
  candidates: InterviewHistoryComparisonCandidate[]
): InterviewComparisonSelectionValidation => {
  if (candidates.length < 2) return { valid: false, reason: '至少选择两轮已生成报告的面试。' }
  if (candidates.length > 10) return { valid: false, reason: '单次最多比较 10 轮面试。' }
  if (new Set(candidates.map((item) => item.interviewId)).size !== candidates.length) {
    return { valid: false, reason: '选择中存在重复面试记录。' }
  }
  if (candidates.some((item) => String(item.reportStatus || '').toUpperCase() !== 'GENERATED')) {
    return { valid: false, reason: '只能比较报告已成功生成的面试。' }
  }
  if (candidates.some((item) => !item.targetJobId)) {
    return { valid: false, reason: '所选面试缺少目标岗位，无法进行同岗位比较。' }
  }
  const targetJobIds = new Set(candidates.map((item) => item.targetJobId))
  if (targetJobIds.size !== 1) {
    return { valid: false, reason: '请选择同一目标岗位下的面试记录。' }
  }
  const unavailable = candidates.find((item) => item.comparisonAvailable === false)
  if (unavailable) {
    return {
      valid: false,
      reason: unavailable.comparisonUnavailableReason || '所选报告暂不支持跨场比较。'
    }
  }
  return { valid: true, reason: '', targetJobId: candidates[0]?.targetJobId }
}

export const extractRemediationRequirementIds = (value: unknown) => {
  const source = objectValue(value)
  const prioritized: Array<{ id: number; rank: number }> = []
  const add = (idValue: unknown, statusValue: unknown) => {
    const id = numberValue(idValue)
    const status = String(statusValue || '').toUpperCase()
    if (!id || !['MISSING', 'WEAK', 'CONFLICT'].includes(status)) return
    prioritized.push({ id, rank: status === 'MISSING' ? 0 : status === 'CONFLICT' ? 1 : 2 })
  }
  arrayValue(source.groups).forEach((group) => {
    arrayValue(objectValue(group).items).forEach((item) => {
      const requirement = objectValue(item)
      add(requirement.requirementId, requirement.status)
    })
  })
  arrayValue(source.requirements).forEach((item) => {
    const requirement = objectValue(item)
    add(requirement.requirementId, requirement.coverageLevel || requirement.status)
  })
  return Array.from(new Map(
    prioritized
      .sort((left, right) => left.rank - right.rank)
      .map((item) => [item.id, item])
  ).keys()).slice(0, 20)
}

export const storeInterviewComparison = (comparison: InterviewComparisonVO) => {
  return comparison.id ? String(comparison.id) : ''
}

export const loadStoredInterviewComparison = (_key: string | undefined) => null

export const comparisonReasonLabel = (code: string) => {
  const labels: Record<string, string> = {
    REPORT_COUNT_INSUFFICIENT: '报告数量不足',
    DUPLICATE_REPORT_ID: '存在重复报告',
    REPORT_NOT_FOUND: '报告不存在',
    SESSION_NOT_FOUND: '面试场次缺失',
    REPORT_USER_MISMATCH: '报告归属不一致',
    REPORT_SESSION_USER_MISMATCH: '报告与场次归属不一致',
    REPORT_NOT_GENERATED: '报告尚未生成',
    TARGET_JOB_MISSING: '目标岗位缺失',
    TARGET_JOB_MISMATCH: '目标岗位不一致',
    RUBRIC_VERSION_MISSING: '评分量表版本缺失',
    RUBRIC_VERSION_MISMATCH: '评分量表版本不一致',
    RUBRIC_DATA_MISSING: '评分维度数据缺失',
    SAMPLE_INSUFFICIENT_REPORT: '部分报告样本不足'
  }
  return labels[String(code || '').toUpperCase()] || '暂不可比较'
}

export const comparisonDimensionLabel = (dimension: string) => {
  const labels: Record<string, string> = {
    EXPRESSION_STRUCTURE: '表达结构',
    TECHNICAL_DEPTH: '技术深度',
    PROBLEM_SOLVING: '问题解决',
    PROJECT_EXPERIENCE: '项目经验',
    COMMUNICATION: '沟通表达',
    JOB_MATCH: '岗位匹配'
  }
  return labels[String(dimension || '').toUpperCase()] || dimension || '未命名维度'
}
