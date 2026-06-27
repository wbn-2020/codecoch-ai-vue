import { describe, expect, it } from 'vitest'

import {
  buildSafeRedirectTarget,
  buildSafeRouteQuery,
  sanitizeLocalActionPath,
  sanitizeLocalRedirectPath
} from '@/utils/routeSecurity'

describe('routeSecurity', () => {
  it('preserves only allowlisted query keys and drops sensitive or invalid values', () => {
    expect(
      buildSafeRouteQuery({
        pageNo: '2',
        pageSize: '20',
        targetJobId: '18',
        tab: 'knowledge',
        token: 'secret-token',
        rawOutput: 'should-not-leak',
        keyword: 'redis',
        traceId: 'a'.repeat(129)
      })
    ).toEqual({
      pageNo: '2',
      pageSize: '20',
      targetJobId: '18',
      tab: 'knowledge'
    })
  })

  it('builds local redirect targets without leaking sensitive query parameters', () => {
    expect(
      buildSafeRedirectTarget('/agent/tasks', {
        tab: 'knowledge',
        targetJobId: 18,
        token: 'secret-token'
      })
    ).toBe('/agent/tasks?tab=knowledge&targetJobId=18')
  })

  it('rejects unsafe action paths and sanitizes local redirect inputs', () => {
    expect(sanitizeLocalActionPath('https://evil.example/steal', '/agent/tasks')).toBe('/agent/tasks')
    expect(
      sanitizeLocalRedirectPath('/agent/tasks?tab=knowledge&token=secret&pageNo=2', '/dashboard')
    ).toBe('/agent/tasks?tab=knowledge&pageNo=2')
  })
})
