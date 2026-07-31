import type {
  AgentWeeklyReport,
  AgentWeeklyReportConfidenceLevel,
  WeeklyExperimentSuggestion,
  WeeklyPlanDraft,
  WeeklyPlanDraftItem,
  WeeklyPlanPreviewPayload,
  WeeklyReportCoverage,
  WeeklyReportCoverageGroup,
  WeeklyReportDisplayPolicy,
  WeeklyReportFact,
  WeeklyReportHypothesis,
  WeeklyReportRange,
  WeeklyReportSignal,
  WeeklyReportSnapshotVersion,
  WeeklyReportSourceStatus,
  WeeklySourceCoverageItem
} from '@/types/agentWeeklyReport'

type UnknownRecord = Record<string, unknown>

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}

const textValue = (value: unknown) => {
  const text = value == null ? '' : String(value).trim()
  return text || undefined
}

const numberValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const booleanValue = (value: unknown, fallback = false) =>
  value === true || value === 1 || String(value).toLowerCase() === 'true'
    ? true
    : value === false || value === 0 || String(value).toLowerCase() === 'false'
      ? false
      : fallback

const stringList = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => textValue(item))
    .filter((item): item is string => Boolean(item))

const objectMap = (value: unknown) => ({ ...asRecord(value) })

const numberMap = (value: unknown) =>
  Object.entries(asRecord(value)).reduce<Record<string, number>>((result, [key, item]) => {
    const parsed = numberValue(item)
    if (parsed !== undefined) result[key] = parsed
    return result
  }, {})

const normalizeConfidenceLevel = (value: unknown): AgentWeeklyReportConfidenceLevel => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized
  }
  return 'FACT_ONLY'
}

const implementationCopyPattern =
  /(?:\b(?:GET|POST|PUT|PATCH|DELETE|API|DTO|VO)\b|接口|契约|数据库|阶段[一二三四五六七八九十\d]+)/i
const technicalReferencePattern =
  /(?:\bweekly:[A-Za-z0-9:_-]+\b|\b(?:TARGET_JOB|JOB_APPLICATION|INTERVIEW_REPORT|RESUME_VERSION|SNAPSHOT|HYPOTHESIS|SIGNAL):[A-Za-z0-9_-]+\b)/i
const internalCodePattern = /^[A-Z][A-Z0-9]*(?:[_:-][A-Z0-9]+)+$/
const embeddedInternalCodePattern = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/
const standaloneCodePattern = /^[A-Z][A-Z0-9]{2,}$/
const safeAcronyms = new Set(['AI', 'JD', 'UTC'])

const normalizePresentationKey = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

const looksLikeInternalCode = (value: string) =>
  internalCodePattern.test(value)
  || (standaloneCodePattern.test(value) && !safeAcronyms.has(value))

export const getWeeklyReportUserText = (
  value: unknown,
  fallback: string
) => {
  const text = String(value ?? '').trim()
  if (
    !text
    || implementationCopyPattern.test(text)
    || technicalReferencePattern.test(text)
    || embeddedInternalCodePattern.test(text)
    || looksLikeInternalCode(text)
  ) {
    return fallback
  }
  return text
}

const presentationLabel = (
  value: unknown,
  labels: Record<string, string>,
  fallback: string
) => {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  const normalized = normalizePresentationKey(text)
  const baseKey = normalized.split(':')[0]
  return labels[normalized]
    || labels[baseKey]
    || getWeeklyReportUserText(text, fallback)
}

const variableLabels: Record<string, string> = {
  CHANNEL: '投递渠道',
  TARGET_JOB: '目标岗位',
  RESUME_VERSION: '简历版本',
  INTERVIEW_COMPETENCY: '面试能力',
  INTERVIEW_TOPIC: '面试主题',
  TRAINING_TOPIC: '训练主题',
  PROJECT_EVIDENCE: '项目证据',
  APPLICATION_TIMING: '投递时机',
  FOLLOW_UP_TIMING: '跟进时机',
  MESSAGE_TEMPLATE: '沟通内容',
  PORTFOLIO_VERSION: '作品集版本'
}

const metricLabels: Record<string, string> = {
  VERIFIED_RESPONSE_RATE: '已记录反馈率',
  POSITIVE_RESPONSE_RATE: '明确正向反馈率',
  INTERVIEW_INVITE_RATE: '面试邀请率',
  INTERVIEW_COMPLETION_RATE: '面试完成率',
  TASK_COMPLETION_RATE: '任务完成率',
  AGENT_TASK_COMPLETION_RATE: '任务完成率',
  READINESS_SCORE: '准备度',
  SKILL_SCORE: '技能表现',
  APPLICATION_ACTIVITY_COUNT: '投递活动数',
  MATURED_APPLICATION_COUNT: '成熟投递数',
  CALENDAR_PLANNED_COUNT: '已安排日程数',
  CALENDAR_CANCELLED_COUNT: '已取消日程数'
}

