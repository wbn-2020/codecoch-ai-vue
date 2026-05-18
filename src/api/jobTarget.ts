import request from '@/utils/request'
import type {
  JobDescriptionAnalysisVO,
  JobDescriptionParseDTO,
  TargetJobQueryDTO,
  TargetJobSaveDTO,
  TargetJobVO
} from '@/types/jobTarget'

export const getJobTargetsApi = (params?: TargetJobQueryDTO) => {
  return request.get<TargetJobVO[], TargetJobVO[]>('/job-targets', { params })
}

export const createJobTargetApi = (data: TargetJobSaveDTO) => {
  return request.post<TargetJobVO, TargetJobVO>('/job-targets', data)
}

export const getCurrentJobTargetApi = () => {
  return request.get<TargetJobVO, TargetJobVO>('/job-targets/current')
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

export const getJobDescriptionAnalysisApi = (id: number) => {
  return request.get<JobDescriptionAnalysisVO, JobDescriptionAnalysisVO>(
    `/job-targets/${id}/analysis`
  )
}
