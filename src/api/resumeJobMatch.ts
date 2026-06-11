import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ResumeJobMatchCreateDTO,
  ResumeJobMatchQueryDTO,
  ResumeJobMatchReportDetailVO,
  ResumeJobMatchReportListVO,
  ResumeJobMatchSseEvent,
  ResumeJobMatchSseEventType,
  ResumeJobMatchSubmitVO
} from '@/types/resumeJobMatch'
import { compactQueryParams, normalizePageResult } from '@/utils/page'
import { buildSseUrl, streamSse } from '@/utils/sse'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const hasReportId = (value: unknown): value is ResumeJobMatchReportDetailVO =>
  isRecord(value) && Number.isFinite(Number(value.reportId)) && Number(value.reportId) > 0

export const createResumeJobMatchReportApi = (data: ResumeJobMatchCreateDTO) => {
  return request.post<ResumeJobMatchSubmitVO, ResumeJobMatchSubmitVO>(
    '/resume-job-match/reports',
    data
  )
}

const toResumeJobMatchCreateSseQuery = (data: ResumeJobMatchCreateDTO) => ({
  resumeId: String(data.resumeId),
  targetJobId: String(data.targetJobId),
  forceRefresh: data.forceRefresh == null ? '' : String(data.forceRefresh)
})

export const streamCreateResumeJobMatchReportApi = (
  data: ResumeJobMatchCreateDTO,
  handlers: {
    onEvent?: (event: ResumeJobMatchSseEventType, data?: ResumeJobMatchSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<ResumeJobMatchSseEvent>({
    url: buildSseUrl('/ai/sse/resume-job-match/reports', toResumeJobMatchCreateSseQuery(data)),
    signal,
    handlers
  })
}

export const getResumeJobMatchReportsApi = (params?: ResumeJobMatchQueryDTO) => {
  return request
    .get<PageResult<ResumeJobMatchReportListVO>, PageResult<ResumeJobMatchReportListVO>>(
      '/resume-job-match/reports',
      { params: compactQueryParams(params) }
    )
    .then((result) => normalizePageResult(result, params))
}

export const getResumeJobMatchReportDetailApi = (id: number) => {
  return request.get<ResumeJobMatchReportDetailVO, ResumeJobMatchReportDetailVO>(
    `/resume-job-match/reports/${id}`
  )
}

export const regenerateResumeJobMatchReportApi = (id: number) => {
  return request.post<ResumeJobMatchSubmitVO, ResumeJobMatchSubmitVO>(
    `/resume-job-match/reports/${id}/regenerate`
  )
}

export const getLatestResumeJobMatchReportApi = (resumeId: number, targetJobId: number) => {
  return request.get<ResumeJobMatchReportDetailVO | null, ResumeJobMatchReportDetailVO | null>(
    '/resume-job-match/latest',
    {
      params: {
        resumeId,
        targetJobId
      }
    }
  ).then((result) => (hasReportId(result) ? result : null))
}
