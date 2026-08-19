<template>
  <div class="arena arena-home">
    <div class="arena-home__page">
      <!-- 页头：问候 + 求职准备度 -->
      <div class="arena-between arena-home__head">
        <div>
          <div class="arena-home__level">
            求职准备 · {{ weekdayLabel }}
          </div>
          <h1 class="arena-h1 arena-home__title">{{ greetingName }}，{{ headTitle }}</h1>
        </div>
        <div class="arena-card arena-home__power">
          <div
            class="arena-ring"
            :style="{
              width: '56px',
              height: '56px',
              background: `conic-gradient(var(--arena-grn) 0 ${readinessRingScore}%, var(--arena-line) ${readinessRingScore}% 100%)`
            }"
          >
            <div class="arena-ring__hole" style="width: 44px; height: 44px">
              <b style="font-size: 15px; line-height: 1">{{ readinessDisplayScore }}</b>
              <span class="arena-tiny" style="font-size: 8px; font-weight: 800">准备度</span>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800">Offer 就绪度</div>
            <div class="arena-tiny" style="margin-top: 2px">
              {{ readinessSummary }}
            </div>
          </div>
        </div>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="arena-col" style="margin-top: 22px">
        <div v-for="i in 3" :key="i" class="arena-card arena-home__skeleton"></div>
      </div>

      <div v-else class="arena-home__grid">
        <div class="arena-col">
          <div v-if="taskError" class="arena-card arena-home__module-error">
            <b>今日任务暂时无法更新</b>
            <p class="arena-p">{{ taskError }}{{ tasks.length ? ' 当前展示上次成功加载的任务。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="retryTasks">重新加载任务</button>
          </div>

          <template v-if="taskError && tasks.length === 0">
            <div class="arena-card arena-card--hero arena-home__boss">
              <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                <span class="arena-chip arena-chip--grn-solid">任务待恢复</span>
                <span class="arena-tiny">不会将加载失败误认为没有任务</span>
              </div>
              <h2 class="arena-h2" style="margin-top: 13px">今日任务尚未加载</h2>
              <p class="arena-p" style="margin-top: 9px">请重新加载任务；恢复前不会展示“今天没有任务”的空状态。</p>
              <div class="arena-row" style="margin-top: 18px">
                <button class="arena-btn arena-btn--pri" :disabled="loading" @click="retryTasks">重新加载任务</button>
              </div>
            </div>
          </template>

          <!-- 空态：无任务 -->
          <template v-else-if="missions.length === 0">
            <div class="arena-card arena-card--hero arena-home__boss">
              <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                <span class="arena-chip arena-chip--grn-solid">{{ allAgentTasksDone ? '今日完成' : '新的一天' }}</span>
                <span class="arena-tiny">{{ allAgentTasksDone ? `业务日 ${businessDate}` : '约 8 分钟起步' }}</span>
              </div>
              <h2 class="arena-h2" style="margin-top: 13px">
                {{ allAgentTasksDone ? '今天的训练已全部完成' : hasOverview ? '今天还没有任务，先安排第一项' : '资料概览尚未加载' }}
              </h2>
              <p class="arena-p" style="margin-top: 9px">
                {{ allAgentTasksDone
                  ? '今日 Agent 任务均已记录为完成，可以查看完成记录或等待下一业务日。'
                  : !hasOverview
                    ? '重新加载资料后，系统才能确认简历状态并给出下一步建议。'
                    : hasResume
                    ? '生成今日计划，AI 教练会根据目标岗位安排重点任务。'
                    : '先完成一份可用简历，再根据岗位要求进行匹配与训练。' }}
              </p>
              <div class="arena-row" style="margin-top: 18px">
                <button
                  class="arena-btn arena-btn--pri"
                  style="padding: 13px 24px"
                  @click="handleEmptyPrimaryAction"
                >
                  {{ allAgentTasksDone ? '查看今日完成记录' : hasOverview ? hasResume ? '生成今日计划' : '创建简历' : '重新加载资料' }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <!-- 今日优先任务 -->
            <div class="arena-card arena-card--hero arena-home__boss">
              <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                <span class="arena-chip arena-chip--grn-solid">今日优先任务</span>
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
                  开始处理
                </button>
                <button
                  class="arena-btn arena-btn--sec"
                  style="padding: 12px 18px; font-size: 13.5px"
                  :disabled="completingId === missions[0].id"
                  @click="completeMission(missions[0])"
                >
                  {{ completingId === missions[0].id ? '正在保存…' : '标记为已完成' }}
                </button>
                <button
                  class="arena-btn arena-btn--sec"
                  style="padding: 12px 18px; font-size: 13.5px"
                  @click="router.push('/questions/practice?mode=random&count=5')"
                >
                  先热身 5 题
                </button>
              </div>
            </div>

            <!-- 后续任务 -->
            <div v-if="sideMissions.length" class="arena-home__side-grid">
              <div v-for="(m, idx) in sideMissions" :key="m.id" class="arena-card arena-home__side">
                <div class="arena-between">
                  <span class="arena-chip arena-chip--grn">后续任务 {{ idx + 1 }}</span>
                  <span class="arena-xp-tag">约 {{ m.minutes }} 分钟</span>
                </div>
                <div class="arena-h3" style="margin-top: 11px">{{ m.title }}</div>
                <div class="arena-tiny" style="margin-top: 3px">{{ m.reason }} · {{ m.minutes }} 分钟</div>
                <div class="arena-row" style="margin-top: 10px; gap: 12px">
                  <button class="arena-btn arena-btn--txt" @click="enterMission(m)">去完成 →</button>
                  <button
                    class="arena-btn arena-btn--txt"
                    :disabled="completingId === m.id"
                    @click="completeMission(m)"
                  >
                    {{ completingId === m.id ? '正在保存…' : '标记为已完成' }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- 每日任务进度 -->
          <div class="arena-card arena-card--treasure arena-home__chest">
            <span style="font-size: 22px">✓</span>
            <div style="flex: 1">
              <div class="arena-h3" style="font-size: 13.5px">
                {{ gameProfile.chestReady ? '今日任务已全部完成' : `完成全部 ${gameProfile.todayMissionTotal || 3} 项任务，更新今日记录` }}
              </div>
              <div class="arena-tiny" style="margin-top: 1px">
                {{ gameProfile.chestReady ? '确认后将更新连续完成记录' : '完成后将更新连续完成记录' }}
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
              确认完成
            </button>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="arena-col">
          <div v-if="overviewError" class="arena-card arena-home__module-error">
            <b>资料概览暂时无法更新</b>
            <p class="arena-p">{{ overviewError }}{{ hasOverview ? ' 当前展示上次成功加载的资料。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="loadAll(true)">重新加载资料</button>
          </div>

          <div class="arena-card arena-home__panel">
            <div class="arena-h3">本周完成记录</div>
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
              连续完成 <b style="color: var(--arena-amber)">{{ gameProfile.streakDays }} 天</b>
              <span v-if="gameProfile.streakTodayDone"> · 今天已完成</span>
              <span v-else> · 完成一项任务即可延续</span>
            </div>
          </div>

          <div class="arena-card arena-home__panel arena-home__offer">
            <div class="arena-h3">求职准备清单</div>
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
                <span :style="`color: ${readinessScore !== undefined && readinessScore >= 80 ? 'var(--arena-grn)' : 'var(--arena-mut)'}`">{{ readinessScore !== undefined && readinessScore >= 80 ? '✓' : '○' }}</span>
                <span :style="readinessScore !== undefined && readinessScore >= 80 ? '' : 'color: var(--arena-mut)'">
                  {{ readinessScore === undefined ? '准备度尚无可解释快照' : `准备度达到 80（${readinessScore}/80）` }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="readinessError" class="arena-card arena-home__module-error">
            <b>准备度暂时无法更新</b>
            <p class="arena-p">{{ readinessError }}{{ readinessSnapshot ? ' 当前展示上次成功加载的准备度。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="loadAll(true)">重新加载准备度</button>
          </div>

          <div class="arena-card arena-home__ai-note">
            <div class="arena-row" style="gap: 8px">
              <span class="arena-ai-badge">✦ AI</span>
              <b style="font-size: 12.5px">{{ evidenceNote?.title || '建议依据' }}</b>
            </div>
            <p class="arena-tiny" style="margin-top: 8px; line-height: 1.6">
              {{ evidenceNote?.body || '完成简历、岗位和训练记录后，AI 会把下一步建议与你的真实资料关联起来。' }}
            </p>
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
import { getV3DashboardOverviewApi } from '@/api/dashboard'
import { getLatestJobReadinessApi } from '@/api/jobRequirement'
import { useGameProfileStore, type XpEventKey } from '@/features/game-profile'
import { buildAgentTaskActionPath, hasAgentTaskActionEntry } from '@/utils/agentTaskAction'
import { getErrorMessage } from '@/utils/error'
import { formatDateInTimezone } from '@/utils/format'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO } from '@/types/agent'
import type { UserDashboardOverviewVO, V3DashboardOverviewVO } from '@/types/dashboard'
import type { JobReadinessSnapshotVO } from '@/types/jobRequirement'

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
const taskError = ref('')
const overviewError = ref('')
const readinessError = ref('')
const completingId = ref<number | null>(null)
const tasks = ref<AgentTaskVO[]>([])
const overview = ref<UserDashboardOverviewVO | null>(null)
const v3Overview = ref<V3DashboardOverviewVO | null>(null)
const readinessSnapshot = ref<JobReadinessSnapshotVO | null>(null)
const chestNotice = ref('')

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const greetingName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || '同学')

const hasResume = computed(() => (overview.value?.resumeCount ?? 0) > 0)
const hasOverview = computed(() => overview.value !== null)
const interviewCount = computed(() => overview.value?.interviewCount ?? 0)
const businessDate = computed(() => overview.value?.businessDate || formatDateInTimezone(new Date(), 'Asia/Shanghai'))
const toUtcCalendarDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
const businessCalendarDate = computed(() => toUtcCalendarDate(businessDate.value))
const weekdayLabel = computed(() => WEEKDAY_LABELS[businessCalendarDate.value.getUTCDay()])
const allAgentTasksDone = computed(() =>
  tasks.value.length > 0 && tasks.value.every((task) => String(task.status || '').toUpperCase() === 'DONE')
)

const readinessScore = computed(() => {
  const snapshot = readinessSnapshot.value
  if (!snapshot || snapshot.fallback || snapshot.sampleInsufficient) return undefined
  const score = Number(snapshot.readinessScore ?? snapshot.overallScore)
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : undefined
})
const readinessRingScore = computed(() => readinessScore.value ?? 0)
const readinessDisplayScore = computed(() => readinessScore.value ?? '--')
const readinessSummary = computed(() => {
  const snapshot = readinessSnapshot.value
  if (readinessError.value) {
    return snapshot ? '当前展示上次成功加载的准备度' : readinessError.value
  }
  if (readinessScore.value !== undefined) {
    const missing = Number(snapshot?.missingCount ?? 0)
    return missing > 0 ? `仍有 ${missing} 项岗位要求待补齐` : '当前快照未识别出待补齐的岗位要求'
  }
  return snapshot?.sampleInsufficient || snapshot?.fallback
    ? '当前证据不足，暂不展示准备度分数'
    : '尚未生成可解释的岗位准备度快照'
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
  if (allAgentTasksDone.value) return '今日计划已完成'
  if (missions.value.length === 0) return '安排第一项任务'
  if (missions.value.length === 1) return '完成今日重点任务'
  return `今天安排 ${missions.value.length} 项任务`
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

/** 本周连续完成记录推导：以 streakLastDate 为终点向前连续标记（mock 层展示推导） */
const weekStreak = computed(() => {
  const today = businessCalendarDate.value
  const mondayOffset = (today.getUTCDay() + 6) % 7
  const days: Array<{ label: string; state: 'done' | 'today' | 'todo' }> = []
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  const lastDate = gameProfile.streakLastDate ? toUtcCalendarDate(gameProfile.streakLastDate) : null

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today.getTime())
    date.setUTCDate(today.getUTCDate() - mondayOffset + i)
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
    await completeAgentTaskApi(mission.id, { note: '用户在今日任务页标记完成' })
    const grant = gameProfile.grantXpOnce(mission.xpEvent, `agent-task:${mission.id}`)
    if (grant) gameProfile.completeMission()
    tasks.value = tasks.value.map((task) => (task.id === mission.id ? { ...task, status: 'DONE' } : task))
  } catch (error) {
    taskError.value = getErrorMessage(error, '任务完成失败，请稍后重试。')
  } finally {
    completingId.value = null
  }
}

const claimChest = () => {
  const grant = gameProfile.claimChest()
  chestNotice.value = grant ? '今日完成记录已更新' : ''
}

const handleEmptyPrimaryAction = () => {
  if (allAgentTasksDone.value) {
    go('/agent/today')
    return
  }
  if (!hasOverview.value) {
    void loadAll(true)
    return
  }
  go(hasResume.value ? '/agent/today' : '/resumes')
}

const retryTasks = () => {
  void loadAll(true)
}

const loadAll = async (force = false) => {
  loading.value = true
  try {
    const [overviewRes, v3OverviewRes] = await Promise.allSettled([
      fetchCachedDashboardOverview(force),
      getV3DashboardOverviewApi({ silentError: true })
    ])
    if (overviewRes.status === 'fulfilled') {
      overview.value = overviewRes.value
      overviewError.value = ''
    } else {
      overviewError.value = getErrorMessage(overviewRes.reason, '资料概览加载失败，请稍后重试。')
    }
    if (v3OverviewRes.status === 'fulfilled') {
      v3Overview.value = v3OverviewRes.value
      const targetJobId = Number(
        v3Overview.value?.currentTargetJob?.targetJobId || v3Overview.value?.currentTargetJob?.id
      )
      if (Number.isFinite(targetJobId) && targetJobId > 0) {
        try {
          readinessSnapshot.value = await getLatestJobReadinessApi(targetJobId, {
            silentError: true
          })
          readinessError.value = ''
        } catch (error) {
          readinessError.value = getErrorMessage(error, '准备度加载失败，请稍后重试。')
        }
      } else {
        readinessSnapshot.value = null
        readinessError.value = ''
      }
    } else {
      readinessError.value = getErrorMessage(v3OverviewRes.reason, '准备度所需资料加载失败，请稍后重试。')
    }
    const [taskRes] = await Promise.allSettled([
      fetchCachedTodayAgentTasks(businessDate.value, force)
    ])
    if (taskRes.status === 'fulfilled') {
      tasks.value = Array.isArray(taskRes.value?.tasks) ? taskRes.value.tasks : []
      taskError.value = ''
      gameProfile.syncMissionTotal(tasks.value.length)
    } else {
      taskError.value = getErrorMessage(taskRes.reason, '今日任务加载失败，请稍后重试。')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAll()
})
</script>

<style scoped lang="scss">
.arena-home {
  min-height: calc(100vh - 64px);
  width: 100%;
  margin: 0;

  &__page {
    width: min(100%, var(--user-content-max, 1440px));
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

  &__side-grid--empty {
    .arena-home__side {
      background: linear-gradient(135deg, #fff, #f7faf7);
      border-style: dashed;
    }

    .arena-home__placeholder-status {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      margin-top: 12px;
      color: var(--arena-mut);
      font-size: 12px;
      font-weight: 700;
    }

    .is-placeholder {
      color: var(--arena-mut);
      cursor: default;
      pointer-events: none;
    }
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

  &__module-error {
    display: grid;
    justify-items: start;
    gap: 8px;
    padding: 16px 18px;
    border-color: color-mix(in srgb, var(--arena-amber) 44%, var(--arena-line));
    background: color-mix(in srgb, var(--arena-amber) 8%, var(--arena-surface));

    .arena-p {
      margin: 0;
    }
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
    &__page {
      padding: 18px 14px 26px;
    }

    &__grid,
    &__side-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 980px) {
  .arena-home {
    &__page {
      max-width: 760px;
    }

    &__grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 540px) {
  .arena-home {
    &__side-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
