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

  it('keeps training context fields on the existing create payload', () => {
    const payload = buildInterviewCreatePayload({
      form: {
        interviewName: 'Java专项',
        interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
        targetPosition: 'Java 后端开发',
        experienceLevel: '3_YEARS',
        industryDirection: 'GENERAL',
        difficulty: 'MEDIUM',
        interviewerStyle: 'NORMAL',
        practiceMode: 'FORMAL',
        questionCount: 6,
        trainingScene: 'JAVA_SPECIALTY',
        targetSkillDomain: 'JVM',
        targetSkillCodes: ['JVM_MEMORY_GC'],
        targetLevel: 'COMPETENT',
        projectEvidenceIds: [11, 12],
        followUpIntensity: 'DEEP'
      },
      isIndustryMode: false,
      useResume: false,
      isJobTargetFlow: false
    })

    expect(payload).toMatchObject({
      resumeId: undefined,
      trainingScene: 'JAVA_SPECIALTY',
      targetSkillDomain: 'JVM',
      targetSkillCodes: ['JVM_MEMORY_GC'],
      targetLevel: 'COMPETENT',
      projectEvidenceIds: [11, 12],
      followUpIntensity: 'DEEP'
    })
  })
})
