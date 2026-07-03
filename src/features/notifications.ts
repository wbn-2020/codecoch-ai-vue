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
      label: string
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
  }
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
    return { path: undefined, unavailableReason: '通知目标路径不存在或未开放。', blockedPath: rawPath }
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

  if (combined.includes('APPLICATION_FOLLOW_UP') || combined.includes('JOB_APPLICATION')) {
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
  return item.fallbackLabel || actionLabelByCategory[meta.category]
}

const mapNotificationBizPath = (item: NotificationVO) => {
  const meta = normalizeNotificationType(item)
  const type = meta.type
  const bizType = normalizeToken(item.bizType || item.relatedType)
  const relatedType = normalizeToken(item.relatedType)
  const combined = [type, bizType, relatedType].filter(Boolean).join(' ')
  const id = getPrimaryId(item)

  if (meta.category === 'agent') {
    if (combined.includes('AGENT_RUN') && id) return `/agent/runs/${id}`
    return '/agent/today'
  }

  if (meta.category === 'application-follow-up') {
    return id ? buildQueryPath('/applications', { applicationId: id }) : '/applications?followUp=due-today'
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
    return '/study-plans'
  }

  return undefined
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
        label,
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
    actionLabel: resolved.label,
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
    actionLabel: resolved.label,
    actionPath: resolved.path,
    dueText: item.planDate,
    unread: item.isRead === 0
  }
}
