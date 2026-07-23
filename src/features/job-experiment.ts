import type {
  ExperimentNextActionVO,
  ExperimentSampleBoundaryVO,
  ExperimentUnsupportedConclusionVO,
  ExperimentWeakObservationVO,
  JobExperimentApplicationFeedbackSummaryVO,
  JobExperimentReviewDslVO,
  JobExperimentRelationType,
  JobSearchExperimentDetailVO,
  JobSearchExperimentMetricsVO,
  JobSearchExperimentRelationVO,
  JobSearchExperimentReviewVO,
  JobSearchExperimentStrategyVO
} from '@/types/jobExperiment'
import type { EvidenceSourceVO, SuggestionQualityGateVO } from '@/types/suggestion'

export const jobExperimentSupportedRelationTypes: JobExperimentRelationType[] = [
  'RESUME_VERSION',
  'TARGET_JOB',
  'JD_ANALYSIS',
  'MATCH_REPORT',
  'JOB_APPLICATION',
  'PROJECT_EVIDENCE'
]

export const jobExperimentRelationOptions: Array<{ label: string; value: JobExperimentRelationType }> = [
  { label: '简历版本', value: 'RESUME_VERSION' },
  { label: '岗位目标', value: 'TARGET_JOB' },
  { label: '岗位描述分析', value: 'JD_ANALYSIS' },
  { label: '匹配报告', value: 'MATCH_REPORT' },
  { label: '投递记录', value: 'JOB_APPLICATION' },
  { label: '项目证据', value: 'PROJECT_EVIDENCE' }
]

export const jobExperimentEvidenceGroups: Array<{
  key: JobExperimentRelationType
  label: string
  description: string
  required: boolean
  emptyHint: string
}> = [
  {
    key: 'RESUME_VERSION',
    label: '简历版本',
    description: '用于判断本轮实验采用了哪些版本，低样本时不比较版本优劣。',
    required: true,
    emptyHint: '未绑定简历版本，无法复盘简历策略。'
  },
  {
    key: 'TARGET_JOB',
    label: '目标岗位',
    description: '用于确定岗位方向和样本归类。',
    required: true,
    emptyHint: '未绑定目标岗位，方向样本边界不清。'
  },
  {
    key: 'JD_ANALYSIS',
    label: 'JD',
    description: '用于观察关键词、职责和能力缺口。',
    required: false,
    emptyHint: '缺少 JD 证据，只能从人工摘要和投递事实观察。'
  },
  {
    key: 'MATCH_REPORT',
    label: '匹配报告',
    description: '用于承接简历与岗位匹配缺口。',
    required: false,
    emptyHint: '缺少匹配报告，不能解释能力缺口来源。'
  },
  {
    key: 'JOB_APPLICATION',
    label: '投递记录',
    description: '用于计算投递、反馈、面试和结果样本。',
    required: true,
    emptyHint: '未绑定投递记录，不能形成实验样本。'
  },
  {
    key: 'PROJECT_EVIDENCE',
    label: '项目证据',
    description: '用于检查证明材料覆盖情况。',
    required: false,
    emptyHint: '缺少项目证据，只能提示补材料，不能判断项目贡献。'
  }
]

const relationLabelMap = jobExperimentRelationOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label
  return map
}, {})

export const isSupportedJobExperimentRelationType = (type?: string): type is JobExperimentRelationType =>
  jobExperimentSupportedRelationTypes.includes(type as JobExperimentRelationType)

export const jobExperimentRelationLabel = (type?: string) => relationLabelMap[type || ''] || '未支持证据'

export const confidenceLabel = (confidence?: string) => {
  const normalized = String(confidence || '').trim().toUpperCase()
  if (normalized === 'HIGH') return '高置信度'
  if (normalized === 'MEDIUM') return '中置信度'
  if (normalized === 'LOW') return '低置信度'
  return '置信度待确认'
}

export const statusLabel = (status?: string) => {
  if (status === 'RUNNING') return '进行中'
  if (status === 'REVIEWED') return '已复盘'
  if (status === 'ARCHIVED') return '已归档'
  return '草稿'
}

