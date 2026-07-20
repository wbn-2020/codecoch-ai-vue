import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  exportCsv: vi.fn(),
  exportIcs: vi.fn(),
  getApplications: vi.fn(),
  getEvents: vi.fn(),
  updateEvent: vi.fn()
}))

const elMessage = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

const confirmDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/careerGrowth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/careerGrowth')>()
  return {
    ...actual,
    createCareerCalendarEventApi: api.createEvent,
    deleteCareerCalendarEventApi: api.deleteEvent,
    exportCareerCalendarCsvApi: api.exportCsv,
    exportCareerCalendarIcsApi: api.exportIcs,
    getCareerCalendarEventsApi: api.getEvents,
    updateCareerCalendarEventApi: api.updateEvent
  }
})

vi.mock('@/api/v4', () => ({
  getApplicationsApi: api.getApplications
}))

vi.mock('@/composables/useCalendarTimezone', () => ({
  useCalendarTimezone: () => ({ timezone: 'Asia/Shanghai' })
}))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
  ElMessageBox: {
    confirm: confirmDelete
  }
}))

import CareerCalendarView from '@/views/v4/career-calendar/CareerCalendarView.vue'

const existingEvent = {
  id: 9,
  title: '技术面试',
  eventType: 'TECHNICAL_INTERVIEW',
  startsAt: '2026-07-20T10:00:00',
  endsAt: '2026-07-20T11:00:00',
  timezone: 'Asia/Shanghai',
  allDay: false,
  status: 'CONFIRMED'
}

const CareerCalendarGridStub = defineComponent({
  name: 'CareerCalendarGrid',
  props: {
    events: {
      type: Array,
      default: () => []
    }
  },
  emits: ['create', 'edit', 'export'],
  template: `
    <div>
      <button data-testid="create-event" @click="$emit('create', new Date('2026-07-21T00:00:00'))">
        新建
      </button>
      <button
        v-if="events.length"
        data-testid="edit-event"
        @click="$emit('edit', events[0])"
      >
        编辑
      </button>
      <button data-testid="export-csv" @click="$emit('export', 'csv')">导出 CSV</button>
      <button data-testid="export-ics" @click="$emit('export', 'ics')">导出 ICS</button>
    </div>
  `
})

const CareerEventDialogStub = defineComponent({
  name: 'CareerEventDialog',
  props: {
    visible: Boolean,
    form: {
      type: Object,
      required: true
    },
    editingEventId: Number
  },
  emits: ['save', 'delete'],
  template: `
    <div v-if="visible" data-testid="event-dialog">
      <span data-testid="event-dialog-title">{{ form.title }}</span>
      <button data-testid="save-event" @click="$emit('save')">保存</button>
      <button v-if="editingEventId" data-testid="delete-event" @click="$emit('delete')">删除</button>
    </div>
  `
})

const globalOptions = {
  stubs: {
    'el-tabs': {
      template: '<div><slot /></div>'
    },
    'el-tab-pane': {
      template: '<div><slot /></div>'
    },
    CareerCalendarGrid: CareerCalendarGridStub,
    CareerEventDialog: CareerEventDialogStub,
    CareerImportPanel: true,
    CareerInterviewPreparationDialog: true
  }
}

const mountView = async () => {
  const wrapper = mount(CareerCalendarView, {
    global: globalOptions
  })
  await flushPromises()
  return wrapper
}

describe('CareerCalendarView local operation errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getEvents.mockResolvedValue([existingEvent])
    api.getApplications.mockResolvedValue([])
    confirmDelete.mockResolvedValue(undefined)
  })

  it('keeps the create dialog and form open when creation is rejected', async () => {
    api.createEvent.mockRejectedValue(new Error('AxiosError'))
    const wrapper = await mountView()

    await wrapper.get('[data-testid="create-event"]').trigger('click')
    const dialog = wrapper.findComponent(CareerEventDialogStub)
    const form = dialog.props('form') as typeof existingEvent
    form.title = '电话沟通'
    await nextTick()
    await wrapper.get('[data-testid="save-event"]').trigger('click')
    await flushPromises()

    expect(api.createEvent).toHaveBeenCalled()
    expect(wrapper.get('[data-testid="event-dialog"]').text()).toContain('电话沟通')
    expect(elMessage.error).toHaveBeenCalledWith('日历事件创建失败，请稍后重试。')
  })

  it('keeps the edit dialog and form open when update or delete is rejected', async () => {
    api.updateEvent.mockRejectedValue(new Error('AxiosError'))
    api.deleteEvent.mockRejectedValue(new Error('AxiosError'))
    const wrapper = await mountView()

    await wrapper.get('[data-testid="edit-event"]').trigger('click')
    await wrapper.get('[data-testid="save-event"]').trigger('click')
    await flushPromises()

    expect(api.updateEvent).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ title: '技术面试' })
    )
    expect(wrapper.find('[data-testid="event-dialog"]').exists()).toBe(true)
    expect(elMessage.error).toHaveBeenCalledWith('日历事件更新失败，请稍后重试。')

    await wrapper.get('[data-testid="delete-event"]').trigger('click')
    await flushPromises()

    expect(api.deleteEvent).toHaveBeenCalledWith(9)
    expect(wrapper.find('[data-testid="event-dialog"]').exists()).toBe(true)
    expect(elMessage.error).toHaveBeenCalledWith('日历事件删除失败，请稍后重试。')
  })

  it.each([
    ['csv', 'export-csv', 'exportCsv'],
    ['ics', 'export-ics', 'exportIcs']
  ] as const)('consumes a rejected %s export locally', async (_format, testId, apiKey) => {
    api[apiKey].mockRejectedValue(new Error('AxiosError'))
    const wrapper = await mountView()

    await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
    await flushPromises()

    expect(api[apiKey]).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="create-event"]').exists()).toBe(true)
    expect(elMessage.error).toHaveBeenCalledWith('日历导出失败，请稍后重试。')
  })
})
