import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, deleteRequest } = vi.hoisted(() => ({
  post: vi.fn(),
  deleteRequest: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get: vi.fn(),
    post,
    delete: deleteRequest
  }
}))

import {
  deleteInterviewVoiceAudioApi,
  discardInterviewVoiceSubmissionApi,
  uploadInterviewVoiceAudioApi
} from './interview'

describe('interview voice api', () => {
  beforeEach(() => {
    post.mockReset()
    deleteRequest.mockReset()
  })

  it('passes AbortSignal to voice upload', () => {
    const controller = new AbortController()
    const file = new File([new Uint8Array([1])], 'voice.webm', { type: 'audio/webm' })

    uploadInterviewVoiceAudioApi(file, { signal: controller.signal, silentError: true })

    expect(post).toHaveBeenCalledWith(
      '/files/upload',
      expect.any(FormData),
      expect.objectContaining({
        signal: controller.signal,
        silentError: true
      })
    )
  })

  it('sends lifecycle reason and supports uploaded-file cleanup', () => {
    discardInterviewVoiceSubmissionApi(3, 5, 'QUESTION_CHANGED', { silentError: true })
    deleteInterviewVoiceAudioApi(9, { silentError: true })

    expect(post).toHaveBeenCalledWith(
      '/interviews/3/voice/submissions/5/discard',
      { reason: 'QUESTION_CHANGED' },
      { silentError: true }
    )
    expect(deleteRequest).toHaveBeenCalledWith(
      '/files/9',
      expect.objectContaining({
        params: { bizType: 'INTERVIEW_VOICE' },
        silentError: true
      })
    )
  })
})
