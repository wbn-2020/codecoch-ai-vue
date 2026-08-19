import { describe, expect, it } from 'vitest'

import {
  getResumeImportConfirmBlockedReason,
  isResumeImportConfirmable,
  normalizeResumeImportQualityReport,
  RESUME_IMPORT_SCHEMA_VERSION
} from './resume-import-quality'

const validResult = {
  parseStatus: 'WAIT_CONFIRM' as const,
  schemaVersion: RESUME_IMPORT_SCHEMA_VERSION,
  validationStatus: 'VALID',
  qualityReport: {
    schemaVersion: RESUME_IMPORT_SCHEMA_VERSION,
    policyVersion: 'resume-import-policy-v1',
    validationStatus: 'VALID',
    confirmable: true,
    duplicateProjectsRemoved: 0,
    blockers: [],
    warnings: [],
    missingContacts: [],
    writePreview: []
  }
}

describe('resume import quality gate', () => {
  it('allows only a current, validated and confirmable import result', () => {
    expect(isResumeImportConfirmable(validResult)).toBe(true)
    expect(getResumeImportConfirmBlockedReason(validResult)).toBe('')
  })

  it('blocks confirmation when the backend quality report is missing or malformed', () => {
    expect(isResumeImportConfirmable({ ...validResult, qualityReport: null })).toBe(false)
    expect(getResumeImportConfirmBlockedReason({ ...validResult, qualityReport: null })).toContain('缺少导入质量报告')

    expect(normalizeResumeImportQualityReport({
      schemaVersion: RESUME_IMPORT_SCHEMA_VERSION,
      confirmable: true,
      blockers: ['  正文为空  ', 1],
      warnings: 'not-an-array',
      writePreview: [{ fieldKey: 'summary', label: '摘要', value: '内容', status: 'WILL_WRITE' }]
    })).toMatchObject({
      blockers: ['正文为空'],
      warnings: [],
      writePreview: [{ fieldKey: 'summary', status: 'WILL_WRITE' }]
    })
  })

  it('blocks stale schemas, validation failures, and blockers even when confirmable is true', () => {
    expect(getResumeImportConfirmBlockedReason({
      ...validResult,
      schemaVersion: 'resume-import-v0'
    })).toContain('版本不受支持')

    expect(getResumeImportConfirmBlockedReason({
      ...validResult,
      validationStatus: 'BLOCKED'
    })).toContain('未通过写入校验')

    expect(getResumeImportConfirmBlockedReason({
      ...validResult,
      qualityReport: {
        ...validResult.qualityReport,
        blockers: ['简历正文为空']
      }
    })).toContain('阻断项')
  })
})
