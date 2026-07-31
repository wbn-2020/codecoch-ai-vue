import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'

const api = vi.hoisted(() => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  exportCsv: vi.fn(),
  exportIcs: vi.fn(),
  getEvents: vi.fn(),
  updateEvent: vi.fn()
}))

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

vi.mock('@/composables/useCalendarTimezone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/useCalendarTimezone')>()
  return {
    ...actual,
    useCalendarTimezone: () => ({ timezone: 'Asia/Shanghai' })
  }
})

import CareerCalendarPanel from '@/views/application/components/CareerCalendarPanel.vue'

const interviewEvent = {
  id: 9,
  title: '技术面试',
  eventType: 'TECHNICAL_INTERVIEW',
  startsAt: '2026-07-20T10:00:00',
  endsAt: '2026-07-20T11:00:00',
  timezone: 'Asia/Shanghai',
  allDay: false,
  preparationStatus: 'READY'
}

const CareerCalendarGridStub = defineComponent({
  name: 'CareerCalendarGrid',
  props: {
    events: {
      type: Array,
      default: () => []
    },
    timezone: {
      type: String,
      default: ''
    }
  },
  emits: ['prepare', 'export'],
  template: `
    <div data-testid="embedded-calendar-grid" :data-timezone="timezone">
      <button
        v-if="events.length"
        data-testid="embedded-prepare-trigger"
        @click="$emit('prepare', events[0])"
      >
        准备
      </button>
      <button data-testid="embedded-ics-trigger" @click="$emit('export', 'ics')">
        导出 ICS
      </button>
    </div>
  `
})

const CareerInterviewPreparationDialogStub = defineComponent({
  name: 'CareerInterviewPreparationDialog',
  props: {
    visible: Boolean,
    event: {
      type: Object,
      default: undefined
    }
  },
  emits: ['generated'],
  template: `
    <div v-if="visible" data-testid="embedded-preparation-dialog">
      <span>{{ event && event.id }}</span>
      <button data-testid="embedded-preparation-generated" @click="$emit('generated', {})">
        已生成
      </button>
    </div>
  `
})

const globalOptions = {
  stubs: {
    CareerCalendarGrid: CareerCalendarGridStub,
    CareerEventDialog: true,
    CareerImportDialog: true,
    CareerInterviewPreparationDialog: CareerInterviewPreparationDialogStub
  }
}

describe('CareerCalendarPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getEvents.mockResolvedValue([interviewEvent])
    api.exportIcs.mockResolvedValue(new Blob(['BEGIN:VCALENDAR']))
    vi.spyOn(ElMessage, 'success').mockImplementation(() => undefined as never)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads the visible month with ISO 8601 Instant query bounds', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))

    mount(CareerCalendarPanel, {
      props: { applications: [] },
      global: globalOptions
    })
    await flushPromises()

    const range = api.getEvents.mock.calls[0]?.[0]
    expect(range).toBeDefined()
    expect(range?.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(range?.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(range.from).toISOString()).toBe(range.from)
    expect(new Date(range.to).toISOString()).toBe(range.to)
    expect(new Date(range.to).getTime() - new Date(range.from).getTime())
      .toBe(31 * 24 * 60 * 60 * 1000)
  })

  it('opens the shared preparation dialog from the embedded grid and refreshes after generation', async () => {
    const wrapper = mount(CareerCalendarPanel, {
      props: { applications: [] },
      global: globalOptions
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="embedded-calendar-grid"]').attributes('data-timezone'))
      .toBe('Asia/Shanghai')
    await wrapper.get('[data-testid="embedded-prepare-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="embedded-preparation-dialog"]').text()).toContain('9')
    await wrapper.get('[data-testid="embedded-preparation-generated"]').trigger('click')
    await flushPromises()

    expect(api.getEvents).toHaveBeenCalledTimes(2)
  })

  it('keeps ICS export on the shared browser timezone path', async () => {
    const wrapper = mount(CareerCalendarPanel, {
      props: { applications: [] },
      global: globalOptions
    })
    await flushPromises()

    await wrapper.get('[data-testid="embedded-ics-trigger"]').trigger('click')
    await flushPromises()

    expect(api.exportIcs).toHaveBeenCalledWith(
      'Asia/Shanghai',
      expect.objectContaining({
        from: expect.any(String),
        to: expect.any(String)
      })
    )
  })
})
