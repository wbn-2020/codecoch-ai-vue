import { describe, expect, it } from 'vitest'

import { presentAdminFileParseState } from '@/features/admin-file-parse-state'

describe('admin file parse state', () => {
  it('keeps failed and awaiting-confirmation states mutually exclusive', () => {
    expect(
      presentAdminFileParseState({
        id: 1,
        userId: 1,
        bizType: 'RESUME',
        originalFilename: 'resume.pdf',
        storedFilename: 'stored.pdf',
        fileExt: 'pdf',
        fileSize: 1024,
        storageProvider: 'ALIYUN_OSS',
        status: 'AVAILABLE',
        parseStatus: 'FAILED',
        analysisConfirmed: false,
        parseErrorMessage: 'parse failed'
      })
    ).toEqual({
      status: 'FAILED',
      failed: true,
      confirmationLabel: '当前状态不适用'
    })

    expect(
      presentAdminFileParseState({
        id: 2,
        userId: 1,
        bizType: 'RESUME',
        originalFilename: 'resume.pdf',
        storedFilename: 'stored.pdf',
        fileExt: 'pdf',
        fileSize: 1024,
        storageProvider: 'ALIYUN_OSS',
        status: 'AVAILABLE',
        parseStatus: 'WAIT_CONFIRM',
        analysisConfirmed: false
      })
    ).toEqual({
      status: 'WAIT_CONFIRM',
      failed: false,
      confirmationLabel: '待用户确认'
    })
  })

  it('flags contradictory confirmation metadata instead of inventing a valid state', () => {
    expect(
      presentAdminFileParseState({
        id: 3,
        userId: 1,
        bizType: 'RESUME',
        originalFilename: 'resume.pdf',
        storedFilename: 'stored.pdf',
        fileExt: 'pdf',
        fileSize: 1024,
        storageProvider: 'ALIYUN_OSS',
        status: 'AVAILABLE',
        parseStatus: 'SUCCESS',
        analysisConfirmed: false
      }).confirmationLabel
    ).toBe('状态数据异常')
  })
})
