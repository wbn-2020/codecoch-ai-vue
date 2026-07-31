import { beforeEach, describe, expect, it } from 'vitest'

import {
  fetchLeaderboard,
  loadSocialProfile,
  saveBattleResult
} from '@/features/arena-social'

describe('arena-social adapter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses the supplied weekly XP without truncation when ranking the weekly board', async () => {
    const result = await fetchLeaderboard({
      userId: 7,
      name: '本周训练者',
      avatar: '😎',
      xp: 1_200,
      weekXp: 600,
      streakDays: 4
    }, 'week', 'xp')

    const me = result.entries.find((entry) => entry.isMe)
    expect(me).toMatchObject({ weekXp: 600, xp: 1_200 })
    expect(result.entries[0]).toMatchObject({ isMe: true, weekXp: 600 })
    expect(result.myRank).toBe(1)
  })

  it('persists each battle result exactly once by battle id', async () => {
    const input = {
      id: 'battle-deduplicated',
      opponentName: '周子墨',
      opponentAvatar: '🦊',
      myScore: 520,
      opponentScore: 460,
      outcome: 'win' as const
    }

    const first = await saveBattleResult('player-7', input)
    const repeated = await saveBattleResult('player-7', input)
    const restored = loadSocialProfile('player-7')

    expect(first.rankPoints).toBe(1_025)
    expect(repeated.rankPoints).toBe(1_025)
    expect(restored).toMatchObject({
      rankPoints: 1_025,
      wins: 1,
      losses: 0,
      draws: 0
    })
    expect(restored.records).toHaveLength(1)
    expect(restored.records[0]).toMatchObject({ id: 'battle-deduplicated', pointsDelta: 25 })
  })
})
