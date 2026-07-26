import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createInterviewReplayApi } from '@/api/interviewAdvanced'
import { getInterviewReportApi } from '@/api/interview'
import InterviewReportView from '@/views/interview/InterviewReportView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '42' },
    query: {}
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/agent', () => ({
  recordAgentMetricEventApi: vi.fn().mockResolvedValue({ accepted: true })
}))

vi.mock('@/api/interview', () => ({
  exportInterviewReportApi: vi.fn(),
  getInterviewReportApi: vi.fn(),
  retryInterviewReportApi: vi.fn()
}))

vi.mock('@/api/studyPlan', () => ({
  generateStudyPlanApi: vi.fn()
}))

vi.mock('@/api/interviewAdvanced', () => ({
  createInterviewRemediationApi: vi.fn(),
  createInterviewReplayApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  },
  ElMessageBox: {
    confirm: confirmMock
  }
}))

const componentStubs = {
  AiResultFeedback: true,
  AppState: { template: '<div class="app-state-stub"><slot /></div>' },
  MarkdownPreview: true,
  ReportChart: true,
  StatusTag: true,
  'el-alert': { template: '<div class="el-alert-stub"></div>' },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-dropdown': { template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>' },
  'el-dropdown-item': { template: '<button class="el-dropdown-item-stub"><slot /></button>' },
  'el-dropdown-menu': { template: '<div class="el-dropdown-menu-stub"><slot /></div>' },
  'el-icon': { template: '<i class="el-icon-stub"><slot /></i>' },
  'el-progress': { template: '<div class="el-progress-stub"></div>' },
  'el-skeleton': { template: '<div class="el-skeleton-stub"></div>' },
  'el-tag': { template: '<span class="el-tag-stub"><slot /></span>' },
  'el-tooltip': { template: '<span class="el-tooltip-stub"><slot /></span>' }
}

const mountReport = async () => {
  const wrapper = mount(InterviewReportView, {
    global: { stubs: componentStubs }
  })
  await flushPromises()
  return wrapper
}

const generatedReport = (comparison: { available?: boolean; reason?: string }) => ({
  id: 100,
  reportId: 100,
  interviewId: 42,
  reportStatus: 'GENERATED',
  totalScore: 80,
  comparisonAvailable: comparison.available,
  comparisonUnavailableReason: comparison.reason
})

const findReplayButton = (wrapper: Awaited<ReturnType<typeof mountReport>>) =>
  wrapper
    .findAll('.report-actions .el-button-stub')
    .find((button) => button.text().includes('同配置再练'))

describe('InterviewReportView same-config replay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
  })

  it('disables the replay button and explains why when the report is not comparable', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ available: false, reason: '本轮报告缺少可比评分维度' }) as never
    )

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)

    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeDefined()
    expect(button!.attributes('title')).toContain('本轮报告缺少可比评分维度')
  })

  it('creates a replay after confirmation and navigates to the new room', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ available: true }) as never
    )
    confirmMock.mockResolvedValue('confirm')
    vi.mocked(createInterviewReplayApi).mockResolvedValue({
      id: 600,
      sourceSessionId: 42,
      targetSessionId: 210,
      status: 'CREATED',
      idempotentReplay: false
    })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)
    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeUndefined()

    await button!.trigger('click')
    await flushPromises()

    expect(createInterviewReplayApi).toHaveBeenCalledTimes(1)
    const [sessionId, payload] = vi.mocked(createInterviewReplayApi).mock.calls[0]
    expect(sessionId).toBe(42)
    expect(payload.idempotencyKey).toContain('interview-replay')
    expect(routerPush).toHaveBeenCalledWith('/interviews/room/210')
  })

  it('does not call the api when the confirmation dialog is cancelled', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ available: true }) as never
    )
    confirmMock.mockRejectedValue('cancel')

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)
    await button!.trigger('click')
    await flushPromises()

    expect(createInterviewReplayApi).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
  })
})
