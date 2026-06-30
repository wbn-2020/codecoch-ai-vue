import { formatLocalDateTime } from '@/utils/format'
import type { JobApplicationEventVO, JobApplicationStatsVO, JobApplicationVO } from '@/api/v4'

export type ApplicationRouteValue = string | number | undefined

export interface ApplicationRouteLocation {
  path: string
  query?: Record<string, ApplicationRouteValue>
}

export type ApplicationQuickActionKey = 'interview' | 'resume-version' | 'follow-up'

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

export interface ApplicationTimelineEvent extends JobApplicationEventVO {
  normalizedType: string
  meta: ApplicationEventMeta
  timeText: string
  summaryText: string
  sortTime: number
}

const activeStatuses = new Set(['SAVED', 'PREPARING', 'APPLIED', 'INTERVIEWING', 'OFFER'])
const terminalStatuses = new Set(['REJECTED', 'CLOSED'])

const applicationStatusMeta: Record<string, ApplicationStageMeta> = {
  SAVED: { label: '已收藏', tone: 'info', description: '岗位已进入跟踪池，适合补齐简历和投递计划。' },
  PREPARING: { label: '准备中', tone: 'warning', description: '正在准备简历、作品或投递材料。' },
  APPLIED: { label: '已投递', tone: 'primary', description: '已完成投递，等待反馈或主动跟进。' },
  INTERVIEWING: { label: '面试中', tone: 'success', description: '已进入面试阶段，建议同步面试记录。' },
  OFFER: { label: 'Offer', tone: 'success', description: '已收到 offer，记录关键结果。' },
  REJECTED: { label: '已拒绝', tone: 'danger', description: '流程已结束，适合沉淀复盘事件。' },
  CLOSED: { label: '已关闭', tone: 'info', description: '该投递已关闭，不再作为活跃跟进项。' }
}

const stageCardMeta: Record<ApplicationStageKey, Pick<ApplicationStageCard, 'label' | 'tone' | 'description'>> = {
  total: { label: '投递总数', tone: 'primary', description: '所有投递记录的汇总' },
  active: { label: '进行中', tone: 'primary', description: '仍在推进中的投递' },
  interviewing: { label: '面试中', tone: 'success', description: '已进入面试阶段' },
  offer: { label: 'Offer', tone: 'success', description: '已收到 offer 的投递' },
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
  INTERVIEW: { label: '面试', tone: 'success', description: '该投递进入或更新面试流程。' },
  INTERVIEW_SCHEDULED: { label: '面试', tone: 'success', description: '该投递进入或更新面试流程。' },
  INTERVIEW_COMPLETED: { label: '面试完成', tone: 'success', description: '面试已完成，报告或复盘结果已回流投递记录。' },
  OFFER: { label: 'Offer', tone: 'success', description: '该投递收到 Offer 结果。' },
  OFFER_RECEIVED: { label: 'Offer', tone: 'success', description: '该投递收到 Offer 结果。' },
  REJECTED: { label: '拒绝', tone: 'danger', description: '该投递已被拒绝或淘汰。' },
  REJECTION: { label: '拒绝', tone: 'danger', description: '该投递已被拒绝或淘汰。' },
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
