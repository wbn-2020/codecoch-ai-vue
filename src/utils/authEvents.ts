import type { LoginVO } from '@/types/auth'

export const AUTH_REFRESHED_EVENT = 'codecoachai:auth-refreshed'

export const emitAuthRefreshed = (payload: LoginVO) => {
  window.dispatchEvent(new CustomEvent<LoginVO>(AUTH_REFRESHED_EVENT, { detail: payload }))
}
