export interface IndustryTemplateVO {
  industryTemplateId: number
  industryCode?: string
  industryName: string
  description?: string
  targetPositions?: string
  coreBusinessScenarios?: string
  keyTechnicalPoints?: string
  commonQuestionDirections?: string
  riskPoints?: string
  promptContext?: string
  enabled?: number
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminIndustryTemplateQuery {
  keyword?: string
  enabled?: number | ''
}

export interface CreateIndustryTemplateDTO {
  industryCode: string
  industryName: string
  description?: string
  targetPositions?: string
  coreBusinessScenarios?: string
  keyTechnicalPoints?: string
  commonQuestionDirections?: string
  riskPoints?: string
  promptContext?: string
  enabled?: number
  sortOrder?: number
}

export type UpdateIndustryTemplateDTO = CreateIndustryTemplateDTO