export const shouldKeepConclusionWeak = (
  metrics?: Partial<Pick<JobSearchExperimentMetricsVO, 'sampleInsufficient' | 'confidenceLevel' | 'sampleWarning' | 'applicationCount' | 'interviewCompletedCount'>>
) => {
  if (!metrics) return true
  if (metrics.sampleInsufficient) return true
  if (metrics.confidenceLevel === 'LOW' || metrics.confidenceLevel === 'MEDIUM') return true
  return (metrics.applicationCount ?? 0) < 15 || (metrics.interviewCompletedCount ?? 0) < 3
}

export interface JobExperimentEvidenceCoverageItem {
  type: JobExperimentRelationType
  label: string
  description: string
  required: boolean
  emptyHint: string
  count: number
  covered: boolean
  summaries: string[]
  relations: JobSearchExperimentRelationVO[]
}

export interface JobExperimentEvidenceCoverage {
  total: number
  covered: number
  missingTypes: JobExperimentRelationType[]
  items: JobExperimentEvidenceCoverageItem[]
}

export const buildJobExperimentEvidenceCoverage = (
  relations: JobSearchExperimentRelationVO[] = []
): JobExperimentEvidenceCoverage => {
  const supportedRelations = relations.filter((relation) => isSupportedJobExperimentRelationType(relation.relationType))

  const items = jobExperimentEvidenceGroups.map((group) => {
    const type = group.key
    const matched = supportedRelations.filter((relation) => relation.relationType === type)
    return {
      type,
      label: group.label,
      description: group.description,
      required: group.required,
      emptyHint: group.emptyHint,
      count: matched.length,
      covered: matched.length > 0,
      summaries: matched
        .map((relation) => relation.relationSummary?.trim())
        .filter((summary): summary is string => Boolean(summary)),
      relations: matched
    }
  })

  return {
    total: items.length,
    covered: items.filter((item) => item.covered).length,
    missingTypes: items.filter((item) => !item.covered).map((item) => item.type),
    items
  }
}

const uniqueTexts = (values: Array<string | undefined | null>): string[] =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))

const stringItems = (values?: unknown): string[] => {
  if (!Array.isArray(values)) return []
  return uniqueTexts(values.map((value) => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>
      return String(item.text || item.blockedReason || item.title || item.reason || '')
    }
    return ''
  }))
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const textValue = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

const numberValue = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

const increment = (counts: Record<string, number>, key?: string | number) => {
  const normalized = String(key || '').trim()
  if (!normalized) return
  counts[normalized] = (counts[normalized] || 0) + 1
}

const normalizeStatus = (value?: string) => value?.trim().toUpperCase() || ''

const feedbackEventTypes = new Set([
  'FOLLOW_UP',
  'FOLLOW_UP_DONE',
  'INTERVIEW',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER',
  'OFFER_RECEIVED',
  'REJECTED',
  'REJECTION',
  'CLOSED',
  'NOTE'
])

const isRejectedSignal = (status: string, eventType: string, metadata: Record<string, unknown>) =>
  status === 'REJECTED' || eventType === 'REJECTED' || eventType === 'REJECTION' || metadata.rejected === true

const isNoFeedbackSignal = (status: string, eventType: string, metadata: Record<string, unknown>) => {
  const feedbackStatus = normalizeStatus(textValue(metadata.feedbackStatus, metadata.feedback_state, metadata.feedbackState))
  if (metadata.noFeedback === true || metadata.no_feedback === true || feedbackStatus === 'NO_FEEDBACK') return true
  return status === 'APPLIED' && !eventType
}

const getRelationMetadata = (relation: JobSearchExperimentRelationVO) => asRecord(relation.metadata)

