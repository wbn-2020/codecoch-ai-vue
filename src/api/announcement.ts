import request from '@/utils/request'
import type { AdminOperationConfirmPayload } from '@/types/adminGovernance'
import type { PageResult } from '@/types/api'
import type { AnnouncementQueryDTO, AnnouncementSaveDTO, AnnouncementVO } from '@/types/announcement'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

export const getAdminAnnouncementsApi = async (params: AnnouncementQueryDTO) => {
  const result = await request.get<
    PageResult<AnnouncementVO> | AnnouncementVO[],
    PageResult<AnnouncementVO> | AnnouncementVO[]
  >('/admin/announcements', {
    params: compactQueryParams(params)
  })
  return normalizePageResult(result, params)
}

export const getAdminAnnouncementDetailApi = (id: number) => {
  return request.get<AnnouncementVO, AnnouncementVO>(`/admin/announcements/${id}`)
}

export const createAdminAnnouncementApi = (data: AnnouncementSaveDTO & AdminOperationConfirmPayload) => {
  return request.post<number, number>('/admin/announcements', data)
}

export const updateAdminAnnouncementApi = (
  id: number,
  data: AnnouncementSaveDTO & AdminOperationConfirmPayload
) => {
  return request.put<null, null>(`/admin/announcements/${id}`, data)
}

export const publishAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.post<null, null>(`/admin/announcements/${id}/publish`, data)
}

export const offlineAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.post<null, null>(`/admin/announcements/${id}/offline`, data)
}

export const deleteAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload) => {
  return request.delete<null, null>(`/admin/announcements/${id}`, { data })
}

export const getPublishedAnnouncementsApi = () => {
  return request.get<AnnouncementVO[], AnnouncementVO[]>('/announcements')
}
