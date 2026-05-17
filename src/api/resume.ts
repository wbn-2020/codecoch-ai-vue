import request from '@/utils/request'
import { appConfig } from '@/config'
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
import { getToken } from '@/utils/token'

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

const buildSseUrl = (path: string, params: Record<string, string>) => {
  const baseUrl = appConfig.apiBaseUrl || ''
  const normalizedBase = baseUrl.startsWith('http')
    ? baseUrl
    : `${window.location.origin}${baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`}`
  const url = new URL(`${normalizedBase.replace(/\/$/, '')}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
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

const parseResumeOptimizeSseBlock = (
  block: string
): { event: ResumeOptimizeSseEventType | string; data?: ResumeOptimizeSseEvent } | null => {
  const lines = block.split(/\r?\n/)
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
  const dataText = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')

  if (!dataText) return { event }

  try {
    return { event, data: JSON.parse(dataText) }
  } catch {
    return { event, data: { message: dataText } }
  }
}

export const streamResumeOptimizeApi = (
  params: ResumeOptimizeSseParams,
  handlers: {
    onEvent?: (event: ResumeOptimizeSseEventType | string, data?: ResumeOptimizeSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  const controller = new AbortController()
  const abort = () => controller.abort()

  if (signal) {
    if (signal.aborted) abort()
    signal.addEventListener('abort', abort, { once: true })
  }

  let hasStarted = false
  const finished = (async () => {
    try {
      if (!window.fetch || !window.ReadableStream) {
        throw new Error('当前浏览器不支持 SSE fetch 流式读取')
      }

      const token = getToken()
      const response = await fetch(
        buildSseUrl('/ai/sse/resume-optimize', toResumeOptimizeSseQuery(params)),
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal
        }
      )

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        for (const block of blocks) {
          const parsed = parseResumeOptimizeSseBlock(block.trim())
          if (!parsed) continue
          const eventName = parsed.event === 'message' && parsed.data?.type ? parsed.data.type : parsed.event
          if (eventName === 'start' || eventName === 'progress') {
            hasStarted = true
          }
          handlers.onEvent?.(eventName, parsed.data)
          if (eventName === 'error') {
            throw new Error(parsed.data?.message || 'SSE stream error')
          }
        }
      }

      if (buffer.trim()) {
        const parsed = parseResumeOptimizeSseBlock(buffer.trim())
        if (parsed) {
          const eventName = parsed.event === 'message' && parsed.data?.type ? parsed.data.type : parsed.event
          handlers.onEvent?.(eventName, parsed.data)
        }
      }

      handlers.onDone?.()
    } catch (error) {
      if (controller.signal.aborted) return
      handlers.onError?.(error instanceof Error ? error : new Error(String(error)), hasStarted)
      throw error
    } finally {
      signal?.removeEventListener('abort', abort)
    }
  })()

  return {
    abort,
    cancel: abort,
    finished
  }
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