const actionTypeLabels: Record<string, string> = {
  COLLECT_APPLICATION_SAMPLE: '补充投递样本',
  COLLECT_FEEDBACK_SAMPLE: '补充反馈记录',
  COLLECT_INTERVIEW_SAMPLE: '补充面试记录',
  COLLECT_RESUME_VERSION_SAMPLE: '补充简历版本样本',
  QUESTION_PRACTICE: '完成专项练习',
  INTERVIEW_PRACTICE: '完成模拟面试',
  MOCK_INTERVIEW: '完成模拟面试',
  FOLLOW_UP_APPLICATION: '跟进投递进展',
  JOB_FOLLOW_UP: '跟进投递进展',
  UPDATE_RESUME: '优化简历',
  UPDATE_RESUME_VERSION: '优化简历版本',
  IMPROVE_RESUME: '优化简历',
  ADD_PROJECT_EVIDENCE: '补充项目证据',
  PROJECT_EVIDENCE: '补充项目证据',
  REVIEW_EXPERIMENT: '复盘求职实验',
  CHECK_CALENDAR: '检查求职日程',
  PLAN_INTERVIEW: '安排面试准备',
  COMPLETE_REVIEW: '完成行动复盘'
}

const priorityLabels: Record<string, string> = {
  URGENT: '紧急',
  HIGH: '高优先级',
  P0: '高优先级',
  P1: '高优先级',
  MEDIUM: '中优先级',
  NORMAL: '中优先级',
  P2: '中优先级',
  LOW: '低优先级',
  P3: '低优先级'
}

const hypothesisStatusLabels: Record<string, string> = {
  TO_VALIDATE: '待验证',
  VALIDATING: '验证中',
  VALIDATED: '已验证',
  REJECTED: '已停止'
}

const detailLabels: Record<string, string> = {
  BASELINE: '对比基准',
  CURRENT: '当前值',
  BASELINE_VALUE: '基准值',
  CURRENT_VALUE: '当前值',
  BASELINE_RATE: '基准反馈率',
  CURRENT_RATE: '当前反馈率',
  DELTA: '变化幅度',
  DIFFERENCE: '差异',
  SAMPLE_COUNT: '样本数',
  MINIMUM_SAMPLE: '最低样本',
  TARGET_SAMPLE: '目标样本',
  MATURED_APPLICATIONS: '成熟投递数',
  ACTIVITY_COUNT: '活动数',
  COMPLETED_COUNT: '完成数',
  TOTAL_COUNT: '总数',
  SCORE: '当前分数',
  OBSERVATION_DAYS: '观察天数',
  DAYS: '天数',
  VERIFIED_RESPONSE_RATE: '已记录反馈率'
}

const commonValueLabels: Record<string, string> = {
  ...variableLabels,
  ...metricLabels,
  ...priorityLabels,
  ...hypothesisStatusLabels,
  UP: '上升',
  INCREASE: '上升',
  IMPROVING: '上升',
  POSITIVE: '上升',
  DOWN: '下降',
  DECREASE: '下降',
  DECLINING: '下降',
  NEGATIVE: '下降',
  STABLE: '持平',
  UNCHANGED: '持平',
  MIXED: '有波动',
  INCLUDED: '已纳入',
  EXCLUDED: '未纳入',
  UNAVAILABLE: '暂不可用',
  TRUNCATED: '仅展示部分记录',
  COMPLETE: '来源完整',
  PARTIAL: '部分来源可用',
  BEST_EFFORT: '按现有记录汇总',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  HISTORICAL: '历史记录',
  DRAFT: '草案',
  PREVIEWED: '已预览',
  CONFIRMED: '已确认',
  EXPIRED: '已失效',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
  FACT_ONLY: '仅展示事实'
}

export const getWeeklyReportVariableLabel = (value?: string | null) =>
  presentationLabel(value, variableLabels, '待明确变量')

export const getWeeklyReportFixedVariableLabels = (values: string[] = []) =>
  Array.from(new Set(values.map(getWeeklyReportVariableLabel)))

export const getWeeklyReportMetricLabel = (value?: string | null) =>
  presentationLabel(value, metricLabels, '可比较结果')

export const getWeeklyReportActionTypeLabel = (value?: string | null) =>
  presentationLabel(value, actionTypeLabels, '其他手动行动')

