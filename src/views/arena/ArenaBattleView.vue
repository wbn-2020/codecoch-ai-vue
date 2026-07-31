<template>
  <div class="arena arena-bt">
    <div class="arena-bt__page">
      <!-- 页头 -->
      <div class="arena-between arena-bt__head">
        <div>
          <div class="arena-bt__kicker">多人竞技 · 决斗场</div>
          <h1 class="arena-h1 arena-bt__title">1v1 答题对战 ⚔️</h1>
        </div>
        <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
          <span class="arena-chip arena-chip--vio">演示数据 · 接口就绪后接入</span>
          <button class="arena-btn arena-btn--sec" style="padding: 9px 14px; font-size: 12.5px" @click="router.push('/arena/leaderboard')">
            🏆 排行榜
          </button>
        </div>
      </div>

      <!-- 大厅 -->
      <template v-if="phase === 'lobby'">
        <div class="arena-card arena-card--hero arena-bt__tier">
          <div class="arena-bt__tier-badge" :style="{ background: tier.color + '1f', color: tier.color }">
            {{ tier.icon }}
          </div>
          <div style="flex: 1; min-width: 0">
            <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
              <b style="font-size: 17px; font-weight: 900" :style="{ color: tier.color }">{{ tier.label }}</b>
              <span class="arena-tiny">{{ profile.rankPoints }} 积分</span>
              <span class="arena-tiny">战绩 {{ profile.wins }} 胜 {{ profile.losses }} 负 {{ profile.draws }} 平</span>
            </div>
            <div class="arena-xpbar" style="margin-top: 9px">
              <i :style="{ width: `${tierProgress}%` }"></i>
            </div>
            <div class="arena-tiny" style="margin-top: 6px">
              <template v-if="nextTier">再拿 {{ nextTier.gap }} 积分晋级{{ nextTier.tier.label }} {{ nextTier.tier.icon }}</template>
              <template v-else>已是最高段位，守住荣耀</template>
            </div>
          </div>
          <button class="arena-btn arena-btn--pri" style="padding: 14px 28px" @click="startMatch">
            ⚔ 开始匹配
          </button>
        </div>

        <div class="arena-card arena-bt__panel">
          <div class="arena-between">
            <div class="arena-h3">对战规则</div>
          </div>
          <div class="arena-bt__rules">
            <div>① 系统按段位就近匹配对手，共 5 题快答。</div>
            <div>② 答对得分，答得越快分越高；超时未答按答错处理。</div>
            <div>③ 胜 +25 / 平 +5 / 负 -15 积分；完成对战额外 +90 XP。</div>
          </div>
        </div>

        <div class="arena-card arena-bt__panel">
          <div class="arena-between">
            <div class="arena-h3">对战记录</div>
            <span class="arena-tiny">最近 {{ profile.records.length }} 场</span>
          </div>
          <div v-if="profile.records.length" class="arena-col" style="gap: 8px; margin-top: 12px">
            <div v-for="record in profile.records" :key="record.id" class="arena-bt__record">
              <span class="arena-bt__record-ava">{{ record.opponentAvatar }}</span>
              <div style="flex: 1; min-width: 0">
                <b style="font-size: 12.5px">vs {{ record.opponentName }}</b>
                <div class="arena-tiny">{{ formatTime(record.playedAt) }}</div>
              </div>
              <b class="arena-bt__record-score">{{ record.myScore }} : {{ record.opponentScore }}</b>
              <span class="arena-chip" :class="outcomeChipClass(record.outcome)">{{ outcomeLabel(record.outcome) }}</span>
              <span class="arena-tiny" :style="{ color: record.pointsDelta >= 0 ? 'var(--arena-grn-d)' : 'var(--arena-red)', fontWeight: 800 }">
                {{ record.pointsDelta >= 0 ? `+${record.pointsDelta}` : record.pointsDelta }}
              </span>
            </div>
          </div>
          <div v-else class="arena-bt__empty">
            <b>还没有对战记录</b>
            <p class="arena-tiny" style="margin-top: 4px">打赢第一场，把名字刻进决斗场。</p>
          </div>
        </div>
      </template>

      <!-- 匹配中 -->
      <div v-else-if="phase === 'matching'" class="arena-card arena-bt__matching">
        <div class="arena-bt__matching-ring"></div>
        <b style="font-size: 15px">正在按段位匹配对手…</b>
        <p class="arena-tiny">{{ matchingTip }}</p>
        <button class="arena-btn arena-btn--txt" @click="cancelMatch">取消匹配</button>
      </div>

      <!-- 对战中 -->
      <template v-else-if="phase === 'fighting' && currentQuestion">
        <div class="arena-card arena-bt__vs">
          <div class="arena-bt__side">
            <span class="arena-bt__vs-ava">😎</span>
            <b>我</b>
            <span class="arena-bt__vs-score">{{ myScore }}</span>
          </div>
          <div class="arena-bt__vs-mid">
            <span class="arena-chip arena-chip--grn-solid">第 {{ questionIndex + 1 }}/{{ questions.length }} 题</span>
            <div class="arena-bt__timer" :class="{ 'is-low': secondsLeft <= 5 }">{{ secondsLeft }}s</div>
          </div>
          <div class="arena-bt__side">
            <span class="arena-bt__vs-ava">{{ opponent?.avatar }}</span>
            <b>{{ opponent?.name }}</b>
            <span class="arena-bt__vs-score">{{ opponentScore }}</span>
          </div>
        </div>

        <div class="arena-bt__progress">
          <div class="arena-bt__progress-row">
            <span class="arena-tiny">我的进度</span>
            <div class="arena-xpbar" style="flex: 1"><i :style="{ width: `${(myAnswered / questions.length) * 100}%` }"></i></div>
          </div>
          <div class="arena-bt__progress-row">
            <span class="arena-tiny">{{ opponent?.name }}</span>
            <div class="arena-xpbar arena-bt__progress-opp" style="flex: 1"><i :style="{ width: `${(opponentAnswered / questions.length) * 100}%` }"></i></div>
          </div>
        </div>

        <div class="arena-card arena-bt__question">
          <div class="arena-row" style="gap: 8px">
            <span class="arena-chip arena-chip--vio">{{ currentQuestion.skill }}</span>
          </div>
          <h2 class="arena-h2" style="margin-top: 12px; font-size: 17px">{{ currentQuestion.question }}</h2>
          <div class="arena-bt__options">
            <button
              v-for="(option, idx) in currentQuestion.options"
              :key="idx"
              type="button"
              class="arena-bt__option"
              :class="optionClass(idx)"
              :disabled="myLocked"
              @click="answer(idx)"
            >
              <span class="arena-bt__option-key">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
              {{ option }}
            </button>
          </div>
          <div v-if="showAnalysis" class="arena-bt__analysis" :class="{ 'is-wrong': myLastCorrect === false }">
            <b>{{ myLastCorrect ? '✓ 回答正确' : '✗ 回答错误' }}</b>
            <p>{{ currentQuestion.analysis }}</p>
          </div>
        </div>
      </template>

      <!-- 结算 -->
      <div v-else-if="phase === 'settled'" class="arena-card arena-bt__settled" :class="`is-${lastOutcome}`">
        <span class="arena-bt__settled-emoji">{{ lastOutcome === 'win' ? '🏆' : lastOutcome === 'lose' ? '💀' : '🤝' }}</span>
        <b class="arena-bt__settled-title">{{ lastOutcome === 'win' ? '胜利！' : lastOutcome === 'lose' ? '惜败' : '平局' }}</b>
        <div class="arena-bt__settled-score">{{ lastResult?.myScore }} : {{ lastResult?.opponentScore }}</div>
        <div class="arena-row" style="gap: 8px; flex-wrap: wrap; justify-content: center">
          <span class="arena-chip" :class="(lastResult?.pointsDelta ?? 0) >= 0 ? 'arena-chip--grn' : 'arena-chip--red'">
            积分 {{ (lastResult?.pointsDelta ?? 0) >= 0 ? `+${lastResult?.pointsDelta}` : lastResult?.pointsDelta }}
          </span>
          <span class="arena-chip arena-chip--amber">+90 XP 已入账</span>
        </div>
        <div class="arena-row" style="margin-top: 18px; justify-content: center; flex-wrap: wrap">
          <button class="arena-btn arena-btn--pri" style="padding: 13px 24px" @click="startMatch">⚔ 再来一局</button>
          <button class="arena-btn arena-btn--sec" style="padding: 12px 18px; font-size: 13px" @click="backToLobby">返回大厅</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  BATTLE_QUESTIONS,
  matchOpponent,
  nextTierOf,
  loadSocialProfile,
  saveBattleResult,
  tierOf,
  type ArenaPlayer,
  type ArenaSocialProfile,
  type BattleQuestion,
  type BattleResult
} from '@/features/arena-social'
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'

