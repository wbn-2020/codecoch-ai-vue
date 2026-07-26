import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth session generation', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('prevents an old session snapshot from clearing a newer login', async () => {
    const token = await import('@/utils/token')

    token.beginAuthSession('old-token')
    const oldSession = token.captureAuthSession()

    token.clearLocalAuth()
    token.beginAuthSession('new-token')

    expect(token.clearLocalAuthIfCurrent(oldSession)).toBe(false)
    expect(token.getToken()).toBe('new-token')
    expect(token.isAuthSessionCurrent(oldSession)).toBe(false)
  })

  it('replaces a token only while the captured session is current', async () => {
    const token = await import('@/utils/token')

    token.beginAuthSession('first-token')
    const firstSession = token.captureAuthSession()
    const sessionId = token.replaceAuthSessionTokenIfCurrent(firstSession, 'refreshed-token')

    expect(sessionId).toBe(firstSession.sessionId)
    expect(token.getToken()).toBe('refreshed-token')

    token.beginAuthSession('second-login-token')
    expect(token.replaceAuthSessionTokenIfCurrent(firstSession, 'stale-token')).toBeNull()
    expect(token.getToken()).toBe('second-login-token')
  })

  it('creates a persisted session id when a cookie-backed refresh restores login', async () => {
    const token = await import('@/utils/token')
    const anonymousSession = token.captureAuthSession()

    const sessionId = token.replaceAuthSessionTokenIfCurrent(
      anonymousSession,
      'restored-token'
    )

    expect(sessionId).toMatch(/^session:/)
    expect(token.getAuthSessionId()).toBe(sessionId)
    expect(token.getToken()).toBe('restored-token')
    expect(token.captureAuthSession().generation).toBeGreaterThan(anonymousSession.generation)
  })
})
