import {
  isResolvedNotification,
  resolveNotificationAction,
  type NotificationActionResolverOptions
} from './notifications'
import { defaultUserKnownPaths, resolveAppRoutePath } from './route-safety'

export type TodayActionSource = 'notification' | 'agent-task' | 'application-follow-up' | 'readiness'
export type TodayActionPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface TodayActionItem {
  key: string
  source: TodayActionSource
  notificationId?: number | string
  priority: TodayActionPriority
  title: string
  description: string
  reason: string
  actionLabel: string
  actionPath: string
  dueText?: string
  unread?: boolean
}

export interface TodayActionAgentTask {
  id?: number | string
  title?: string | null
  description?: string | null
  reason?: string | null
  priority?: string | null
  status?: string | null
  actionUrl?: string | null
  dueDate?: string | null
  relatedSkillName?: string | null
}

export interface TodayActionApplicationStats {
  total?: number | null
  activeCount?: number | null
  overdueFollowUpCount?: number | null
  dueTodayFollowUpCount?: number | null
  noFollowUpCount?: number | null
  staleActiveCount?: number | null
  interviewCount?: number | null
  offerCount?: number | null
}

export interface TodayActionNotification {
  id?: number | string
  title?: string | null
  content?: string | null
  type?: string | null
  isRead?: number | boolean | null
  readStatus?: number | string | boolean | null
  relatedId?: number | string | null
  relatedType?: string | null
  bizId?: number | string | null
  bizType?: string | null
  actionUrl?: string | null
  fallbackPath?: string | null
  fallbackLabel?: string | null
  planDate?: string | null
  resolvedStatus?: number | string | boolean | null
  resolvedAt?: string | null
  resolvedReason?: string | null
  createdAt?: string | null
}

export interface TodayActionReadinessNextAction {
  title?: string | null
  description?: string | null
  reason?: string | null
  label?: string | null
  path?: TodayActionRoute | null
}

export type TodayActionRoute =
  | string
  | {
      path: string
      query?: Record<string, string | number | undefined>
    }

export interface BuildTodayActionsInput {
  agentTasks?: TodayActionAgentTask[] | null
  applicationStats?: TodayActionApplicationStats | null
  notifications?: TodayActionNotification[] | null
  readinessNextAction?: TodayActionReadinessNextAction | null
  readinessAction?: TodayActionReadinessNextAction | null
}

export interface BuildTodayActionsOptions {
  maxItems?: number
  notificationResolver?: NotificationActionResolverOptions
}

type RankedTodayActionItem = TodayActionItem & {
  rank: number
  dedupeKeys: string[]
}

const defaultMaxItems = 5
const minDashboardItems = 3
const maxDashboardItems = 5

const priorityWeight: Record<TodayActionPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
}

const toToken = (value?: string | null) => String(value || '').trim().toUpperCase().replace(/[.-]/g, '_')

const toText = (value?: string | number | null) => String(value ?? '').trim()

const coerceCount = (value: unknown) => {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

const isUnread = (notification: TodayActionNotification) => {
  if (notification.isRead === 0 || notification.isRead === false) return true
  const status = toToken(String(notification.readStatus ?? ''))
  return Boolean(status && status !== 'READ' && status !== '1')
}

const isOpenAgentTask = (task: TodayActionAgentTask) => {
  const status = toToken(task.status)
  return status !== 'DONE' && status !== 'SKIPPED' && status !== 'EXPIRED'
}

const clampDashboardLimit = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return defaultMaxItems
  return Math.min(maxDashboardItems, Math.max(minDashboardItems, Math.floor(parsed)))
}

const normalizePath = (path?: string | null, fallback = '/notifications') => {
  const text = toText(path)
  return text.startsWith('/') ? text : fallback
}

const routeToPath = (route?: TodayActionRoute | null, fallback = '/agent/today') => {
  if (!route) return fallback
  if (typeof route === 'string') return normalizePath(route, fallback)

  const path = normalizePath(route.path, fallback)
  const query = Object.entries(route.query || {})
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  return query ? `${path}?${query}` : path
}

const getNotificationType = (notification: TodayActionNotification) => toToken(notification.type || notification.bizType)

const getNotificationBizType = (notification: TodayActionNotification) =>
  toToken(notification.bizType || notification.relatedType)

const getNotificationBizId = (notification: TodayActionNotification) =>
  toText(notification.bizId ?? notification.relatedId)

const resolveNotificationActionPath = (
  notification: TodayActionNotification,
  options?: NotificationActionResolverOptions
) => {
  const action = resolveNotificationAction(notification as Parameters<typeof resolveNotificationAction>[0], options)
  if (action.kind === 'route') return action.path
  return notification.fallbackPath ? normalizePath(notification.fallbackPath, '/notifications') : undefined
}

const getApplicationFollowUpBucket = (path?: string | null, title?: string | null, content?: string | null) => {
  const text = `${path || ''} ${title || ''} ${content || ''}`.toLowerCase()
  if (text.includes('followup=overdue') || text.includes('overdue') || text.includes('expired')) return 'overdue'
  if (text.includes('followup=due-today') || text.includes('due-today') || text.includes('today')) return 'due-today'
  return undefined
}

