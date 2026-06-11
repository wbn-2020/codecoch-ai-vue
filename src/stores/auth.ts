import { defineStore } from 'pinia'

import { getCurrentUserApi, loginApi, logoutApi, registerApi } from '@/api/auth'
import { clearAllRequestCache } from '@/composables/useRequestCache'
import { HTTP_STATUS_CODE } from '@/constants/http'
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
  tokenVerified: boolean
}

const AUTH_VERIFY_TTL = 15000
let pendingCurrentUserRequest: Promise<CurrentUserVO> | null = null
let pendingCurrentUserToken = ''
let lastVerifiedToken = ''
let lastVerifiedAt = 0

const normalizeRoleCode = (role: unknown): RoleCode | null => {
  const raw = typeof role === 'string'
    ? role
    : typeof role === 'object' && role
      ? (role as Record<string, unknown>).roleCode ||
        (role as Record<string, unknown>).role_code ||
        (role as Record<string, unknown>).roleName ||
        (role as Record<string, unknown>).role_name ||
        (role as Record<string, unknown>).authority ||
        (role as Record<string, unknown>).code ||
        (role as Record<string, unknown>).name
      : null
  if (typeof raw !== 'string') return null
  const normalized = raw.trim().replace(/^ROLE_/i, '').toUpperCase()
  return normalized ? normalized : null
}

const toAuthItems = (value?: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return value ? [value] : []
}

const normalizeRoles = (roles?: unknown): RoleCode[] => {
  return Array.from(new Set(toAuthItems(roles).map(normalizeRoleCode).filter(Boolean))) as RoleCode[]
}

const normalizePermissionCode = (permission: unknown): string | null => {
  const raw = typeof permission === 'string'
    ? permission
    : typeof permission === 'object' && permission
      ? (permission as Record<string, unknown>).permissionCode ||
        (permission as Record<string, unknown>).permission_code ||
        (permission as Record<string, unknown>).permCode ||
        (permission as Record<string, unknown>).perm_code ||
        (permission as Record<string, unknown>).authority ||
        (permission as Record<string, unknown>).code ||
        (permission as Record<string, unknown>).name
      : null
  if (typeof raw !== 'string') return null
  const normalized = raw.trim()
  return normalized ? normalized : null
}

const normalizePermissions = (permissions?: unknown): string[] => {
  return Array.from(new Set(toAuthItems(permissions).map(normalizePermissionCode).filter(Boolean))) as string[]
}

const mergeAuthArrays = (...items: Array<unknown>): unknown[] => items.flatMap(toAuthItems)

const pickPayloadValues = (source: unknown, keys: string[]) => {
  if (!source || typeof source !== 'object') return []
  const record = source as Record<string, unknown>
  return keys.flatMap((key) => toAuthItems(record[key]))
}

const rolePayloads = (source: unknown) => pickPayloadValues(source, [
  'role',
  'roleCode',
  'role_code',
  'roles',
  'roleCodes',
  'role_codes',
  'roleCodeList',
  'role_code_list',
  'authorities'
])

const permissionPayloads = (source: unknown) => pickPayloadValues(source, [
  'permission',
  'permissionCode',
  'permission_code',
  'permCode',
  'perm_code',
  'permissions',
  'permissionCodes',
  'permission_codes',
  'permCodes',
  'perm_codes',
  'authorities'
])

const isAuthFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID
}

const hasOwnPayload = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)

const hasCompleteAuthSnapshot = (userInfo?: CurrentUserVO | null) =>
  Boolean(userInfo && normalizeRoles(userInfo.roles).length > 0)

const markVerifiedToken = (token: string) => {
  lastVerifiedToken = token
  lastVerifiedAt = Date.now()
}

const clearVerifySnapshot = () => {
  pendingCurrentUserRequest = null
  pendingCurrentUserToken = ''
  lastVerifiedToken = ''
  lastVerifiedAt = 0
}

const isRecentlyVerified = (token: string) =>
  Boolean(token && token === lastVerifiedToken && Date.now() - lastVerifiedAt < AUTH_VERIFY_TTL)

