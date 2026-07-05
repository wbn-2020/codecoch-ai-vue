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
  '/applications',
  '/resume-versions',
  '/agent/memory',
  '/agent/reviews',
  '/growth/profile',
  '/growth/skills',
  '/growth/readiness'
]

export const v4PreviewMatchers = [/^\/resumes\/[^/]+\/versions(?:\/.*)?$/]

export const defaultUserKnownPaths = [
  '/dashboard',
  '/dashboard/v3',
  '/profile',
  '/password',
  '/notifications',
  '/weakness-analysis',
  '/projects',
  '/job-targets',
  '/project-evidence',
  '/resumes',
  '/resume-match',
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

export const defaultKnownPaths = [...defaultUserKnownPaths, '/admin']

export const routePathOnly = (path: string) => path.split(/[?#]/)[0] || path

export const isKnownAppPath = (path: string, knownPaths: string[] = defaultKnownPaths) =>
  knownPaths.some((knownPath) => path === knownPath || path.startsWith(`${knownPath}/`))

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
