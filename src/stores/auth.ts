import { defineStore } from 'pinia'

import { getCurrentUserApi, loginApi, logoutApi, registerApi } from '@/api/auth'
import { clearAllRequestCache } from '@/composables/useRequestCache'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CurrentUserVO, LoginDTO, LoginVO, RegisterDTO } from '@/types/auth'
import type { RoleCode } from '@/types/common'
import { getToken, removeToken, setToken as persistToken } from '@/utils/token'
import { storage } from '@/utils/storage'

interface AuthState {
  token: string
  userInfo: CurrentUserVO | null
  roles: RoleCode[]
}

const normalizeRoleCode = (role: unknown): RoleCode | null => {
  if (typeof role !== 'string') return null
  const normalized = role.trim().replace(/^ROLE_/i, '').toUpperCase()
  return normalized ? normalized : null
}

const normalizeRoles = (roles?: unknown[]): RoleCode[] => {
  return Array.from(new Set((roles || []).map(normalizeRoleCode).filter(Boolean))) as RoleCode[]
}

const normalizeUser = (loginResult: LoginVO): CurrentUserVO | null => {
  if (loginResult.userInfo) {
    const roles = normalizeRoles(loginResult.userInfo.roles?.length ? loginResult.userInfo.roles : loginResult.roles)
    return {
      ...loginResult.userInfo,
      roles
    }
  }

  if (loginResult.username) {
    const roles = normalizeRoles(loginResult.roles)
    return {
      id: loginResult.userId,
      userId: loginResult.userId,
      username: loginResult.username,
      nickname: loginResult.nickname,
      roles
    }
  }

  return null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    userInfo: storage.get<CurrentUserVO>(STORAGE_KEYS.userInfo),
    roles: normalizeRoles(storage.get<RoleCode[]>(STORAGE_KEYS.roles, []) || [])
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.roles.includes('ADMIN'),
    hasRole: (state) => {
      return (roleCode: RoleCode) => {
        const normalized = normalizeRoleCode(roleCode)
        return normalized ? state.roles.includes(normalized) : false
      }
    },
    hasAnyRole: (state) => {
      return (roleCodes: RoleCode[]) => roleCodes.some((roleCode) => {
        const normalized = normalizeRoleCode(roleCode)
        return normalized ? state.roles.includes(normalized) : false
      })
    }
  },

  actions: {
    setToken(token: string) {
      this.token = token
      persistToken(token)
    },

    setUserInfo(userInfo: CurrentUserVO | null) {
      const roles = normalizeRoles(userInfo?.roles)
      this.userInfo = userInfo ? { ...userInfo, roles } : null
      this.roles = roles

      if (this.userInfo) {
        storage.set(STORAGE_KEYS.userInfo, this.userInfo)
        storage.set(STORAGE_KEYS.roles, this.roles)
      } else {
        storage.remove(STORAGE_KEYS.userInfo)
        storage.remove(STORAGE_KEYS.roles)
      }
    },

    async login(data: LoginDTO) {
      const result = await loginApi(data)
      this.setToken(result.token)
      const userInfo = normalizeUser(result)
      this.setUserInfo(userInfo)
      return result
    },

    async register(data: RegisterDTO) {
      return registerApi(data)
    },

    async logout() {
      try {
        if (this.token) {
          await logoutApi()
        }
      } finally {
        this.clearAuth()
      }
    },

    async fetchCurrentUser() {
      try {
        const userInfo = await getCurrentUserApi()
        this.setUserInfo(userInfo)
        return userInfo
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },

    clearAuth() {
      this.token = ''
      this.userInfo = null
      this.roles = []
      removeToken()
      storage.remove(STORAGE_KEYS.userInfo)
      storage.remove(STORAGE_KEYS.roles)
      clearAllRequestCache()
    }
  }
})
