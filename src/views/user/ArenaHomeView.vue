<template>
  <div class="arena arena-home">
    <div class="arena-home__page">
      <!-- 页头：问候 + 战力 -->
      <div class="arena-between arena-home__head">
        <div>
          <div class="arena-home__level">
            LV.{{ gameProfile.levelInfo.level }} {{ gameProfile.levelInfo.title }} · {{ weekdayLabel }}
          </div>
          <h1 class="arena-h1 arena-home__title">{{ greetingName }}，{{ headTitle }} 🎯</h1>
        </div>
        <div class="arena-card arena-home__power">
          <div
            class="arena-ring"
            :style="{
              width: '56px',
              height: '56px',
              background: `conic-gradient(var(--arena-grn) 0 ${power}%, var(--arena-line) ${power}% 100%)`
            }"
          >
            <div class="arena-ring__hole" style="width: 44px; height: 44px">
              <b style="font-size: 15px; line-height: 1">{{ power }}</b>
              <span class="arena-tiny" style="font-size: 8px; font-weight: 800">战力</span>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800">Offer 就绪度</div>
            <div class="arena-tiny" style="margin-top: 2px">
              再得 {{ gameProfile.levelInfo.nextLevelXp - gameProfile.levelInfo.curLevelXp }} 经验到 LV.{{ gameProfile.levelInfo.level + 1 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="arena-col" style="margin-top: 22px">
        <div v-for="i in 3" :key="i" class="arena-card arena-home__skeleton"></div>
      </div>

      <!-- 错误态 -->
      <div v-else-if="loadError" class="arena-card arena-home__error">
        <b>今天的关卡没加载出来</b>
        <p class="arena-p">不影响已有进度，刷新重试一下。</p>
        <button class="arena-btn arena-btn--pri" style="padding: 11px 22px" @click="loadAll(true)">重新加载</button>
      </div>

      <div v-else class="arena-home__grid">
        <div class="arena-col">
          <!-- 空态：无任务 -->
          <div v-if="missions.length === 0" class="arena-card arena-card--hero arena-home__boss">
            <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
              <span class="arena-chip arena-chip--grn-solid">新的一天</span>
              <span class="arena-tiny">约 8 分钟起步</span>
            </div>
            <h2 class="arena-h2" style="margin-top: 13px">今天还没有关卡，先开第一关</h2>
            <p class="arena-p" style="margin-top: 9px">
              {{ hasResume ? '生成今日计划，AI 教练按你的目标岗位排好今天三关。' : '做出一份能匹配的简历，解锁 JD 精准匹配，之后的题目都会贴着你的项目走。' }}
            </p>
            <div class="arena-row" style="margin-top: 18px">
              <button
                class="arena-btn arena-btn--pri"
                style="padding: 13px 24px"
                @click="hasResume ? go('/agent/today') : go('/resumes')"
              >
                ⚔ {{ hasResume ? '去生成今日计划' : '8 分钟创建简历' }}
              </button>
              <button class="arena-btn arena-btn--sec" style="padding: 12px 18px; font-size: 13.5px" @click="go('/questions/recommendations')">
                先热身 5 题
              </button>
            </div>
          </div>

          <template v-else>
            <!-- Boss 关 -->
            <div class="arena-card arena-card--hero arena-home__boss">
              <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                <span class="arena-chip arena-chip--grn-solid">第 1 关 · Boss</span>
                <span class="arena-chip arena-chip--line">+{{ missions[0].xp }} 经验</span>
                <span class="arena-tiny">约 {{ missions[0].minutes }} 分钟</span>
              </div>
              <h2 class="arena-h2" style="margin-top: 13px">{{ missions[0].title }}</h2>
              <p class="arena-p" style="margin-top: 9px">{{ missions[0].reason }}</p>
              <div class="arena-row" style="margin-top: 18px">
                <button
                  class="arena-btn arena-btn--pri"
                  style="padding: 13px 24px"
                  :disabled="completingId === missions[0].id"
                  @click="enterMission(missions[0])"
                >
                  ⚔ 开始闯关
                </button>
                <button
                  class="arena-btn arena-btn--sec"
                  style="padding: 12px 18px; font-size: 13.5px"
                  :disabled="completingId === missions[0].id"
                  @click="completeMission(missions[0])"
                >
                  {{ completingId === missions[0].id ? '通关中…' : '已完成，收下经验' }}
                </button>
              </div>
            </div>

            <!-- 支线 -->
            <div v-if="sideMissions.length" class="arena-home__side-grid">
              <div v-for="(m, idx) in sideMissions" :key="m.id" class="arena-card arena-home__side">
                <div class="arena-between">
                  <span class="arena-chip arena-chip--grn">支线 {{ idx + 2 }}</span>
                  <span class="arena-xp-tag">+{{ m.xp }}</span>
                </div>
                <div class="arena-h3" style="margin-top: 11px">{{ m.title }}</div>
                <div class="arena-tiny" style="margin-top: 3px">{{ m.reason }} · {{ m.minutes }} 分钟</div>
                <div class="arena-row" style="margin-top: 10px; gap: 12px">
                  <button class="arena-btn arena-btn--txt" @click="enterMission(m)">去完成 →</button>
                  <button
                    class="arena-btn arena-btn--txt"
                    style="color: var(--arena-mut)"
                    :disabled="completingId === m.id"
                    @click="completeMission(m)"
                  >
                    直接完成
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- 每日宝箱 -->
          <div class="arena-card arena-card--treasure arena-home__chest">
            <span style="font-size: 22px">{{ gameProfile.chestReady ? '🎁' : '🎁' }}</span>
            <div style="flex: 1">
              <div class="arena-h3" style="font-size: 13.5px">
                {{ gameProfile.chestReady ? '今日宝箱可以开了！' : `完成全部 ${gameProfile.todayMissionTotal || 3} 关，开启今日宝箱` }}
              </div>
              <div class="arena-tiny" style="margin-top: 1px">
                {{ gameProfile.chestReady ? '额外 +100 经验，点我领取' : '额外 +100 经验' }}
              </div>
            </div>
            <div class="arena-row" style="gap: 4px">
              <span
                v-for="i in Math.max(gameProfile.todayMissionTotal, 3)"
                :key="i"
                :class="i <= gameProfile.todayMissionDone ? 'arena-check' : 'arena-lock'"
              >{{ i <= gameProfile.todayMissionDone ? '✓' : i }}</span>
            </div>
            <button
              v-if="gameProfile.chestReady"
              class="arena-btn arena-btn--pri"
              style="padding: 10px 18px; font-size: 13px"
              @click="claimChest"
            >
              开箱 +100
            </button>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="arena-col">
          <div class="arena-card arena-home__panel">
            <div class="arena-h3">本周连胜</div>
            <div class="arena-streak" style="margin-top: 14px">
              <div v-for="d in weekStreak" :key="d.label" class="arena-streak__day">
                <div
                  class="arena-streak__box"
                  :class="d.state === 'done' ? 'arena-streak__box--done' : d.state === 'today' ? 'arena-streak__box--today' : 'arena-streak__box--todo'"
                >{{ d.state === 'todo' ? '·' : '🔥' }}</div>
                <div class="arena-tiny" :style="d.state === 'today' ? 'color: var(--arena-amber); font-weight: 800' : ''" style="margin-top: 4px; font-size: 10px">
                  {{ d.label }}
                </div>
              </div>
            </div>
            <div class="arena-home__streak-note">
              连胜 <b style="color: var(--arena-amber)">{{ gameProfile.streakDays }} 天</b>
              <span v-if="gameProfile.streakTodayDone"> · 今天已续上</span>
              <span v-else> · 完成一关即可续上</span>
            </div>
          </div>

          <div class="arena-card arena-home__panel arena-home__offer">
            <div class="arena-h3">🏆 离 Offer 还差</div>
            <div class="arena-col" style="margin-top: 13px; gap: 10px; font-size: 12.5px">
              <div class="arena-row" style="gap: 9px">
                <span :style="`color: ${hasResume ? 'var(--arena-grn)' : 'var(--arena-mut)'}`">{{ hasResume ? '✓' : '○' }}</span>
                <span :style="hasResume ? '' : 'color: var(--arena-mut)'">做出匹配简历</span>
              </div>
              <div class="arena-row" style="gap: 9px">
                <span :style="`color: ${interviewCount >= 3 ? 'var(--arena-grn)' : 'var(--arena-mut)'}`">{{ interviewCount >= 3 ? '✓' : '○' }}</span>
                <span :style="interviewCount >= 3 ? '' : 'color: var(--arena-mut)'">
                  完成 3 场模拟面试（{{ Math.min(interviewCount, 3) }}/3）
                </span>
              </div>
              <div class="arena-row" style="gap: 9px">
                <span :style="`color: ${power >= 80 ? 'var(--arena-grn)' : 'var(--arena-mut)'}`">{{ power >= 80 ? '✓' : '○' }}</span>
                <span :style="power >= 80 ? '' : 'color: var(--arena-mut)'">战力达到 80（{{ power }}/80）</span>
              </div>
            </div>
          </div>

          <div v-if="evidenceNote" class="arena-card arena-home__ai-note">
            <div class="arena-row" style="gap: 8px">
              <span class="arena-ai-badge">✦ AI</span>
              <b style="font-size: 12.5px">{{ evidenceNote.title }}</b>
            </div>
            <p class="arena-tiny" style="margin-top: 8px; line-height: 1.6">{{ evidenceNote.body }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { completeAgentTaskApi } from '@/api/agent'
import { fetchCachedDashboardOverview, fetchCachedTodayAgentTasks } from '@/composables/useUserHomeDataCache'
import { computePower, useGameProfileStore, type XpEventKey } from '@/features/game-profile'
import { buildAgentTaskActionPath, hasAgentTaskActionEntry } from '@/utils/agentTaskAction'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO } from '@/types/agent'
import type { UserDashboardOverviewVO } from '@/types/dashboard'

interface Mission {
  id: number
  title: string
  reason: string
  minutes: number
  xp: number
  xpEvent: XpEventKey
  actionPath: string | null
  raw: AgentTaskVO
}

const router = useRouter()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()

const loading = ref(true)
const loadError = ref('')
const completingId = ref<number | null>(null)
const tasks = ref<AgentTaskVO[]>([])
const overview = ref<UserDashboardOverviewVO | null>(null)
const chestNotice = ref('')

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weekdayLabel = computed(() => WEEKDAY_LABELS[new Date().getDay()])
const greetingName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || '同学')

const hasResume = computed(() => (overview.value?.resumeCount ?? 0) > 0)
const interviewCount = computed(() => overview.value?.interviewCount ?? 0)

const READY_STATUS = new Set(['READY', 'DONE', 'COMPLETE', 'COMPLETED', 'OK', 'ACTIVE', 'GENERATED', 'VERIFIED'])
const entryReadyRatio = computed(() => {
  const entries = overview.value?.entryStatuses || []
  if (!entries.length) return 0
  const ready = entries.filter((entry) => READY_STATUS.has(String(entry.status || '').toUpperCase())).length
  return ready / entries.length
})

/** 战力 = 简历 30% + 岗位 20% + 训练 30% + 面试 20%（readiness 真数据加权） */
const power = computed(() => {
  const o = overview.value
  const resumeScore = hasResume.value ? 55 + entryReadyRatio.value * 45 : entryReadyRatio.value * 40
  const jobScore = entryReadyRatio.value * 100
  const total = o?.todayTaskCount ?? 0
  const done = o?.todayCompletedTaskCount ?? 0
  const trainingScore = total > 0 ? Math.min(100, (done / total) * 100 + 20) : 10
  const reportScore = typeof o?.recentReport?.totalScore === 'number' ? o.recentReport.totalScore : interviewCount.value > 0 ? 40 : 0
  return computePower({ resume: resumeScore, job: jobScore, training: trainingScore, interview: reportScore })
})

const XP_EVENT_BY_TASK: Array<[RegExp, XpEventKey]> = [
  [/resume|简历/i, 'resume_create'],
  [/job|jd|岗位/i, 'jd_paste'],
  [/interview|面试/i, 'interview_complete'],
  [/question|practice|题|训练/i, 'warmup_5']
]

const XP_OF_EVENT: Record<XpEventKey, number> = {
  resume_create: 150,
  resume_section: 40,
  jd_paste: 60,
  jd_cover_boost: 120,
  warmup_5: 90,
  practice_correct: 18,
  interview_complete: 200,
  daily_chest: 100
}

const xpEventForTask = (task: AgentTaskVO): XpEventKey => {
  const text = `${task.taskType || ''} ${task.title || ''}`
  const hit = XP_EVENT_BY_TASK.find(([pattern]) => pattern.test(text))
  return hit ? hit[1] : 'jd_paste'
}

const OPEN_STATUS = new Set(['TODO', 'DOING'])

const missions = computed<Mission[]>(() =>
  tasks.value
    .filter((task) => OPEN_STATUS.has(String(task.status || 'TODO').toUpperCase()))
    .slice(0, 3)
    .map((task) => {
      const xpEvent = xpEventForTask(task)
      return {
        id: task.id,
        title: task.title || '今日训练任务',
        reason: task.reason || task.description || '按你的目标岗位与最近练习推荐',
        minutes: task.estimatedMinutes ?? task.estimatedEffortMinutes ?? 10,
        xp: XP_OF_EVENT[xpEvent],
        xpEvent,
        actionPath: hasAgentTaskActionEntry(task) ? sanitizeLocalActionPath(buildAgentTaskActionPath(task)) : null,
        raw: task
      }
    })
)

const sideMissions = computed(() => missions.value.slice(1))

const headTitle = computed(() => {
  if (missions.value.length === 0) return '先开第一关'
  if (missions.value.length === 1) return '今天闯这一关'
  return `今天闯这 ${missions.value.length} 关`
})

const evidenceNote = computed(() => {
  const first = missions.value[0]
  if (first?.raw.reason) {
    return { title: '为什么先做这一关', body: first.raw.reason }
  }
  if (!hasResume.value) {
    return { title: '为什么先做简历', body: '没有简历，匹配和训练只能先按通用题走。建议来自：你的资料接入状态。' }
  }
  if (missions.value.length > 0) {
    return { title: '建议依据', body: '来自你的目标岗位与最近练习记录。样本不足时会降级为通用推荐，不影响开练。' }
  }
  return null
})

/** 本周连胜推导：以 streakLastDate 为终点向前连续标记（mock 层展示推导） */
const weekStreak = computed(() => {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const days: Array<{ label: string; state: 'done' | 'today' | 'todo' }> = []
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  const lastDate = gameProfile.streakLastDate ? new Date(`${gameProfile.streakLastDate}T00:00:00`) : null

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - mondayOffset + i)
    date.setHours(0, 0, 0, 0)
    const isToday = i === mondayOffset
    const isFuture = date.getTime() > today.getTime()
    let state: 'done' | 'today' | 'todo' = 'todo'
    if (lastDate && !isFuture) {
      const diffDays = Math.round((lastDate.getTime() - date.getTime()) / 86400000)
      if (diffDays >= 0 && diffDays < gameProfile.streakDays) state = 'done'
    }
    if (isToday && state === 'done') state = 'today'
    else if (isToday) state = gameProfile.streakTodayDone ? 'today' : 'todo'
    days.push({ label: isToday ? '今天' : labels[i], state })
  }
  return days.slice(0, 5).concat(days.slice(5))
})

