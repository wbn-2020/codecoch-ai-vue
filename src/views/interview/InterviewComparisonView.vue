<template>
  <div v-loading="loading" class="comparison-page page-shell">
    <header class="comparison-header">
      <div>
        <div class="eyebrow">
          <GitCompareArrows :size="16" />
          跨场复盘
        </div>
        <h1>面试表现比较</h1>
        <p>只比较同岗位、同评分量表版本的报告；样本不足和不可比较原因会原样保留。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/interviews/history')">
          <History :size="16" />
          返回面试历史
        </el-button>
      </div>
    </header>

    <AppState
      v-if="loadError && !comparison"
      type="error"
      title="比较结果不可用"
      :description="loadError"
    >
      <el-button type="primary" @click="router.push('/interviews/history')">返回面试历史</el-button>
    </AppState>

    <template v-else-if="comparison">
      <el-alert
        v-if="comparison.idempotentReplay"
        type="info"
        show-icon
        :closable="false"
        title="已恢复相同请求的比较结果"
      />

      <el-alert
        v-for="warning in comparison.warnings"
        :key="`${warning.code}-${warning.message}`"
        class="comparison-warning"
        type="warning"
        show-icon
        :closable="false"
        :title="comparisonReasonLabel(warning.code)"
        :description="warning.message"
      />

      <section v-if="!comparison.comparable" class="comparison-panel unavailable-panel">
        <div class="section-head">
          <div>
            <span class="panel-kicker">保守结论</span>
            <h2>这些报告暂时不能形成可信比较</h2>
          </div>
          <el-tag type="warning" effect="plain">不可比较</el-tag>
        </div>
        <div v-if="comparison.unavailableReasons.length" class="reason-list">
          <article v-for="reason in comparison.unavailableReasons" :key="`${reason.code}-${reason.message}`">
            <AlertTriangle :size="18" />
            <div>
              <strong>{{ comparisonReasonLabel(reason.code) }}</strong>
              <p>{{ reason.message }}</p>
            </div>
          </article>
        </div>
        <AppState
          v-else
          type="empty"
          title="后端未返回可解释原因"
          description="本次结果被标记为不可比较，页面不会补写原因或趋势。"
        />
      </section>

      <template v-else>
        <section class="score-grid">
          <article>
            <span>首轮总分</span>
            <strong>{{ displayScore(comparison.firstTotalScore) }}</strong>
            <p>按报告生成时间排序后的第一轮</p>
          </article>
          <article>
            <span>最新总分</span>
            <strong>{{ displayScore(comparison.latestTotalScore) }}</strong>
            <p>所选报告中生成时间最晚的一轮</p>
          </article>
          <article>
            <span>总分变化</span>
            <strong :class="deltaClass(comparison.totalScoreDelta)">
              {{ displayDelta(comparison.totalScoreDelta) }}
            </strong>
            <p>只代表所选轮次差值，不等同于长期能力结论</p>
          </article>
          <article>
            <span>评分量表</span>
            <strong class="rubric-value">{{ comparison.rubricVersion || '未返回' }}</strong>
            <p>不同量表版本不会混合比较</p>
          </article>
        </section>

        <section class="comparison-panel">
          <div class="section-head">
            <div>
              <span class="panel-kicker">轮次证据</span>
              <h2>所选面试轮次</h2>
            </div>
            <span>{{ comparison.rounds.length }} 轮</span>
          </div>
          <div class="round-grid">
            <article v-for="(round, index) in comparison.rounds" :key="round.reportId || index">
              <div class="round-head">
                <span>第 {{ index + 1 }} 轮</span>
                <el-tag :type="trustTagType(round.trustStatus)" effect="plain" size="small">
                  {{ trustLabel(round.trustStatus) }}
                </el-tag>
              </div>
              <strong>{{ displayScore(round.totalScore) }}</strong>
              <p>{{ formatDateTime(round.generatedAt) }}</p>
              <small>报告 #{{ round.reportId || '-' }} · 场次 #{{ round.sessionId || '-' }}</small>
              <el-tag v-if="round.sampleInsufficient" type="warning" effect="plain" size="small">
                样本不足
              </el-tag>
            </article>
          </div>
        </section>

        <section class="comparison-panel">
          <div class="section-head">
            <div>
              <span class="panel-kicker">同量表变化</span>
              <h2>评分维度变化</h2>
            </div>
          </div>
          <div v-if="comparison.dimensions.length" class="dimension-list">
            <article v-for="dimension in comparison.dimensions" :key="dimension.dimension">
              <div class="dimension-summary">
                <div>
                  <strong>{{ comparisonDimensionLabel(dimension.dimension) }}</strong>
                  <small>{{ dimension.dimension }}</small>
                </div>
                <span>{{ displayScore(dimension.firstScore) }} → {{ displayScore(dimension.latestScore) }}</span>
                <b :class="deltaClass(dimension.delta)">{{ displayDelta(dimension.delta) }}</b>
              </div>
              <div class="point-list">
                <span v-for="(point, index) in dimension.points" :key="`${point.reportId}-${index}`">
                  第 {{ index + 1 }} 轮 {{ displayScore(point.score) }}
                  <small v-if="point.deltaFromPrevious !== undefined">
                    {{ displayDelta(point.deltaFromPrevious) }}
                  </small>
                </span>
              </div>
            </article>
          </div>
          <AppState
            v-else
            type="empty"
            title="没有可比较的评分维度"
            description="后端未返回同量表维度数据，页面不会根据总分拆分或猜测各项表现。"
          />
        </section>

        <section class="comparison-panel">
          <div class="section-head">
            <div>
              <span class="panel-kicker">岗位要求证据</span>
              <h2>Requirement 改善</h2>
            </div>
          </div>
          <div v-if="comparison.requirementImprovements.length" class="requirement-list">
            <article
              v-for="item in comparison.requirementImprovements"
              :key="item.requirementId || item.requirementName"
            >
              <strong>{{ item.requirementName || `岗位要求 #${item.requirementId}` }}</strong>
              <p>{{ item.firstStatus || '未知' }} → {{ item.latestStatus || '未知' }}</p>
              <span v-if="item.improvement">{{ item.improvement }}</span>
              <small v-if="item.evidence">{{ item.evidence }}</small>
            </article>
          </div>
          <AppState
            v-else
            type="empty"
            title="暂无逐项岗位要求改善证据"
            description="本次接口只返回了总分和评分维度变化，没有返回 requirement 级别的前后证据，因此这里不做推断。"
          />
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, GitCompareArrows, History } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getInterviewComparisonDetailApi } from '@/api/interviewAdvanced'
import AppState from '@/components/common/AppState.vue'
import {
  comparisonDimensionLabel,
  comparisonReasonLabel
} from '@/features/interview-comparison'
import type { InterviewComparisonVO } from '@/types/interviewAdvanced'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const comparison = ref<InterviewComparisonVO | null>(null)

