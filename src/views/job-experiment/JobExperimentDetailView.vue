<template>
  <div class="job-experiment-detail page-shell" v-loading="loading">
    <AppState
      v-if="errorMessage"
      type="error"
      title="求职实验详情加载失败"
      :description="errorMessage"
    >
      <el-button @click="router.push(demoPath('/job-experiments'))">返回列表</el-button>
      <el-button type="primary" :loading="loading" @click="load">重新加载</el-button>
    </AppState>

    <section class="page-hero" v-else-if="detail">
      <div class="hero-copy">
        <p class="hero-kicker">求职实验看板</p>
        <h1>{{ detail.title }}</h1>
        <p>{{ detail.goal || detail.targetDirection || '暂无实验目标，请先补充目标方向。' }}</p>
        <div class="hero-meta">
          <el-tag effect="plain">{{ statusLabel(detail.status) }}</el-tag>
          <el-tag effect="plain">{{ formatDateRange(detail.startDate, detail.endDate) }}</el-tag>
          <el-tag v-if="detail.demoFlag" type="warning" effect="plain">演示数据</el-tag>
        </div>
      </div>
      <div class="hero-actions">
        <el-button :icon="ArrowLeft" @click="router.push(demoPath('/job-experiments'))">返回</el-button>
        <el-button :icon="Edit3" @click="router.push(demoPath(`/job-experiments/${detail.id}/edit`))">编辑</el-button>
        <el-button type="danger" plain :icon="Trash2" :loading="deleting" @click="removeExperiment">删除</el-button>
        <el-button type="primary" :icon="ClipboardCheck" @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))">复盘</el-button>
      </div>
    </section>

    <section class="dashboard-grid" v-if="detail">
      <article class="content-card reliability-card">
        <div class="section-head">
          <div>
            <p class="section-kicker">样本可信度</p>
            <h2>{{ confidenceLabel(displayConfidenceLevel) }}</h2>
          </div>
          <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
            {{ weakConclusion ? '弱建议' : '可复盘' }}
          </el-tag>
        </div>
        <p class="muted">{{ sampleWarning || '样本量当前未触发强提醒，仍建议结合证据复核后再行动。' }}</p>
        <ul v-if="factItems.length" class="fact-list">
          <li v-for="fact in factItems" :key="fact">{{ fact }}</li>
        </ul>
        <div class="sample-strip">
          <div>
            <strong>{{ detail.metrics?.sampleCount ?? sampleBoundary.applicationCount ?? 0 }}</strong>
            <span>样本数</span>
          </div>
          <div>
            <strong>{{ sampleBoundary.applicationCount ?? 0 }}</strong>
            <span>投递数</span>
          </div>
          <div>
            <strong>{{ sampleBoundary.interviewCompletedCount ?? 0 }}</strong>
            <span>完成面试</span>
          </div>
        </div>
      </article>

      <article class="content-card unsupported-card">
        <div class="section-head">
          <div>
            <p class="section-kicker">不支持结论</p>
            <h2>避免过度归因</h2>
          </div>
          <el-tag type="warning" effect="plain">unsupportedConclusion</el-tag>
        </div>
        <p>{{ unsupportedConclusion }}</p>
      </article>
    </section>

    <section class="metrics-grid" v-if="detail?.metrics">
      <article class="content-card metric">
        <strong>{{ detail.metrics.applicationCount }}</strong>
        <span>投递数</span>
      </article>
      <article class="content-card metric">
        <strong>{{ detail.metrics.feedbackCount }}</strong>
        <span>反馈数</span>
      </article>
      <article class="content-card metric">
        <strong>{{ detail.metrics.interviewInviteCount }}</strong>
        <span>邀约数</span>
      </article>
      <article class="content-card metric">
        <strong>{{ detail.metrics.offerCount }}</strong>
        <span>Offer 数</span>
      </article>
      <article class="content-card metric">
        <strong>{{ detail.metrics.resumeVersionCount }}</strong>
        <span>简历版本</span>
      </article>
      <article class="content-card metric">
        <strong>{{ detail.metrics.projectEvidenceCount }}</strong>
        <span>项目证据</span>
      </article>
    </section>

    <el-alert
      v-if="sampleWarning"
      type="warning"
      :closable="false"
      title="样本不足提醒"
      :description="sampleWarning"
    />

    <section class="content-card section strategy-section" v-if="detail">
      <div class="section-head">
        <div>
          <p class="section-kicker">当前策略建议</p>
          <h2>{{ strategyTitle }}</h2>
        </div>
        <el-tag :type="strategyTagType" effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
      </div>
      <p class="strategy-content">{{ strategyContent }}</p>
      <div class="evidence-list" v-if="strategyEvidenceSources.length">
        <el-tag v-for="source in strategyEvidenceSources" :key="`${source.sourceType}-${source.sourceId}`" effect="plain">
          {{ jobExperimentRelationLabel(source.sourceType) }} #{{ source.sourceId }}
        </el-tag>
      </div>
      <div class="action-row">
        <el-button type="primary" plain :icon="Bot" @click="goSafe(detail.strategy?.actionUrl || '/agent/today')">
          Agent 下一步任务
        </el-button>
        <el-button :icon="ClipboardCheck" @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))">生成/查看复盘</el-button>
      </div>
    </section>

    <section class="content-card section" v-if="detail">
      <div class="section-head">
        <div>
          <p class="section-kicker">关联证据覆盖</p>
          <h2>已覆盖 {{ evidenceCoverage.covered }}/{{ evidenceCoverage.total }}</h2>
          <p class="muted">按简历版本、目标岗位、JD、匹配报告、投递记录、项目证据分组；缺失项只提示补证据，不做强归因。</p>
        </div>
        <el-button size="small" :icon="Plus" @click="relationDialog = true">添加关联</el-button>
      </div>
      <div class="coverage-grid">
        <article
          v-for="item in evidenceCoverage.items"
          :key="item.type"
          class="coverage-item"
          :class="{ 'is-covered': item.covered }"
        >
          <div>
            <strong>{{ item.label }}</strong>
            <span>{{ item.covered ? `${item.count} 条证据` : '待补充' }}</span>
          </div>
          <el-tag :type="item.covered ? 'success' : 'info'" effect="plain">
            {{ item.covered ? '已覆盖' : '缺口' }}
          </el-tag>
          <p>{{ item.description }}</p>
          <p class="missing-hint" v-if="!item.covered">{{ item.emptyHint }}</p>
          <ul v-else class="relation-chip-list">
            <li v-for="relation in item.relations.slice(0, 3)" :key="relation.id">
              #{{ relation.relationId }} {{ relation.relationSummary || '未填写摘要' }}
            </li>
          </ul>
        </article>
      </div>
      <el-table class="relation-table" :data="visibleRelations" border empty-text="暂无可校验关联证据">
        <el-table-column label="类型" width="180">
          <template #default="{ row }">{{ jobExperimentRelationLabel(row.relationType) }}</template>
        </el-table-column>
        <el-table-column prop="relationId" label="ID" width="100" />
        <el-table-column prop="relationSummary" label="摘要" min-width="220" />
        <el-table-column label="Demo" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.demoFlag" type="warning" effect="plain">演示</el-tag>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeRelation(row.id)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="content-card section" v-if="detail">
      <div class="section-head">
        <div>
          <p class="section-kicker">复盘历史</p>
          <h2>{{ reviewHistory.length ? `${reviewHistory.length} 条记录` : '暂无复盘' }}</h2>
        </div>
        <el-button :icon="ClipboardCheck" @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))">进入复盘</el-button>
      </div>
      <div v-if="reviewHistory.length" class="review-list">
        <article v-for="review in reviewHistory" :key="review.id" class="review-item">
          <div>
            <strong>{{ review.factSummary || '未填写事实摘要' }}</strong>
            <span>{{ formatDateTime(review.updatedAt || review.createdAt) }}</span>
          </div>
          <p>{{ review.insightSummary || review.nextAction || '暂无洞察或下一步行动。' }}</p>
          <el-tag effect="plain">{{ confidenceLabel(review.confidenceLevel || displayConfidenceLevel) }}</el-tag>
        </article>
      </div>
      <div v-else class="empty-state">还没有复盘记录。先补足证据，再生成复盘更可靠。</div>
    </section>

    <section class="next-actions" v-if="detail">
      <button type="button" class="action-card" @click="relationDialog = true">
        <Plus :size="18" />
        <span>补充关联证据</span>
      </button>
      <button type="button" class="action-card" @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))">
        <ClipboardCheck :size="18" />
        <span>生成实验复盘</span>
      </button>
      <button type="button" class="action-card" @click="goSafe(detail.strategy?.actionUrl || '/agent/today')">
        <Bot :size="18" />
        <span>打开下一步任务</span>
      </button>
    </section>

    <el-dialog v-model="relationDialog" title="添加关联证据" width="520px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="relationForm.relationType" style="width: 100%">
            <el-option v-for="type in jobExperimentRelationOptions" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务 ID">
          <el-input-number v-model="relationForm.relationId" :min="1" />
          <p class="form-hint">MVP 保留高级 ID 输入，不新增重复后端绑定逻辑；选择器完善后可复用同一关系接口。</p>
        </el-form-item>
        <el-form-item label="安全摘要">
          <el-input v-model="relationForm.relationSummary" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="relationDialog = false">取消</el-button>
        <el-button type="primary" @click="addRelation">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Bot, ClipboardCheck, Edit3, Plus, Trash2 } from 'lucide-vue-next'

