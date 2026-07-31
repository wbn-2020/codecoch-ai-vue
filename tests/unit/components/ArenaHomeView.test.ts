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
const completeAgentTaskApi = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 1, status: 'DONE' }))

vi.mock('@/composables/useUserHomeDataCache', () => ({
  fetchCachedTodayAgentTasks: vi.fn(async () => todayTasks.value),
  fetchCachedDashboardOverview: vi.fn(async () => overview.value)
}))
vi.mock('@/api/agent', () => ({ completeAgentTaskApi }))
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

  it('renders three missions with boss and side quests from real agent tasks', async () => {
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('第 1 关 · Boss')
    expect(wrapper.text()).toContain('做出一份能匹配的简历')
    expect(wrapper.text()).toContain('+150 经验')
    expect(wrapper.text()).toContain('支线 2')
    expect(wrapper.text()).toContain('贴一段目标 JD')
    expect(wrapper.text()).toContain('支线 3')
    expect(wrapper.text()).toContain('轻量技术面 5 题')
  })

  it('shows the empty-first-quest state when there are no open missions', async () => {
    todayTasks.value = { tasks: [] }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('今天还没有关卡，先开第一关')
    // mock 概览中已有简历（resumeCount=1），主行动为生成今日计划
    expect(wrapper.text()).toContain('去生成今日计划')
  })

  it('falls back to resume creation when the user has no resume', async () => {
    todayTasks.value = { tasks: [] }
    overview.value = { ...overview.value, resumeCount: 0 }
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('8 分钟创建简历')
  })

  it('completes a mission via the real api and banks xp into game profile', async () => {
    const gameProfile = useGameProfileStore()
    const wrapper = mountHome()
    await flush()

    const completeButtons = wrapper.findAll('button').filter((btn) => btn.text().includes('已完成，收下经验'))
    expect(completeButtons.length).toBe(1)
    await completeButtons[0].trigger('click')
    await flush()

    expect(completeAgentTaskApi).toHaveBeenCalledWith(11, { note: '用户在竞技场首页标记完成' })
    expect(gameProfile.xp).toBe(150)
    expect(gameProfile.streakDays).toBe(1)
    expect(gameProfile.todayMissionDone).toBe(1)
    expect(wrapper.text()).not.toContain('做出一份能匹配的简历')
  })

  it('grants the daily chest after all missions are done', async () => {
    todayTasks.value = {
      tasks: [
        { id: 21, title: '唯一一关', status: 'TODO', taskType: 'JOB_TARGET', estimatedMinutes: 5 }
      ]
    }
    const gameProfile = useGameProfileStore()
    const wrapper = mountHome()
    await flush()

    expect(wrapper.text()).toContain('唯一一关')
    await wrapper.findAll('button').find((btn) => btn.text().includes('已完成，收下经验'))!.trigger('click')
    await flush()

    expect(gameProfile.chestReady).toBe(true)
    expect(wrapper.text()).toContain('今日宝箱可以开了')

    const chestButton = wrapper.findAll('button').find((btn) => btn.text().includes('开箱'))
    expect(chestButton).toBeTruthy()
    await chestButton!.trigger('click')
    await flush()
    expect(gameProfile.xp).toBe(60 + 100)
  })

  it('computes power ring from readiness overview data', async () => {
    const wrapper = mountHome()
    await flush()

    const hole = wrapper.get('.arena-ring__hole')
    const score = Number(hole.text().replace(/[^\d]/g, ''))
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
