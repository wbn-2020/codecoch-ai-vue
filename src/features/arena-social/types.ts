/**
 * arena-social · 类型定义
 * 排行榜 / 多人竞技的共享数据结构。
 * 边界：当前全部为前端 mock，后端社交接口就绪后仅替换 adapter 实现，类型保持不变。
 */

/** 竞技玩家（排行榜条目） */
export interface ArenaPlayer {
  id: string
  name: string
  avatar: string
  level: number
  title: string
  xp: number
  weekXp: number
  streakDays: number
  rankPoints: number
  /** 当前登录用户标记 */
  isMe?: boolean
}

export type LeaderboardScope = 'week' | 'all'
export type LeaderboardDimension = 'xp' | 'streak'

/** 段位 */
export interface RankTier {
  key: string
  label: string
  icon: string
  /** 达到该段位所需最低积分 */
  minPoints: number
  color: string
}

/** 对战题目（mock） */
export interface BattleQuestion {
  id: number
  skill: string
  question: string
  options: string[]
  answerIndex: number
  analysis: string
}

/** 对战结果 */
export interface BattleResult {
  id: string
  opponentName: string
  opponentAvatar: string
  myScore: number
  opponentScore: number
  outcome: 'win' | 'lose' | 'draw'
  pointsDelta: number
  playedAt: string
}

/** 我的竞技档案（mock 持久化） */
export interface ArenaSocialProfile {
  rankPoints: number
  wins: number
  losses: number
  draws: number
  records: BattleResult[]
}
