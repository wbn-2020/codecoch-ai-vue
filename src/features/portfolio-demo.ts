import { resolveAppRoutePath, routePathOnly } from '@/features/route-safety'
import type { PortfolioDemoStorylineStepVO, PortfolioDemoStorylineVO } from '@/types/jobExperiment'

export interface PortfolioDemoRequiredStep {
  key: string
  title: string
}

export interface PortfolioDemoInvalidRoute {
  key: string
  route: string
  reason: string
}

export interface PortfolioDemoCoverage {
  total: number
  covered: number
  ready: boolean
  missingKeys: string[]
  missingTitleKeys: string[]
  missingStatusKeys: string[]
  missingEvidenceKeys: string[]
  missingDemoMarkerKeys: string[]
  invalidRoutes: PortfolioDemoInvalidRoute[]
}

export const requiredUserDemoSteps: PortfolioDemoRequiredStep[] = [
  { key: 'target-job', title: '目标岗位' },
  { key: 'jd-match', title: 'JD 匹配报告' },
  { key: 'project-evidence', title: '项目证据' },
  { key: 'application-funnel', title: '投递漏斗' },
  { key: 'application-package', title: '岗位投递包' },
  { key: 'interview-training', title: '面试训练室' },
  { key: 'interview-report', title: '面试报告' },
  { key: 'ability-map', title: '能力图谱' },
  { key: 'job-experiment-review', title: '求职实验复盘' },
  { key: 'agent-today', title: 'Agent 今日与本周计划' },
  { key: 'knowledge-impact', title: '知识影响预览' },
  { key: 'agent-memory', title: '长期记忆治理' }
]

export const requiredOpsDemoSteps: PortfolioDemoRequiredStep[] = [
  { key: 'agent-runs', title: 'Agent 运行记录' },
  { key: 'prompt-template', title: 'Prompt 模板' },
  { key: 'prompt-regression', title: 'Prompt 回归' },
  { key: 'ai-call-logs', title: 'AI 服务记录' },
  { key: 'async-tasks', title: '异步任务中心' },
  { key: 'trace-cockpit', title: 'Trace Cockpit' },
  { key: 'metrics-dictionary', title: '指标字典' },
  { key: 'ai-ops-dashboard', title: 'AI 运营看板' }
]

export const portfolioDemoKnownPaths = [
  '/portfolio-demo',
  '/job-targets',
  '/resume-match',
  '/project-evidence',
  '/applications',
  '/application-packages/preview',
  '/interviews',
  '/interviews/create',
  '/interviews/history',
  '/ability-map',
  '/job-experiments',
  '/agent/today',
  '/knowledge',
  '/agent/memory',
  '/admin/agent/runs',
  '/admin/ai/prompts',
  '/admin/ai/prompt-regression',
  '/admin/ai/logs',
  '/admin/async-tasks',
  '/admin/trace-cockpit',
  '/admin/analytics/metrics',
  '/admin/analytics/ai'
]

const allSteps = (story?: PortfolioDemoStorylineVO): PortfolioDemoStorylineStepVO[] => [
  ...(story?.steps || []),
  ...(story?.opsSteps || [])
]

const requiredSteps = () => [...requiredUserDemoSteps, ...requiredOpsDemoSteps]

const stepByKey = (story?: PortfolioDemoStorylineVO) =>
  new Map(allSteps(story).map((step) => [step.key, step]))

const hasEvidenceSummary = (step?: PortfolioDemoStorylineStepVO) =>
  Boolean(step?.evidenceSummary && step.evidenceSummary.trim())

const hasTitle = (step?: PortfolioDemoStorylineStepVO) =>
  Boolean(step?.title && step.title.trim())

const hasUnavailableStatus = (step?: PortfolioDemoStorylineStepVO) =>
  Boolean(step?.status && step.status !== 'READY')

const hasExplicitDemoFlag = (route: string) => {
  const queryStart = route.indexOf('?')
  if (queryStart < 0) return false

  const hashStart = route.indexOf('#', queryStart)
  const query = route.slice(queryStart + 1, hashStart < 0 ? undefined : hashStart)
  const demoFlags = new URLSearchParams(query).getAll('demoFlag')
  return demoFlags.length === 1 && demoFlags[0] === 'true'
}

export const hasCompleteDemoMarkers = (story?: PortfolioDemoStorylineVO) =>
  Boolean(story?.status?.demoData) && allSteps(story).every((step) => step.demoData === true)

export const resolvePortfolioDemoRoute = (route?: string | null) => {
  const resolved = resolveAppRoutePath(route, {
    fallbackPath: '/portfolio-demo',
    enableV4Preview: true,
    enableV4Growth: true,
    enableV4Knowledge: true,
    knownPaths: portfolioDemoKnownPaths
  })
  const rawRoute = String(route ?? '').trim()
  const routePath = routePathOnly(rawRoute)
  if (!resolved.blockedPath && routePath !== '/portfolio-demo' && !hasExplicitDemoFlag(rawRoute)) {
    return {
      path: '/portfolio-demo',
      unavailableReason: '演示路线必须携带 demoFlag=true，已回落到演示控制台。',
      blockedPath: rawRoute
    }
  }
  return resolved
}

export const safeStoryRoutes = (story?: PortfolioDemoStorylineVO) =>
  allSteps(story)
    .map((step) => step.route)
    .filter((route): route is string => Boolean(route && !resolvePortfolioDemoRoute(route).blockedPath))

export const buildPortfolioDemoCoverage = (story?: PortfolioDemoStorylineVO): PortfolioDemoCoverage => {
  const byKey = stepByKey(story)
  const missingKeys: string[] = []
  const missingTitleKeys: string[] = []
  const missingStatusKeys: string[] = []
  const missingEvidenceKeys: string[] = []
  const missingDemoMarkerKeys: string[] = []
  const invalidRoutes: PortfolioDemoInvalidRoute[] = []

  requiredSteps().forEach((requiredStep) => {
    const step = byKey.get(requiredStep.key)
    if (!step) {
      missingKeys.push(requiredStep.key)
      return
    }

    if (hasUnavailableStatus(step)) missingStatusKeys.push(requiredStep.key)
    if (!hasTitle(step)) missingTitleKeys.push(requiredStep.key)
    if (!hasEvidenceSummary(step)) missingEvidenceKeys.push(requiredStep.key)
    if (step.demoData !== true) missingDemoMarkerKeys.push(requiredStep.key)

    const resolved = resolvePortfolioDemoRoute(step.route)
    if (resolved.blockedPath) {
      invalidRoutes.push({
        key: requiredStep.key,
        route: step.route,
        reason: resolved.unavailableReason || '目标路径不可用。'
      })
    }
  })

  const incompleteKeys = new Set([
    ...missingKeys,
    ...missingTitleKeys,
    ...missingStatusKeys,
    ...missingEvidenceKeys,
    ...missingDemoMarkerKeys,
    ...invalidRoutes.map((route) => route.key)
  ])
  const total = requiredSteps().length

  return {
    total,
    covered: total - incompleteKeys.size,
    ready: Boolean(story?.status?.demoData) && incompleteKeys.size === 0,
    missingKeys,
    missingTitleKeys,
    missingStatusKeys,
    missingEvidenceKeys,
    missingDemoMarkerKeys,
    invalidRoutes
  }
}
