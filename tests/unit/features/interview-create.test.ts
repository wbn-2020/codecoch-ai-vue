import { describe, expect, it } from 'vitest'

import { INTERVIEW_MODE } from '@/constants/enums'
import { buildInterviewCreatePayload } from '@/features/interview-create'

describe('interview create feature payload', () => {
  it('does not force resume context only because the route came from job target', () => {
    const payload = buildInterviewCreatePayload({
      form: {
        interviewName: '轻量技术面',
        interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
        targetPosition: 'Java 后端开发',
        experienceLevel: '3_YEARS',
        industryDirection: 'GENERAL',
        difficulty: 'EASY',
        interviewerStyle: 'NORMAL',
        practiceMode: 'PRACTICE',
        resumeId: 18,
        questionCount: 5,
        basedOnResume: false,
        recommendationSource: 'LIGHTWEIGHT'
      },
      isIndustryMode: false,
      useResume: false,
      isJobTargetFlow: true
    })

    expect(payload).toMatchObject({
      resumeId: undefined,
      basedOnResume: false,
      recommendationSource: 'LIGHTWEIGHT'
    })
  })
})
