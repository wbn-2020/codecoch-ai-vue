import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ApplicationEventReviewDialog from '@/views/application/components/ApplicationEventReviewDialog.vue'

const ElInputStub = defineComponent({
  name: 'ElInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    readonly: Boolean
  },
  template: `
    <textarea
      v-bind="$attrs"
      :value="modelValue"
      :readonly="readonly"
      :data-readonly="String(readonly)"
    />
  `
})

const stubs = {
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  'el-alert': {
    props: ['title'],
    template: '<div data-testid="review-regenerate-alert">{{ title }}</div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    props: ['label'],
    template: '<label>{{ label }}<slot /></label>'
  },
  'el-input': ElInputStub,
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

describe('ApplicationEventReviewDialog', () => {
  it('keeps all persisted user input read-only during forced regeneration', () => {
    const wrapper = mount(ApplicationEventReviewDialog, {
      props: {
        visible: true,
        force: true,
        saving: false,
        observedFactsText: '收到明确拒信\n未收到原因说明',
        externalFeedback: '招聘方仅确认流程结束。',
        selfReflection: '下一轮只调整一个变量。'
      },
      global: { stubs }
    })

    const readonlyRegion = wrapper.get('[data-testid="application-review-readonly-user-input"]')
    const inputs = readonlyRegion.findAll('textarea')

    expect(inputs).toHaveLength(3)
    expect(inputs.every((input) => input.attributes('data-readonly') === 'true')).toBe(true)
    expect(wrapper.get('[data-testid="application-review-readonly-observed-facts"]').element)
      .toHaveProperty('value', '收到明确拒信\n未收到原因说明')
    expect(wrapper.get('[data-testid="application-review-readonly-external-feedback"]').element)
      .toHaveProperty('value', '招聘方仅确认流程结束。')
    expect(wrapper.get('[data-testid="application-review-readonly-self-reflection"]').element)
      .toHaveProperty('value', '下一轮只调整一个变量。')
    expect(wrapper.get('[data-testid="review-regenerate-alert"]').text())
      .toContain('原样保留且不可修改')
    expect(wrapper.emitted('update:observedFactsText')).toBeUndefined()
    expect(wrapper.emitted('update:externalFeedback')).toBeUndefined()
    expect(wrapper.emitted('update:selfReflection')).toBeUndefined()
  })
})
