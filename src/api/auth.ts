import request from '@/utils/request'
import type { CurrentUserVO, LoginDTO, LoginVO, RegisterDTO, RegisterVO } from '@/types/auth'

export const loginApi = (data: LoginDTO) => {
  return request.post<LoginVO, LoginVO>('/auth/login', data)
}

export const registerApi = (data: RegisterDTO) => {
  return request.post<RegisterVO, RegisterVO>('/auth/register', data)
}

export const logoutApi = () => {
  return request.post<null, null>('/auth/logout')
}

export const getCurrentUserApi = () => {
  return request.get<CurrentUserVO, CurrentUserVO>('/auth/current-user')
}

export const refreshTokenApi = () => {
  return request.post<LoginVO, LoginVO>('/auth/refresh-token')
}
