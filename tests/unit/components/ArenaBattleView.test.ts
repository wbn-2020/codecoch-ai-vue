import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ArenaBattleView from '@/views/arena/ArenaBattleView.vue'
import { useGameProfileStore } from '@/features/game-profile'

const routerPush = vi.hoisted(() => vi.fn())
const arenaSocial = vi.hoisted(() => ({
  loadSocialProfile: vi.fn(),
  matchOpponent: vi.fn(),
  saveBattleResult: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/features/arena-social', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/arena-social')>()
  return {
    ...actual,
    loadSocialProfile: arenaSocial.loadSocialProfile,
    matchOpponent: arenaSocial.matchOpponent,
    saveBattleResult: arenaSocial.saveBattleResult
  }
})

const initialProfile = {
  rankPoints: 1_000,
  wins: 0,
  losses: 0,
  draws: 0,
  records: []
}

const findButton = (wrapper: ReturnType<typeof mount>, text: string) => {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  return button
}

describe('ArenaBattleView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    routerPush.mockReset()
    arenaSocial.loadSocialProfile.mockReturnValue(initialProfile)
    arenaSocial.matchOpponent.mockResolvedValue({
      id: 'opponent-1',
      name: '周子墨',
      avatar: '🦊',
      level: 5,
      title: '面试新星',
      xp: 1_000,
      weekXp: 180,
      streakDays: 3,
      rankPoints: 1_100
    })
    arenaSocial.saveBattleResult.mockImplementation(async (_userId, result) => ({
      rankPoints: 1_025,
      wins: 1,
      losses: 0,
      draws: 0,
      records: [{
        ...result,
        pointsDelta: 25,
        playedAt: '2026-07-31T10:00:00.000Z'
      }]
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts matching and can cancel before the battle begins', async () => {
    const wrapper = mount(ArenaBattleView)

    await findButton(wrapper, '开始匹配').trigger('click')
    await flushPromises()

    expect(arenaSocial.matchOpponent).toHaveBeenCalledOnce()
    expect(wrapper.find('.arena-bt__matching').exists()).toBe(true)

    await findButton(wrapper, '取消匹配').trigger('click')
    expect(wrapper.find('.arena-bt__matching').exists()).toBe(false)
    wrapper.unmount()
  })

  it('clears matching timers when the view is unmounted', async () => {
    const wrapper = mount(ArenaBattleView)

    await findButton(wrapper, '开始匹配').trigger('click')
    await flushPromises()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('settles one battle once and grants its XP once', async () => {
    const wrapper = mount(ArenaBattleView)
    const gameProfile = useGameProfileStore()

    await findButton(wrapper, '开始匹配').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1_400)
    await flushPromises()

    expect(wrapper.find('.arena-bt__question').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(115_000)
    await flushPromises()

    expect(arenaSocial.saveBattleResult).toHaveBeenCalledOnce()
    expect(gameProfile.xp).toBe(90)
    expect(wrapper.text()).toContain('再来一局')

    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()
    expect(arenaSocial.saveBattleResult).toHaveBeenCalledOnce()
    expect(gameProfile.xp).toBe(90)
    wrapper.unmount()
  })
})
