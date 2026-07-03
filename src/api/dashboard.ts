import request from '@/utils/request'
import type {
  AdminDashboardOverviewVO,
  UserDashboardActiveStudyPlanVO,
  UserDashboardOverviewVO,
  V3DashboardOverviewVO
} from '@/types/dashboard'

const normalizeAdminDashboardOverview = (data: Partial<AdminDashboardOverviewVO> = {}): AdminDashboardOverviewVO => ({
  summaryCards: data.summaryCards || [],
  trendStats: data.trendStats || [],
  pendingItems: data.pendingItems || [],
  systemStatus: data.systemStatus
    ? {
        ...data.systemStatus,
        services: data.systemStatus.services || []
      }
    : undefined,
  dataSourceDesc: data.dataSourceDesc,
  generatedAt: data.generatedAt
})

type StudyPlanLike = Partial<UserDashboardActiveStudyPlanVO> & {
  id?: number | string
  studyPlanId?: number | string
}

const toPositiveNumber = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

const normalizeStudyProgress = (value?: unknown): UserDashboardActiveStudyPlanVO | null => {
  if (!value || typeof value !== 'object') return null
  const plan = value as StudyPlanLike
  const planId = toPositiveNumber(plan.planId || plan.studyPlanId || plan.id)
  if (!planId) return null
  return {
    ...plan,
    planId
  }
}

const normalizeUserDashboardOverview = (data: Partial<UserDashboardOverviewVO> = {}): UserDashboardOverviewVO => ({
  resumeCount: data.resumeCount || 0,
  recentResumeParse: data.recentResumeParse || null,
  recentResumeOptimize: data.recentResumeOptimize || null,
  interviewCount: data.interviewCount || 0,
  recentInterview: data.recentInterview || null,
  recentReport: data.recentReport || null,
  studyPlanCount: data.studyPlanCount || 0,
  activeStudyPlan: normalizeStudyProgress(data.activeStudyPlan),
  todayTaskCount: data.todayTaskCount || 0,
  todayCompletedTaskCount: data.todayCompletedTaskCount || 0,
  entryStatuses: data.entryStatuses || [],
  generatedAt: data.generatedAt
})

export const getAdminDashboardOverviewApi = (options?: { silentError?: boolean }) => {
  return request
    .get<AdminDashboardOverviewVO, AdminDashboardOverviewVO>('/admin/dashboard/overview', {
      silentError: options?.silentError
    })
    .then(normalizeAdminDashboardOverview)
}

const isCompatibilityNotFound = (error: unknown) => {
  const payload = error as { code?: number; response?: { status?: number; data?: { code?: number } } }
  return payload.response?.status === 404 || payload.code === 404 || payload.response?.data?.code === 404
}

const normalizeV3DashboardOverview = (data: Partial<V3DashboardOverviewVO> = {}): V3DashboardOverviewVO => {
  const userOverview = normalizeUserDashboardOverview(data)
  const recommendedQuestions = Array.isArray(data.recommendedQuestions)
    ? (data.recommendedQuestions.length
        ? {
            questionCount: data.recommendedQuestions.length,
            items: data.recommendedQuestions as Array<Record<string, unknown>>
          }
        : null)
    : data.recommendedQuestions || null
  return {
    ...data,
    ...userOverview,
    activeStudyPlan: normalizeStudyProgress(data.activeStudyPlan || data.studyProgress || userOverview.activeStudyPlan),
    currentTargetJob: data.currentTargetJob || null,
    latestMatch: data.latestMatch || null,
    studyProgress: normalizeStudyProgress(data.studyProgress || data.activeStudyPlan),
    recommendedQuestions,
    nextActions: data.nextActions || []
  }
}

export const getUserDashboardOverviewApi = async () => {
  try {
    const data = await request.get<UserDashboardOverviewVO, UserDashboardOverviewVO>('/users/dashboard/overview', {
      silentError: true
    })
    return normalizeUserDashboardOverview(data)
  } catch (error) {
    if (!isCompatibilityNotFound(error)) {
      throw error
    }
    const data = await request.get<UserDashboardOverviewVO, UserDashboardOverviewVO>('/dashboard/overview', {
      silentError: true
    })
    return normalizeUserDashboardOverview(data)
  }
}

export const getV3DashboardOverviewApi = (options?: { silentError?: boolean }) => {
  return request
    .get<V3DashboardOverviewVO, V3DashboardOverviewVO>('/dashboard/v3/overview', {
      silentError: options?.silentError
    })
    .then(normalizeV3DashboardOverview)
}
