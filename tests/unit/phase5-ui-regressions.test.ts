import { describe, expect, it } from 'vitest'

import { normalizeAbilityMap } from '@/features/ability-map'
import { routes } from '@/router/routes'

describe('Phase5 user UI regressions', () => {
  const mojibakeText = (...codes: number[]) => String.fromCodePoint(...codes)

  it('serves the arena prepare view on /resumes and keeps the legacy safe shell on /resumes/legacy', () => {
    const userRoot = routes.find((route) => route.path === '/')
    const resumeRoute = userRoot?.children?.find((route) => route.path === 'resumes')
    const legacyRoute = userRoot?.children?.find((route) => route.path === 'resumes/legacy')

    expect(String(resumeRoute?.component)).toContain('ArenaPrepareView.vue')
    expect(String(legacyRoute?.component)).toContain('ResumeJobHubSafeView.vue')
    expect(legacyRoute?.meta?.hidden).toBe(true)
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

  it('keeps valid Chinese ability copy instead of treating rare characters as mojibake', () => {
    const normalDomainName = mojibakeText(0x5de5, 0x5177, 0x7bb1, 0x4e0e, 0x5e90, 0x5c71, 0x9879, 0x76ee)
    const normalSkillName = `${normalDomainName}训练`
    const normalDescription = `${normalDomainName}可以继续沉淀项目证据`
    const normalSummary = `${normalDomainName}已经有训练摘要`

    const abilityMap = normalizeAbilityMap({
      domains: [
        {
          domainCode: 'PROJECT',
          domainName: normalDomainName,
          skills: [
            {
              code: 'PROJECT',
              name: normalSkillName,
              domainCode: 'PROJECT',
              domainName: normalDomainName,
              description: normalDescription,
              summary: normalSummary
            }
          ]
        }
      ]
    })

    expect(abilityMap.domains[0].domainName).toBe(normalDomainName)
    expect(abilityMap.domains[0].skills[0]).toMatchObject({
      name: normalSkillName,
      domainName: normalDomainName,
      description: normalDescription,
      summary: normalSummary
    })
  })

  it('uses readable fallback copy for backend ability codes and keeps no-training maps unassessed', () => {
    const abilityMap = normalizeAbilityMap({
      hasTrainingData: false,
      domains: [
        {
          domainCode: 'COLLECTION',
          domainName: '',
          totalCount: 1,
          assessedCount: 1,
          weakCount: 1,
          skills: [
            {
              code: 'COLLECTION_HASHMAP',
              name: '',
              domainCode: 'COLLECTION',
              domainName: '',
              status: 'WEAK',
              evidenceCount: 2,
              confidence: 'HIGH'
            }
          ]
        }
      ]
    })

    expect(abilityMap).toMatchObject({
      hasTrainingData: false,
      assessedSkillCount: 0,
      weakSkillCount: 0,
      strongSkillCount: 0
    })
    expect(abilityMap.domains[0]).toMatchObject({
      domainName: '集合框架',
      assessedCount: 0,
      weakCount: 0
    })
    expect(abilityMap.domains[0].skills[0]).toMatchObject({
      name: 'HashMap 与集合选型',
      domainName: '集合框架',
      status: 'UNASSESSED',
      confidence: 'UNKNOWN'
    })
  })
})
