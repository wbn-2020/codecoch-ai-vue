import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AgentTaskListView from '@/views/agent/AgentTaskListView.vue'

const mocks = vi.hoisted(() => ({
  route: {
    query: {
      executionId: 'execution-jd-15',
      bizType: 'job-target.parse',
      bizId: '15'
    }
  },
  routerPush: vi.fn(),
  getAgentTasks: vi.fn(),
  getDashboardOverview: vi.fn(),
  getUserAsyncTasks: vi.fn(),
  getUserAsyncTaskDetail: vi.fn()
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

vi.mock('@/api/agent', () => ({
  completeAgentTaskApi: vi.fn(),
  deferAgentTaskApi: vi.fn(),
  getAgentTasksApi: mocks.getAgentTasks,
  performAgentCoachActionApi: vi.fn(),
  recordAgentMetricEventApi: vi.fn(),
  restoreAgentTaskApi: vi.fn(),
  skipAgentTaskApi: vi.fn(),
  startAgentTaskApi: vi.fn(),
  submitAgentFeedbackApi: vi.fn()
}))

vi.mock('@/api/dashboard', () => ({
  getUserDashboardOverviewApi: mocks.getDashboardOverview
}))

vi.mock('@/api/task', () => ({
  getUserAsyncTasksApi: mocks.getUserAsyncTasks,
  getUserAsyncTaskDetailApi: mocks.getUserAsyncTaskDetail
}))

describe('task center execution polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.getDashboardOverview.mockResolvedValue({ businessDate: '2026-08-17' })
    mocks.getAgentTasks.mockResolvedValue({
      records: [],
      total: 0,
      pageNo: 1,
      pageSize: 6,
      pages: 0
    })
    mocks.getUserAsyncTasks
      .mockResolvedValueOnce({
        records: [{
          id: 9,
          executionId: 'execution-jd-15',
          messageId: 'message-jd-15',
          bizType: 'job-target.parse',
          bizId: '15',
          status: 'PENDING'
        }],
        total: 1,
        pageNo: 1,
        pageSize: 6,
        pages: 1
      })
      .mockResolvedValueOnce({
        records: [{
          id: 9,
          executionId: 'execution-jd-15',
          messageId: 'message-jd-15',
          bizType: 'job-target.parse',
          bizId: '15',
          status: 'COMPLETED'
        }],
        total: 1,
        pageNo: 1,
        pageSize: 6,
        pages: 1
      })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('queries by executionId and stops after the exact task reaches a terminal state', async () => {
    const wrapper = shallowMount(AgentTaskListView)
    await flushPromises()

    expect(mocks.getUserAsyncTasks).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        executionId: 'execution-jd-15',
        bizType: 'job-target.parse',
        bizId: '15'
      })
    )
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1)

    await vi.advanceTimersByTimeAsync(4000)
    await flushPromises()

    expect(mocks.getUserAsyncTasks).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(12000)
    expect(mocks.getUserAsyncTasks).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
