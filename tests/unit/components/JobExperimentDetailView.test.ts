import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getJobExperimentDetailApi } from '@/api/jobExperiment'
import JobExperimentDetailView from '@/views/job-experiment/JobExperimentDetailView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '9' },
    query: { demoFlag: 'true' }
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn()
  },
  ElMessageBox: {
    confirm: vi.fn()
  }
}))

vi.mock('@/api/jobExperiment', () => ({
  addJobExperimentRelationApi: vi.fn(),
  deleteJobExperimentApi: vi.fn(),
  deleteJobExperimentRelationApi: vi.fn(),
  getJobExperimentDetailApi: vi.fn()
}))

const componentStubs = {
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="el-alert-stub">{{ title }}{{ description }}<slot /></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>'
  },
  'el-dialog': {
    template: '<div class="el-dialog-stub"><slot /><slot name="footer" /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-input': {
    template: '<input />'
  },
  'el-input-number': {
    template: '<input type="number" />'
  },
  'el-option': true,
  'el-select': {
    template: '<select><slot /></select>'
  },
  'el-table': {
    template: '<div class="el-table-stub"><slot /></div>'
  },
  'el-table-column': true,
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountDetail = async () => {
  const wrapper = mount(JobExperimentDetailView, {
    global: {
      directives: {
        loading: {}
      },
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('JobExperimentDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: '演示投递实验',
      status: 'RUNNING',
      demoFlag: 1,
      strategy: {
        actionUrl: '/agent/today'
      },
      relations: [],
      reviews: [],
      metrics: {
        applicationCount: 3,
        feedbackCount: 1,
        interviewInviteCount: 0,
        interviewCompletedCount: 0,
        offerCount: 0,
        rejectedCount: 1,
        resumeVersionCount: 1,
        targetJobCount: 1,
        projectEvidenceCount: 1,
        agentTaskCount: 1,
        sampleCount: 3,
        confidenceLevel: 'LOW',
        sampleInsufficient: true
      }
    })
  })

  it('keeps the demo flag on detail page navigation actions', async () => {
    const wrapper = await mountDetail()
    const buttons = wrapper.findAll('button')

    await buttons.find((button) => button.text() === '返回')?.trigger('click')
    await buttons.find((button) => button.text() === '复盘')?.trigger('click')
    await buttons.find((button) => button.text() === 'Agent 下一步任务')?.trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/job-experiments?demoFlag=true')
    expect(routerPush).toHaveBeenCalledWith('/job-experiments/9/review?demoFlag=true')
    expect(routerPush).toHaveBeenCalledWith('/agent/today?demoFlag=true')
  })

  it('uses current metrics for dashboard confidence when the latest review is stale', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: '演示投递实验',
      status: 'REVIEWED',
      demoFlag: 1,
      strategy: {
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '样本可用于高置信复盘，但仍需说明岗位、渠道、时间窗口等影响因素。',
        unsupportedConclusions: ['不能完全归因到单一因素，需结合岗位、渠道、简历和面试样本人工复核。'],
        actionUrl: '/agent/today'
      },
      latestReview: {
        id: 301,
        experimentId: 9,
        confidenceLevel: 'LOW',
        sampleWarning: '旧复盘：投递少于 5 条。',
        unsupportedConclusion: '旧复盘不能判断策略有效性。'
      },
      relations: [],
      reviews: [],
      metrics: {
        applicationCount: 15,
        feedbackCount: 4,
        interviewInviteCount: 3,
        interviewCompletedCount: 3,
        offerCount: 1,
        rejectedCount: 2,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 2,
        agentTaskCount: 2,
        sampleCount: 15,
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '样本可用于高置信复盘，但仍需说明岗位、渠道、时间窗口等影响因素。',
        facts: ['投递数：12', '完成面试数：3'],
        unsupportedConclusions: ['不能完全归因到单一因素，需结合岗位、渠道、简历和面试样本人工复核。']
      }
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('高置信度')
    expect(wrapper.text()).toContain('可复盘')
    expect(wrapper.text()).toContain('样本可用于高置信复盘')
    expect(wrapper.text()).toContain('不能完全归因到单一因素')
    expect(wrapper.text()).not.toContain('弱建议')
  })

  it('shows current metric facts on the detail dashboard', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: 'Demo experiment',
      status: 'RUNNING',
      demoFlag: 1,
      strategy: {
        actionUrl: '/agent/today'
      },
      latestReview: {
        id: 301,
        experimentId: 9,
        factSummary: 'OLD_FACT_SUMMARY'
      },
      relations: [],
      reviews: [],
      metrics: {
        applicationCount: 12,
        feedbackCount: 4,
        interviewInviteCount: 3,
        interviewCompletedCount: 3,
        offerCount: 1,
        rejectedCount: 2,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 2,
        agentTaskCount: 2,
        sampleCount: 12,
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        facts: ['SERVER_FACT_CURRENT']
      }
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('SERVER_FACT_CURRENT')
  })

  it('does not show stale review warnings when current metrics have no warning', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: 'Demo experiment',
      status: 'REVIEWED',
      demoFlag: 1,
      strategy: {
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '',
        unsupportedConclusions: [],
        actionUrl: '/agent/today'
      },
      latestReview: {
        id: 301,
        experimentId: 9,
        confidenceLevel: 'LOW',
        sampleWarning: 'OLD_SAMPLE_WARNING',
        unsupportedConclusion: 'OLD_UNSUPPORTED_CONCLUSION'
      },
      relations: [],
      reviews: [],
      metrics: {
        applicationCount: 12,
        feedbackCount: 4,
        interviewInviteCount: 3,
        interviewCompletedCount: 3,
        offerCount: 1,
        rejectedCount: 2,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 2,
        agentTaskCount: 2,
        sampleCount: 12,
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '',
        facts: ['SERVER_FACT_CURRENT'],
        unsupportedConclusions: []
      }
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).not.toContain('OLD_SAMPLE_WARNING')
    expect(wrapper.text()).not.toContain('OLD_UNSUPPORTED_CONCLUSION')
  })
})
