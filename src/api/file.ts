import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { AdminFileQueryDTO, FileInfoVO } from '@/types/file'
import { normalizePageResult } from '@/utils/page'

export const getAdminFilesApi = async (params: AdminFileQueryDTO) => {
  const result = await request.get<PageResult<FileInfoVO>, PageResult<FileInfoVO>>('/admin/files', {
    params
  })
  return normalizePageResult(result, params)
}

export const getAdminFileDetailApi = (id: number) => {
  return request.get<FileInfoVO, FileInfoVO>(`/admin/files/${id}`)
}