const notificationPriority = (notification: TodayActionNotification, actionPath: string): TodayActionPriority => {
  const type = getNotificationType(notification)
  const bizType = getNotificationBizType(notification)
  if (type === 'APPLICATION_FOLLOW_UP_REMINDER' || bizType === 'JOB_APPLICATION') {
    return getApplicationFollowUpBucket(actionPath, notification.title, notification.content) === 'overdue' ? 'urgent' : 'high'
  }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return 'high'
  if (type === 'AGENT_REMINDER' || bizType.startsWith('AGENT_')) return 'high'
  if (isUnread(notification)) return 'normal'
  return 'low'
}

const notificationRank = (notification: TodayActionNotification, priority: TodayActionPriority) => {
  const type = getNotificationType(notification)
  if (type === 'APPLICATION_FOLLOW_UP_REMINDER') return priority === 'urgent' ? 12 : 22
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return 35
  if (type === 'AGENT_REMINDER') return 45
  return 80
}

const toAgentTaskAction = (
  task: TodayActionAgentTask,
  index: number,
  options?: NotificationActionResolverOptions
): RankedTodayActionItem | undefined => {
  if (!isOpenAgentTask(task)) return undefined

  const id = toText(task.id) || String(index + 1)
  const priorityToken = toToken(task.priority)
  const priority: TodayActionPriority = priorityToken === 'LOW' ? 'normal' : 'high'
  const resolvedAction = resolveAppRoutePath(task.actionUrl, {
    fallbackPath: '/agent/today',
    enableV4Preview: options?.enableV4Preview,
    knownPaths: options?.knownPaths || defaultUserKnownPaths
  })
  const title = toText(task.title) || `Agent 任务 #${id}`

  return {
    key: `agent-task-${id}`,
    source: 'agent-task',
    priority,
    title,
    description: toText(task.description) || '继续推进今天尚未完成的 Agent 任务。',
    reason: toText(task.reason) || toText(task.relatedSkillName) || '来自今日 Agent 任务列表。',
    actionLabel: '打开任务',
    actionPath: resolvedAction.path,
    dueText: toText(task.dueDate) || undefined,
    rank: 25 + index,
    dedupeKeys: [`agent-task:${id}`]
  }
}

const toNotificationAction = (
  notification: TodayActionNotification,
  index: number,
  options?: NotificationActionResolverOptions
): RankedTodayActionItem | undefined => {
  if (isResolvedNotification(notification)) return undefined
  const id = toText(notification.id) || String(index + 1)
  const actionPath = resolveNotificationActionPath(notification, options)
  if (!actionPath) return undefined
  const type = getNotificationType(notification)
  const bizType = getNotificationBizType(notification)
  const bizId = getNotificationBizId(notification)
  const priority = notificationPriority(
    notification,
    [notification.actionUrl, notification.fallbackPath, actionPath].filter(Boolean).join(' ')
  )
  const title = toText(notification.title) || 'Notification'
  const bucketSourcePath = [notification.actionUrl, notification.fallbackPath, actionPath].filter(Boolean).join(' ')
  const applicationBucket = type === 'APPLICATION_FOLLOW_UP_REMINDER' || bizType === 'JOB_APPLICATION'
    ? getApplicationFollowUpBucket(bucketSourcePath, notification.title, notification.content)
    : undefined
  const dedupeKeys = [`notification:${id}`]

  if ((type === 'AGENT_REMINDER' || bizType === 'AGENT_TASK') && bizId) {
    dedupeKeys.push(`agent-task:${bizId}`)
  }
  if (applicationBucket) {
    dedupeKeys.push(`application-follow-up:${applicationBucket}`)
  }
  if (bizType && bizId) {
    dedupeKeys.push(`${bizType}:${bizId}`)
  }

  return {
    key: `notification-${id}`,
    source: 'notification',
    notificationId: notification.id,
    priority,
    title,
    description: toText(notification.content) || '打开这条通知处理下一步动作。',
    reason: isUnread(notification) ? '未读且可行动的通知。' : '可行动通知。',
    actionLabel: toText(notification.fallbackLabel) || '查看',
    actionPath,
    dueText: toText(notification.planDate) || undefined,
    unread: isUnread(notification),
    rank: notificationRank(notification, priority) + index / 100,
    dedupeKeys
  }
}