export const getWeeklyReportPriorityLabel = (value?: string | null) =>
  presentationLabel(value, priorityLabels, '优先级待确认')

export const getWeeklyReportHypothesisStatusLabel = (value?: string | null) =>
  presentationLabel(value, hypothesisStatusLabels, '状态待确认')

export const getWeeklyReportSignalTypeLabel = (value?: string | null) => {
  const text = String(value || '').trim()
  const normalized = normalizePresentationKey(text)
  if (normalized.includes('CHANNEL')) return '渠道反馈变化'
  if (normalized.includes('RESUME')) return '简历版本变化'
  if (normalized.includes('INTERVIEW')) return '面试表现变化'
  if (normalized.includes('READINESS')) return '准备度变化'
  if (normalized.includes('SKILL')) return '技能表现变化'
  if (normalized.includes('TASK')) return '任务完成变化'
  if (normalized.includes('APPLICATION')) return '投递活动变化'
  return getWeeklyReportUserText(text, '其他变化')
}

export const getWeeklyReportDirectionLabel = (value?: string | null) => {
  const normalized = normalizePresentationKey(value)
  if (['UP', 'INCREASE', 'IMPROVING', 'POSITIVE'].includes(normalized)) return '上升'
  if (['DOWN', 'DECREASE', 'DECLINING', 'NEGATIVE'].includes(normalized)) return '下降'
  if (['STABLE', 'UNCHANGED'].includes(normalized)) return '持平'
  if (normalized === 'MIXED') return '有波动'
  return '待观察'
}

export const getWeeklyReportDetailLabel = (value?: string | null) =>
  presentationLabel(value, detailLabels, '补充信息')

export const formatWeeklyReportDisplayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '--'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) {
    const items = value.map(formatWeeklyReportDisplayValue).filter((item) => item !== '--')
    return items.length ? items.join('、') : '--'
  }
  if (typeof value === 'object') {
    const items = Object.entries(value as Record<string, unknown>)
      .slice(0, 6)
      .map(([key, item]) => `${getWeeklyReportDetailLabel(key)}：${formatWeeklyReportDisplayValue(item)}`)
    return items.length ? items.join('；') : '--'
  }
  return presentationLabel(value, commonValueLabels, '待确认')
}

export const getWeeklyReportScopeLabel = (value?: string | null) => {
  const text = String(value || '').trim()
  const normalized = normalizePresentationKey(text)
  if (!text || normalized === 'ALL') return '全部岗位'
  if (normalized.startsWith('TARGET_JOB:')) return '指定岗位'
  if (normalized.startsWith('RESUME_VERSION:')) return '指定简历版本'
  if (normalized.startsWith('CHANNEL:')) {
    const channel = text.split(':').slice(1).join(':')
    return `渠道：${getWeeklyReportUserText(channel, '指定渠道')}`
  }
  return getWeeklyReportUserText(text, '指定范围')
}

export const getWeeklyReportTimeWindowLabel = (value?: string | null) =>
  presentationLabel(value, {
    CURRENT_WEEK: '本周',
    PREVIOUS_WEEK: '上周',
    CURRENT_WINDOW: '当前周期',
    COMPARABLE_WINDOW: '可比周期',
    HISTORICAL: '历史周期'
  }, '当前周期')

export const getWeeklyReportCoverageMessage = (value?: string | null) =>
  presentationLabel(value, {
    INTERVIEW_SERVICE_TIMEOUT: '模拟面试记录暂时不可用。',
    SOURCE_UNAVAILABLE: '部分记录暂时不可用。',
    SOURCE_TRUNCATED: '记录较多，本次仅展示其中一部分。',
    OUT_OF_WINDOW: '记录不在本周范围内。',
    OUT_OF_SCOPE: '记录不在当前岗位范围内。',
    DUPLICATE: '重复记录未计入。',
    USER_NOT_CONFIRMED: '尚未确认的记录未计入。'
  }, '部分记录暂时不可用。')

export const getWeeklyReportFallbackReason = (value?: string | null) =>
  presentationLabel(value, {
    AI_TIMEOUT: '智能总结暂时不可用，本次仍保留已核验的事实与来源。',
    AI_UNAVAILABLE: '智能总结暂时不可用，本次仍保留已核验的事实与来源。',
    AI_INVALID_RESPONSE: '智能总结暂时不可用，本次仍保留已核验的事实与来源。',
    FALLBACK: '本次使用基础汇总，已核验的事实与来源仍可查看。'
  }, '智能总结暂时不可用，本次仍保留已核验的事实与来源。')

