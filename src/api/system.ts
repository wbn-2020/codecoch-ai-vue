import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminOverviewVO,
  SystemConfigCreateDTO,
  SystemConfigQueryDTO,
  SystemConfigUpdateDTO,
  SystemConfigVO
} from '@/types/system'
import { normalizePageResult } from '@/utils/page'

type BackendSystemConfigVO = SystemConfigVO & {
  valueType?: string
}

type BackendAdminOverviewVO = Partial<AdminOverviewVO> & {
  usersCount?: number
  questionsCount?: number
  resumesCount?: number
  interviewsCount?: number
  completedInterviewsCount?: number
  aiCallsCount?: number
  aiCallFailedCount?: number
  promptsCount?: number
  todayInterviewsCount?: number
  todayAiCallsCount?: number
}

const normalizeSystemConfig = (config: BackendSystemConfigVO): SystemConfigVO => ({
  ...config,
  configType: config.configType || config.valueType || 'STRING',
  editable: config.editable ?? 1
})

const normalizeConfigPage = (
  result: PageResult<BackendSystemConfigVO> | BackendSystemConfigVO[],
  params: SystemConfigQueryDTO
): PageResult<SystemConfigVO> => normalizePageResult(result, params, normalizeSystemConfig)

const normalizeAdminOverview = (data: BackendAdminOverviewVO): AdminOverviewVO => ({
  userCount: data.userCount ?? data.usersCount ?? 0,
  questionCount: data.questionCount ?? data.questionsCount ?? 0,
  resumeCount: data.resumeCount ?? data.resumesCount ?? 0,
  interviewCount: data.interviewCount ?? data.interviewsCount ?? 0,
  completedInterviewCount: data.completedInterviewCount ?? data.completedInterviewsCount ?? 0,
  aiCallCount: data.aiCallCount ?? data.aiCallsCount ?? 0,
  aiCallFailedCount: data.aiCallFailedCount ?? 0,
  promptCount: data.promptCount ?? data.promptsCount ?? 0,
  todayInterviewCount: data.todayInterviewCount ?? data.todayInterviewsCount ?? 0,
  todayAiCallCount: data.todayAiCallCount ?? data.todayAiCallsCount ?? 0
})

export const getAdminSystemOverviewApi = () => {
  return request
    .get<BackendAdminOverviewVO, BackendAdminOverviewVO>('/admin/system/overview')
    .then(normalizeAdminOverview)
}

export const getSystemConfigsApi = async (params: SystemConfigQueryDTO) => {
  const result = await request.get<
    PageResult<BackendSystemConfigVO> | BackendSystemConfigVO[],
    PageResult<BackendSystemConfigVO> | BackendSystemConfigVO[]
  >('/admin/configs', {
    params
  })
  return normalizeConfigPage(result, params)
}

export const createSystemConfigApi = (data: SystemConfigCreateDTO) => {
  return request.post<SystemConfigVO, SystemConfigVO>('/admin/configs', data)
}

export const updateSystemConfigApi = (id: number, data: SystemConfigUpdateDTO) => {
  return request.put<SystemConfigVO, SystemConfigVO>(`/admin/configs/${id}`, data)
}

export const deleteSystemConfigApi = (id: number) => {
  return request.delete<null, null>(`/admin/configs/${id}`)
}
