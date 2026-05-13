import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminOverviewVO,
  SystemConfigCreateDTO,
  SystemConfigQueryDTO,
  SystemConfigUpdateDTO,
  SystemConfigVO
} from '@/types/system'

export const getAdminSystemOverviewApi = () => {
  return request.get<AdminOverviewVO, AdminOverviewVO>('/admin/system/overview')
}

export const getSystemConfigsApi = (params: SystemConfigQueryDTO) => {
  return request.get<PageResult<SystemConfigVO>, PageResult<SystemConfigVO>>('/admin/configs', {
    params
  })
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
