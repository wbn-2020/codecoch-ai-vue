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
  routerPush: vi.fn(),
  updateJobExperimentApi: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ push: mocks.routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
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

vi.mock('@/api/jobTarget', () => ({ getJobTargetsApi: mocks.getJobTargetsApi }))
vi.mock('@/api/resume', () => ({ getResumesApi: mocks.getResumesApi }))
vi.mock('@/api/v4', () => ({ getApplicationsApi: mocks.getApplicationsApi }))

import JobExperimentCreateView from '@/views/job-experiment/JobExperimentCreateView.vue'

const stubs = {
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-date-picker': true,
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<label><slot /></label>' },
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
  'el-option': {
    props: ['label', 'value'],
    template: '<option :value="value">{{ label }}</option>'
  },
  'el-radio': true,
  'el-select': {
    name: 'ElSelect',
    props: ['modelValue', 'multiple'],
    emits: ['update:modelValue'],
    template: `
      <select
        :multiple="multiple"
        :value="modelValue"
        @change="$emit(
          'update:modelValue',
          multiple
            ? Array.from($event.target.selectedOptions).map((option) => Number(option.value))
            : $event.target.value
        )"
      >
        <slot />
      </select>
    `
  },
  'el-tag': true
}

describe('JobExperimentCreateView relation evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getJobTargetsApi.mockResolvedValue([
      { id: 101, companyName: '示例科技', jobTitle: 'Java 工程师' },
      { id: 102, companyName: '平台公司', jobTitle: '平台工程师' }
    ])
    mocks.getResumesApi.mockResolvedValue({
      records: [
        { id: 201, resumeName: 'Java 主简历', targetPosition: 'Java 后端' },
        { id: 202, resumeName: '平台工程简历', targetPosition: '平台工程' }
      ]
    })
    mocks.getApplicationsApi.mockResolvedValue([])
    mocks.createJobExperimentApi.mockResolvedValue({
      id: 77,
      title: '多对象实验',
      status: 'RUNNING',
      relations: [],
      reviews: []
    })
    mocks.createCareerHypothesisApi.mockResolvedValue({
      id: 88,
      legacyExperimentId: 77,
      name: '多对象实验',
      statement: '固定渠道比较不同证据表达',
      primaryMetric: 'INTERVIEW',
      attributionWindowDays: 14,
      minSamplePerVariant: 10,
      variants: [],
      cohorts: []
    })
  })

  it('submits selected target jobs and base resumes in the experiment create transaction', async () => {
    const wrapper = mount(JobExperimentCreateView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('input').setValue('多对象实验')
    await wrapper.findAll('textarea')[1].setValue('固定渠道比较不同证据表达')
    const selects = wrapper.findAllComponents({ name: 'ElSelect' })
    selects[2].vm.$emit('update:modelValue', [101, 102])
    selects[3].vm.$emit('update:modelValue', [201, 202])
    await flushPromises()

    const createButton = wrapper.findAll('button')
      .find((button) => button.text().includes('创建实验'))
    await createButton!.trigger('click')
    await flushPromises()

    expect(mocks.createJobExperimentApi).toHaveBeenCalledWith(expect.objectContaining({
      title: '多对象实验',
      targetJobIds: [101, 102],
      resumeIds: [201, 202]
    }))
    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/job-experiments/77',
      query: { hypothesisId: '88' }
    })
  })
})
