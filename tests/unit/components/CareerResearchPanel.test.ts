import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createSource: vi.fn(),
  addVersion: vi.fn(),
  deactivate: vi.fn(),
  generate: vi.fn()
}))

const keyFactory = vi.hoisted(() => ({ create: vi.fn(() => 'random-key') }))

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  createResearchSourceV7Api: api.createSource,
  addResearchSourceVersionV7Api: api.addVersion,
  deactivateResearchSourceV7Api: api.deactivate,
  generateResearchSnapshotV7Api: api.generate
}))

vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: keyFactory.create
}))

vi.mock('@/utils/error', () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: ui.success, error: ui.error },
  ElMessageBox: { confirm: ui.confirm }
}))

import CareerResearchPanel from '@/components/v7/career-research/CareerResearchPanel.vue'
import type { CareerResearchSourceVO } from '@/types/v7/career'

const stubs = {
  'el-alert': true,
  'el-button': { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled', 'loading', 'type', 'link'] },
  'el-dialog': {
    template: '<div v-if="modelValue" class="stub-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width']
  },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option><slot /></option>', props: ['label', 'value'] }
}

const sampleSources: CareerResearchSourceVO[] = [
  { id: 3, title: 'Acme JD', sourceType: 'JOB_DESCRIPTION', active: true }
]

const mountPanel = (props: Record<string, unknown> = {}) =>
  mount(CareerResearchPanel, {
    props: { applicationId: 7, sources: sampleSources, ...props },
    global: { stubs }
  })

const clickButtonByText = async (wrapper: ReturnType<typeof mount>, label: string) => {
  const trigger = wrapper.findAll('button').find((button) => button.text().includes(label))
  if (!trigger) throw new Error(`Button not found: ${label}`)
  await trigger.trigger('click')
  await flushPromises()
  return trigger
}

describe('CareerResearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.createSource.mockResolvedValue({ id: 9 })
    api.addVersion.mockResolvedValue({ id: 91 })
    api.deactivate.mockResolvedValue(undefined)
    api.generate.mockResolvedValue({ id: 100 })
    ui.confirm.mockResolvedValue('confirm')
  })

  it('creates a research source and emits refresh', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '新增调研来源')
    ;(wrapper.vm as unknown as { sourceForm: { title: string; content: string } }).sourceForm.title = 'Acme JD'
    ;(wrapper.vm as unknown as { sourceForm: { title: string; content: string } }).sourceForm.content = '岗位职责...'
    await flushPromises()
    await clickButtonByText(wrapper, '保存来源')

    expect(api.createSource).toHaveBeenCalledTimes(1)
    expect(api.createSource.mock.calls[0][0]).toBe(7)
    expect(api.createSource.mock.calls[0][1]).toMatchObject({ sourceType: 'JOB_DESCRIPTION', title: 'Acme JD' })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('requires explicit confirmation before deactivating a source', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '停用')

    expect(ui.confirm).toHaveBeenCalled()
    expect(api.deactivate).toHaveBeenCalledWith(3)
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('generates a snapshot with a body idempotency key', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '生成调研快照')

    expect(api.generate).toHaveBeenCalledTimes(1)
    expect(api.generate.mock.calls[0][0]).toBe(7)
    expect(api.generate.mock.calls[0][1]).toMatchObject({ idempotencyKey: 'random-key' })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
