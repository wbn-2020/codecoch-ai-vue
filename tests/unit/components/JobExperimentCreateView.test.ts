import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assignCareerApplicationApi: vi.fn(),
  createCareerHypothesisApi: vi.fn(),
  createJobExperimentApi: vi.fn(),
  getApplicationsApi: vi.fn(),
  getCareerHypothesisApi: vi.fn(),
  getCareerHypothesisByLegacyExperimentApi: vi.fn(),
  getJobExperimentDetailApi: vi.fn(),
  getJobTargetsApi: vi.fn(),
  getResumesApi: vi.fn(),
  messageError: vi.fn(),
  routerPush: vi.fn(),
  updateJobExperimentApi: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '7' },
    query: {}
  }),
  useRouter: () => ({
    push: mocks.routerPush
  })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: mocks.messageError,
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/api/careerGrowth', () => ({
  assignCareerApplicationApi: mocks.assignCareerApplicationApi,
  createCareerHypothesisApi: mocks.createCareerHypothesisApi,
  getCareerHypothesisApi: mocks.getCareerHypothesisApi,
  getCareerHypothesisByLegacyExperimentApi: mocks.getCareerHypothesisByLegacyExperimentApi
}))

vi.mock('@/api/jobExperiment', () => ({
  createJobExperimentApi: mocks.createJobExperimentApi,
  getJobExperimentDetailApi: mocks.getJobExperimentDetailApi,
  updateJobExperimentApi: mocks.updateJobExperimentApi
}))

vi.mock('@/api/jobTarget', () => ({
  getJobTargetsApi: mocks.getJobTargetsApi
}))

vi.mock('@/api/resume', () => ({
  getResumesApi: mocks.getResumesApi
}))

vi.mock('@/api/v4', () => ({
  getApplicationsApi: mocks.getApplicationsApi
}))

import JobExperimentCreateView from '@/views/job-experiment/JobExperimentCreateView.vue'

const stubs = {
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-date-picker': true,
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-input': {
    props: ['modelValue', 'type', 'placeholder'],
    emits: ['update:modelValue'],
    template: `
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <input
        v-else
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `
  },
  'el-input-number': true,
  'el-option': true,
  'el-radio': true,
  'el-select': {
    template: '<select><slot /></select>'
  },
  'el-tag': true
}

describe('JobExperimentCreateView legacy experiment upgrade', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mocks.getJobTargetsApi.mockResolvedValue([])
    mocks.getResumesApi.mockResolvedValue({ records: [] })
    mocks.getApplicationsApi.mockResolvedValue([])
    mocks.getJobExperimentDetailApi.mockResolvedValue({
      id: 7,
      title: 'Legacy experiment',
      goal: 'Improve response rate',
      targetDirection: 'Backend',
      status: 'RUNNING'
    })
    mocks.getCareerHypothesisByLegacyExperimentApi.mockResolvedValue(undefined)
    mocks.updateJobExperimentApi.mockResolvedValue({
      id: 7,
      title: 'Legacy experiment'
    })
    mocks.createCareerHypothesisApi.mockResolvedValue({
      id: 21,
      legacyExperimentId: 7,
      name: 'Legacy experiment',
      statement: 'Evidence improves positive responses',
      primaryMetric: 'INTERVIEW',
      attributionWindowDays: 14,
      minSamplePerVariant: 10,
      variants: [],
      cohorts: []
    })
  })

  it('creates and links a v2 hypothesis when editing an unlinked legacy experiment', async () => {
    const wrapper = mount(JobExperimentCreateView, {
      global: { stubs }
    })
    await flushPromises()

    await wrapper.findAll('textarea')[1].setValue('Evidence improves positive responses')
    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().includes('保存基础信息'))
    expect(saveButton).toBeDefined()

    await saveButton?.trigger('click')
    await flushPromises()

    expect(mocks.updateJobExperimentApi).toHaveBeenCalledWith(7, expect.objectContaining({
      title: 'Legacy experiment'
    }))
    expect(mocks.createCareerHypothesisApi).toHaveBeenCalledWith(expect.objectContaining({
      legacyExperimentId: 7,
      name: 'Legacy experiment',
      statement: 'Evidence improves positive responses',
      primaryMetric: 'INTERVIEW'
    }))
    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/job-experiments/7',
      query: { hypothesisId: '21' }
    })
  })

  it('surfaces invalid linked hypothesis metrics instead of treating them as unlinked', async () => {
    mocks.getCareerHypothesisByLegacyExperimentApi.mockRejectedValue(
      new Error('Unsupported career attribution outcome type: FEEDBACK')
    )

    mount(JobExperimentCreateView, {
      global: { stubs }
    })
    await flushPromises()

    expect(mocks.messageError).toHaveBeenCalledWith(
      'Unsupported career attribution outcome type: FEEDBACK'
    )
  })

  it('only updates base fields when the experiment already has a linked hypothesis', async () => {
    mocks.getCareerHypothesisByLegacyExperimentApi.mockResolvedValue({
      id: 20,
      legacyExperimentId: 7,
      name: 'Existing hypothesis',
      statement: 'Keep existing hypothesis',
      primaryMetric: 'OFFER',
      attributionWindowDays: 21,
      minSamplePerVariant: 12,
      variants: [],
      cohorts: []
    })

    const wrapper = mount(JobExperimentCreateView, {
      global: { stubs }
    })
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().includes('保存基础信息'))
    await saveButton?.trigger('click')
    await flushPromises()

    expect(mocks.updateJobExperimentApi).toHaveBeenCalled()
    expect(mocks.createCareerHypothesisApi).not.toHaveBeenCalled()
    expect(mocks.routerPush).toHaveBeenCalledWith('/job-experiments/7')
  })
})
