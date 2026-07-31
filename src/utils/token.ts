import { STORAGE_KEYS } from '@/constants/storage'

export interface AuthSessionSnapshot {
  generation: number
  sessionId: string
  token: string
}

export const AUTH_SESSION_STORAGE_KEY = 'codecoachai_auth_session'

let authSessionGeneration = 0

const advanceAuthSessionGeneration = () => {
  authSessionGeneration += 1
  return authSessionGeneration
}

const createAuthSessionId = (prefix: 'session' | 'invalidated') => {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${randomPart}`
}

export const getToken = (): string => localStorage.getItem(STORAGE_KEYS.token) || ''

export const getAuthSessionId = (): string =>
  localStorage.getItem(AUTH_SESSION_STORAGE_KEY) || ''

export const setToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.token, token)
}

export const beginAuthSession = (token: string): string => {
  advanceAuthSessionGeneration()
  const sessionId = createAuthSessionId('session')
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, sessionId)
  setToken(token)
  return sessionId
}

export const invalidateAuthSession = (): AuthSessionSnapshot => {
  advanceAuthSessionGeneration()
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, createAuthSessionId('invalidated'))
  return captureAuthSession()
}

export const markAuthSessionChanged = (): void => {
  advanceAuthSessionGeneration()
}

export const captureAuthSession = (): AuthSessionSnapshot => ({
  generation: authSessionGeneration,
  sessionId: getAuthSessionId(),
  token: getToken()
})

export const isAuthSessionCurrent = (snapshot: AuthSessionSnapshot): boolean =>
  snapshot.generation === authSessionGeneration
  && snapshot.sessionId === getAuthSessionId()
  && snapshot.token === getToken()

export const replaceAuthSessionTokenIfCurrent = (
  snapshot: AuthSessionSnapshot,
  token: string
): string | null => {
  if (!isAuthSessionCurrent(snapshot)) return null
  if (!snapshot.sessionId) {
    return beginAuthSession(token)
  }
  setToken(token)
  return snapshot.sessionId
}

export const removeToken = (): void => {
  advanceAuthSessionGeneration()
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEYS.token)
}

export const clearLocalAuth = (): void => {
  advanceAuthSessionGeneration()
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.userInfo)
  localStorage.removeItem(STORAGE_KEYS.roles)
  localStorage.removeItem(STORAGE_KEYS.permissions)
}

export const clearLocalAuthIfCurrent = (snapshot: AuthSessionSnapshot): boolean => {
  if (!isAuthSessionCurrent(snapshot)) return false
  clearLocalAuth()
  return true
}
