import { appConfig } from '@/config'
import type { NotificationVO } from '@/api/notification'
import {
  defaultUserKnownPaths,
  isKnownAppPath,
  isV4PreviewPath,
  resolveAppRoutePath,
  routePathOnly
} from '@/features/route-safety'

export type NotificationCategory =
  | 'agent'
  | 'application-follow-up'
  | 'calendar'
  | 'interview-report'
  | 'interview'
  | 'resume-match'
  | 'resume'
  | 'learning'
  | 'system'

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low'
export type NotificationActionSource = 'actionUrl' | 'biz' | 'fallback' | 'detail'

export interface NotificationTypeMeta {
  type: string
  bizType?: string
  category: NotificationCategory
  label: string
}

export interface NotificationDisplayMeta extends NotificationTypeMeta {
  actionLabel: string
  priority: NotificationPriority
  actionable: boolean
  unavailableReason?: string
}

export interface NotificationTodayActionItem {
  key: string
  source: 'notification'
  priority: NotificationPriority
  title: string
  description: string
  reason: string
  actionLabel: string
  actionPath: string
  dueText?: string
  unread?: boolean
}

export interface NotificationActionResolverOptions {
  enableV4Preview?: boolean
  knownPaths?: string[]
  previewFallbackPath?: string
}

export type NotificationActionResolution =
  | {
      kind: 'route'
      path: string
      actionPath: string
      label: string
      actionLabel: string
      fallbackPath: string
      fallbackLabel: string
      source: Exclude<NotificationActionSource, 'detail'>
      actionable: true
      priority: NotificationPriority
      category: NotificationCategory
      unavailableReason?: string
      blockedPath?: string
    }
  | {
      kind: 'detail'
      label: string
      actionLabel: string
      fallbackPath: string
      fallbackLabel: string
      source: 'detail'
      actionable: false
      priority: NotificationPriority
      category: NotificationCategory
      unavailableReason?: string
      blockedPath?: string
    }

const defaultPreviewFallbackPath = '/agent/today'

const labelByCategory: Record<NotificationCategory, string> = {
  agent: 'Agent',
  'application-follow-up': '投递跟进',
  calendar: '求职日历',
  'interview-report': '面试报告',
  interview: '面试',
  'resume-match': '简历匹配',
  resume: '简历',
  learning: '学习任务',
  system: '系统通知'
}

const actionLabelByCategory: Record<NotificationCategory, string> = {
  agent: '进入今日任务',
  'application-follow-up': '处理投递跟进',
  calendar: '打开求职日历',
  'interview-report': '查看面试报告',
  interview: '查看面试',
  'resume-match': '查看匹配报告',
  resume: '查看简历',
  learning: '继续学习',
  system: '查看详情'
}

const priorityByCategory: Record<NotificationCategory, NotificationPriority> = {
  agent: 'high',
  'application-follow-up': 'urgent',
  calendar: 'high',
  'interview-report': 'high',
  interview: 'high',
  'resume-match': 'normal',
  resume: 'normal',
  learning: 'normal',
  system: 'low'
}

const normalizeToken = (value?: number | string | null) =>
  String(value || '')
    .trim()
    .replace(/[.-]/g, '_')
    .toUpperCase()

export const isResolvedNotification = (
  item?: { resolvedStatus?: number | string | boolean | null } | null
) => {
  const value = item?.resolvedStatus
  if (value === true || value === 1 || value === '1') return true
  if (value === false || value === 0 || value === '0') return false
  return normalizeToken(value).includes('RESOLVED')
}

const getPrimaryId = (item: NotificationVO) => {
  const value = item.bizId ?? item.relatedId
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? String(value) : undefined
}

const getPrimaryKey = (item: NotificationVO) => {
  const value = item.bizId ?? item.relatedId
  const key = String(value ?? '').trim()
  return key || undefined
}

const buildQueryPath = (path: string, query: Record<string, string | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const queryText = search.toString()
  return queryText ? `${path}?${queryText}` : path
}

const resolveSafePath = (
  rawPath: string | undefined,
  options: Required<Pick<NotificationActionResolverOptions, 'enableV4Preview' | 'previewFallbackPath'>> & {
    knownPaths: string[]
  },
) => {
  if (!rawPath || !rawPath.startsWith('/') || rawPath.startsWith('//')) {
    return { path: undefined, unavailableReason: 'actionUrl 不是安全的站内路径。', blockedPath: rawPath }
  }

  const routePath = routePathOnly(rawPath)

  if (!options.enableV4Preview && isV4PreviewPath(routePath)) {
    return {
      path: options.previewFallbackPath,
      unavailableReason: '目标属于 V4 预览能力，当前已回落到可用入口。',
      blockedPath: rawPath
    }
  }

  if (!isKnownAppPath(routePath, options.knownPaths)) {
    return { path: undefined, unavailableReason: '通知目标路径不存在或未开放。' }
  }

  return resolveAppRoutePath(rawPath, {
    fallbackPath: options.previewFallbackPath,
    enableV4Preview: options.enableV4Preview,
    knownPaths: options.knownPaths
  })
}

