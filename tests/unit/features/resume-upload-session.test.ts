import { describe, expect, it } from 'vitest'

import {
  MAX_RESUME_UPLOAD_BYTES,
  fingerprintResumeFile,
  isResumeUploadTimeoutError,
  matchesResumeUploadDescriptor,
  validateResumeUploadFile
} from '@/features/resume-upload-session'

describe('resume upload session contract', () => {
  it('rejects unsupported formats with an actionable message', () => {
    const result = validateResumeUploadFile({
      name: 'resume.xlsx',
      size: 1024
    })

    expect(result).toEqual({
      valid: false,
      message: '文件“resume.xlsx”格式不支持，请选择 PDF、DOC、DOCX、MD 或 TXT 文件。'
    })
  })

  it('rejects empty files before any upload attempt', () => {
    const result = validateResumeUploadFile({
      name: 'resume.pdf',
      size: 0
    })

    expect(result.valid).toBe(false)
    expect(result.message).toContain('为空')
    expect(result.message).toContain('重新导出')
  })

  it('accepts exactly 20 MiB and rejects the next byte', () => {
    expect(validateResumeUploadFile({
      name: 'resume.pdf',
      size: MAX_RESUME_UPLOAD_BYTES
    })).toEqual({ valid: true, message: '' })

    const result = validateResumeUploadFile({
      name: 'resume.pdf',
      size: MAX_RESUME_UPLOAD_BYTES + 1
    })

    expect(result.valid).toBe(false)
    expect(result.message).toContain('超过 20 MB')
    expect(result.message).toContain('压缩或拆分')
  })

  it('fingerprints identical content equally even when filenames differ', async () => {
    const bytes = Uint8Array.from([80, 68, 70, 45, 49, 46, 55])
    const first = new File([bytes], 'first-name.pdf', { type: 'application/pdf' })
    const second = new File([bytes], 'renamed-resume.doc', { type: 'application/msword' })

    expect(await fingerprintResumeFile(first)).toBe(await fingerprintResumeFile(second))
  })

  it('matches an interrupted upload by content fingerprint instead of filename', () => {
    expect(matchesResumeUploadDescriptor(
      {
        name: 'old-name.pdf',
        size: 2048,
        type: 'application/pdf',
        fingerprint: 'sha256-same',
        startedAt: '2026-08-17T00:00:00.000Z'
      },
      {
        name: 'renamed-file.pdf',
        size: 2048,
        type: 'application/pdf',
        fingerprint: 'sha256-same',
        startedAt: '2026-08-17T00:01:00.000Z'
      }
    )).toBe(true)
    expect(matchesResumeUploadDescriptor(
      {
        name: 'old-name.pdf',
        size: 2048,
        type: 'application/pdf',
        fingerprint: 'sha256-same',
        startedAt: '2026-08-17T00:00:00.000Z'
      },
      {
        name: 'different.pdf',
        size: 2048,
        type: 'application/pdf',
        fingerprint: 'sha256-different',
        startedAt: '2026-08-17T00:01:00.000Z'
      }
    )).toBe(false)
  })

  it('recognizes transport timeout errors without treating other failures as timeout', () => {
    expect(isResumeUploadTimeoutError({ code: 'ECONNABORTED', message: 'request timeout' })).toBe(true)
    expect(isResumeUploadTimeoutError({ code: 'ETIMEDOUT' })).toBe(true)
    expect(isResumeUploadTimeoutError(new Error('上传超时'))).toBe(true)
    expect(isResumeUploadTimeoutError(new Error('network disconnected'))).toBe(false)
  })
})
