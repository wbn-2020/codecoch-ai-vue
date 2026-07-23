import { describe, expect, it } from 'vitest'

import { isKnownAppPath, resolveAppRoutePath } from '@/features/route-safety'
import { routes } from '@/router/routes'
import { buildSafeRedirectTarget } from '@/utils/routeSecurity'

describe('V9 evidence asset route entry', () => {
  it('uses one route meta gate for the aggregate workbench', () => {
    const rootRoute = routes.find((route) => route.path === '/')
    const evidenceRoute = rootRoute?.children?.find((route) => route.name === 'EvidenceAssets')

    expect(evidenceRoute?.path).toBe('evidence-assets')
    expect(evidenceRoute?.meta).toMatchObject({
      title: '证据资产工作台',
      featureFlag: 'v9EvidenceLearning'
    })
    expect(evidenceRoute?.beforeEnter).toBeUndefined()
  })

  it('keeps deep links known while the shared gate controls access', () => {
    const deepLink = '/evidence-assets?tab=candidates&candidateId=12'

    expect(isKnownAppPath('/evidence-assets')).toBe(true)
    expect(resolveAppRoutePath(deepLink, {
      fallbackPath: '/dashboard',
      enableV9EvidenceLearning: false
    })).toMatchObject({
      path: '/dashboard',
      blockedPath: deepLink
    })
    expect(resolveAppRoutePath(deepLink, {
      fallbackPath: '/dashboard',
      enableV9EvidenceLearning: true
    }).path).toBe(deepLink)
  })

  it('preserves only safe V9 deep-link query keys', () => {
    expect(buildSafeRedirectTarget('/evidence-assets', {
      tab: 'usages',
      applicationId: 7,
      packageSnapshotId: 11,
      hypothesisId: 3,
      token: 'must-not-leak'
    })).toBe('/evidence-assets?tab=usages&applicationId=7&packageSnapshotId=11&hypothesisId=3')
  })
})
