/**
 * game-profile · Pinia store（前端 mock 持久化层）
 *
 * 持久化：localStorage `codecoachai_game_profile_<userId>`，按用户隔离。
 * 边界：本 store 的数值（XP/等级/连胜/宝箱）为前端 mock，
 * 不写入任何真实业务接口、不参与真实统计、不出现在对外交付物。
 * 后端游戏化 API 就绪后：仅替换 hydrate/persist 为接口调用。
 */

import { defineStore } from 'pinia'

import { chestAvailable, levelOf, nextStreak, weeklyXpOf, xpOf, type XpEventKey } from './rules'
import type { GameProfileSnapshot, LevelInfo, XpGrant, XpRewardRecord } from './types'

const STORAGE_PREFIX = 'codecoachai_game_profile_'

function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeRewardRecords(value: unknown): XpRewardRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((record): XpRewardRecord[] => {
    if (!record || typeof record !== 'object') return []
    const source = record as Partial<XpRewardRecord>
    const xp = Math.max(0, Math.floor(Number(source.xp) || 0))
    const grantedAt = typeof source.grantedAt === 'string' ? source.grantedAt : ''
    if (!source.event || !source.label || !xp || Number.isNaN(new Date(grantedAt).getTime())) return []
    return [{
      event: String(source.event),
      xp,
      label: String(source.label),
      rewardKey: typeof source.rewardKey === 'string' && source.rewardKey.trim() ? source.rewardKey.trim() : null,
      grantedAt
    }]
  })
}

interface GameProfileState {
  userId: string | null
  xp: number
  streakDays: number
  streakLastDate: string | null
  missionProgressDate: string | null
  todayMissionDone: number
  todayMissionTotal: number
  chestClaimedDate: string | null
  xpRewards: XpRewardRecord[]
  hydrated: boolean
  /** 最近一次获得的经验（用于 +XP 动效展示，不落盘） */
  lastGrant: XpGrant | null
}

