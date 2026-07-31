import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: { get, post, put }
}))

import {
  getPortfolioRehearsalSessionApi,
  resetPortfolioRehearsalSessionApi,
  savePortfolioRehearsalSessionApi
} from '@/api/jobExperiment'

describe('portfolio rehearsal session api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({})
    post.mockResolvedValue({})
    put.mockResolvedValue({})
  })

  it('loads the current rehearsal session', async () => {
    get.mockResolvedValueOnce({
      activeRouteKey: 'deep',
      activeNodeIndex: 2,
      elapsedSeconds: 45,
      completedNodeIds: ['deep-loop', 'deep-experiment']
    })

    const session = await getPortfolioRehearsalSessionApi()

    expect(get).toHaveBeenCalledWith('/portfolio-demo/rehearsal-session')
    expect(session.activeRouteKey).toBe('deep')
    expect(session.completedNodeIds).toEqual(['deep-loop', 'deep-experiment'])
  })

  it('saves rehearsal progress via PUT', async () => {
    const payload = {
      activeRouteKey: 'quick',
      activeNodeIndex: 3,
      elapsedSeconds: 120,
      completedNodeIds: ['quick-target-job']
    }

    await savePortfolioRehearsalSessionApi(payload)

    expect(put).toHaveBeenCalledWith('/portfolio-demo/rehearsal-session', payload)
  })

  it('resets the rehearsal session via POST', async () => {
    await resetPortfolioRehearsalSessionApi()

    expect(post).toHaveBeenCalledWith('/portfolio-demo/rehearsal-session/reset')
  })
})
