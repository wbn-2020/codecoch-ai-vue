import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ResumeCreateDTO,
  ResumeDetailVO,
  ResumeProjectDTO,
  ResumeProjectVO,
  ResumeQueryDTO,
  ResumeUpdateDTO,
  ResumeVO,
  SetDefaultResumeVO
} from '@/types/resume'

export const getResumesApi = (params?: ResumeQueryDTO) => {
  return request.get<PageResult<ResumeVO>, PageResult<ResumeVO>>('/resumes', { params })
}

export const createResumeApi = (data: ResumeCreateDTO) => {
  return request.post<ResumeDetailVO, ResumeDetailVO>('/resumes', data)
}

export const getResumeDetailApi = (id: number) => {
  return request.get<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`)
}

export const updateResumeApi = (id: number, data: ResumeUpdateDTO) => {
  return request.put<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`, data)
}

export const deleteResumeApi = (id: number) => {
  return request.delete<null, null>(`/resumes/${id}`)
}

export const setDefaultResumeApi = (id: number) => {
  return request.put<SetDefaultResumeVO, SetDefaultResumeVO>(`/resumes/${id}/default`)
}

export const createResumeProjectApi = (resumeId: number, data: ResumeProjectDTO) => {
  return request.post<ResumeProjectVO, ResumeProjectVO>(`/resumes/${resumeId}/projects`, data)
}

export const updateResumeProjectApi = (projectId: number, data: ResumeProjectDTO) => {
  return request.put<ResumeProjectVO, ResumeProjectVO>(`/resumes/projects/${projectId}`, data)
}

export const deleteResumeProjectApi = (projectId: number) => {
  return request.delete<null, null>(`/resumes/projects/${projectId}`)
}