export const buildJobExperimentApplicationFeedbackSummary = (
  relations: JobSearchExperimentRelationVO[] = [],
  metrics?: JobSearchExperimentMetricsVO
): JobExperimentApplicationFeedbackSummaryVO => {
  const applicationRelations = relations.filter((relation) => relation.relationType === 'JOB_APPLICATION')
  const resumeVersionUsageCounts: Record<string, number> = {}
  const directionSampleCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}
  const facts: string[] = []
  const interviewReportSummaries: string[] = []

  let feedbackCount = 0
  let rejectedCount = 0
  let noFeedbackCount = 0
  let interviewRoundCount = 0
  let interviewCompletedCount = 0

  applicationRelations.forEach((relation) => {
    const metadata = getRelationMetadata(relation)
    const status = normalizeStatus(textValue(metadata.status, metadata.applicationStatus, metadata.currentStatus, metadata.stage))
    const eventType = normalizeStatus(textValue(metadata.latestEventType, metadata.eventType, metadata.feedbackType))
    const resumeVersionId = textValue(metadata.resumeVersionId, metadata.resume_version_id, metadata.versionId)
    const direction = textValue(metadata.targetDirection, metadata.direction, metadata.jobDirection, metadata.targetJobId, metadata.target_job_id)
    const reportSummary = textValue(metadata.interviewReportSummary, metadata.reportSummary, metadata.interviewSummary)
    const relationSummary = relation.relationSummary?.trim()

    increment(statusCounts, status || (eventType ? 'EVENT_RECORDED' : 'UNKNOWN'))
    increment(resumeVersionUsageCounts, resumeVersionId)
    increment(directionSampleCounts, direction)

    if (eventType && feedbackEventTypes.has(eventType)) feedbackCount += 1
    if (isRejectedSignal(status, eventType, metadata)) rejectedCount += 1
    if (isNoFeedbackSignal(status, eventType, metadata)) noFeedbackCount += 1

    const relationInterviewRounds = numberValue(
      metadata.interviewRoundCount,
      metadata.interviewRounds,
      metadata.interviewRound,
      metadata.round,
      metadata.interviewCount
    )
    if (relationInterviewRounds) {
      interviewRoundCount += relationInterviewRounds
    } else if (status === 'INTERVIEWING' || eventType.startsWith('INTERVIEW')) {
      interviewRoundCount += 1
    }

    if (metadata.interviewCompleted === true || eventType === 'INTERVIEW_COMPLETED' || reportSummary) {
      interviewCompletedCount += 1
    }

    if (reportSummary) interviewReportSummaries.push(reportSummary)
    if (relationSummary) facts.push(relationSummary)
  })

  relations
    .filter((relation) => relation.relationType === 'RESUME_VERSION')
    .forEach((relation) => increment(resumeVersionUsageCounts, relation.relationId))
  relations
    .filter((relation) => relation.relationType === 'TARGET_JOB')
    .forEach((relation) => increment(directionSampleCounts, relation.relationSummary || relation.relationId))

  const applicationCount = applicationRelations.length || metrics?.applicationCount || 0
  const derivedFeedbackCount = feedbackCount || metrics?.feedbackCount || 0
  const derivedRejectedCount = rejectedCount || metrics?.rejectedCount || 0
  const derivedNoFeedbackCount = noFeedbackCount || metrics?.noFeedbackCount || Math.max(0, applicationCount - derivedFeedbackCount)
  const derivedInterviewCompletedCount = interviewCompletedCount || metrics?.interviewCompletedCount || 0

  return {
    applicationCount,
    feedbackCount: derivedFeedbackCount,
    rejectedCount: derivedRejectedCount,
    noFeedbackCount: derivedNoFeedbackCount,
    interviewRoundCount: interviewRoundCount || metrics?.interviewRoundCount || derivedInterviewCompletedCount,
    interviewCompletedCount: derivedInterviewCompletedCount,
    interviewReportSummaryCount: interviewReportSummaries.length || metrics?.interviewReportSummaryCount || 0,
    statusCounts,
    resumeVersionUsageCounts: Object.keys(resumeVersionUsageCounts).length
      ? resumeVersionUsageCounts
      : metrics?.resumeVersionUsageCounts || {},
    directionSampleCounts,
    facts: uniqueTexts(facts),
    interviewReportSummaries: uniqueTexts(interviewReportSummaries),
    degraded: !applicationRelations.length,
    degradedReason: applicationRelations.length ? undefined : '未绑定投递记录，已降级使用 metrics 汇总。'
  }
}

