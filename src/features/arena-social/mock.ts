/**
 * arena-social · mock 数据与规则（纯数据，可整体替换为服务端响应）
 */

import type { ArenaPlayer, BattleQuestion, RankTier } from './types'

/** 段位表：积分下限升序 */
export const RANK_TIERS: RankTier[] = [
  { key: 'bronze', label: '青铜', icon: '🥉', minPoints: 0, color: '#b08968' },
  { key: 'silver', label: '白银', icon: '🥈', minPoints: 1100, color: '#9aa7b0' },
  { key: 'gold', label: '黄金', icon: '🥇', minPoints: 1300, color: '#f79009' },
  { key: 'platinum', label: '铂金', icon: '💠', minPoints: 1500, color: '#17b26a' },
  { key: 'diamond', label: '钻石', icon: '💎', minPoints: 1800, color: '#7c5cfc' },
  { key: 'master', label: '王者', icon: '👑', minPoints: 2200, color: '#e5484d' }
]

export const DEFAULT_RANK_POINTS = 1000
export const WIN_POINTS = 25
export const LOSE_POINTS = -15
export const DRAW_POINTS = 5

/** 虚拟玩家池（演示数据；'me' 由 adapter 用 gameProfile 真数据替换注入） */
export const MOCK_PLAYERS: ArenaPlayer[] = [
  { id: 'p01', name: '周子墨', avatar: '🦊', level: 9, title: '职场传说', xp: 3280, weekXp: 460, streakDays: 21, rankPoints: 2380 },
  { id: 'p02', name: '林小满', avatar: '🐼', level: 8, title: '面霸', xp: 2910, weekXp: 390, streakDays: 14, rankPoints: 2015 },
  { id: 'p03', name: '陈默', avatar: '🦉', level: 7, title: 'Offer 猎手', xp: 2540, weekXp: 350, streakDays: 11, rankPoints: 1890 },
  { id: 'p04', name: '苏晴', avatar: '🐯', level: 7, title: 'Offer 猎手', xp: 2310, weekXp: 320, streakDays: 9, rankPoints: 1720 },
  { id: 'p05', name: '赵启铭', avatar: '🦁', level: 6, title: '面试老手', xp: 1980, weekXp: 280, streakDays: 8, rankPoints: 1560 },
  { id: 'p06', name: '何一诺', avatar: '🐨', level: 6, title: '面试老手', xp: 1720, weekXp: 240, streakDays: 7, rankPoints: 1430 },
  { id: 'p07', name: '王思远', avatar: '🐸', level: 5, title: '面试新星', xp: 1350, weekXp: 210, streakDays: 5, rankPoints: 1280 },
  { id: 'p08', name: '李晓', avatar: '🐰', level: 4, title: '面试新星', xp: 1080, weekXp: 180, streakDays: 4, rankPoints: 1150 },
  { id: 'p09', name: '郑凯文', avatar: '🐵', level: 3, title: '闯关达人', xp: 760, weekXp: 120, streakDays: 3, rankPoints: 980 },
  { id: 'p10', name: '孙倩', avatar: '🦄', level: 2, title: '面试学徒', xp: 430, weekXp: 80, streakDays: 2, rankPoints: 860 }
]

/** 1v1 对战 mock 题库（Java 求职高频） */
export const BATTLE_QUESTIONS: BattleQuestion[] = [
  {
    id: 1,
    skill: 'Java 集合',
    question: 'HashMap 在 JDK 1.8 中，链表长度超过多少且数组长度达到 64 时会树化？',
    options: ['6', '8', '10', '16'],
    answerIndex: 1,
    analysis: 'TREEIFY_THRESHOLD = 8，且数组长度 ≥ 64 才树化，否则先扩容。'
  },
  {
    id: 2,
    skill: 'JVM',
    question: '下列哪个区域是线程共享的？',
    options: ['虚拟机栈', '本地方法栈', '堆', '程序计数器'],
    answerIndex: 2,
    analysis: '堆与方法区线程共享；栈、本地方法栈、程序计数器线程私有。'
  },
  {
    id: 3,
    skill: '并发',
    question: 'synchronized 锁升级的正确顺序是？',
    options: [
      '偏向锁 → 轻量级锁 → 重量级锁',
      '轻量级锁 → 偏向锁 → 重量级锁',
      '重量级锁 → 轻量级锁 → 偏向锁',
      '不存在锁升级'
    ],
    answerIndex: 0,
    analysis: '无锁 → 偏向锁 → 轻量级锁（自旋/CAS）→ 重量级锁。'
  },
  {
    id: 4,
    skill: 'Spring',
    question: 'Spring Bean 的默认作用域是？',
    options: ['prototype', 'request', 'singleton', 'session'],
    answerIndex: 2,
    analysis: '默认 singleton，每个容器中只存在一个实例。'
  },
  {
    id: 5,
    skill: 'MySQL',
    question: 'InnoDB 的聚簇索引叶子节点存储的是？',
    options: ['主键值', '整行数据', '索引列+主键', '数据页指针'],
    answerIndex: 1,
    analysis: '聚簇索引叶子节点即数据行；二级索引叶子存主键值，需要回表。'
  },
  {
    id: 6,
    skill: 'Redis',
    question: '缓存穿透的常用解决方案不包括？',
    options: ['布隆过滤器', '缓存空值', '互斥锁重建', '随机过期时间'],
    answerIndex: 3,
    analysis: '随机过期时间解决的是缓存雪崩；穿透用布隆过滤器或缓存空值。'
  },
  {
    id: 7,
    skill: 'RocketMQ',
    question: 'RocketMQ 保证顺序消息的关键是？',
    options: ['全局有序 ID', '同一队列串行消费', '事务消息', '延迟消息'],
    answerIndex: 1,
    analysis: '同一业务 key 投递到同一队列，单队列内 FIFO 保证局部有序。'
  },
  {
    id: 8,
    skill: '分布式',
    question: 'CAP 定理中，分布式系统必须满足的是？',
    options: ['一致性 C', '可用性 A', '分区容错性 P', '三者都必须'],
    answerIndex: 2,
    analysis: '网络分区不可避免，P 必须满足，在 C 与 A 之间取舍。'
  }
]
