import { STORAGE_KEYS } from '@/constants/storage'

export const getToken = (): string => localStorage.getItem(STORAGE_KEYS.token) || ''

export const setToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.token, token)
}

export const removeToken = (): void => {
  localStorage.removeItem(STORAGE_KEYS.token)
}
