import request from '@/utils/request'

export interface AdminSystemOverviewVO {
  userCount: number
  questionCount: number
  interviewCount: number
  aiCallCount: number
}

// Reserved for later system-service integration. Admin dashboard currently uses local placeholders.
export const getAdminSystemOverviewApi = () => {
  return request.get<AdminSystemOverviewVO, AdminSystemOverviewVO>('/admin/system/overview')
}
