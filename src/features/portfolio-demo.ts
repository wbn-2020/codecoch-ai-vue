import type { PortfolioDemoStorylineStepVO, PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const allSteps = (story?: PortfolioDemoStorylineVO): PortfolioDemoStorylineStepVO[] => [
  ...(story?.steps || []),
  ...(story?.opsSteps || [])
]

export const hasCompleteDemoMarkers = (story?: PortfolioDemoStorylineVO) =>
  Boolean(story?.status?.demoData) && allSteps(story).every((step) => step.demoData === true)

export const safeStoryRoutes = (story?: PortfolioDemoStorylineVO) =>
  allSteps(story)
    .map((step) => step.route)
    .filter((route): route is string => Boolean(route && isSafeDemoRoute(route)))

const isSafeDemoRoute = (route: string) => {
  if (!route.startsWith('/') || route.startsWith('//') || route.startsWith('/admin')) return false
  if (route.startsWith('/portfolio-demo')) return true
  if (route.startsWith('/job-experiments/')) return route.includes('demoFlag=true')
  return false
}
