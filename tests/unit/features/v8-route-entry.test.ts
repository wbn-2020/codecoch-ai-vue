import { describe, expect, it } from 'vitest'

import { appConfig } from '@/config'
import { isKnownAppPath } from '@/features/route-safety'
import { routes } from '@/router/routes'

describe('v8 campaign cockpit route', () => {
  it('adds a hidden campaign cockpit route without a top-level navigation entry', () => {
    const rootRoute = routes.find((route) => route.path === '/')
    const cockpitRoute = rootRoute?.children?.find((route) => route.name === 'CampaignCockpit')

    expect(cockpitRoute?.path).toBe('career-campaigns/:id/cockpit')
    expect(cockpitRoute?.meta).toMatchObject({
      title: '周期驾驶舱',
      hidden: true,
      commandHidden: true
    })
  })

  it('guards the route with the independent V8 cockpit flag', async () => {
    const rootRoute = routes.find((route) => route.path === '/')
    const cockpitRoute = rootRoute?.children?.find((route) => route.name === 'CampaignCockpit')
    const guard = cockpitRoute?.beforeEnter as (() => unknown) | undefined
    const previous = appConfig.enableV8CampaignCockpit

    try {
      appConfig.enableV8CampaignCockpit = false
      await expect(Promise.resolve(guard?.())).resolves.toEqual({ name: 'FeatureUnavailable' })
      appConfig.enableV8CampaignCockpit = true
      await expect(Promise.resolve(guard?.())).resolves.toBe(true)
    } finally {
      appConfig.enableV8CampaignCockpit = previous
    }
  })

  it('registers campaign cockpit deep links as safe in-app routes', () => {
    expect(isKnownAppPath('/career-campaigns/12/cockpit')).toBe(true)
  })
})
