import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JobTargetAnalysisView from '@/views/v3/JobTargetAnalysisView.vue'

const mocks = vi.hoisted(() => ({
  route: {
    params: { id: '15' },
    query: {}
  },
  routerPush: vi.fn(),
  getJobDescriptionAnalysis: vi.fn(),
  getJobTargetDetail: vi.fn(),
  parseJobDescription: vi.fn(),
  submitJobDescriptionParseTask: vi.fn(),
  streamJobDescriptionParse: vi.fn(),
  getJobRequirementMatrix: vi.fn(),
  getJobReadinessHistory: vi.fn(),
  getJobReadinessSnapshot: vi.fn(),
  getLatestJobReadiness: vi.fn(),
  materializeJobRequirements: vi.fn(),
  recalculateJobReadiness: vi.fn(),
  refreshJobRequirementMatrix: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/api/jobTarget', () => ({
  getJobDescriptionAnalysisApi: mocks.getJobDescriptionAnalysis,
  getJobTargetDetailApi: mocks.getJobTargetDetail,
  parseJobDescriptionApi: mocks.parseJobDescription,
  submitJobDescriptionParseTaskApi: mocks.submitJobDescriptionParseTask,
  streamJobDescriptionParseApi: mocks.streamJobDescriptionParse
}))

vi.mock('@/api/jobRequirement', () => ({
  getJobRequirementMatrixApi: mocks.getJobRequirementMatrix,
  getJobReadinessHistoryApi: mocks.getJobReadinessHistory,
  getJobReadinessSnapshotApi: mocks.getJobReadinessSnapshot,
  getLatestJobReadinessApi: mocks.getLatestJobReadiness,
  materializeJobRequirementsApi: mocks.materializeJobRequirements,
  recalculateJobReadinessApi: mocks.recalculateJobReadiness,
  refreshJobRequirementMatrixApi: mocks.refreshJobRequirementMatrix
}))

const mountView = () => shallowMount(JobTargetAnalysisView, {
  global: {
    stubs: {
      AppState: true,
      JobRequirementEvidenceMatrix: true,
      JobTargetAnalysisPanel: true,
      JobTargetStatusTag: true
    }
  }
})

describe('job target async execution correlation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.getJobTargetDetail.mockResolvedValue({
      id: 15,
      jobTitle: 'Backend Engineer',
      jdText: 'Build services',
      parseStatus: 'PARSING'
    })
    mocks.getJobDescriptionAnalysis.mockResolvedValue({
      targetJobId: 15,
      executionId: 'execution-jd-15',
      asyncMessageId: 'message-jd-15',
      asyncTraceId: 'trace-jd-15',
      asyncBizType: 'job-target.parse',
      asyncBizId: '15',
      parseStatus: 'PARSING'
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('opens task center with the exact executionId from the submit receipt', async () => {
    const wrapper = mountView()
    await flushPromises()

    const taskButton = wrapper.findAll('button').find((button) => button.text() === '查看任务')
    expect(taskButton).toBeDefined()
    await taskButton!.trigger('click')

    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/agent/tasks',
      query: {
        executionId: 'execution-jd-15',
        messageId: 'message-jd-15',
        traceId: 'trace-jd-15',
        bizType: 'job-target.parse',
        bizId: '15'
      }
    })
    wrapper.unmount()
  })

  it('stops polling and removes progress copy after the same execution reaches PARSED', async () => {
    mocks.getJobDescriptionAnalysis
      .mockResolvedValueOnce({
        targetJobId: 15,
        executionId: 'execution-jd-15',
        asyncMessageId: 'message-jd-15',
        parseStatus: 'PARSING'
      })
      .mockResolvedValueOnce({
        targetJobId: 15,
        executionId: 'execution-jd-15',
        asyncMessageId: 'message-jd-15',
        parseStatus: 'PARSED',
        summary: 'Terminal structured analysis'
      })
    const wrapper = mountView()
    await flushPromises()
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(4000)
    await flushPromises()

    expect(mocks.getJobDescriptionAnalysis).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    expect(wrapper.text()).not.toContain('正在获取岗位分析进度')
    expect(wrapper.text()).not.toContain('岗位分析正在生成中')
    wrapper.unmount()
  })

  it('replaces the previous executionId when a re-analysis submission is accepted', async () => {
    mocks.getJobTargetDetail.mockResolvedValue({
      id: 15,
      jobTitle: 'Backend Engineer',
      jdText: 'Build services',
      parseStatus: 'PARSED'
    })
    mocks.getJobDescriptionAnalysis
      .mockResolvedValueOnce({
        targetJobId: 15,
        executionId: 'execution-old',
        asyncMessageId: 'message-old',
        asyncTraceId: 'trace-old',
        asyncBizType: 'job-target.parse',
        asyncBizId: '15',
        parseStatus: 'PARSED',
        summary: 'Previous analysis'
      })
      .mockResolvedValueOnce({
        targetJobId: 15,
        executionId: 'execution-new',
        asyncMessageId: 'message-new',
        asyncTraceId: 'trace-new',
        asyncBizType: 'job-target.parse',
        asyncBizId: '15',
        parseStatus: 'PARSING'
      })
    mocks.submitJobDescriptionParseTask.mockResolvedValue({
      targetJobId: 15,
      executionId: 'execution-new',
      asyncMessageId: 'message-new',
      asyncTraceId: 'trace-new',
      asyncBizType: 'job-target.parse',
      asyncBizId: '15',
      parseStatus: 'PARSING'
    })

    const wrapper = mountView()
    await flushPromises()

    const reanalyzeButton = wrapper.findAll('button')
      .find((button) => button.text().includes('重新分析'))
    expect(reanalyzeButton).toBeDefined()
    await reanalyzeButton!.trigger('click')
    await flushPromises()

    const taskButton = wrapper.findAll('button').find((button) => button.text() === '查看任务')
    expect(taskButton).toBeDefined()
    await taskButton!.trigger('click')

    expect(mocks.routerPush).toHaveBeenLastCalledWith({
      path: '/agent/tasks',
      query: {
        executionId: 'execution-new',
        messageId: 'message-new',
        traceId: 'trace-new',
        bizType: 'job-target.parse',
        bizId: '15'
      }
    })
    wrapper.unmount()
  })
})
