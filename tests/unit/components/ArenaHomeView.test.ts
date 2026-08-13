import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import ArenaHomeView from '@/views/user/ArenaHomeView.vue'
import { useGameProfileStore } from '@/features/game-profile'

const todayTasks = vi.hoisted(() => ({ value: { tasks: [] as unknown[] } }))
const overview = vi.hoisted(() => ({
  value: {
    resumeCount: 1,
    interviewCount: 1,
    todayTaskCount: 3,
    todayCompletedTaskCount: 1,
    entryStatuses: [
      { key: 'resume', status: 'READY' },
      { key: 'job', status: 'READY' },
      { key: 'match', status: 'PENDING' },
      { key: 'evidence', status: 'READY' }
    ],
    recentReport: { reportId: 1, interviewId: 1, totalScore: 62 }
  } as Record<string, unknown>
}))
const homeCacheApi = vi.hoisted(() => ({
  fetchCachedTodayAgentTasks: vi.fn(async () => todayTasks.value),
  fetchCachedDashboardOverview: vi.fn(async () => overview.value)
}))
const completeAgentTaskApi = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 1, status: 'DONE' }))
const getV3DashboardOverviewApi = vi.hoisted(() => vi.fn())
const getLatestJobReadinessApi = vi.hoisted(() => vi.fn())

vi.mock('@/composables/useUserHomeDataCache', () => ({
  fetchCachedTodayAgentTasks: homeCacheApi.fetchCachedTodayAgentTasks,
  fetchCachedDashboardOverview: homeCacheApi.fetchCachedDashboardOverview
}))
vi.mock('@/api/agent', () => ({ completeAgentTaskApi }))
vi.mock('@/api/dashboard', () => ({ getV3DashboardOverviewApi }))
vi.mock('@/api/jobRequirement', () => ({ getLatestJobReadinessApi }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/dashboard', fullPath: '/dashboard', meta: {} })
}))

const flush = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

const mountHome = () => mount(ArenaHomeView, {
  global: {
    stubs: {
      'el-avatar': true,
      'el-tooltip': { template: '<span><slot /></span>' }
    }
  }
})

