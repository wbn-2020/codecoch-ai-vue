import request from '@/utils/request'
import { appConfig } from '@/config'
import type { PageResult } from '@/types/api'
import type {
  SseEventName,
  SseEventVO,
  StudyPlanDetailVO,
  StudyPlanGenerateDTO,
  StudyPlanGenerateVO,
  StudyPlanListVO,
  StudyPlanQueryDTO,
  StudyTaskStatus,
  StudyTaskVO
} from '@/types/studyPlan'
import { normalizePageResult } from '@/utils/page'
import { getToken } from '@/utils/token'

const normalizePlanListItem = (item: StudyPlanListVO): StudyPlanListVO => ({
  ...item,
  id: item.id || item.reportId,
  planStatus: item.planStatus || 'ACTIVE',
  totalTaskCount: item.totalTaskCount || 0,
  doneTaskCount: item.doneTaskCount || 0,
  progressPercent: item.progressPercent || 0
})

const normalizePlanDetail = (detail: StudyPlanDetailVO): StudyPlanDetailVO => ({
  ...normalizePlanListItem(detail),
  tasks: detail.tasks || []
})

export const generateStudyPlanApi = (data: StudyPlanGenerateDTO) => {
  return request.post<StudyPlanGenerateVO, StudyPlanGenerateVO>('/study-plans/generate', data)
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

const toStudyPlanSseParams = (data: StudyPlanGenerateDTO) => ({
  reportId: String(data.reportId),
  resumeId: data.resumeId ? String(data.resumeId) : '',
  optimizeRecordId: data.optimizeRecordId ? String(data.optimizeRecordId) : '',
  targetPosition: data.targetPosition || '',
  industryDirection: data.industryDirection || '',
  expectedDurationDays: data.expectedDurationDays ? String(data.expectedDurationDays) : '',
  extraRequirements: data.extraRequirements || ''
})

const parseSseBlock = (block: string): { event: SseEventName; data?: SseEventVO } | null => {
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
    return { event, data: { content: dataText } }
  }
}

export const streamStudyPlanGenerateApi = async (
  data: StudyPlanGenerateDTO,
  handlers: {
    onEvent?: (event: SseEventName, data?: SseEventVO) => void
    onChunk?: (content: string, event: SseEventVO) => void
  },
  signal?: AbortSignal
) => {
  const token = getToken()
  const response = await fetch(buildSseUrl('/ai/sse/study-plan', toStudyPlanSseParams(data)), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal
  })

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
      const parsed = parseSseBlock(block.trim())
      if (!parsed) continue
      handlers.onEvent?.(parsed.event, parsed.data)
      if ((parsed.event === 'chunk' || parsed.event === 'delta') && parsed.data?.content) {
        handlers.onChunk?.(parsed.data.content, parsed.data)
      }
      if (parsed.event === 'error') {
        throw new Error(parsed.data?.message || 'SSE stream error')
      }
    }
  }
}

export const regenerateStudyPlanApi = (id: number) => {
  return request.post<StudyPlanGenerateVO, StudyPlanGenerateVO>(`/study-plans/${id}/regenerate`)
}

export const getStudyPlansApi = (params?: StudyPlanQueryDTO) => {
  return request
    .get<PageResult<StudyPlanListVO>, PageResult<StudyPlanListVO>>('/study-plans', { params })
    .then((result) => normalizePageResult(result, params, normalizePlanListItem))
}

export const getStudyPlanDetailApi = (id: number) => {
  return request.get<StudyPlanDetailVO, StudyPlanDetailVO>(`/study-plans/${id}`).then(normalizePlanDetail)
}

export const getStudyPlanTasksApi = (id: number) => {
  return request.get<StudyTaskVO[], StudyTaskVO[]>(`/study-plans/${id}/tasks`)
}

export const updateStudyTaskStatusApi = (taskId: number, taskStatus: StudyTaskStatus) => {
  return request.post<StudyTaskVO, StudyTaskVO>(`/study-tasks/${taskId}/status`, { taskStatus })
}
