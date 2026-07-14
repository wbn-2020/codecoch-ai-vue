import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get
  }
}))

import { getJobReadinessSnapshotApi } from '@/api/jobRequirement'

describe('job requirement readiness snapshot api', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ id: 42 })
  })

  it('requests a readiness snapshot by target and snapshot ID', async () => {
    await getJobReadinessSnapshotApi(15, 42)

    expect(get).toHaveBeenCalledWith('/job-targets/15/readiness-snapshots/42')
  })

  it.each([
    ['targetJobId', 0, 42],
    ['targetJobId', -1, 42],
    ['targetJobId', 1.5, 42],
    ['targetJobId', Number.NaN, 42],
    ['targetJobId', Number.POSITIVE_INFINITY, 42],
    ['targetJobId', Number.MAX_SAFE_INTEGER + 1, 42],
    ['snapshotId', 15, 0],
    ['snapshotId', 15, -1],
    ['snapshotId', 15, 1.5],
    ['snapshotId', 15, Number.NaN],
    ['snapshotId', 15, Number.POSITIVE_INFINITY],
    ['snapshotId', 15, Number.MAX_SAFE_INTEGER + 1]
  ])('rejects invalid %s before sending a request', async (parameter, targetJobId, snapshotId) => {
    await expect(getJobReadinessSnapshotApi(targetJobId, snapshotId))
      .rejects.toThrow(`${parameter} must be a finite positive integer`)

    expect(get).not.toHaveBeenCalled()
  })
})
