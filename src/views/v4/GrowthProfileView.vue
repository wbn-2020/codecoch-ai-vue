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
        <el-button v-if="appConfig.enableV6WeeklyReport" @click="goWeeklyReport">求职周报</el-button>
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
      <section v-if="overview && !loading" class="growth-explain-strip">
        <el-tag effect="plain">时间窗：{{ overview.timeWindow || `最近 ${rangeDays} 天` }}</el-tag>
        <el-tag effect="plain" :type="confidenceTagType">可信度：{{ confidenceLabel }}</el-tag>
        <el-tag effect="plain">证据数量：{{ overview.evidenceCount ?? 0 }}</el-tag>
        <el-tag v-for="label in dataSourceLabels" :key="label" effect="plain" type="info">{{ label }}</el-tag>
      </section>

      <section
        v-if="isColdStart && !loading"
        class="growth-next-action"
        aria-labelledby="growth-next-action-title"
      >
        <div>
          <span class="growth-next-action__label">下一步</span>
          <h2 id="growth-next-action-title">先补一条可信训练记录</h2>
          <p>{{ overview?.coldStartReason || '当前证据不足，完成一次今日任务、题库练习或模拟面试后再查看趋势。' }}</p>
        </div>
        <div class="growth-next-action__actions">
          <el-button type="primary" @click="goTodayPlan">去今日任务</el-button>
          <el-button @click="goQuestionTraining">练一组题</el-button>
          <el-button @click="goInterviewCreate">模拟面试</el-button>
        </div>
        <ul v-if="nextEvidenceActions.length" class="evidence-action-list" aria-label="建议补充的证据">
          <li v-for="action in nextEvidenceActions" :key="action">{{ action }}</li>
        </ul>
      </section>

      <section class="v4-grid" :class="{ 'is-cold': isColdStart }" v-loading="loading" aria-label="成长概览">
        <article class="v4-card">
          <span>准备度</span>
          <strong>{{ showStrongScore ? overview?.readinessScore : '待补证据' }}</strong>
          <small>{{ showStrongScore ? '基于近期任务和教练运行记录' : '证据不足时不展示评分' }}</small>
        </article>
        <article class="v4-card">
          <span>任务完成率</span>
          <strong>{{ showStrongScore ? formatPercent(overview?.taskCompletionRate) : '--' }}</strong>
          <small>{{ showStrongScore ? '仅展示可信时间窗内结果' : '完成更多任务后显示' }}</small>
        </article>
        <article class="v4-card">
          <span>今日计划成功率</span>
          <strong>{{ showStrongScore ? formatPercent(overview?.agentSuccessRate) : '--' }}</strong>
          <small>{{ showStrongScore ? '来自 AI 教练运行记录' : '运行记录不足时隐藏' }}</small>
        </article>
        <article class="v4-card">
          <span>启用记忆数</span>
          <strong>{{ overview?.totalMemoryCount ?? 0 }}</strong>
          <small>{{ overview?.totalReviewCount ?? 0 }} 条复盘记录</small>
        </article>
      </section>

      <section v-if="!isColdStart" class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">技能</p>
              <h2>重点技能与趋势</h2>
            </div>
          </div>
          <template v-if="hasSkillEvidence">
            <div v-if="visibleTopSkills.length" class="skill-strip">
              <el-tag v-for="item in visibleTopSkills" :key="item.name" effect="plain">
                {{ item.name }} · {{ item.value }}
              </el-tag>
            </div>
            <div class="trend-list">
              <article v-for="item in visibleSkillTrend" :key="`${item.snapshotDate}-${item.skillCode || item.id}`" class="trend-row">
                <div>
                  <strong>{{ item.skillName || item.skillCode || '未知技能' }}</strong>
                  <span>{{ item.snapshotDate || '--' }} · {{ item.timeWindow || overview?.timeWindow || '近期' }} · 证据 {{ item.evidenceCount ?? item.taskCount ?? 0 }}</span>
                  <small class="trend-meta">可信度：{{ confidenceText(item.confidenceLevel) }} · 来源：{{ trendSourceText(item) }}</small>
                  <small v-if="item.coldStartReason" class="trend-cold">{{ item.coldStartReason }}</small>
                </div>
                <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
              </article>
            </div>
          </template>
          <div v-else-if="!loading" class="compact-empty">
            <div>
              <strong>{{ topSkillEmptyTitle }}</strong>
              <p>{{ topSkillEmptyDescription }}</p>
            </div>
            <el-button type="primary" @click="goQuestionTraining">练一组题</el-button>
          </div>
        </div>
      </section>

      <section v-if="!isColdStart" class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">准备度</p>
              <h2>准备度趋势</h2>
            </div>
          </div>
          <div class="trend-list">
            <article v-for="item in visibleReadinessTrend" :key="item.id" class="trend-row">
              <div>
                <strong>{{ item.scoreDate || '--' }}</strong>
                <span>
                  {{ item.timeWindow || overview?.timeWindow || '近期' }} · 证据 {{ item.evidenceCount ?? 0 }} · 完成率 {{ item.taskCompletionRate ?? 0 }}% · 今日计划 {{ item.agentSuccessRate ?? 0 }}%
                </span>
                <small class="trend-meta">可信度：{{ confidenceText(item.confidenceLevel) }} · 来源：{{ trendSourceText(item) }}</small>
                <small v-if="item.coldStartReason" class="trend-cold">{{ item.coldStartReason }}</small>
              </div>
              <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
            </article>
            <div v-if="!visibleReadinessTrend.length && !loading" class="compact-empty">
              <div>
                <strong>还没有可比较的准备度记录</strong>
                <p>继续完成今日任务，积累下一个可信时间点后再比较变化。</p>
              </div>
              <el-button type="primary" @click="goTodayPlan">去今日任务</el-button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { appConfig } from '@/config'
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
const showStrongScore = computed(() => overview.value?.displayPolicy?.showStrongScore === true && overview.value?.readinessScore !== undefined && overview.value?.readinessScore !== null)
const showTopSkillTrend = computed(() => overview.value?.displayPolicy?.showTopSkillTrend !== false && showStrongScore.value)
const showReadinessTrend = computed(() => overview.value?.displayPolicy?.showReadinessTrend !== false && showStrongScore.value)
const visibleTopSkills = computed(() => showTopSkillTrend.value ? (overview.value?.topSkills || []) : [])
const hasDisplayableTrendConfidence = (level?: string) => {
  const normalized = String(level || 'LOW').toUpperCase()
  return normalized === 'MEDIUM' || normalized === 'HIGH'
}
const visibleSkillTrend = computed(() => showTopSkillTrend.value ? skillTrend.value.filter((item) => hasDisplayableTrendConfidence(item.confidenceLevel)) : [])
const visibleReadinessTrend = computed(() => showReadinessTrend.value ? readinessTrend.value.filter((item) => hasDisplayableTrendConfidence(item.confidenceLevel)) : [])
const hasSkillEvidence = computed(() => visibleTopSkills.value.length > 0 || visibleSkillTrend.value.length > 0)
const isColdStart = computed(() => Boolean(overview.value) && !showStrongScore.value)
const dataSourceLabels = computed(() => overview.value?.dataSourceLabels || [])
const nextEvidenceActions = computed(() => overview.value?.nextEvidenceActions || [])
const topSkillEmptyTitle = computed(() => showTopSkillTrend.value ? '还没有重点技能' : '重点技能暂不展示强趋势')
const topSkillEmptyDescription = computed(() =>
  showTopSkillTrend.value
    ? '完成带技能标签的题库练习、今日任务或模拟面试后，系统会汇总你最近反复暴露的技能点。'
    : '当前证据还不够稳定，页面只保留补资料入口，不把零散技能记录包装成 Top 趋势。'
)
const confidenceLabel = computed(() => {
  const level = String(overview.value?.confidenceLevel || 'LOW').toUpperCase()
  if (level === 'HIGH') return '高'
  if (level === 'MEDIUM') return '中'
  return '低'
})
const confidenceTagType = computed(() => {
  const level = String(overview.value?.confidenceLevel || 'LOW').toUpperCase()
  if (level === 'HIGH') return 'success'
  if (level === 'MEDIUM') return 'warning'
  return 'info'
})
const formatPercent = (value?: number) => `${Math.max(0, Math.min(100, Number(value || 0))).toFixed(0)}%`
const confidenceText = (level?: string) => {
  const normalized = String(level || 'LOW').toUpperCase()
  if (normalized === 'HIGH') return '高'
  if (normalized === 'MEDIUM') return '中'
  return '低'
}
const trendSourceText = (item: SkillGrowthSnapshotVO | ReadinessScoreRecordVO) => {
  const labels = item.dataSourceLabels?.filter(Boolean)
  return labels?.length ? labels.join('、') : dataSourceLabels.value.join('、')
}

