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

  it('uses the direction D skill-tree grid with a focused action rail', async () => {
    const wrapper = await mountAbilityMap(false)

    expect(wrapper.find('.ability-tree-layout').exists()).toBe(true)
    expect(wrapper.find('.ability-tree-panel').exists()).toBe(true)
    expect(wrapper.find('.ability-action-rail').exists()).toBe(true)
    expect(wrapper.findAll('.ability-node')).toHaveLength(2)
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

  it('keeps a tappable action route for each skill node', async () => {
    const wrapper = await mountAbilityMap(true)
    const buttons = wrapper.findAll('.ability-node__action')

    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    expect(routerPush).toHaveBeenCalledWith(expect.objectContaining({
      path: '/questions/practice'
    }))
  })
})
