import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  createActivity: vi.fn()
}))

const keyFactory = vi.hoisted(() => ({ create: vi.fn(() => 'random-key') }))

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  createContactV7Api: api.createContact,
  updateContactV7Api: api.updateContact,
  deleteContactV7Api: api.deleteContact,
  createActivityV7Api: api.createActivity
}))

vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: keyFactory.create
}))

vi.mock('@/utils/error', () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: ui.success,
    error: ui.error
  },
  ElMessageBox: {
    confirm: ui.confirm
  }
}))

import CareerContactPanel from '@/components/v7/career-contact/CareerContactPanel.vue'
import type { CareerActivityVO, CareerContactVO } from '@/types/v7/career'

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

const sampleContacts: CareerContactVO[] = [
  { id: 3, displayName: '招聘经理', roleType: 'RECRUITER', channelType: 'EMAIL' }
]
const sampleActivities: CareerActivityVO[] = []

const mountPanel = (props: Record<string, unknown> = {}) =>
  mount(CareerContactPanel, {
    props: {
      applicationId: 7,
      contacts: sampleContacts,
      activities: sampleActivities,
      ...props
    },
    global: { stubs }
  })

const clickButtonByText = async (wrapper: ReturnType<typeof mount>, label: string) => {
  const trigger = wrapper.findAll('button').find((button) => button.text().includes(label))
  if (!trigger) throw new Error(`Button not found: ${label}`)
  await trigger.trigger('click')
  await flushPromises()
  return trigger
}

describe('CareerContactPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.createContact.mockResolvedValue({ id: 4, displayName: '新联系人' })
    api.updateContact.mockResolvedValue({ id: 3, displayName: '招聘经理' })
    api.deleteContact.mockResolvedValue(undefined)
    api.createActivity.mockResolvedValue({ id: 9, activityType: 'EMAIL' })
    ui.confirm.mockResolvedValue('confirm')
  })

  it('creates a contact without an idempotency key and emits refresh', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '新增联系人')
    ;(wrapper.vm as unknown as { contactForm: { displayName: string } }).contactForm.displayName = '新联系人'
    await flushPromises()
    await clickButtonByText(wrapper, '保存联系人')

    expect(api.createContact).toHaveBeenCalledTimes(1)
    const [applicationId, body] = api.createContact.mock.calls[0]
    expect(applicationId).toBe(7)
    expect(body).toMatchObject({ displayName: '新联系人' })
    // Contact writes carry no idempotency key.
    expect(body).not.toHaveProperty('idempotencyKey')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('records an activity with a body idempotency key and emits refresh', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '记录活动')
    ;(wrapper.vm as unknown as {
      activityForm: { activityType: string; subject: string; summary: string }
    }).activityForm.activityType = 'EMAIL'
    ;(wrapper.vm as unknown as {
      activityForm: { activityType: string; subject: string; summary: string }
    }).activityForm.subject = '跟进邮件'
    ;(wrapper.vm as unknown as {
      activityForm: { activityType: string; subject: string; summary: string }
    }).activityForm.summary = '发送了跟进邮件'
    await flushPromises()
    await clickButtonByText(wrapper, '保存活动')

    expect(api.createActivity).toHaveBeenCalledTimes(1)
    const [applicationId, body] = api.createActivity.mock.calls[0]
    expect(applicationId).toBe(7)
    expect(body).toMatchObject({
      activityType: 'EMAIL',
      subject: '跟进邮件',
      summary: '发送了跟进邮件',
      idempotencyKey: 'random-key'
    })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('requires confirmation before deleting a contact', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '删除')

    expect(ui.confirm).toHaveBeenCalled()
    expect(api.deleteContact).toHaveBeenCalledWith(3)
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
