import type {
  ExperimentNextActionVO,
  ExperimentSampleBoundaryVO,
  ExperimentUnsupportedConclusionVO,
  ExperimentWeakObservationVO,
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
  if (confidence === 'HIGH') return '高置信度'
  if (confidence === 'MEDIUM') return '中置信度'
  return '低置信度'
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
  if (metrics.confidenceLevel === 'HIGH' && metrics.sampleInsufficient === false) return false
  return (metrics.applicationCount ?? 0) < 10 || (metrics.interviewCompletedCount ?? 0) < 3
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

export const buildExperimentSampleBoundary = (
  metrics?: JobSearchExperimentMetricsVO,
  strategy?: JobSearchExperimentStrategyVO,
  dsl?: JobExperimentReviewDslVO
): ExperimentSampleBoundaryVO => {
  const explicitBoundary = dsl?.limits || dsl?.sampleBoundary || metrics?.sampleBoundary
  const sampleInsufficient = explicitBoundary?.sampleInsufficient ?? metrics?.sampleInsufficient ?? strategy?.sampleInsufficient ?? true
  const applicationCount = explicitBoundary?.applicationCount ?? metrics?.applicationCount ?? 0
  const feedbackCount = explicitBoundary?.feedbackCount ?? metrics?.feedbackCount ?? 0
  const interviewCompletedCount = explicitBoundary?.interviewCompletedCount ?? metrics?.interviewCompletedCount ?? 0
  const sampleWarning =
    explicitBoundary?.sampleWarning ||
    metrics?.sampleWarning ||
    strategy?.sampleWarning ||
    (sampleInsufficient ? '当前样本不足，复盘只能展示事实、弱观察和补样本行动。' : '')
  const sampleLevel = explicitBoundary?.sampleLevel || (sampleInsufficient ? (applicationCount ? 'LOW' : 'NONE') : 'MEDIUM')

  return {
    ...explicitBoundary,
    sampleLevel,
    applicationCount,
    feedbackCount,
    interviewCompletedCount,
    resumeVersionUsageCounts: explicitBoundary?.resumeVersionUsageCounts || metrics?.resumeVersionUsageCounts || {},
    directionSampleCounts: explicitBoundary?.directionSampleCounts || {},
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

  if (boundary.sampleInsufficient || applicationCount < 5) {
    return {
      gateStatus: 'BLOCKED',
      suggestionStrength: 'WEAK',
      reasons: uniqueTexts(['投递样本少于 5 条，只能展示事实和补样本行动', boundary.sampleWarning]),
      blockedConclusions: unsupportedConclusions,
      sampleSize: applicationCount,
      minSampleSize: 5
    }
  }

  if (applicationCount < 10 || interviewCompletedCount < 3) {
    return {
      gateStatus: 'WARN',
      suggestionStrength: 'WEAK',
      reasons: uniqueTexts([
        applicationCount < 10 ? '投递样本未达到 10 条，只允许低置信弱观察' : '',
        interviewCompletedCount < 3 ? '完成面试少于 3 次，不判断面试能力趋势' : '',
        boundary.sampleWarning
      ]),
      blockedConclusions: unsupportedConclusions,
      sampleSize: applicationCount,
      minSampleSize: 10
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
  const facts = uniqueTexts([
    ...(dsl?.facts || []),
    ...(detail?.metrics?.facts || []),
    hasCurrentStrategy ? undefined : latest?.factSummary
  ])
  const sampleBoundary = buildExperimentSampleBoundary(detail?.metrics, strategy, dsl)
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

  const weakObservations = dsl?.weakObservations?.length
    ? dsl.weakObservations
    : stringItems(detail?.metrics?.weakObservations || strategy.weakObservations).map((text) => ({
        observationType: 'FUNNEL',
        text,
        evidenceCount: sampleBoundary.applicationCount,
        confidenceLevel: 'LOW',
        actionHint: sampleBoundary.sampleWarning || '先补样本，再复盘趋势。'
      }))

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

  if (!nextActions.length) {
    nextActions.push({
      actionType: sampleBoundary.sampleInsufficient ? 'ADD_APPLICATION_SAMPLE' : 'UPDATE_HYPOTHESIS',
      title: sampleBoundary.sampleInsufficient ? '补充投递样本和反馈事件' : '更新下一轮实验假设',
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
    sampleBoundary,
    unsupportedConclusions,
    weakObservations,
    hypotheses,
    nextActions,
    evidenceSources,
    qualityGate
  }
}
