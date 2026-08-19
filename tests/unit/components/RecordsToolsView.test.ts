import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getApplicationPackagesApi } from '@/api/applicationPackage'
import { getUserAsyncTasksApi } from '@/api/task'
import RecordsToolsView from '@/views/tools/RecordsToolsView.vue'

const push = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

vi.mock('@/config', () => ({
  appConfig: {
    enableV4KnowledgePreview: false,
    enableV6WeeklyReport: true
  }
}))

vi.mock('@/api/applicationPackage', () => ({
  getApplicationPackagesApi: vi.fn()
}))

vi.mock('@/api/task', () => ({
  getUserAsyncTasksApi: vi.fn()
}))

const page = <T>(records: T[]) => ({
  records,
  total: records.length,
  pageNo: 1,
  pageSize: 10,
  pages: 1
})

describe('RecordsToolsView operational summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getApplicationPackagesApi).mockResolvedValue(page([{
      id: 31,
      companyName: '星海科技',
      jobTitle: 'Java 高级工程师',
      updatedAt: '2026-08-17T08:00:00'
    }]))
    vi.mocked(getUserAsyncTasksApi).mockResolvedValue(page([
      { id: 1, status: 'RUNNING', bizType: 'RESUME_JOB_MATCH' },
      { id: 2, status: 'FAILED', bizType: 'INTERVIEW_REPORT', failureReason: 'timeout' }
    ]))
  })

  it('shows recent artifacts, pending work, failures and routes to the next action', async () => {
    const wrapper = mount(RecordsToolsView)
    await flushPromises()

    expect(getApplicationPackagesApi).toHaveBeenCalledWith({ pageNo: 1, pageSize: 3 })
    expect(getUserAsyncTasksApi).toHaveBeenCalledWith({ pageNo: 1, pageSize: 8 })
    expect(wrapper.text()).toContain('星海科技 · Java 高级工程师')
    expect(wrapper.text()).toContain('最近一项：岗位匹配')
    expect(wrapper.text()).toContain('1 项待处理')
    expect(wrapper.text()).toContain('面试报告未完成')
    expect(wrapper.text()).toContain('先处理未完成任务')

    const action = wrapper.findAll('button').find((button) => button.text() === '查看异常任务')
    expect(action).toBeTruthy()
    await action!.trigger('click')
    expect(push).toHaveBeenCalledWith('/agent/tasks')
  })

  it('renders a recoverable error instead of pretending the summary is empty', async () => {
    vi.mocked(getApplicationPackagesApi).mockRejectedValue(new Error('unavailable'))

    const wrapper = mount(RecordsToolsView)
    await flushPromises()

    expect(wrapper.text()).toContain('摘要暂时不可用')
    expect(wrapper.text()).toContain('最近资料状态加载失败，请稍后重试。')
    expect(wrapper.text()).not.toContain('暂无异常')
  })

  it('shows a useful first-step summary when there are no recent artifacts or tasks', async () => {
    vi.mocked(getApplicationPackagesApi).mockResolvedValue(page([]))
    vi.mocked(getUserAsyncTasksApi).mockResolvedValue(page([]))

    const wrapper = mount(RecordsToolsView)
    await flushPromises()

    expect(wrapper.text()).toContain('还没有投递包')
    expect(wrapper.text()).toContain('当前没有排队或执行中的后台任务')
    expect(wrapper.text()).toContain('暂无异常')
    expect(wrapper.text()).toContain('创建第一份投递包')

    const action = wrapper.findAll('button').find((button) => button.text() === '进入投递包')
    expect(action).toBeTruthy()
    await action!.trigger('click')
    expect(push).toHaveBeenCalledWith('/application-packages')
  })
})
