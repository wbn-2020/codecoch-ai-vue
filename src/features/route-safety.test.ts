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
    const result = resolveAppRoutePath('/applications?followUp=due-today', {
      fallbackPath: '/agent/today',
      enableV4Preview: false
    })

    expect(result.path).toBe('/agent/today')
    expect(result.blockedPath).toBe('/applications?followUp=due-today')
  })
})
