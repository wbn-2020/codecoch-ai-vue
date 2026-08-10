import { describe, expect, it } from 'vitest'

import { needsUserOnboarding } from './login-entry'

describe('login entry', () => {
  it('routes a genuinely empty user into onboarding', () => {
    expect(needsUserOnboarding({
      resumeCount: 0,
      interviewCount: 0,
      studyPlanCount: 0
    })).toBe(true)
  })

  it('keeps returning users in the regular workspace', () => {
    expect(needsUserOnboarding({
      resumeCount: 1,
      interviewCount: 0,
      studyPlanCount: 0
    })).toBe(false)

    expect(needsUserOnboarding({
      resumeCount: 0,
      interviewCount: 0,
      studyPlanCount: 0,
      recentInterview: {
        interviewId: 7,
        title: 'Java 技术面试',
        status: 'FINISHED'
      }
    })).toBe(false)
  })

  it('does not force onboarding when the overview request is unavailable', () => {
    expect(needsUserOnboarding(null)).toBe(false)
    expect(needsUserOnboarding(undefined)).toBe(false)
  })
})