type Phase = 'lobby' | 'matching' | 'fighting' | 'settled'

const QUESTION_SECONDS = 20
const QUESTION_COUNT = 5

const router = useRouter()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()

const phase = ref<Phase>('lobby')
const profile = ref<ArenaSocialProfile>({ rankPoints: 1000, wins: 0, losses: 0, draws: 0, records: [] })
const opponent = ref<ArenaPlayer | null>(null)
const questions = ref<BattleQuestion[]>([])
const questionIndex = ref(0)
const secondsLeft = ref(QUESTION_SECONDS)
const myScore = ref(0)
const opponentScore = ref(0)
const myAnswered = ref(0)
const opponentAnswered = ref(0)
const myLocked = ref(false)
const myLastCorrect = ref<boolean | null>(null)
const showAnalysis = ref(false)
const lastResult = ref<BattleResult | null>(null)
const lastOutcome = ref<'win' | 'lose' | 'draw'>('draw')
const matchingTip = ref('正在寻找段位相近的对手')

const tier = computed(() => tierOf(profile.value.rankPoints))
const nextTier = computed(() => nextTierOf(profile.value.rankPoints))
const tierProgress = computed(() => {
  const next = nextTier.value
  if (!next) return 100
  const base = tier.value.minPoints
  const span = next.tier.minPoints - base
  return span > 0 ? Math.min(100, Math.round(((profile.value.rankPoints - base) / span) * 100)) : 100
})
const currentQuestion = computed(() => questions.value[questionIndex.value] || null)

