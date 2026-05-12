import type { RoleCode, UserStatus } from './common'
import type { PageQuery } from './api'

export interface UserProfileVO {
  id?: number
  userId?: number
  username: string
  nickname?: string
  avatarUrl?: string | null
  email?: string | null
  status?: UserStatus
  roles?: RoleCode[]
  createdAt?: string
}

export interface UserProfileUpdateDTO {
  nickname?: string
  avatarUrl?: string
  email?: string
}

export interface PasswordUpdateDTO {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UserOverviewVO {
  resumeCount: number
  interviewCount: number
  completedInterviewCount: number
  questionAnsweredCount: number
  wrongQuestionCount: number
  favoriteQuestionCount: number
  recentInterviewTitle?: string
  recentInterviewAt?: string
}

export interface AdminUserQuery extends PageQuery {
  keyword?: string
  status?: UserStatus | ''
  roleCode?: RoleCode | ''
}

export interface AdminUserVO {
  id: number
  username: string
  nickname?: string
  avatarUrl?: string | null
  email?: string | null
  status: UserStatus
  statusName?: string
  roles: RoleCode[]
  createdAt?: string
}

export interface RoleVO {
  roleId: number
  roleCode: RoleCode
  roleName: string
  status: UserStatus
}

export interface UserStatusUpdateDTO {
  status: UserStatus
}