describe('ArenaHomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    completeAgentTaskApi.mockClear()
    homeCacheApi.fetchCachedTodayAgentTasks.mockReset()
    homeCacheApi.fetchCachedDashboardOverview.mockReset()
    homeCacheApi.fetchCachedTodayAgentTasks.mockImplementation(async () => todayTasks.value)
    homeCacheApi.fetchCachedDashboardOverview.mockImplementation(async () => overview.value)
    getV3DashboardOverviewApi.mockResolvedValue({
      currentTargetJob: { targetJobId: 88 }
    })
    getLatestJobReadinessApi.mockResolvedValue({
      targetJobId: 88,
      readinessScore: 76,
      missingCount: 2,
      fallback: false,
      sampleInsufficient: false,
      dimensions: [],
      warnings: []
    })
    overview.value = {
      resumeCount: 1,
      interviewCount: 1,
      todayTaskCount: 3,
      todayCompletedTaskCount: 1,
      entryStatuses: [
        { key: 'resume', status: 'READY' },
        { key: 'job', status: 'READY' },
        { key: 'match', status: 'PENDING' },
        { key: 'evidence', status: 'READY' }
      ],
      recentReport: { reportId: 1, interviewId: 1, totalScore: 62 }
    }
    todayTasks.value = {
      tasks: [
        {
          id: 11,
          title: '做出一份能匹配的简历',
          reason: '通关后解锁 JD 精准匹配',
          status: 'TODO',
          taskType: 'RESUME_PREP',
          estimatedMinutes: 8
        },
        {
          id: 12,
          title: '贴一段目标 JD',
          reason: '锁定方向',
          status: 'TODO',
          taskType: 'JOB_TARGET',
          estimatedMinutes: 5
        },
        {
          id: 13,
          title: '轻量技术面 5 题',
          reason: '活动手感',
          status: 'TODO',
          taskType: 'QUESTION_PRACTICE',
          estimatedMinutes: 12
        }
      ]
    }
  })

  it('renders a priority task and follow-up tasks from real agent tasks', async () => {
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今日优先任务')
    expect(wrapper.text()).toContain('做出一份能匹配的简历')
    expect(wrapper.text()).toContain('约 8 分钟')
    expect(wrapper.text()).toContain('后续任务 1')
    expect(wrapper.text()).toContain('贴一段目标 JD')
    expect(wrapper.text()).toContain('后续任务 2')
    expect(wrapper.text()).toContain('轻量技术面 5 题')
  })

  it('shows the empty-first-quest state when there are no open missions', async () => {
    todayTasks.value = { tasks: [] }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今天还没有任务，先安排第一项')
    // mock 概览中已有简历（resumeCount=1），主行动为生成今日计划
    expect(wrapper.text()).toContain('生成今日计划')
  })

  it('does not present task-loading failure as an empty task list and recovers on retry', async () => {
    homeCacheApi.fetchCachedTodayAgentTasks
      .mockRejectedValueOnce(new Error('任务服务暂时不可用'))
      .mockResolvedValueOnce(todayTasks.value)
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今日任务尚未加载')
    expect(wrapper.text()).not.toContain('今天还没有任务，先安排第一项')

    await wrapper.findAll('button').find((button) => button.text().includes('重新加载任务'))!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('做出一份能匹配的简历')
    expect(wrapper.text()).not.toContain('今日任务尚未加载')
  })

  it('keeps successful tasks visible when only the overview request fails', async () => {
    homeCacheApi.fetchCachedDashboardOverview.mockRejectedValueOnce(new Error('资料服务暂时不可用'))
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('做出一份能匹配的简历')
    expect(wrapper.text()).toContain('资料概览暂时无法更新')
  })

  it('keeps an all-DONE Agent plan as completed instead of an ungenerated plan', async () => {
    todayTasks.value = {
      tasks: [
        { id: 31, title: '任务一', status: 'DONE' },
        { id: 32, title: '任务二', status: 'DONE' },
        { id: 33, title: '任务三', status: 'DONE' }
      ]
    }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今天的训练已全部完成')
    expect(wrapper.text()).toContain('查看今日完成记录')
    expect(wrapper.text()).not.toContain('今天还没有任务，先安排第一项')
  })

  it('falls back to resume creation when the user has no resume', async () => {
    todayTasks.value = { tasks: [] }
    overview.value = { ...overview.value, resumeCount: 0 }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('创建简历')
  })

  it('completes a task via the real api and updates progress state', async () => {
    const gameProfile = useGameProfileStore()
    const wrapper = mountHome()
    await flush()

    const primaryCompleteButton = wrapper
      .get('.arena-home__boss')
      .findAll('button')
      .find((btn) => btn.text().includes('标记为已完成'))
    expect(primaryCompleteButton).toBeTruthy()
    await primaryCompleteButton!.trigger('click')
    await flush()

    expect(completeAgentTaskApi).toHaveBeenCalledWith(11, { note: '用户在今日任务页标记完成' })
    expect(gameProfile.xp).toBe(150)
    expect(gameProfile.streakDays).toBe(1)
    expect(gameProfile.todayMissionDone).toBe(1)
    expect(wrapper.text()).not.toContain('做出一份能匹配的简历')
  })

  it('updates the daily completion record after all tasks are done', async () => {
    todayTasks.value = {
      tasks: [
        { id: 21, title: '唯一一关', status: 'TODO', taskType: 'JOB_TARGET', estimatedMinutes: 5 }
      ]
    }
    const gameProfile = useGameProfileStore()
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('唯一一关')
    await wrapper.findAll('button').find((btn) => btn.text().includes('标记为已完成'))!.trigger('click')
    await flush()

    expect(gameProfile.chestReady).toBe(true)
    expect(wrapper.text()).toContain('今日任务已全部完成')

    const chestButton = wrapper.findAll('button').find((btn) => btn.text().includes('确认完成'))
    expect(chestButton).toBeTruthy()
    await chestButton!.trigger('click')
    await flush()
    expect(gameProfile.xp).toBe(60 + 100)
  })

  it('renders the backend readiness snapshot instead of a client-side weighted score', async () => {
    const wrapper = mountHome()
    await flush()

    const hole = wrapper.get('.arena-ring__hole')
    expect(hole.text()).toContain('76')
    expect(wrapper.text()).toContain('仍有 2 项岗位要求待补齐')
    expect(getLatestJobReadinessApi).toHaveBeenCalledWith(88)
  })

  it('does not display a score when the only readiness snapshot is fallback evidence', async () => {
    getLatestJobReadinessApi.mockResolvedValue({
      targetJobId: 88,
      readinessScore: 92,
      fallback: true,
      sampleInsufficient: false,
      dimensions: [],
      warnings: []
    })
    const wrapper = mountHome()
    await flush()

    expect(wrapper.get('.arena-ring__hole').text()).toContain('--')
    expect(wrapper.text()).toContain('当前证据不足，暂不展示准备度分数')
  })

  it('keeps the full seven-day streak visible', async () => {
    const wrapper = mountHome()
    await flush()

    expect(wrapper.findAll('.arena-streak__day')).toHaveLength(7)
    expect(wrapper.text()).toContain('六')
    expect(wrapper.text()).toContain('日')
  })

  it('derives the weekday from the backend business date', async () => {
    overview.value = { ...overview.value, businessDate: '2026-08-09' }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('周日')
  })
})
