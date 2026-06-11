import request from '@/utils/request'
import type {
  AdminIndustryTemplateQuery,
  CreateIndustryTemplateDTO,
  IndustryTemplateVO,
  UpdateIndustryTemplateDTO
} from '@/types/industryTemplate'
import type { PageResult } from '@/types/api'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

export const getAdminIndustryTemplatesApi = (params?: AdminIndustryTemplateQuery) => {
  return request
    .get<IndustryTemplateVO[] | PageResult<IndustryTemplateVO>, IndustryTemplateVO[] | PageResult<IndustryTemplateVO>>(
      '/admin/industry-templates',
      { params: compactQueryParams(params) }
    )
    .then((result) => normalizePageResult(result, params).records)
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
