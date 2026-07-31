/**
 * game-profile · Pinia store（前端 mock 持久化层）
 *
 * 持久化：localStorage `codecoachai_game_profile_<userId>`，按用户隔离。
 * 边界：本 store 的数值（XP/等级/连胜/宝箱）为前端 mock，
 * 不写入任何真实业务接口、不参与真实统计、不出现在对外交付物。
 * 后端游戏化 API 就绪后：仅替换 hydrate/persist 为接口调用。
 */

import { defineStore } from 'pinia'

import { chestAvailable, levelOf, nextStreak, xpOf, type XpEventKey } from './rules'
import type { GameProfileSnapshot, LevelInfo, XpGrant } from './types'

const STORAGE_PREFIX = 'codecoachai_game_profile_'

function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface GameProfileState {
  userId: string | null
  xp: number
  streakDays: number
  streakLastDate: string | null
  todayMissionDone: number
  todayMissionTotal: number
  chestClaimedDate: string | null
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
    todayMissionDone: 0,
    todayMissionTotal: 0,
    chestClaimedDate: null,
    hydrated: false,
    lastGrant: null
  }),

  getters: {
    levelInfo(state): LevelInfo {
      return levelOf(state.xp)
    },
    chestReady(state): boolean {
      return chestAvailable(state.todayMissionDone, state.todayMissionTotal, state.chestClaimedDate, todayStr())
    },
    /** 今日是否已记连胜 */
    streakTodayDone(state): boolean {
      return state.streakLastDate === todayStr()
    }
  },

  actions: {
    /** 按用户装载（登录后/切换用户时调用） */
    hydrate(userId: string | number | null | undefined) {
      const id = userId == null || userId === '' ? 'guest' : String(userId)
      this.userId = id
      this.lastGrant = null
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + id)
        if (raw) {
          const snap = JSON.parse(raw) as Partial<GameProfileSnapshot>
          this.xp = Math.max(0, Number(snap.xp) || 0)
          this.streakDays = Math.max(0, Number(snap.streakDays) || 0)
          this.streakLastDate = typeof snap.streakLastDate === 'string' ? snap.streakLastDate : null
          this.todayMissionDone = Math.max(0, Number(snap.todayMissionDone) || 0)
          this.todayMissionTotal = Math.max(0, Number(snap.todayMissionTotal) || 0)
          this.chestClaimedDate = typeof snap.chestClaimedDate === 'string' ? snap.chestClaimedDate : null
        } else {
          this.resetCounters()
        }
      } catch {
        this.resetCounters()
      }
      // 跨天清理：今日任务进度与宝箱日期不属于今天则归零
      if (this.chestClaimedDate && this.chestClaimedDate !== todayStr()) {
        // chestClaimedDate 保留作历史判断，无需改动
      }
      this.hydrated = true
    },

    persist() {
      if (!this.userId) return
      const snap: GameProfileSnapshot = {
        userId: this.userId,
        xp: this.xp,
        streakDays: this.streakDays,
        streakLastDate: this.streakLastDate,
        todayMissionDone: this.todayMissionDone,
        todayMissionTotal: this.todayMissionTotal,
        chestClaimedDate: this.chestClaimedDate,
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
      this.xp += grant.xp
      this.lastGrant = grant
      this.persist()
      return grant
    },

    /** 同步今日关卡总数（来自 Agent 今日任务真接口） */
    syncMissionTotal(total: number) {
      this.todayMissionTotal = Math.max(0, Math.floor(total))
      if (this.todayMissionDone > this.todayMissionTotal) {
        this.todayMissionDone = this.todayMissionTotal
      }
      this.persist()
    },

    /** 完成一关：推进宝箱进度并记连胜 */
    completeMission(): { streakDays: number; chestReady: boolean } {
      this.todayMissionDone += 1
      const [days, changed] = nextStreak(this.streakLastDate, todayStr(), this.streakDays)
      if (changed) {
        this.streakDays = days
        this.streakLastDate = todayStr()
      }
      this.persist()
      return { streakDays: this.streakDays, chestReady: this.chestReady }
    },

    /** 领取今日宝箱 */
    claimChest(): XpGrant | null {
      if (!this.chestReady) return null
      this.chestClaimedDate = todayStr()
      const grant = this.grantXp('daily_chest')
      return grant
    },

    resetCounters() {
      this.xp = 0
      this.streakDays = 0
      this.streakLastDate = null
      this.todayMissionDone = 0
      this.todayMissionTotal = 0
      this.chestClaimedDate = null
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
