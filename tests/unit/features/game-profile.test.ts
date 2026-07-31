import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  chestAvailable,
  computePower,
  levelOf,
  nextStreak,
  titleOf,
  useGameProfileStore,
  xpForLevel,
  xpOf
} from '@/features/game-profile'

describe('game-profile rules', () => {
  it('xp events expose stable xp values', () => {
    expect(xpOf('interview_complete')).toMatchObject({ xp: 200 })
    expect(xpOf('daily_chest')).toMatchObject({ xp: 100 })
    expect(xpOf('jd_paste').label).toContain('JD')
  })

  it('level curve grows 25% per level', () => {
    expect(xpForLevel(1)).toBe(200)
    expect(xpForLevel(2)).toBe(250)
    expect(xpForLevel(3)).toBe(313) // 200 * 1.25^2 = 312.5 → 313
  })

  it('levelOf walks the curve from total xp', () => {
    expect(levelOf(0)).toMatchObject({ level: 1, curLevelXp: 0, nextLevelXp: 200, progress: 0 })
    expect(levelOf(200).level).toBe(2)
    expect(levelOf(1240).level).toBeGreaterThanOrEqual(4)
    const info = levelOf(260)
    expect(info).toMatchObject({ level: 2, curLevelXp: 60, nextLevelXp: 250 })
    expect(info.progress).toBeCloseTo(0.24, 2)
  })

  it('titles clamp at both ends', () => {
    expect(titleOf(1)).toBe('求职新手')
    expect(titleOf(999)).toBe('职场传说')
  })

  it('computePower weights four dimensions and clamps input', () => {
    expect(computePower({ resume: 100, job: 100, training: 100, interview: 100 })).toBe(100)
    expect(computePower({ resume: 0, job: 0, training: 0, interview: 0 })).toBe(0)
    expect(computePower({ resume: 80, job: 60, training: 70, interview: 50 })).toBe(67)
    expect(computePower({ resume: 500, job: -3, training: Number.NaN, interview: 100 })).toBe(50)
  })

  it('nextStreak keeps / extends / resets correctly', () => {
    expect(nextStreak('2026-07-31', '2026-07-31', 6)).toEqual([6, false])
    expect(nextStreak('2026-07-30', '2026-07-31', 6)).toEqual([7, true])
    expect(nextStreak('2026-07-20', '2026-07-31', 6)).toEqual([1, true])
    expect(nextStreak(null, '2026-07-31', 0)).toEqual([1, true])
    expect(nextStreak('2026-07-30', '', 6)).toEqual([6, false])
  })

  it('chest requires all missions done and not yet claimed', () => {
    expect(chestAvailable(3, 3, null, '2026-07-31')).toBe(true)
    expect(chestAvailable(2, 3, null, '2026-07-31')).toBe(false)
    expect(chestAvailable(3, 3, '2026-07-31', '2026-07-31')).toBe(false)
    expect(chestAvailable(0, 0, null, '2026-07-31')).toBe(false)
  })
})

describe('game-profile store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('hydrates empty profile for a new user and persists grants', () => {
    const store = useGameProfileStore()
    store.hydrate(42)
    expect(store.xp).toBe(0)
    expect(store.levelInfo.title).toBe('求职新手')

    store.grantXp('resume_create')
    store.grantXp('jd_paste')
    expect(store.xp).toBe(210)
    expect(store.levelInfo.level).toBe(2)
    expect(store.lastGrant).toMatchObject({ event: 'jd_paste', xp: 60 })

    const raw = localStorage.getItem('codecoachai_game_profile_42')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).xp).toBe(210)
  })

  it('isolates profiles per user id', () => {
    const store = useGameProfileStore()
    store.hydrate('alice')
    store.grantXp('warmup_5')

    store.hydrate('bob')
    expect(store.xp).toBe(0)

    store.hydrate('alice')
    expect(store.xp).toBe(90)
  })

  it('completeMission advances missions and streak once per day', () => {
    const store = useGameProfileStore()
    store.hydrate(7)
    store.syncMissionTotal(3)

    const first = store.completeMission()
    expect(store.todayMissionDone).toBe(1)
    expect(first.streakDays).toBe(1)

    const second = store.completeMission()
    expect(second.streakDays).toBe(1) // 同一天不重复记连胜
    expect(store.chestReady).toBe(false)

    store.completeMission()
    expect(store.chestReady).toBe(true)
  })

  it('claimChest grants xp only when ready and only once', () => {
    const store = useGameProfileStore()
    store.hydrate(9)
    expect(store.claimChest()).toBeNull()

    store.syncMissionTotal(1)
    store.completeMission()
    const grant = store.claimChest()
    expect(grant).toMatchObject({ event: 'daily_chest', xp: 100 })
    expect(store.xp).toBe(100)
    expect(store.claimChest()).toBeNull()
  })

  it('syncMissionTotal clamps done count', () => {
    const store = useGameProfileStore()
    store.hydrate(11)
    store.syncMissionTotal(3)
    store.completeMission()
    store.completeMission()
    store.syncMissionTotal(1)
    expect(store.todayMissionDone).toBe(1)
    expect(store.todayMissionTotal).toBe(1)
  })
})
