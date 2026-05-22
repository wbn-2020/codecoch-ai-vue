import request from '@/utils/request'
import type {
  JobDescriptionAnalysisVO,
  JobDescriptionParseDTO,
  JobTargetParseSseEvent,
  JobTargetParseSseEventType,
  TargetJobQueryDTO,
  TargetJobSaveDTO,
  TargetJobVO
} from '@/types/jobTarget'
import { buildSseUrl, streamSse } from '@/utils/sse'

export const getJobTargetsApi = (params?: TargetJobQueryDTO) => {
  return request.get<TargetJobVO[], TargetJobVO[]>('/job-targets', { params })
}

export const createJobTargetApi = (data: TargetJobSaveDTO) => {
  return request.post<TargetJobVO, TargetJobVO>('/job-targets', data)
}

export const getCurrentJobTargetApi = () => {
  return request.get<TargetJobVO | null, TargetJobVO | null>('/job-targets/current')
}

export const getJobTargetDetailApi = (id: number) => {
  return request.get<TargetJobVO, TargetJobVO>(`/job-targets/${id}`)
}

export const updateJobTargetApi = (id: number, data: TargetJobSaveDTO) => {
  return request.put<TargetJobVO, TargetJobVO>(`/job-targets/${id}`, data)
}

export const deleteJobTargetApi = (id: number) => {
  return request.delete<void, void>(`/job-targets/${id}`)
}

export const setCurrentJobTargetApi = (id: number) => {
  return request.post<TargetJobVO, TargetJobVO>(`/job-targets/${id}/set-current`)
}

export const parseJobDescriptionApi = (id: number, data?: JobDescriptionParseDTO) => {
  return request.post<JobDescriptionAnalysisVO, JobDescriptionAnalysisVO>(
    `/job-targets/${id}/parse`,
    data || {}
  )
}

const toJobDescriptionParseSseQuery = (data?: JobDescriptionParseDTO) => ({
  forceRefresh: data?.forceRefresh == null ? '' : String(data.forceRefresh),
  userTargetDirection: data?.userTargetDirection || ''
})

export const streamJobDescriptionParseApi = (
  id: number,
  data: JobDescriptionParseDTO | undefined,
  handlers: {
    onEvent?: (event: JobTargetParseSseEventType, data?: JobTargetParseSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<JobTargetParseSseEvent>({
    url: buildSseUrl(`/ai/sse/job-targets/${id}/parse`, toJobDescriptionParseSseQuery(data)),
    signal,
    handlers
  })
}

export const getJobDescriptionAnalysisApi = (id: number) => {
  return request.get<JobDescriptionAnalysisVO | null, JobDescriptionAnalysisVO | null>(
    `/job-targets/${id}/analysis`
  )
}
