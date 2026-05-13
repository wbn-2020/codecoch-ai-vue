import { defineStore } from 'pinia'

import { getCurrentUserApi, loginApi, logoutApi, registerApi } from '@/api/auth'
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

const normalizeUser = (loginResult: LoginVO): CurrentUserVO | null => {
  if (loginResult.userInfo) {
    return {
      ...loginResult.userInfo,
      roles: loginResult.userInfo.roles?.length ? loginResult.userInfo.roles : loginResult.roles || []
    }
  }

  if (loginResult.username) {
    return {
      id: loginResult.userId,
      userId: loginResult.userId,
      username: loginResult.username,
      nickname: loginResult.nickname,
      roles: loginResult.roles || []
    }
  }

  return null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    userInfo: storage.get<CurrentUserVO>(STORAGE_KEYS.userInfo),
    roles: storage.get<RoleCode[]>(STORAGE_KEYS.roles, []) || []
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.roles.includes('ADMIN'),
    hasRole: (state) => {
      return (roleCode: RoleCode) => state.roles.includes(roleCode)
    }
  },

  actions: {
    setToken(token: string) {
      this.token = token
      persistToken(token)
    },

    setUserInfo(userInfo: CurrentUserVO | null) {
      this.userInfo = userInfo
      this.roles = userInfo?.roles || []

      if (userInfo) {
        storage.set(STORAGE_KEYS.userInfo, userInfo)
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
    }
  }
})
