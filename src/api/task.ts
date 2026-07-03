import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { AsyncTaskQueryDTO, AsyncTaskVO } from '@/types/asyncTask'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

const normalizeAsyncTask = (task: AsyncTaskVO): AsyncTaskVO => ({
  ...task,
  status: task.status || 'PENDING'
})

export const getUserAsyncTasksApi = (params?: AsyncTaskQueryDTO) => {
  return request
    .get<PageResult<AsyncTaskVO>, PageResult<AsyncTaskVO>>('/tasks', { params: compactQueryParams(params) })
    .then((result) => normalizePageResult(result, params, normalizeAsyncTask))
}

export const getUserAsyncTaskDetailApi = (id: number) => {
  return request.get<AsyncTaskVO, AsyncTaskVO>(`/tasks/${id}`).then(normalizeAsyncTask)
}
