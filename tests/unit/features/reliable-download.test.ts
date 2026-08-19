import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  downloadBlobReliably,
  reliableDownloadOptionsForFile
} from '@/features/reliable-download'

describe('reliable admin file download', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a browser download event only after size and MIME validation', () => {
    const blob = new Blob(['%PDF-demo'], { type: 'application/pdf' })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:verified-download')
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const options = reliableDownloadOptionsForFile(
      'acceptance-resume.pdf',
      'application/pdf'
    )
    options.minBytes = blob.size
    options.maxBytes = blob.size

    const receipt = downloadBlobReliably(blob, options)

    expect(receipt).toEqual({
      filename: 'acceptance-resume.pdf',
      mimeType: 'application/pdf',
      size: blob.size
    })
    expect(click).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:verified-download')
  })

  it('fails closed without producing a download event when metadata does not match', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const blob = new Blob(['{"error":"forbidden"}'], { type: 'application/json' })
    const options = reliableDownloadOptionsForFile(
      'acceptance-resume.pdf',
      'application/pdf'
    )

    expect(() => downloadBlobReliably(blob, options)).toThrow('下载文件类型异常')
    expect(click).not.toHaveBeenCalled()
  })
})
