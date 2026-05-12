import type { PageQuery } from './api'

export interface ResumeQueryDTO extends PageQuery {
  keyword?: string
}

export interface ResumeVO {
  id: number
  resumeName: string
  targetPosition?: string
  skills?: string
  isDefault: number
  status: number
  projectCount?: number
  updatedAt?: string
  createdAt?: string
}

export interface ResumeProjectVO {
  projectId: number
  resumeId?: number
  projectName: string
  projectTime?: string
  projectBackground?: string
  techStack?: string
  responsibility?: string
  coreFeatures?: string
  technicalChallenges?: string
  optimizationResult?: string
  extraInfo?: string
  sort?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeDetailVO {
  id: number
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
  techStack?: string
  responsibility?: string
  coreFeatures?: string
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