export const useGameProfileStore = defineStore('gameProfile', {
  state: (): GameProfileState => ({
    userId: null,
    xp: 0,
    streakDays: 0,
    streakLastDate: null,
    missionProgressDate: null,
    todayMissionDone: 0,
    todayMissionTotal: 0,
    chestClaimedDate: null,
    xpRewards: [],
    hydrated: false,
    lastGrant: null
  }),

  getters: {
    levelInfo(state): LevelInfo {
      return levelOf(state.xp)
    },
    chestReady(state): boolean {
      const today = todayStr()
      return state.missionProgressDate === today
        && chestAvailable(state.todayMissionDone, state.todayMissionTotal, state.chestClaimedDate, today)
    },
    /** 今日是否已记连胜 */
    streakTodayDone(state): boolean {
      return state.streakLastDate === todayStr()
    },
    weeklyXp(state): number {
      return weeklyXpOf(state.xpRewards)
    },
    rewardXpForPrefix: (state) => (prefix: string): number => {
      const normalized = prefix.trim()
      if (!normalized) return 0
      return state.xpRewards
        .filter((reward) => reward.rewardKey?.startsWith(normalized))
        .reduce((total, reward) => total + reward.xp, 0)
    },
    rewardCountForPrefix: (state) => (prefix: string): number => {
      const normalized = prefix.trim()
      if (!normalized) return 0
      return state.xpRewards.filter((reward) => reward.rewardKey?.startsWith(normalized)).length
    },
    rewardXpForKey: (state) => (rewardKey: string): number => {
      const normalized = rewardKey.trim()
      if (!normalized) return 0
      return state.xpRewards
        .filter((reward) => reward.rewardKey === normalized)
        .reduce((total, reward) => total + reward.xp, 0)
    }
  },

  actions: {
    /** 按用户装载（登录后/切换用户时调用） */
    hydrate(userId: string | number | null | undefined) {
      const id = userId == null || userId === '' ? 'guest' : String(userId)
      this.hydrated = false
      this.resetCounters()
      this.userId = id
      this.lastGrant = null
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + id)
        if (raw) {
          const snap = JSON.parse(raw) as Partial<GameProfileSnapshot>
          this.xp = Math.max(0, Number(snap.xp) || 0)
          this.streakDays = Math.max(0, Number(snap.streakDays) || 0)
          this.streakLastDate = typeof snap.streakLastDate === 'string' ? snap.streakLastDate : null
          this.missionProgressDate = typeof snap.missionProgressDate === 'string' ? snap.missionProgressDate : null
          this.todayMissionDone = Math.max(0, Number(snap.todayMissionDone) || 0)
          this.todayMissionTotal = Math.max(0, Number(snap.todayMissionTotal) || 0)
          this.chestClaimedDate = typeof snap.chestClaimedDate === 'string' ? snap.chestClaimedDate : null
          this.xpRewards = normalizeRewardRecords(snap.xpRewards)
        }
      } catch {
        // 已在装载前重置，损坏快照不应串用上一位用户的内存数据。
      }
      this.ensureMissionProgressForToday()
      this.hydrated = true
      this.persist()
    },

    persist() {
      if (!this.userId) return
      const snap: GameProfileSnapshot = {
        userId: this.userId,
        xp: this.xp,
        streakDays: this.streakDays,
        streakLastDate: this.streakLastDate,
        missionProgressDate: this.missionProgressDate,
        todayMissionDone: this.todayMissionDone,
        todayMissionTotal: this.todayMissionTotal,
        chestClaimedDate: this.chestClaimedDate,
        xpRewards: this.xpRewards,
        updatedAt: new Date().toISOString()
      }
      try {
        localStorage.setItem(STORAGE_PREFIX + this.userId, JSON.stringify(snap))
      } catch {
        // 存储失败不阻塞使用
      }
    },

    /** 发放经验（页面在真实业务动作成功后调用） */
    grantXp(event: XpEventKey): XpGrant {
      const grant = xpOf(event)
      this.recordXpGrant(grant, null)
      return grant
    },

    /**
     * 对稳定业务事件只发一次奖励。相同 rewardKey 即使重新进入页面或收到重复事件也不会重复入账。
     */
    grantXpOnce(event: XpEventKey, rewardKey: string): XpGrant | null {
      const normalizedKey = rewardKey.trim()
      if (!normalizedKey || this.xpRewards.some((reward) => reward.rewardKey === normalizedKey)) return null
      const grant = xpOf(event)
      this.recordXpGrant(grant, normalizedKey)
      return grant
    },

    recordXpGrant(grant: XpGrant, rewardKey: string | null) {
      this.xp += grant.xp
      this.lastGrant = grant
      this.xpRewards.push({
        ...grant,
        rewardKey,
        grantedAt: new Date().toISOString()
      })
      this.persist()
    },

    /** 同步今日关卡总数（来自 Agent 今日任务真接口） */
    syncMissionTotal(total: number) {
      this.ensureMissionProgressForToday()
      this.todayMissionTotal = Math.max(0, Math.floor(total))
      if (this.todayMissionDone > this.todayMissionTotal) {
        this.todayMissionDone = this.todayMissionTotal
      }
      this.persist()
    },

    /** 完成一关：推进宝箱进度并记连胜 */
    completeMission(): { streakDays: number; chestReady: boolean } {
      this.ensureMissionProgressForToday()
      this.todayMissionDone += 1
      const streakDays = this.recordActivity(false)
      this.persist()
      return { streakDays, chestReady: this.chestReady }
    },

    /** 记录一次有效活动，只影响连胜，不推进 Agent 每日任务进度。 */
    recordActivity(persist = true): number {
      this.ensureMissionProgressForToday()
      const [days, changed] = nextStreak(this.streakLastDate, todayStr(), this.streakDays)
      if (changed) {
        this.streakDays = days
        this.streakLastDate = todayStr()
      }
      if (persist) this.persist()
      return this.streakDays
    },

    /** 领取今日宝箱 */
    claimChest(): XpGrant | null {
      this.ensureMissionProgressForToday()
      if (!this.chestReady) return null
      this.chestClaimedDate = todayStr()
      const grant = this.grantXp('daily_chest')
      return grant
    },

    resetCounters() {
      this.xp = 0
      this.streakDays = 0
      this.streakLastDate = null
      this.missionProgressDate = null
      this.todayMissionDone = 0
      this.todayMissionTotal = 0
      this.chestClaimedDate = null
      this.xpRewards = []
    },

    ensureMissionProgressForToday() {
      const today = todayStr()
      if (this.missionProgressDate === today) return
      this.missionProgressDate = today
      this.todayMissionDone = 0
      this.todayMissionTotal = 0
    },

    clearLastGrant() {
      this.lastGrant = null
    },

    /** 登出清理（不落盘，仅清内存） */
    resetSession() {
      this.resetCounters()
      this.userId = null
      this.hydrated = false
      this.lastGrant = null
    }
  }
})