export const normalizeNotificationType = (item: NotificationVO): NotificationTypeMeta => {
  const type = normalizeToken(item.type || item.bizType || item.relatedType || 'SYSTEM') || 'SYSTEM'
  const bizType = normalizeToken(item.bizType || item.relatedType)
  const relatedType = normalizeToken(item.relatedType)
  const combined = [type, bizType, relatedType].filter(Boolean).join(' ')
  let category: NotificationCategory = 'system'

  if (combined.includes('CALENDAR_REMINDER') || combined.includes('CAREER_CALENDAR_EVENT')) {
    category = 'calendar'
  } else if (combined.includes('APPLICATION_FOLLOW_UP') || combined.includes('JOB_APPLICATION')) {
    category = 'application-follow-up'
  } else if (combined.includes('AGENT')) {
    category = 'agent'
  } else if (combined.includes('INTERVIEW') && combined.includes('REPORT')) {
    category = 'interview-report'
  } else if (combined.includes('REPORT_DONE')) {
    category = 'interview-report'
  } else if (combined.includes('INTERVIEW')) {
    category = 'interview'
  } else if (combined.includes('RESUME_MATCH')) {
    category = 'resume-match'
  } else if (combined.includes('RESUME')) {
    category = 'resume'
  } else if (combined.includes('QUESTION') || combined.includes('STUDY') || combined.includes('PLAN')) {
    category = 'learning'
  }

  return {
    type,
    bizType: bizType || undefined,
    category,
    label: labelByCategory[category]
  }
}

export const getNotificationPriority = (item: NotificationVO): NotificationPriority =>
  priorityByCategory[normalizeNotificationType(item).category]

export const getNotificationActionLabel = (item: NotificationVO) => {
  const meta = normalizeNotificationType(item)
  const combined = [meta.type, meta.bizType, normalizeToken(item.relatedType)].filter(Boolean).join(' ')
  if (combined.includes('QUESTION_RECOMMENDATION_GENERATE')) return item.fallbackLabel || '查看今日训练题组'
  if (combined.includes('QUESTION_GENERATE')) return item.fallbackLabel || '查看题目生成任务'
  if (combined.includes('AGENT_TASK')) return item.fallbackLabel || '去任务中心继续训练'
  if (combined.includes('AGENT_RUN')) return item.fallbackLabel || '查看训练详情'
  if (combined.includes('AGENT_DASHBOARD')) return item.fallbackLabel || '查看训练入口'
  return item.fallbackLabel || actionLabelByCategory[meta.category]
}

const mapNotificationBizPath = (item: NotificationVO) => {
  const meta = normalizeNotificationType(item)
  const type = meta.type
  const bizType = normalizeToken(item.bizType || item.relatedType)
  const relatedType = normalizeToken(item.relatedType)
  const combined = [type, bizType, relatedType].filter(Boolean).join(' ')
  const id = getPrimaryId(item)
  const key = getPrimaryKey(item)

  if (combined.includes('QUESTION_RECOMMENDATION_GENERATE')) {
    return buildQueryPath('/questions/recommendations', { batchId: key })
  }

  if (combined.includes('QUESTION_GENERATE')) {
    return buildQueryPath('/agent/tasks', {
      bizType: 'question.generate',
      bizId: key,
      batchId: key
    })
  }

  if (meta.category === 'agent') {
    if (combined.includes('AGENT_DASHBOARD')) return '/dashboard'
    if (combined.includes('AGENT_TASK')) {
      return buildQueryPath('/agent/tasks', {
        bizType: 'agent.daily-plan.generate',
        bizId: key
      })
    }
    if (combined.includes('AGENT_RUN') && id) return `/agent/runs/${id}`
    return '/agent/today'
  }

  if (meta.category === 'application-follow-up') {
    return id ? buildQueryPath('/applications', { applicationId: id }) : '/applications?followUp=due-today'
  }

  if (meta.category === 'calendar') {
    return '/career-calendar'
  }

  if (meta.category === 'interview-report') {
    return id ? `/interviews/${id}/report` : '/interviews/history'
  }

  if (meta.category === 'interview') {
    return id ? `/interviews/${id}` : '/interviews/history'
  }

  if (meta.category === 'resume-match') {
    return id ? `/resume-match/${id}` : '/resume-match'
  }

  if (meta.category === 'resume') {
    return '/resumes'
  }

  if (combined.includes('QUESTION')) {
    return id ? `/questions/${id}` : '/questions'
  }

  if (combined.includes('STUDY') || combined.includes('PLAN')) {
    return id ? buildQueryPath('/study-plans', { planId: id }) : '/study-plans'
  }

  if (combined.includes('TASK')) {
    const taskText = `${item.title || ''} ${item.content || ''}`
    return taskText.includes('训练') ? '/agent/today' : '/daily-tasks'
  }

  return undefined
}

