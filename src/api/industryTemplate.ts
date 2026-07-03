import request from '@/utils/request'
import type { AdminOperationConfirmPayload } from '@/types/adminGovernance'
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
    .then((result) => normalizePageResult(result, params, { allowArrayFallback: true }).records)
}

export const getAdminIndustryTemplateDetailApi = (id: number) => {
  return request.get<IndustryTemplateVO, IndustryTemplateVO>(`/admin/industry-templates/${id}`)
}

export const createAdminIndustryTemplateApi = (data: CreateIndustryTemplateDTO & AdminOperationConfirmPayload) => {
  return request.post<IndustryTemplateVO, IndustryTemplateVO>('/admin/industry-templates', data)
}

export const updateAdminIndustryTemplateApi = (id: number, data: UpdateIndustryTemplateDTO & AdminOperationConfirmPayload) => {
  return request.put<IndustryTemplateVO, IndustryTemplateVO>(`/admin/industry-templates/${id}`, data)
}

export const enableAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.post<null, null>(`/admin/industry-templates/${id}/enable`, data)
}

export const disableAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.post<null, null>(`/admin/industry-templates/${id}/disable`, data)
}

export const deleteAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.delete<null, null>(`/admin/industry-templates/${id}`, { data })
}
