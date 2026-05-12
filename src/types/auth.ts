import type { RoleCode } from './common'

export interface LoginDTO {
  username: string
  password: string
}

export interface RegisterDTO {
  username: string
  password: string
  confirmPassword: string
  nickname?: string
  email?: string
}

export interface CurrentUserVO {
  id?: number
  userId?: number
  username: string
  nickname?: string
  avatarUrl?: string | null
  email?: string | null
  roles: RoleCode[]
}

export interface LoginVO {
  token: string
  tokenName?: string
  expireTime?: string
  userInfo?: CurrentUserVO
  userId?: number
  username?: string
  nickname?: string
  roles: RoleCode[]
}

export interface RegisterVO {
  userId: number
  username: string
  nickname?: string
}
