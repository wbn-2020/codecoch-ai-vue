import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { appConfig } from '@/config'
import { routes } from '@/router/routes'

describe('v7 route and embedded entry', () => {
  it('adds one opportunity workspace route without a new top-level navigation entry', () => {
    const routes = readFileSync(resolve(process.cwd(), 'src/router/routes.ts'), 'utf8')
    const applications = readFileSync(resolve(process.cwd(), 'src/views/v4/JobApplicationView.vue'), 'utf8')

    expect(routes).toContain("path: 'applications/:id'")
    expect(routes).toContain("name: 'ApplicationWorkspace'")
    expect(applications).toContain('<CareerCampaignPanel')
    expect(applications).toContain('@click="goWorkspace(item)"')
  })

  it('redirects the workspace route while the campaign workspace flag is disabled', async () => {
    const rootRoute = routes.find((route) => route.path === '/')
    const workspaceRoute = rootRoute?.children?.find((route) => route.name === 'ApplicationWorkspace')
    const guard = workspaceRoute?.beforeEnter as ((...args: never[]) => unknown) | undefined

    expect(guard).toBeTypeOf('function')

    const previousValue = appConfig.enableV7CampaignWorkspace
    try {
      appConfig.enableV7CampaignWorkspace = false
      await expect(Promise.resolve(guard?.())).resolves.toEqual({ name: 'FeatureUnavailable' })

      appConfig.enableV7CampaignWorkspace = true
      await expect(Promise.resolve(guard?.())).resolves.toBe(true)
    } finally {
      appConfig.enableV7CampaignWorkspace = previousValue
    }
  })
})