let tickTimer: ReturnType<typeof window.setInterval> | null = null
let opponentTimer: ReturnType<typeof window.setTimeout> | null = null
let advanceTimer: ReturnType<typeof window.setTimeout> | null = null
let matchTimer: ReturnType<typeof window.setTimeout> | null = null
let opponentWillAnswer = false
let opponentCorrect = false

const clearTimers = () => {
  if (tickTimer != null) {
    window.clearInterval(tickTimer)
    tickTimer = null
  }
  if (opponentTimer != null) {
    window.clearTimeout(opponentTimer)
    opponentTimer = null
  }
  if (advanceTimer != null) {
    window.clearTimeout(advanceTimer)
    advanceTimer = null
  }
  if (matchTimer != null) {
    window.clearTimeout(matchTimer)
    matchTimer = null
  }
}

const shuffle = <T>(list: T[]): T[] => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const formatTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const outcomeLabel = (outcome: 'win' | 'lose' | 'draw') =>
  outcome === 'win' ? '胜' : outcome === 'lose' ? '负' : '平'

const outcomeChipClass = (outcome: 'win' | 'lose' | 'draw') =>
  outcome === 'win' ? 'arena-chip--grn' : outcome === 'lose' ? 'arena-chip--red' : 'arena-chip--mut'

const refreshProfile = () => {
  profile.value = loadSocialProfile(authStore.userInfo?.id)
}

const startMatch = async () => {
  clearTimers()
  phase.value = 'matching'
  matchingTip.value = '正在寻找段位相近的对手'
  const matched = await matchOpponent(authStore.userInfo?.id)
  matchingTip.value = `已锁定 ${matched.avatar} ${matched.name}（LV.${matched.level}），正在开局…`
  opponent.value = matched
  matchTimer = window.setTimeout(() => {
    matchTimer = null
    beginFight()
  }, 1400)
}

