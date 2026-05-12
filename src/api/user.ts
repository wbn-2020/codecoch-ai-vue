import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminUserQuery,
  AdminUserVO,
  PasswordUpdateDTO,
  RoleVO,
  UserOverviewVO,
  UserProfileUpdateDTO,
  UserProfileVO,
  UserStatusUpdateDTO
} from '@/types/user'

export const getUserProfileApi = () => {
  return request.get<UserProfileVO, UserProfileVO>('/users/profile')
}

export const updateUserProfileApi = (data: UserProfileUpdateDTO) => {
  return request.put<UserProfileVO, UserProfileVO>('/users/profile', data)
}

export const updatePasswordApi = (data: PasswordUpdateDTO) => {
  return request.put<null, null>('/users/password', data)
}

export const getUserOverviewApi = () => {
  return request.get<UserOverviewVO, UserOverviewVO>('/users/overview')
}

export const getAdminUsersApi = (params: AdminUserQuery) => {
  return request.get<PageResult<AdminUserVO>, PageResult<AdminUserVO>>('/admin/users', { params })
}

export const updateAdminUserStatusApi = (id: number, data: UserStatusUpdateDTO) => {
  return request.put<null, null>(`/admin/users/${id}/status`, data)
}

export const getAdminRolesApi = () => {
  return request.get<RoleVO[], RoleVO[]>('/admin/roles')
}
