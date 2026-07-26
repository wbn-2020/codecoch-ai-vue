import { describe, expect, it } from 'vitest'

import { resolveAppRoutePath } from './route-safety'

describe('resolveAppRoutePath', () => {
  it('rejects protocol-like and network-path routes', () => {
    expect(resolveAppRoutePath('//evil.example', { fallbackPath: '/dashboard' })).toMatchObject({
      path: '/dashboard',
      blockedPath: '//evil.example'
    })
    expect(resolveAppRoutePath('https://evil.example', { fallbackPath: '/dashboard' }).path).toBe('/dashboard')
  })

  it('falls back for unknown paths', () => {
    const result = resolveAppRoutePath('/not-exists', {
      fallbackPath: '/agent/today',
      enableV4Preview: true,
      knownPaths: ['/agent/today']
    })

    expect(result.path).toBe('/agent/today')
    expect(result.blockedPath).toBe('/not-exists')
  })

  it('falls back for V4 preview paths when preview is disabled', () => {
    const result = resolveAppRoutePath('/knowledge?tab=documents', {
      fallbackPath: '/agent/today',
      enableV4Preview: false,
      enableV4Knowledge: false
    })

    expect(result.path).toBe('/agent/today')
    expect(result.blockedPath).toBe('/knowledge?tab=documents')
  })

  it('allows released application routes regardless of the V4 preview flag', () => {
    const result = resolveAppRoutePath('/applications?followUp=due-today', {
      fallbackPath: '/agent/today',
      enableV4Preview: false
    })

    expect(result.path).toBe('/applications?followUp=due-today')
    expect(result.blockedPath).toBeUndefined()
  })

  it('allows ability map routes with training query params', () => {
    const result = resolveAppRoutePath('/ability-map?trainingScene=JAVA_SPECIALTY', {
      fallbackPath: '/dashboard',
      enableV4Preview: false
    })

    expect(result.path).toBe('/ability-map?trainingScene=JAVA_SPECIALTY')
    expect(result.blockedPath).toBeUndefined()
  })

  it('allows Phase 3 job experiment and portfolio demo routes', () => {
    expect(resolveAppRoutePath('/job-experiments/42/review', {
      fallbackPath: '/dashboard',
      enableV4Preview: false
    }).path).toBe('/job-experiments/42/review')

    expect(resolveAppRoutePath('/portfolio-demo', {
      fallbackPath: '/dashboard',
      enableV4Preview: false
    }).path).toBe('/portfolio-demo')
  })
})
