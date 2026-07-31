<template>
  <div class="arena arena-lb">
    <div class="arena-lb__page">
      <!-- 页头 -->
      <div class="arena-between arena-lb__head">
        <div>
          <div class="arena-lb__kicker">排行榜 · 荣耀殿堂</div>
          <h1 class="arena-h1 arena-lb__title">看看谁最能打 🏆</h1>
        </div>
        <span class="arena-chip arena-chip--vio">演示数据 · 接口就绪后接入</span>
      </div>

      <!-- 我的排名卡 -->
      <div class="arena-card arena-card--hero arena-lb__me">
        <div class="arena-lb__me-rank">
          <span class="arena-tiny">我的排名</span>
          <b>#{{ myRank || '-' }}</b>
        </div>
        <div class="arena-lb__me-item">
          <span class="arena-tiny">◆ 总经验</span>
          <b>{{ gameProfile.xp }}</b>
        </div>
        <div class="arena-lb__me-item">
          <span class="arena-tiny">🔥 连胜</span>
          <b>{{ gameProfile.streakDays }} 天</b>
        </div>
        <div class="arena-lb__me-item">
          <span class="arena-tiny">{{ tier.icon }} 段位</span>
          <b :style="{ color: tier.color }">{{ tier.label }}</b>
        </div>
        <div class="arena-lb__me-next">
          <template v-if="nextTier">再拿 {{ nextTier.gap }} 积分上{{ nextTier.tier.label }}</template>
          <template v-else>已是最高段位</template>
        </div>
      </div>

      <!-- 榜单控制 -->
      <div class="arena-lb__controls">
        <div class="arena-lb__tabs" role="tablist" aria-label="榜单范围">
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            type="button"
            role="tab"
            :aria-selected="scope === opt.value"
            :class="{ 'is-active': scope === opt.value }"
            @click="scope = opt.value as LeaderboardScope; loadBoard()"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="arena-lb__tabs" role="tablist" aria-label="排行维度">
          <button
            v-for="opt in dimensionOptions"
            :key="opt.value"
            type="button"
            role="tab"
            :aria-selected="dimension === opt.value"
            :class="{ 'is-active': dimension === opt.value }"
            @click="dimension = opt.value as LeaderboardDimension; loadBoard()"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="arena-col" style="margin-top: 16px">
        <div v-for="i in 3" :key="i" class="arena-card arena-lb__skeleton"></div>
      </div>

      <template v-else>
        <!-- 领奖台 -->
        <div class="arena-lb__podium">
          <div v-for="(player, idx) in podium" :key="player.id" class="arena-card arena-lb__podium-card" :class="[`is-r${idx + 1}`, { 'is-me': player.isMe }]">
            <span class="arena-lb__podium-medal">{{ ['🥇', '🥈', '🥉'][idx] }}</span>
            <span class="arena-lb__podium-ava">{{ player.avatar }}</span>
            <b>{{ player.name }}<span v-if="player.isMe" class="arena-chip arena-chip--grn" style="margin-left: 5px">我</span></b>
            <span class="arena-tiny">LV.{{ player.level }} {{ player.title }}</span>
            <div class="arena-lb__podium-score">
              {{ dimension === 'xp' ? (scope === 'week' ? player.weekXp : player.xp) : `${player.streakDays} 天` }}
            </div>
            <span class="arena-tiny">{{ dimension === 'xp' ? (scope === 'week' ? '本周经验' : '总经验') : '连胜' }}</span>
          </div>
        </div>

        <!-- 榜单 -->
        <div class="arena-card arena-lb__list">
          <div
            v-for="(player, idx) in restEntries"
            :key="player.id"
            class="arena-lb__row"
            :class="{ 'is-me': player.isMe }"
          >
            <span class="arena-lb__rank">{{ idx + 4 }}</span>
            <span class="arena-lb__ava">{{ player.avatar }}</span>
            <div class="arena-lb__who">
              <b>{{ player.name }}<span v-if="player.isMe" class="arena-chip arena-chip--grn" style="margin-left: 6px">我</span></b>
              <span class="arena-tiny">LV.{{ player.level }} {{ player.title }}</span>
            </div>
            <span class="arena-tiny arena-lb__streak">🔥 {{ player.streakDays }}</span>
            <b class="arena-lb__score">
              {{ dimension === 'xp' ? (scope === 'week' ? player.weekXp : player.xp) : `${player.streakDays} 天` }}
            </b>
          </div>
          <div v-if="!restEntries.length" class="arena-lb__row" style="justify-content: center; color: var(--arena-mut)">
            榜单还在集结中
          </div>
        </div>

        <p class="arena-tiny arena-lb__note">
          周榜每周一 0 点结算（演示规则）；真实排名与反作弊以后端接口为准。
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  fetchLeaderboard,
  loadSocialProfile,
  nextTierOf,
  tierOf,
  type ArenaPlayer,
  type LeaderboardDimension,
  type LeaderboardScope
} from '@/features/arena-social'
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const gameProfile = useGameProfileStore()

