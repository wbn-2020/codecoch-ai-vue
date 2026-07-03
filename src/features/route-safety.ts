import { appConfig } from '@/config'

export interface RouteSafetyOptions {
  fallbackPath?: string
  enableV4Preview?: boolean
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
  const enableV4Preview = options.enableV4Preview ?? appConfig.enableV4Preview
  if (!enableV4Preview && isV4PreviewPath(routePath)) {
    return {
      path: fallbackPath,
      unavailableReason: '目标属于 V4 预览能力，当前已回落到可用入口。',
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
