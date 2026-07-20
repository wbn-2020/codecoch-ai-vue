import { formatLocalDateTime } from '@/utils/format'
import type { JobApplicationEventVO, JobApplicationStatsVO, JobApplicationVO } from '@/api/v4'

export type ApplicationRouteValue = string | number | undefined

export interface ApplicationRouteLocation {
  path: string
  query?: Record<string, ApplicationRouteValue>
}

export type ApplicationQuickActionKey = 'interview' | 'resume-version' | 'follow-up'
export type ApplicationDraftKind = 'follow-up' | 'thank-you' | 'rejection-review' | 'no-response-review' | 'interview-feedback-review'

export interface ApplicationWorkbenchContext {
  applicationId: number
  targetJobId?: number | null
  resumeId?: number | null
  resumeVersionId?: number | null
  matchReportId?: number | null
  source?: string | null
  nextFollowUpAt?: string | null
  eventTime?: string | null
}

export type ApplicationFollowUpStateKey = 'missing' | 'overdue' | 'due-today' | 'upcoming'
export type ApplicationDeepLinkFollowUpFilter = Extract<ApplicationFollowUpStateKey, 'missing' | 'overdue' | 'due-today'>
export type ApplicationDeepLinkAction = 'create-event'

export interface ApplicationFollowUpState {
  key: ApplicationFollowUpStateKey
  label: string
  tone: 'danger' | 'warning' | 'info' | 'success'
  description: string
  dueAt?: string
  overdueByDays?: number
  dueInDays?: number
}

export type ApplicationStageKey =
  | 'total'
  | 'active'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'closed'
  | 'follow-up-overdue'
  | 'follow-up-due-today'
  | 'follow-up-missing'
  | 'follow-up-stale'

export interface ApplicationStageCard {
  key: ApplicationStageKey
  label: string
  value: number
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description: string
}

export type ApplicationFunnelStageKey =
  | 'TARGET_POOL'
  | 'PREPARING'
  | 'APPLIED'
  | 'FEEDBACK'
  | 'INTERVIEW'
  | 'RESULT'
  | 'REVIEWED'

export interface ApplicationFunnelStage {
  key: ApplicationFunnelStageKey
  label: string
  count: number
  sourceStatuses: string[]
  sourceEventTypes: string[]
  description: string
  actionHint: string
}

export type ApplicationDataQualityTagKey =
  | 'missing-resume-version'
  | 'no-event'
  | 'follow-up-overdue'
  | 'follow-up-due-today'
  | 'follow-up-missing'
  | 'stale-active'

export interface ApplicationDataQualityTag {
  key: ApplicationDataQualityTagKey
  label: string
  tone: 'danger' | 'warning' | 'info' | 'success'
  description: string
}

export interface ApplicationStatsSummary {
  total: number
  activeCount: number
  overdueFollowUpCount: number
  dueTodayFollowUpCount: number
  noFollowUpCount: number
  staleActiveCount: number
  interviewCount: number
  offerCount: number
  rejectedCount: number
  closedCount: number
  statusCounts: Record<string, number>
  generatedAt?: string
}

export interface ApplicationWorkbenchOverview {
  stats: ApplicationStatsSummary
  stageCards: ApplicationStageCard[]
  followUpCards: ApplicationStageCard[]
}

export interface ApplicationListQueryState {
  status?: string
  followUp?: ApplicationDeepLinkFollowUpFilter
  applicationId?: number
  openEvents: boolean
  action?: ApplicationDeepLinkAction
  eventType?: string
  eventTime?: string
}

export interface ApplicationResumeVersionLabelInput {
  resumeVersionId?: number | null
  versionNo?: number | null
  versionName?: string | null
  currentFlag?: number | boolean | null
  resumeName?: string | null
  resumeTitle?: string | null
}

export interface ApplicationStageMeta {
  label: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description: string
}

export type ApplicationFollowUpFilter = 'all' | ApplicationFollowUpStateKey

export interface ApplicationEventMeta {
  label: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description: string
}

export interface ApplicationOutboundDraft {
  kind: ApplicationDraftKind
  title: string
  eventType: string
  summary: string
  draftBody: string
  review: Record<string, unknown>
  reviewJson: string
  boundaryNotice: string
  experimentInput: string[]
}

export type ApplicationEventReviewScenario = 'INTERVIEW_COMPLETED' | 'REJECTION' | 'NO_RESPONSE'
export type ApplicationEventReviewScope = 'REAL_JOB' | 'SIMULATION' | 'UNKNOWN' | string
export type ApplicationEventReviewOwner = 'USER' | 'SYSTEM' | 'AI' | 'RULE' | 'LEGACY'
export type ApplicationEventReviewConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | string
export type ApplicationEventReviewGenerationStatus = 'GENERATING' | 'SUCCEEDED' | 'FALLBACK' | 'FAILED' | string

export interface ApplicationEventReviewFact {
  id?: string
  content: string
  owner: ApplicationEventReviewOwner
  sourceType?: string
}

export interface ApplicationEventReviewSignal {
  content: string
  factRefs: string[]
  confidenceLevel?: ApplicationEventReviewConfidence
  owner: ApplicationEventReviewOwner
}

export interface ApplicationEventReviewUserInput {
  owner: ApplicationEventReviewOwner
  observedFacts: ApplicationEventReviewFact[]
  externalFeedback?: ApplicationEventReviewFact
  selfReflection?: string
}

export interface ApplicationEventReviewAnalysis {
  owner: ApplicationEventReviewOwner
  summary?: string
  limits: string[]
  signals: ApplicationEventReviewSignal[]
  adjustments: string[]
  nextActions: string[]
}

export interface ApplicationEventReviewGeneration {
  owner: ApplicationEventReviewOwner
  status?: ApplicationEventReviewGenerationStatus
  fallback: boolean
  fallbackReason?: string
  confidenceLevel?: ApplicationEventReviewConfidence
  confidenceBasis: string[]
  aiCallLogId?: number
  inputFingerprint?: string
  requestId?: string
  generatorVersion?: string
  startedAt?: string
  generatedAt?: string
}

export interface ApplicationEventStructuredReview {
  schemaVersion?: string
  scenario?: ApplicationEventReviewScenario | string
  eventScope?: ApplicationEventReviewScope
  userInput: ApplicationEventReviewUserInput
  systemFacts: ApplicationEventReviewFact[]
  analysis: ApplicationEventReviewAnalysis
  generation: ApplicationEventReviewGeneration
}

export interface ApplicationEventReviewSeed {
  scenario: ApplicationEventReviewScenario
  observedFacts: string[]
  externalFeedback: string
  selfReflection: string
  assumptions: string[]
  nextExperimentInputs: string[]
}

export interface ApplicationEventReviewGenerateInput {
  observedFacts?: string[] | string
  externalFeedback?: string
  selfReflection?: string
}

export interface ApplicationEventReviewGenerateRequest {
  observedFacts: string[]
  externalFeedback?: string
  selfReflection?: string
  force: boolean
  requestId: string
}

export interface ApplicationEventReviewSaveResult<
  TEvent extends { id: number },
  TReview = ApplicationEventStructuredReview
> {
  event: TEvent
  review?: TReview
  reviewError?: unknown
}

export interface ApplicationTimelineEvent extends JobApplicationEventVO {
  normalizedType: string
  meta: ApplicationEventMeta
  timeText: string
  summaryText: string
  sortTime: number
}

