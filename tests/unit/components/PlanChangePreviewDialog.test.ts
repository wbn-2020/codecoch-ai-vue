import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import PlanChangePreviewDialog from '@/components/agent-review/PlanChangePreviewDialog.vue'
import type { AgentPlanChangePreviewVO } from '@/types/agentPlanChange'

const CheckboxStub = defineComponent({
  props: {
    modelValue: Boolean,
    disabled: Boolean
  },
  emits: ['change'],
  template: `
    <button
      type="button"
      class="checkbox-stub"
      :disabled="disabled"
      @click="$emit('change', !modelValue)"
    >
      <slot />
    </button>
  `
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean
  },
  emits: ['click'],
  template: `
    <button
      type="button"
      class="button-stub"
      v-bind="$attrs"
      :disabled="disabled || loading"
      @click="$emit('click')"
    >
      <slot />
    </button>
  `
})

const DialogStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue"><slot name="header" /><slot /><slot name="footer" /></div>'
})

const stubs = {
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="alert-stub">{{ title }} {{ description }}</div>'
  },
  'el-button': ButtonStub,
  'el-checkbox': CheckboxStub,
  'el-dialog': DialogStub,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

const preview: AgentPlanChangePreviewVO = {
  changeSetId: 501,
  reviewId: 88,
  reviewVersion: 2,
  targetDate: '2026-07-19',
  status: 'PREVIEW_READY',
  previewVersion: 1,
  previewHash: 'preview-hash',
  expiresAt: '2099-07-18T22:30:00',
  confirmable: true,
  resultSource: 'RULE',
  summary: {
    addCount: 1,
    removeCount: 1,
    rescheduleCount: 1,
    priorityChangeCount: 1,
    beforeTaskCount: 3,
    afterTaskCount: 3,
    beforeMinutes: 90,
    afterMinutes: 120
  },
  warnings: ['LOW_CONFIDENCE_REVIEW'],
  blockers: [],
  items: [
    {
      id: 701,
      changeType: 'ADD_TASK',
      title: '新增练习',
      before: null,
      after: { title: '新增练习', dueDate: '2026-07-19', priority: 'MEDIUM', status: 'TODO', estimatedMinutes: 30 },
      dailyImpact: '新增一项练习',
      weekImpact: '本周任务增加一项',
      sourceSuggestionId: 301,
      confidenceLevel: 'LOW',
      fallback: true,
      warnings: ['LOW_CONFIDENCE_REVIEW']
    },
    {
      id: 702,
      changeType: 'REMOVE_OPEN_TASK',
      title: '移出低优先级任务',
      before: { title: '旧任务', dueDate: '2026-07-19', priority: 'LOW', status: 'TODO', estimatedMinutes: 20 },
      after: null,
      dailyImpact: '移出一项开放任务',
      weekImpact: '本周任务减少一项'
    },
    {
      id: 703,
      changeType: 'RESCHEDULE_TASK',
      title: '延后任务',
      before: { title: '跟进面试', dueDate: '2026-07-19', priority: 'HIGH', status: 'TODO', estimatedMinutes: 30 },
      after: { title: '跟进面试', dueDate: '2026-07-20', priority: 'HIGH', status: 'TODO', estimatedMinutes: 30 },
      dailyImpact: '任务延后一天',
      weekImpact: '日期发生变化'
    },
    {
      id: 704,
      changeType: 'CHANGE_PRIORITY',
      title: '调整优先级',
      before: { title: '复盘错题', dueDate: '2026-07-19', priority: 'LOW', status: 'TODO', estimatedMinutes: 30 },
      after: { title: '复盘错题', dueDate: '2026-07-19', priority: 'MEDIUM', status: 'TODO', estimatedMinutes: 30 },
      dailyImpact: '优先级由低调整为中',
      weekImpact: '周计划排序变化'
    }
  ]
}

describe('PlanChangePreviewDialog', () => {
  it('renders four difference groups, before/after values, warnings, and blockers surface', () => {
    const wrapper = mount(PlanChangePreviewDialog, {
      props: {
        modelValue: true,
        preview,
        sourceReviewDate: '2026-07-18',
        suggestions: [{ id: 301, title: '增加一项轻量练习' }]
      },
      global: {
        directives: { loading: {} },
        stubs
      }
    })

    expect(wrapper.text()).toContain('只读预览，尚未修改任何计划')
    expect(wrapper.text()).toContain('新增')
    expect(wrapper.text()).toContain('移除')
    expect(wrapper.text()).toContain('延后')
    expect(wrapper.text()).toContain('优先级')
    expect(wrapper.text()).toContain('2026-07-19')
    expect(wrapper.text()).toContain('2026-07-20')
    expect(wrapper.text()).toContain('来源建议：增加一项轻量练习')
    expect(wrapper.text()).toContain('弱调整，需人工复核')
    wrapper.unmount()
  })

  it('keeps confirm disabled until every warning is acknowledged', async () => {
    const wrapper = mount(PlanChangePreviewDialog, {
      props: {
        modelValue: true,
        preview
      },
      global: {
        directives: { loading: {} },
        stubs
      }
    })

    const confirmButton = wrapper.get('[data-testid="confirm-plan-change"]')
    expect(confirmButton.attributes('disabled')).toBeDefined()

    await wrapper.get('.checkbox-stub').trigger('click')
    await nextTick()

    expect(confirmButton.attributes('disabled')).toBeUndefined()
    await confirmButton.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual(['LOW_CONFIDENCE_REVIEW'])
    wrapper.unmount()
  })
})
