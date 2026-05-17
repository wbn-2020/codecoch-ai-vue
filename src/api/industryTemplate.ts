import request from '@/utils/request'
import type {
  AdminIndustryTemplateQuery,
  CreateIndustryTemplateDTO,
  IndustryTemplateVO,
  UpdateIndustryTemplateDTO
} from '@/types/industryTemplate'

export const getAdminIndustryTemplatesApi = (params?: AdminIndustryTemplateQuery) => {
  return request.get<IndustryTemplateVO[], IndustryTemplateVO[]>('/admin/industry-templates', {
    params
  })
}

export const getAdminIndustryTemplateDetailApi = (id: number) => {
  return request.get<IndustryTemplateVO, IndustryTemplateVO>(`/admin/industry-templates/${id}`)
}

export const createAdminIndustryTemplateApi = (data: CreateIndustryTemplateDTO) => {
  return request.post<IndustryTemplateVO, IndustryTemplateVO>('/admin/industry-templates', data)
}

export const updateAdminIndustryTemplateApi = (id: number, data: UpdateIndustryTemplateDTO) => {
  return request.put<IndustryTemplateVO, IndustryTemplateVO>(`/admin/industry-templates/${id}`, data)
}

export const enableAdminIndustryTemplateApi = (id: number) => {
  return request.post<null, null>(`/admin/industry-templates/${id}/enable`)
}

export const disableAdminIndustryTemplateApi = (id: number) => {
  return request.post<null, null>(`/admin/industry-templates/${id}/disable`)
}

export const deleteAdminIndustryTemplateApi = (id: number) => {
  return request.delete<null, null>(`/admin/industry-templates/${id}`)
}
