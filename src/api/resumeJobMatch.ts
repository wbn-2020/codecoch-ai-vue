import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ResumeJobMatchCreateDTO,
  ResumeJobMatchQueryDTO,
  ResumeJobMatchReportDetailVO,
  ResumeJobMatchReportListVO,
  ResumeJobMatchSubmitVO
} from '@/types/resumeJobMatch'
import { normalizePageResult } from '@/utils/page'

export const createResumeJobMatchReportApi = (data: ResumeJobMatchCreateDTO) => {
  return request.post<ResumeJobMatchSubmitVO, ResumeJobMatchSubmitVO>(
    '/resume-job-match/reports',
    data
  )
}

export const getResumeJobMatchReportsApi = (params?: ResumeJobMatchQueryDTO) => {
  return request
    .get<PageResult<ResumeJobMatchReportListVO>, PageResult<ResumeJobMatchReportListVO>>(
      '/resume-job-match/reports',
      { params }
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
  return request.get<ResumeJobMatchReportDetailVO, ResumeJobMatchReportDetailVO>(
    '/resume-job-match/latest',
    {
      params: {
        resumeId,
        targetJobId
      }
    }
  )
}
