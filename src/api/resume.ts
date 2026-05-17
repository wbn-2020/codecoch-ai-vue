import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ApplyResumeOptimizeResultDTO,
  ApplyResumeOptimizeResultVO,
  ResumeCreateDTO,
  ResumeAnalysisResultVO,
  ResumeConfirmAnalysisVO,
  ResumeDetailVO,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeRequestDTO,
  ResumeOptimizeSubmitVO,
  ResumeOptimizeSseEvent,
  ResumeOptimizeSseEventType,
  ResumeOptimizeSseParams,
  ResumeParseStatusVO,
  ResumeProjectDTO,
  ResumeProjectVO,
  ResumeQueryDTO,
  ResumeUploadVO,
  ResumeUpdateDTO,
  ResumeVO,
  SetDefaultResumeVO
} from '@/types/resume'
import { normalizePageResult } from '@/utils/page'
import { buildSseUrl, streamSse } from '@/utils/sse'

const normalizeProject = (project: ResumeProjectVO): ResumeProjectVO => ({
  ...project,
  projectId: project.projectId || project.id || 0,
  projectTime: project.projectTime || project.projectPeriod || '',
  projectPeriod: project.projectPeriod || project.projectTime || '',
  projectBackground: project.projectBackground || project.description || '',
  responsibility: project.responsibility || project.role || '',
  coreFeatures: project.coreFeatures || project.highlights || '',
  technicalChallenges: project.technicalChallenges || project.technicalDifficulties || '',
  technicalDifficulties: project.technicalDifficulties || project.technicalChallenges || '',
  optimizationResult: project.optimizationResult || project.optimizationResults || '',
  optimizationResults: project.optimizationResults || project.optimizationResult || '',
  sort: project.sort ?? project.sortOrder ?? 0,
  sortOrder: project.sortOrder ?? project.sort ?? 0
})

const normalizeResume = <T extends ResumeVO | ResumeDetailVO>(resume: T): T => {
  const item = resume as T & Partial<ResumeVO & ResumeDetailVO>
  return {
    ...item,
    resumeName: item.resumeName || item.title || '',
    targetPosition: item.targetPosition || '',
    skills: item.skills || item.skillStack || '',
    skillStack: item.skillStack || item.skills || '',
    workSummary: item.workSummary || item.workExperience || '',
    workExperience: item.workExperience || item.workSummary || '',
    education: item.education || item.educationExperience || '',
    educationExperience: item.educationExperience || item.education || '',
    projects: item.projects?.map(normalizeProject) || []
  } as T
}

const toResumePayload = (data: ResumeCreateDTO | ResumeUpdateDTO) => ({
  resumeName: data.resumeName,
  title: data.title || data.resumeName,
  realName: data.realName,
  targetPosition: data.targetPosition,
  email: data.email,
  phone: data.phone,
  skillStack: data.skillStack || data.skills,
  skills: data.skills || data.skillStack,
  workExperience: data.workExperience || data.workSummary,
  workSummary: data.workSummary || data.workExperience,
  educationExperience: data.educationExperience || data.education,
  education: data.education || data.educationExperience,
  summary: data.summary,
  isDefault: data.isDefault
})

const toProjectPayload = (data: ResumeProjectDTO) => ({
  projectName: data.projectName,
  projectPeriod: data.projectPeriod || data.projectTime,
  projectTime: data.projectTime || data.projectPeriod,
  projectBackground: data.projectBackground || data.description,
  role: data.role || data.responsibility,
  responsibility: data.responsibility || data.role,
  techStack: data.techStack,
  description: data.description || data.projectBackground,
  coreFeatures: data.coreFeatures,
  technicalDifficulties: data.technicalDifficulties || data.technicalChallenges,
  technicalChallenges: data.technicalChallenges || data.technicalDifficulties,
  optimizationResults: data.optimizationResults || data.optimizationResult,
  optimizationResult: data.optimizationResult || data.optimizationResults,
  highlights:
    data.highlights ||
    [data.coreFeatures, data.technicalDifficulties || data.technicalChallenges, data.optimizationResults || data.optimizationResult, data.extraInfo]
      .filter(Boolean)
      .join('\n'),
  sort: data.sort ?? data.sortOrder,
  sortOrder: data.sortOrder ?? data.sort
})

