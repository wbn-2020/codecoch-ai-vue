import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAbilityMapApi } from '@/api/abilityMap'
import type { AbilityMapVO } from '@/types/abilityMap'
import AbilityMapView from '@/views/ability-map/AbilityMapView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/abilityMap', () => ({
  getAbilityMapApi: vi.fn()
}))

const componentStubs = {
  'el-alert': {
    template: '<div class="el-alert-stub"></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-empty': {
    template: '<div class="el-empty-stub"></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const abilityMapFixture = (hasTrainingData: boolean): AbilityMapVO => ({
  userId: 1,
  totalSkillCount: 2,
  assessedSkillCount: hasTrainingData ? 2 : 0,
  weakSkillCount: hasTrainingData ? 1 : 0,
  strongSkillCount: hasTrainingData ? 1 : 0,
  hasTrainingData,
  domains: [
    {
      domainCode: 'JAVA_CORE',
      domainName: 'Java 基础',
      totalCount: 2,
      assessedCount: hasTrainingData ? 2 : 0,
      weakCount: hasTrainingData ? 1 : 0,
      skills: [
        {
          code: 'COLLECTIONS',
          name: '集合与数据结构',
          domainCode: 'JAVA_CORE',
          domainName: 'Java 基础',
          description: '掌握集合选型与常见实现。',
          status: hasTrainingData ? 'WEAK' : 'UNASSESSED',
          evidenceCount: hasTrainingData ? 2 : 0,
          confidence: hasTrainingData ? 'MEDIUM' : 'UNKNOWN'
        },
        {
          code: 'JAVA_CORE',
          name: 'Java 基础',
          domainCode: 'JAVA_CORE',
          domainName: 'Java 基础',
          description: '掌握 Java 核心语言能力。',
          status: hasTrainingData ? 'STRONG' : 'UNASSESSED',
          evidenceCount: hasTrainingData ? 3 : 0,
          confidence: hasTrainingData ? 'HIGH' : 'UNKNOWN'
        }
      ]
    }
  ]
})

const mountAbilityMap = async (hasTrainingData: boolean) => {
  vi.mocked(getAbilityMapApi).mockResolvedValue(abilityMapFixture(hasTrainingData))
  const wrapper = mount(AbilityMapView, {
    global: {
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('AbilityMapView layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses a compact directory track and lets the main content own the remaining width', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/ability-map/AbilityMapView.vue'),
      'utf8'
    )
    const workspaceRule = source.match(/\.map-workspace\s*\{[\s\S]*?\n\}/)?.[0] || ''

    expect(workspaceRule).toMatch(
      /grid-template-columns:\s*clamp\(220px,\s*18vw,\s*240px\)\s+minmax\(0,\s*1fr\)/
    )
    expect(workspaceRule).not.toMatch(/\s280px/)
    expect(source).not.toContain('map-workspace--without-insights')
  })

  it('does not reserve an insight region before training data exists', async () => {
    const wrapper = await mountAbilityMap(false)
    const workspace = wrapper.get('.map-workspace')

    expect(workspace.classes()).toEqual(['map-workspace'])
    expect(workspace.find('.insight-panel').exists()).toBe(false)
  })

  it('keeps populated insights inside the flexible main content instead of a third page column', async () => {
    const wrapper = await mountAbilityMap(true)

    expect(wrapper.find('.map-workspace > .insight-panel').exists()).toBe(false)
    expect(wrapper.find('.domain-panel > .insight-panel').exists()).toBe(true)
  })
})
