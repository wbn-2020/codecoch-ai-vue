import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import JobCoachHomeView from '@/views/user/JobCoachHomeView.vue'

const mocks = vi.hoisted(() => ({
  completeTask: vi.fn(),
  dashboardOverview: vi.fn(),
  dailyPlan: vi.fn(),
  applicationStats: vi.fn(),
  notifications: vi.fn(),
  reviews: vi.fn(),
  skipTask: vi.fn(),
  todayTasks: vi.fn(),
  v3Overview: vi.fn(),
  wrongQuestions: vi.fn(),
  invalidateCaches: vi.fn(),
  routerPush: vi.fn(),
  requestPost: vi.fn(),
  confirmDanger: vi.fn(),
  prompt: vi.fn()
}))

vi.mock('@/api/agent', () => ({
  completeAgentTaskApi: mocks.completeTask,
  generateDailyPlanApi: vi.fn(),
  skipAgentTaskApi: mocks.skipTask
}))

vi.mock('@/api/v4', () => ({
  getAgentReviewsApi: mocks.reviews,
  getApplicationStatsApi: mocks.applicationStats
}))

vi.mock('@/api/notification', () => ({
  getNotificationsApi: mocks.notifications
}))

vi.mock('@/composables/useUserHomeDataCache', () => ({
  fetchCachedDashboardOverview: mocks.dashboardOverview,
  fetchCachedLatestDailyPlan: mocks.dailyPlan,
  fetchCachedTodayAgentTasks: mocks.todayTasks,
  fetchCachedV3DashboardOverview: mocks.v3Overview,
  fetchCachedWrongQuestions: mocks.wrongQuestions,
  invalidateUserHomeTrainingCaches: mocks.invalidateCaches
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    userInfo: {
      nickname: '测试同学',
      username: 'tester'
    }
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.routerPush
  })
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: mocks.confirmDanger
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: mocks.requestPost
  }
}))

vi.mock('element-plus', () => ({
  ElMessageBox: {
    prompt: mocks.prompt
  }
}))

const defaultOverview = {
  resumeCount: 1,
  recentReport: {
    interviewId: 91,
    status: 'SUCCESS',
    totalScore: 82,
    trustStatus: 'VERIFIED',
    summary: '项目表达较稳定'
  },
  recentInterview: {
    id: 91,
    status: 'COMPLETED'
  }
}

const defaultV3Overview = {
  currentTargetJob: {
    id: 7,
    targetJobId: 7,
    companyName: '示例科技',
    jobTitle: '前端工程师',
    jobLevel: '中级'
  }
}

const defaultTask = {
  id: 42,
  title: '复盘 JavaScript 并发模型',
  description: '完成一组专项复盘并记录仍不稳定的知识点。',
  reason: '来自最近训练反馈',
  taskType: 'QUESTION_PRACTICE',
  actionType: 'QUESTION_PRACTICE',
  actionUrl: '/questions/practice',
  status: 'TODO',
  priority: 'HIGH',
  estimatedMinutes: 20,
  relatedSkillName: 'JavaScript',
  fallback: false,
  mock: false
}