export const getResumesApi = (params?: ResumeQueryDTO) => {
  return request
    .get<PageResult<ResumeVO> | ResumeVO[], PageResult<ResumeVO> | ResumeVO[]>('/resumes', {
      params
    })
    .then((result) => normalizePageResult(result, params, normalizeResume))
}

export const createResumeApi = (data: ResumeCreateDTO) => {
  return request
    .post<ResumeDetailVO, ResumeDetailVO>('/resumes', toResumePayload(data))
    .then(normalizeResume)
}

export const uploadResumeFileApi = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<ResumeUploadVO, ResumeUploadVO>('/resumes/upload', formData)
}

export const getResumeParseTaskApi = (analysisRecordId: number) => {
  return request.get<ResumeParseStatusVO, ResumeParseStatusVO>(
    `/resumes/${analysisRecordId}/parse-status`
  )
}

export const createResumeParseTaskApi = uploadResumeFileApi

export const reparseResumeApi = (analysisRecordId: number) => {
  return request.post<ResumeParseStatusVO, ResumeParseStatusVO>(
    `/resumes/${analysisRecordId}/reparse`
  )
}

export const getResumeParseResultApi = (analysisRecordId: number) => {
  return request.get<ResumeAnalysisResultVO, ResumeAnalysisResultVO>(
    `/resumes/${analysisRecordId}/analysis-result`
  )
}

export const confirmResumeParseResultApi = (analysisRecordId: number) => {
  return request.post<ResumeConfirmAnalysisVO, ResumeConfirmAnalysisVO>(
    `/resumes/${analysisRecordId}/confirm-analysis`
  )
}

export const optimizeResumeApi = (resumeId: number, data?: ResumeOptimizeRequestDTO) => {
  return request.post<ResumeOptimizeSubmitVO, ResumeOptimizeSubmitVO>(
    `/resumes/${resumeId}/optimize`,
    data || {}
  )
}

const toResumeOptimizeSseQuery = (params: ResumeOptimizeSseParams) => ({
  resumeId: String(params.resumeId),
  targetPosition: params.targetPosition || '',
  targetCompany: params.targetCompany || '',
  extraRequirements: params.extraRequirements || '',
  optimizeFocus: params.optimizeFocus || '',
  experienceYears: params.experienceYears != null ? String(params.experienceYears) : '',
  industryDirection: params.industryDirection || ''
})

export const streamResumeOptimizeApi = (
  params: ResumeOptimizeSseParams,
  handlers: {
    onEvent?: (event: ResumeOptimizeSseEventType | string, data?: ResumeOptimizeSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<ResumeOptimizeSseEvent>({
    url: buildSseUrl('/ai/sse/resume-optimize', toResumeOptimizeSseQuery(params)),
    signal,
    handlers
  })
}

export const getResumeOptimizeRecordsApi = (resumeId: number) => {
  return request.get<ResumeOptimizeRecordVO[], ResumeOptimizeRecordVO[]>(
    `/resumes/${resumeId}/optimize-records`
  )
}

export const getResumeOptimizeResultApi = (recordId: number) => {
  return request.get<ResumeOptimizeDetailVO, ResumeOptimizeDetailVO>(
    `/resumes/optimize-records/${recordId}`
  )
}

export const getResumeOptimizeCompareApi = getResumeOptimizeResultApi

export const applyResumeOptimizeResultApi = (
  recordId: number,
  data: ApplyResumeOptimizeResultDTO = { applyMode: 'CREATE_DRAFT' }
) => {
  return request
    .post<ApplyResumeOptimizeResultVO, ApplyResumeOptimizeResultVO>(
      `/resumes/optimize-records/${recordId}/apply`,
      data
    )
    .then((result) => ({
      ...result,
      resumeDetail: result.resumeDetail ? normalizeResume(result.resumeDetail) : undefined
    }))
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
