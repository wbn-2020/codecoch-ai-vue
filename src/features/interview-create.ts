import { INTERVIEW_MODE } from '@/constants/enums'
import type { IndustryTemplateVO, InterviewCreateDTO } from '@/types/interview'

export interface InterviewCreateRouteContext {
  applicationId?: number
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
  interviewMode: isIndustryMode ? INTERVIEW_MODE.COMPREHENSIVE : form.interviewMode,
  practiceMode: form.practiceMode,
  industryTemplateId: isIndustryMode ? form.industryTemplateId : undefined,
  industryDirection: isIndustryMode
    ? selectedIndustryTemplate?.industryCode || selectedIndustryTemplate?.industryName || form.industryDirection
    : form.industryDirection,
  resumeId: useResume || isJobTargetFlow ? form.resumeId : undefined
})
