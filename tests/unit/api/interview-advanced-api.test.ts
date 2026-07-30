import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get,
    post
  }
}))

import { getInterviewReplayOptionsApi } from '@/api/interviewAdvanced'

describe('interview advanced api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('loads and normalizes replay eligibility from the independent endpoint', async () => {
    get.mockResolvedValue({
      interviewId: 42,
      state: 'INELIGIBLE',
      replayAvailable: false,
      reasonCode: 'SCENARIO_VERSION_INVALID',
      reasonMessage: '源场次绑定的场景版本不可用于历史克隆',
      policyVersion: 'REPLAY_ELIGIBILITY_V2'
    })

    await expect(getInterviewReplayOptionsApi(42)).resolves.toEqual({
      state: 'INELIGIBLE',
      reasonCode: 'SCENARIO_VERSION_INVALID',
      reasonMessage: '源场次绑定的场景版本不可用于历史克隆',
      policyVersion: 'REPLAY_ELIGIBILITY_V2'
    })
    expect(get).toHaveBeenCalledWith(
      '/interviews/42/replay-options',
      { silentError: true }
    )
  })
})