const activeStatuses = new Set(['SAVED', 'PREPARING', 'APPLIED', 'INTERVIEWING', 'OFFER'])
const terminalStatuses = new Set(['REJECTED', 'CLOSED'])
const resultStatuses = ['OFFER', 'REJECTED', 'CLOSED']
const staleActiveDays = 14

export const applicationStatusOptions = [
  { label: '已收藏', value: 'SAVED' },
  { label: '准备中', value: 'PREPARING' },
  { label: '已投递', value: 'APPLIED' },
  { label: '面试中', value: 'INTERVIEWING' },
  { label: '已收到录用通知', value: 'OFFER' },
  { label: '已拒信', value: 'REJECTED' },
  { label: '已关闭', value: 'CLOSED' }
]

export const applicationFollowUpFilterOptions: Array<{ label: string; value: ApplicationDeepLinkFollowUpFilter }> = [
  { label: '逾期跟进', value: 'overdue' },
  { label: '今日跟进', value: 'due-today' },
  { label: '未设置跟进', value: 'missing' }
]

const applicationStatusMeta: Record<string, ApplicationStageMeta> = {
  SAVED: { label: '已收藏', tone: 'info', description: '岗位已进入跟踪池，适合补齐简历和投递计划。' },
  PREPARING: { label: '准备中', tone: 'warning', description: '正在准备简历、作品或投递材料。' },
  APPLIED: { label: '已投递', tone: 'primary', description: '已完成投递，等待反馈或主动跟进。' },
  INTERVIEWING: { label: '面试中', tone: 'success', description: '已进入面试阶段，建议同步面试记录。' },
  OFFER: { label: '录用通知', tone: 'success', description: '已收到录用通知，记录关键结果。' },
  REJECTED: { label: '已拒绝', tone: 'danger', description: '流程已结束，适合沉淀复盘事件。' },
  CLOSED: { label: '已关闭', tone: 'info', description: '该投递已关闭，不再作为活跃跟进项。' }
}

const funnelStageMeta: Record<ApplicationFunnelStageKey, Omit<ApplicationFunnelStage, 'count'>> = {
  TARGET_POOL: {
    key: 'TARGET_POOL',
    label: '目标池',
    sourceStatuses: ['SAVED'],
    sourceEventTypes: [],
    description: '已收藏或记录的目标岗位，不代表已经完成投递。',
    actionHint: '补齐 JD、岗位方向或决定是否进入准备。'
  },
  PREPARING: {
    key: 'PREPARING',
    label: '准备中',
    sourceStatuses: ['PREPARING'],
    sourceEventTypes: [],
    description: '正在准备简历、项目证据或投递材料。',
    actionHint: '绑定简历版本，补齐项目证据。'
  },
  APPLIED: {
    key: 'APPLIED',
    label: '已投递',
    sourceStatuses: ['APPLIED'],
    sourceEventTypes: ['APPLIED', 'SUBMITTED', 'APPLICATION_SUBMITTED'],
    description: '用户记录中已经完成投递动作。',
    actionHint: '设置跟进时间，绑定匹配报告。'
  },
  FEEDBACK: {
    key: 'FEEDBACK',
    label: '有反馈',
    sourceStatuses: [],
    sourceEventTypes: ['FOLLOW_UP', 'FOLLOW_UP_DONE', 'OUTBOUND_FOLLOW_UP_DRAFT', 'THANK_YOU_DRAFT', 'INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'INTERVIEW_FEEDBACK_REVIEW', 'OFFER', 'OFFER_RECEIVED', 'REJECTED', 'REJECTION', 'NO_RESPONSE_REVIEW', 'CLOSED', 'NOTE'],
    description: '出现跟进、回复、拒信、面试或其他沟通记录。',
    actionHint: '补充事件摘要，保留事实证据。'
  },
  INTERVIEW: {
    key: 'INTERVIEW',
    label: '面试中',
    sourceStatuses: ['INTERVIEWING'],
    sourceEventTypes: ['INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'],
    description: '已进入面试或面试流程中。',
    actionHint: '记录面试反馈或创建复练。'
  },
  RESULT: {
    key: 'RESULT',
    label: '结果',
    sourceStatuses: resultStatuses,
    sourceEventTypes: ['OFFER', 'OFFER_RECEIVED', 'REJECTED', 'REJECTION', 'CLOSED'],
    description: '已有录用、拒信或关闭等明确阶段结果。',
    actionHint: '记录结果原因，补一次复盘事件。'
  },
  REVIEWED: {
    key: 'REVIEWED',
    label: '已复盘',
    sourceStatuses: [],
    sourceEventTypes: ['REVIEW', 'REVIEWED', 'RETROSPECTIVE', 'REJECTION_REVIEW', 'NO_RESPONSE_REVIEW', 'INTERVIEW_FEEDBACK_REVIEW'],
    description: '投递事件或求职实验中已有复盘线索。',
    actionHint: '沉淀下一轮实验或归档。'
  }
}

const stageCardMeta: Record<ApplicationStageKey, Pick<ApplicationStageCard, 'label' | 'tone' | 'description'>> = {
  total: { label: '投递总数', tone: 'primary', description: '所有投递记录的汇总' },
  active: { label: '进行中', tone: 'primary', description: '仍在推进中的投递' },
  interviewing: { label: '面试中', tone: 'success', description: '已进入面试阶段' },
  offer: { label: '录用通知', tone: 'success', description: '已收到录用通知的投递' },
  rejected: { label: '已拒绝', tone: 'danger', description: '已被拒绝或淘汰' },
  closed: { label: '已结束', tone: 'info', description: '已关闭的投递记录' },
  'follow-up-overdue': { label: '跟进过期', tone: 'danger', description: '超过计划跟进时间' },
  'follow-up-due-today': { label: '今日待跟进', tone: 'warning', description: '今天需要继续跟进' },
  'follow-up-missing': { label: '未设置跟进', tone: 'info', description: '尚未填写下一次跟进时间' },
  'follow-up-stale': { label: '久未更新', tone: 'warning', description: '活跃投递长时间未更新' }
}

const applicationEventMeta: Record<string, ApplicationEventMeta> = {
  NOTE: { label: '备注', tone: 'info', description: '补充投递背景或沟通细节。' },
  FOLLOW_UP: { label: '跟进', tone: 'primary', description: '记录一次主动跟进，并安排下一步。' },
  FOLLOW_UP_DONE: { label: '跟进', tone: 'primary', description: '记录一次主动跟进，并安排下一步。' },
  OUTBOUND_FOLLOW_UP_DRAFT: { label: '跟进草稿', tone: 'primary', description: '仅生成跟进信草稿，用户确认后自行发送。' },
  THANK_YOU_DRAFT: { label: '感谢信草稿', tone: 'success', description: '仅生成面试感谢信草稿，用户确认后自行发送。' },
  INTERVIEW: { label: '面试', tone: 'success', description: '该投递进入或更新面试流程。' },
  INTERVIEW_SCHEDULED: { label: '面试', tone: 'success', description: '该投递进入或更新面试流程。' },
  INTERVIEW_COMPLETED: { label: '面试完成', tone: 'success', description: '面试已完成，报告或复盘结果已回流投递记录。' },
  OFFER: { label: '录用通知', tone: 'success', description: '该投递收到录用通知结果。' },
  OFFER_RECEIVED: { label: '录用通知', tone: 'success', description: '该投递收到录用通知结果。' },
  REJECTED: { label: '拒绝', tone: 'danger', description: '该投递已被拒绝或淘汰。' },
  REJECTION: { label: '拒绝', tone: 'danger', description: '该投递已被拒绝或淘汰。' },
  REJECTION_REVIEW: { label: '拒信复盘', tone: 'danger', description: '记录拒信后的事实、假设和下一轮实验输入。' },
  NO_RESPONSE_REVIEW: { label: '无反馈复盘', tone: 'warning', description: '记录长时间无反馈后的复盘和下一步实验输入。' },
  INTERVIEW_FEEDBACK_REVIEW: { label: '面试反馈复盘', tone: 'success', description: '记录面试后反馈、证据和下一轮改进输入。' },
  CLOSED: { label: '关闭', tone: 'info', description: '该投递已关闭，不再推进。' },
  APPLIED: { label: '投递', tone: 'primary', description: '已完成投递动作。' },
  SUBMITTED: { label: '投递', tone: 'primary', description: '已完成投递动作。' },
  APPLICATION_SUBMITTED: { label: '投递', tone: 'primary', description: '已完成投递动作。' }
}

const coerceNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeStatus = (value?: string | null) => {
  const text = String(value || '').trim().toUpperCase()
  return text || undefined
}

const normalizeStatusCounts = (statusCounts?: Record<string, number> | null) => {
  const normalized: Record<string, number> = {}
  Object.entries(statusCounts || {}).forEach(([key, value]) => {
    const status = normalizeStatus(key) || key.trim()
    if (!status) return
    normalized[status] = (normalized[status] || 0) + coerceNumber(value, 0)
  })
  return normalized
}

const sumStatusCounts = (statusCounts: Record<string, number>, statuses: string[]) =>
  statuses.reduce((total, status) => total + coerceNumber(statusCounts[status], 0), 0)

const ensureLocalDate = (value: string | Date | number | null | undefined): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value.getTime())
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  const text = String(value).trim()
  if (!text) return undefined

  const localMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?)?$/
  )
  if (localMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = localMatch
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, '0'))
    )
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const toApplicationRoute = (path: string, query: Record<string, ApplicationRouteValue>) => {
  const compacted = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  ) as Record<string, ApplicationRouteValue>
  return Object.keys(compacted).length ? { path, query: compacted } : path
}

