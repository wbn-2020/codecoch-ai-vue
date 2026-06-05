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
import { normalizePageResult } from '@/utils/page'

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
    .get<PageResult<AdminUserVO>, PageResult<AdminUserVO>>('/admin/users', { params })
    .then((result) => normalizePageResult(result, params))
}

export const updateAdminUserStatusApi = (id: number, data: UserStatusUpdateDTO) => {
  return request.put<null, null>(`/admin/users/${id}/status`, data)
}

export const getAdminRolesApi = () => {
  return request.get<RoleVO[], RoleVO[]>('/admin/roles')
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