const go = (path: string) => {
  void router.push(path)
}

const enterMission = (mission: Mission) => {
  if (mission.actionPath) {
    go(mission.actionPath)
    return
  }
  go('/agent/today')
}

const completeMission = async (mission: Mission) => {
  if (completingId.value != null) return
  completingId.value = mission.id
  try {
    await completeAgentTaskApi(mission.id, { note: '用户在竞技场首页标记完成' })
    gameProfile.completeMission()
    gameProfile.grantXp(mission.xpEvent)
    tasks.value = tasks.value.map((task) => (task.id === mission.id ? { ...task, status: 'DONE' } : task))
  } catch (error) {
    loadError.value = getErrorMessage(error, '任务完成失败，请稍后重试。')
  } finally {
    completingId.value = null
  }
}

const claimChest = () => {
  const grant = gameProfile.claimChest()
  chestNotice.value = grant ? `+${grant.xp} XP 已入账` : ''
}

const loadAll = async (force = false) => {
  loading.value = true
  loadError.value = ''
  try {
    const [taskRes, overviewRes] = await Promise.allSettled([
      fetchCachedTodayAgentTasks(formatLocalDate(), force),
      fetchCachedDashboardOverview(force)
    ])
    if (taskRes.status === 'fulfilled') {
      tasks.value = Array.isArray(taskRes.value?.tasks) ? taskRes.value.tasks : []
    } else {
      tasks.value = []
    }
    if (overviewRes.status === 'fulfilled') {
      overview.value = overviewRes.value
    }
    if (taskRes.status === 'rejected' && overviewRes.status === 'rejected') {
      loadError.value = getErrorMessage(taskRes.reason, '加载失败')
    }
    const openCount = tasks.value.filter((task) => OPEN_STATUS.has(String(task.status || 'TODO').toUpperCase())).length
    gameProfile.syncMissionTotal(openCount)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  gameProfile.hydrate(authStore.userInfo?.id)
  await loadAll()
})
</script>