const getLowSampleWarning = (
  boundary: ExperimentSampleBoundaryVO,
  feedbackSummary?: JobExperimentApplicationFeedbackSummaryVO
) => {
  const applicationCount = boundary.applicationCount ?? 0
  const interviewCompletedCount = boundary.interviewCompletedCount ?? 0
  const resumeVersionCounts = Object.values(feedbackSummary?.resumeVersionUsageCounts || boundary.resumeVersionUsageCounts || {})
  const directionCounts = Object.values(feedbackSummary?.directionSampleCounts || boundary.directionSampleCounts || {})
  const hasSparseResumeVersion = resumeVersionCounts.some((count) => count > 0 && count < 3)
  const hasSparseDirection = directionCounts.some((count) => count > 0 && count < 5)

  if (applicationCount < 5) return '投递样本少于 5 条，复盘只展示事实，不输出策略优劣、趋势或版本比较。'
  if (applicationCount < 10) return '投递样本 5-9 条，只输出低置信弱观察，并引导继续补充投递、拒信、无反馈和面试记录。'
  if (applicationCount < 15) return '投递样本 10-14 条，仍按弱观察处理；继续观察到 15 条以上再讨论稳定趋势。'
  if (interviewCompletedCount < 3) return '完成面试少于 3 次，不比较面试能力优劣或趋势。'
  if (hasSparseResumeVersion) return '存在简历版本样本少于 3 条，不比较该版本优劣。'
  if (hasSparseDirection) return '存在岗位方向样本少于 5 条，不比较该方向优劣或趋势。'
  return boundary.sampleWarning || ''
}

export const buildExperimentSampleBoundary = (
  metrics?: JobSearchExperimentMetricsVO,
  strategy?: JobSearchExperimentStrategyVO,
  dsl?: JobExperimentReviewDslVO,
  feedbackSummary?: JobExperimentApplicationFeedbackSummaryVO
): ExperimentSampleBoundaryVO => {
  const explicitBoundary = dsl?.limits || dsl?.sampleBoundary || metrics?.sampleBoundary
  const applicationCount = explicitBoundary?.applicationCount ?? feedbackSummary?.applicationCount ?? metrics?.applicationCount ?? 0
  const feedbackCount = explicitBoundary?.feedbackCount ?? feedbackSummary?.feedbackCount ?? metrics?.feedbackCount ?? 0
  const interviewCompletedCount =
    explicitBoundary?.interviewCompletedCount ?? feedbackSummary?.interviewCompletedCount ?? metrics?.interviewCompletedCount ?? 0
  const sampleInsufficient = applicationCount < 5
  const sampleWarning =
    getLowSampleWarning({ ...explicitBoundary, applicationCount, interviewCompletedCount }, feedbackSummary) ||
    explicitBoundary?.sampleWarning ||
    metrics?.sampleWarning ||
    strategy?.sampleWarning ||
    (sampleInsufficient ? '当前样本不足，复盘只能展示事实、弱观察和补样本行动。' : '')
  const sampleLevel = explicitBoundary?.sampleLevel || (applicationCount < 5 ? (applicationCount ? 'LOW' : 'NONE') : applicationCount < 15 ? 'LOW' : 'MEDIUM')

  return {
    ...explicitBoundary,
    sampleLevel,
    applicationCount,
    feedbackCount,
    interviewCompletedCount,
    rejectedCount: explicitBoundary?.rejectedCount ?? feedbackSummary?.rejectedCount ?? metrics?.rejectedCount ?? 0,
    noFeedbackCount: explicitBoundary?.noFeedbackCount ?? feedbackSummary?.noFeedbackCount ?? metrics?.noFeedbackCount ?? 0,
    interviewRoundCount: explicitBoundary?.interviewRoundCount ?? feedbackSummary?.interviewRoundCount ?? metrics?.interviewRoundCount ?? 0,
    interviewReportSummaryCount:
      explicitBoundary?.interviewReportSummaryCount ?? feedbackSummary?.interviewReportSummaryCount ?? metrics?.interviewReportSummaryCount ?? 0,
    resumeVersionUsageCounts: explicitBoundary?.resumeVersionUsageCounts || feedbackSummary?.resumeVersionUsageCounts || metrics?.resumeVersionUsageCounts || {},
    directionSampleCounts: explicitBoundary?.directionSampleCounts || feedbackSummary?.directionSampleCounts || {},
    sampleInsufficient,
    sampleWarning,
    blockedConclusionTypes: explicitBoundary?.blockedConclusionTypes || []
  }
}

