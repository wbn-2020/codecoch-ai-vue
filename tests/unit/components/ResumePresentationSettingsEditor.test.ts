import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createDefaultResumePresentation } from '@/features/resume-presentation'
import ResumePresentationSettingsEditor from '@/views/resume/components/editors/ResumePresentationSettingsEditor.vue'

const createWrapper = () => mount(ResumePresentationSettingsEditor, {
  props: {
    modelValue: createDefaultResumePresentation()
  },
  global: {
    stubs: {
      'el-form-item': {
        props: ['label'],
        template: '<label><span>{{ label }}</span><slot /></label>'
      },
      'el-select': {
        props: ['modelValue', 'disabled'],
        template: '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
      },
      'el-option': {
        props: ['label', 'value'],
        template: '<option :value="value">{{ label }}</option>'
      },
      'el-input-number': {
        props: ['modelValue', 'disabled'],
        template: '<input type="number" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
      },
      'el-checkbox': {
        props: ['modelValue', 'disabled'],
        template: '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>'
      },
      'el-tag': {
        template: '<span><slot /></span>'
      },
      'el-tooltip': {
        template: '<span><slot /></span>'
      },
      'el-button': {
        inheritAttrs: false,
        props: ['disabled'],
        template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
      }
    }
  }
})

describe('ResumePresentationSettingsEditor', () => {
  it('renders all V1 presentation controls', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('简历展示设置')
    expect(wrapper.text()).toContain('模板版本')
    expect(wrapper.text()).toContain('由已注册模板决定')
    expect(wrapper.find('input[aria-label="模板版本号"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('强调色')
    expect(wrapper.text()).toContain('字号缩放')
    expect(wrapper.text()).toContain('行高')
    expect(wrapper.text()).toContain('区块间距')
    expect(wrapper.text()).toContain('页边距（pt）')
    expect(wrapper.text()).toContain('区块顺序与显示')
    expect(wrapper.findAll('.section-list__item')).toHaveLength(5)
    expect(wrapper.findAll('.section-list__item input[type="checkbox"]')).toHaveLength(5)
  })

  it('uses the highest active registered template version as the read-only value', async () => {
    const wrapper = mount(ResumePresentationSettingsEditor, {
      props: {
        modelValue: createDefaultResumePresentation('ATS_COMPACT', 1),
        templateRegistry: [
          { templateCode: 'ATS_COMPACT', templateVersion: 2, templateName: 'Compact v2', status: 'ACTIVE' },
          { templateCode: 'ATS_COMPACT', templateVersion: 4, templateName: 'Compact v4', status: 'ACTIVE' },
          { templateCode: 'ATS_COMPACT', templateVersion: 8, templateName: 'Disabled', status: 'DISABLED' }
        ]
      },
      global: {
        stubs: {
          'el-form-item': {
            props: ['label'],
            template: '<label><span>{{ label }}</span><slot /></label>'
          },
          'el-select': {
            props: ['modelValue'],
            template: '<select :value="modelValue"><slot /></select>'
          },
          'el-option': {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>'
          },
          'el-input-number': true,
          'el-checkbox': true,
          'el-tag': true,
          'el-tooltip': true,
          'el-button': true
        }
      }
    })

    expect(wrapper.find('[aria-label="当前模板版本"]').text()).toContain('v4')
    expect(wrapper.find('[aria-label="当前模板版本"]').text()).not.toContain('v8')
    await wrapper.setProps({
      modelValue: createDefaultResumePresentation('ATS_COMPACT', 99)
    })
    expect(wrapper.find('[aria-label="当前模板版本"]').text()).toContain('v4')
  })

  it('emits normalized field updates without mutating the input config', async () => {
    const initial = createDefaultResumePresentation()
    const wrapper = mount(ResumePresentationSettingsEditor, {
      props: { modelValue: initial },
      global: {
        stubs: {
          'el-form-item': {
            props: ['label'],
            template: '<label><span>{{ label }}</span><slot /></label>'
          },
          'el-select': {
            props: ['modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
          },
          'el-option': {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>'
          },
          'el-input-number': {
            props: ['modelValue'],
            template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
          },
          'el-checkbox': true,
          'el-tag': true,
          'el-tooltip': {
            template: '<span><slot /></span>'
          },
          'el-button': {
            inheritAttrs: false,
            props: ['disabled'],
            template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
          }
        }
      }
    })

    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue('1.18')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0]).toMatchObject({
      fontScale: 1.18,
      overrides: { fontScale: true }
    })
    expect(initial.fontScale).toBe(1)
    expect(wrapper.emitted('change')?.[0]?.[1]).toBe('fontScale')
  })

  it('reorders sections and toggles hiddenSections through the public contract', async () => {
    const wrapper = createWrapper()

    const downButtons = wrapper.findAll('.section-list__actions button[aria-label^="下移"]')
    await downButtons[0].trigger('click')

    let updated = wrapper.emitted('update:modelValue')?.[0]?.[0] as ReturnType<typeof createDefaultResumePresentation>
    expect(updated.sectionOrder.slice(0, 2)).toEqual(['experience', 'summary'])
    expect(updated.overrides?.sectionOrder).toBe(true)

    await wrapper.setProps({ modelValue: updated })
    const firstCheckbox = wrapper.find('.section-list__item input[type="checkbox"]')
    await firstCheckbox.setChecked(false)

    updated = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as ReturnType<typeof createDefaultResumePresentation>
    expect(updated.hiddenSections).toContain('experience')
    expect(updated.overrides?.hiddenSections).toBe(true)
    expect(wrapper.emitted('change')?.at(-1)?.[1]).toBe('hiddenSections')
  })
})