const secondaryTask = {
  ...defaultTask,
  id: 43,
  title: '整理项目表达证据',
  actionUrl: '/agent/tasks/43'
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const stubs = {
  'el-button': {
    inheritAttrs: false,
    props: {
      disabled: Boolean,
      loading: Boolean
    },
    template: '<button type="button" class="el-button-stub" :disabled="disabled || loading" v-bind="$attrs"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="el-dialog-stub"><slot /><slot name="footer" /></div>'
  }
}

let idleCallbacks: Array<() => void> = []

const runIdleCallbacks = () => {
  const callbacks = idleCallbacks.splice(0)
  callbacks.forEach((callback) => callback())
}

const settleHome = async () => {
  await flushPromises()
  await flushPromises()
}

const drainIdleCallbacks = async () => {
  for (let pass = 0; pass < 5; pass += 1) {
    await settleHome()
    if (!idleCallbacks.length) return
    runIdleCallbacks()
  }
  await settleHome()
}

const mountHome = async ({ runIdle = true } = {}) => {
  const wrapper = mount(JobCoachHomeView, {
    global: { stubs }
  })
  await settleHome()
  if (runIdle) {
    await drainIdleCallbacks()
  }
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  idleCallbacks = []
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    value: (callback: () => void) => {
      idleCallbacks.push(callback)
      return 1
    }
  })

  mocks.dashboardOverview.mockResolvedValue(defaultOverview)
  mocks.v3Overview.mockResolvedValue(defaultV3Overview)
  mocks.dailyPlan.mockResolvedValue({
    runId: 301,
    date: '2026-07-13',
    planDate: '2026-07-13',
    status: 'SUCCESS',
    summary: '今日训练计划',
    tasks: [defaultTask]
  })
  mocks.todayTasks.mockResolvedValue({
    total: 1,
    doneCount: 0,
    todoCount: 1,
    tasks: [defaultTask]
  })
  mocks.wrongQuestions.mockResolvedValue({ records: [] })
  mocks.applicationStats.mockResolvedValue({
    total: 0,
    activeCount: 0,
    overdueFollowUpCount: 0,
    dueTodayFollowUpCount: 0,
    noFollowUpCount: 0,
    staleActiveCount: 0
  })
  mocks.notifications.mockResolvedValue({
    records: [],
    total: 0,
    current: 1,
    size: 20
  })
  mocks.reviews.mockResolvedValue([])
  mocks.routerPush.mockResolvedValue(undefined)
  mocks.requestPost.mockResolvedValue(undefined)
  mocks.confirmDanger.mockResolvedValue(true)
  mocks.prompt.mockResolvedValue({ value: '今天时间不足' })
  mocks.completeTask.mockResolvedValue({ ...defaultTask, status: 'DONE' })
  mocks.skipTask.mockResolvedValue({ ...defaultTask, status: 'SKIPPED', skipReason: '今天时间不足' })
})

