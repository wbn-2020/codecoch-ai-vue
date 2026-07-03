import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { AdminOperationConfirmPayload } from '@/types/adminGovernance'
import type {
  AdminOverviewVO,
  SystemConfigCreateDTO,
  SystemConfigQueryDTO,
  SystemConfigUpdateDTO,
  SystemConfigVO
} from '@/types/system'
import { compactQueryParams } from '@/utils/page'

type BackendSystemConfigVO = SystemConfigVO & {
  valueType?: string
}

type BackendSystemConfigSaveDTO = {
  configKey?: string
  configValue?: string
  valueType?: string
  status?: number
  description?: string
  confirm?: boolean
  dryRun?: boolean
  reason?: string
  idempotencyKey?: string
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
  configType: config.configType || 'STRING',
  editable: config.editable ?? 1
})

const normalizeConfigPage = (result: PageResult<BackendSystemConfigVO>): PageResult<SystemConfigVO> => ({
  ...result,
  records: Array.isArray(result.records) ? result.records.map(normalizeSystemConfig) : []
})

const toBackendCreateConfigPayload = (data: SystemConfigCreateDTO): BackendSystemConfigSaveDTO => {
  const confirmation = data as Partial<AdminOperationConfirmPayload>
  return {
    configKey: data.configKey,
    configValue: data.configValue,
    valueType: data.configType,
    status: data.status,
    description: data.description,
    confirm: confirmation.confirm,
    dryRun: confirmation.dryRun,
    reason: confirmation.reason,
    idempotencyKey: confirmation.idempotencyKey
  }
}

const toBackendUpdateConfigPayload = (
  data: Partial<SystemConfigUpdateDTO> & Partial<AdminOperationConfirmPayload>
): BackendSystemConfigSaveDTO => {
  const confirmation = data as Partial<AdminOperationConfirmPayload>
  return {
    configValue: data.configValue,
    description: data.description,
    confirm: confirmation.confirm,
    dryRun: confirmation.dryRun,
    reason: confirmation.reason,
    idempotencyKey: confirmation.idempotencyKey
  }
}

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
    PageResult<BackendSystemConfigVO>,
    PageResult<BackendSystemConfigVO>
  >('/admin/configs', {
    params: compactQueryParams(params)
  })
  return normalizeConfigPage(result)
}

export const createSystemConfigApi = (data: SystemConfigCreateDTO & AdminOperationConfirmPayload) => {
  return request
    .post<BackendSystemConfigVO, BackendSystemConfigVO>('/admin/configs', toBackendCreateConfigPayload(data))
    .then(normalizeSystemConfig)
}

export const updateSystemConfigByIdApi = (
  id: number,
  data: Partial<SystemConfigUpdateDTO> & AdminOperationConfirmPayload
) => {
  return request
    .put<BackendSystemConfigVO, BackendSystemConfigVO>(`/admin/configs/${id}`, toBackendUpdateConfigPayload(data))
    .then(normalizeSystemConfig)
}

export const updateSystemConfigByKeyApi = (
  configKey: string,
  data: Partial<SystemConfigUpdateDTO> & AdminOperationConfirmPayload
) => {
  return request
    .put<BackendSystemConfigVO, BackendSystemConfigVO>(
      `/admin/configs/keys/${encodeURIComponent(configKey)}`,
      toBackendUpdateConfigPayload(data)
    )
    .then(normalizeSystemConfig)
}

export const updateSystemConfigApi = (
  id: number,
  data: Partial<SystemConfigUpdateDTO> & AdminOperationConfirmPayload
) => updateSystemConfigByIdApi(id, data)

export const deleteSystemConfigApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.delete<null, null>(`/admin/configs/${id}`, { data })
}
