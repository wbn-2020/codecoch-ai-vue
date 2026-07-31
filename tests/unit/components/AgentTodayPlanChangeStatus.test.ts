import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import PlanChangeStatusBanner from '@/components/agent-review/PlanChangeStatusBanner.vue'

const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
})

const stubs = {
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="alert-stub">{{ title }} {{ description }}</div>'
  },
  'el-button': ButtonStub,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('PlanChangeStatusBanner', () => {
  it('shows authoritative waiting and applied statuses without conflating them', () => {
    const wrapper = mount(PlanChangeStatusBanner, {
      props: {
        changeSets: [
          {
            changeSetId: 501,
            status: 'CONFIRMED_WAITING_PLAN',
            targetDate: '2026-07-19',
            confirmedAt: '2026-07-18T20:00:00',
            items: [{ id: 701, changeType: 'CARRY_OVER_TASK', applyStatus: 'WAITING_PLAN' }]
          },
          {
            changeSetId: 502,
            status: 'APPLIED',
            targetDate: '2026-07-18',
            appliedAt: '2026-07-18T20:05:00',
            items: [
              { id: 702, changeType: 'ADD_TASK', applyStatus: 'APPLIED' },
              { id: 703, changeType: 'CHANGE_PRIORITY', applyStatus: 'APPLIED' }
            ]
          }
        ]
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('已确认，等待计划生成')
    expect(wrapper.text()).toContain('当前不代表任务已经创建')
    expect(wrapper.text()).toContain('已应用 2 项复盘调整')
    expect(wrapper.text()).toContain('后端已完成任务变更和周计划回流')
  })

  it('does not infer applied state when the status endpoint is unavailable', () => {
    const wrapper = mount(PlanChangeStatusBanner, {
      props: {
        unavailable: true,
        changeSets: [{
          changeSetId: 502,
          status: 'APPLIED'
        }]
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('复盘调整状态暂不可用')
    expect(wrapper.text()).toContain('不会从任务或周计划前端推断')
    expect(wrapper.text()).not.toContain('已应用 0 项复盘调整')
  })
})