const cancelMatch = () => {
  clearTimers()
  phase.value = 'lobby'
}

const beginFight = () => {
  questions.value = shuffle(BATTLE_QUESTIONS).slice(0, QUESTION_COUNT)
  questionIndex.value = 0
  myScore.value = 0
  opponentScore.value = 0
  myAnswered.value = 0
  opponentAnswered.value = 0
  phase.value = 'fighting'
  startQuestion()
}

const startQuestion = () => {
  clearTimers()
  secondsLeft.value = QUESTION_SECONDS
  myLocked.value = false
  myLastCorrect.value = null
  showAnalysis.value = false

  // 对手作答计划：按段位差决定正确率（55%-90%），3-14 秒内作答
  const opp = opponent.value
  const skill = opp ? Math.min(0.9, Math.max(0.55, opp.rankPoints / 2600 + 0.35)) : 0.65
  opponentCorrect = Math.random() < skill
  opponentWillAnswer = Math.random() > 0.08
  if (opponentWillAnswer) {
    const answerDelay = 3000 + Math.random() * 11000
    opponentTimer = window.setTimeout(() => {
      opponentTimer = null
      handleOpponentAnswer()
    }, answerDelay)
  }

  tickTimer = window.setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      handleTimeout()
    }
  }, 1000)
}

const scoreOf = (correct: boolean, secondsUsed: number) =>
  correct ? 100 + Math.max(0, QUESTION_SECONDS - secondsUsed) * 2 : 0

const handleOpponentAnswer = () => {
  if (phase.value !== 'fighting') return
  opponentAnswered.value = Math.min(questions.value.length, opponentAnswered.value + 1)
  const used = QUESTION_SECONDS - secondsLeft.value
  opponentScore.value += scoreOf(opponentCorrect, used)
  maybeAdvance()
}

const answer = (idx: number) => {
  if (myLocked.value || phase.value !== 'fighting') return
  myLocked.value = true
  const question = currentQuestion.value
  if (!question) return
  const correct = idx === question.answerIndex
  myLastCorrect.value = correct
  const used = QUESTION_SECONDS - secondsLeft.value
  myScore.value += scoreOf(correct, used)
  myAnswered.value += 1
  showAnalysis.value = true
  maybeAdvance()
}

const handleTimeout = () => {
  if (myLocked.value) return
  myLocked.value = true
  myLastCorrect.value = false
  myAnswered.value += 1
  showAnalysis.value = true
  maybeAdvance()
}

const maybeAdvance = () => {
  const oppDone = opponentAnswered.value > questionIndex.value || !opponentWillAnswer
  if (!myLocked.value || !oppDone) return
  if (tickTimer != null) {
    window.clearInterval(tickTimer)
    tickTimer = null
  }
  advanceTimer = window.setTimeout(() => {
    advanceTimer = null
    if (questionIndex.value + 1 >= questions.value.length) {
      void settleBattle()
    } else {
      questionIndex.value += 1
      startQuestion()
    }
  }, 1600)
}

const settleBattle = async () => {
  clearTimers()
  const outcome: 'win' | 'lose' | 'draw' =
    myScore.value > opponentScore.value ? 'win' : myScore.value < opponentScore.value ? 'lose' : 'draw'
  lastOutcome.value = outcome
  const opp = opponent.value
  const nextProfile = await saveBattleResult(authStore.userInfo?.id, {
    id: `battle_${Date.now()}`,
    opponentName: opp?.name || '神秘对手',
    opponentAvatar: opp?.avatar || '🎭',
    myScore: myScore.value,
    opponentScore: opponentScore.value,
    outcome
  })
  profile.value = nextProfile
  lastResult.value = nextProfile.records[0] || null
  gameProfile.grantXp('warmup_5')
  phase.value = 'settled'
}

const backToLobby = () => {
  clearTimers()
  refreshProfile()
  phase.value = 'lobby'
}

