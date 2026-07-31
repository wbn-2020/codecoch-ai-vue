/**
 * game-profile · 数值规则（纯函数，可单测）
 * 规则基线：文档相关/ui重构/2026-07-30-D方向霓虹竞技场落地方案.md 第 3 节
 */

import type { LevelInfo, PowerInput, XpGrant, XpRewardRecord } from './types'

/** XP 事件表：key 稳定，后端补机制时直接对齐 */
export const XP_EVENTS = {
  resume_create: { xp: 150, label: '做出能匹配的简历' },
  resume_section: { xp: 40, label: '完善简历模块' },
  jd_paste: { xp: 60, label: '录入目标岗位信息' },
  jd_cover_boost: { xp: 120, label: '补齐 JD 缺失词' },
  warmup_5: { xp: 90, label: '轻量热身 5 题' },
  practice_correct: { xp: 18, label: '答对题目' },
  interview_complete: { xp: 200, label: '完成模拟面试' },
  daily_chest: { xp: 100, label: '开启每日宝箱' }
} as const

export type XpEventKey = keyof typeof XP_EVENTS

export function xpOf(event: XpEventKey): XpGrant {
  const rule = XP_EVENTS[event]
  return { event, xp: rule.xp, label: rule.label }
}

// ---- 等级 ----
/** LV1→2 需 200 XP，每级递增 25% */
export const LEVEL_BASE_XP = 200
export const LEVEL_GROWTH = 1.25

export const LEVEL_TITLES = [
  '求职新手',
  '面试学徒',
  '闯关达人',
  '面试新星',
  '面试老手',
  'Offer 猎手',
  '面霸',
  '职场传说'
] as const

/** 从 level 升到 level+1 所需经验（level 从 1 起） */
export function xpForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level))
  return Math.round(LEVEL_BASE_XP * LEVEL_GROWTH ** (lv - 1))
}

export function titleOf(level: number): string {
  const idx = Math.min(Math.max(1, Math.floor(level)), LEVEL_TITLES.length) - 1
  return LEVEL_TITLES[idx]
}

/** 由总经验换算等级信息 */
export function levelOf(totalXp: number): LevelInfo {
  let rest = Math.max(0, Math.floor(totalXp))
  let level = 1
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level)
    level += 1
  }
  const need = xpForLevel(level)
  return {
    level,
    title: titleOf(level),
    curLevelXp: rest,
    nextLevelXp: need,
    progress: need > 0 ? Math.min(1, rest / need) : 0
  }
}

// ---- 战力 ----
/** 战力 = 简历 30% + 岗位 20% + 训练 30% + 面试 20%（各项 0-100） */
export const POWER_WEIGHTS = {
  resume: 0.3,
  job: 0.2,
  training: 0.3,
  interview: 0.2
} as const

export function computePower(input: PowerInput): number {
  const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0))
  const score =
    clamp(input.resume) * POWER_WEIGHTS.resume +
    clamp(input.job) * POWER_WEIGHTS.job +
    clamp(input.training) * POWER_WEIGHTS.training +
    clamp(input.interview) * POWER_WEIGHTS.interview
  return Math.round(score)
}

// ---- 连胜 ----
/**
 * 连胜推进规则：
 * - 今天已记过 → 不变
 * - 上次是昨天 → +1
 * - 否则 → 从 1 重计
 * @returns [新的连胜天数, 是否发生了变化]
 */
export function nextStreak(
  streakLastDate: string | null,
  today: string,
  currentDays: number
): [number, boolean] {
  if (!today) return [currentDays, false]
  if (streakLastDate === today) return [currentDays, false]
  const last = streakLastDate ? new Date(`${streakLastDate}T00:00:00`) : null
  const now = new Date(`${today}T00:00:00`)
  const diffDays = last ? Math.round((now.getTime() - last.getTime()) / 86400000) : Number.POSITIVE_INFINITY
  if (diffDays === 1) return [currentDays + 1, true]
  return [1, true]
}

/** 每日宝箱：今日关数全部完成且未领取时可开 */
export function chestAvailable(done: number, total: number, chestClaimedDate: string | null, today: string): boolean {
  return total > 0 && done >= total && chestClaimedDate !== today
}

/** 当前本地周的周一 00:00 时间戳。 */
export function weekStartTimestamp(now = new Date()): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start.getTime()
}

/** 只汇总当前本地周内有可靠入账时间的经验记录。 */
export function weeklyXpOf(rewards: XpRewardRecord[], now = new Date()): number {
  const weekStart = weekStartTimestamp(now)
  const nowTime = now.getTime()
  return rewards.reduce((total, reward) => {
    const grantedAt = new Date(reward.grantedAt).getTime()
    if (!Number.isFinite(grantedAt) || grantedAt < weekStart || grantedAt > nowTime) return total
    return total + Math.max(0, Math.floor(Number(reward.xp) || 0))
  }, 0)
}
