import { beforeEach, describe, expect, it, vi } from 'vitest'

import request from '@/utils/request'
import { getAdminAgentRunsApi } from '@/api/adminAgent'
import { getAdminAiLogsApi } from '@/api/aiAdmin'
import { getAdminAiResultFeedbackListApi } from '@/api/aiFeedback'

vi.mock('@/utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

const emptyPage = {
  records: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  pages: 1
}

describe('admin AI traceability API contracts', () => {
  beforeEach(() => {
    vi.mocked(request.get).mockReset()
    vi.mocked(request.post).mockReset()
    vi.mocked(request.get).mockResolvedValue(emptyPage)
  })

  it('passes traceId and aiCallLogId when querying admin agent runs', async () => {
    await getAdminAgentRunsApi({
      pageNum: 1,
      pageSize: 10,
      traceId: ' trace-agent-001 ',
      aiCallLogId: 42
    })

    expect(request.get).toHaveBeenCalledWith('/admin/agent/runs', {
      params: expect.objectContaining({
        pageNo: 1,
        pageSize: 10,
        traceId: 'trace-agent-001',
        aiCallLogId: 42
      })
    })
  })

  it('passes traceId when querying admin AI call logs', async () => {
    await getAdminAiLogsApi({
      pageNo: 1,
      pageSize: 10,
      traceId: ' trace-ai-001 '
    })

    expect(request.get).toHaveBeenCalledWith('/admin/ai/logs', {
      params: expect.objectContaining({
        pageNo: 1,
        pageSize: 10,
        traceId: 'trace-ai-001'
      })
    })
  })

  it('passes feedback filters for traceId and aiCallLogId', async () => {
    await getAdminAiResultFeedbackListApi({
      pageNo: 2,
      pageSize: 20,
      traceId: ' trace-feedback-001 ',
      aiCallLogId: 42,
      feedbackType: 'INACCURATE'
    })

    expect(request.get).toHaveBeenCalledWith('/admin/ai/feedback', {
      params: expect.objectContaining({
        pageNo: 2,
        pageSize: 20,
        traceId: 'trace-feedback-001',
        aiCallLogId: 42,
        feedbackType: 'INACCURATE'
      })
    })
  })
})