import {
  addJobExperimentRelationApi,
  deleteJobExperimentApi,
  deleteJobExperimentRelationApi,
  getJobExperimentDetailApi
} from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import {
  buildJobExperimentEvidenceCoverage,
  buildJobExperimentReviewDisplayModel,
  confidenceLabel,
  isSupportedJobExperimentRelationType,
  jobExperimentRelationLabel,
  jobExperimentRelationOptions,
  shouldKeepConclusionWeak,
  statusLabel
} from '@/features/job-experiment'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import type {
  JobSearchExperimentDetailVO,
  JobSearchExperimentRelationSaveDTO,
  JobSearchExperimentReviewVO
} from '@/types/jobExperiment'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const detail = ref<JobSearchExperimentDetailVO>()
const relationDialog = ref(false)
const relationForm = reactive<JobSearchExperimentRelationSaveDTO>({
  relationType: 'JOB_APPLICATION',
  relationId: 1,
  relationSummary: ''
})

const id = () => Number(route.params.id)

const latestReview = computed<JobSearchExperimentReviewVO | undefined>(() =>
  detail.value?.latestReview || detail.value?.reviews?.[0]
)
const reviewHistory = computed(() => detail.value?.reviews || [])
const reviewStrategy = computed(() => ({
  ...(latestReview.value?.strategy || {}),
  ...(detail.value?.strategy || {})
}))
const reviewDisplay = computed(() => buildJobExperimentReviewDisplayModel(detail.value, latestReview.value, reviewStrategy.value))
const sampleBoundary = computed(() => reviewDisplay.value.sampleBoundary)
const weakConclusion = computed(() =>
  shouldKeepConclusionWeak(detail.value?.metrics) ||
  !['NORMAL', 'STRONG'].includes(String(reviewDisplay.value.qualityGate.suggestionStrength))
)
const displayConfidenceLevel = computed(() =>
  detail.value?.metrics?.confidenceLevel || reviewStrategy.value.confidenceLevel || latestReview.value?.confidenceLevel || 'LOW'
)
const factItems = computed(() => reviewDisplay.value.facts)
const sampleWarning = computed(() => sampleBoundary.value.sampleWarning || reviewStrategy.value.sampleWarning || '')
const unsupportedConclusion = computed(() =>
  reviewDisplay.value.unsupportedConclusions.map((item) => item.blockedReason).join('；') ||
  '暂无明确不支持结论；建议继续保留证据链，避免把单次成功或失败归因到单一因素。'
)
const strategyTitle = computed(() => reviewStrategy.value.title || '下一轮实验假设')
const strategyContent = computed(() =>
  reviewStrategy.value.content ||
  '先补齐目标岗位、匹配报告、投递与项目证据，再生成复盘。样本不足时只提出可验证行动，不输出强结论。'
)
const strategyEvidenceSources = computed(() => reviewDisplay.value.evidenceSources)
const strategyTagType = computed(() => (reviewDisplay.value.qualityGate.gateStatus === 'PASS' && !weakConclusion.value ? 'success' : 'warning'))
const visibleRelations = computed(() =>
  (detail.value?.relations || []).filter((relation) => isSupportedJobExperimentRelationType(relation.relationType))
)
const evidenceCoverage = computed(() => buildJobExperimentEvidenceCoverage(visibleRelations.value))
const isDemoContext = computed(() => route.query.demoFlag === 'true' || detail.value?.demoFlag === 1)

