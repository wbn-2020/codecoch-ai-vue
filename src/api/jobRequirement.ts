import request from '@/utils/request'
import type { JobReadinessSnapshotVO, JobRequirementMatrixVO } from '@/types/jobRequirement'

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

export const getJobReadinessHistoryApi = (targetJobId: number) =>
  request.get<JobReadinessSnapshotVO[], JobReadinessSnapshotVO[]>(
    `/job-targets/${targetJobId}/readiness-snapshots`
  )

const assertFinitePositiveInteger = (value: number, parameterName: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${parameterName} must be a finite positive integer`)
  }
}

export const getJobReadinessSnapshotApi = async (
  targetJobId: number,
  snapshotId: number
) => {
  assertFinitePositiveInteger(targetJobId, 'targetJobId')
  assertFinitePositiveInteger(snapshotId, 'snapshotId')
  return request.get<JobReadinessSnapshotVO, JobReadinessSnapshotVO>(
    `/job-targets/${targetJobId}/readiness-snapshots/${snapshotId}`
  )
}
