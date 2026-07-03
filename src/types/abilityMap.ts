export type AbilityStatus = 'UNASSESSED' | 'WEAK' | 'BASIC' | 'COMPETENT' | 'STRONG' | string
export type AbilityConfidence = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | string

export interface AbilitySkillNodeVO {
  id?: number
  code: string
  name: string
  domainCode: string
  domainName: string
  description?: string
  sortOrder?: number
  status: AbilityStatus
  evidenceCount: number
  lastEvaluatedAt?: string
  confidence: AbilityConfidence
  summary?: string
}

export interface AbilityDomainVO {
  domainCode: string
  domainName: string
  totalCount: number
  assessedCount: number
  weakCount: number
  skills: AbilitySkillNodeVO[]
}

export interface AbilityMapVO {
  userId?: number
  totalSkillCount: number
  assessedSkillCount: number
  weakSkillCount: number
  strongSkillCount: number
  hasTrainingData: boolean
  domains: AbilityDomainVO[]
}
