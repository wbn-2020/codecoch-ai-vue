import { INTERVIEW_MODE } from '@/constants/enums'
import type { IndustryTemplateVO, InterviewCreateDTO } from '@/types/interview'

export interface InterviewCreateRouteContext {
  applicationId?: number
  applicationPackageId?: string | number
  targetJobId?: number
  jdAnalysisId?: number
  resumeVersionId?: number
  matchReportId?: number
  projectEvidenceIds?: number[]
  source?: 'application-package' | 'application' | string
}

export interface BuildInterviewCreatePayloadOptions {
  form: InterviewCreateDTO
  context?: InterviewCreateRouteContext
  isIndustryMode: boolean
  useResume: boolean
  isJobTargetFlow: boolean
  selectedIndustryTemplate?: IndustryTemplateVO
}

export const buildInterviewCreatePayload = ({
  form,
  context,
  isIndustryMode,
  useResume,
  isJobTargetFlow,
  selectedIndustryTemplate
}: BuildInterviewCreatePayloadOptions): InterviewCreateDTO => ({
  ...form,
  applicationId: context?.applicationId ?? form.applicationId,
  applicationPackageId: context?.applicationPackageId ?? form.applicationPackageId,
  targetJobId: context?.targetJobId ?? form.targetJobId,
  jdAnalysisId: context?.jdAnalysisId ?? form.jdAnalysisId,
  resumeVersionId: context?.resumeVersionId ?? form.resumeVersionId,
  matchReportId: context?.matchReportId ?? form.matchReportId,
  interviewMode: isIndustryMode ? INTERVIEW_MODE.COMPREHENSIVE : form.interviewMode,
  practiceMode: form.practiceMode,
  trainingScene: form.trainingScene,
  targetSkillDomain: form.targetSkillDomain,
  targetSkillCodes: form.targetSkillCodes,
  targetLevel: form.targetLevel,
  projectEvidenceIds: context?.projectEvidenceIds?.length ? context.projectEvidenceIds : form.projectEvidenceIds,
  followUpIntensity: form.followUpIntensity,
  industryTemplateId: isIndustryMode ? form.industryTemplateId : undefined,
  industryDirection: isIndustryMode
    ? selectedIndustryTemplate?.industryCode || selectedIndustryTemplate?.industryName || form.industryDirection
    : form.industryDirection,
  resumeId: useResume ? form.resumeId : undefined
})
