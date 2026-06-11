import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminUserQuery,
  AdminUserVO,
  PasswordUpdateDTO,
  RoleSaveDTO,
  RoleVO,
  UserOverviewVO,
  UserProfileUpdateDTO,
  UserProfileVO,
  UserStatusUpdateDTO
} from '@/types/user'
import type { RoleCode } from '@/types/common'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

const pick = <T = unknown>(item: Record<string, unknown>, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = item[key]
    if (value !== undefined && value !== null && value !== '') return value as T
  }
  return undefined
}

const toAuthItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return value ? [value] : []
}

const normalizeRoleCode = (role: unknown): RoleCode | null => {
  const raw = typeof role === 'string'
    ? role
    : role && typeof role === 'object'
      ? pick<string>(role as Record<string, unknown>, 'roleCode', 'role_code', 'code', 'name', 'roleName', 'role_name')
      : null
  if (typeof raw !== 'string') return null
  const value = raw.trim().replace(/^ROLE_/i, '').toUpperCase()
  return value || null
}

const normalizeRoles = (...sources: unknown[]): RoleCode[] =>
  Array.from(new Set(sources.flatMap(toAuthItems).map(normalizeRoleCode).filter(Boolean))) as RoleCode[]

const normalizeStatus = (value: unknown): 0 | 1 => {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase()
    if (['1', 'ENABLE', 'ENABLED', 'ACTIVE', 'NORMAL'].includes(normalized)) return 1
    if (['0', 'DISABLE', 'DISABLED', 'LOCKED', 'INACTIVE'].includes(normalized)) return 0
  }
  return Number(value) === 0 ? 0 : 1
}

const normalizeAdminUser = (item: AdminUserVO): AdminUserVO => {
  const record = item as AdminUserVO & Record<string, unknown>
  const roles = normalizeRoles(
    record.roles,
    pick(record, 'roleCodes', 'role_codes', 'roleCodeList', 'role_code_list', 'authorities')
  )
  const status = normalizeStatus(pick(record, 'status', 'enabled', 'enableFlag', 'enable_flag', 'accountStatus', 'account_status'))
  return {
    ...record,
    id: Number(pick(record, 'id', 'userId', 'user_id') || 0),
    username: pick<string>(record, 'username', 'userName', 'user_name', 'loginName', 'login_name') || '',
    nickname: pick<string>(record, 'nickname', 'nickName', 'nick_name', 'displayName', 'display_name'),
    avatarUrl: pick<string | null>(record, 'avatarUrl', 'avatar_url') || null,
    email: pick<string | null>(record, 'email', 'mail') || null,
    status,
    statusName: pick<string>(record, 'statusName', 'status_name') || (status === 1 ? '启用' : '禁用'),
    roles,
    createdAt: pick<string>(record, 'createdAt', 'createTime', 'created_at')
  }
}

const normalizeRole = (item: RoleVO): RoleVO => {
  const record = item as RoleVO & Record<string, unknown>
  return {
    ...record,
    roleId: Number(pick(record, 'roleId', 'role_id', 'id') || 0),
    roleCode: normalizeRoleCode(pick(record, 'roleCode', 'role_code', 'code', 'name')) || '',
    roleName: pick<string>(record, 'roleName', 'role_name', 'name', 'title') || '',
    status: normalizeStatus(pick(record, 'status', 'enabled', 'enableFlag', 'enable_flag')),
    description: pick<string>(record, 'description', 'remark', 'remarks', 'memo'),
    createdAt: pick<string>(record, 'createdAt', 'createTime', 'created_at'),
    updatedAt: pick<string>(record, 'updatedAt', 'updateTime', 'updated_at')
  }
}

export const getUserProfileApi = () => {
  return request.get<UserProfileVO, UserProfileVO>('/users/profile')
}

export const updateUserProfileApi = (data: UserProfileUpdateDTO) => {
  return request.put<UserProfileVO, UserProfileVO>('/users/profile', data)
}

export const updateAvatarApi = (avatarUrl: string) => {
  return request.put<null, null>('/users/avatar', { avatarUrl })
}

export const updatePasswordApi = (data: PasswordUpdateDTO) => {
  return request.put<null, null>('/users/password', data)
}

export const getUserOverviewApi = () => {
  return request.get<UserOverviewVO, UserOverviewVO>('/users/overview')
}

export const getAdminUsersApi = (params: AdminUserQuery) => {
  return request
    .get<PageResult<AdminUserVO> | AdminUserVO[], PageResult<AdminUserVO> | AdminUserVO[]>('/admin/users', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params, normalizeAdminUser))
}

export const updateAdminUserStatusApi = (id: number, data: UserStatusUpdateDTO) => {
  return request.put<null, null>(`/admin/users/${id}/status`, data)
}

export const getAdminRolesApi = () => {
  return request.get<RoleVO[] | PageResult<RoleVO>, RoleVO[] | PageResult<RoleVO>>('/admin/roles')
    .then((result) => normalizePageResult(result, undefined, normalizeRole).records)
}

export const createAdminRoleApi = (data: RoleSaveDTO) => {
  return request.post<number, number>('/admin/roles', data)
}

export const updateAdminRoleApi = (id: number, data: RoleSaveDTO) => {
  return request.put<null, null>(`/admin/roles/${id}`, data)
}

export const deleteAdminRoleApi = (id: number) => {
  return request.delete<null, null>(`/admin/roles/${id}`)
}

export const updateAdminRoleStatusApi = (id: number, data: UserStatusUpdateDTO) => {
  return request.put<null, null>(`/admin/roles/${id}/status`, data)
}
