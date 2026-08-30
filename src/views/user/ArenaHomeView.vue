<template>
  <div class="arena arena-home">
    <div class="arena-home__page">
      <!-- 对照原型 .page-head：eyebrow 徽标 + H1 + sub + 右侧动作 -->
      <header class="arena-home__head">
        <div class="arena-home__head-copy">
          <span class="arena-home__eyebrow">
            <i class="arena-home__dot" aria-hidden="true"></i>
            {{ weekdayLabel }} · {{ businessDate }}
          </span>
          <h1>{{ greetingName }}，{{ headTitle }}</h1>
          <p class="arena-home__sub">
            {{ allAgentTasksDone
              ? '今天的任务已记录完成，回顾训练过程或安排下一步。'
              : missions.length
                ? `还有 ${missions.length} 项待推进任务，优先完成最重要的一项。`
                : '根据现有资料补齐今天的第一项行动，建立稳定的求职闭环。' }}
          </p>
        </div>
        <div class="arena-home__head-actions">
          <button class="arena-btn arena-btn--sec" type="button" @click="go('/career-calendar')">
            <CalendarDays :size="14" aria-hidden="true" />
            跳到日历
          </button>
          <button class="arena-btn arena-btn--pri" type="button" @click="handlePrimaryAction">
            <Sparkles :size="14" aria-hidden="true" />
            {{ allAgentTasksDone ? '查看今日记录' : '生成今日计划' }}
          </button>
        </div>
      </header>

      <ModuleTabs :items="moduleTabs" />

      <!-- 加载骨架 -->
      <div v-if="loading" class="arena-home__grid">
        <div class="arena-home__col">
          <div v-for="i in 2" :key="i" class="arena-card arena-home__skeleton"></div>
        </div>
        <div class="arena-home__col">
          <div v-for="i in 3" :key="i" class="arena-card arena-home__skeleton arena-home__skeleton--stat"></div>
        </div>
      </div>

      <div v-else class="arena-home__grid">
        <!-- 左列：闭环引导 + 今日任务清单 -->
        <div class="arena-home__col">
          <div v-if="taskError" class="arena-card arena-home__notice">
            <b>今日任务暂时无法更新</b>
            <p>{{ taskError }}{{ tasks.length ? ' 当前展示上次成功加载的任务。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="retryTasks">重新加载任务</button>
          </div>

          <section class="arena-card arena-home__guide">
            <div class="arena-home__guide-head">
              <div>
                <p class="arena-home__guide-kicker">
                  {{ missions.length
                    ? `今日计划进行中 · ${completedTaskCount} / ${tasks.length} 已完成`
                    : `新的一天 · 约 ${guideMinutes} 分钟起步` }}
                </p>
                <h2>{{ guideTitle }}</h2>
              </div>
              <span class="arena-home__eyebrow arena-home__eyebrow--ai">AI 教练</span>
            </div>
            <p class="arena-home__guide-copy">{{ guideCopy }}</p>
            <div class="arena-home__chips">
              <span v-for="chip in guideChips" :key="chip" class="arena-home__chip">{{ chip }}</span>
            </div>
            <button
              v-if="showPlanAction"
              class="arena-btn arena-btn--pri arena-home__guide-cta"
              type="button"
              @click="handlePrimaryAction"
            >
              {{ planActionLabel }}
            </button>
          </section>

          <section class="arena-card arena-home__list">
            <div class="arena-home__list-head">
              <h3>今日任务清单</h3>
              <span class="arena-home__list-ratio">{{ completedTaskCount }} / {{ tasks.length }}</span>
            </div>
            <div v-if="taskRows.length" class="arena-home__list-body">
              <div v-for="row in taskRows" :key="row.id" class="arena-home__task" :class="{ 'is-done': row.done }">
                <label class="arena-home__check">
                  <input
                    type="checkbox"
                    :checked="row.done"
                    :disabled="row.done && completingId !== row.id"
                    @change="completeMission(row)"
                  />
                  <span class="arena-home__box" aria-hidden="true"></span>
                  <span class="arena-home__task-txt">{{ row.title }}</span>
                </label>
                <span class="arena-home__task-min">{{ row.minutes }} 分钟</span>
                <div v-if="!row.done" class="arena-home__task-actions">
                  <button
                    class="arena-btn arena-btn--txt"
                    type="button"
                    :disabled="completingId === row.id"
                    @click="enterMission(row)"
                  >
                    去完成
                  </button>
                  <button
                    class="arena-btn arena-btn--txt"
                    type="button"
                    :disabled="completingId === row.id"
                    @click="completeMission(row)"
                  >
                    {{ completingId === row.id ? '正在保存…' : '标记为已完成' }}
                  </button>
                </div>
              </div>
            </div>
            <p v-else-if="taskError" class="arena-home__list-empty">任务恢复前不会展示“今天没有任务”的空状态。</p>
            <p v-else class="arena-home__list-empty">今天还没有任务，先生成今日计划。</p>
          </section>
        </div>

        <!-- 右列：就绪度 / 本周完成度 / 建议依据 -->
        <div class="arena-home__col arena-home__col--rail">
          <StatCard
            label="Offer 就绪度"
            :value="readinessDisplayScore"
            :detail="readinessSummary"
            :tone="readinessTone"
            :progress="readinessScore"
            test-id="readiness-metric"
          />

          <StatCard
            label="本周完成度"
            :value="`${weekCompletedCount} / ${weekTaskTotal}`"
            :detail="weekTrend.length ? `近 7 日累计投入 ${weekMinutesTotal} 分钟` : '近 7 日完成数据加载中'"
            :progress="weekCompletionProgress"
          />

          <section class="arena-card arena-home__evidence">
            <div class="arena-home__list-head arena-home__list-head--plain">
              <h3>建议依据</h3>
              <span class="arena-home__eyebrow arena-home__eyebrow--ai">AI</span>
            </div>
            <div class="arena-home__evidence-body">
              <p>{{ evidenceNote?.body || '完成简历、岗位和训练记录后，AI 会把下一步建议与你的真实资料关联起来。' }}</p>
              <p class="arena-home__muted">更新简历版本后会自动回填到岗位匹配。</p>
            </div>
          </section>

          <div v-if="overviewError" class="arena-card arena-home__notice">
            <b>资料概览暂时无法更新</b>
            <p>{{ overviewError }}{{ hasOverview ? ' 当前展示上次成功加载的资料。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="loadAll(true)">重新加载资料</button>
          </div>

          <div v-if="readinessError" class="arena-card arena-home__notice">
            <b>准备度暂时无法更新</b>
            <p>{{ readinessError }}{{ readinessSnapshot ? ' 当前展示上次成功加载的准备度。' : '' }}</p>
            <button class="arena-btn arena-btn--sec" :disabled="loading" @click="loadAll(true)">重新加载准备度</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { completeAgentTaskApi } from '@/api/agent'
import { getPersonalTaskTrendApi } from '@/api/analytics'
import { fetchCachedDashboardOverview, fetchCachedTodayAgentTasks } from '@/composables/useUserHomeDataCache'
import { getV3DashboardOverviewApi } from '@/api/dashboard'
import { getLatestJobReadinessApi } from '@/api/jobRequirement'
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import StatCard from '@/components/user-ui/StatCard.vue'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
import { useGameProfileStore, type XpEventKey } from '@/features/game-profile'
import { buildAgentTaskActionPath, hasAgentTaskActionEntry } from '@/utils/agentTaskAction'
import { getErrorMessage } from '@/utils/error'
import { formatDateInTimezone } from '@/utils/format'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO } from '@/types/agent'
import type { TrendPointVO } from '@/types/analytics'
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
const moduleTabs = useUserModuleTabs('today')
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

// —— 近 7 日完成度（真实数据：/analytics/personal/task-trend，仅用于右侧统计卡）——
interface WeekTrendPoint {
  date: string
  minutes: number
  completed: number
  generated: number
}
const weekTrend = ref<WeekTrendPoint[]>([])

const loadWeekTrend = async () => {
  try {
    const points: TrendPointVO[] = await getPersonalTaskTrendApi({ days: 7 })
    weekTrend.value = points.map((point) => ({
      date: point.date,
      minutes: Number(point.completedMinutes || 0),
      completed: Number(point.completedCount || 0),
      generated: Number(point.generatedCount || 0)
    }))
  } catch {
    // 趋势是增益信息，加载失败时统计卡降级展示，不影响首页主流程
    weekTrend.value = []
  }
}

const weekMinutesTotal = computed(() => weekTrend.value.reduce((sum, point) => sum + point.minutes, 0))
const weekCompletedCount = computed(() => weekTrend.value.reduce((sum, point) => sum + point.completed, 0))
const weekTaskTotal = computed(() =>
  Math.max(
    weekTrend.value.reduce((sum, point) => sum + Math.max(point.generated, point.completed), 0),
    weekTrend.value.length
  )
)
const weekCompletionProgress = computed(() =>
  weekTaskTotal.value ? Math.round((weekCompletedCount.value / weekTaskTotal.value) * 100) : 0
)

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const greetingName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || '同学')

const hasResume = computed(() => (overview.value?.resumeCount ?? 0) > 0)
const hasOverview = computed(() => overview.value !== null)
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
const completedTaskCount = computed(() =>
  tasks.value.filter((task) => String(task.status || '').toUpperCase() === 'DONE').length
)

const readinessScore = computed(() => {
  const snapshot = readinessSnapshot.value
  if (!snapshot || snapshot.fallback || snapshot.sampleInsufficient) return undefined
  const score = Number(snapshot.readinessScore ?? snapshot.overallScore)
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : undefined
})
const readinessDisplayScore = computed(() => readinessScore.value ?? '--')
const readinessTone = computed(() => (readinessScore.value === undefined ? 'warning' : 'default'))
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

const asMission = (task: AgentTaskVO): Mission => {
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
}

const OPEN_STATUS = new Set(['TODO', 'DOING'])
const isDoneTask = (task: AgentTaskVO) => String(task.status || 'TODO').toUpperCase() === 'DONE'

const missions = computed<Mission[]>(() =>
  tasks.value.filter((task) => OPEN_STATUS.has(String(task.status || 'TODO').toUpperCase())).slice(0, 3).map(asMission)
)

/** 任务清单行：未完成任务在前，已完成任务以勾选态留在清单内可回顾 */
interface TaskRow extends Mission {
  done: boolean
}
const taskRows = computed<TaskRow[]>(() => {
  const open = tasks.value.filter((task) => !isDoneTask(task)).map((task) => ({ ...asMission(task), done: false }))
  const done = tasks.value.filter(isDoneTask).map((task) => ({ ...asMission(task), done: true }))
  return [...open, ...done]
})

const headTitle = computed(() => {
  if (allAgentTasksDone.value) return '今日计划已完成'
  if (missions.value.length === 0) return '安排第一项任务'
  if (missions.value.length === 1) return '完成今日重点任务'
  return `先把今天的 ${missions.value.length} 项任务清掉`
})

const guideMinutes = computed(() => missions.value[0]?.minutes ?? 8)

const guideTitle = computed(() => {
  if (taskError.value && tasks.value.length === 0) return '今日任务尚未加载'
  if (allAgentTasksDone.value) return '今天的训练已全部完成'
  if (missions.value.length > 0) return `优先完成「${missions.value[0].title}」`
  if (!hasOverview.value) return '资料概览尚未加载'
  if (!hasResume.value) return '先完成一份可用简历'
  return '先安排第一项任务，把今天的闭环跑通'
})

const guideCopy = computed(() => {
  if (taskError.value && tasks.value.length === 0) return '请重新加载任务；恢复前不会展示“今天没有任务”的空状态。'
  if (allAgentTasksDone.value) return '今日 Agent 任务均已记录为完成，可以查看完成记录或等待下一业务日。'
  if (missions.value.length > 0) return missions.value[0].reason
  if (!hasOverview.value) return '重新加载资料后，系统才能确认简历状态并给出下一步建议。'
  if (!hasResume.value) return '先完成一份可用简历，再根据岗位要求进行匹配与训练。'
  return '点击下方“生成今日计划”，AI 会根据你的目标岗位、近期进度和薄弱点，定制当日必做任务。'
})

const guideChips = computed(() => {
  if (missions.value.length > 0) return missions.value.map((mission) => `${mission.minutes} 分钟 · ${mission.title}`)
  return ['补 1 个岗位证据', '跑 1 轮推荐题组', '提交 1 份今日打卡']
})

const showPlanAction = computed(
  () => missions.value.length === 0 || allAgentTasksDone.value || !hasOverview.value
)

const planActionLabel = computed(() => {
  if (allAgentTasksDone.value) return '查看今日完成记录'
  if (!hasOverview.value) return '重新加载资料'
  if (missions.value.length > 0) return '生成今日计划'
  return hasResume.value ? '生成今日计划' : '创建简历'
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

const handlePrimaryAction = () => {
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
  // 趋势统计非首屏关键路径，不阻塞主数据
  void loadWeekTrend()
})
</script>

<style scoped lang="scss">
.arena-home {
  width: 100%;
  margin: 0;

  &__page {
    width: min(100%, var(--user-content-max, 1440px));
    margin: 0 auto;
    padding: 24px 24px 40px;
  }

  // ---- 页头（原型 .page-head）----
  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  &__head-copy {
    min-width: 0;

    h1 {
      margin: 10px 0 0;
      color: var(--user-text);
      font-size: var(--user-text-h1, 30px);
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.2;
    }
  }

  &__sub {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: var(--user-text-body-sm, 13px);
    line-height: 1.5;
  }

  &__head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .arena-btn {
      height: 36px;
      padding: 0 16px;
      font-size: 13px;
    }
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: var(--user-radius-full, 999px);
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: var(--user-text-overline, 11px);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;

    &--ai {
      background: var(--user-ai-soft);
      color: var(--user-ai);
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--user-primary);
  }

  // ---- 两列工作区（原型 .grid-2-1）----
  &__grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
    align-items: start;
  }

  &__col {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  &__col--rail {
    gap: 12px;
  }

  // ---- 闭环引导卡 ----
  &__guide {
    padding: 24px;
  }

  &__guide-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;

    h2 {
      margin: 4px 0 0;
      color: var(--user-text);
      font-size: var(--user-text-h3, 17px);
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.35;
    }
  }

  &__guide-kicker {
    margin: 0;
    color: var(--user-text-muted);
    font-size: var(--user-text-caption, 12px);
  }

  &__guide-copy {
    margin: 0 0 16px;
    color: var(--user-text-secondary);
    font-size: var(--user-text-body-sm, 13px);
    line-height: 1.6;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }

  &__chip {
    padding: 4px 10px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-full, 999px);
    background: var(--user-surface-muted);
    color: var(--user-text-secondary);
    font-size: var(--user-text-caption, 12px);
    font-weight: 500;
  }

  &__guide-cta {
    height: 40px;
    padding: 0 22px;
  }

  // ---- 今日任务清单 ----
  &__list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--user-border);

    h3 {
      margin: 0;
      color: var(--user-text);
      font-size: var(--user-text-h4, 15px);
      font-weight: 600;
    }
  }

  &__list-head--plain {
    padding: 16px 20px;
  }

  &__list-ratio {
    color: var(--user-text-muted);
    font-size: var(--user-text-body-sm, 13px);
    font-variant-numeric: tabular-nums;
  }

  &__list-body {
    padding: 8px;
  }

  &__task {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 8px 12px;
    border-radius: var(--user-radius-md, 10px);

    &:hover {
      background: var(--user-surface-muted);
    }

    &.is-done .arena-home__task-txt {
      color: var(--user-text-muted);
      text-decoration: line-through;
    }
  }

  &__check {
    display: inline-flex;
    flex: 1 1 240px;
    align-items: center;
    gap: 10px;
    min-width: 0;
    cursor: pointer;

    input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  }

  &__box {
    display: grid;
    flex: none;
    width: 18px;
    height: 18px;
    place-items: center;
    border: 1.5px solid var(--user-border-strong);
    border-radius: var(--user-radius-sm, 6px);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: transparent;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  &__check input:checked + &__box {
    border-color: var(--user-primary);
    background: var(--user-primary);
    color: var(--user-primary-contrast, #fff);

    &::after {
      content: '✓';
    }
  }

  &__check input:focus-visible + &__box {
    outline: 2px solid var(--user-accent-ring, var(--user-primary));
    outline-offset: 2px;
  }

  &__task-txt {
    min-width: 0;
    color: var(--user-text);
    font-size: var(--user-text-body, 14px);
    line-height: 1.45;
  }

  &__task-min {
    flex: none;
    color: var(--user-text-muted);
    font-size: var(--user-text-caption, 12px);
    font-variant-numeric: tabular-nums;
  }

  &__task-actions {
    display: flex;
    flex: none;
    gap: 8px;

    .arena-btn {
      padding: 4px 8px;
      font-size: 12.5px;
    }
  }

  &__list-empty {
    margin: 0;
    padding: 20px;
    color: var(--user-text-muted);
    font-size: var(--user-text-body-sm, 13px);
  }

  &__muted {
    color: var(--user-text-muted);
  }

  // ---- 建议依据 ----
  &__evidence-body {
    padding: 16px 20px 18px;

    p {
      margin: 0 0 8px;
      color: var(--user-text-secondary);
      font-size: var(--user-text-body-sm, 13px);
      line-height: 1.7;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  // ---- 模块级错误提示 ----
  &__notice {
    display: grid;
    gap: 8px;
    justify-items: start;
    padding: 16px 18px;
    border-color: color-mix(in srgb, var(--user-warning) 40%, var(--user-border));
    background: var(--user-warning-soft);

    b {
      color: var(--user-text);
      font-size: var(--user-text-body, 14px);
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--user-text-secondary);
      font-size: var(--user-text-body-sm, 13px);
      line-height: 1.6;
    }

    .arena-btn {
      height: 32px;
      padding: 0 14px;
      font-size: 12.5px;
    }
  }

  &__skeleton {
    height: 140px;

    &--stat {
      height: 108px;
    }

    background: linear-gradient(90deg, var(--user-surface), var(--user-surface-muted), var(--user-surface));
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

@media (max-width: 1024px) {
  .arena-home__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .arena-home {
    &__page {
      padding: 18px 14px 28px;
    }

    &__head {
      align-items: flex-start;
      flex-direction: column;
    }

    &__head-actions .arena-btn {
      flex: 1 1 auto;
    }

    &__guide {
      padding: 18px;
    }
  }
}
</style>
