import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { AdminFileDownloadAccessDTO, AdminFileQueryDTO, FileInfoVO } from '@/types/file'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

export const getAdminFilesApi = async (params: AdminFileQueryDTO) => {
  const result = await request.get<PageResult<FileInfoVO>, PageResult<FileInfoVO>>('/admin/files', {
    params: compactQueryParams(params)
  })
  return normalizePageResult(result, params)
}

export const getAdminFileDetailApi = (id: number) => {
  return request.get<FileInfoVO, FileInfoVO>(`/admin/files/${id}`)
}

export const downloadAdminFileApi = (id: number, data: AdminFileDownloadAccessDTO) => {
  return request.post<Blob, Blob>(`/admin/files/${id}/download`, data, {
    responseType: 'blob'
  })
}