const buildStageCard = (
  key: ApplicationStageKey,
  value: number,
  description?: string
): ApplicationStageCard => ({
  key,
  label: stageCardMeta[key].label,
  value: coerceNumber(value, 0),
  tone: stageCardMeta[key].tone,
  description: description || stageCardMeta[key].description
})

const normalizeEventType = (value?: string | null) => {
  const text = String(value || '').trim().toUpperCase()
  return text || 'NOTE'
}

const normalizeQueryValue = (value: unknown) => {
  const first = Array.isArray(value) ? value[0] : value
  return first == null ? '' : String(first).trim()
}

const isTruthyQueryValue = (value: unknown) => {
  const normalized = normalizeQueryValue(value).toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

const parseQueryNumber = (value: unknown) => {
  const normalized = normalizeQueryValue(value)
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key)

export const hasBackendResumeVersionSummary = (
  application: Partial<JobApplicationVO> | null | undefined
) => {
  if (!application) return false
  return (
    hasOwn(application, 'resumeId') ||
    hasOwn(application, 'resumeVersionNo') ||
    hasOwn(application, 'resumeVersionName') ||
    hasOwn(application, 'resumeVersionCurrentFlag')
  )
}

export const hasBackendLatestEventSummary = (
  application: Partial<JobApplicationVO> | null | undefined
) => {
  if (!application) return false
  return (
    hasOwn(application, 'latestEventId') ||
    hasOwn(application, 'latestEventType') ||
    hasOwn(application, 'latestEventTime') ||
    hasOwn(application, 'latestEventSummary')
  )
}

const getApplicationEventSortDate = (event: JobApplicationEventVO): Date | undefined =>
  ensureLocalDate(event.eventTime) || ensureLocalDate(event.createdAt) || ensureLocalDate(event.updatedAt)

const getLatestApplicationEventDate = (application: Partial<JobApplicationVO> | null | undefined) =>
  ensureLocalDate(application?.latestEventTime) ||
  ensureLocalDate(application?.updatedAt) ||
  ensureLocalDate(application?.createdAt)

const toTimelineEvent = (event: JobApplicationEventVO): ApplicationTimelineEvent => {
  const normalizedType = normalizeEventType(event.eventType)
  const meta = getApplicationEventMeta(normalizedType)
  const date = getApplicationEventSortDate(event)
  return {
    ...event,
    normalizedType,
    meta,
    timeText: date ? formatLocalDateTime(date) : '--',
    summaryText: event.summary?.trim() || `已记录${meta.label}事件`,
    sortTime: date?.getTime() ?? 0
  }
}

export const normalizeApplicationStats = (stats?: Partial<JobApplicationStatsVO> | null): ApplicationStatsSummary => {
  const statusCounts = normalizeStatusCounts(stats?.statusCounts)
  const activeCount = stats?.activeCount ?? sumStatusCounts(statusCounts, [...activeStatuses])
  const interviewCount = stats?.interviewCount ?? coerceNumber(statusCounts.INTERVIEWING, 0)
  const offerCount = stats?.offerCount ?? coerceNumber(statusCounts.OFFER, 0)
  const rejectedCount = stats?.rejectedCount ?? coerceNumber(statusCounts.REJECTED, 0)
  const closedCount = stats?.closedCount ?? coerceNumber(statusCounts.CLOSED, 0)
  const total =
    stats?.total ??
    (sumStatusCounts(statusCounts, [...activeStatuses, ...terminalStatuses]) ||
      activeCount + interviewCount + offerCount + rejectedCount + closedCount)

  return {
    total: coerceNumber(total, 0),
    activeCount: coerceNumber(activeCount, 0),
    overdueFollowUpCount: coerceNumber(stats?.overdueFollowUpCount, 0),
    dueTodayFollowUpCount: coerceNumber(stats?.dueTodayFollowUpCount, 0),
    noFollowUpCount: coerceNumber(stats?.noFollowUpCount, 0),
    staleActiveCount: coerceNumber(stats?.staleActiveCount, 0),
    interviewCount: coerceNumber(interviewCount, 0),
    offerCount: coerceNumber(offerCount, 0),
    rejectedCount: coerceNumber(rejectedCount, 0),
    closedCount: coerceNumber(closedCount, 0),
    statusCounts,
    generatedAt: stats?.generatedAt
  }
}

export const buildApplicationWorkbenchOverview = (stats?: Partial<JobApplicationStatsVO> | null): ApplicationWorkbenchOverview => {
  const normalized = normalizeApplicationStats(stats)

  return {
    stats: normalized,
    stageCards: [
      buildStageCard('total', normalized.total),
      buildStageCard('active', normalized.activeCount),
      buildStageCard('interviewing', normalized.interviewCount),
      buildStageCard('offer', normalized.offerCount),
      buildStageCard('rejected', normalized.rejectedCount),
      buildStageCard('closed', normalized.closedCount)
    ],
    followUpCards: [
      buildStageCard('follow-up-overdue', normalized.overdueFollowUpCount),
      buildStageCard('follow-up-due-today', normalized.dueTodayFollowUpCount),
      buildStageCard('follow-up-missing', normalized.noFollowUpCount),
      buildStageCard('follow-up-stale', normalized.staleActiveCount)
    ]
  }
}

export const buildApplicationFunnelStages = (
  applications: Partial<JobApplicationVO>[] = [],
  stats?: Partial<JobApplicationStatsVO> | null
): ApplicationFunnelStage[] => {
  const normalizedStats = normalizeApplicationStats(stats)
  const normalizedApplications = applications || []
  const applicationStatusCounts = normalizedApplications.reduce<Record<string, number>>((counts, item) => {
    const status = normalizeStatus(item.status)
    if (status) counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const statusCounts = Object.keys(normalizedStats.statusCounts).length
    ? normalizedStats.statusCounts
    : applicationStatusCounts
  const countStatus = (statuses: string[]) => sumStatusCounts(statusCounts, statuses)
  const hasLatestEvent = (application: Partial<JobApplicationVO>) =>
    Boolean(application.latestEventId || application.latestEventType || application.latestEventTime || application.latestEventSummary)
  const feedbackCount = normalizedApplications.filter((item) => {
    const status = normalizeStatus(item.status)
    return status !== 'SAVED' && hasLatestEvent(item)
  }).length
  const reviewedCount = normalizedApplications.filter((item) => {
    const eventType = normalizeEventType(item.latestEventType)
    const latestSummary = String(item.latestEventSummary || '').trim()
    return ['REVIEW', 'REVIEWED', 'RETROSPECTIVE'].includes(eventType) || latestSummary.includes('复盘')
  }).length
  const counts: Record<ApplicationFunnelStageKey, number> = {
    TARGET_POOL: countStatus(['SAVED']),
    PREPARING: countStatus(['PREPARING']),
    APPLIED: countStatus(['APPLIED']),
    FEEDBACK: feedbackCount,
    INTERVIEW: normalizedStats.interviewCount || countStatus(['INTERVIEWING']),
    RESULT: countStatus(resultStatuses),
    REVIEWED: reviewedCount
  }

  return (Object.keys(funnelStageMeta) as ApplicationFunnelStageKey[]).map((key) => ({
    ...funnelStageMeta[key],
    count: coerceNumber(counts[key], 0)
  }))
}

export const getApplicationEventMeta = (eventType?: string | null): ApplicationEventMeta => {
  const normalizedType = normalizeEventType(eventType)
  return applicationEventMeta[normalizedType] || {
    label: normalizedType,
    tone: 'info',
    description: '自定义投递事件。'
  }
}

export const buildApplicationEventTimeline = (events?: JobApplicationEventVO[] | null): ApplicationTimelineEvent[] =>
  [...(events || [])]
    .map(toTimelineEvent)
    .sort((left, right) => {
      if (left.sortTime !== right.sortTime) return right.sortTime - left.sortTime
      return Number(right.id || 0) - Number(left.id || 0)
    })

export const getLatestApplicationEvent = (events?: JobApplicationEventVO[] | null) =>
  buildApplicationEventTimeline(events)[0]

export const buildBackendLatestApplicationEvent = (
  application: Partial<JobApplicationVO> | null | undefined
): ApplicationTimelineEvent | undefined => {
  if (!application || !hasBackendLatestEventSummary(application)) return undefined
  const hasEventValue = Boolean(
    application.latestEventId ||
    application.latestEventType ||
    application.latestEventTime ||
    application.latestEventSummary
  )
  if (!hasEventValue) return undefined
  return toTimelineEvent({
    id: Number(application.latestEventId || 0),
    applicationId: application.id,
    eventType: application.latestEventType,
    eventTime: application.latestEventTime,
    summary: application.latestEventSummary
  })
}

export const getApplicationFollowUpState = (
  nextFollowUpAt?: string | Date | number | null,
  now: string | Date | number = new Date()
): ApplicationFollowUpState => {
  const next = ensureLocalDate(nextFollowUpAt)
  const reference = ensureLocalDate(now) || new Date()

  if (!next) {
    return {
      key: 'missing',
      label: '未设置跟进时间',
      tone: 'info',
      description: '这条投递还没有填写下一次跟进时间'
    }
  }

  if (next.getTime() < reference.getTime()) {
    return {
      key: 'overdue',
      label: '已过期跟进',
      tone: 'danger',
      description: `建议尽快跟进，原定时间为 ${formatLocalDateTime(next)}`,
      dueAt: formatLocalDateTime(next),
      overdueByDays: Math.max(1, Math.floor((reference.getTime() - next.getTime()) / 86400000))
    }
  }

  if (isSameLocalDay(next, reference)) {
    return {
      key: 'due-today',
      label: '今日待跟进',
      tone: 'warning',
      description: `今天需要继续跟进，计划时间为 ${formatLocalDateTime(next)}`,
      dueAt: formatLocalDateTime(next),
      dueInDays: 0
    }
  }

  const dueInDays = Math.max(0, Math.ceil((next.getTime() - reference.getTime()) / 86400000))
  return {
    key: 'upcoming',
    label: '待跟进',
    tone: 'success',
    description: `下一次跟进安排在 ${formatLocalDateTime(next)}`,
    dueAt: formatLocalDateTime(next),
    dueInDays
  }
}

const applicationTargetLabel = (application: Partial<JobApplicationVO>) => {
  const company = application.companyName?.trim() || '对方团队'
  const job = application.jobTitle?.trim() || '目标岗位'
  return { company, job, label: `${company} · ${job}` }
}

const compactLines = (lines: string[]) => lines.join('\n').trim()

const buildReviewJson = (review: Record<string, unknown>) => JSON.stringify(review, null, 2)

const applicationEventReviewOwners = new Set<ApplicationEventReviewOwner>([
  'USER',
  'SYSTEM',
  'AI',
  'RULE',
  'LEGACY'
])

const asApplicationReviewRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const asApplicationReviewString = (value: unknown) =>
  value == null ? '' : String(value).trim()

const asApplicationReviewStringArray = (value: unknown, limit = 20) =>
  (Array.isArray(value) ? value : [])
    .map(asApplicationReviewString)
    .filter(Boolean)
    .slice(0, limit)

const asApplicationReviewNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const asApplicationReviewOwner = (
  value: unknown,
  fallback: ApplicationEventReviewOwner
): ApplicationEventReviewOwner => {
  const owner = asApplicationReviewString(value).toUpperCase() as ApplicationEventReviewOwner
  return applicationEventReviewOwners.has(owner) ? owner : fallback
}

const asApplicationReviewFact = (
  value: unknown,
  fallbackOwner: ApplicationEventReviewOwner
): ApplicationEventReviewFact | undefined => {
  if (typeof value === 'string') {
    const content = value.trim()
    return content ? { content, owner: fallbackOwner } : undefined
  }

  const fact = asApplicationReviewRecord(value)
  const content = asApplicationReviewString(fact.content)
  if (!content) return undefined
  return {
    id: asApplicationReviewString(fact.id) || undefined,
    content,
    owner: asApplicationReviewOwner(fact.owner, fallbackOwner),
    sourceType: asApplicationReviewString(fact.sourceType) || undefined
  }
}

const asApplicationReviewFacts = (
  value: unknown,
  fallbackOwner: ApplicationEventReviewOwner
) => (Array.isArray(value) ? value : [])
  .map((item) => asApplicationReviewFact(item, fallbackOwner))
  .filter((item): item is ApplicationEventReviewFact => Boolean(item))

const parseApplicationReviewJson = (value?: string | null): unknown => {
  const raw = value?.trim()
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

const normalizeApplicationEventStructuredReview = (
  value: unknown
): ApplicationEventStructuredReview | undefined => {
  const root = asApplicationReviewRecord(value)
  if (!Object.keys(root).length) return undefined

  const userInput = asApplicationReviewRecord(root.userInput)
  const rawSystemFacts = Array.isArray(root.systemFacts)
    ? root.systemFacts
    : asApplicationReviewRecord(root.systemFacts).items
  const analysis = asApplicationReviewRecord(root.analysis)
  const generation = asApplicationReviewRecord(root.generation)
  const externalFeedback = asApplicationReviewFact(userInput.externalFeedback, 'USER')
  const analysisOwner = asApplicationReviewOwner(analysis.owner, 'AI')

  return {
    schemaVersion: asApplicationReviewString(root.schemaVersion) || undefined,
    scenario: asApplicationReviewString(root.scenario) || undefined,
    eventScope: asApplicationReviewString(root.eventScope) || undefined,
    userInput: {
      owner: asApplicationReviewOwner(userInput.owner, 'USER'),
      observedFacts: asApplicationReviewFacts(userInput.observedFacts, 'USER'),
      externalFeedback,
      selfReflection: asApplicationReviewString(userInput.selfReflection) || undefined
    },
    systemFacts: asApplicationReviewFacts(rawSystemFacts, 'SYSTEM'),
    analysis: {
      owner: analysisOwner,
      summary: asApplicationReviewString(analysis.summary) || undefined,
      limits: asApplicationReviewStringArray(analysis.limits, 20),
      signals: (Array.isArray(analysis.signals) ? analysis.signals : [])
        .map((value): ApplicationEventReviewSignal | undefined => {
          const signal = asApplicationReviewRecord(value)
          const content = asApplicationReviewString(signal.content)
          if (!content) return undefined
          return {
            content,
            factRefs: asApplicationReviewStringArray(signal.factRefs, 20),
            confidenceLevel: asApplicationReviewString(signal.confidenceLevel) || undefined,
            owner: asApplicationReviewOwner(signal.owner, analysisOwner)
          }
        })
        .filter((item): item is ApplicationEventReviewSignal => Boolean(item)),
      adjustments: asApplicationReviewStringArray(analysis.adjustments, 20),
      nextActions: asApplicationReviewStringArray(analysis.nextActions, 20)
    },
    generation: {
      owner: asApplicationReviewOwner(generation.owner, 'SYSTEM'),
      status: asApplicationReviewString(generation.status) || undefined,
      fallback: generation.fallback === true,
      fallbackReason: asApplicationReviewString(generation.fallbackReason) || undefined,
      confidenceLevel: asApplicationReviewString(generation.confidenceLevel) || undefined,
      confidenceBasis: asApplicationReviewStringArray(generation.confidenceBasis, 20),
      aiCallLogId: asApplicationReviewNumber(generation.aiCallLogId),
      inputFingerprint: asApplicationReviewString(generation.inputFingerprint) || undefined,
      requestId: asApplicationReviewString(generation.requestId) || undefined,
      generatorVersion: asApplicationReviewString(generation.generatorVersion) || undefined,
      startedAt: asApplicationReviewString(generation.startedAt) || undefined,
      generatedAt: asApplicationReviewString(generation.generatedAt) || undefined
    }
  }
}

export const getApplicationEventReviewScenario = (
  eventType?: string | null
): ApplicationEventReviewScenario | undefined => {
  const normalized = normalizeEventType(eventType)
  if (['INTERVIEW_COMPLETED', 'INTERVIEW_FEEDBACK_REVIEW'].includes(normalized)) {
    return 'INTERVIEW_COMPLETED'
  }
  if (['REJECTION', 'REJECTED', 'REJECTION_REVIEW'].includes(normalized)) {
    return 'REJECTION'
  }
  if (normalized === 'NO_RESPONSE_REVIEW') {
    return 'NO_RESPONSE'
  }
  return undefined
}

export const isApplicationEventReviewSupported = (eventType?: string | null) =>
  Boolean(getApplicationEventReviewScenario(eventType))

export const buildApplicationEventReviewSeed = (
  application: Partial<JobApplicationVO>,
  scenario: ApplicationEventReviewScenario
): ApplicationEventReviewSeed => {
  const latestEvent = buildBackendLatestApplicationEvent(application)
  const latestFact = latestEvent
    ? `${latestEvent.meta.label}：${latestEvent.summaryText}`
    : ''

  if (scenario === 'REJECTION') {
    return {
      scenario,
      observedFacts: ['已收到明确拒信或淘汰结果。', latestFact].filter(Boolean),
      externalFeedback: '',
      selfReflection: '',
      assumptions: ['当前记录不足以判断真实淘汰原因。'],
      nextExperimentInputs: ['复查岗位关键词匹配', '补强一个可量化项目证据', '复核投递渠道质量']
    }
  }

  if (scenario === 'NO_RESPONSE') {
    return {
      scenario,
      observedFacts: ['截至当前仍未收到明确反馈。', latestFact].filter(Boolean),
      externalFeedback: '',
      selfReflection: '',
      assumptions: ['无反馈不等于拒绝，也不能据此判断岗位已关闭。'],
      nextExperimentInputs: ['调整一次跟进文案', '复核跟进间隔', '验证投递渠道是否有效']
    }
  }

  return {
    scenario,
    observedFacts: ['已完成一次面试或面试后反馈记录。', latestFact].filter(Boolean),
    externalFeedback: '',
    selfReflection: '',
    assumptions: ['用户转述和自我感受不能替代招聘方已验证事实。'],
    nextExperimentInputs: ['补强一个薄弱题型', '更新一个项目复盘话术', '安排一次针对性复练']
  }
}

export const normalizeApplicationEventReviewFactLines = (
  value?: string[] | string | null
) => {
  const rawItems = Array.isArray(value) ? value : String(value || '').split(/\r?\n/)
  const unique = new Set<string>()
  rawItems.forEach((item) => {
    const content = String(item || '').trim().slice(0, 300)
    if (content) unique.add(content)
  })
  return Array.from(unique).slice(0, 10)
}

export const createApplicationEventReviewRequestId = () => {
  const randomUuid = globalThis.crypto?.randomUUID
  if (typeof randomUuid === 'function') {
    return randomUuid.call(globalThis.crypto)
  }
  return `application-review-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const buildApplicationEventReviewGenerateRequest = (
  input: ApplicationEventReviewGenerateInput = {},
  options: { force?: boolean; requestId?: string } = {}
): ApplicationEventReviewGenerateRequest => ({
  observedFacts: normalizeApplicationEventReviewFactLines(input.observedFacts),
  externalFeedback: input.externalFeedback?.trim().slice(0, 2000) || undefined,
  selfReflection: input.selfReflection?.trim().slice(0, 2000) || undefined,
  force: options.force === true,
  requestId: options.requestId?.trim().slice(0, 64) || createApplicationEventReviewRequestId()
})

export const getApplicationEventStructuredReview = (
  event?: Partial<JobApplicationEventVO> | null
) => {
  if (!event) return undefined
  const eventRecord = event as Partial<JobApplicationEventVO> & { structuredReview?: unknown }
  const parsedReviewJson = parseApplicationReviewJson(event.reviewJson)
  const parsedRecord = asApplicationReviewRecord(parsedReviewJson)
  const candidates = [
    eventRecord.structuredReview,
    asApplicationReviewRecord(event.review).structuredReview,
    parsedRecord.structuredReview,
    parsedRecord.schemaVersion || parsedRecord.analysis || parsedRecord.generation
      ? parsedRecord
      : undefined
  ]

  for (const candidate of candidates) {
    const normalized = normalizeApplicationEventStructuredReview(candidate)
    if (normalized) return normalized
  }
  return undefined
}

export const getApplicationEventLegacyReview = (
  event?: Partial<JobApplicationEventVO> | null
): Record<string, unknown> | string | null => {
  if (!event) return null
  const review = asApplicationReviewRecord(event.review)
  if (Object.keys(review).length) {
    const { structuredReview: _structuredReview, ...legacyReview } = review
    return Object.keys(legacyReview).length ? legacyReview : null
  }

  const parsed = parseApplicationReviewJson(event.reviewJson)
  if (typeof parsed === 'string') return parsed
  const parsedRecord = asApplicationReviewRecord(parsed)
  if (!Object.keys(parsedRecord).length) return null
  const { structuredReview: _structuredReview, ...legacyReview } = parsedRecord
  return Object.keys(legacyReview).length ? legacyReview : null
}

export const getApplicationReviewOwnerLabel = (owner?: string | null) => {
  const labels: Record<ApplicationEventReviewOwner, string> = {
    USER: '用户记录',
    SYSTEM: '系统事实',
    AI: 'AI 分析',
    RULE: '规则降级',
    LEGACY: '历史数据'
  }
  return labels[asApplicationReviewOwner(owner, 'LEGACY')]
}

export const getApplicationReviewConfidenceLabel = (confidence?: string | null) => {
  const normalized = asApplicationReviewString(confidence).toUpperCase()
  if (normalized === 'HIGH') return '高置信度'
  if (normalized === 'MEDIUM') return '中置信度'
  if (normalized === 'LOW') return '低置信度'
  return confidence?.trim() || '置信度待确认'
}

export const isApplicationEventReviewGenerating = (
  review?: ApplicationEventStructuredReview | null
) => review?.generation.status?.toUpperCase() === 'GENERATING'

export const getApplicationEventReviewFactMap = (
  review?: ApplicationEventStructuredReview | null
) => new Map(
  [
    ...(review?.userInput.observedFacts || []),
    ...(review?.userInput.externalFeedback ? [review.userInput.externalFeedback] : []),
    ...(review?.systemFacts || [])
  ]
    .filter((fact) => fact.id)
    .map((fact) => [fact.id as string, fact])
)

export const saveApplicationEventWithOptionalReview = async <
  TEvent extends { id: number },
  TReview = ApplicationEventStructuredReview
>(options: {
  saveEvent: () => Promise<TEvent>
  generateReview?: (event: TEvent) => Promise<TReview>
}): Promise<ApplicationEventReviewSaveResult<TEvent, TReview>> => {
  const event = await options.saveEvent()
  if (!options.generateReview) return { event }
  try {
    return { event, review: await options.generateReview(event) }
  } catch (reviewError) {
    return { event, reviewError }
  }
}

export const createApplicationEventReviewSingleFlight = () => {
  const inFlight = new Map<string | number, Promise<unknown>>()
  return {
    isRunning: (key: string | number) => inFlight.has(key),
    run<T>(key: string | number, task: () => Promise<T>): Promise<T> {
      const active = inFlight.get(key) as Promise<T> | undefined
      if (active) return active
      const request = task().finally(() => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key)
        }
      })
      inFlight.set(key, request)
      return request
    }
  }
}

export const buildApplicationOutboundDraft = (
  application: Partial<JobApplicationVO>,
  kind: ApplicationDraftKind,
  now: string | Date | number = new Date()
): ApplicationOutboundDraft => {
  const target = applicationTargetLabel(application)
  const generatedAt = formatLocalDateTime(ensureLocalDate(now) || new Date())
  const latestEvent = buildBackendLatestApplicationEvent(application)
  const latestEventSummary = latestEvent ? `${latestEvent.meta.label}：${latestEvent.summaryText}` : '暂无事件记录'
  const followUp = getApplicationFollowUpState(application.nextFollowUpAt, now)
  const boundaryNotice = '系统只生成草稿和复盘记录，不会自动发送邮件、站内信或其他外部联系；请用户自行确认、修改并发送。'
  const baseReview = {
    source: 'APPLICATION_POST_SUBMISSION_ASSISTANT',
    draftOnly: true,
    generatedAt,
    companyName: target.company,
    jobTitle: target.job,
    latestEvent: latestEventSummary
  }

  if (kind === 'thank-you') {
    const review = {
      ...baseReview,
      scenario: 'INTERVIEW_THANK_YOU_DRAFT',
      nextStep: '用户确认措辞、面试官称呼和事实后自行发送感谢信。'
    }
    return {
      kind,
      title: '感谢信草稿',
      eventType: 'THANK_YOU_DRAFT',
      summary: `生成 ${target.label} 面试后感谢信草稿，等待用户确认后自行发送。`,
      draftBody: compactLines([
        `您好，感谢您今天/近期安排 ${target.job} 的面试交流。`,
        '',
        '这次沟通让我对团队业务、岗位职责和后续协作方式有了更清晰的理解。我也很高兴进一步说明了自己的项目经验和对该方向的兴趣。',
        '',
        '如果后续还需要补充材料或更多信息，我会及时配合。再次感谢您的时间，期待下一步反馈。',
        '',
        '此草稿由系统生成，请你确认称呼、面试日期、事实细节和语气后自行发送。'
      ]),
      review,
      reviewJson: buildReviewJson(review),
      boundaryNotice,
      experimentInput: ['面试后 24 小时内是否发送感谢信', '感谢信中补充的项目证据是否提升后续反馈率']
    }
  }

  if (kind === 'rejection-review') {
    const seed = buildApplicationEventReviewSeed(application, 'REJECTION')
    const review = {
      ...baseReview,
      scenario: 'REJECTION_REVIEW',
      result: '收到拒信或被淘汰',
      facts: seed.observedFacts,
      assumptions: seed.assumptions,
      nextExperimentInputs: seed.nextExperimentInputs
    }
    return {
      kind,
      title: '拒信复盘',
      eventType: 'REJECTION_REVIEW',
      summary: `记录 ${target.label} 拒信复盘，沉淀下一轮投递实验输入。`,
      draftBody: compactLines([
        `复盘对象：${target.label}`,
        '结果：收到拒信或被淘汰。',
        '先记录事实，不把单次结果归因到个人能力结论。',
        '下一轮实验：复查岗位关键词、简历证据和投递渠道，选择一个变量调整后再观察。'
      ]),
      review,
      reviewJson: buildReviewJson(review),
      boundaryNotice,
      experimentInput: seed.nextExperimentInputs
    }
  }

  if (kind === 'no-response-review') {
    const seed = buildApplicationEventReviewSeed(application, 'NO_RESPONSE')
    const review = {
      ...baseReview,
      scenario: 'NO_RESPONSE_REVIEW',
      result: '超过计划跟进时间仍无反馈',
      followUpState: followUp.key,
      facts: seed.observedFacts,
      assumptions: seed.assumptions,
      nextExperimentInputs: seed.nextExperimentInputs
    }
    return {
      kind,
      title: '无反馈复盘',
      eventType: 'NO_RESPONSE_REVIEW',
      summary: `记录 ${target.label} 无反馈复盘，保留跟进与渠道实验输入。`,
      draftBody: compactLines([
        `复盘对象：${target.label}`,
        `当前状态：${followUp.description}`,
        '事实：暂未收到明确反馈。',
        '下一轮实验：保留一次轻量跟进，同时检查渠道、岗位发布时间和简历关键词匹配。'
      ]),
      review,
      reviewJson: buildReviewJson(review),
      boundaryNotice,
      experimentInput: seed.nextExperimentInputs
    }
  }

  if (kind === 'interview-feedback-review') {
    const seed = buildApplicationEventReviewSeed(application, 'INTERVIEW_COMPLETED')
    const review = {
      ...baseReview,
      scenario: 'INTERVIEW_FEEDBACK_REVIEW',
      result: '面试后反馈待沉淀',
      facts: seed.observedFacts,
      assumptions: seed.assumptions,
      nextExperimentInputs: seed.nextExperimentInputs
    }
    return {
      kind,
      title: '面试反馈复盘',
      eventType: 'INTERVIEW_FEEDBACK_REVIEW',
      summary: `记录 ${target.label} 面试后反馈复盘，沉淀复练和下一轮实验输入。`,
      draftBody: compactLines([
        `复盘对象：${target.label}`,
        `已有线索：${latestEventSummary}`,
        '事实：面试后反馈需要拆成可行动项。',
        '下一轮实验：选择一个薄弱点做复练，并把项目案例补成 STAR/指标化表达。'
      ]),
      review,
      reviewJson: buildReviewJson(review),
      boundaryNotice,
      experimentInput: seed.nextExperimentInputs
    }
  }

  const review = {
    ...baseReview,
    scenario: 'FOLLOW_UP_DRAFT',
    followUpState: followUp.key,
    nextStep: '用户确认事实、语气和收件人后自行发送跟进信。'
  }
  return {
    kind: 'follow-up',
    title: '跟进信草稿',
    eventType: 'OUTBOUND_FOLLOW_UP_DRAFT',
    summary: `生成 ${target.label} 跟进信草稿，等待用户确认后自行发送。`,
    draftBody: compactLines([
      `您好，想跟进一下我此前投递的 ${target.job} 岗位进展。`,
      '',
      '我对这个方向仍然很感兴趣，也愿意补充更多项目材料或完成后续流程。若目前流程已有更新，烦请方便时告知我下一步安排。',
      '',
      '感谢您的时间。',
      '',
      '此草稿由系统生成，请你确认收件人、投递时间、事实细节和语气后自行发送。'
    ]),
    review,
    reviewJson: buildReviewJson(review),
    boundaryNotice,
    experimentInput: ['跟进时间点', '跟进文案语气', '是否补充项目证据', '跟进后反馈状态']
  }
}

export const getApplicationStatusFromEventType = (eventType?: string | null) => {
  const normalized = normalizeEventType(eventType)
  if (['APPLIED', 'SUBMITTED', 'APPLICATION_SUBMITTED'].includes(normalized)) return 'APPLIED'
  if (normalized === 'INTERVIEW' || normalized.startsWith('INTERVIEW_')) return 'INTERVIEWING'
  if (['OFFER', 'OFFER_RECEIVED'].includes(normalized)) return 'OFFER'
  if (['REJECTION', 'REJECTED'].includes(normalized)) return 'REJECTED'
  if (normalized === 'CLOSED') return 'CLOSED'
  return undefined
}

export const getApplicationStatusRank = (status?: string | null) => {
  const ranks: Record<string, number> = {
    SAVED: 0,
    PREPARING: 1,
    APPLIED: 2,
    INTERVIEWING: 3,
    OFFER: 4,
    REJECTED: 5,
    CLOSED: 6
  }
  const normalized = normalizeStatus(status)
  return normalized ? ranks[normalized] : undefined
}

export const canApplyApplicationEventStatusChange = (currentStatus?: string | null, nextStatus?: string | null) => {
  if (!nextStatus) return false
  const current = normalizeStatus(currentStatus)
  const next = normalizeStatus(nextStatus)
  if (!next || current === next) return false
  const currentRank = getApplicationStatusRank(current)
  const nextRank = getApplicationStatusRank(next)
  return nextRank != null && (currentRank == null || nextRank > currentRank)
}

export const getApplicationDataQualityTags = (
  application: Partial<JobApplicationVO>,
  now: string | Date | number = new Date()
): ApplicationDataQualityTag[] => {
  const tags: ApplicationDataQualityTag[] = []
  const active = isApplicationActiveStatus(application.status)

  if (!application.resumeVersionId) {
    tags.push({
      key: 'missing-resume-version',
      label: '未绑定简历版本',
      tone: 'warning',
      description: '这条记录暂时缺少投递时使用的简历版本，后续复盘只能作为事实记录。'
    })
  }

  if (!application.latestEventId && !application.latestEventType && !application.latestEventTime && !application.latestEventSummary) {
    tags.push({
      key: 'no-event',
      label: '无事件记录',
      tone: 'info',
      description: '还没有记录投递、跟进、面试或结果事件。'
    })
  }

  if (active) {
    const followUp = getApplicationFollowUpState(application.nextFollowUpAt, now)
    if (followUp.key === 'overdue') {
      tags.push({
        key: 'follow-up-overdue',
        label: '逾期跟进',
        tone: 'danger',
        description: '跟进时间已经过期，这是执行提醒，不代表岗位质量或个人能力结论。'
      })
    } else if (followUp.key === 'due-today') {
      tags.push({
        key: 'follow-up-due-today',
        label: '今日跟进',
        tone: 'warning',
        description: '今天需要继续跟进，可作为今日行动候选。'
      })
    } else if (followUp.key === 'missing') {
      tags.push({
        key: 'follow-up-missing',
        label: '未设置跟进',
        tone: 'info',
        description: '尚未填写下一次跟进时间。'
      })
    }

    const reference = ensureLocalDate(now) || new Date()
    const latestDate = getLatestApplicationEventDate(application)
    if (latestDate && reference.getTime() - latestDate.getTime() >= staleActiveDays * 86400000) {
      tags.push({
        key: 'stale-active',
        label: '久未更新',
        tone: 'warning',
        description: '这条活跃投递已较久没有更新，建议复核当前状态。'
      })
    }
  }

  return tags
}

export const formatApplicationResumeVersionLabel = (
  input?: ApplicationResumeVersionLabelInput | number | null
): string => {
  if (input === undefined || input === null) {
    return '未关联简历版本'
  }

  if (typeof input === 'number') {
    return `简历版本 #${input}`
  }

  const versionLabel =
    input.versionName?.trim() ||
    (input.versionNo !== undefined && input.versionNo !== null ? `V${input.versionNo}` : '') ||
    (input.resumeVersionId !== undefined && input.resumeVersionId !== null
      ? `简历版本 #${input.resumeVersionId}`
      : '')
  const resumeLabel = input.resumeName?.trim() || input.resumeTitle?.trim() || ''
  const currentSuffix = input.currentFlag === true || input.currentFlag === 1 ? '（当前版本）' : ''

  if (!versionLabel && !resumeLabel) {
    return '未关联简历版本'
  }

  if (resumeLabel && versionLabel) {
    return `${resumeLabel} · ${versionLabel}${currentSuffix}`
  }

  return versionLabel ? `${versionLabel}${currentSuffix}` : resumeLabel
}

export const buildApplicationInterviewRoute = (context: ApplicationWorkbenchContext): ApplicationRouteLocation => {
  return {
    path: '/interviews/create',
    query: {
      source: context.source || 'applications',
      applicationId: context.applicationId,
      targetJobId: context.targetJobId ?? undefined,
      resumeId: context.resumeId ?? undefined,
      resumeVersionId: context.resumeVersionId ?? undefined,
      matchReportId: context.matchReportId ?? undefined
    }
  }
}

export const buildApplicationResumeVersionRoute = (context: ApplicationWorkbenchContext): ApplicationRouteLocation => {
  if (context.resumeId) {
    return {
      path: `/resumes/${context.resumeId}/versions`,
      query: {
        applicationId: context.applicationId,
        versionId: context.resumeVersionId ?? undefined
      }
    }
  }

  return {
    path: '/resume-versions',
    query: {
      applicationId: context.applicationId,
      versionId: context.resumeVersionId ?? undefined
    }
  }
}

export const buildApplicationFollowUpRoute = (context: ApplicationWorkbenchContext): ApplicationRouteLocation => ({
  path: '/applications',
  query: {
    applicationId: context.applicationId,
    openEvents: 1,
    action: 'create-event',
    eventType: 'FOLLOW_UP',
    eventTime: context.nextFollowUpAt || context.eventTime || undefined
  }
})

export const buildApplicationQuickActionRoute = (
  action: ApplicationQuickActionKey,
  context: ApplicationWorkbenchContext
) => {
  if (action === 'interview') {
    return buildApplicationInterviewRoute(context)
  }
  if (action === 'resume-version') {
    return buildApplicationResumeVersionRoute(context)
  }
  return buildApplicationFollowUpRoute(context)
}

export const buildApplicationQuickActionRoutes = (context: ApplicationWorkbenchContext) => ({
  interview: buildApplicationInterviewRoute(context),
  resumeVersion: buildApplicationResumeVersionRoute(context),
  followUp: buildApplicationFollowUpRoute(context)
})

export const isApplicationActiveStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status)
  return Boolean(normalized && activeStatuses.has(normalized))
}

export const isApplicationTerminalStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status)
  return Boolean(normalized && terminalStatuses.has(normalized))
}

