import { appConfig } from '@/config'

export interface RouteSafetyOptions {
  fallbackPath?: string
  enableV4Preview?: boolean
  enableV4Growth?: boolean
  enableV4Knowledge?: boolean
  knownPaths?: string[]
}

export interface RouteSafetyResult {
  path: string
  unavailableReason?: string
  blockedPath?: string
}

export const v4PreviewPaths = [
  '/knowledge',
  '/resume-versions',
  '/agent/memory',
  '/agent/reviews',
  '/growth/profile',
  '/growth/skills',
  '/growth/readiness'
]

export const v4PreviewMatchers = [/^\/resumes\/[^/]+\/versions(?:\/.*)?$/]

export const defaultUserKnownPaths = [
  '/onboarding',
  '/dashboard',
  '/dashboard/v3',
  '/tools',
  '/offer-help',
  '/profile',
  '/password',
  '/notifications',
  '/weakness-analysis',
  '/projects',
  '/job-targets',
  '/project-evidence',
  '/resumes',
  '/resume-match',
  '/resume-job-match',
  '/applications',
  '/application-packages',
  '/application-packages/preview',
  '/interviews',
  '/interviews/create',
  '/interviews/history',
  '/questions',
  '/questions/practice',
  '/questions/wrong-records',
  '/questions/favorites',
  '/questions/recommendations',
  '/study-plans',
  '/study-plans/from-gap',
  '/skill-profile',
  '/ability-map',
  '/agent/today',
  '/agent/tasks',
  '/agent/runs',
  '/daily-tasks',
  '/analytics/personal',
  '/job-experiments',
  '/portfolio-demo',
  ...v4PreviewPaths
]

export const defaultAdminKnownPaths = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/roles',
  '/admin/questions',
  '/admin/ai/questions/generate',
  '/admin/question-reviews',
  '/admin/question-review',
  '/admin/question-duplicate-reviews',
  '/admin/question-duplicates',
  '/admin/question-relations',
  '/admin/question-categories',
  '/admin/question-tags',
  '/admin/question-groups',
  '/admin/industry-templates',
  '/admin/files',
  '/admin/ai/prompts',
  '/admin/agent/prompts',
  '/admin/ai/logs',
  '/admin/trace-cockpit',
  '/admin/ai/models',
  '/admin/system/configs',
  '/admin/system-config',
  '/admin/menus',
  '/admin/permissions',
  '/admin/notices',
  '/admin/announcements',
  '/admin/notifications',
  '/admin/operation-logs',
  '/admin/logs/operations',
  '/admin/logs/summary',
  '/admin/login-logs',
  '/admin/slow-sql-logs',
  '/admin/logs/slow-sql',
  '/admin/slow-sql',
  '/admin/interviews',
  '/admin/interview-reports',
  '/admin/analytics/agent',
  '/admin/agent/analytics',
  '/admin/analytics/overview',
  '/admin/analytics/training',
  '/admin/analytics/ai',
  '/admin/ai/feedback',
  '/admin/ops/overview',
  '/admin/ai/ops',
  '/admin/knowledge',
  '/admin/vector-indexes',
  '/admin/analytics/metrics',
  '/admin/metrics',
  '/admin/analytics/jobs',
  '/admin/scheduler',
  '/admin/ai/prompt-regression',
  '/admin/agent/runs',
  '/admin/agent-runs',
  '/admin/agent/tasks',
  '/admin/agent-tasks',
  '/admin/async-tasks',
  '/admin/dead-letters',
  '/admin/tasks',
  '/admin/system-configs',
  '/admin/configs'
]

export const defaultKnownPaths = [...defaultUserKnownPaths, ...defaultAdminKnownPaths]

export const routePathOnly = (path: string) => path.split(/[?#]/)[0] || path

export const exactOnlyKnownPaths = [
  '/application-packages',
  '/application-packages/preview'
]

export const knownPathDynamicMatchers = [
  /^\/application-packages\/[^/?#]+$/
]

const canMatchChildPath = (knownPath: string) =>
  knownPath !== '/admin' &&
  !knownPath.startsWith('/admin/') &&
  !exactOnlyKnownPaths.includes(knownPath)

export const isKnownAppPath = (path: string, knownPaths: string[] = defaultKnownPaths) =>
  knownPaths.some((knownPath) => (
    path === knownPath ||
    (canMatchChildPath(knownPath) && path.startsWith(`${knownPath}/`))
  )) ||
  knownPathDynamicMatchers.some((matcher) => matcher.test(path))

export const isV4PreviewPath = (path: string) =>
  v4PreviewPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ||
  v4PreviewMatchers.some((matcher) => matcher.test(path))

export const isV4GrowthPath = (path: string) =>
  path === '/agent/reviews' ||
  path.startsWith('/agent/reviews/') ||
  path === '/agent/memory' ||
  path.startsWith('/agent/memory/') ||
  path === '/growth' ||
  path.startsWith('/growth/')

export const isV4KnowledgePath = (path: string) =>
  path === '/knowledge' || path.startsWith('/knowledge/')

export const isV4PreviewAccessEnabled = (enableV4Preview?: boolean) =>
  enableV4Preview === undefined
    ? appConfig.enableV4PreviewAccess
    : enableV4Preview || appConfig.enableV4ExperimentalRoutes

export const resolveAppRoutePath = (
  rawPath?: string | null,
  options: RouteSafetyOptions = {}
): RouteSafetyResult => {
  const fallbackPath = options.fallbackPath || '/agent/today'
  const path = String(rawPath ?? '').trim()
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return {
      path: fallbackPath,
      unavailableReason: '目标不是安全的站内路径，已回落到可用入口。',
      blockedPath: path || undefined
    }
  }

  const routePath = routePathOnly(path)
  const enableV4Preview = isV4PreviewAccessEnabled(options.enableV4Preview)
  if (!enableV4Preview && isV4PreviewPath(routePath)) {
    return {
      path: fallbackPath,
      unavailableReason: '目标属于 V4 预览能力，当前已回落到可用入口。',
      blockedPath: path
    }
  }
  const enableV4Growth = options.enableV4Growth ?? appConfig.enableV4GrowthPreview
  if (isV4GrowthPath(routePath) && !enableV4Growth) {
    return {
      path: fallbackPath,
      unavailableReason: '目标属于 V4 成长与长期记忆预览能力，当前已回落到可用入口。',
      blockedPath: path
    }
  }
  const enableV4Knowledge = options.enableV4Knowledge ?? appConfig.enableV4KnowledgePreview
  if (isV4KnowledgePath(routePath) && !enableV4Knowledge) {
    return {
      path: fallbackPath,
      unavailableReason: '目标属于个人知识库预览能力，当前已回落到可用入口。',
      blockedPath: path
    }
  }

  const knownPaths = options.knownPaths || defaultKnownPaths
  if (!isKnownAppPath(routePath, knownPaths)) {
    return {
      path: fallbackPath,
      unavailableReason: '目标路径不存在或未开放，已回落到可用入口。',
      blockedPath: path
    }
  }

  return { path }
}
