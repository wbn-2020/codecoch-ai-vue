import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import type {
  JobReadinessHistoryPageResult,
  JobReadinessSnapshotDetailVO,
  JobReadinessSnapshotVO
} from '@/types/jobRequirement'
const { get } = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get
  }
}))

import {
  getJobReadinessHistoryApi,
  getJobReadinessHistoryPageApi,
  getJobReadinessSnapshotApi
} from '@/api/jobRequirement'

describe('job requirement readiness snapshot api', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({
      id: 42,
      targetJobId: 15,
      snapshotHash: 'snapshot-42',
      dimensions: [],
      warnings: []
    })
  })

  it('requests a readiness snapshot by target and snapshot ID', async () => {
    const result = await getJobReadinessSnapshotApi(15, 42)

    expect(get).toHaveBeenCalledWith('/job-targets/15/readiness-snapshots/42')
    expect(result).toMatchObject({
      id: 42,
      targetJobId: 15,
      snapshotHash: 'snapshot-42'
    })
    expectTypeOf(result).toEqualTypeOf<JobReadinessSnapshotDetailVO>()
  })

  it('requests paged readiness history with the full page contract', async () => {
    const page: JobReadinessHistoryPageResult = {
      records: [
        {
          id: 42,
          targetJobId: 15,
          dimensions: [],
          warnings: []
        }
      ],
      total: 25,
      pageNo: 2,
      pageSize: 10,
      pages: 3
    }
    get.mockResolvedValueOnce(page)

    const result = await getJobReadinessHistoryPageApi(15, {
      pageNo: 2,
      pageSize: 10
    })

    expect(get).toHaveBeenCalledWith('/job-targets/15/readiness-snapshots/page', {
      params: {
        pageNo: 2,
        pageSize: 10
      }
    })
    expect(result).toMatchObject({
      pageNo: 2,
      pageSize: 10,
      total: 25,
      pages: 3,
      records: [{ id: 42 }]
    })
    expectTypeOf(result).toEqualTypeOf<JobReadinessHistoryPageResult>()
  })

  it('keeps the existing history API as a records-only adapter', async () => {
    const records: JobReadinessSnapshotVO[] = [
      {
        id: 42,
        targetJobId: 15,
        dimensions: [],
        warnings: []
      }
    ]
    get.mockResolvedValueOnce({
      records,
      total: 1,
      pageNo: 1,
      pageSize: 20,
      pages: 1
    })

    const result = await getJobReadinessHistoryApi(15)

    expect(get).toHaveBeenCalledWith('/job-targets/15/readiness-snapshots/page', {
      params: {
        pageNo: 1,
        pageSize: 20
      }
    })
    expect(result).toEqual(records)
    expectTypeOf(result).toEqualTypeOf<JobReadinessSnapshotVO[]>()
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