const normalizeUser = (loginResult: LoginVO): CurrentUserVO | null => {
  if (loginResult.userInfo) {
    const roles = normalizeRoles(mergeAuthArrays(rolePayloads(loginResult.userInfo), rolePayloads(loginResult)))
    const permissions = normalizePermissions(mergeAuthArrays(permissionPayloads(loginResult.userInfo), permissionPayloads(loginResult)))
    return {
      ...loginResult.userInfo,
      roles,
      permissions
    }
  }

  if (loginResult.username) {
    const roles = normalizeRoles(rolePayloads(loginResult))
    const permissions = normalizePermissions(permissionPayloads(loginResult))
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

const normalizeStoredUser = (
  userInfo: CurrentUserVO | null,
  storedRoles?: unknown,
  storedPermissions?: unknown
): CurrentUserVO | null => {
  if (!userInfo || typeof userInfo !== 'object') return null
  const userRoles = normalizeRoles(rolePayloads(userInfo))
  const userPermissions = normalizePermissions(permissionPayloads(userInfo))
  const roles = userRoles.length ? userRoles : normalizeRoles(storedRoles)
  const permissions = userPermissions.length ? userPermissions : normalizePermissions(storedPermissions)
  return {
    ...userInfo,
    roles,
    permissions
  }
}

const readStoredAuthSnapshot = () => {
  const storedRoles = storage.get<unknown>(STORAGE_KEYS.roles, [])
  const storedPermissions = storage.get<unknown>(STORAGE_KEYS.permissions, [])
  const userInfo = normalizeStoredUser(storage.get<CurrentUserVO>(STORAGE_KEYS.userInfo), storedRoles, storedPermissions)
  const roles = userInfo?.roles.length ? userInfo.roles : normalizeRoles(storedRoles)
  const permissions = userInfo?.permissions?.length ? userInfo.permissions : normalizePermissions(storedPermissions)

  return {
    token: getToken(),
    userInfo,
    roles,
    permissions
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const snapshot = readStoredAuthSnapshot()
    return {
      ...snapshot,
      tokenVerified: false
    }
  },

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.roles.includes('ADMIN'),
    canAccessAdmin: (state) => state.roles.includes('ADMIN'),
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
        const normalized = normalizePermissionCode(permissionCode)
        return normalized ? state.permissions.includes(normalized) : false
      }
    },
    hasAnyPermission: (state) => {
      return (permissionCodes: string[]) => {
        return permissionCodes.some((permissionCode) => {
          const normalized = normalizePermissionCode(permissionCode)
          return normalized ? state.permissions.includes(normalized) : false
        })
      }
    },
    hasAnyAuthority: (state) => {
      return (codes: string[]) => {
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
      if (this.token && this.token !== token) {
        clearVerifySnapshot()
      }
      this.token = token
      this.tokenVerified = false
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

    async login(data: LoginDTO, options?: { silentError?: boolean }) {
      const result = await loginApi(data, options)
      clearAllRequestCache()
      this.setToken(result.token)
      const userInfo = normalizeUser(result)
      this.setUserInfo(userInfo)
      this.tokenVerified = true
      markVerifiedToken(this.token)
      return result
    },

    applyRefreshResult(result: LoginVO) {
      clearAllRequestCache()
      this.setToken(result.token)
      const userInfo = normalizeUser(result)
      if (userInfo) {
        this.setUserInfo(userInfo)
        this.tokenVerified = hasCompleteAuthSnapshot(userInfo)
        if (this.tokenVerified) {
          markVerifiedToken(this.token)
        } else {
          clearVerifySnapshot()
        }
      } else {
        const roles = hasOwnPayload(result, 'roles') ? normalizeRoles(result.roles) : []
        const permissions = hasOwnPayload(result, 'permissions') ? normalizePermissions(result.permissions) : []
        this.userInfo = null
        if (roles.length > 0 || permissions.length > 0) {
          this.roles = roles
          this.permissions = permissions
          storage.remove(STORAGE_KEYS.userInfo)
          storage.set(STORAGE_KEYS.roles, this.roles)
          storage.set(STORAGE_KEYS.permissions, this.permissions)
        } else {
          this.roles = []
          this.permissions = []
          storage.remove(STORAGE_KEYS.userInfo)
          storage.remove(STORAGE_KEYS.roles)
          storage.remove(STORAGE_KEYS.permissions)
        }
        this.tokenVerified = false
        clearVerifySnapshot()
      }
    },

    async register(data: RegisterDTO, options?: { silentError?: boolean }) {
      return registerApi(data, options)
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
      const requestToken = this.token
      if (!requestToken) {
        this.clearAuth()
        return null
      }
      if (pendingCurrentUserRequest && pendingCurrentUserToken === requestToken) {
        return pendingCurrentUserRequest
      }
      pendingCurrentUserToken = requestToken
      pendingCurrentUserRequest = getCurrentUserApi()
      try {
        const userInfo = await pendingCurrentUserRequest
        if (this.token !== requestToken) {
          return userInfo
        }
        this.setUserInfo(userInfo)
        this.tokenVerified = true
        markVerifiedToken(requestToken)
        return userInfo
      } catch (error) {
        if (isAuthFailure(error)) {
          this.clearAuth()
        }
        throw error
      } finally {
        if (pendingCurrentUserToken === requestToken) {
          pendingCurrentUserRequest = null
          pendingCurrentUserToken = ''
        }
      }
    },

    async verifyToken() {
      if (!this.token) {
        this.clearAuth()
        return null
      }

      if (this.tokenVerified && this.userInfo) {
        if (!isRecentlyVerified(this.token)) {
          markVerifiedToken(this.token)
        }
        return this.userInfo
      }

      return this.fetchCurrentUser()
    },

    async verifyAdminSession() {
      if (!this.token) {
        this.clearAuth()
        return null
      }

      if (this.tokenVerified && this.userInfo && this.roles.length > 0 && isRecentlyVerified(this.token)) {
        return this.userInfo
      }

      return this.fetchCurrentUser()
    },

    markAuthStale() {
      this.tokenVerified = false
      clearVerifySnapshot()
      clearAllRequestCache()
    },

    syncFromStorage() {
      const snapshot = readStoredAuthSnapshot()
      const tokenChanged = this.token !== snapshot.token
      this.token = snapshot.token
      this.userInfo = snapshot.userInfo
      this.roles = snapshot.roles
      this.permissions = snapshot.permissions
      this.tokenVerified = snapshot.token ? this.tokenVerified && !tokenChanged : false
      if (tokenChanged) {
        clearVerifySnapshot()
        clearAllRequestCache()
      }
    },

    clearAuth() {
      clearVerifySnapshot()
      this.token = ''
      this.userInfo = null
      this.roles = []
      this.permissions = []
      this.tokenVerified = false
      removeToken()
      storage.remove(STORAGE_KEYS.userInfo)
      storage.remove(STORAGE_KEYS.roles)
      storage.remove(STORAGE_KEYS.permissions)
      clearAllRequestCache()
    }
  }
})
