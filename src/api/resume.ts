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

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const toPositiveId = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

const normalizeProject = (project: ResumeProjectVO | null | undefined): ResumeProjectVO => {
  const item: Partial<ResumeProjectVO> = isRecord(project) ? project as Partial<ResumeProjectVO> : {}
  return {
    ...item,
    projectId: toPositiveId(item.projectId || item.id),
    projectTime: item.projectTime || item.projectPeriod || '',
    projectPeriod: item.projectPeriod || item.projectTime || '',
    projectBackground: item.projectBackground || item.description || '',
    responsibility: item.responsibility || item.role || '',
    coreFeatures: item.coreFeatures || item.highlights || '',
    technicalChallenges: item.technicalChallenges || item.technicalDifficulties || '',
    technicalDifficulties: item.technicalDifficulties || item.technicalChallenges || '',
    optimizationResult: item.optimizationResult || item.optimizationResults || '',
    optimizationResults: item.optimizationResults || item.optimizationResult || '',
    sort: item.sort ?? item.sortOrder ?? 0,
    sortOrder: item.sortOrder ?? item.sort ?? 0
  } as ResumeProjectVO
}

const normalizeResume = <T extends ResumeVO | ResumeDetailVO>(resume: T | null | undefined): T => {
  const item = isRecord(resume)
    ? resume as T & Partial<ResumeVO & ResumeDetailVO>
    : {} as T & Partial<ResumeVO & ResumeDetailVO>
  const projects = Array.isArray(item.projects) ? item.projects.map(normalizeProject) : []
  return {
    ...item,
    id: toPositiveId(item.id),
    resumeName: item.resumeName || item.title || '',
    targetPosition: item.targetPosition || '',
    skills: item.skills || item.skillStack || '',
    skillStack: item.skillStack || item.skills || '',
    workSummary: item.workSummary || item.workExperience || '',
    workExperience: item.workExperience || item.workSummary || '',
    education: item.education || item.educationExperience || '',
    educationExperience: item.educationExperience || item.education || '',
    isDefault: item.isDefault ?? 0,
    status: item.status ?? 0,
    projects
  } as T
}

const normalizeResumeListItem = (resume: ResumeVO | null | undefined) => {
  const item = normalizeResume<ResumeVO>(resume)
  return item.id ? item : null
}

const requireResumeDetail = (resume: ResumeDetailVO | null | undefined) => {
  const item = normalizeResume<ResumeDetailVO>(resume)
  if (!item.id) {
    throw new Error('简历详情暂时不可用，请返回简历清单重新选择。')
  }
  return item
}

const requireProjectResult = (project: ResumeProjectVO | null | undefined) => {
  const item = normalizeProject(project)
  if (!item.projectId) {
    throw new Error('项目经历保存结果暂时不可用，请刷新后确认。')
  }
  return item
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
    .then((result) => {
      const page = normalizePageResult<ResumeVO, ResumeVO | null>(result, params, normalizeResumeListItem)
      return {
        ...page,
        records: page.records.filter((item): item is ResumeVO => Boolean(item))
      }
    })
}

export const createResumeApi = (data: ResumeCreateDTO) => {
  return request
    .post<ResumeDetailVO, ResumeDetailVO>('/resumes', toResumePayload(data))
    .then(requireResumeDetail)
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
    .then((result) => {
      const item = isRecord(result) ? result as ApplyResumeOptimizeResultVO : {} as ApplyResumeOptimizeResultVO
      return {
        ...item,
        resumeDetail: item.resumeDetail ? normalizeResume(item.resumeDetail) : undefined
      }
    })
}

export const getResumeDetailApi = (id: number) => {
  return request.get<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`).then(requireResumeDetail)
}

export const updateResumeApi = (id: number, data: ResumeUpdateDTO) => {
  return request
    .put<ResumeDetailVO, ResumeDetailVO>(`/resumes/${id}`, toResumePayload(data))
    .then(requireResumeDetail)
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
    .then(requireProjectResult)
}

export const updateResumeProjectApi = (
  resumeId: number,
  projectId: number,
  data: ResumeProjectDTO
) => {
  return request.put<ResumeProjectVO, ResumeProjectVO>(
    `/resumes/${resumeId}/projects/${projectId}`,
    toProjectPayload(data)
  ).then(requireProjectResult)
}

export const deleteResumeProjectApi = (resumeId: number, projectId: number) => {
  return request.delete<null, null>(`/resumes/${resumeId}/projects/${projectId}`)
}