const demoPath = (path: string) => {
  if (!isDemoContext.value || path.includes('demoFlag=')) return path
  return path.includes('?') ? `${path}&demoFlag=true` : `${path}?demoFlag=true`
}

const formatDateRange = (start?: string, end?: string) => {
  if (!start && !end) return '未设置周期'
  if (start && end) return `${start} 至 ${end}`
  return start ? `${start} 开始` : `${end} 截止`
}

const formatDateTime = (value?: string) => value || '-'

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    detail.value = await getJobExperimentDetailApi(id())
  } catch (error) {
    detail.value = undefined
    errorMessage.value = error instanceof Error ? error.message : '求职实验详情加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const addRelation = async () => {
  await addJobExperimentRelationApi(id(), relationForm)
  relationDialog.value = false
  await load()
}

const removeRelation = async (relationId: number) => {
  await deleteJobExperimentRelationApi(id(), relationId)
  await load()
}

const removeExperiment = async () => {
  try {
    await ElMessageBox.confirm('确定删除这个求职实验吗？关联证据和复盘记录将不再可见。', '删除求职实验', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteJobExperimentApi(id())
    ElMessage.success('实验已删除')
    router.push(demoPath('/job-experiments'))
  } finally {
    deleting.value = false
  }
}

const goSafe = (path: string) => {
  router.push(demoPath(resolveAppRoutePath(path, { knownPaths: defaultUserKnownPaths }).path))
}

onMounted(load)
</script>

<style scoped lang="scss">
.page-hero,
.hero-actions,
.hero-meta,
.section-head,
.evidence-list,
.action-row,
.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.hero-copy {
  min-width: 0;
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
}

h2 {
  margin-bottom: 6px;
}

.hero-meta {
  flex-wrap: wrap;
  margin-top: 14px;
}

.hero-actions,
.action-row {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-grid,
.metrics-grid,
.coverage-grid,
.next-actions {
  display: grid;
  gap: 12px;
}

.dashboard-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.metrics-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.coverage-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.next-actions {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}

.section,
.reliability-card,
.unsupported-card,
.metric {
  padding: 18px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.sample-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.fact-list {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.sample-strip > div,
.coverage-item,
.review-item,
.action-card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.22);
}

.sample-strip > div {
  padding: 12px;
}

.sample-strip strong,
.metric strong {
  display: block;
  font-size: 26px;
}

.metric span,
.sample-strip span,
.page-hero p,
.muted,
.coverage-item span,
.review-item span {
  color: var(--app-text-muted);
}

.strategy-content,
.unsupported-card p {
  line-height: 1.7;
}

.evidence-list {
  flex-wrap: wrap;
  margin: 14px 0;
}

.coverage-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.coverage-item.is-covered {
  border-color: rgba(34, 197, 94, 0.45);
}

.coverage-item > div,
.review-item > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.coverage-item p,
.review-item p {
  margin-bottom: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.missing-hint,
.form-hint {
  margin: 6px 0 0;
  color: #fbbf24;
  font-size: 12px;
  line-height: 1.5;
}

.relation-chip-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.relation-table {
  margin-top: 16px;
}

.review-list {
  display: grid;
  gap: 10px;
}

.review-item {
  padding: 14px;
}

.empty-state {
  padding: 20px;
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  color: var(--app-text-muted);
  text-align: center;
}

.action-card {
  justify-content: center;
  min-height: 58px;
  color: var(--app-text);
  font: inherit;
  cursor: pointer;
}

.action-card:hover {
  border-color: var(--app-primary);
}

@media (max-width: 720px) {
  .page-hero,
  .hero-actions,
  .section-head,
  .coverage-item > div,
  .review-item > div {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions,
  .action-row {
    justify-content: flex-start;
  }

  .sample-strip {
    grid-template-columns: 1fr;
  }
}
</style>
