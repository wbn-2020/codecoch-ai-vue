/**
 * game-profile · D 方向「霓虹竞技场」游戏化数值类型
 *
 * 边界说明：本模块是前端 gameProfile mock 层。
 * XP / 等级 / 宝箱 / 连胜等数值暂无后端接口支撑，
 * 由本层定义规则并持久化到 localStorage（按用户隔离）。
 * 后端游戏化 API 就绪后，仅需替换 store 的 hydrate/persist 实现，
 * 页面组件与数值规则零改动。
 */

export interface LevelInfo {
  level: number
  title: string
  /** 当前等级已积累的经验（级内） */
  curLevelXp: number
  /** 升到下一级所需经验（级内） */
  nextLevelXp: number
  /** 级内进度 0-1 */
  progress: number
}

export interface PowerInput {
  /** 简历完备度 0-100（readiness 简历维度） */
  resume: number
  /** 岗位明确度 0-100（readiness 岗位维度） */
  job: number
  /** 训练活跃度 0-100 */
  training: number
  /** 面试表现 0-100 */
  interview: number
}

export interface XpGrant {
  event: string
  xp: number
  label: string
}

/**
 * 已入账经验记录。
 * rewardKey 用于业务事件幂等；为空表示该奖励不需要跨会话去重。
 */
export interface XpRewardRecord extends XpGrant {
  rewardKey: string | null
  grantedAt: string
}

export interface GameProfileSnapshot {
  userId: string
  xp: number
  streakDays: number
  /** 最近一次记连胜的日期 YYYY-MM-DD */
  streakLastDate: string | null
  /** 今日任务进度所属日期 YYYY-MM-DD */
  missionProgressDate: string | null
  /** 今日已完成关数 */
  todayMissionDone: number
  /** 今日总关数 */
  todayMissionTotal: number
  /** 宝箱领取日期 YYYY-MM-DD，null = 今日未领 */
  chestClaimedDate: string | null
  /** 前端 mock 奖励账本，用于幂等和周经验统计 */
  xpRewards: XpRewardRecord[]
  updatedAt: string
}
