import type { PageQuery } from './api'

export type SkillProfileStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | string

export interface SkillProfileGenerateDTO {
  matchReportId: number
}

export interface SkillProfileRefreshDTO {
  profileId: number
  matchReportId?: number
}

export interface SkillProfileQueryDTO extends PageQuery {
  targetJobId?: number
  status?: SkillProfileStatus | ''
}

export interface SkillGapItemVO {
  id: number
  profileId: number
  userId?: number
  targetJobId?: number
  skillName?: string
  category?: string
  targetLevel?: number
  currentLevel?: number
  gapLevel?: number
  confidence?: number
  severity?: string
  evidenceSources?: unknown
  gapDescription?: string
  recommendedActions?: unknown
  priority?: number
  sourceType?: string
  sourceBizId?: number
  createdAt?: string
  updatedAt?: string
}

export interface SkillProfileGenerateVO {
  profileId: number
  targetJobId?: number
  matchReportId?: number
  gapCount?: number
  status: SkillProfileStatus
  errorMessage?: string
  aiCallLogId?: number
  createdAt?: string
  updatedAt?: string
}

export interface SkillProfileListVO {
  profileId: number
  userId?: number
  targetJobId?: number
  matchReportId?: number
  profileName?: string
  overallLevel?: number
  overallScore?: number
  summary?: string
  sourceType?: string
  sourceBizId?: number
  status: SkillProfileStatus
  errorMessage?: string
  gapCount?: number
  aiCallLogId?: number
  createdAt?: string
  updatedAt?: string
}

export interface SkillProfileDetailVO extends SkillProfileListVO {
  gapItems?: SkillGapItemVO[]
}

export interface SkillProfileRadarDataItemVO {
  skillName?: string
  category?: string
  targetLevel?: number
  currentLevel?: number
  gapLevel?: number
  severity?: string
}

export interface SkillProfileOverviewVO {
  empty?: boolean
  profileId?: number
  targetJobId?: number
  profileName?: string
  overallLevel?: number
  overallScore?: number
  status?: SkillProfileStatus
  summary?: string
  radarData?: SkillProfileRadarDataItemVO[]
  topGaps?: SkillGapItemVO[]
  nextPrioritySkills?: unknown
  nextActions?: unknown
  gapCount?: number
}