const optionClass = (idx: number) => {
  const question = currentQuestion.value
  if (!question || !myLocked.value) return ''
  if (idx === question.answerIndex) return 'is-correct'
  return myLastCorrect.value === false ? 'is-dim' : ''
}

onMounted(() => {
  gameProfile.hydrate(authStore.userInfo?.id)
  refreshProfile()
})

onBeforeUnmount(clearTimers)
</script>

<style scoped lang="scss">
.arena-bt {
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;

  &__page {
    max-width: 720px;
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

  &__tier {
    margin-top: 18px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__tier-badge {
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
  }

  &__panel {
    margin-top: 14px;
    padding: 18px 20px;
  }

  &__rules {
    margin-top: 11px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-size: 12.5px;
    color: var(--arena-sub);
    line-height: 1.55;
  }

  &__record {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border: 1.5px solid var(--arena-line2);
    border-radius: 12px;
  }

  &__record-ava {
    font-size: 19px;
  }

  &__record-score {
    font-size: 13.5px;
    color: var(--arena-ink);
  }

  &__empty {
    margin-top: 12px;
    padding: 20px;
    border: 1.5px dashed var(--arena-line);
    border-radius: 13px;
    text-align: center;

    b {
      font-size: 13px;
    }
  }

  &__matching {
    margin-top: 22px;
    padding: 46px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  &__matching-ring {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 4px solid var(--arena-line);
    border-top-color: var(--arena-grn);
    animation: arenaSpin 0.9s linear infinite;
  }

  &__vs {
    margin-top: 18px;
    padding: 16px 20px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
  }

  &__side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;

    b {
      font-size: 12.5px;
    }
  }

  &__vs-ava {
    font-size: 26px;
  }

  &__vs-score {
    font-size: 19px;
    font-weight: 900;
    color: var(--arena-grn-d);
  }

  &__vs-mid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
  }

  &__timer {
    font-size: 21px;
    font-weight: 900;

    &.is-low {
      color: var(--arena-red);
      animation: arenaPulse 0.8s ease-in-out infinite;
    }
  }

  &__progress {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  &__progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__progress-opp > i {
    background: linear-gradient(90deg, var(--arena-vio), #b3a1ff);
  }

  &__question {
    margin-top: 14px;
    padding: 22px 24px;
  }

  &__options {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 15px;
    border: 2px solid var(--arena-line);
    border-radius: 13px;
    background: #fff;
    font-size: 13.5px;
    font-weight: 600;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    &:hover:not(:disabled) {
      border-color: var(--arena-grn);
    }

    &.is-correct {
      border-color: var(--arena-grn);
      background: var(--arena-grn-soft);
    }

    &.is-dim {
      opacity: 0.55;
    }
  }

  &__option-key {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    background: #f2f4f2;
    color: var(--arena-sub);
  }

  &__analysis {
    margin-top: 14px;
    padding: 12px 15px;
    border-radius: 12px;
    background: var(--arena-grn-soft);
    font-size: 12px;
    line-height: 1.6;

    &.is-wrong {
      background: var(--arena-red-soft);
    }

    p {
      margin: 4px 0 0;
      color: var(--arena-sub);
    }
  }

  &__settled {
    margin-top: 22px;
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;

    &.is-win {
      border-color: #b9e7cd;
      background: linear-gradient(160deg, #f0fbf4, #ffffff 75%);
    }

    &.is-lose {
      border-color: #f3d1d1;
      background: linear-gradient(160deg, #fdf3f3, #ffffff 75%);
    }
  }

  &__settled-emoji {
    font-size: 44px;
  }

  &__settled-title {
    font-size: 22px;
    font-weight: 900;
  }

  &__settled-score {
    font-size: 30px;
    font-weight: 900;
    letter-spacing: 1px;
    color: var(--arena-grn-d);
  }
}

@keyframes arenaSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes arenaPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 720px) {
  .arena-bt {
    margin: -12px -12px 0;

    &__page {
      padding: 18px 14px 26px;
    }
  }
}
</style>