export const buildExperimentQualityGate = (
  boundary: ExperimentSampleBoundaryVO,
  provided?: SuggestionQualityGateVO | null,
  unsupportedConclusions: string[] = []
): SuggestionQualityGateVO => {
  const applicationCount = boundary.applicationCount ?? 0
  const interviewCompletedCount = boundary.interviewCompletedCount ?? 0

  if (applicationCount < 5) {
    return {
      gateStatus: 'BLOCKED',
      suggestionStrength: 'WEAK',
      reasons: uniqueTexts(['投递样本少于 5 条，只能展示事实和补样本行动', boundary.sampleWarning]),
      blockedConclusions: unsupportedConclusions,
      sampleSize: applicationCount,
      minSampleSize: 5
    }
  }

  if (applicationCount < 15 || interviewCompletedCount < 3) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'WEAK',
      reasons: uniqueTexts([
        applicationCount < 10 ? '投递样本 5-9 条，只允许低置信弱观察' : '',
        applicationCount >= 10 && applicationCount < 15 ? '投递样本未达到 15 条，继续观察后再讨论稳定趋势' : '',
        interviewCompletedCount < 3 ? '完成面试少于 3 次，不判断面试能力趋势' : '',
        boundary.sampleWarning
      ]),
      blockedConclusions: unsupportedConclusions,
      sampleSize: applicationCount,
      minSampleSize: 15
    }
  }

  if (provided && provided.suggestionStrength !== 'STRONG') {
    return {
      ...provided,
      blockedConclusions: provided.blockedConclusions || unsupportedConclusions
    }
  }

  return provided || {
    gateStatus: 'PASS',
    suggestionStrength: 'NORMAL',
    reasons: ['样本达到候选复盘门槛，但仍不能做单因素因果归因'],
    blockedConclusions: unsupportedConclusions
  }
}

export interface JobExperimentReviewDisplayModel {
  dsl?: JobExperimentReviewDslVO
  facts: string[]
  applicationFeedbackSummary: JobExperimentApplicationFeedbackSummaryVO
  reviewMode: 'FACTS_ONLY' | 'WEAK_OBSERVATION' | 'CANDIDATE'
  lowSampleRules: string[]
  sampleBoundary: ExperimentSampleBoundaryVO
  unsupportedConclusions: ExperimentUnsupportedConclusionVO[]
  weakObservations: ExperimentWeakObservationVO[]
  hypotheses: Array<{ targetDirection?: string; assumption: string; expectedSignal?: string }>
  nextActions: ExperimentNextActionVO[]
  evidenceSources: EvidenceSourceVO[]
  qualityGate: SuggestionQualityGateVO
}

