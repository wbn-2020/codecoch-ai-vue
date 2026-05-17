import request from '@/utils/request'
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
import { buildSseUrl, streamSse } from '@/utils/sse'

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

const toStudyPlanSseParams = (data: StudyPlanGenerateDTO) => ({
  reportId: String(data.reportId),
  resumeId: data.resumeId ? String(data.resumeId) : '',
  optimizeRecordId: data.optimizeRecordId ? String(data.optimizeRecordId) : '',
  targetPosition: data.targetPosition || '',
  industryDirection: data.industryDirection || '',
  expectedDurationDays: data.expectedDurationDays ? String(data.expectedDurationDays) : '',
  extraRequirements: data.extraRequirements || ''
})

export const streamStudyPlanGenerateApi = async (
  data: StudyPlanGenerateDTO,
  handlers: {
    onEvent?: (event: SseEventName, data?: SseEventVO) => void
    onChunk?: (content: string, event: SseEventVO) => void
  },
  signal?: AbortSignal
) => {
  await streamSse<SseEventVO>({
    url: buildSseUrl('/ai/sse/study-plan', toStudyPlanSseParams(data)),
    signal,
    handlers: {
      onEvent: (event, eventData) => {
        handlers.onEvent?.(event, eventData)
        if (event === 'delta' && eventData?.content) {
          handlers.onChunk?.(eventData.content, eventData)
        }
      }
    }
  }).finished
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