const toApplicationFollowUpActions = (stats: TodayActionApplicationStats | null | undefined): RankedTodayActionItem[] => {
  const overdueCount = coerceCount(stats?.overdueFollowUpCount)
  const dueTodayCount = coerceCount(stats?.dueTodayFollowUpCount)
  const actions: RankedTodayActionItem[] = []

  if (overdueCount) {
    actions.push({
      key: 'application-follow-up-overdue',
      source: 'application-follow-up',
      priority: 'urgent',
      title: `${overdueCount} 条投递跟进已逾期`,
      description: '这些投递已经超过计划跟进时间。',
      reason: '逾期跟进应优先于其他工作台动作处理。',
      actionLabel: '处理逾期跟进',
      actionPath: '/applications?followUp=overdue',
      dueText: '已逾期',
      rank: 10,
      dedupeKeys: ['application-follow-up:overdue']
    })
  }

  if (dueTodayCount) {
    actions.push({
      key: 'application-follow-up-due-today',
      source: 'application-follow-up',
      priority: 'high',
      title: `今天跟进 ${dueTodayCount} 条投递`,
      description: '这些投递计划在今天完成跟进。',
      reason: '今日跟进能让活跃投递继续向前推进。',
      actionLabel: '处理今日跟进',
      actionPath: '/applications?followUp=due-today',
      dueText: '今天',
      rank: 20,
      dedupeKeys: ['application-follow-up:due-today']
    })
  }

  const missingCount = coerceCount(stats?.noFollowUpCount)
  if (missingCount) {
    actions.push({
      key: 'application-follow-up-missing',
      source: 'application-follow-up',
      priority: overdueCount || dueTodayCount ? 'normal' : 'high',
      title: `${missingCount} 条投递还没有下一次跟进`,
      description: '这些记录缺少明确的下一次跟进时间，适合今天补齐提醒。',
      reason: '补齐跟进日期能让投递漏斗持续进入每日行动。',
      actionLabel: '补齐跟进日期',
      actionPath: '/applications?followUp=missing',
      dueText: '待设置',
      rank: 32,
      dedupeKeys: ['application-follow-up:missing']
    })
  }

  const staleCount = coerceCount(stats?.staleActiveCount)
  if (staleCount) {
    actions.push({
      key: 'application-follow-up-stale',
      source: 'application-follow-up',
      priority: overdueCount || dueTodayCount || missingCount ? 'normal' : 'high',
      title: `${staleCount} 条活跃投递较久未更新`,
      description: '这些机会已经一段时间没有事件记录，建议今天复核状态。',
      reason: '停滞投递需要复核状态，避免漏掉面试、拒信或归档动作。',
      actionLabel: '查看投递漏斗',
      actionPath: '/applications',
      dueText: '待复核',
      rank: 38,
      dedupeKeys: ['application-follow-up:stale']
    })
  }

  return actions
}

const toReadinessAction = (action?: TodayActionReadinessNextAction | null): RankedTodayActionItem | undefined => {
  if (!action) return undefined
  const title = toText(action.title)
  if (!title) return undefined

  return {
    key: 'readiness-next-action',
    source: 'readiness',
    priority: 'low',
    title,
    description: toText(action.description) || '继续完成求职准备的下一步。',
    reason: toText(action.reason) || '没有更紧急行动时展示求职准备下一步。',
    actionLabel: toText(action.label) || '继续',
    actionPath: routeToPath(action.path),
    rank: 70,
    dedupeKeys: ['readiness:next-action']
  }
}

const sortActions = (actions: RankedTodayActionItem[]) =>
  [...actions].sort((left, right) => {
    const priorityDiff = priorityWeight[left.priority] - priorityWeight[right.priority]
    if (priorityDiff !== 0) return priorityDiff
    if (left.rank !== right.rank) return left.rank - right.rank
    return left.key.localeCompare(right.key)
  })

const dedupeSortedActions = (actions: RankedTodayActionItem[]) => {
  const seen = new Set<string>()
  const result: RankedTodayActionItem[] = []

  actions.forEach((action) => {
    if (action.dedupeKeys.some((key) => seen.has(key))) return
    action.dedupeKeys.forEach((key) => seen.add(key))
    result.push(action)
  })

  return result
}

export const buildTodayActions = (
  input: BuildTodayActionsInput = {},
  options: BuildTodayActionsOptions = {}
): TodayActionItem[] => {
  const actions: RankedTodayActionItem[] = [
    ...toApplicationFollowUpActions(input.applicationStats),
    ...(input.agentTasks || [])
      .map((task, index) => toAgentTaskAction(task, index, options.notificationResolver))
      .filter((item): item is RankedTodayActionItem => Boolean(item)),
    ...(input.notifications || [])
      .map((notification, index) => toNotificationAction(notification, index, options.notificationResolver))
      .filter((item): item is RankedTodayActionItem => Boolean(item))
  ]

  const sortedBusinessActions = dedupeSortedActions(sortActions(actions))
  const hasUrgentOrHighAction = sortedBusinessActions.some((item) => item.priority === 'urgent' || item.priority === 'high')
  const readinessAction = toReadinessAction(input.readinessNextAction || input.readinessAction)
  const finalActions = readinessAction && !hasUrgentOrHighAction
    ? dedupeSortedActions(sortActions([...sortedBusinessActions, readinessAction]))
    : sortedBusinessActions

  return finalActions
    .slice(0, clampDashboardLimit(options.maxItems))
    .map(({ rank: _rank, dedupeKeys: _dedupeKeys, ...item }) => item)
}

export const buildApplicationTodayActions = (
  applicationStats?: TodayActionApplicationStats | null,
  options: BuildTodayActionsOptions = {}
): TodayActionItem[] =>
  buildTodayActions(
    { applicationStats },
    {
      ...options,
      maxItems: Math.min(3, options.maxItems ?? 3)
    }
  )
