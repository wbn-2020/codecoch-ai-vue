<template>
  <section class="requirement-matrix">
    <div class="matrix-head">
      <div>
        <span class="matrix-kicker">
          <Network :size="15" />
          岗位证据矩阵
        </span>
        <h2>要求、证据与缺口</h2>
        <p>每条结论都应能回到具体项目、简历匹配或训练证据；弱匹配不会被包装成已掌握。</p>
      </div>
      <el-button :loading="refreshing" :disabled="!targetJobId" @click="$emit('refresh')">
        <RefreshCw :size="15" />
        刷新证据
      </el-button>
    </div>

    <AppState
      v-if="loading"
      type="loading"
      title="正在整理岗位证据"
      description="正在读取岗位要求、项目证据和匹配结果。"
    />

    <AppState
      v-else-if="error"
      type="error"
      title="岗位证据暂时不可用"
      :description="error"
    >
      <el-button type="primary" @click="$emit('refresh')">重新加载</el-button>
    </AppState>

    <template v-else-if="matrix">
      <el-alert
        v-if="matrix.summary.sampleInsufficient || matrix.warnings.length"
        type="warning"
        show-icon
        :closable="false"
        title="当前结论需要保守使用"
        :description="warningText"
      />

      <div class="matrix-metrics">
        <div>
          <span>要求总数</span>
          <strong>{{ matrix.summary.total }}</strong>
        </div>
        <div>
          <span>已覆盖</span>
          <strong class="metric-success">{{ matrix.summary.covered }}</strong>
        </div>
        <div>
          <span>弱覆盖</span>
          <strong class="metric-warning">{{ matrix.summary.weak }}</strong>
        </div>
        <div>
          <span>缺失</span>
          <strong class="metric-danger">{{ matrix.summary.missing }}</strong>
        </div>
        <div>
          <span>覆盖参考</span>
          <strong>{{ matrix.summary.coveragePercent ?? 0 }}%</strong>
        </div>
      </div>

      <div v-if="readiness" class="readiness-band">
        <div class="readiness-summary">
          <span>岗位就绪度</span>
          <strong>{{ readinessScoreText }}</strong>
          <small>{{ readiness.sampleInsufficient ? '样本不足，仅展示事实' : `可信度 ${readiness.confidence || 'LOW'}` }}</small>
        </div>
        <div class="readiness-dimensions">
          <div v-for="item in readiness.dimensions" :key="item.dimension">
            <span>{{ readinessDimensionLabel(item.dimension) }}</span>
            <strong>{{ item.score == null || item.sampleInsufficient ? '--' : item.score }}</strong>
            <small>{{ item.reason || `${item.evidenceCount || 0} 条证据` }}</small>
          </div>
        </div>
      </div>

      <div v-if="readinessTrend.points.length" class="readiness-history">
        <div class="history-head">
          <div>
            <span>就绪度趋势</span>
            <strong>最近 {{ readinessTrend.points.length }} 次快照</strong>
          </div>
          <small v-if="readinessTrend.change">
            较上次
            {{ readinessTrend.change.scoreDelta == null
              ? '样本口径不可直接比较'
              : `${readinessTrend.change.scoreDelta > 0 ? '+' : ''}${readinessTrend.change.scoreDelta} 分` }}
          </small>
        </div>
        <div class="trend-points">
          <button
            v-for="(point, index) in readinessTrend.points"
            :key="point.id || `${point.generatedAt}-${index}`"
            type="button"
            class="trend-point"
            :class="{ 'is-active': point.id != null && point.id === selectedSnapshotId }"
            :disabled="point.id == null || snapshotLoadingId === point.id"
            :aria-pressed="point.id != null && point.id === selectedSnapshotId"
            :aria-label="point.id == null ? '该快照暂无详情' : `查看 ${shortSnapshotTime(point.generatedAt)} 的就绪度快照`"
            @click="point.id != null && $emit('selectSnapshot', point.id)"
          >
            <span>{{ shortSnapshotTime(point.generatedAt) }}</span>
            <strong>{{ point.score == null ? '--' : point.score }}</strong>
            <small v-if="snapshotLoadingId === point.id">正在加载详情</small>
            <small v-else>强 {{ point.strongCount }} · 缺 {{ point.missingCount }}</small>
          </button>
        </div>
        <ul v-if="readinessTrend.change" class="change-reasons">
          <li v-for="reason in readinessTrend.change.reasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>

      <div v-if="matrix.groups.length" class="matrix-groups">
        <section v-for="group in matrix.groups" :key="group.requirementType" class="matrix-group">
          <header>
            <h3>{{ group.title || requirementTypeLabel(group.requirementType) }}</h3>
            <span>{{ group.items.length }} 项</span>
          </header>
          <div class="requirement-list">
            <details v-for="item in group.items" :key="item.requirementId" class="requirement-item">
              <summary>
                <span class="status-mark" :data-tone="requirementStatusMeta(item.status).tone" />
                <span class="requirement-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ requirementMetaText(item) }}</small>
                </span>
                <span class="status-label" :data-tone="requirementStatusMeta(item.status).tone">
                  {{ requirementStatusMeta(item.status).label }}
                </span>
                <ChevronDown :size="16" />
              </summary>
              <div class="requirement-detail">
                <p v-if="item.description">{{ item.description }}</p>
                <div v-if="item.evidences.length" class="evidence-list">
                  <article v-for="(evidence, index) in item.evidences" :key="evidence.id || `${evidence.evidenceType}-${evidence.evidenceId}-${index}`">
                    <div>
                      <span>{{ evidenceTypeLabel(evidence.evidenceType) }}</span>
                      <strong>{{ evidence.title || `证据 ${index + 1}` }}</strong>
                    </div>
                    <p>{{ evidence.excerpt || evidence.matchReason || '当前证据未返回可展示摘要。' }}</p>
                    <small>{{ evidenceMetaText(evidence) }}</small>
                  </article>
                </div>
                <p v-else class="empty-evidence">当前没有可确认的证据，不能形成强覆盖结论。</p>
                <ul v-if="item.gaps.length">
                  <li v-for="gap in item.gaps" :key="gap">{{ gap }}</li>
                </ul>
                <div v-if="item.nextActions.length" class="requirement-actions">
                  <el-button
                    v-for="(action, index) in item.nextActions"
                    :key="`${action.actionType}-${index}`"
                    text
                    type="primary"
                    @click="$emit('action', action)"
                  >
                    {{ action.title || '处理缺口' }}
                    <ArrowRight :size="14" />
                  </el-button>
                </div>
              </div>
            </details>
          </div>
        </section>
      </div>

      <AppState
        v-else
        type="empty"
        title="还没有岗位要求"
        description="请先完成岗位描述分析，系统才会建立稳定的要求和证据关系。"
      />
    </template>

    <AppState
      v-else
      type="empty"
      title="证据矩阵尚未生成"
      description="岗位分析完成后，可以刷新证据矩阵。"
    >
      <el-button type="primary" @click="$emit('refresh')">生成证据矩阵</el-button>
    </AppState>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, ChevronDown, Network, RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'

