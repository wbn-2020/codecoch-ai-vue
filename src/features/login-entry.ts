import type { UserDashboardOverviewVO } from '@/types/dashboard'

export const needsUserOnboarding = (overview?: Partial<UserDashboardOverviewVO> | null) => {
  if (!overview) return false

  return !(
    Number(overview.resumeCount || 0) > 0
    || Number(overview.interviewCount || 0) > 0
    || Number(overview.studyPlanCount || 0) > 0
    || overview.recentResumeParse
    || overview.recentResumeOptimize
    || overview.recentInterview
    || overview.recentReport
    || overview.activeStudyPlan
  )
}
