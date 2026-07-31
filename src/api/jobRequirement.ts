import request from '@/utils/request'
import type {
  JobReadinessHistoryPageQuery,
  JobReadinessHistoryPageResult,
  JobReadinessSnapshotDetailVO,
  JobReadinessSnapshotVO,
  JobRequirementMatrixVO
} from '@/types/jobRequirement'

const DEFAULT_JOB_READINESS_HISTORY_PAGE_SIZE = 20

export const getJobRequirementMatrixApi = (targetJobId: number) =>
  request.get<JobRequirementMatrixVO, JobRequirementMatrixVO>(
    `/job-targets/${targetJobId}/requirement-matrix`
  )

export const materializeJobRequirementsApi = (targetJobId: number) =>
  request.post<unknown, unknown>(
    `/job-targets/${targetJobId}/requirements/materialize`
  )

export const refreshJobRequirementMatrixApi = (targetJobId: number) =>
  request.post<JobRequirementMatrixVO, JobRequirementMatrixVO>(
    `/job-targets/${targetJobId}/requirement-matrix/refresh`
  )

export const getLatestJobReadinessApi = (targetJobId: number) =>
  request.get<JobReadinessSnapshotVO | null, JobReadinessSnapshotVO | null>(
    `/job-targets/${targetJobId}/readiness-snapshots/latest`
  )

export const recalculateJobReadinessApi = (targetJobId: number) =>
  request.post<JobReadinessSnapshotVO, JobReadinessSnapshotVO>(
    `/job-targets/${targetJobId}/readiness-snapshots`
  )

export const getJobReadinessHistoryPageApi = (
  targetJobId: number,
  query: JobReadinessHistoryPageQuery = {}
) =>
  request.get<JobReadinessHistoryPageResult, JobReadinessHistoryPageResult>(
    `/job-targets/${targetJobId}/readiness-snapshots/page`,
    {
      params: {
        pageNo: query.pageNo ?? 1,
        pageSize: query.pageSize ?? DEFAULT_JOB_READINESS_HISTORY_PAGE_SIZE
      }
    }
  )

export const getJobReadinessHistoryApi = async (targetJobId: number) =>
  (await getJobReadinessHistoryPageApi(targetJobId)).records

const assertFinitePositiveInteger = (value: number, parameterName: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${parameterName} must be a finite positive integer`)
  }
}

export const getJobReadinessSnapshotApi = async (
  targetJobId: number,
  snapshotId: number
): Promise<JobReadinessSnapshotDetailVO> => {
  assertFinitePositiveInteger(targetJobId, 'targetJobId')
  assertFinitePositiveInteger(snapshotId, 'snapshotId')
  return request.get<JobReadinessSnapshotDetailVO, JobReadinessSnapshotDetailVO>(
    `/job-targets/${targetJobId}/readiness-snapshots/${snapshotId}`
  )
}
