import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

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
    completeAgentTaskApi.mockResolvedValue({ id: 1, status: 'DONE' })
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

  it('renders the prototype task checklist from real agent tasks', async () => {
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('先把今天的 3 项任务清掉')
    expect(wrapper.text()).toContain('今日任务清单')
    expect(wrapper.text()).toContain('0 / 3')
    expect(wrapper.text()).toContain('优先完成「做出一份能匹配的简历」')
    expect(wrapper.text()).toContain('通关后解锁 JD 精准匹配')

    const rows = wrapper.findAll('.arena-home__task')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('做出一份能匹配的简历')
    expect(rows[0].text()).toContain('8 分钟')
    expect(rows[0].find('input[type="checkbox"]').element.checked).toBe(false)
    expect(rows[1].text()).toContain('贴一段目标 JD')
    expect(rows[2].text()).toContain('轻量技术面 5 题')
  })

  it('shows the empty-first-quest guide when there are no open missions', async () => {
    todayTasks.value = { tasks: [] }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('安排第一项任务')
    expect(wrapper.text()).toContain('先安排第一项任务，把今天的闭环跑通')
    expect(wrapper.text()).toContain('新的一天 · 约 8 分钟起步')
    // mock 概览中已有简历（resumeCount=1），主行动为生成今日计划
    const cta = wrapper.findAll('button').find((button) => button.text().includes('生成今日计划'))
    expect(cta).toBeTruthy()
  })

  it('does not present task-loading failure as an empty task list and recovers on retry', async () => {
    homeCacheApi.fetchCachedTodayAgentTasks
      .mockRejectedValueOnce(new Error('任务服务暂时不可用'))
      .mockResolvedValueOnce(todayTasks.value)
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今日任务尚未加载')
    expect(wrapper.text()).toContain('任务服务暂时不可用')
    expect(wrapper.text()).not.toContain('先安排第一项任务，把今天的闭环跑通')

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

    expect(wrapper.text()).toContain('今日计划已完成')
    expect(wrapper.text()).toContain('今天的训练已全部完成')
    expect(wrapper.text()).toContain('查看今日完成记录')
    expect(wrapper.text()).toContain('3 / 3')
    expect(wrapper.findAll('.arena-home__task')).toHaveLength(3)
    for (const row of wrapper.findAll('.arena-home__task')) {
      expect(row.find('input[type="checkbox"]').element.checked).toBe(true)
    }
    expect(wrapper.text()).not.toContain('先生成今日计划')
  })

  it('falls back to resume creation when the user has no resume', async () => {
    todayTasks.value = { tasks: [] }
    overview.value = { ...overview.value, resumeCount: 0 }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('先完成一份可用简历')
    const cta = wrapper.findAll('button').find((button) => button.text().includes('创建简历'))
    expect(cta).toBeTruthy()
  })

  it('completes a task via the real api and keeps it checked in the list', async () => {
    const gameProfile = useGameProfileStore()
    const wrapper = mountHome()
    await flush()

    const firstCompleteButton = wrapper
      .findAll('.arena-home__task')
      .find((row) => row.text().includes('做出一份能匹配的简历'))!
      .findAll('button')
      .find((btn) => btn.text().includes('标记为已完成'))
    expect(firstCompleteButton).toBeTruthy()
    await firstCompleteButton!.trigger('click')
    await flush()

    expect(completeAgentTaskApi).toHaveBeenCalledWith(11, { note: '用户在今日任务页标记完成' })
    expect(gameProfile.xp).toBe(150)
    expect(gameProfile.streakDays).toBe(1)
    expect(gameProfile.todayMissionDone).toBe(1)

    const completedRow = wrapper
      .findAll('.arena-home__task')
      .find((row) => row.text().includes('做出一份能匹配的简历'))!
    expect(completedRow.find('input[type="checkbox"]').element.checked).toBe(true)
    expect(wrapper.text()).toContain('1 / 3')
  })

  it('surfaces a failed completion without checking the task off', async () => {
    completeAgentTaskApi.mockRejectedValueOnce(new Error('任务服务暂时不可用'))
    const wrapper = mountHome()
    await flush()

    const firstCompleteButton = wrapper
      .findAll('.arena-home__task')
      .find((row) => row.text().includes('做出一份能匹配的简历'))!
      .findAll('button')
      .find((btn) => btn.text().includes('标记为已完成'))
    await firstCompleteButton!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('任务服务暂时不可用')
    const row = wrapper
      .findAll('.arena-home__task')
      .find((item) => item.text().includes('做出一份能匹配的简历'))!
    expect(row.find('input[type="checkbox"]').element.checked).toBe(false)
    expect(wrapper.text()).toContain('0 / 3')
  })

  it('renders the backend readiness snapshot instead of a client-side weighted score', async () => {
    const wrapper = mountHome()
    await flush()

    const readinessMetric = wrapper.get('[data-testid="readiness-metric"]')
    expect(readinessMetric.text()).toContain('76')
    expect(wrapper.text()).toContain('仍有 2 项岗位要求待补齐')
    expect(getLatestJobReadinessApi).toHaveBeenCalledWith(88, {
      silentError: true
    })
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

    expect(wrapper.get('[data-testid="readiness-metric"]').text()).toContain('--')
    expect(wrapper.text()).toContain('当前证据不足，暂不展示准备度分数')
  })

  it('derives the weekday from the backend business date', async () => {
    overview.value = { ...overview.value, businessDate: '2026-08-09' }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.get('.cc-hero-band__eyebrow').text()).toContain('周日')
  })

  it('uses the prototype two-column workspace structure for the task and stat rails', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/views/user/ArenaHomeView.vue'), 'utf8')

    expect(source).toContain('width: min(100%, var(--user-content-max, 1440px));')
    expect(source).toContain('grid-template-columns: 2fr 1fr;')
    expect(source).toContain('今日任务清单')
    expect(source).toContain('Offer 就绪度')
    expect(source).toContain('本周完成度')
    expect(source).toContain('建议依据')
  })
})