export const getWeeklyPlanUnavailableReason = (value?: string | null) =>
  getWeeklyReportUserText(
    value,
    '当前仅支持查看行动建议，暂不能生成下一周计划预览。'
  )

export const getWeeklyReportResultSourceLabel = (value?: string | null) =>
  presentationLabel(value, {
    AI: '智能总结',
    RULE: '基础汇总',
    FALLBACK: '基础汇总'
  }, '已核验汇总')

export const normalizeWeeklyReportTimezone = (
  timezone?: string | null,
  fallback = 'Asia/Shanghai'
) => {
  const candidate = String(timezone || '').trim()
  if (!candidate) return fallback
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return fallback
  }
}

export const getWeeklyReportTimezoneLabel = (timezone?: string | null) => {
  const normalized = normalizeWeeklyReportTimezone(timezone).toUpperCase()
  if (['ASIA/SHANGHAI', 'ASIA/CHONGQING'].includes(normalized)) {
    return '中国标准时间（UTC+8）'
  }
  if (normalized === 'ASIA/HONG_KONG') return '香港时间（UTC+8）'
  if (normalized === 'ASIA/TAIPEI') return '台北时间（UTC+8）'
  if (normalized === 'UTC' || normalized === 'ETC/UTC') return '协调世界时（UTC）'
  return '当地时间'
}

const datePartsInTimezone = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeWeeklyReportTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const parseDateOnly = (value: string) => {
  if (!datePattern.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return undefined
  }
  return date
}

const formatDateOnly = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

export const toWeeklyReportWeekStart = (
  value?: string | Date | null,
  timezone = 'Asia/Shanghai'
): string => {
  const input = value instanceof Date
    ? datePartsInTimezone(value, timezone)
    : String(value || '').trim().slice(0, 10)
  const parsed = parseDateOnly(input)
  if (!parsed) return getCurrentWeeklyReportWeekStart(timezone)
  const day = parsed.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  parsed.setUTCDate(parsed.getUTCDate() - offset)
  return formatDateOnly(parsed)
}

export const getWeeklyReportWeekEnd = (weekStartDate: string) => {
  const parsed = parseDateOnly(toWeeklyReportWeekStart(weekStartDate))
  if (!parsed) return weekStartDate
  parsed.setUTCDate(parsed.getUTCDate() + 6)
  return formatDateOnly(parsed)
}

export const getCurrentWeeklyReportWeekStart = (
  timezone = 'Asia/Shanghai',
  now = new Date()
): string => toWeeklyReportWeekStart(datePartsInTimezone(now, timezone), timezone)

export const clampWeeklyReportWeekStart = (
  value?: string | Date | null,
  timezone = 'Asia/Shanghai',
  now = new Date()
): string => {
  const selectedWeekStart = toWeeklyReportWeekStart(value, timezone)
  const currentWeekStart = getCurrentWeeklyReportWeekStart(timezone, now)
  return selectedWeekStart > currentWeekStart ? currentWeekStart : selectedWeekStart
}

export const isFutureWeeklyReportWeek = (
  value?: string | Date | null,
  timezone = 'Asia/Shanghai',
  now = new Date()
): boolean =>
  toWeeklyReportWeekStart(value, timezone) > getCurrentWeeklyReportWeekStart(timezone, now)

export const buildWeeklyReportScopeKey = (targetJobId?: number | null) =>
  targetJobId == null ? 'ALL' : `TARGET_JOB:${targetJobId}`

const normalizedKeyPart = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9:_-]+/g, '_')

export const buildWeeklyReportIdempotencyKey = (
  operation: 'generate' | 'refresh' | 'preview',
  input: {
    weekStartDate?: string
    targetJobId?: number | null
    timezone?: string
    reportId?: number
    snapshotId?: number
    snapshotVersion?: number
  }
) => {
  const parts = [
    'weekly-report',
    operation,
    input.weekStartDate ? toWeeklyReportWeekStart(input.weekStartDate, input.timezone) : undefined,
    buildWeeklyReportScopeKey(input.targetJobId),
    normalizeWeeklyReportTimezone(input.timezone),
    input.reportId == null ? undefined : `report-${input.reportId}`,
    input.snapshotId == null ? undefined : `snapshot-${input.snapshotId}`,
    input.snapshotVersion == null ? undefined : `v-${input.snapshotVersion}`
  ].filter(Boolean).map(normalizedKeyPart)
  return parts.join(':').slice(0, 128)
}