<style scoped lang="scss">
.arena-home {
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;

  &__page {
    max-width: 1060px;
    margin: 0 auto;
    padding: 28px 34px 42px;
    position: relative;
    z-index: 1;
  }

  &__head {
    flex-wrap: wrap;
  }

  &__level {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--arena-grn-d);
  }

  &__title {
    margin-top: 5px;
  }

  &__power {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
  }

  &__grid {
    margin-top: 22px;
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 20px;
  }

  &__boss {
    padding: 24px 26px;
  }

  &__side-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  &__side {
    padding: 18px 20px;
  }

  &__chest {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 20px;
  }

  &__panel {
    padding: 20px 22px;
  }

  &__offer {
    background: linear-gradient(150deg, #fff, #f0fbf4);
  }

  &__streak-note {
    margin-top: 14px;
    padding-top: 13px;
    border-top: 1.5px dashed var(--arena-line);
    font-size: 12px;
    color: var(--arena-sub);
    text-align: center;
  }

  &__ai-note {
    padding: 16px 20px;
    border-left: 3px solid var(--arena-vio);
  }

  &__skeleton {
    height: 120px;
    background: linear-gradient(90deg, #fff, #f4f7f4, #fff);
    background-size: 200% 100%;
    animation: arenaShimmer 1.4s infinite;
  }

  &__error {
    margin-top: 22px;
    padding: 26px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
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
  .arena-home {
    margin: -12px -12px 0;

    &__page {
      padding: 18px 14px 26px;
    }

    &__grid,
    &__side-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
