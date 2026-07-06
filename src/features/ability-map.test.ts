import { describe, expect, it } from 'vitest'

import { normalizeAbilityMap, statusLabel } from './ability-map'

describe('ability map feature', () => {
  const mojibakeText = (...codes: number[]) => String.fromCodePoint(...codes)

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

  it('replaces mojibake ability names with safe product copy', () => {
    const badDomain = `Java ${mojibakeText(0x6c13, 0x9e25, 0x83bd, 0x9227, 0x9286)}`
    const badSkill = mojibakeText(0x9225, 0x20ac, 0x30c2, 0x54f7)

    const abilityMap = normalizeAbilityMap({
      domains: [
        {
          domainCode: 'JAVA_CORE',
          domainName: badDomain,
          skills: [
            {
              code: 'COLLECTIONS',
              name: badSkill,
              domainCode: 'JAVA_CORE',
              domainName: badDomain,
              description: `${badSkill}坏数据`
            }
          ]
        }
      ]
    })

    expect(abilityMap.domains[0].domainName).toBe('Java 基础')
    expect(abilityMap.domains[0].skills[0]).toMatchObject({
      name: '集合与数据结构',
      domainName: 'Java 基础',
      description: '当前能力点描述暂不可用，先按能力目录进入训练。'
    })
  })
})