import AppState from '@/components/common/AppState.vue'
import {
  buildJobReadinessTrend,
  readinessDimensionLabel,
  requirementStatusMeta,
  requirementTypeLabel
} from '@/features/job-requirement-matrix'
import type {
  JobReadinessSnapshotVO,
  JobRequirementActionVO,
  JobRequirementEvidenceVO,
  JobRequirementItemVO,
  JobRequirementMatrixVO
} from '@/types/jobRequirement'

const props = defineProps<{
  targetJobId: number
  matrix: JobRequirementMatrixVO | null
  readiness: JobReadinessSnapshotVO | null
  readinessHistory?: JobReadinessSnapshotVO[]
  selectedSnapshotId?: number
  snapshotLoadingId?: number | null
  loading?: boolean
  refreshing?: boolean
  error?: string
}>()

defineEmits<{
  refresh: []
  action: [action: JobRequirementActionVO]
  selectSnapshot: [snapshotId: number]
}>()

const warningText = computed(() => {
  const messages = [...(props.matrix?.warnings || []), ...(props.readiness?.warnings || [])]
  if (props.matrix?.summary.sampleInsufficient || props.readiness?.sampleInsufficient) {
    messages.unshift('证据或训练样本不足，暂不展示强 readiness 判断。')
  }
  return Array.from(new Set(messages)).slice(0, 3).join('；')
})

const readinessTrend = computed(() => buildJobReadinessTrend(props.readinessHistory || []))

const shortSnapshotTime = (value?: string) => {
  if (!value) return '未知时间'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const readinessScoreText = computed(() => {
  if (!props.readiness || props.readiness.sampleInsufficient || props.readiness.overallScore == null) return '--'
  return `${props.readiness.overallScore} / 100`
})

const requirementMetaText = (item: JobRequirementItemVO) => {
  const parts = [
    item.skillCategory,
    item.requiredLevel ? `要求 ${item.requiredLevel}` : '',
    item.weight == null ? '' : `权重 ${item.weight}`,
    `${item.evidences.length} 条证据`,
    `可信度 ${item.confidence || 'LOW'}`
  ].filter(Boolean)
  return parts.join(' · ')
}

const evidenceTypeLabel = (type?: string) => ({
  PROJECT_SKILL: '已确认项目技能',
  PROJECT: '项目经历',
  RESUME_SECTION: '简历内容',
  RESUME_MATCH: '简历匹配',
  QUESTION_PRACTICE: '题库训练',
  INTERVIEW_ANSWER: '面试回答',
  INTERVIEW_REPORT: '面试报告',
  APPLICATION_RESULT: '求职结果'
}[String(type || '').toUpperCase()] || '其它证据')

const evidenceMetaText = (evidence: JobRequirementEvidenceVO) => [
  evidence.matchScore == null ? '' : `匹配 ${evidence.matchScore}`,
  `可信度 ${evidence.confidence || 'LOW'}`,
  evidence.confirmed ? '已确认' : '未确认',
  evidence.sourceType ? `来源 ${evidence.sourceType}` : ''
].filter(Boolean).join(' · ')
</script>

<style scoped lang="scss">
.requirement-matrix {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.matrix-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 8px 0 6px;
    font-size: 20px;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.readiness-history {
  display: grid;
  gap: 12px;
  padding: 16px 0;
  border-block: 1px solid rgba(148, 163, 184, 0.14);
}

.history-head,
.trend-points {
  display: flex;
  align-items: center;
}

.history-head {
  justify-content: space-between;
  gap: 16px;

  div {
    display: grid;
    gap: 3px;
  }

  span,
  small {
    color: var(--app-text-muted);
  }
}

.trend-points {
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
}

.trend-point {
  display: grid;
  min-width: 112px;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.08);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease;

  span,
  small {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  &:hover:not(:disabled),
  &:focus-visible,
  &.is-active {
    border-color: rgba(34, 211, 238, 0.58);
    background: rgba(8, 145, 178, 0.16);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 211, 238, 0.52);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
  }
}

.change-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.matrix-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
}

