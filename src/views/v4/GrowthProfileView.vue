<template>
  <div class="page-shell v4-growth-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">成长画像</div>
        <h1>成长画像</h1>
        <p>汇总准备度、任务完成率、技能趋势和长期记忆信号，帮助你判断最近该补哪里。</p>
      </div>
      <div class="v4-actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="load" />
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="成长数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <template v-else>
      <el-alert
        v-if="partialLoadWarning"
        class="partial-alert"
        type="warning"
        show-icon
        :closable="false"
        title="部分成长数据暂时不可用"
        :description="partialLoadWarning"
      />
      <section class="v4-grid" v-loading="loading">
        <article class="v4-card">
          <span>准备度</span>
          <strong>{{ overview?.readinessScore ?? 0 }}</strong>
        </article>
        <article class="v4-card">
          <span>任务完成率</span>
          <strong>{{ overview?.taskCompletionRate ?? 0 }}%</strong>
        </article>
        <article class="v4-card">
          <span>今日计划成功率</span>
          <strong>{{ overview?.agentSuccessRate ?? 0 }}%</strong>
        </article>
        <article class="v4-card">
          <span>启用记忆数</span>
          <strong>{{ overview?.totalMemoryCount ?? 0 }}</strong>
        </article>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">技能</p>
              <h2>重点技能与趋势</h2>
            </div>
          </div>
          <div class="skill-strip">
            <el-tag v-for="item in overview?.topSkills || []" :key="item.name" effect="plain">
              {{ item.name }} · {{ item.value }}
            </el-tag>
            <AppState
              v-if="!(overview?.topSkills || []).length && !loading"
              type="empty"
              title="还没有重点技能"
              description="完成带技能标签的题库练习、今日任务或模拟面试后，系统会汇总你最近反复暴露的技能点。"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goQuestionTraining">进入题库训练</el-button>
                <el-button @click="goInterviewCreate">创建模拟面试</el-button>
              </div>
            </AppState>
          </div>
          <div class="trend-list">
            <article v-for="item in skillTrend" :key="`${item.snapshotDate}-${item.skillCode || item.id}`" class="trend-row">
              <div>
                <strong>{{ item.skillName || item.skillCode || '未知技能' }}</strong>
                <span>{{ item.snapshotDate || '--' }} · 任务 {{ item.taskCount ?? 0 }} · 完成 {{ item.doneCount ?? 0 }}</span>
              </div>
              <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
            </article>
            <AppState
              v-if="!skillTrend.length && !loading"
              type="empty"
              title="还没有技能趋势"
              description="趋势需要连续几天的训练记录；先完成今日任务或专项练习，再回来查看技能分数变化。"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goTodayPlan">去今日任务</el-button>
                <el-button @click="goQuestionTraining">练一组题</el-button>
              </div>
            </AppState>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">准备度</p>
              <h2>准备度趋势</h2>
            </div>
          </div>
          <div class="trend-list">
            <article v-for="item in readinessTrend" :key="item.id" class="trend-row">
              <div>
                <strong>{{ item.scoreDate || '--' }}</strong>
                <span>
                  完成率 {{ item.taskCompletionRate ?? 0 }}% · 今日计划 {{ item.agentSuccessRate ?? 0 }}%
                </span>
              </div>
              <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
            </article>
            <AppState
              v-if="!readinessTrend.length && !loading"
              type="empty"
              title="还没有准备度趋势"
              description="准备度会结合任务完成、今日计划和复盘信号；先生成今日计划并完成一项动作，趋势会更有参考价值。"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goTodayPlan">生成今日计划</el-button>
                <el-button @click="load">刷新画像</el-button>
              </div>
            </AppState>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getGrowthOverviewApi,
  getGrowthReadinessTrendApi,
  getGrowthSkillsTrendApi,
  type GrowthOverviewVO,
  type ReadinessScoreRecordVO,
  type SkillGrowthSnapshotVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const router = useRouter()
const errorMessage = ref('')
const partialLoadWarning = ref('')
const rangeDays = ref(30)
const overview = ref<GrowthOverviewVO>()
const skillTrend = ref<SkillGrowthSnapshotVO[]>([])
const readinessTrend = ref<ReadinessScoreRecordVO[]>([])

const rangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 }
]

const boundedPercent = (value?: number) => Math.max(0, Math.min(100, Number(value || 0)))

const goTodayPlan = () => router.push('/agent/today')
const goQuestionTraining = () => router.push('/questions/recommendations')
const goInterviewCreate = () => router.push('/interviews/create')

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '成长画像暂时加载失败，请稍后重试。')
  }
  return '成长画像暂时加载失败，请稍后重试。'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  partialLoadWarning.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewResult, skillsResult, readinessResult] = await Promise.allSettled([
      getGrowthOverviewApi(),
      getGrowthSkillsTrendApi(params),
      getGrowthReadinessTrendApi(params)
    ])

    const warnings: string[] = []
    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
    } else {
      overview.value = undefined
      warnings.push(getErrorMessage(overviewResult.reason))
    }

    if (skillsResult.status === 'fulfilled') {
      skillTrend.value = skillsResult.value
    } else {
      skillTrend.value = []
      warnings.push(getErrorMessage(skillsResult.reason))
    }

    if (readinessResult.status === 'fulfilled') {
      readinessTrend.value = readinessResult.value
    } else {
      readinessTrend.value = []
      warnings.push(getErrorMessage(readinessResult.reason))
    }

    if (overviewResult.status === 'rejected' && skillsResult.status === 'rejected' && readinessResult.status === 'rejected') {
      errorMessage.value = warnings[0] || '成长画像暂时加载失败，请稍后重试。'
      return
    }
    partialLoadWarning.value = [...new Set(warnings)].join('；')
  } catch (error) {
    overview.value = undefined
    skillTrend.value = []
    readinessTrend.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v4-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1,
.section-head h2 {
  margin: 0;
}

.v4-page-header h1 {
  margin-top: 8px;
  font-size: 28px;
}

.v4-page-header p,
.trend-row span {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow,
.section-kicker {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-actions,
.skill-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.v4-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.partial-alert {
  margin-bottom: 16px;
}

.v4-card,
.trend-row {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.v4-card {
  padding: 16px;
}

.v4-card span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.v4-card strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.section-head {
  margin-bottom: 16px;
}

.section-kicker {
  margin: 0 0 6px;
}

.trend-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.trend-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px);
  gap: 18px;
  align-items: center;
  padding: 14px;
}

.trend-row strong,
.trend-row span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .v4-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .v4-grid,
  .trend-row {
    grid-template-columns: 1fr;
  }
}
</style>
