import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CareerExperimentPanel from '@/views/job-experiment/components/CareerExperimentPanel.vue'
import {
  getCareerAssignmentsApi,
  getCareerCohortsApi,
  getCareerHypothesisByLegacyExperimentApi
} from '@/api/careerGrowth'
import { getApplicationsApi } from '@/api/v4'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/api/careerGrowth', () => ({
  assignCareerApplicationApi: vi.fn(),
  calculateCareerAttributionApi: vi.fn(),
  createCareerCohortApi: vi.fn(),
  getCareerAssignmentsApi: vi.fn(),
  getCareerCohortsApi: vi.fn(),
  getCareerHypothesisApi: vi.fn(),
  getCareerHypothesisByLegacyExperimentApi: vi.fn(),
  getLatestCareerAttributionApi: vi.fn()
}))

vi.mock('@/api/v4', () => ({
  getApplicationsApi: vi.fn()
}))

const stubs = {
  'el-alert': true,
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  },
  'el-date-picker': true,
  'el-dialog': {
    template: '<div><slot /><slot name="footer" /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-input': true,
  'el-input-number': true,
  'el-option': {
    props: ['label', 'value'],
    template: '<option :value="value">{{ label }}</option>'
  },
  'el-select': {
    template: '<select><slot /></select>'
  },
  'el-table': true,
  'el-table-column': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('CareerExperimentPanel attribution metrics', () => {
  beforeEach(() => {
    vi.mocked(getCareerHypothesisByLegacyExperimentApi).mockResolvedValue({
      id: 21,
      legacyExperimentId: 7,
      name: 'Evidence experiment',
      statement: 'Evidence changes positive response rate',
      primaryMetric: 'POSITIVE_RESPONSE',
      attributionWindowDays: 14,
      minSamplePerVariant: 10,
      variants: [],
      cohorts: []
    })
    vi.mocked(getCareerAssignmentsApi).mockResolvedValue([])
    vi.mocked(getCareerCohortsApi).mockResolvedValue([])
    vi.mocked(getApplicationsApi).mockResolvedValue([])
  })

  it('offers exactly the backend-supported attribution outcome types', async () => {
    const wrapper = mount(CareerExperimentPanel, {
      props: {
        legacyExperimentId: 7
      },
      global: {
        stubs
      }
    })
    await flushPromises()

    const outcomeValues = wrapper.findAll('option')
      .map((option) => option.attributes('value'))
      .filter((value): value is string => Boolean(value))

    expect(outcomeValues).toEqual([
      'POSITIVE_RESPONSE',
      'INTERVIEW',
      'OFFER'
    ])
  })
})
