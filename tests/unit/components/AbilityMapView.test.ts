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

const abilityMapFixture = (hasTrainingData: boolean, domainCount = 1): AbilityMapVO => ({
  userId: 1,
  totalSkillCount: domainCount * 2,
  assessedSkillCount: hasTrainingData ? domainCount * 2 : 0,
  weakSkillCount: hasTrainingData ? 1 : 0,
  strongSkillCount: hasTrainingData ? 1 : 0,
  hasTrainingData,
  domains: Array.from({ length: domainCount }, (_, index) => {
    const domainCode = `JAVA_CORE_${index + 1}`
    const domainName = `Java 基础 ${index + 1}`
    return {
      domainCode,
      domainName,
      totalCount: 2,
      assessedCount: hasTrainingData ? 2 : 0,
      weakCount: hasTrainingData && index === 0 ? 1 : 0,
      skills: [
        {
          code: `COLLECTIONS_${index + 1}`,
          name: `集合与数据结构 ${index + 1}`,
          domainCode,
          domainName,
          description: '掌握集合选型与常见实现。',
          status: hasTrainingData && index === 0 ? 'WEAK' : 'UNASSESSED',
          evidenceCount: hasTrainingData ? 2 : 0,
          confidence: hasTrainingData ? 'MEDIUM' : 'UNKNOWN'
        },
        {
          code: `JAVA_CORE_${index + 1}`,
          name: `Java 基础 ${index + 1}`,
          domainCode,
          domainName,
          description: '掌握 Java 核心语言能力。',
          status: hasTrainingData && index === 0 ? 'STRONG' : 'UNASSESSED',
          evidenceCount: hasTrainingData ? 3 : 0,
          confidence: hasTrainingData ? 'HIGH' : 'UNKNOWN'
        }
      ]
    }
  })
})

const mountAbilityMap = async (hasTrainingData: boolean, domainCount = 1) => {
  vi.mocked(getAbilityMapApi).mockResolvedValue(abilityMapFixture(hasTrainingData, domainCount))
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

  it('uses the compact Direction D skill board and places the action rail within the visible grid', async () => {
    const wrapper = await mountAbilityMap(false)

    expect(wrapper.find('.ability-summary').exists()).toBe(true)
    expect(wrapper.find('.ability-tree-layout').exists()).toBe(true)
    expect(wrapper.find('.ability-node-board').exists()).toBe(true)
    expect(wrapper.find('.ability-action-rail').exists()).toBe(true)
    expect(wrapper.findAll('.ability-node')).toHaveLength(2)
  })

  it('keeps every domain in the visual node board while retaining action and evidence cards', async () => {
    const wrapper = await mountAbilityMap(true, 3)

    expect(wrapper.findAll('.ability-node-board .ability-domain-card')).toHaveLength(3)
    expect(wrapper.find('.ability-action-rail').exists()).toBe(true)
    expect(wrapper.find('.ability-evidence-card').exists()).toBe(true)
  })

  it('keeps unassessed skills visually honest before training data exists', async () => {
    const wrapper = await mountAbilityMap(false)

    expect(wrapper.find('.priority-action-card.is-muted').exists()).toBe(true)
    expect(wrapper.findAll('.ability-node.is-unassessed')).toHaveLength(2)
    expect(wrapper.find('.ability-node.is-weak').exists()).toBe(false)
  })

  it('shows real weak and strong nodes after training data is available', async () => {
    const wrapper = await mountAbilityMap(true)

    expect(wrapper.find('.ability-node.is-weak').exists()).toBe(true)
    expect(wrapper.find('.ability-node.is-strong').exists()).toBe(true)
    expect(wrapper.find('.ability-evidence-card').exists()).toBe(true)
  })

  it('keeps each skill node itself tappable for training', async () => {
    const wrapper = await mountAbilityMap(true)
    const buttons = wrapper.findAll('button.ability-node')

    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    expect(routerPush).toHaveBeenCalledWith(expect.objectContaining({
      path: '/questions/practice'
    }))
  })
})