export const buildWeeklyReportRequestId = (operation: 'generate' | 'refresh') =>
  `${operation}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const createWeeklyReportRequestGate = () => {
  const inflight = new Map<string, Promise<unknown>>()
  return {
    run<T>(key: string, task: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key)
      if (existing) return existing as Promise<T>
      const promise = Promise.resolve().then(task)
      inflight.set(key, promise)
      const clear = () => {
        if (inflight.get(key) === promise) inflight.delete(key)
      }
      promise.then(clear, clear)
      return promise
    },
    has(key: string) {
      return inflight.has(key)
    },
    clear() {
      inflight.clear()
    }
  }
}

const normalizeRange = (value: unknown): WeeklyReportRange | undefined => {
  const source = asRecord(value)
  if (!Object.keys(source).length) return undefined
  return {
    weekStartDate: textValue(source.weekStartDate),
    weekEndDate: textValue(source.weekEndDate),
    rangeStartUtc: textValue(source.rangeStartUtc),
    rangeEndUtc: textValue(source.rangeEndUtc),
    sourceCutoffAt: textValue(source.sourceCutoffAt),
    timezone: textValue(source.timezone),
    windowStatus: textValue(source.windowStatus)
  }
}

const normalizeCoverageSource = (value: unknown): WeeklySourceCoverageItem => {
  const source = asRecord(value)
  return {
    sourceType: textValue(source.sourceType),
    sourceId: numberValue(source.sourceId),
    sourceTime: textValue(source.sourceTime),
    sourceUpdatedAt: textValue(source.sourceUpdatedAt),
    scopeKey: textValue(source.scopeKey),
    inclusionStatus: textValue(source.inclusionStatus),
    excludeReason: textValue(source.excludeReason),
    sourceHash: textValue(source.sourceHash),
    safeSummary: textValue(source.safeSummary),
    metadata: objectMap(source.metadata)
  }
}

const normalizeCoverage = (value: unknown): WeeklyReportCoverage => {
  const source = asRecord(value)
  return {
    includedCounts: numberMap(source.includedCounts),
    excludedCounts: numberMap(source.excludedCounts),
    unavailableCounts: numberMap(source.unavailableCounts),
    sources: (Array.isArray(source.sources) ? source.sources : []).map(normalizeCoverageSource),
    truncated: booleanValue(source.truncated),
    warnings: stringList(source.warnings),
    consistencyLevel: textValue(source.consistencyLevel)?.toUpperCase() || 'BEST_EFFORT'
  }
}

const normalizeFact = (value: unknown): WeeklyReportFact => {
  const source = asRecord(value)
  return {
    factId: textValue(source.factId),
    factType: textValue(source.factType),
    label: textValue(source.label),
    value: source.value,
    unit: textValue(source.unit),
    scope: textValue(source.scope),
    timeWindow: textValue(source.timeWindow),
    sourceRefs: stringList(source.sourceRefs),
    calculationVersion: textValue(source.calculationVersion)
  }
}

const normalizeSignal = (value: unknown): WeeklyReportSignal => {
  const source = asRecord(value)
  return {
    signalId: textValue(source.signalId),
    signalType: textValue(source.signalType),
    direction: textValue(source.direction),
    title: textValue(source.title),
    description: textValue(source.description),
    metric: objectMap(source.metric),
    confidenceLevel: textValue(source.confidenceLevel),
    sampleBoundary: objectMap(source.sampleBoundary),
    scope: textValue(source.scope),
    comparedScope: textValue(source.comparedScope),
    sourceRefs: stringList(source.sourceRefs),
    blockedConclusions: stringList(source.blockedConclusions)
  }
}

const normalizeHypothesis = (value: unknown): WeeklyReportHypothesis => {
  const source = asRecord(value)
  return {
    hypothesisId: textValue(source.hypothesisId),
    statement: textValue(source.statement),
    primaryVariable: textValue(source.primaryVariable),
    fixedVariables: stringList(source.fixedVariables),
    expectedSignal: textValue(source.expectedSignal),
    successMetric: textValue(source.successMetric),
    minimumSample: numberValue(source.minimumSample),
    observationDays: numberValue(source.observationDays),
    stopCondition: textValue(source.stopCondition),
    confidenceLevel: textValue(source.confidenceLevel),
    basedOnSignalIds: stringList(source.basedOnSignalIds),
    sourceRefs: stringList(source.sourceRefs),
    status: textValue(source.status) || 'TO_VALIDATE'
  }
}

const normalizeExperimentSuggestion = (value: unknown): WeeklyExperimentSuggestion => {
  const source = asRecord(value)
  return {
    suggestionId: textValue(source.suggestionId),
    semanticKey: textValue(source.semanticKey),
    title: textValue(source.title),
    hypothesis: textValue(source.hypothesis),
    primaryVariable: textValue(source.primaryVariable),
    fixedVariables: stringList(source.fixedVariables),
    eligibleSegments: (Array.isArray(source.eligibleSegments) ? source.eligibleSegments : []).map(objectMap),
    expectedSignal: textValue(source.expectedSignal),
    successMetric: textValue(source.successMetric),
    targetSample: numberValue(source.targetSample),
    minimumSample: numberValue(source.minimumSample),
    observationDays: numberValue(source.observationDays),
    stopCondition: textValue(source.stopCondition),
    confidenceLevel: textValue(source.confidenceLevel),
    basedOnSignalIds: stringList(source.basedOnSignalIds),
    sourceRefs: stringList(source.sourceRefs),
    status: textValue(source.status) || 'TO_VALIDATE',
    metadata: objectMap(source.metadata)
  }
}

const normalizePlanDraftItem = (value: unknown): WeeklyPlanDraftItem => {
  const source = asRecord(value)
  return {
    semanticKey: textValue(source.semanticKey),
    targetDate: textValue(source.targetDate),
    actionType: textValue(source.actionType),
    title: textValue(source.title),
    description: textValue(source.description),
    reason: textValue(source.reason),
    sourceWeeklyReportSnapshotId: textValue(source.sourceWeeklyReportSnapshotId),
    sourceHypothesisId: textValue(source.sourceHypothesisId),
    estimatedMinutes: numberValue(source.estimatedMinutes),
    priority: textValue(source.priority),
    conflictCheckRequired: booleanValue(source.conflictCheckRequired, true),
    userDecision: textValue(source.userDecision),
    requiresUserConfirmation: booleanValue(source.requiresUserConfirmation, true)
  }
}

const normalizePlanDraft = (value: unknown): WeeklyPlanDraft => {
  const source = asRecord(value)
  return {
    available: booleanValue(source.available),
    sourceSnapshotId: textValue(source.sourceSnapshotId),
    targetWeekStart: textValue(source.targetWeekStart),
    unavailableReason: textValue(source.unavailableReason),
    items: (Array.isArray(source.items) ? source.items : []).map(normalizePlanDraftItem),
    stageFivePreviewRoute: textValue(source.stageFivePreviewRoute),
    status: textValue(source.status) || 'DRAFT'
  }
}

const normalizeSnapshotVersion = (value: unknown): WeeklyReportSnapshotVersion => {
  const source = asRecord(value)
  return {
    snapshotId: numberValue(source.snapshotId),
    snapshotVersion: numberValue(source.snapshotVersion),
    reportStatus: textValue(source.reportStatus),
    confidenceLevel: textValue(source.confidenceLevel),
    resultSource: textValue(source.resultSource),
    fallback: booleanValue(source.fallback),
    sourceCutoffAt: textValue(source.sourceCutoffAt),
    generatedAt: textValue(source.generatedAt),
    current: booleanValue(source.current)
  }
}

export const normalizeAgentWeeklyReport = (value: unknown): AgentWeeklyReport | null => {
  if (value == null) return null
  const source = asRecord(value)
  return {
    id: numberValue(source.id),
    snapshotId: numberValue(source.snapshotId),
    targetJobId: numberValue(source.targetJobId),
    targetScopeKey: textValue(source.targetScopeKey),
    weekStartDate: textValue(source.weekStartDate),
    weekEndDate: textValue(source.weekEndDate),
    timezone: textValue(source.timezone),
    reportStatus: textValue(source.reportStatus)?.toUpperCase() || 'NOT_GENERATED',
    snapshotVersion: numberValue(source.snapshotVersion),
    operationResult: textValue(source.operationResult),
    summary: textValue(source.summary),
    confidenceLevel: normalizeConfidenceLevel(source.confidenceLevel),
    fallback: booleanValue(source.fallback),
    fallbackReason: textValue(source.fallbackReason),
    resultSource: textValue(source.resultSource)?.toUpperCase(),
    traceId: textValue(source.traceId),
    aiCallLogId: numberValue(source.aiCallLogId),
    range: normalizeRange(source.range),
    coverage: normalizeCoverage(source.coverage),
    facts: (Array.isArray(source.facts) ? source.facts : []).map(normalizeFact),
    signals: (Array.isArray(source.signals) ? source.signals : []).map(normalizeSignal),
    hypotheses: (Array.isArray(source.hypotheses) ? source.hypotheses : []).map(normalizeHypothesis),
    experimentSuggestions: (Array.isArray(source.experimentSuggestions) ? source.experimentSuggestions : [])
      .map(normalizeExperimentSuggestion),
    planDraft: normalizePlanDraft(source.planDraft),
    snapshotHistory: (Array.isArray(source.snapshotHistory) ? source.snapshotHistory : [])
      .map(normalizeSnapshotVersion),
    sourceCutoffAt: textValue(source.sourceCutoffAt),
    generatedAt: textValue(source.generatedAt),
    refreshedAt: textValue(source.refreshedAt),
    createdAt: textValue(source.createdAt),
    updatedAt: textValue(source.updatedAt)
  }
}

const sourceTypeLabels: Array<[RegExp, string]> = [
  [/AGENT_WEEK_PLAN_ITEM/, '周计划项'],
  [/AGENT_WEEK_PLAN/, 'Agent 周计划'],
  [/AGENT_PLAN_ADJUSTMENT/, '计划调整'],
  [/AGENT_PLAN_INFLUENCE/, '计划影响'],
  [/AGENT_REVIEW/, '每日复盘'],
  [/READINESS/, '就绪度记录'],
  [/SKILL_GROWTH/, '技能成长快照'],
  [/JOB_APPLICATION_EVENT/, '投递事件'],
  [/JOB_APPLICATION/, '投递记录'],
  [/CAREER_CALENDAR/, '求职日历'],
  [/JOB_SEARCH_EXPERIMENT|EXPERIMENT/, '求职实验'],
  [/INTERVIEW_REPORT/, '模拟面试报告'],
  [/INTERVIEW_SESSION/, '模拟面试会话'],
  [/INTERVIEW/, '面试证据']
]

export const getWeeklyReportSourceLabel = (sourceType?: string | null) => {
  const normalized = String(sourceType || '').trim().toUpperCase()
  if (!normalized) return '未知来源'
  return sourceTypeLabels.find(([pattern]) => pattern.test(normalized))?.[1] || '其他来源'
}

const sourceStatus = (
  includedCount: number,
  excludedCount: number,
  unavailableCount: number,
  truncated: boolean
): WeeklyReportSourceStatus => {
  if (unavailableCount > 0) return 'UNAVAILABLE'
  if (truncated) return 'TRUNCATED'
  if (includedCount <= 0 && excludedCount > 0) return 'EXCLUDED'
  return 'INCLUDED'
}

export const buildWeeklyReportCoverageGroups = (
  coverage?: WeeklyReportCoverage | null
): WeeklyReportCoverageGroup[] => {
  if (!coverage) return []
  const fallbackCounts = new Map<string, {
    included: number
    excluded: number
    unavailable: number
    truncated: boolean
    reasons: string[]
  }>()

  coverage.sources.forEach((item) => {
    const sourceType = String(item.sourceType || 'UNKNOWN').toUpperCase()
    const current = fallbackCounts.get(sourceType) || {
      included: 0,
      excluded: 0,
      unavailable: 0,
      truncated: false,
      reasons: []
    }
    const status = String(item.inclusionStatus || '').toUpperCase()
    if (status === 'INCLUDED') current.included += 1
    if (status === 'EXCLUDED') current.excluded += 1
    if (status === 'UNAVAILABLE') current.unavailable += 1
    if (status === 'TRUNCATED') current.truncated = true
    if (item.excludeReason) current.reasons.push(item.excludeReason)
    fallbackCounts.set(sourceType, current)
  })

  const keys = new Set([
    ...Object.keys(coverage.includedCounts),
    ...Object.keys(coverage.excludedCounts),
    ...Object.keys(coverage.unavailableCounts),
    ...fallbackCounts.keys()
  ])

  return Array.from(keys)
    .map((sourceType) => {
      const fallback = fallbackCounts.get(sourceType)
      const includedCount = coverage.includedCounts[sourceType] ?? fallback?.included ?? 0
      const excludedCount = coverage.excludedCounts[sourceType] ?? fallback?.excluded ?? 0
      const unavailableCount = coverage.unavailableCounts[sourceType] ?? fallback?.unavailable ?? 0
      const truncated = Boolean(fallback?.truncated)
      return {
        sourceType,
        label: getWeeklyReportSourceLabel(sourceType),
        includedCount,
        excludedCount,
        unavailableCount,
        status: sourceStatus(includedCount, excludedCount, unavailableCount, truncated),
        reasons: Array.from(new Set(fallback?.reasons || [])).slice(0, 3)
      }
    })
    .sort((left, right) => {
      const rank = { UNAVAILABLE: 0, TRUNCATED: 1, EXCLUDED: 2, INCLUDED: 3 }
      return rank[left.status] - rank[right.status] || left.label.localeCompare(right.label, 'zh-CN')
    })
}

export const getWeeklyReportDisplayPolicy = (
  report?: AgentWeeklyReport | null
): WeeklyReportDisplayPolicy => {
  const factOnly = !report || report.confidenceLevel === 'FACT_ONLY'
  const sourceLimited = Boolean(
    report?.coverage.truncated
    || ['PARTIAL', 'BEST_EFFORT'].includes(String(report?.coverage.consistencyLevel || '').toUpperCase())
  )
  return {
    factOnly,
    showSignals: !factOnly && Boolean(report?.signals.length),
    showHypotheses: !factOnly && Boolean(report?.hypotheses.length),
    showExperiments: !factOnly && Boolean(report?.experimentSuggestions.length),
    showPlanDraft: Boolean(report?.planDraft.items.length || report?.planDraft.available),
    sourceLimited
  }
}

export const formatWeeklyReportFactValue = (fact: WeeklyReportFact) => {
  const text = formatWeeklyReportDisplayValue(fact.value)
  const unit = presentationLabel(fact.unit, {
    PERCENT: '%',
    COUNT: '条',
    TIMES: '次',
    DAYS: '天',
    MINUTES: '分钟',
    SCORE: '分'
  }, '')
  return unit && text !== '--' ? `${text} ${unit}` : text
}

export const formatWeeklyReportDateTime = (
  value?: string | null,
  timezone = 'Asia/Shanghai'
) => {
  const text = String(value || '').trim()
  if (!text) return '--'
  const zone = normalizeWeeklyReportTimezone(timezone)
  const zoneLabel = getWeeklyReportTimezoneLabel(zone)
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    return `${text.replace('T', ' ').slice(0, 19)} · ${zoneLabel}`
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return `${text.replace('T', ' ')} · ${zoneLabel}`
  return `${new Intl.DateTimeFormat('zh-CN', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)} · ${zoneLabel}`
}

export const getWeeklyReportConfidencePresentation = (
  confidenceLevel?: string | null
) => {
  const normalized = normalizeConfidenceLevel(confidenceLevel)
  if (normalized === 'HIGH') return { label: '高可信', tagType: 'success' as const }
  if (normalized === 'MEDIUM') return { label: '中可信', tagType: 'warning' as const }
  if (normalized === 'LOW') return { label: '低可信', tagType: 'info' as const }
  return { label: '仅事实', tagType: 'info' as const }
}

export const getWeeklyReportStatusPresentation = (
  reportStatus?: string | null,
  windowStatus?: string | null
) => {
  const normalizedWindow = String(windowStatus || '').trim().toUpperCase()
  const normalizedStatus = String(reportStatus || '').trim().toUpperCase()
  if (normalizedStatus === 'NOT_GENERATED') return { label: '未生成', tagType: 'info' as const }
  if (
    normalizedWindow === 'IN_PROGRESS'
    || ['IN_PROGRESS', 'GENERATING', 'REFRESHING'].includes(normalizedStatus)
  ) {
    return { label: '进行中', tagType: 'warning' as const }
  }
  if (normalizedStatus === 'FAILED') return { label: '生成失败', tagType: 'danger' as const }
  if (
    ['GENERATED', 'COMPLETED', 'READY', 'SUCCESS', 'SEALED'].includes(normalizedStatus)
    || ['COMPLETED', 'HISTORICAL'].includes(normalizedWindow)
  ) {
    return { label: '已生成', tagType: 'success' as const }
  }
  return { label: '状态待确认', tagType: 'info' as const }
}

export const buildWeeklyPlanPreviewPayload = (
  report: AgentWeeklyReport
): WeeklyPlanPreviewPayload => ({
  sourceType: 'AGENT_WEEKLY_REPORT',
  sourceId: report.id,
  sourceSnapshotId: report.snapshotId || report.planDraft.sourceSnapshotId,
  sourceSnapshotVersion: report.snapshotVersion,
  targetWeekStart: report.planDraft.targetWeekStart,
  targetJobId: report.targetJobId,
  timezone: report.timezone || report.range?.timezone,
  items: report.planDraft.items.map((item) => ({
    semanticKey: item.semanticKey,
    actionType: item.actionType,
    title: item.title,
    description: item.description,
    reason: item.reason,
    plannedDate: item.targetDate,
    estimatedMinutes: item.estimatedMinutes,
    priority: item.priority,
    sourceHypothesisId: item.sourceHypothesisId,
    requiresUserConfirmation: true
  })),
  idempotencyKey: buildWeeklyReportIdempotencyKey('preview', {
    weekStartDate: report.planDraft.targetWeekStart || report.weekStartDate,
    targetJobId: report.targetJobId,
    timezone: report.timezone,
    reportId: report.id,
    snapshotId: report.snapshotId,
    snapshotVersion: report.snapshotVersion
  })
})
