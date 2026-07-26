import type { LoginVO } from '@/types/auth'

export const AUTH_REFRESHED_EVENT = 'codecoachai:auth-refreshed'
export const AUTH_CLEARED_EVENT = 'codecoachai:auth-cleared'

export const emitAuthRefreshed = (payload: LoginVO) => {
  window.dispatchEvent(new CustomEvent<LoginVO>(AUTH_REFRESHED_EVENT, { detail: payload }))
}

export const emitAuthCleared = () => {
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}