export const getApplicationStageMeta = (status?: string | null): ApplicationStageMeta => {
  const normalized = normalizeStatus(status)
  return (normalized && applicationStatusMeta[normalized]) || {
    label: status || '未设置',
    tone: 'info',
    description: '当前阶段暂未归类。'
  }
}

export const shouldShowApplicationForFollowUpFilter = (
  application: Pick<JobApplicationVO, 'nextFollowUpAt' | 'status'>,
  filter: ApplicationFollowUpFilter,
  now: string | Date | number = new Date()
) => {
  if (!filter || filter === 'all') return true
  if (!isApplicationActiveStatus(application.status)) return false
  return getApplicationFollowUpState(application.nextFollowUpAt, now).key === filter
}

export const shouldShowApplicationForFunnelStage = (
  application: Partial<JobApplicationVO>,
  stageKey?: ApplicationFunnelStageKey | ''
) => {
  if (!stageKey) return true
  const normalizedStatus = normalizeStatus(application.status)
  const meta = funnelStageMeta[stageKey]
  if (!meta) return true
  if (meta.sourceStatuses.includes(normalizedStatus || '')) return true
  const normalizedEventType = normalizeEventType(application.latestEventType)
  if (stageKey === 'FEEDBACK') {
    return normalizedStatus !== 'SAVED' && Boolean(application.latestEventId || application.latestEventType || application.latestEventTime || application.latestEventSummary)
  }
  if (stageKey === 'REVIEWED') {
    return ['REVIEW', 'REVIEWED', 'RETROSPECTIVE'].includes(normalizedEventType) || String(application.latestEventSummary || '').includes('复盘')
  }
  return meta.sourceEventTypes.includes(normalizedEventType)
}

