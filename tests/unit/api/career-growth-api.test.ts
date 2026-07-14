import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get,
    post,
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import {
  downloadCareerImportErrorsApi,
  importCareerCsvApi,
  previewCareerCsvImportApi
} from '@/api/careerGrowth'

describe('career growth import api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue(new Blob())
    post.mockResolvedValue({
      format: 'CSV',
      timezone: 'Asia/Shanghai',
      totalCount: 0,
      validCount: 0,
      successCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      rows: []
    })
  })

  it('sends canonical-to-source CSV mapping as JSON for preview and import', async () => {
    const file = new File(['employer,role'], 'applications.csv', { type: 'text/csv' })
    const mapping = { company_name: 'employer', job_title: 'role' }

    await previewCareerCsvImportApi(file, 'Asia/Shanghai', mapping)
    await importCareerCsvApi(file, 'Asia/Shanghai', 'SKIP', mapping)

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/career-imports/csv/preview',
      expect.any(FormData),
      { params: { timezone: 'Asia/Shanghai', mapping: JSON.stringify(mapping) } }
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/career-imports/csv',
      expect.any(FormData),
      {
        params: {
          timezone: 'Asia/Shanghai',
          duplicatePolicy: 'SKIP',
          mapping: JSON.stringify(mapping)
        }
      }
    )
  })

  it('downloads error rows for a completed import batch', async () => {
    await downloadCareerImportErrorsApi(30)

    expect(get).toHaveBeenCalledWith('/career-imports/30/errors.csv', {
      responseType: 'blob'
    })
  })
})