describe('JobCoachHomeView ordered action cockpit', () => {
  it('loads actionable notifications and lets the unified aggregator promote a calendar reminder', async () => {
    mocks.notifications.mockResolvedValue({
      records: [{
        id: 71,
        type: 'CALENDAR_REMINDER',
        bizType: 'CAREER_CALENDAR_EVENT',
        bizId: '501',
        title: '今天 14:00 的后端一面',
        content: '求职日历事件即将开始',
        actionUrl: '/career-calendar',
        fallbackPath: '/career-calendar',
        fallbackLabel: '打开求职日历',
        planDate: '2026-07-18',
        isRead: 0,
        createdAt: '2026-07-18 09:00:00'
      }],
      total: 1,
      current: 1,
      size: 20
    })

    const wrapper = await mountHome()

    expect(mocks.notifications).toHaveBeenCalledWith({
      pageNo: 1,
      pageSize: 20,
      isRead: ''
    })
    expect(wrapper.get('[data-primary-title]').text()).toContain('今天 14:00 的后端一面')

    await wrapper.get('[data-primary-cta]').trigger('click')

    expect(mocks.routerPush).toHaveBeenCalledWith('/career-calendar')
  })

  it('keeps Agent actions available when notification loading fails', async () => {
    mocks.notifications.mockRejectedValue(new Error('通知接口失败'))

    const wrapper = await mountHome()

    expect(wrapper.get('[data-primary-title]').text()).toContain(defaultTask.title)
    expect(wrapper.get('.action-timeline .module-error').text()).toContain('通知接口失败')
  })

  it('loads DAILY reviews for the current target and renders the latest adjustment', async () => {
    mocks.reviews.mockResolvedValue([{
      id: 901,
      targetJobId: 7,
      reviewDate: '2026-07-18',
      adjustments: ['明天先完成一项最小可验证的项目表达修改。'],
      confidenceLevel: 'MEDIUM',
      fallback: true
    }])

    const wrapper = await mountHome()
    await wrapper.get('.secondary-toggle').trigger('click')
    await flushPromises()

    expect(mocks.reviews).toHaveBeenCalledWith({ targetJobId: 7 })
    expect(wrapper.get('[data-latest-review]').text()).toContain('2026-07-18')
    expect(wrapper.get('[data-latest-review]').text()).toContain('中等置信度')
    expect(wrapper.get('[data-latest-review]').text()).toContain('规则兜底')
    expect(wrapper.get('[data-agent-loop-adjustment]').text()).toContain('明天先完成一项最小可验证的项目表达修改')
  })

  it('keeps the primary action as the only page-level action title', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('.dashboard-heading').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('今天先推进这一件事')
    expect(wrapper.findAll('[data-primary-title]')).toHaveLength(1)
  })

  it('renders an application primary action once with one primary CTA', async () => {
    mocks.applicationStats.mockResolvedValue({
      total: 3,
      activeCount: 3,
      overdueFollowUpCount: 1,
      dueTodayFollowUpCount: 0,
      noFollowUpCount: 0,
      staleActiveCount: 0
    })

    const wrapper = await mountHome()
    const primaryTitle = '1 条投递跟进已逾期'

    expect(wrapper.findAll('[data-primary-title]')).toHaveLength(1)
    expect(wrapper.find('[data-primary-title]').text()).toContain(primaryTitle)
    expect(wrapper.findAll('[data-primary-cta]')).toHaveLength(1)
    expect(wrapper.text().split(primaryTitle)).toHaveLength(2)
    expect(wrapper.findAll('[data-action-item]')).toHaveLength(2)
  })

  it('caps four-plus candidate actions at three rendered items', async () => {
    const thirdTask = {
      ...defaultTask,
      id: 44,
      title: '第三个候选训练任务',
      actionUrl: '/agent/tasks/44'
    }
    mocks.applicationStats.mockResolvedValue({
      total: 8,
      activeCount: 8,
      overdueFollowUpCount: 1,
      dueTodayFollowUpCount: 1,
      noFollowUpCount: 1,
      staleActiveCount: 1
    })
    mocks.dailyPlan.mockResolvedValue({
      runId: 301,
      date: '2026-07-13',
      planDate: '2026-07-13',
      status: 'SUCCESS',
      summary: '今日训练计划',
      tasks: [defaultTask, secondaryTask, thirdTask]
    })
    mocks.todayTasks.mockResolvedValue({
      total: 3,
      doneCount: 0,
      todoCount: 3,
      tasks: [defaultTask, secondaryTask, thirdTask]
    })

    const wrapper = await mountHome()
    const actionItems = wrapper.findAll('[data-action-item]')

    expect(actionItems).toHaveLength(3)
    expect(wrapper.findAll('[data-action-item][data-primary="false"]')).toHaveLength(2)
    expect(actionItems.map((item) => item.text()).join(' ')).toContain(defaultTask.title)
    expect(actionItems.map((item) => item.text()).join(' ')).not.toContain('还没有下一次跟进')
  })

  it('puts the no-task fallback into the ordered timeline as the primary action', async () => {
    mocks.dashboardOverview.mockResolvedValue({
      resumeCount: 0,
      recentReport: null,
      recentInterview: null
    })
    mocks.dailyPlan.mockResolvedValue(null)
    mocks.todayTasks.mockResolvedValue({
      total: 0,
      doneCount: 0,
      todoCount: 0,
      tasks: []
    })

    const wrapper = await mountHome()
    const actionItems = wrapper.findAll('[data-action-item]')

    expect(actionItems).toHaveLength(1)
    expect(actionItems[0].attributes('data-primary')).toBe('true')
    expect(actionItems[0].text()).toContain('先补一份可用于匹配的简历')
    expect(wrapper.findAll('[data-primary-cta]')).toHaveLength(1)
  })

  it('keeps zero-application state out of the action list and exposes compact task operations', async () => {
    const wrapper = await mountHome()

    expect(wrapper.text()).not.toContain('投递跟进已逾期')
    expect(wrapper.text()).not.toContain('今天跟进')
    expect(wrapper.findAll('[data-action-item]')).toHaveLength(1)
    expect(wrapper.find('[data-primary-title]').text()).toContain(defaultTask.title)

    const operations = wrapper.find('[data-task-operations]')
    expect(operations.exists()).toBe(true)
    expect(operations.attributes('open')).toBeUndefined()
    expect(operations.text()).not.toContain('进入')
    expect(operations.text()).toContain('完成')
    expect(operations.text()).toContain('跳过')
  })

  it('keeps one enter action per secondary timeline item', async () => {
    mocks.dailyPlan.mockResolvedValue({
      runId: 301,
      date: '2026-07-13',
      planDate: '2026-07-13',
      status: 'SUCCESS',
      summary: '今日训练计划',
      tasks: [defaultTask, secondaryTask]
    })
    mocks.todayTasks.mockResolvedValue({
      total: 2,
      doneCount: 0,
      todoCount: 2,
      tasks: [defaultTask, secondaryTask]
    })

    const wrapper = await mountHome()
    const secondaryItems = wrapper.findAll('[data-action-item][data-primary="false"]')

    expect(secondaryItems).toHaveLength(1)
    expect(secondaryItems[0].findAll('button').filter((button) => button.text() === '进入')).toHaveLength(1)
    expect(secondaryItems[0].get('[data-task-operations]').text()).not.toContain('进入')
  })

  it('routes through the primary CTA', async () => {
    const wrapper = await mountHome()

    await wrapper.get('[data-primary-cta]').trigger('click')
    await flushPromises()

    expect(mocks.routerPush).toHaveBeenCalledWith('/questions/practice')
  })

  it('completes the primary task from compact operations', async () => {
    const wrapper = await mountHome()
    const completeButton = wrapper
      .get('[data-primary="true"] [data-task-operations]')
      .findAll('button')
      .find((button) => button.text() === '完成')

    expect(completeButton).toBeDefined()
    await completeButton!.trigger('click')
    await settleHome()

    expect(mocks.completeTask).toHaveBeenCalledWith(42, { note: '用户在今日首页标记完成' })
  })

  it('prompts for a reason before skipping the primary task', async () => {
    const wrapper = await mountHome()
    const skipButton = wrapper
      .get('[data-primary="true"] [data-task-operations]')
      .findAll('button')
      .find((button) => button.text() === '跳过')

    expect(skipButton).toBeDefined()
    await skipButton!.trigger('click')
    await settleHome()

    expect(mocks.prompt).toHaveBeenCalledOnce()
    expect(mocks.skipTask).toHaveBeenCalledWith(42, { skipReason: '今天时间不足' })
  })

  it('keeps loading neutral until primary dependencies are known', async () => {
    const pendingOverview = deferred<typeof defaultOverview>()
    const pendingV3Overview = deferred<typeof defaultV3Overview>()
    const pendingApplicationStats = deferred<Record<string, number>>()
    mocks.dashboardOverview.mockReset().mockReturnValue(pendingOverview.promise)
    mocks.v3Overview.mockReset().mockReturnValue(pendingV3Overview.promise)
    mocks.applicationStats.mockReset().mockReturnValue(pendingApplicationStats.promise)

    const wrapper = await mountHome({ runIdle: false })
    const primaryAction = wrapper.get('[data-primary="true"]')

    expect(primaryAction.get('[data-primary-title]').text()).toContain('正在整理')
    expect(primaryAction.text()).not.toContain('先补一份可用于匹配的简历')
    expect(primaryAction.text()).not.toContain('选择目标岗位')
    expect(primaryAction.get('[data-primary-cta]').attributes('disabled')).toBeDefined()

    pendingOverview.resolve(defaultOverview)
    pendingV3Overview.resolve(defaultV3Overview)
    pendingApplicationStats.resolve({
      total: 0,
      activeCount: 0,
      overdueFollowUpCount: 0,
      dueTodayFollowUpCount: 0,
      noFollowUpCount: 0,
      staleActiveCount: 0
    })
    await settleHome()
    await drainIdleCallbacks()
  })

  it('shows a retry action instead of a definitive missing-data conclusion after dependency failures', async () => {
    mocks.dashboardOverview.mockRejectedValueOnce(new Error('首页概览失败'))
    mocks.v3Overview.mockRejectedValueOnce(new Error('目标岗位失败'))
    mocks.applicationStats.mockRejectedValueOnce(new Error('投递统计失败'))
    mocks.dailyPlan.mockRejectedValueOnce(new Error('今日计划失败'))
    mocks.todayTasks.mockRejectedValueOnce(new Error('今日任务失败'))

    const wrapper = await mountHome()
    const primaryAction = wrapper.get('[data-primary="true"]')

    expect(primaryAction.get('[data-primary-title]').text()).toContain('重新加载')
    expect(primaryAction.text()).not.toContain('先补一份可用于匹配的简历')
    expect(primaryAction.text()).not.toContain('选择目标岗位')
    expect(primaryAction.get('[data-primary-cta]').attributes('disabled')).toBeUndefined()

    await primaryAction.get('[data-primary-cta]').trigger('click')
    await settleHome()

    expect(mocks.dashboardOverview).toHaveBeenCalledTimes(2)
    expect(mocks.v3Overview).toHaveBeenCalledTimes(2)
    expect(mocks.applicationStats).toHaveBeenCalledTimes(2)
    expect(mocks.dailyPlan).toHaveBeenCalledTimes(2)
    expect(mocks.todayTasks).toHaveBeenCalledTimes(2)
  })

  it('keeps the newest resource generation and does not clear loading for an older response', async () => {
    mocks.dashboardOverview.mockRejectedValueOnce(new Error('首页概览失败'))
    mocks.v3Overview.mockRejectedValueOnce(new Error('目标岗位失败'))
    mocks.applicationStats.mockRejectedValueOnce(new Error('投递统计失败'))
    mocks.dailyPlan.mockRejectedValueOnce(new Error('今日计划失败'))
    mocks.todayTasks.mockRejectedValueOnce(new Error('今日任务失败'))

    const wrapper = await mountHome()
    const latestTask = {
      ...defaultTask,
      id: 99,
      title: '最新请求保留的任务'
    }
    const runs = {
      overview: [deferred<any>(), deferred<any>(), deferred<any>()],
      v3Overview: [deferred<any>(), deferred<any>(), deferred<any>()],
      applicationStats: [deferred<any>(), deferred<any>(), deferred<any>()],
      dailyPlan: [deferred<any>(), deferred<any>(), deferred<any>()],
      todayTasks: [deferred<any>(), deferred<any>(), deferred<any>()]
    }
    const installRuns = (mock: ReturnType<typeof vi.fn>, sequence: Array<ReturnType<typeof deferred<any>>>) => {
      mock.mockReset()
      sequence.forEach((run) => mock.mockImplementationOnce(() => run.promise))
    }

    installRuns(mocks.dashboardOverview, runs.overview)
    installRuns(mocks.v3Overview, runs.v3Overview)
    installRuns(mocks.applicationStats, runs.applicationStats)
    installRuns(mocks.dailyPlan, runs.dailyPlan)
    installRuns(mocks.todayTasks, runs.todayTasks)

    const retryButton = wrapper.get('[data-primary-cta]').element as HTMLButtonElement
    retryButton.click()
    retryButton.click()
    retryButton.click()
    await flushPromises()

    expect(mocks.dashboardOverview).toHaveBeenCalledTimes(3)
    expect(mocks.v3Overview).toHaveBeenCalledTimes(3)
    expect(mocks.applicationStats).toHaveBeenCalledTimes(3)
    expect(mocks.dailyPlan).toHaveBeenCalledTimes(3)
    expect(mocks.todayTasks).toHaveBeenCalledTimes(3)

    runs.overview[1].resolve({ resumeCount: 0, recentReport: null, recentInterview: null })
    runs.v3Overview[1].resolve({ currentTargetJob: null })
    runs.applicationStats[1].resolve({
      total: 4,
      activeCount: 4,
      overdueFollowUpCount: 2,
      dueTodayFollowUpCount: 0,
      noFollowUpCount: 0,
      staleActiveCount: 0
    })
    runs.dailyPlan[1].resolve(null)
    runs.todayTasks[1].resolve({ total: 0, doneCount: 0, todoCount: 0, tasks: [] })
    await settleHome()

    expect(wrapper.get('.dashboard-cockpit-grid').attributes('aria-busy')).toBe('true')

    runs.overview[2].resolve({ ...defaultOverview, resumeCount: 2 })
    runs.v3Overview[2].resolve({
      currentTargetJob: {
        ...defaultV3Overview.currentTargetJob,
        companyName: '最新公司'
      }
    })
    runs.applicationStats[2].resolve({
      total: 0,
      activeCount: 0,
      overdueFollowUpCount: 0,
      dueTodayFollowUpCount: 0,
      noFollowUpCount: 0,
      staleActiveCount: 0
    })
    runs.dailyPlan[2].resolve({
      runId: 901,
      date: '2026-07-13',
      planDate: '2026-07-13',
      status: 'SUCCESS',
      summary: '最新计划',
      tasks: [latestTask]
    })
    runs.todayTasks[2].resolve({ total: 1, doneCount: 0, todoCount: 1, tasks: [latestTask] })
    await settleHome()

    expect(wrapper.get('[data-primary-title]').text()).toContain(latestTask.title)
    expect(wrapper.get('[data-signal="target-job"]').text()).toContain('最新公司')
    expect(wrapper.get('[data-signal="evidence"]').text()).toContain('4/4')

    runs.overview[0].resolve({ resumeCount: 0, recentReport: null, recentInterview: null })
    runs.v3Overview[0].resolve({ currentTargetJob: null })
    runs.applicationStats[0].resolve({
      total: 7,
      activeCount: 7,
      overdueFollowUpCount: 3,
      dueTodayFollowUpCount: 0,
      noFollowUpCount: 0,
      staleActiveCount: 0
    })
    runs.dailyPlan[0].resolve(null)
    runs.todayTasks[0].resolve({ total: 0, doneCount: 0, todoCount: 0, tasks: [] })
    await settleHome()

    expect(wrapper.get('[data-primary-title]').text()).toContain(latestTask.title)
    expect(wrapper.get('[data-signal="target-job"]').text()).toContain('最新公司')
  })

  it('allows only one completion mutation while the first request is pending', async () => {
    const pendingCompletion = deferred<typeof defaultTask>()
    mocks.completeTask.mockReset().mockReturnValue(pendingCompletion.promise)
    const wrapper = await mountHome()
    const completeButton = wrapper
      .get('[data-primary="true"] [data-task-operations]')
      .findAll('button')
      .find((button) => button.text() === '完成')!

    ;(completeButton.element as HTMLButtonElement).click()
    ;(completeButton.element as HTMLButtonElement).click()
    await flushPromises()

    expect(mocks.completeTask).toHaveBeenCalledOnce()

    pendingCompletion.resolve({ ...defaultTask, status: 'DONE' })
    await settleHome()
  })

  it('locks skip mutations while confirmation is pending', async () => {
    const pendingConfirmation = deferred<boolean>()
    mocks.confirmDanger.mockReset().mockReturnValue(pendingConfirmation.promise)
    const wrapper = await mountHome()
    const skipButton = wrapper
      .get('[data-primary="true"] [data-task-operations]')
      .findAll('button')
      .find((button) => button.text() === '跳过')!

    ;(skipButton.element as HTMLButtonElement).click()
    ;(skipButton.element as HTMLButtonElement).click()
    await flushPromises()

    expect(mocks.confirmDanger).toHaveBeenCalledOnce()
    expect(mocks.prompt).not.toHaveBeenCalled()
    expect(mocks.skipTask).not.toHaveBeenCalled()

    pendingConfirmation.resolve(true)
    await settleHome()

    expect(mocks.prompt).toHaveBeenCalledOnce()
    expect(mocks.skipTask).toHaveBeenCalledOnce()
  })

  it('releases the skip lock after cancellation or confirmation errors', async () => {
    mocks.confirmDanger
      .mockReset()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('确认弹窗异常'))
      .mockResolvedValueOnce(true)
    const wrapper = await mountHome()
    const skipButton = wrapper
      .get('[data-primary="true"] [data-task-operations]')
      .findAll('button')
      .find((button) => button.text() === '跳过')!

    await skipButton.trigger('click')
    await settleHome()
    await skipButton.trigger('click')
    await settleHome()
    await skipButton.trigger('click')
    await settleHome()

    expect(mocks.confirmDanger).toHaveBeenCalledTimes(3)
    expect(mocks.prompt).toHaveBeenCalledOnce()
    expect(mocks.skipTask).toHaveBeenCalledOnce()
  })

  it('places partial API errors inside their related modules', async () => {
    mocks.v3Overview.mockRejectedValue(new Error('岗位接口失败'))
    mocks.applicationStats.mockRejectedValue(new Error('投递接口失败'))
    mocks.wrongQuestions.mockRejectedValue(new Error('依据接口失败'))

    const wrapper = await mountHome()

    expect(wrapper.find('.error-stack').exists()).toBe(false)
    expect(wrapper.find('.cockpit-signal.is-error').exists()).toBe(true)
    expect(wrapper.find('.action-timeline .module-error').text()).toContain('投递接口失败')
    expect(wrapper.find('.recommendation-summary .module-error').text()).toContain('依据接口失败')
  })

  it('exposes the mobile-only structure without a second fixed dashboard CTA', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('.dashboard-cockpit-grid').exists()).toBe(true)
    expect(wrapper.find('.cockpit-signal-grid').exists()).toBe(true)
    expect(wrapper.findAll('.cockpit-signal')).toHaveLength(4)
    expect(wrapper.findAll('.cockpit-signal').map((item) => item.attributes('data-signal'))).toEqual([
      'target-job',
      'evidence',
      'recent-report',
      'risk-gap'
    ])
    expect(wrapper.find('.mobile-primary-action').exists()).toBe(false)
  })

  it('keeps recommendation evidence and secondary tools collapsed by default', async () => {
    const wrapper = await mountHome()

    const evidenceDetails = wrapper.find('details.recommendation-details')
    expect(evidenceDetails.exists()).toBe(true)
    expect(evidenceDetails.attributes('open')).toBeUndefined()
    expect(wrapper.find('.secondary-material').exists()).toBe(false)

    await wrapper.get('.secondary-toggle').trigger('click')
    await flushPromises()

    expect(wrapper.find('.secondary-material').exists()).toBe(true)
    expect(wrapper.find('.recent-artifacts-panel').exists()).toBe(true)
    expect(wrapper.find('.agent-loop-panel').exists()).toBe(true)
  })

  it('keeps recommendation evidence and materials discoverable through mobile entry points', async () => {
    const wrapper = await mountHome()
    const discoveryButtons = wrapper.findAll('.mobile-discovery-links button')

    expect(discoveryButtons.map((button) => button.text())).toEqual(['查看推荐依据', '打开资料与工具'])

    await discoveryButtons[0].trigger('click')
    expect((wrapper.get('details.recommendation-details').element as HTMLDetailsElement).open).toBe(true)

    await discoveryButtons[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('.secondary-material').exists()).toBe(true)
  })

  it('keeps summary controls keyboard focusable and expandable', async () => {
    const wrapper = await mountHome()
    const details = wrapper.get('details.recommendation-details')
    const summary = details.get('summary')

    expect(summary.attributes('tabindex')).toBe('0')
    expect((details.element as HTMLDetailsElement).open).toBe(false)

    await summary.trigger('click')

    expect((details.element as HTMLDetailsElement).open).toBe(true)
  })
})