export const filterApplicationsByFollowUp = (
  applications: JobApplicationVO[],
  filter: ApplicationFollowUpFilter,
  now: string | Date | number = new Date()
) => applications.filter((item) => shouldShowApplicationForFollowUpFilter(item, filter, now))

export const getDueFollowUpApplications = (
  applications: JobApplicationVO[],
  now: string | Date | number = new Date()
) => applications
  .filter((item) => {
    if (!isApplicationActiveStatus(item.status)) return false
    const key = getApplicationFollowUpState(item.nextFollowUpAt, now).key
    return key === 'overdue' || key === 'due-today'
  })
  .sort((left, right) => {
    const leftState = getApplicationFollowUpState(left.nextFollowUpAt, now).key
    const rightState = getApplicationFollowUpState(right.nextFollowUpAt, now).key
    if (leftState !== rightState) return leftState === 'overdue' ? -1 : 1
    return String(left.nextFollowUpAt || '').localeCompare(String(right.nextFollowUpAt || ''))
  })

export const summarizeApplicationStatus = (application?: Pick<JobApplicationVO, 'status' | 'nextFollowUpAt' | 'resumeVersionId'> | null) => ({
  status: normalizeStatus(application?.status) || 'UNKNOWN',
  stage: getApplicationStageMeta(application?.status),
  active: isApplicationActiveStatus(application?.status),
  terminal: isApplicationTerminalStatus(application?.status),
  followUp: getApplicationFollowUpState(application?.nextFollowUpAt),
  resumeVersionLabel: formatApplicationResumeVersionLabel(application?.resumeVersionId || null)
})

export const parseApplicationListQuery = (
  query: Record<string, unknown>,
  allowedStatuses: string[] = applicationStatusOptions.map((item) => item.value)
): ApplicationListQueryState => {
  const rawStatus = normalizeQueryValue(query.status).toUpperCase()
  const status = allowedStatuses.includes(rawStatus) ? rawStatus : undefined
  const rawFollowUp = normalizeQueryValue(query.followUp) as ApplicationDeepLinkFollowUpFilter | ''
  const followUp = applicationFollowUpFilterOptions.some((item) => item.value === rawFollowUp)
    ? (rawFollowUp as ApplicationDeepLinkFollowUpFilter)
    : undefined
  const rawAction = normalizeQueryValue(query.action)
  const action = rawAction === 'create-event' ? rawAction : undefined
  const eventType = normalizeQueryValue(query.eventType).toUpperCase() || undefined
  const eventTime = normalizeQueryValue(query.eventTime) || undefined

  return {
    status,
    followUp,
    applicationId: parseQueryNumber(query.applicationId),
    openEvents: isTruthyQueryValue(query.openEvents) || Boolean(action),
    action,
    eventType,
    eventTime
  }
}
