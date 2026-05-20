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
  permissions: string[]
}

const normalizeRoleCode = (role: unknown): RoleCode | null => {
  if (typeof role !== 'string') return null
  const normalized = role.trim().replace(/^ROLE_/i, '').toUpperCase()
  return normalized ? normalized : null
}

const normalizeRoles = (roles?: unknown[]): RoleCode[] => {
  return Array.from(new Set((roles || []).map(normalizeRoleCode).filter(Boolean))) as RoleCode[]
}

const normalizePermissionCode = (permission: unknown): string | null => {
  if (typeof permission !== 'string') return null
  const normalized = permission.trim()
  return normalized ? normalized : null
}

const normalizePermissions = (permissions?: unknown[]): string[] => {
  return Array.from(new Set((permissions || []).map(normalizePermissionCode).filter(Boolean))) as string[]
}

const normalizeUser = (loginResult: LoginVO): CurrentUserVO | null => {
  if (loginResult.userInfo) {
    const roles = normalizeRoles(loginResult.userInfo.roles?.length ? loginResult.userInfo.roles : loginResult.roles)
    const permissions = normalizePermissions(
      loginResult.userInfo.permissions?.length ? loginResult.userInfo.permissions : loginResult.permissions
    )
    return {
      ...loginResult.userInfo,
      roles,
      permissions
    }
  }

  if (loginResult.username) {
    const roles = normalizeRoles(loginResult.roles)
    const permissions = normalizePermissions(loginResult.permissions)
    return {
      id: loginResult.userId,
      userId: loginResult.userId,
      username: loginResult.username,
      nickname: loginResult.nickname,
      roles,
      permissions
    }
  }

  return null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    userInfo: storage.get<CurrentUserVO>(STORAGE_KEYS.userInfo),
    roles: normalizeRoles(storage.get<RoleCode[]>(STORAGE_KEYS.roles, []) || []),
    permissions: normalizePermissions(storage.get<string[]>(STORAGE_KEYS.permissions, []) || [])
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.roles.includes('ADMIN'),
    canAccessAdmin: (state) =>
      state.roles.includes('ADMIN') || state.permissions.some((permission) => permission.startsWith('admin:')),
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
    },
    hasPermission: (state) => {
      return (permissionCode: string) => {
        if (state.roles.includes('ADMIN')) return true
        const normalized = normalizePermissionCode(permissionCode)
        return normalized ? state.permissions.includes(normalized) : false
      }
    },
    hasAnyPermission: (state) => {
      return (permissionCodes: string[]) => {
        if (state.roles.includes('ADMIN')) return true
        return permissionCodes.some((permissionCode) => {
          const normalized = normalizePermissionCode(permissionCode)
          return normalized ? state.permissions.includes(normalized) : false
        })
      }
    },
    hasAnyAuthority: (state) => {
      return (codes: string[]) => {
        if (state.roles.includes('ADMIN')) return true
        return codes.some((code) => {
          const role = normalizeRoleCode(code)
          const permission = normalizePermissionCode(code)
          return Boolean(
            (role && state.roles.includes(role)) ||
            (permission && state.permissions.includes(permission))
          )
        })
      }
    }
  },

  actions: {
    setToken(token: string) {
      this.token = token
      persistToken(token)
    },

    setUserInfo(userInfo: CurrentUserVO | null) {
      const roles = normalizeRoles(userInfo?.roles)
      const permissions = normalizePermissions(userInfo?.permissions)
      this.userInfo = userInfo ? { ...userInfo, roles, permissions } : null
      this.roles = roles
      this.permissions = permissions

      if (this.userInfo) {
        storage.set(STORAGE_KEYS.userInfo, this.userInfo)
        storage.set(STORAGE_KEYS.roles, this.roles)
        storage.set(STORAGE_KEYS.permissions, this.permissions)
      } else {
        storage.remove(STORAGE_KEYS.userInfo)
        storage.remove(STORAGE_KEYS.roles)
        storage.remove(STORAGE_KEYS.permissions)
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
      this.permissions = []
      removeToken()
      storage.remove(STORAGE_KEYS.userInfo)
      storage.remove(STORAGE_KEYS.roles)
      storage.remove(STORAGE_KEYS.permissions)
      clearAllRequestCache()
    }
  }
})
