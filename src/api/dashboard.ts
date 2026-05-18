import request from '@/utils/request'
import type { AdminDashboardOverviewVO, UserDashboardOverviewVO } from '@/types/dashboard'

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

const normalizeUserDashboardOverview = (data: Partial<UserDashboardOverviewVO> = {}): UserDashboardOverviewVO => ({
  resumeCount: data.resumeCount || 0,
  recentResumeParse: data.recentResumeParse || null,
  recentResumeOptimize: data.recentResumeOptimize || null,
  interviewCount: data.interviewCount || 0,
  recentInterview: data.recentInterview || null,
  recentReport: data.recentReport || null,
  studyPlanCount: data.studyPlanCount || 0,
  activeStudyPlan: data.activeStudyPlan || null,
  todayTaskCount: data.todayTaskCount || 0,
  todayCompletedTaskCount: data.todayCompletedTaskCount || 0,
  entryStatuses: data.entryStatuses || [],
  generatedAt: data.generatedAt
})

export const getAdminDashboardOverviewApi = () => {
  return request
    .get<AdminDashboardOverviewVO, AdminDashboardOverviewVO>('/admin/dashboard/overview')
    .then(normalizeAdminDashboardOverview)
}

export const getUserDashboardOverviewApi = async () => {
  try {
    const data = await request.get<UserDashboardOverviewVO, UserDashboardOverviewVO>('/dashboard/overview')
    return normalizeUserDashboardOverview(data)
  } catch (error) {
    const data = await request.get<UserDashboardOverviewVO, UserDashboardOverviewVO>('/users/dashboard/overview')
    return normalizeUserDashboardOverview(data)
  }
}