const loadComparison = async () => {
  const id = Number(route.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    loadError.value = '比较记录编号无效，请返回面试历史重新发起比较。'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    comparison.value = await getInterviewComparisonDetailApi(id)
  } catch (error) {
    comparison.value = null
    loadError.value = getErrorMessage(error, '比较记录不存在、已删除或不属于当前账号。')
  } finally {
    loading.value = false
  }
}

onMounted(loadComparison)

const displayScore = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : '--'

const displayDelta = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  if (value > 0) return `+${value}`
  return String(value)
}

const deltaClass = (value?: number) => ({
  'delta-positive': typeof value === 'number' && value > 0,
  'delta-negative': typeof value === 'number' && value < 0,
  'delta-neutral': value === 0 || value === undefined
})

const formatDateTime = (value?: string) => {
  if (!value) return '生成时间未返回'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const trustLabel = (value?: string) => {
  const status = String(value || '').toUpperCase()
  if (status === 'VERIFIED') return '可信'
  if (status === 'FALLBACK') return '降级'
  if (status === 'PARTIAL') return '部分可信'
  return '待确认'
}

const trustTagType = (value?: string): 'success' | 'warning' | 'info' => {
  const status = String(value || '').toUpperCase()
  if (status === 'VERIFIED') return 'success'
  if (status === 'FALLBACK') return 'warning'
  return 'info'
}
</script>

<style scoped lang="scss">
.comparison-page {
  display: grid;
  gap: 18px;
}

.comparison-header,
.comparison-panel,
.score-grid article {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.comparison-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 26px;

  h1 {
    margin: 10px 0 8px;
    color: var(--user-text);
    font-size: 36px;
    line-height: 1.15;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  article {
    padding: 18px;
    box-shadow: none;
  }

  span,
  p {
    color: var(--user-text-muted);
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--user-text);
    font-size: 32px;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.55;
  }

  .rubric-value {
    overflow-wrap: anywhere;
    font-size: 18px;
    line-height: 1.4;
  }
}

.comparison-panel {
  padding: 20px;
}

.section-head,
.round-head,
.dimension-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head {
  margin-bottom: 16px;

  h2 {
    margin: 4px 0 0;
    color: var(--user-text);
    font-size: 22px;
  }
}

.panel-kicker {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.reason-list,
.dimension-list,
.requirement-list {
  display: grid;
  gap: 10px;
}

.reason-list article {
  display: flex;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--user-warning-soft);
  border-radius: 12px;
  background: var(--arena-amber-soft);
  color: var(--user-warning-text);

  p {
    margin: 4px 0 0;
    color: var(--user-warning-text);
    line-height: 1.55;
  }
}

.round-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;

  article {
    display: grid;
    gap: 8px;
    padding: 15px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
  }

  strong {
    color: var(--user-text);
    font-size: 30px;
  }

  p,
  small {
    margin: 0;
    color: var(--user-text-muted);
  }
}

