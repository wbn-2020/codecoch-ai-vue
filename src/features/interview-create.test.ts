import { describe, expect, it } from 'vitest'

import { INTERVIEW_MODE } from '@/constants/enums'

import { buildInterviewCreatePayload } from './interview-create'

describe('interview create payload', () => {
  it('keeps applicationId from application route context', () => {
    const payload = buildInterviewCreatePayload({
      form: {
        interviewName: 'Java backend mock',
        interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
        targetPosition: 'Java Backend',
        experienceLevel: '3_YEARS',
        industryDirection: 'GENERAL',
        difficulty: 'MEDIUM',
        interviewerStyle: 'NORMAL',
        practiceMode: 'FORMAL',
        resumeId: 18,
        questionCount: 8
      },
      context: {
        applicationId: 42
      },
      isIndustryMode: false,
      useResume: true,
      isJobTargetFlow: true
    })

    expect(payload).toMatchObject({
      applicationId: 42,
      resumeId: 18,
      interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC
    })
  })
})
