import {
  normalizeInterviewComparison,
  normalizeInterviewRemediation,
  normalizeInterviewRemediationOptions,
  normalizeInterviewReplayEligibility,
  normalizeInterviewReplay,
  normalizeInterviewReportAdvanced
} from '@/features/interview-comparison'
import type {
  InterviewComparisonCreateDTO,
  InterviewComparisonVO,
  InterviewRemediationCreateDTO,
  InterviewRemediationOptionsVO,
  InterviewRemediationVO,
  InterviewReplayCreateDTO,
  InterviewReplayEligibilityVO,
  InterviewReplayVO,
  InterviewReportAdvancedMeta
} from '@/types/interviewAdvanced'
import request from '@/utils/request'

export const getInterviewAdvancedReportApi = (interviewId: number): Promise<InterviewReportAdvancedMeta> =>
  request
    .get<unknown, unknown>(`/interviews/${interviewId}/report`, { silentError: true })
    .then((result) => normalizeInterviewReportAdvanced(result, interviewId))

export const createInterviewRemediationApi = (
  data: InterviewRemediationCreateDTO
): Promise<InterviewRemediationVO> =>
  request
    .post<unknown, unknown>('/interview-remediations', data)
    .then(normalizeInterviewRemediation)

export const createInterviewReplayApi = (
  sourceSessionId: number,
  data: InterviewReplayCreateDTO
): Promise<InterviewReplayVO> =>
  request
    .post<unknown, unknown>(`/interviews/${sourceSessionId}/replays`, data)
    .then(normalizeInterviewReplay)

export const getInterviewReplayOptionsApi = (
  sourceSessionId: number
): Promise<InterviewReplayEligibilityVO> =>
  request
    .get<unknown, unknown>(`/interviews/${sourceSessionId}/replay-options`, {
      silentError: true
    })
    .then(normalizeInterviewReplayEligibility)

export const getInterviewRemediationOptionsApi = (
  interviewId: number
): Promise<InterviewRemediationOptionsVO> =>
  request
    .get<unknown, unknown>(`/interviews/${interviewId}/remediation-options`)
    .then(normalizeInterviewRemediationOptions)

export const createInterviewComparisonApi = (
  data: InterviewComparisonCreateDTO
): Promise<InterviewComparisonVO> =>
  request
    .post<unknown, unknown>('/interview-comparisons', data)
    .then(normalizeInterviewComparison)

export const getInterviewComparisonsApi = (limit = 20): Promise<InterviewComparisonVO[]> =>
  request
    .get<unknown, unknown[]>('/interview-comparisons', { params: { limit } })
    .then((result) => (Array.isArray(result) ? result : []).map(normalizeInterviewComparison))

export const getInterviewComparisonDetailApi = (id: number): Promise<InterviewComparisonVO> =>
  request
    .get<unknown, unknown>(`/interview-comparisons/${id}`)
    .then(normalizeInterviewComparison)
