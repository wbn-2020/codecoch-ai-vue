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
  exportInterviewReportApi: vi.fn(),
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
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="el-dialog-stub"><slot /><slot name="footer" /></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<div><slot /></div>'
  },
  'el-input-number': {
    template: '<input />'
  },
  'el-date-picker': {
    template: '<input />'
  },
  'el-dropdown': {
    template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>'
  },
  'el-dropdown-item': {
    template: '<button class="el-dropdown-item-stub"><slot /></button>'
  },
  'el-dropdown-menu': {
    template: '<div class="el-dropdown-menu-stub"><slot /></div>'
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

  it('does not render legacy top actions or record report action metrics in recovery state', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      interviewId: 42,
      reportStatus: 'FAILED',
      failureReason: 'generation failed'
    })

    const wrapper = await mountReport()
    expect(wrapper.find('.report-actions').exists()).toBe(false)
    expect(wrapper.find('.report-recovery-card__actions').text()).toContain('重新生成报告')
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

    const wrapper = await mountReport()
    const fullReport = wrapper.find('.report-deep-dive:not(.report-insights-drawer)')
    expect(fullReport.exists()).toBe(true)
    expect(fullReport.find('summary').text()).toContain('完整报告')

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

  it('shows persisted delivery metrics and explains unavailable pause measurements', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 102,
      reportId: 102,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 82,
      voiceDeliverySummary: {
        sessionId: 42,
        analysisId: 900,
        available: true,
        status: 'SUCCEEDED',
        speakingRatePerMinute: 158,
        fillerCount: 2,
        pauseMetricsAvailable: false,
        warningCodes: ['WORD_TIMESTAMPS_UNAVAILABLE']
      }
    })

    const wrapper = await mountReport()

    expect(wrapper.find('.voice-delivery-report').text()).toContain('158')
    expect(wrapper.find('.voice-delivery-report').text()).toContain('停顿指标不可用')
  })

  it('does not present a fallback reference report as a trusted score', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 103,
      reportId: 103,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 72,
      trustStatus: 'FALLBACK',
      fallback: true,
      adviceEvidence: '[{"fallback":true,"source":"LOCAL_MOCK"}]'
    })

    const wrapper = await mountReport()

    expect(wrapper.find('.settlement-score').text()).toContain('--')
    expect(wrapper.text()).toContain('评分待确认')
    expect(wrapper.text()).toContain('本轮没有可信评分')
  })

  it.each([
    ['PARTIAL', false],
    [undefined, false],
    ['UNKNOWN', false]
  ])('fails closed for %s report trust and disables study-plan generation', async (trustStatus, fallback) => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 104,
      reportId: 104,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 86,
      trustStatus,
      fallback,
      nextActions: [{
        actionType: 'STUDY_PLAN',
        title: '生成学习计划',
        priority: 1
      }]
    } as never)

    const wrapper = await mountReport()
    const planButtons = wrapper
      .findAll('.el-button-stub')
      .filter((button) => button.text().includes('生成'))

    expect(wrapper.find('.settlement-score').text()).toContain('--')
    expect(wrapper.text()).toContain('无法确认真实评分，暂不比较历史变化')
    expect(wrapper.text()).toContain('学习计划入口已禁用')
    expect(planButtons.some((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(generateStudyPlanApi).not.toHaveBeenCalled()
  })

  it('submits confirmed study-plan schedule only for a verified report', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue({
      id: 105,
      reportId: 105,
      interviewId: 42,
      reportStatus: 'GENERATED',
      totalScore: 86,
      trustStatus: 'VERIFIED',
      fallback: false
    })
    vi.mocked(generateStudyPlanApi).mockResolvedValue({
      planId: 501,
      planStatus: 'ACTIVE',
      durationDays: 14,
      dailyMinutes: 60
    })

    const wrapper = await mountReport()
    const openButton = wrapper
      .findAll('.el-button-stub')
      .find((button) => button.text().includes('生成学习计划') && button.attributes('disabled') === undefined)

    expect(openButton).toBeDefined()
    await openButton!.trigger('click')
    await flushPromises()
    await wrapper.find('.el-dialog-stub .el-button-stub:last-child').trigger('click')
    await flushPromises()

    expect(generateStudyPlanApi).toHaveBeenCalledWith({
      reportId: 105,
      expectedDurationDays: 14,
      dailyMinutes: 60,
      startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    })
    expect(routerPush).toHaveBeenCalledWith('/study-plans?planId=501')
  })

  it('offers requery after three polling failures without regenerating the report', async () => {
    vi.useFakeTimers()
    vi.mocked(getInterviewReportApi)
      .mockResolvedValueOnce({
        interviewId: 42,
        reportStatus: 'GENERATING'
      } as never)
      .mockRejectedValueOnce(new Error('network 1'))
      .mockRejectedValueOnce(new Error('network 2'))
      .mockRejectedValueOnce(new Error('network 3'))
      .mockResolvedValueOnce({
        interviewId: 42,
        reportStatus: 'GENERATING'
      } as never)

    const wrapper = mount(InterviewReportView, {
      global: { stubs: componentStubs }
    })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).toContain('重新查询')
    expect(retryInterviewReportApi).not.toHaveBeenCalled()

    const requeryButton = wrapper
      .findAll('.el-button-stub')
      .find((button) => button.text().includes('重新查询'))
    await requeryButton!.trigger('click')
    await flushPromises()

    expect(getInterviewReportApi).toHaveBeenCalledTimes(5)
    expect(retryInterviewReportApi).not.toHaveBeenCalled()
    wrapper.unmount()
    vi.useRealTimers()
  })
})
