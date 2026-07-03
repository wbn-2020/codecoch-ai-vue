import { describe, expect, it } from 'vitest'

import { normalizeAbilityMap, statusLabel } from './ability-map'

describe('ability map feature', () => {
  it('keeps unassessed skills as empty-state data instead of fake conclusions', () => {
    const abilityMap = normalizeAbilityMap({
      domains: [
        {
          domainCode: 'JAVA_CORE',
          domainName: 'Java 基础',
          totalCount: 1,
          assessedCount: 0,
          weakCount: 0,
          skills: [
            {
              code: 'JAVA_CORE',
              name: 'Java 基础',
              domainCode: 'JAVA_CORE',
              domainName: 'Java 基础'
            }
          ]
        }
      ]
    })

    expect(abilityMap.hasTrainingData).toBe(false)
    expect(abilityMap.assessedSkillCount).toBe(0)
    expect(abilityMap.domains[0].skills[0]).toMatchObject({
      status: 'UNASSESSED',
      confidence: 'UNKNOWN',
      evidenceCount: 0
    })
    expect(statusLabel(abilityMap.domains[0].skills[0].status)).toBe('未评估')
  })
})
