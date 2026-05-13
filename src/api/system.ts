import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminOverviewVO,
  SystemConfigCreateDTO,
  SystemConfigQueryDTO,
  SystemConfigUpdateDTO,
  SystemConfigVO
} from '@/types/system'

type BackendSystemConfigVO = SystemConfigVO & {
  valueType?: string
}

const normalizeSystemConfig = (config: BackendSystemConfigVO): SystemConfigVO => ({
  ...config,
  configType: config.configType || config.valueType || 'STRING',
  editable: config.editable ?? 1
})

const normalizeConfigPage = (
  result: PageResult<BackendSystemConfigVO> | BackendSystemConfigVO[],
  params: SystemConfigQueryDTO
): PageResult<SystemConfigVO> => {
  if (Array.isArray(result)) {
    const pageNo = params.pageNo || 1
    const pageSize = params.pageSize || result.length || 10
    return {
      records: result.map(normalizeSystemConfig),
      total: result.length,
      pageNo,
      pageSize,
      pages: Math.max(1, Math.ceil(result.length / pageSize))
    }
  }

  return {
    ...result,
    records: (result.records || []).map(normalizeSystemConfig)
  }
}

export const getAdminSystemOverviewApi = () => {
  return request.get<AdminOverviewVO, AdminOverviewVO>('/admin/system/overview')
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

export const getSystemConfigDetailApi = (key: string) => {
  return request.get<SystemConfigVO, SystemConfigVO>(`/admin/configs/${key}`)
}

export const updateSystemConfigApi = (key: string, data: SystemConfigUpdateDTO) => {
  return request.put<SystemConfigVO, SystemConfigVO>(`/admin/configs/${key}`, data)
}

export const updateSystemConfigStatusApi = (key: string, status: number) => {
  return request.put<SystemConfigVO, SystemConfigVO>(`/admin/configs/${key}/status`, { status })
}

export const deleteSystemConfigApi = (key: string) => {
  return request.delete<null, null>(`/admin/configs/${key}`)
}
