import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentMemoryVO } from '@/types/agent'
import AgentMemoryView from '@/views/v4/AgentMemoryView.vue'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  confirm: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  remove: vi.fn(),
  impact: vi.fn()
}))

const messageMocks = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}))

const confirmDangerMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/agent', () => ({
  getAgentMemoriesApi: apiMocks.get,
  createAgentMemoryApi: apiMocks.create,
  confirmAgentMemoryApi: apiMocks.confirm,
  enableAgentMemoryApi: apiMocks.enable,
  disableAgentMemoryApi: apiMocks.disable,
  deleteAgentMemoryApi: apiMocks.remove,
  getAgentMemoryImpactPreviewApi: apiMocks.impact
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: confirmDangerMock
}))

vi.mock('element-plus', () => ({
  ElMessage: messageMocks
}))

const existingMemory: AgentMemoryVO = {
  id: 1,
  memoryType: 'USER_NOTE',
  content: '偏好后端研发岗位',
  sourceType: 'MANUAL',
  confidence: 0.9,
  enabled: 1,
  memoryStatus: 'ACTIVE',
  confirmedAt: '2026-08-16T10:00:00',
  canEnterAgentContext: true
}

const createdMemory: AgentMemoryVO = {
  id: 2,
  memoryType: 'SKILL_GAP',
  content: '需要持续补强系统设计表达',
  sourceType: 'MANUAL',
  confidence: 0.9,
  enabled: 1,
  memoryStatus: 'ACTIVE',
  confirmedAt: '2026-08-17T10:00:00',
  canEnterAgentContext: true
}

const page = (records: AgentMemoryVO[]) => ({
  records,
  total: records.length,
  pageNo: 1,
  pageSize: 50
})

const stubs = {
  AppState: {
    template: '<div><slot /></div>'
  },
  'el-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': {
    template: '<span><slot /></span>'
  },
  'el-icon': {
    template: '<span><slot /></span>'
  },
  'el-radio-group': {
    template: '<div><slot /></div>'
  },
  'el-radio-button': {
    template: '<button><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog-stub"><slot /><slot name="footer" /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-select': {
    template: '<select><slot /></select>'
  },
  'el-option': {
    template: '<option />'
  },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}

const findButton = (wrapper: ReturnType<typeof mount>, text: string) => {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text))
  if (!button) throw new Error(`button not found: ${text}`)
  return button
}

describe('AgentMemoryView authoritative mutation refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDangerMock.mockResolvedValue(true)
    apiMocks.get.mockResolvedValue(page([existingMemory]))
  })

  it('keeps the authoritative create response visible when verification refresh fails and supports retry', async () => {
    let resolveCreate: ((value: AgentMemoryVO) => void) | undefined
    apiMocks.create.mockImplementation(() => new Promise<AgentMemoryVO>((resolve) => {
      resolveCreate = resolve
    }))
    apiMocks.get
      .mockResolvedValueOnce(page([existingMemory]))
      .mockResolvedValueOnce(page([existingMemory]))
      .mockResolvedValue(page([createdMemory, existingMemory]))

    const wrapper = mount(AgentMemoryView, {
      global: {
        stubs,
        directives: {
          loading: () => undefined
        }
      }
    })
    await flushPromises()

    await findButton(wrapper, '新增记忆').trigger('click')
    await wrapper.find('textarea').setValue(createdMemory.content)
    const saveButton = findButton(wrapper, '保存')
    await saveButton.trigger('click')
    await saveButton.trigger('click')

    expect(apiMocks.create).toHaveBeenCalledTimes(1)
    expect(findButton(wrapper, '保存').attributes('disabled')).toBeDefined()

    resolveCreate?.(createdMemory)
    await flushPromises()

    expect(wrapper.text()).toContain(createdMemory.content)
    expect(wrapper.text()).toContain('列表同步待确认')
    expect(wrapper.text()).toContain('当前保留服务端返回结果')
    expect(messageMocks.success).not.toHaveBeenCalledWith('记忆已保存并已同步')
    expect(messageMocks.warning).toHaveBeenCalled()

    await findButton(wrapper, '重试同步').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(createdMemory.content)
    expect(wrapper.text()).not.toContain('列表同步待确认')
    expect(messageMocks.success).toHaveBeenCalledWith('长期记忆列表已与服务端同步')

    wrapper.unmount()
  })
})
