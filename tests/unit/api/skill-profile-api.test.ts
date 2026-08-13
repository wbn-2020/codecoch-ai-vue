import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: request
}))

import { getSkillProfileByIdApi, getSkillProfileOverviewApi } from '@/api/skillProfile'

describe('skill profile API normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves null skill levels and scores as unquantified values', async () => {
    request.get
      .mockResolvedValueOnce({
        profileId: 7,
        overallLevel: null,
        overallScore: null,
        gapItems: [{
          id: 11,
          profileId: 7,
          skillName: 'Java',
          currentLevel: null,
          targetLevel: null,
          gapLevel: null,
          confidence: null
        }]
      })
      .mockResolvedValueOnce({
        profileId: 7,
        overallLevel: null,
        overallScore: null,
        radarData: [{
          skillName: 'Java',
          currentLevel: null,
          targetLevel: null,
          gapLevel: null
        }]
      })

    const detail = await getSkillProfileByIdApi(7)
    const overview = await getSkillProfileOverviewApi()

    expect(detail).toMatchObject({
      overallLevel: undefined,
      overallScore: undefined
    })
    expect(detail?.gapItems?.[0]).toMatchObject({
      currentLevel: undefined,
      targetLevel: undefined,
      gapLevel: undefined,
      confidence: undefined
    })
    expect(overview).toMatchObject({
      overallLevel: undefined,
      overallScore: undefined
    })
    expect(overview.radarData?.[0]).toMatchObject({
      currentLevel: undefined,
      targetLevel: undefined,
      gapLevel: undefined
    })
  })
})