const goTodayPlan = () => router.push('/agent/today')
const goQuestionTraining = () => router.push('/questions/recommendations')
const goInterviewCreate = () => router.push('/interviews/create')
const goWeeklyReport = () => router.push('/agent/weekly-reports')

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
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-surface, var(--app-surface));
}

.v4-page-header h1,
.section-head h2 {
  margin: 0;
}

.v4-page-header h1 {
  margin-top: 8px;
  font-size: 26px;
}

.v4-page-header p,
.trend-row span {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow,
.section-kicker {
  color: var(--arena-grn-d, var(--app-primary-hover));
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-actions,
.skill-strip,
.growth-explain-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.v4-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-surface-muted, var(--app-surface-raised));
}

.partial-alert {
  margin-bottom: 16px;
}

.growth-explain-strip,
.growth-next-action {
  margin-bottom: 16px;
}

.growth-next-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px 18px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--user-primary-border, var(--app-border));
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-primary-faint, var(--arena-grn-soft));
}

.growth-next-action h2,
.growth-next-action p {
  margin: 0;
}

.growth-next-action h2 {
  margin-top: 4px;
  font-size: 18px;
}

.growth-next-action p {
  margin-top: 6px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.growth-next-action__label {
  color: var(--arena-grn-d, var(--app-primary-hover));
  font-size: 12px;
  font-weight: 700;
}

.growth-next-action__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.growth-next-action .evidence-action-list {
  grid-column: 1 / -1;
  margin-top: 0;
}

.v4-card,
.trend-row {
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-surface, var(--app-surface));
}

.v4-card {
  padding: 12px 14px;
  border-width: 0 1px 0 0;
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.v4-card span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.v4-card strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  line-height: 1.25;
}

.v4-card small {
  display: block;
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.evidence-action-list {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.section-head {
  margin-bottom: 16px;
}

.section-kicker {
  margin: 0 0 6px;
}

.trend-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.compact-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0 2px;
  border-top: 1px solid var(--app-border);
}

.compact-empty strong,
.compact-empty p {
  display: block;
  margin: 0;
}

.compact-empty p {
  margin-top: 4px;
  color: var(--app-text-muted);
  line-height: 1.6;
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

.trend-row small {
  display: block;
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.trend-cold {
  color: var(--user-warning-text, var(--user-warning));
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .v4-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .growth-next-action {
    grid-template-columns: 1fr;
  }

  .growth-next-action__actions {
    justify-content: flex-start;
  }

  .compact-empty {
    align-items: flex-start;
    flex-direction: column;
  }

  .v4-grid,
  .trend-row {
    grid-template-columns: 1fr;
  }

  .v4-card {
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .v4-card:last-child {
    border-bottom: 0;
  }
}
</style>