.dimension-list article,
.requirement-list article {
  padding: 15px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.dimension-summary {
  strong,
  small {
    display: block;
  }

  small {
    margin-top: 3px;
    color: var(--user-text-muted);
  }

  b {
    min-width: 44px;
    text-align: right;
  }
}

.point-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  span {
    padding: 6px 9px;
    border: 1px solid var(--user-primary-border);
    border-radius: 6px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
  }

  small {
    margin-left: 4px;
  }
}

.requirement-list {
  article {
    display: grid;
    gap: 6px;
  }

  p,
  span,
  small {
    margin: 0;
    color: var(--user-text-secondary);
  }
}

.comparison-warning {
  margin: 0;
}

.delta-positive {
  color: var(--user-success) !important;
}

.delta-negative {
  color: var(--user-danger) !important;
}

.delta-neutral {
  color: var(--user-text-secondary) !important;
}

@media (max-width: 900px) {
  .score-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .comparison-header,
  .section-head,
  .dimension-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .comparison-header {
    padding: 18px;

    h1 {
      font-size: 30px;
    }
  }

  .header-actions,
  .header-actions :deep(.el-button) {
    width: 100%;
  }

  .score-grid {
    grid-template-columns: 1fr;
  }

  .dimension-summary b {
    text-align: left;
  }
}

/* Compact comparison workspace */
.comparison-page {
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.comparison-header {
  gap: 16px;
  padding: 16px 18px;
  border-color: var(--user-border);
  background: var(--user-surface);
  box-shadow: none;

  h1 {
    margin: 6px 0;
    font-size: 24px;
  }

  p {
    max-width: 68ch;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.eyebrow,
.panel-kicker {
  color: var(--user-primary);
}

.score-grid {
  gap: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
  overflow: hidden;

  article {
    min-height: 0;
    padding: 10px 14px;
    border: 0;
    border-right: 1px solid var(--user-border);
    border-radius: 0;
    background: transparent;

    &:last-child {
      border-right: 0;
    }
  }

  strong {
    margin-top: 2px;
    color: var(--user-text);
    font-size: 24px;
  }

  p {
    margin-top: 3px;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .rubric-value {
    font-size: 16px;
  }
}

.comparison-panel {
  min-width: 0;
  padding: 14px 16px;
  border-color: var(--user-border);
  background: var(--user-surface);
  box-shadow: none;
}

.section-head {
  margin-bottom: 10px;

  h2 {
    margin-top: 3px;
    font-size: 18px;
  }
}

.reason-list,
.round-grid,
.dimension-list,
.requirement-list {
  gap: 0;
  border-top: 1px solid var(--user-border);
}

.reason-list article,
.round-grid article,
.dimension-list article,
.requirement-list article {
  min-width: 0;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-bottom: 0;
  }
}

.reason-list article {
  color: var(--user-warning);

  p {
    color: var(--user-text-muted);
  }
}

.round-grid {
  grid-template-columns: 1fr;

  article {
    display: grid;
    grid-template-columns: minmax(120px, 0.55fr) minmax(70px, 0.25fr) minmax(170px, 0.8fr) minmax(220px, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  strong {
    color: var(--user-text);
    font-size: 22px;
  }

  p,
  small {
    color: var(--user-text-muted);
    overflow-wrap: anywhere;
  }
}

.dimension-summary {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.55fr) 70px;
  align-items: center;
}

.point-list {
  gap: 6px;
  margin-top: 8px;

  span {
    padding: 4px 7px;
    border-color: var(--user-border);
    background: var(--user-surface-muted);
    color: var(--user-text-secondary);
  }
}

.requirement-list article {
  grid-template-columns: minmax(180px, 0.7fr) minmax(140px, 0.4fr) minmax(0, 1fr);
  align-items: start;
  gap: 12px;
}

.requirement-list small {
  grid-column: 1 / -1;
}

.unavailable-panel {
  background: var(--user-surface-muted);
}

@media (max-width: 900px) {
  .round-grid article {
    grid-template-columns: 1fr 90px 1fr;
  }

  .round-grid article > small {
    grid-column: 1 / -1;
  }

  .requirement-list article {
    grid-template-columns: 1fr 1fr;
  }

  .requirement-list article > span,
  .requirement-list article > small {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .comparison-header {
    padding: 14px;
  }

  .score-grid {
    grid-template-columns: 1fr 1fr;
  }

  .score-grid article {
    border-right: 1px solid var(--user-border);
    border-bottom: 1px solid var(--user-border);
  }

  .score-grid article:nth-child(2n) {
    border-right: 0;
  }

  .score-grid article:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .round-grid article,
  .dimension-summary,
  .requirement-list article {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .round-grid article > small,
  .requirement-list article > span,
  .requirement-list article > small {
    grid-column: auto;
  }
}

@media (max-width: 420px) {
  .score-grid {
    grid-template-columns: 1fr;
  }

  .score-grid article,
  .score-grid article:nth-child(2n),
  .score-grid article:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .score-grid article:last-child {
    border-bottom: 0;
  }
}
</style>
