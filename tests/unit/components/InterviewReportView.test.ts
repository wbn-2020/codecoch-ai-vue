import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { recordAgentMetricEventApi } from '@/api/agent'
import { getInterviewReportApi, retryInterviewReportApi } from '@/api/interview'
import { generateStudyPlanApi } from '@/api/studyPlan'
import InterviewReportView from '@/views/interview/InterviewReportView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '42' },
    query: {}
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/agent', () => ({
  recordAgentMetricEventApi: vi.fn()
}))

vi.mock('@/api/interview', () => ({
  getInterviewReportApi: vi.fn(),
  retryInterviewReportApi: vi.fn()
}))

vi.mock('@/api/studyPlan', () => ({
  generateStudyPlanApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

const componentStubs = {
  AiResultFeedback: true,
  AppState: {
    template: '<div class="app-state-stub"><slot /></div>'
  },
  MarkdownPreview: true,
  ReportChart: true,
  StatusTag: true,
  'el-alert': {
    template: '<div class="el-alert-stub"></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-icon': {
    template: '<i class="el-icon-stub"><slot /></i>'
  },
  'el-progress': {
    template: '<div class="el-progress-stub"></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountReport = async () => {
  const wrapper = mount(InterviewReportView, {
    global: {
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('InterviewReportView metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(recordAgentMetricEventApi).mockResolvedValue({ accepted: true })
    vi.mocked(retryInterviewReportApi).mockResolvedValue({})
    vi.mocked(generateStudyPlanApi).mockResolvedValue({})
  })

  it('does not record report action metrics from top navigation when report is not generated', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      interviewId: 42,
      reportStatus: 'FAILED',
      failureReason: 'generation failed'
    })

    const wrapper = await mountReport()
    await wrapper.find('.report-actions .el-button-stub').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/dashboard')
    expect(recordAgentMetricEventApi).not.toHaveBeenCalled()
  })

  it('records one shown metric when backend nextActions are already displayed', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 100,
      reportId: 100,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 80,
      nextActions: [
        {
          actionType: 'QUESTION_PRACTICE',
          title: 'Practice weak questions',
          actionUrl: '/questions/practice',
          priority: 80
        }
      ]
    })

    await mountReport()
    await flushPromises()

    expect(recordAgentMetricEventApi).toHaveBeenCalledTimes(1)
    expect(recordAgentMetricEventApi).toHaveBeenCalledWith(
      expect.objectContaining({
        eventCode: 'interview_report_next_action_shown',
        bizId: '100'
      }),
      { silentError: true }
    )
  })

  it('records static shown metric when displayed actions are frontend fallback actions', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 101,
      reportId: 101,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 80,
      nextActions: [
        {
          actionType: 'QUESTION_PRACTICE',
          title: 'Practice weak questions',
          actionUrl: '/questions/practice',
          priority: 80,
          actionSource: 'STATIC_FALLBACK'
        } as any
      ]
    })

    await mountReport()
    await flushPromises()

    expect(recordAgentMetricEventApi).toHaveBeenCalledTimes(1)
    expect(recordAgentMetricEventApi).toHaveBeenCalledWith(
      expect.objectContaining({
        eventCode: 'interview_report_next_action_shown',
        bizId: '101',
        metadata: expect.objectContaining({
          actionType: 'STATIC_ACTION_ZONE'
        })
      }),
      { silentError: true }
    )
  })
})
