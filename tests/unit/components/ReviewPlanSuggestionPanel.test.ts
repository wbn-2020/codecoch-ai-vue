import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import ReviewPlanSuggestionPanel from '@/components/agent-review/ReviewPlanSuggestionPanel.vue'
import type { AgentReviewPlanSuggestionListVO } from '@/types/agentPlanChange'

const CheckboxStub = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: Boolean,
    disabled: Boolean
  },
  emits: ['change'],
  template: `
    <button
      type="button"
      class="checkbox-stub"
      v-bind="$attrs"
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

const stubs = {
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="alert-stub">{{ title }} {{ description }}</div>'
  },
  'el-button': ButtonStub,
  'el-checkbox': CheckboxStub,
  'el-date-picker': true,
  'el-input-number': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

const suggestionList = (
  suggestions: AgentReviewPlanSuggestionListVO['suggestions']
): AgentReviewPlanSuggestionListVO => ({
  reviewId: 88,
  reviewVersion: 2,
  reviewDate: '2026-07-18',
  suggestions
})

describe('ReviewPlanSuggestionPanel', () => {
  it('states that accepted suggestions have not affected the plan', () => {
    const wrapper = mount(ReviewPlanSuggestionPanel, {
      props: {
        data: suggestionList([{
          id: 301,
          reviewId: 88,
          reviewVersion: 2,
          title: '保留重点任务',
          decisionStatus: 'ACCEPTED',
          decisionVersion: 2,
          confidenceLevel: 'MEDIUM',
          actionable: true
        }])
      },
      global: {
        directives: { loading: {} },
        stubs
      }
    })

    expect(wrapper.text()).toContain('已采纳，尚未影响计划')
    expect(wrapper.text()).not.toContain('计划已修改')
    expect(wrapper.text()).not.toContain('复盘调整已应用')
  })

  it('supports selecting pending suggestions and emitting one atomic batch decision', async () => {
    const wrapper = mount(ReviewPlanSuggestionPanel, {
      props: {
        data: suggestionList([
          {
            id: 301,
            reviewId: 88,
            reviewVersion: 2,
            title: '建议 A',
            decisionStatus: 'PENDING',
            decisionVersion: 1,
            actionable: true
          },
          {
            id: 302,
            reviewId: 88,
            reviewVersion: 2,
            title: '建议 B',
            decisionStatus: 'PENDING',
            decisionVersion: 1,
            actionable: true
          }
        ])
      },
      global: {
        directives: { loading: {} },
        stubs
      }
    })

    await wrapper.get('[aria-label="选择建议：建议 A"]').trigger('click')
    await wrapper.get('[aria-label="选择建议：建议 B"]').trigger('click')
    const batchButton = wrapper.findAll('button').find((button) => button.text().includes('批量采纳'))
    expect(batchButton).toBeTruthy()
    await batchButton!.trigger('click')

    expect(wrapper.emitted('decide')).toHaveLength(1)
    expect(wrapper.emitted('decide')?.[0]?.[0]).toEqual([
      expect.objectContaining({
        suggestion: expect.objectContaining({ id: 301 }),
        decision: 'ACCEPTED'
      }),
      expect.objectContaining({
        suggestion: expect.objectContaining({ id: 302 }),
        decision: 'ACCEPTED'
      })
    ])
  })

  it('shows the mandatory weak-adjustment review notice for low confidence or fallback', () => {
    const wrapper = mount(ReviewPlanSuggestionPanel, {
      props: {
        data: suggestionList([{
          id: 301,
          title: '轻量练习',
          decisionStatus: 'PENDING',
          decisionVersion: 1,
          confidenceLevel: 'LOW',
          fallback: true,
          actionable: true
        }])
      },
      global: {
        directives: { loading: {} },
        stubs
      }
    })

    expect(wrapper.text()).toContain('弱调整，需人工复核')
    expect(wrapper.text()).toContain('规则降级')
  })
})
