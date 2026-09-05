import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, put } = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: { post, put }
}))

import { createApplicationApi, updateApplicationApi } from '@/api/v4'

describe('job application save api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    post.mockResolvedValue({ id: 41 })
    put.mockResolvedValue({ id: 41 })
  })

  it('uses the persisted follow-up result and only sends fields accepted by the save DTO', async () => {
    await updateApplicationApi(41, {
      id: 41,
      resumeId: 8,
      lockVersion: 3,
      companyName: '测试科技',
      jobTitle: 'Java 后端工程师',
      status: 'APPLIED',
      nextFollowUpAt: '2026-08-18 10:30:00',
      updatedAt: '2026-08-15 10:00:00'
    })

    expect(put).toHaveBeenCalledWith('/applications/41', {
      campaignId: undefined,
      targetJobId: undefined,
      resumeVersionId: undefined,
      matchReportId: undefined,
      companyName: '测试科技',
      jobTitle: 'Java 后端工程师',
      source: undefined,
      status: 'APPLIED',
      appliedAt: undefined,
      nextFollowUpAt: '2026-08-18 10:30:00',
      clearNextFollowUp: false,
      note: undefined,
      expectedLockVersion: 3,
      idempotencyKey: 'application-update:41:3:APPLIED:2026-08-18 10:30:00'
    })
  })

  it('uses an explicit clear flag instead of silently dropping an existing follow-up time', async () => {
    await updateApplicationApi(41, {
      lockVersion: 4,
      clearNextFollowUp: true
    })

    expect(put).toHaveBeenCalledWith('/applications/41', expect.objectContaining({
      nextFollowUpAt: undefined,
      clearNextFollowUp: true,
      expectedLockVersion: 4,
      idempotencyKey: 'application-update:41:4:DETAIL:CLEAR_FOLLOW_UP'
    }))
  })

  it('does not pass read-only view fields when creating an application', async () => {
    await createApplicationApi({
      id: 42,
      lockVersion: 9,
      resumeId: 2,
      companyName: '测试科技',
      jobTitle: 'Java 后端工程师',
      nextFollowUpAt: '2026-08-18 10:30:00'
    })

    expect(post).toHaveBeenCalledWith('/applications', expect.objectContaining({
      companyName: '测试科技',
      jobTitle: 'Java 后端工程师',
      nextFollowUpAt: '2026-08-18 10:30:00'
    }))
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('id')
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('lockVersion')
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('resumeId')
  })
})
