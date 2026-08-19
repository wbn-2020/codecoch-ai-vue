import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: request
}))

import { uploadResumeFileApi } from '@/api/resume'
import { RESUME_UPLOAD_TIMEOUT_MS } from '@/features/resume-upload-session'

describe('resume upload API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.post.mockResolvedValue({
      fileId: 11,
      analysisRecordId: 22,
      parseStatus: 'PENDING'
    })
  })

  it.each(['REUSE', 'REPARSE', 'CANCEL'] as const)(
    'sends duplicateDecision=%s as a multipart request field',
    async (decision) => {
      const file = new File(['resume body'], 'renamed-resume.pdf', { type: 'application/pdf' })

      await uploadResumeFileApi(file, { duplicateDecision: decision })

      const formData = request.post.mock.calls[0][1] as FormData
      expect(request.post.mock.calls[0][0]).toBe('/resumes/upload')
      expect(formData.get('file')).toBe(file)
      expect(formData.get('duplicateDecision')).toBe(decision)
      expect(request.post.mock.calls[0][2]).toEqual(expect.objectContaining({
        signal: undefined,
        onUploadProgress: expect.any(Function)
      }))
    }
  )

  it('omits duplicateDecision for the initial server-authoritative check', async () => {
    const file = new File(['same body'], 'another-name.txt', { type: 'text/plain' })

    await uploadResumeFileApi(file)

    const formData = request.post.mock.calls[0][1] as FormData
    expect(formData.get('file')).toBe(file)
    expect(formData.get('duplicateDecision')).toBeNull()
  })

  it('uses the dedicated large-file timeout instead of the shared request timeout', async () => {
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })

    await uploadResumeFileApi(file)

    expect(request.post.mock.calls[0][2]).toEqual(expect.objectContaining({
      timeout: RESUME_UPLOAD_TIMEOUT_MS
    }))
  })
})
