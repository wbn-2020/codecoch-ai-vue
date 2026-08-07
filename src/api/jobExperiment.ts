import request from '@/utils/request'
import { normalizePageResult } from '@/utils/page'
import type { PageResult } from '@/types/api'
import type {
  JobSearchExperimentDetailVO,
  JobSearchExperimentListVO,
  JobSearchExperimentMetricsVO,
  JobSearchExperimentQueryDTO,
  JobSearchExperimentRelationSaveDTO,
  JobSearchExperimentRelationVO,
  JobSearchExperimentReviewSaveDTO,
  JobSearchExperimentReviewVO,
  JobSearchExperimentSaveDTO,
  PortfolioDemoStatusVO,
  PortfolioDemoStorylineVO,
  PortfolioRehearsalSessionSaveDTO,
  PortfolioRehearsalSessionVO
} from '@/types/jobExperiment'

const normalizeExperiment = <T extends JobSearchExperimentListVO | JobSearchExperimentDetailVO>(item: T): T => ({
  ...item,
  relations: 'relations' in item ? item.relations || [] : undefined,
  reviews: 'reviews' in item ? item.reviews || [] : undefined
} as T)

export const getJobExperimentsApi = (params?: JobSearchExperimentQueryDTO) =>
  request
    .get<PageResult<JobSearchExperimentListVO>, PageResult<JobSearchExperimentListVO>>('/job-experiments', { params })
    .then((result) => normalizePageResult(result, params, normalizeExperiment))

export const createJobExperimentApi = (data: JobSearchExperimentSaveDTO) =>
  request.post<JobSearchExperimentDetailVO, JobSearchExperimentDetailVO>('/job-experiments', data).then(normalizeExperiment)

export const updateJobExperimentApi = (id: number, data: JobSearchExperimentSaveDTO) =>
  request.put<JobSearchExperimentDetailVO, JobSearchExperimentDetailVO>(`/job-experiments/${id}`, data).then(normalizeExperiment)

export const deleteJobExperimentApi = (id: number) => request.delete<void, void>(`/job-experiments/${id}`)

export const getJobExperimentDetailApi = (id: number) =>
  request.get<JobSearchExperimentDetailVO, JobSearchExperimentDetailVO>(`/job-experiments/${id}`).then(normalizeExperiment)

export const addJobExperimentRelationApi = (id: number, data: JobSearchExperimentRelationSaveDTO) =>
  request.post<JobSearchExperimentRelationVO, JobSearchExperimentRelationVO>(`/job-experiments/${id}/relations`, data)

export const deleteJobExperimentRelationApi = (id: number, relationId: number) =>
  request.delete<void, void>(`/job-experiments/${id}/relations/${relationId}`)

export const getJobExperimentMetricsApi = (id: number) =>
  request.get<JobSearchExperimentMetricsVO, JobSearchExperimentMetricsVO>(`/job-experiments/${id}/insights`)

export const getJobExperimentReviewsApi = (id: number) =>
  request.get<JobSearchExperimentReviewVO[], JobSearchExperimentReviewVO[]>(`/job-experiments/${id}/reviews`)

export const createJobExperimentReviewApi = (id: number, data?: JobSearchExperimentReviewSaveDTO) =>
  request.post<JobSearchExperimentReviewVO, JobSearchExperimentReviewVO>(`/job-experiments/${id}/review`, data || {})

export const generateJobExperimentReviewApi = (id: number) =>
  request.post<JobSearchExperimentReviewVO, JobSearchExperimentReviewVO>(`/job-experiments/${id}/reviews/generate`)

export const getPortfolioDemoStatusApi = () =>
  request.get<PortfolioDemoStatusVO, PortfolioDemoStatusVO>('/portfolio-demo/status')

export const loadPortfolioDemoApi = () =>
  request.post<PortfolioDemoStatusVO, PortfolioDemoStatusVO>('/portfolio-demo/load')

export const resetPortfolioDemoApi = () =>
  request.post<PortfolioDemoStatusVO, PortfolioDemoStatusVO>('/portfolio-demo/reset')

export const getPortfolioDemoStorylineApi = () =>
  request.get<PortfolioDemoStorylineVO, PortfolioDemoStorylineVO>('/portfolio-demo/storyline')

export const getPortfolioRehearsalSessionApi = () =>
  request.get<PortfolioRehearsalSessionVO, PortfolioRehearsalSessionVO>('/portfolio-demo/rehearsal-session')

export const savePortfolioRehearsalSessionApi = (data: PortfolioRehearsalSessionSaveDTO) =>
  request.post<PortfolioRehearsalSessionVO, PortfolioRehearsalSessionVO>('/portfolio-demo/rehearsal-session', data)

export const resetPortfolioRehearsalSessionApi = () =>
  request.post<PortfolioRehearsalSessionVO, PortfolioRehearsalSessionVO>('/portfolio-demo/rehearsal-session/reset')
