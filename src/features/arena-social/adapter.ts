/**
 * arena-social · mock adapter（Promise 接口，与后端就绪后的真实实现保持同签名）
 *
 * 持久化：localStorage `codecoachai_arena_social_<userId>`，按用户隔离。
 * 替换指引：后端社交接口就绪后，将 fetch* / save* 实现改为 HTTP 调用，类型与函数签名不变。
 */

import { levelOf } from '@/features/game-profile/rules'

import { DEFAULT_RANK_POINTS, DRAW_POINTS, LOSE_POINTS, MOCK_PLAYERS, RANK_TIERS, WIN_POINTS } from './mock'
import type {
  ArenaPlayer,
  ArenaSocialProfile,
  BattleResult,
  LeaderboardDimension,
  LeaderboardScope,
  RankTier
} from './types'

const STORAGE_PREFIX = 'codecoachai_arena_social_'

const storageKey = (userId: string | number | null | undefined) =>
  STORAGE_PREFIX + (userId == null || userId === '' ? 'guest' : String(userId))

/** 积分 → 段位 */
export function tierOf(points: number): RankTier {
  let tier = RANK_TIERS[0]
  for (const candidate of RANK_TIERS) {
    if (points >= candidate.minPoints) tier = candidate
  }
  return tier
}

/** 下一段位信息 */
export function nextTierOf(points: number): { tier: RankTier; gap: number } | null {
  for (const candidate of RANK_TIERS) {
    if (points < candidate.minPoints) {
      return { tier: candidate, gap: candidate.minPoints - points }
    }
  }
  return null
}

/** 读取我的竞技档案（mock 持久化） */
export function loadSocialProfile(userId: string | number | null | undefined): ArenaSocialProfile {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ArenaSocialProfile>
      return {
        rankPoints: Math.max(0, Number(parsed.rankPoints) || DEFAULT_RANK_POINTS),
        wins: Math.max(0, Number(parsed.wins) || 0),
        losses: Math.max(0, Number(parsed.losses) || 0),
        draws: Math.max(0, Number(parsed.draws) || 0),
        records: Array.isArray(parsed.records) ? parsed.records.slice(0, 20) : []
      }
    }
  } catch {
    // 存储损坏时按初始档案返回
  }
  return { rankPoints: DEFAULT_RANK_POINTS, wins: 0, losses: 0, draws: 0, records: [] }
}

function persistSocialProfile(userId: string | number | null | undefined, profile: ArenaSocialProfile) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile))
  } catch {
    // 存储失败不阻塞使用
  }
}

export interface MyArenaInfo {
  userId: string | number | null | undefined
  name: string
  avatar: string
  xp: number
  streakDays: number
}

/** 组装"我"的排行榜条目（真 gameProfile 数值 + mock 段位） */
function toMeEntry(me: MyArenaInfo): ArenaPlayer {
  const level = levelOf(me.xp)
  const profile = loadSocialProfile(me.userId)
  return {
    id: 'me',
    name: me.name || '我',
    avatar: me.avatar || '😎',
    level: level.level,
    title: level.title,
    xp: me.xp,
    weekXp: Math.min(me.xp, 200),
    streakDays: me.streakDays,
    rankPoints: profile.rankPoints,
    isMe: true
  }
}

const dimensionValue = (player: ArenaPlayer, scope: LeaderboardScope, dimension: LeaderboardDimension) => {
  if (dimension === 'streak') return player.streakDays
  return scope === 'week' ? player.weekXp : player.xp
}

/**
 * 排行榜：mock 玩家池 + 当前用户（真数据注入）合并排序。
 * 返回前 20 名与我的名次。
 */
export async function fetchLeaderboard(
  me: MyArenaInfo,
  scope: LeaderboardScope,
  dimension: LeaderboardDimension
): Promise<{ entries: ArenaPlayer[]; myRank: number }> {
  const merged = [...MOCK_PLAYERS, toMeEntry(me)]
  merged.sort((a, b) => dimensionValue(b, scope, dimension) - dimensionValue(a, scope, dimension))
  const entries = merged.slice(0, 20)
  const myRank = merged.findIndex((player) => player.isMe) + 1
  return Promise.resolve({ entries, myRank })
}

/** 匹配一个 mock 对手（按我的积分就近取，带随机扰动） */
export async function matchOpponent(userId: string | number | null | undefined): Promise<ArenaPlayer> {
  const profile = loadSocialProfile(userId)
  const candidates = MOCK_PLAYERS
    .map((player) => ({ player, distance: Math.abs(player.rankPoints - profile.rankPoints) + Math.random() * 300 }))
    .sort((a, b) => a.distance - b.distance)
  return Promise.resolve(candidates[0].player)
}

/** 记录一场对战结果，更新积分与战绩 */
export async function saveBattleResult(
  userId: string | number | null | undefined,
  result: Omit<BattleResult, 'pointsDelta' | 'playedAt'>
): Promise<ArenaSocialProfile> {
  const profile = loadSocialProfile(userId)
  const pointsDelta = result.outcome === 'win' ? WIN_POINTS : result.outcome === 'lose' ? LOSE_POINTS : DRAW_POINTS
  const record: BattleResult = {
    ...result,
    pointsDelta,
    playedAt: new Date().toISOString()
  }
  const next: ArenaSocialProfile = {
    rankPoints: Math.max(0, profile.rankPoints + pointsDelta),
    wins: profile.wins + (result.outcome === 'win' ? 1 : 0),
    losses: profile.losses + (result.outcome === 'lose' ? 1 : 0),
    draws: profile.draws + (result.outcome === 'draw' ? 1 : 0),
    records: [record, ...profile.records].slice(0, 20)
  }
  persistSocialProfile(userId, next)
  return Promise.resolve(next)
}