const mapNotificationFallbackPath = (item: NotificationVO) => {
  const meta = normalizeNotificationType(item)
  const combined = [meta.type, meta.bizType, normalizeToken(item.relatedType)].filter(Boolean).join(' ')

  if (combined.includes('QUESTION_RECOMMENDATION_GENERATE')) return '/questions/recommendations'
  if (combined.includes('QUESTION_GENERATE')) return '/agent/tasks'
  if (combined.includes('AGENT_DASHBOARD')) return '/dashboard'
  if (meta.category === 'agent') return '/agent/today'
  if (meta.category === 'application-follow-up') return '/applications'
  if (meta.category === 'calendar') return '/career-calendar'
  if (meta.category === 'interview-report' || meta.category === 'interview') return '/interviews/history'
  if (meta.category === 'resume-match') return '/resume-match'
  if (meta.category === 'resume') return '/resumes'
  if (combined.includes('QUESTION')) return '/questions'
  if (combined.includes('STUDY') || combined.includes('PLAN')) return '/study-plans'
  if (combined.includes('TASK')) return '/dashboard'
  return '/dashboard'
}

export const resolveNotificationAction = (
  item: NotificationVO,
  options: NotificationActionResolverOptions = appConfig
): NotificationActionResolution => {
  const meta = normalizeNotificationType(item)
  const priority = getNotificationPriority(item)
  const label = getNotificationActionLabel(item)
  const resolverOptions = {
    enableV4Preview: Boolean(options.enableV4Preview),
    knownPaths: options.knownPaths || defaultUserKnownPaths,
    previewFallbackPath: options.previewFallbackPath || defaultPreviewFallbackPath
  }
  const fallbackLabel = item.fallbackLabel || labelByCategory[meta.category]
  const fallbackCandidates = [item.fallbackPath, mapNotificationFallbackPath(item), '/dashboard']
  const fallbackPath = fallbackCandidates
    .map((path) => resolveSafePath(path, resolverOptions).path)
    .find(Boolean) || '/dashboard'
  let lastFailure: Pick<NotificationActionResolution, 'unavailableReason' | 'blockedPath'> = {}

  const candidates: Array<{ source: Exclude<NotificationActionSource, 'detail'>; path?: string }> = [
    { source: 'actionUrl', path: item.actionUrl },
    { source: 'biz', path: mapNotificationBizPath(item) },
    { source: 'fallback', path: item.fallbackPath }
  ]

  for (const candidate of candidates) {
    if (!candidate.path) continue
    const safePath = resolveSafePath(candidate.path, resolverOptions)
    if (safePath.path) {
      return {
        kind: 'route',
        path: safePath.path,
        actionPath: safePath.path,
        label,
        actionLabel: label,
        fallbackPath,
        fallbackLabel,
        source: candidate.source,
        actionable: true,
        priority,
        category: meta.category,
        unavailableReason: lastFailure.unavailableReason || safePath.unavailableReason,
        blockedPath: lastFailure.blockedPath || safePath.blockedPath
      }
    }
    lastFailure = {
      unavailableReason:
        candidate.source === 'actionUrl' ? safePath.unavailableReason : safePath.unavailableReason || lastFailure.unavailableReason,
      blockedPath: safePath.blockedPath || lastFailure.blockedPath
    }
  }

  return {
    kind: 'detail',
    label: '查看详情',
    actionLabel: '查看详情',
    fallbackPath,
    fallbackLabel,
    source: 'detail',
    actionable: false,
    priority,
    category: meta.category,
    unavailableReason: lastFailure.unavailableReason,
    blockedPath: lastFailure.blockedPath
  }
}

export const isActionableNotification = (
  item: NotificationVO,
  options: NotificationActionResolverOptions = appConfig
) => !isResolvedNotification(item) && resolveNotificationAction(item, options).kind === 'route'

export const getNotificationDisplay = (
  item: NotificationVO,
  options: NotificationActionResolverOptions = appConfig
): NotificationDisplayMeta => {
  const meta = normalizeNotificationType(item)
  const resolved = resolveNotificationAction(item, options)

  return {
    ...meta,
    actionLabel: resolved.actionLabel,
    priority: resolved.priority,
    actionable: !isResolvedNotification(item) && resolved.actionable,
    unavailableReason: resolved.unavailableReason
  }
}

export const toNotificationTodayAction = (
  item: NotificationVO,
  options: NotificationActionResolverOptions = appConfig
): NotificationTodayActionItem | null => {
  if (isResolvedNotification(item)) return null
  const resolved = resolveNotificationAction(item, options)
  if (resolved.kind !== 'route') return null
  const meta = normalizeNotificationType(item)

  return {
    key: `notification-${item.id}`,
    source: 'notification',
    priority: resolved.priority,
    title: item.title,
    description: item.content || meta.label,
    reason: meta.label,
    actionLabel: resolved.actionLabel,
    actionPath: resolved.actionPath,
    dueText: item.planDate,
    unread: item.isRead === 0
  }
}