.matrix-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-block: 1px solid rgba(148, 163, 184, 0.14);

  > div {
    min-width: 0;
    padding: 16px;
    border-right: 1px solid rgba(148, 163, 184, 0.14);

    &:last-child {
      border-right: 0;
    }
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 8px;
    font-size: 24px;
  }
}

.metric-success {
  color: #86efac;
}

.metric-warning {
  color: #fde68a;
}

.metric-danger {
  color: #fca5a5;
}

.readiness-band {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 18px;
  padding: 16px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 8px;
  background: rgba(8, 47, 73, 0.2);
}

.readiness-summary,
.readiness-dimensions > div {
  span,
  strong,
  small {
    display: block;
  }

  span,
  small {
    color: var(--app-text-muted);
  }
}

.readiness-summary strong {
  margin: 8px 0;
  font-size: 24px;
}

.readiness-dimensions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;

  > div {
    min-width: 0;
    padding-left: 12px;
    border-left: 1px solid rgba(148, 163, 184, 0.16);
  }

  strong {
    margin: 5px 0;
    font-size: 18px;
  }

  small {
    overflow-wrap: anywhere;
    line-height: 1.45;
  }
}

.matrix-groups,
.matrix-group,
.requirement-list {
  display: flex;
  flex-direction: column;
}

.matrix-groups {
  gap: 20px;
}

.matrix-group {
  gap: 10px;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h3 {
      margin: 0;
      font-size: 15px;
    }

    span {
      color: var(--app-text-muted);
      font-size: 12px;
    }
  }
}

.requirement-list {
  gap: 8px;
}

.requirement-item {
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.22);

  summary {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto 18px;
    align-items: center;
    gap: 12px;
    padding: 14px;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &[open] summary svg {
    transform: rotate(180deg);
  }
}

.status-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-mark[data-tone='success'] {
  background: #4ade80;
}

.status-mark[data-tone='warning'] {
  background: #facc15;
}

.status-mark[data-tone='danger'] {
  background: #f87171;
}

.requirement-copy {
  min-width: 0;

  strong,
  small {
    display: block;
  }

  strong {
    overflow-wrap: anywhere;
  }

  small {
    margin-top: 5px;
    color: var(--app-text-muted);
  }
}

.status-label {
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 12px;
}

.status-label[data-tone='success'] {
  color: #86efac;
}

.status-label[data-tone='warning'] {
  color: #fde68a;
}

.status-label[data-tone='danger'] {
  color: #fca5a5;
}

.requirement-detail {
  padding: 0 14px 14px 36px;
  color: #cbd5e1;

  > p {
    line-height: 1.65;
  }

  ul {
    margin: 12px 0;
    padding-left: 18px;
    color: #fca5a5;
  }
}

.evidence-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  article {
    min-width: 0;
    padding: 12px;
    border-left: 2px solid rgba(34, 211, 238, 0.36);
    background: rgba(15, 23, 42, 0.42);
  }

  span,
  strong,
  small {
    display: block;
  }

  span,
  small {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong,
  p {
    overflow-wrap: anywhere;
  }

  strong {
    margin-top: 4px;
  }

  p {
    margin: 9px 0;
    line-height: 1.6;
  }
}

.empty-evidence {
  color: var(--app-text-muted);
}

.requirement-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 1100px) {
  .matrix-metrics,
  .readiness-dimensions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .readiness-band {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .matrix-head {
    flex-direction: column;
  }

  .matrix-metrics,
  .readiness-dimensions,
  .evidence-list {
    grid-template-columns: 1fr;
  }

  .matrix-metrics > div {
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  }

  .requirement-item summary {
    grid-template-columns: 10px minmax(0, 1fr) 18px;
  }

  .status-label {
    display: none;
  }

  .requirement-detail {
    padding-left: 14px;
  }
}
</style>
