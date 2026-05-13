import type { PageQuery } from './api'

export interface ResumeQueryDTO extends PageQuery {
  keyword?: string
}

export interface ResumeVO {
  id: number
  resumeName: string
  title?: string
  realName?: string
  targetPosition?: string
  skills?: string
  summary?: string
  isDefault: number
  status: number
  projectCount?: number
  updatedAt?: string
  createdAt?: string
}

export interface ResumeProjectVO {
  id?: number
  projectId: number
  resumeId?: number
  projectName: string
  projectTime?: string
  projectBackground?: string
  description?: string
  techStack?: string
  role?: string
  responsibility?: string
  coreFeatures?: string
  highlights?: string
  technicalChallenges?: string
  optimizationResult?: string
  extraInfo?: string
  sort?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeDetailVO {
  id: number
  title?: string
  realName?: string
  email?: string
  phone?: string
  summary?: string
  resumeName: string
  targetPosition?: string
  skills?: string
  workSummary?: string
  education?: string
  isDefault: number
  status: number
  projects?: ResumeProjectVO[]
  createdAt?: string
  updatedAt?: string
}

export interface ResumeCreateDTO {
  resumeName: string
  title?: string
  realName?: string
  email?: string
  phone?: string
  summary?: string
  targetPosition?: string
  skills: string
  workSummary?: string
  education?: string
  isDefault?: number
}

export type ResumeUpdateDTO = ResumeCreateDTO

export interface ResumeProjectDTO {
  projectName: string
  projectTime?: string
  projectBackground?: string
  description?: string
  techStack?: string
  role?: string
  responsibility?: string
  coreFeatures?: string
  highlights?: string
  technicalChallenges?: string
  optimizationResult?: string
  extraInfo?: string
  sort?: number
}

export interface SetDefaultResumeVO {
  id: number
  isDefault: number
  updatedAt: string
}