const loading = ref(true)
const scope = ref<LeaderboardScope>('week')
const dimension = ref<LeaderboardDimension>('xp')
const entries = ref<ArenaPlayer[]>([])
const myRank = ref(0)

const scopeOptions = [
  { label: '本周榜', value: 'week' },
  { label: '总榜', value: 'all' }
]
const dimensionOptions = [
  { label: '◆ 经验榜', value: 'xp' },
  { label: '🔥 连胜榜', value: 'streak' }
]

const socialProfile = computed(() => loadSocialProfile(authStore.userInfo?.id))
const tier = computed(() => tierOf(socialProfile.value.rankPoints))
const nextTier = computed(() => nextTierOf(socialProfile.value.rankPoints))

const podium = computed(() => entries.value.slice(0, 3))
const restEntries = computed(() => entries.value.slice(3))

const loadBoard = async () => {
  loading.value = true
  try {
    const me = {
      userId: authStore.userInfo?.id,
      name: authStore.userInfo?.nickname || authStore.userInfo?.username || '我',
      avatar: '😎',
      xp: gameProfile.xp,
      streakDays: gameProfile.streakDays
    }
    const result = await fetchLeaderboard(me, scope.value, dimension.value)
    entries.value = result.entries
    myRank.value = result.myRank
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  gameProfile.hydrate(authStore.userInfo?.id)
  await loadBoard()
})
</script>

<style scoped lang="scss">
.arena-lb {
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;

  &__page {
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 34px 42px;
    position: relative;
    z-index: 1;
  }

  &__head {
    flex-wrap: wrap;
    gap: 10px;
  }

  &__kicker {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--arena-grn-d);
  }

  &__title {
    margin-top: 5px;
  }

  &__me {
    margin-top: 18px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  &__me-rank {
    b {
      display: block;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(100deg, var(--arena-grn), var(--arena-lime));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  &__me-item {
    b {
      display: block;
      font-size: 16px;
      font-weight: 900;
      margin-top: 2px;
    }
  }

  &__me-next {
    margin-left: auto;
    font-size: 11.5px;
    font-weight: 800;
    color: var(--arena-amber);
    background: var(--arena-amber-soft);
    padding: 6px 12px;
    border-radius: 999px;
  }

  &__controls {
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__tabs {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: #f2f4f2;

    button {
      border: 0;
      background: transparent;
      padding: 7px 15px;
      border-radius: 9px;
      font-size: 12.5px;
      font-weight: 800;
      color: var(--arena-sub);
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;

      &.is-active {
        background: #fff;
        color: var(--arena-grn-d);
        box-shadow: 0 1px 3px rgba(21, 33, 27, 0.1);
      }
    }
  }

  &__podium {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  &__podium-card {
    padding: 18px 14px 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
    position: relative;

    &.is-r1 {
      border-color: #f3ddc0;
      background: linear-gradient(160deg, #fff7ec, #ffffff 75%);
      transform: translateY(-6px);
    }

    &.is-me {
      box-shadow: 0 0 0 3px var(--arena-grn-soft);
    }

    b {
      margin-top: 7px;
      font-size: 13.5px;
    }
  }

  &__podium-medal {
    position: absolute;
    top: 9px;
    left: 11px;
    font-size: 15px;
  }

  &__podium-ava {
    font-size: 30px;
  }

  &__podium-score {
    margin-top: 6px;
    font-size: 19px;
    font-weight: 900;
    color: var(--arena-grn-d);
  }

  &__list {
    margin-top: 14px;
    padding: 8px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 13px;
    border-radius: 12px;

    &.is-me {
      background: var(--arena-grn-soft);
    }

    & + & {
      border-top: 1px solid var(--arena-line2);
    }
  }

  &__rank {
    flex: none;
    width: 26px;
    text-align: center;
    font-size: 13px;
    font-weight: 900;
    color: var(--arena-mut);
  }

  &__ava {
    font-size: 20px;
  }

  &__who {
    flex: 1;
    min-width: 0;

    b {
      font-size: 13px;
    }
  }

  &__streak {
    flex: none;
  }

  &__score {
    flex: none;
    font-size: 14px;
    color: var(--arena-grn-d);
  }

  &__note {
    margin-top: 12px;
    text-align: center;
  }

  &__skeleton {
    height: 90px;
    background: linear-gradient(90deg, #fff, #f4f7f4, #fff);
    background-size: 200% 100%;
    animation: arenaShimmer 1.4s infinite;
  }
}

@keyframes arenaShimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 720px) {
  .arena-lb {
    margin: -12px -12px 0;

    &__page {
      padding: 18px 14px 26px;
    }

    &__me-next {
      margin-left: 0;
    }
  }
}
</style>
