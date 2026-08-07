import { describe, expect, it } from 'vitest'

import {
  isKnownAppPath,
  resolveAppRoutePath
} from '@/features/route-safety'

describe('route safety integrity', () => {
  it('allows only registered dynamic route shapes instead of arbitrary child paths', () => {
    expect(isKnownAppPath('/applications/42')).toBe(true)
    expect(isKnownAppPath('/career-campaigns/7/cockpit')).toBe(true)
    expect(isKnownAppPath('/resumes/manage')).toBe(true)
    expect(isKnownAppPath('/tools/unknown')).toBe(false)
    expect(isKnownAppPath('/career-calendar/unknown')).toBe(false)
    expect(isKnownAppPath('/career-campaigns')).toBe(false)
  })

  it('returns to the caller fallback for feature-gated workspace deep links', () => {
    expect(resolveAppRoutePath('/applications/42', {
      fallbackPath: '/applications',
      enableV7CampaignWorkspace: false
    })).toMatchObject({
      path: '/applications',
      blockedPath: '/applications/42'
    })

    expect(resolveAppRoutePath('/career-campaigns/7/cockpit', {
      fallbackPath: '/applications',
      enableV8CampaignCockpit: false
    })).toMatchObject({
      path: '/applications',
      blockedPath: '/career-campaigns/7/cockpit'
    })
  })

  it('keeps released application deep links available when their workspace is enabled', () => {
    expect(resolveAppRoutePath('/applications/42?tab=timeline', {
      fallbackPath: '/applications',
      enableV7CampaignWorkspace: true
    }).path).toBe('/applications/42?tab=timeline')
  })
})
