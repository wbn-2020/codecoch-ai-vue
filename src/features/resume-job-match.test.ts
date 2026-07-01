import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getLatestResumeJobMatchReportApi,
  streamCreateResumeJobMatchReportApi
} from '@/api/resumeJobMatch'
import request from '@/utils/request'
import { streamSse } from '@/utils/sse'

vi.mock('@/utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/utils/sse', async () => {
  const actual = await vi.importActual<typeof import('@/utils/sse')>('@/utils/sse')
  return {
    ...actual,
    streamSse: vi.fn()
  }
})

describe('resume job match api contract', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('passes resumeVersionId to SSE report creation query', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })

    streamCreateResumeJobMatchReportApi(
      {
        resumeId: 1,
        targetJobId: 2,
        resumeVersionId: 4,
        forceRefresh: true
      },
      {}
    )

    const options = vi.mocked(streamSse).mock.calls[0][0]
    expect(options.url).toContain('resumeVersionId=4')
  })

  it('passes resumeVersionId to latest report query when provided', () => {
    vi.mocked(request.get).mockResolvedValue(null)

    getLatestResumeJobMatchReportApi(1, 2, 4)

    expect(request.get).toHaveBeenCalledWith('/resume-job-match/latest', {
      params: {
        resumeId: 1,
        targetJobId: 2,
        resumeVersionId: 4
      }
    })
  })
})