export const buildJobExperimentReviewDisplayModel = (
  detail?: JobSearchExperimentDetailVO,
  latest?: JobSearchExperimentReviewVO,
  strategy: JobSearchExperimentStrategyVO = {}
): JobExperimentReviewDisplayModel => {
  const dsl = detail?.reviewDsl || latest?.reviewDsl || strategy.reviewDsl
  const hasCurrentStrategy = Boolean(detail?.strategy)
  const applicationFeedbackSummary = buildJobExperimentApplicationFeedbackSummary(detail?.relations || [], detail?.metrics)
  const sampleBoundary = buildExperimentSampleBoundary(detail?.metrics, strategy, dsl, applicationFeedbackSummary)
  const factsOnly = (sampleBoundary.applicationCount ?? 0) < 5
  const weakOnly = !factsOnly && ((sampleBoundary.applicationCount ?? 0) < 15 || (sampleBoundary.interviewCompletedCount ?? 0) < 3)
  const reviewMode = factsOnly ? 'FACTS_ONLY' : weakOnly ? 'WEAK_OBSERVATION' : 'CANDIDATE'
  const lowSampleRules = uniqueTexts([
    sampleBoundary.sampleWarning,
    applicationFeedbackSummary.degraded ? applicationFeedbackSummary.degradedReason : undefined,
    ...(Object.entries(sampleBoundary.resumeVersionUsageCounts || {})
      .filter(([, count]) => count > 0 && count < 3)
      .map(([version, count]) => `简历版本 ${version} 只有 ${count} 条样本，不比较版本优劣。`)),
    ...(Object.entries(sampleBoundary.directionSampleCounts || {})
      .filter(([, count]) => count > 0 && count < 5)
      .map(([direction, count]) => `岗位方向 ${direction} 只有 ${count} 条样本，不比较方向优劣或趋势。`)),
    (sampleBoundary.interviewCompletedCount ?? 0) < 3 ? '面试完成少于 3 次，不比较面试表现优劣或趋势。' : undefined
  ])
  const facts = uniqueTexts([
    ...(dsl?.facts || []),
    ...(detail?.metrics?.facts || []),
    ...applicationFeedbackSummary.facts,
    `投递 ${applicationFeedbackSummary.applicationCount} 条，反馈 ${applicationFeedbackSummary.feedbackCount} 条，拒信 ${applicationFeedbackSummary.rejectedCount} 条，无反馈 ${applicationFeedbackSummary.noFeedbackCount} 条。`,
    applicationFeedbackSummary.interviewRoundCount
      ? `记录面试轮次 ${applicationFeedbackSummary.interviewRoundCount} 次，完成面试 ${applicationFeedbackSummary.interviewCompletedCount} 次。`
      : undefined,
    ...applicationFeedbackSummary.interviewReportSummaries.map((summary) => `面试报告摘要：${summary}`),
    hasCurrentStrategy ? undefined : latest?.factSummary
  ])
  const legacyUnsupported = uniqueTexts([
    ...(detail?.metrics?.unsupportedConclusions || []),
    ...(strategy.unsupportedConclusions || []),
    hasCurrentStrategy ? undefined : latest?.unsupportedConclusion
  ])
  const unsupportedConclusions = (dsl?.unsupportedConclusions?.length
    ? dsl.unsupportedConclusions
    : legacyUnsupported.map((text) => ({
        conclusionType: 'SAMPLE_LIMIT',
        blockedReason: text,
        requiredSampleHint: '补足投递、反馈、面试或简历版本样本后再复盘。'
      }))).filter((item) => item.blockedReason)

  if (!unsupportedConclusions.length) {
    unsupportedConclusions.push({
      conclusionType: 'NO_SINGLE_FACTOR_ATTRIBUTION',
      blockedReason: '当前复盘不支持把单次成功或失败归因到某个简历版本、岗位方向或项目证据。',
      requiredSampleHint: '需要更多同方向投递、反馈和面试样本。'
    })
  }
  lowSampleRules.forEach((rule) => {
    if (unsupportedConclusions.some((item) => item.blockedReason === rule)) return
    unsupportedConclusions.push({
      conclusionType: factsOnly ? 'FACTS_ONLY' : 'LOW_SAMPLE_RULE',
      blockedReason: rule,
      requiredSampleHint: factsOnly ? '先累计至少 5 条投递记录。' : '继续补充投递、拒信、无反馈、面试轮次和报告摘要。'
    })
  })

  const weakObservations = factsOnly
    ? []
    : dsl?.weakObservations?.length
    ? dsl.weakObservations
    : stringItems(detail?.metrics?.weakObservations || strategy.weakObservations).map((text) => ({
        observationType: 'FUNNEL',
        text,
        evidenceCount: sampleBoundary.applicationCount,
        confidenceLevel: 'LOW',
        actionHint: sampleBoundary.sampleWarning || '先补样本，再复盘趋势。'
      }))
  if (!factsOnly && !weakObservations.length) {
    weakObservations.push({
      observationType: 'FUNNEL',
      text: `当前记录到 ${applicationFeedbackSummary.applicationCount} 条投递、${applicationFeedbackSummary.feedbackCount} 条反馈、${applicationFeedbackSummary.rejectedCount} 条拒信、${applicationFeedbackSummary.noFeedbackCount} 条无反馈，只能作为漏斗弱观察。`,
      evidenceCount: applicationFeedbackSummary.applicationCount,
      confidenceLevel: 'LOW',
      actionHint: sampleBoundary.sampleWarning || '继续观察到更多样本后再比较策略。'
    })
  }

  const hypotheses = dsl?.hypotheses?.length
    ? dsl.hypotheses.map((item) => ({
        targetDirection: item.targetDirection,
        assumption: item.assumption || detail?.goal || '围绕当前目标方向继续收集证据。',
        expectedSignal: item.expectedSignal
      }))
    : [{
        targetDirection: detail?.targetDirection,
        assumption: detail?.goal || strategy.title || '先把本轮实验作为可验证假设，而不是结论。',
        expectedSignal: '新增投递反馈、面试邀约、项目证据覆盖或匹配报告变化。'
      }]

  const dslActions = dsl?.nextActions?.length ? dsl.nextActions : dsl?.actionCandidates
  const strategyActions = strategy.nextActions?.length ? strategy.nextActions : strategy.actionCandidates
  const nextActions = dslActions?.length
    ? dslActions
    : strategyActions?.length
      ? strategyActions
    : [
        !hasCurrentStrategy && latest?.nextAction
          ? { actionType: 'UPDATE_HYPOTHESIS', title: latest.nextAction, reason: sampleBoundary.sampleWarning, targetRoute: `/job-experiments/${detail?.id || ''}` }
          : undefined,
        strategy.actionUrl
          ? { actionType: 'UPDATE_HYPOTHESIS', title: strategy.title || '打开下一步任务', reason: strategy.content, targetRoute: strategy.actionUrl }
          : undefined
      ].filter(Boolean) as ExperimentNextActionVO[]

  if (!nextActions.length || factsOnly) {
    nextActions.splice(0, nextActions.length)
    nextActions.push({
      actionType: 'ADD_APPLICATION_SAMPLE',
      title: factsOnly ? '继续记录投递反馈' : sampleBoundary.sampleInsufficient ? '补充投递样本和反馈事件' : '更新下一轮实验假设',
      reason: sampleBoundary.sampleWarning || '把复盘落到下一轮可执行动作。',
      targetRoute: '/applications'
    })
  }

  const evidenceSources = dsl?.evidenceSources?.length
    ? dsl.evidenceSources
    : (strategy.evidenceSources || []).map((source) => ({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        evidenceSummary: source.sourceSummary,
        sourceSummary: source.sourceSummary,
        trustStatus: source.trustStatus,
        metadata: source.metadata
      }))

  const qualityGate = buildExperimentQualityGate(
    sampleBoundary,
    dsl?.qualityGate || latest?.qualityGate || strategy.qualityGate,
    unsupportedConclusions.map((item) => item.blockedReason)
  )

  return {
    dsl,
    facts,
    applicationFeedbackSummary,
    reviewMode,
    lowSampleRules,
    sampleBoundary,
    unsupportedConclusions,
    weakObservations,
    hypotheses,
    nextActions,
    evidenceSources,
    qualityGate
  }
}
