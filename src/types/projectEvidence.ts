import type { PageQuery } from './api'

export type ProjectCompletenessStatus = 'READY' | 'NEEDS_IMPROVEMENT' | 'INCOMPLETE' | string
export type SkillEvidenceStrength = 'STRONG' | 'MEDIUM' | 'WEAK' | string
export type ProjectStoryGenerationType = 'RESUME_BULLET' | 'STAR_STORY' | 'INTERVIEW_QUESTIONS' | string

export interface ProjectEvidenceVersionSummaryVO {
  id?: number
  projectEvidenceId?: number
  versionNo?: number
  contentHash?: string
  sourceType?: string
  sourceId?: number
  confirmedAt?: string
  createdAt?: string
}

export interface ProjectSkillEvidenceVO {
  id: number
  userId?: number
  projectEvidenceId: number
  skillName: string
  skillCategory?: string
  evidenceText?: string
  strengthLevel?: SkillEvidenceStrength
  jdKeyword?: string
  riskPoints?: string
  sourceType?: string
  confirmed?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProjectEvidenceListVO {
  id: number
  userId?: number
  title: string
  role?: string
  techStack?: string
  completenessScore?: number
  completenessStatus?: ProjectCompletenessStatus
  missingFields?: string[]
  sourceResumeId?: number
  sourceResumeProjectId?: number
  sourceAvailable?: boolean
  targetJobId?: number
  skillEvidenceCount?: number
  currentVersionId?: number
  currentVersionNo?: number
  currentVersionHash?: string
  currentVersionCreatedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProjectEvidenceDetailVO extends ProjectEvidenceListVO {
  startDate?: string
  endDate?: string
  background?: string
  responsibility?: string
  difficulty?: string
  solution?: string
  result?: string
  reflection?: string
  skillEvidences?: ProjectSkillEvidenceVO[]
  currentVersion?: ProjectEvidenceVersionSummaryVO
  versions?: ProjectEvidenceVersionSummaryVO[]
}

export interface ProjectEvidenceDTO {
  title: string
  role?: string
  startDate?: string
  endDate?: string
  background?: string
  responsibility?: string
  techStack?: string
  difficulty?: string
  solution?: string
  result?: string
  reflection?: string
  sourceResumeId?: number
  sourceResumeProjectId?: number
  targetJobId?: number
}

export interface ProjectEvidenceFromResumeProjectDTO {
  sourceResumeId: number
  sourceResumeProjectId: number
  targetJobId?: number
}

export interface ProjectEvidenceQueryDTO extends PageQuery {
  keyword?: string
  techStack?: string
  completenessStatus?: ProjectCompletenessStatus
  sourceResumeId?: number
  targetJobId?: number
}

export interface ProjectSkillEvidenceDTO {
  skillName: string
  skillCategory?: string
  evidenceText?: string
  strengthLevel?: SkillEvidenceStrength
  jdKeyword?: string
  riskPoints?: string
  sourceType?: string
  confirmed?: boolean
}

export interface ProjectStoryGenerateDTO {
  generationType: ProjectStoryGenerationType
  targetJobId?: number
}

export interface ProjectStoryGenerationQueryDTO {
  generationType?: ProjectStoryGenerationType
  accepted?: boolean
}

export interface ProjectStoryGenerationVO {
  id?: number
  userId?: number
  projectEvidenceId: number
  generationType: ProjectStoryGenerationType
  targetJobId?: number
  promptVersion?: string
  resultText?: string
  structuredResultJson?: string
  inputSummaryJson?: string
  aiCallLogId?: number
  traceId?: string
  resultSource?: string
  accepted?: boolean
  status?: string
  errorMessage?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  createdAt?: string
  updatedAt?: string
}

export interface ProjectJdCoverageRequestDTO {
  targetJobId?: number
  jdText?: string
}

export interface ProjectJdCoverageVO {
  projectEvidenceId: number
  targetJobId?: number
  coverageScore?: number
  jdSkills?: string[]
  coveredSkills?: string[]
  weakCoveredSkills?: string[]
  missingSkills?: string[]
  expressionSuggestions?: string[]
}
