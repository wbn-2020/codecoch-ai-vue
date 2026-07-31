import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createProcess: vi.fn(),
  createRound: vi.fn(),
  updateRound: vi.fn(),
  transition: vi.fn(),
  reschedule: vi.fn(),
  linkCalendar: vi.fn()
}))

const keyFactory = vi.hoisted(() => ({ create: vi.fn(() => 'random-key') }))

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  createInterviewProcessV7Api: api.createProcess,
  createInterviewRoundV7Api: api.createRound,
  updateInterviewRoundV7Api: api.updateRound,
  transitionInterviewRoundV7Api: api.transition,
  rescheduleInterviewRoundV7Api: api.reschedule,
  linkInterviewRoundCalendarV7Api: api.linkCalendar
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

import CareerInterviewPanel from '@/components/v7/career-interview/CareerInterviewPanel.vue'
import type { InterviewProcessVO } from '@/types/v7/career'

const stubs = {
  'el-alert': true,
  'el-button': { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'loading', 'type', 'link'] },
  'el-dialog': {
    template: '<div v-if="modelValue" class="stub-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width']
  },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-input-number': { template: '<input type="number" />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option><slot /></option>', props: ['label', 'value'] },
  'el-date-picker': { template: '<input type="date" />', props: ['modelValue'] }
}

const sampleProcess: InterviewProcessVO = {
  id: 3,
  applicationId: 7,
  status: 'ACTIVE',
  rounds: [
    {
      id: 8,
      processId: 3,
      roundNo: 1,
      roundType: 'TECHNICAL',
      title: '一面 · 技术',
      status: 'SCHEDULED',
      lockVersion: 1
    }
  ]
}

const mountPanel = (props: Record<string, unknown> = {}) =>
  mount(CareerInterviewPanel, {
    props: {
      applicationId: 7,
      process: sampleProcess,
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

describe('CareerInterviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.createProcess.mockResolvedValue({ id: 4, rounds: [] })
    api.createRound.mockResolvedValue({ id: 9 })
    api.updateRound.mockResolvedValue({ id: 8 })
    api.transition.mockResolvedValue({ id: 8, status: 'PREPARING' })
    api.reschedule.mockResolvedValue({ id: 8 })
    api.linkCalendar.mockResolvedValue({ id: 8 })
    ui.confirm.mockResolvedValue('confirm')
  })

  it('creates a process with a body idempotency key and emits refresh', async () => {
    const wrapper = mountPanel({ process: null })
    await clickButtonByText(wrapper, '创建真实面试流程')
    await clickButtonByText(wrapper, '创建流程')

    expect(api.createProcess).toHaveBeenCalledTimes(1)
    const [applicationId, body] = api.createProcess.mock.calls[0]
    expect(applicationId).toBe(7)
    expect(body).toMatchObject({ idempotencyKey: 'random-key' })
    expect(ui.success).toHaveBeenCalled()
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('adds a round for the existing process and emits refresh', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '添加面试轮次')
    ;(wrapper.vm as unknown as { roundForm: { roundType: string; title: string } }).roundForm.title = '二面'
    await flushPromises()
    await clickButtonByText(wrapper, '保存轮次')

    expect(api.createRound).toHaveBeenCalledTimes(1)
    expect(api.createRound.mock.calls[0][0]).toBe(3)
    expect(api.createRound.mock.calls[0][1]).toMatchObject({ idempotencyKey: 'random-key' })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('transitions a round status through the body-key endpoint', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '状态变更')
    await clickButtonByText(wrapper, '确认变更')

    expect(api.transition).toHaveBeenCalledTimes(1)
    const [roundId, body] = api.transition.mock.calls[0]
    expect(roundId).toBe(8)
    expect(body).toMatchObject({ expectedLockVersion: 1, idempotencyKey: 'random-key' })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('reschedules a round and links a calendar event', async () => {
    const wrapper = mountPanel()

    await clickButtonByText(wrapper, '改期')
    ;(wrapper.vm as unknown as {
      rescheduleForm: { scheduledStartsAt: string; scheduledEndsAt: string; timezone: string }
    }).rescheduleForm.scheduledStartsAt = '2026-08-01T10:00:00'
    ;(wrapper.vm as unknown as {
      rescheduleForm: { scheduledStartsAt: string; scheduledEndsAt: string; timezone: string }
    }).rescheduleForm.scheduledEndsAt = '2026-08-01T11:00:00'
    ;(wrapper.vm as unknown as {
      rescheduleForm: { scheduledStartsAt: string; scheduledEndsAt: string; timezone: string }
    }).rescheduleForm.timezone = 'Asia/Shanghai'
    await flushPromises()
    await clickButtonByText(wrapper, '确认改期')

    expect(api.reschedule).toHaveBeenCalledTimes(1)
    expect(api.reschedule.mock.calls[0][0]).toBe(8)
    expect(api.reschedule.mock.calls[0][1]).toMatchObject({
      timezone: 'Asia/Shanghai',
      expectedLockVersion: 1,
      idempotencyKey: 'random-key'
    })

    await clickButtonByText(wrapper, '关联日历')
    ;(wrapper.vm as unknown as { linkForm: { calendarEventId: number | null } }).linkForm.calendarEventId = 55
    await flushPromises()
    await clickButtonByText(wrapper, '关联')

    expect(api.linkCalendar).toHaveBeenCalledTimes(1)
    expect(api.linkCalendar.mock.calls[0][0]).toBe(8)
    expect(api.linkCalendar.mock.calls[0][1]).toMatchObject({
      calendarEventId: 55,
      expectedLockVersion: 1,
      idempotencyKey: 'random-key'
    })
  })
})
