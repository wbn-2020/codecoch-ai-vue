import type { PageQuery } from './api'

export interface AdminOverviewVO {
  userCount: number
  questionCount: number
  resumeCount: number
  interviewCount: number
  completedInterviewCount: number
  aiCallCount: number
  aiCallFailedCount: number
  promptCount: number
  todayInterviewCount: number
  todayAiCallCount: number
}

export interface SystemConfigQueryDTO extends PageQuery {
  keyword?: string
  configKey?: string
  status?: number | ''
}

export interface SystemConfigVO {
  id: number
  configKey: string
  configName?: string
  configValue?: string
  configType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | string
  editable: number
  status: number
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface SystemConfigCreateDTO {
  configKey: string
  configName?: string
  configValue?: string
  configType: string
  editable?: number
  status?: number
  description?: string
}

export interface SystemConfigUpdateDTO {
  configValue: string
  description?: string
}
