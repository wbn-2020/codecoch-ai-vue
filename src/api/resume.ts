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

const normalizeProject = (project: ResumeProjectVO): ResumeProjectVO => ({
  ...project,
  projectId: project.projectId || project.id || 0,
  projectBackground: project.projectBackground || project.description || '',
  responsibility: project.responsibility || project.role || '',
  coreFeatures: project.coreFeatures || project.highlights || ''
})

const normalizeResume = <T extends ResumeVO | ResumeDetailVO>(resume: T): T => ({
  ...resume,
  resumeName: resume.resumeName || resume.title || '',
  targetPosition: resume.targetPosition || resume.realName || '',
  skills: resume.skills || resume.summary || '',
  projects: 'projects' in resume ? resume.projects?.map(normalizeProject) || [] : undefined
} as T)

const toResumePayload = (data: ResumeCreateDTO | ResumeUpdateDTO) => ({
  title: data.title || data.resumeName,
  realName: data.realName || data.targetPosition,
  email: data.email,
  phone: data.phone,
  summary: data.summary || data.skills || data.workSummary
})

const toProjectPayload = (data: ResumeProjectDTO) => ({
  projectName: data.projectName,
  role: data.role || data.responsibility,
  techStack: data.techStack,
  description: data.description || data.projectBackground,
  highlights:
    data.highlights ||
    [data.coreFeatures, data.technicalChallenges, data.optimizationResult, data.extraInfo]
      .filter(Boolean)
      .join('\n'),
  sort: data.sort
})

export const getResumesApi = (params?: ResumeQueryDTO) => {
  return request
    .get<PageResult<ResumeVO> | ResumeVO[], PageResult<ResumeVO> | ResumeVO[]>('/resumes', {
      params
    })
    .then((result) => {
      if (Array.isArray(result)) {
        return {
          records: result.map(normalizeResume),
          total: result.length,
          pageNo: params?.pageNo || 1,
          pageSize: params?.pageSize || result.length || 10,
          pages: 1
        }
      }

      return {
        ...result,
        records: (result.records || []).map(normalizeResume)
      }
    })
}

export const createResumeApi = (data: ResumeCreateDTO) => {
  return request
    .post<ResumeDetailVO, ResumeDetailVO>('/resumes', toResumePayload(data))
    .then(normalizeResume)
}

export const getResumeDetailApi = (id: number) => {
  return request.get<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`).then(normalizeResume)
}

export const updateResumeApi = (id: number, data: ResumeUpdateDTO) => {
  return request
    .put<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`, toResumePayload(data))
    .then(normalizeResume)
}

export const deleteResumeApi = (id: number) => {
  return request.delete<null, null>(`/resumes/${id}`)
}

export const setDefaultResumeApi = (id: number) => {
  return request.put<SetDefaultResumeVO, SetDefaultResumeVO>(`/resumes/${id}/default`)
}

export const createResumeProjectApi = (resumeId: number, data: ResumeProjectDTO) => {
  return request
    .post<ResumeProjectVO, ResumeProjectVO>(`/resumes/${resumeId}/projects`, toProjectPayload(data))
    .then(normalizeProject)
}

export const updateResumeProjectApi = (
  resumeId: number,
  projectId: number,
  data: ResumeProjectDTO
) => {
  return request.put<ResumeProjectVO, ResumeProjectVO>(
    `/resumes/${resumeId}/projects/${projectId}`,
    toProjectPayload(data)
  ).then(normalizeProject)
}

export const deleteResumeProjectApi = (resumeId: number, projectId: number) => {
  return request.delete<null, null>(`/resumes/${resumeId}/projects/${projectId}`)
}
