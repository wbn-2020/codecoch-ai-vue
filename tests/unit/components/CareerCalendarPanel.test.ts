import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CareerCalendarPanel from '@/views/application/components/CareerCalendarPanel.vue'
import {
  downloadCareerImportErrorsApi,
  getCareerCalendarEventsApi,
  importCareerCsvApi,
  previewCareerCsvImportApi
} from '@/api/careerGrowth'

vi.mock('@/api/careerGrowth', () => ({
  createCareerCalendarEventApi: vi.fn(),
  deleteCareerCalendarEventApi: vi.fn(),
  downloadCareerImportErrorsApi: vi.fn(),
  exportCareerCalendarCsvApi: vi.fn(),
  exportCareerCalendarIcsApi: vi.fn(),
  getCareerCalendarEventsApi: vi.fn(),
  importCareerCsvApi: vi.fn(),
  importCareerIcsApi: vi.fn(),
  previewCareerCsvImportApi: vi.fn(),
  previewCareerIcsImportApi: vi.fn(),
  updateCareerCalendarEventApi: vi.fn()
}))

const stubs = {
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  'el-dropdown': true,
  'el-form': true,
  'el-form-item': true,
  'el-input': true,
  'el-option': true,
  'el-segmented': true,
  'el-select': {
    props: ['modelValue'],
    template: '<select><slot /></select>'
  },
  'el-switch': true,
  'el-table': {
    template: '<div><slot /></div>'
  },
  'el-table-column': {
    template: '<div><slot :row="{}" /></div>'
  }
}

describe('CareerCalendarPanel CSV import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCareerCalendarEventsApi).mockResolvedValue([])
    vi.mocked(previewCareerCsvImportApi).mockResolvedValue({
      format: 'CSV',
      timezone: 'Asia/Shanghai',
      headers: ['employer', 'role'],
      suggestedMapping: { company_name: 'employer', job_title: 'role' },
      supportedFields: ['company_name', 'job_title'],
      totalCount: 1,
      validCount: 1,
      errorCount: 0,
      duplicateCount: 0,
      rows: []
    })
    vi.mocked(importCareerCsvApi).mockResolvedValue({
      batchId: 30,
      format: 'CSV',
      status: 'PARTIAL',
      totalCount: 1,
      successCount: 0,
      errorCount: 1,
      duplicateCount: 0,
      rows: []
    })
    vi.mocked(downloadCareerImportErrorsApi).mockResolvedValue(new Blob(['error']))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the visible month with ISO 8601 Instant query bounds', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))

    mount(CareerCalendarPanel, {
      props: { applications: [] },
      global: {
        directives: { loading: {} },
        stubs
      }
    })
    await flushPromises()

    const range = vi.mocked(getCareerCalendarEventsApi).mock.calls[0]?.[0]
    expect(range).toBeDefined()
    expect(range?.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(range?.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(range!.from!).toISOString()).toBe(range?.from)
    expect(new Date(range!.to!).toISOString()).toBe(range?.to)
    expect(new Date(range!.to!).getTime() - new Date(range!.from!).getTime())
      .toBe(31 * 24 * 60 * 60 * 1000)
  })

  it('uses preview suggestions for import and exposes error CSV download', async () => {
    const wrapper = mount(CareerCalendarPanel, {
      props: { applications: [] },
      global: {
        directives: { loading: {} },
        stubs
      }
    })
    await flushPromises()

    await wrapper.get('[data-testid="open-career-import"]').trigger('click')
    const input = wrapper.get('input[type="file"]')
    const file = new File(['employer,role\nAcme,Engineer'], 'applications.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="career-csv-mapping"]').exists()).toBe(true)

    await wrapper.get('[data-testid="commit-career-import"]').trigger('click')
    await flushPromises()
    expect(importCareerCsvApi).toHaveBeenCalledWith(
      file,
      expect.any(String),
      'SKIP',
      { company_name: 'employer', job_title: 'role' }
    )

    await wrapper.get('[data-testid="download-career-import-errors"]').trigger('click')
    await flushPromises()
    expect(downloadCareerImportErrorsApi).toHaveBeenCalledWith(30)
  })
})
