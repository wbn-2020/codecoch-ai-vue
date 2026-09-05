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

import {
  deleteApplicationAttachmentApi,
  downloadApplicationAttachmentApi,
  getApplicationAttachmentsApi,
  replaceApplicationAttachmentApi,
  uploadApplicationAttachmentApi
} from '@/api/v4'

describe('job application attachment api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.get.mockResolvedValue([])
    request.post.mockResolvedValue({ id: 11 })
    request.put.mockResolvedValue({ id: 11 })
    request.delete.mockResolvedValue(undefined)
  })

  it('uploads attachment metadata and file as multipart data', async () => {
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })

    await uploadApplicationAttachmentApi(41, file, {
      attachmentType: 'RESUME',
      displayName: '后端岗位简历'
    })

    expect(request.post).toHaveBeenCalledWith(
      '/applications/41/attachments',
      expect.any(FormData)
    )
    const body = request.post.mock.calls[0]?.[1] as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('attachmentType')).toBe('RESUME')
    expect(body.get('displayName')).toBe('后端岗位简历')
  })

  it('uses the application and attachment relationship for list, replace and delete', async () => {
    const file = new File(['letter'], 'cover-letter.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    await getApplicationAttachmentsApi(41)
    await replaceApplicationAttachmentApi(41, 12, file, {
      attachmentType: 'COVER_LETTER',
      displayName: '求职信'
    })
    await deleteApplicationAttachmentApi(41, 12)

    expect(request.get).toHaveBeenCalledWith('/applications/41/attachments')
    expect(request.put).toHaveBeenCalledWith(
      '/applications/41/attachments/12',
      expect.any(FormData)
    )
    expect(request.delete).toHaveBeenCalledWith('/applications/41/attachments/12')
  })

  it('requests downloads as blobs instead of treating file bytes as JSON', async () => {
    const blob = new Blob(['resume'], { type: 'application/pdf' })
    request.get.mockResolvedValueOnce(blob)

    await expect(downloadApplicationAttachmentApi(41, 12)).resolves.toBe(blob)

    expect(request.get).toHaveBeenCalledWith(
      '/applications/41/attachments/12/download',
      { responseType: 'blob' }
    )
  })
})
