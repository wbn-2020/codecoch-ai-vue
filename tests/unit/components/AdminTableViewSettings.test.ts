import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AdminTableViewSettings from '@/components/admin/AdminTableViewSettings.vue'

const mountSettings = () => mount(AdminTableViewSettings, {
  props: {
    size: 'default',
    sizeOptions: [
      { label: '标准', value: 'default' },
      { label: '紧凑', value: 'small' }
    ],
    columns: [
      { key: 'name', label: '名称', required: true },
      { key: 'status', label: '状态' }
    ],
    visibleColumns: {
      name: true,
      status: false
    },
    ariaLabel: '测试表格视图设置'
  },
  global: {
    stubs: {
      ElPopover: {
        template: '<div><slot name="reference" /><div class="popover-content"><slot /></div></div>'
      },
      ElButton: {
        emits: ['click'],
        template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
      },
      ElSegmented: {
        props: ['modelValue', 'options', 'ariaLabel'],
        emits: ['update:modelValue'],
        template: '<button class="segmented-stub" type="button" @click="$emit(\'update:modelValue\', \'small\')">{{ modelValue }}</button>'
      },
      ElCheckbox: {
        props: ['modelValue', 'disabled'],
        emits: ['change'],
        template: '<label><input class="checkbox-stub" type="checkbox" :disabled="disabled" @change="$emit(\'change\', !modelValue)" /><slot /></label>'
      },
      Settings2: true,
      RotateCcw: true
    }
  }
})

describe('AdminTableViewSettings', () => {
  it('groups density, column visibility, and reset into one view settings control', async () => {
    const wrapper = mountSettings()

    expect(wrapper.get('[aria-label="测试表格视图设置"]').text()).toContain('视图设置')
    expect(wrapper.text()).toContain('表格密度')
    expect(wrapper.text()).toContain('显示列')
    expect(wrapper.text()).toContain('恢复默认视图')

    await wrapper.get('.segmented-stub').trigger('click')
    expect(wrapper.emitted('update:size')).toEqual([['small']])

    const checkboxes = wrapper.findAll('.checkbox-stub')
    expect(checkboxes[0].attributes('disabled')).toBeDefined()
    await checkboxes[1].trigger('change')
    expect(wrapper.emitted('update:column-visible')).toEqual([[{ key: 'status', visible: true }]])

    const resetButton = wrapper.findAll('button').find((button) => button.text().includes('恢复默认视图'))
    await resetButton?.trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })
})
