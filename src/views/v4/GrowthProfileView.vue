<template>
  <div class="page-shell v4-growth-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 成长画像</div>
        <h1>成长画像</h1>
        <p>从真实 V4 接口读取准备度、任务完成率、技能趋势和长期 Agent 信号。</p>
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
          <span>Agent 成功率</span>
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
            <el-empty v-if="!(overview?.topSkills || []).length && !loading" description="暂无重点技能数据" />
          </div>
          <div class="trend-list">
            <article v-for="item in skillTrend" :key="`${item.snapshotDate}-${item.skillCode || item.id}`" class="trend-row">
              <div>
                <strong>{{ item.skillName || item.skillCode || '未知技能' }}</strong>
                <span>{{ item.snapshotDate || '--' }} · 任务 {{ item.taskCount ?? 0 }} · 完成 {{ item.doneCount ?? 0 }}</span>
              </div>
              <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
            </article>
            <el-empty v-if="!skillTrend.length && !loading" description="暂无技能趋势数据" />
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
                  完成率 {{ item.taskCompletionRate ?? 0 }}% · Agent {{ item.agentSuccessRate ?? 0 }}%
                </span>
              </div>
              <el-progress :percentage="boundedPercent(item.score)" :stroke-width="8" />
            </article>
            <el-empty v-if="!readinessTrend.length && !loading" description="暂无准备度趋势数据" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

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
const errorMessage = ref('')
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

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewData, skillsData, readinessData] = await Promise.all([
      getGrowthOverviewApi(),
      getGrowthSkillsTrendApi(params),
      getGrowthReadinessTrendApi(params)
    ])
    overview.value = overviewData
    skillTrend.value = skillsData
    readinessTrend.value = readinessData
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
