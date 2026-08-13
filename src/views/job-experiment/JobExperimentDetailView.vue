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

    <template v-else-if="detail">
      <section class="experiment-hero arena-card">
        <div class="hero-copy">
          <p class="page-kicker">求职实验</p>
          <h1>{{ detail.title }}</h1>
          <p class="hero-description">
            {{ detail.goal || detail.targetDirection || '暂无实验目标，请先补充目标方向。' }}
          </p>
          <div class="hero-meta">
            <el-tag effect="plain">{{ statusLabel(detail.status) }}</el-tag>
            <el-tag effect="plain">{{ formatDateRange(detail.startDate, detail.endDate) }}</el-tag>
            <el-tag v-if="detail.demoFlag" type="warning" effect="plain">演示数据</el-tag>
          </div>
        </div>
        <div class="hero-actions">
          <el-button :icon="ArrowLeft" @click="router.push(demoPath('/job-experiments'))">返回列表</el-button>
          <el-dropdown trigger="click" @command="handleHeroCommand">
            <el-button circle :icon="MoreHorizontal" aria-label="更多实验操作" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit3 :size="15" /> 编辑实验
                </el-dropdown-item>
                <el-dropdown-item command="delete">
                  <Trash2 :size="15" /> 删除实验
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            type="primary"
            :icon="ClipboardCheck"
            @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))"
          >
            {{ reviewHistory.length ? '查看最新复盘' : '进入复盘' }}
          </el-button>
        </div>
      </section>

      <section class="overview-grid">
        <article class="arena-card overview-panel">
          <div class="section-head">
            <div>
              <p class="section-kicker">本轮验证</p>
              <h2>现在知道了什么</h2>
            </div>
            <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
              {{ weakConclusion ? '暂时只能弱判断' : '可以继续复盘' }}
            </el-tag>
          </div>
          <p class="summary-text">
            {{ factItems[0] || '当前还没有足够的事实摘要。先记录真实投递和反馈，再回来查看实验进展。' }}
          </p>
          <ul v-if="factItems.length > 1" class="fact-list">
            <li v-for="fact in factItems.slice(1, 4)" :key="fact">{{ fact }}</li>
          </ul>
          <el-alert
            v-if="sampleWarning"
            class="inline-alert"
            type="warning"
            :closable="false"
            title="样本边界"
            :description="sampleWarning"
          />
        </article>

        <article class="arena-card overview-panel progress-panel">
          <div class="section-head">
            <div>
              <p class="section-kicker">事实进展</p>
              <h2>{{ confidenceLabel(displayConfidenceLevel) }}</h2>
            </div>
            <span class="muted">不替事实做过度解释</span>
          </div>
          <div class="progress-stats">
            <div>
              <strong>{{ sampleBoundary.applicationCount ?? 0 }}</strong>
              <span>投递</span>
            </div>
            <div>
              <strong>{{ feedbackSummary.feedbackCount }}</strong>
              <span>反馈</span>
            </div>
            <div>
              <strong>{{ sampleBoundary.interviewCompletedCount ?? 0 }}</strong>
              <span>完成面试</span>
            </div>
          </div>
          <p class="muted progress-note">
            {{ lowSampleRules[0] || '继续积累真实样本，下一次复盘会更有参考价值。' }}
          </p>
        </article>
      </section>

      <section class="arena-card next-step-panel">
        <div class="next-step-copy">
          <p class="section-kicker">下一步</p>
          <h2>{{ primaryAction.title }}</h2>
          <p>{{ primaryAction.description }}</p>
        </div>
        <div class="next-step-actions">
          <el-button
            v-if="primaryAction.kind === 'settings'"
            type="primary"
            :icon="Plus"
            @click="runPrimaryAction"
          >
            补充样本与证据
          </el-button>
          <el-button
            v-else
            type="primary"
            :icon="ClipboardCheck"
            @click="runPrimaryAction"
          >
            进入复盘
          </el-button>
          <el-button link @click="openSecondary('metrics')">查看详细材料</el-button>
        </div>
      </section>

      <section v-if="secondaryOpen" class="secondary-workspace arena-card">
        <div class="secondary-header">
          <div>
            <p class="section-kicker">按需查看</p>
            <h2>实验材料与设置</h2>
          </div>
          <el-button link :icon="X" aria-label="收起详细材料" @click="closeSecondary">收起</el-button>
        </div>
        <el-tabs v-model="activeSecondary" @tab-change="handleSecondaryTabChange">
          <el-tab-pane label="数据与策略" name="metrics">
            <div class="secondary-content">
              <div class="metric-strip">
                <div><strong>{{ detail.metrics?.applicationCount ?? 0 }}</strong><span>投递数</span></div>
                <div><strong>{{ detail.metrics?.feedbackCount ?? 0 }}</strong><span>反馈数</span></div>
                <div><strong>{{ detail.metrics?.interviewInviteCount ?? 0 }}</strong><span>邀约数</span></div>
                <div><strong>{{ detail.metrics?.offerCount ?? 0 }}</strong><span>Offer 数</span></div>
                <div><strong>{{ detail.metrics?.resumeVersionCount ?? 0 }}</strong><span>简历版本</span></div>
                <div><strong>{{ detail.metrics?.projectEvidenceCount ?? 0 }}</strong><span>项目证据</span></div>
              </div>
              <div class="secondary-subsection">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">当前建议</p>
                    <h3>{{ strategyTitle }}</h3>
                  </div>
                  <el-tag :type="strategyTagType" effect="plain">
                    {{ confidenceLabel(displayConfidenceLevel) }}
                  </el-tag>
                </div>
                <p class="strategy-content">{{ strategyContent }}</p>
                <div v-if="strategyEvidenceSources.length" class="evidence-list">
                  <el-tag
                    v-for="source in strategyEvidenceSources"
                    :key="`${source.sourceType}-${source.sourceId}`"
                    effect="plain"
                  >
                    {{ jobExperimentRelationLabel(source.sourceType) }} #{{ source.sourceId }}
                  </el-tag>
                </div>
                <el-button
                  type="primary"
                  plain
                  :icon="Bot"
                  @click="goSafe(detail.strategy?.actionUrl || '/agent/today')"
                >
                  打开下一步任务
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="关联证据" name="evidence">
            <div class="secondary-content">
              <div class="section-head">
                <div>
                  <p class="section-kicker">证据覆盖</p>
                  <h3>已覆盖 {{ evidenceCoverage.covered }}/{{ evidenceCoverage.total }}</h3>
                  <p class="muted">缺失项只提示补证据，不把单条结果解释成因果。</p>
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
                  <div class="coverage-item-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="item.covered ? 'success' : 'info'" effect="plain">
                      {{ item.covered ? `${item.count} 条` : '待补充' }}
                    </el-tag>
                  </div>
                  <p>{{ item.description }}</p>
                  <p v-if="!item.covered" class="missing-hint">{{ item.emptyHint }}</p>
                  <ul v-else class="relation-chip-list">
                    <li v-for="relation in item.relations.slice(0, 3)" :key="relation.id">
                      #{{ relation.relationId }} {{ relation.relationSummary || '未填写摘要' }}
                    </li>
                  </ul>
                </article>
              </div>
              <el-table class="relation-table" :data="visibleRelations" empty-text="暂无可校验关联证据">
                <el-table-column label="类型" width="180">
                  <template #default="{ row }">{{ jobExperimentRelationLabel(row.relationType) }}</template>
                </el-table-column>
                <el-table-column prop="relationId" label="业务 ID" width="100" />
                <el-table-column prop="relationSummary" label="摘要" min-width="220" />
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button link type="danger" @click="removeRelation(row.id)">移除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="复盘记录" name="history">
            <div class="secondary-content">
              <div class="section-head">
                <div>
                  <p class="section-kicker">复盘历史</p>
                  <h3>{{ reviewHistory.length ? `${reviewHistory.length} 条记录` : '暂无复盘' }}</h3>
                </div>
                <el-button
                  type="primary"
                  plain
                  :icon="ClipboardCheck"
                  @click="router.push(demoPath(`/job-experiments/${detail.id}/review`))"
                >
                  进入复盘
                </el-button>
              </div>
              <div v-if="reviewHistory.length" class="review-list">
                <article v-for="review in reviewHistory" :key="review.id" class="review-item">
                  <div class="review-item-head">
                    <strong>{{ review.factSummary || '未填写事实摘要' }}</strong>
                    <span>{{ formatDateTime(review.updatedAt || review.createdAt) }}</span>
                  </div>
                  <p>{{ review.insightSummary || review.nextAction || '暂无洞察或下一步行动。' }}</p>
                  <el-tag effect="plain">{{ confidenceLabel(review.confidenceLevel || displayConfidenceLevel) }}</el-tag>
                </article>
              </div>
              <div v-else class="empty-state">还没有复盘记录。先补足证据，再生成复盘更可靠。</div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="实验设置与归因" name="settings">
            <CareerExperimentPanel
              :legacy-experiment-id="detail.id"
              mode="detail"
            />
          </el-tab-pane>
        </el-tabs>
      </section>
    </template>

    <el-dialog v-model="relationDialog" title="添加关联证据" width="520px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="relationForm.relationType" style="width: 100%">
            <el-option
              v-for="type in jobExperimentRelationOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="业务 ID">
          <el-input-number v-model="relationForm.relationId" :min="1" />
          <p class="form-hint">保留业务 ID 输入，关系仍通过现有实验关联接口保存。</p>
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
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Bot, ClipboardCheck, Edit3, MoreHorizontal, Plus, Trash2, X } from 'lucide-vue-next'

import {
  addJobExperimentRelationApi,
  deleteJobExperimentApi,
  deleteJobExperimentRelationApi,
  getJobExperimentDetailApi
} from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import CareerExperimentPanel from '@/views/job-experiment/components/CareerExperimentPanel.vue'
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
const experimentId = computed(() => {
  const value = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
  return Number.isSafeInteger(value) && value > 0 ? value : null
})
let detailRequestGeneration = 0

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
const feedbackSummary = computed(() => reviewDisplay.value.applicationFeedbackSummary)
const lowSampleRules = computed(() => reviewDisplay.value.lowSampleRules)
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
const strategyTitle = computed(() =>
  reviewDisplay.value.reviewMode === 'FACTS_ONLY' ? '事实记录模式' : reviewStrategy.value.title || '下一轮实验假设'
)
const strategyContent = computed(() =>
  reviewDisplay.value.reviewMode === 'FACTS_ONLY'
    ? '投递样本少于 5 条，当前只展示投递、反馈、拒信、无反馈和面试记录事实，不输出策略优劣或趋势判断。'
    : reviewStrategy.value.content ||
      '先补齐目标岗位、匹配报告、投递与项目证据，再生成复盘。样本不足时只提出可验证行动，不输出强结论。'
)
const strategyEvidenceSources = computed(() => reviewDisplay.value.evidenceSources)
const strategyTagType = computed(() => (reviewDisplay.value.qualityGate.gateStatus === 'PASS' && !weakConclusion.value ? 'success' : 'warning'))
const visibleRelations = computed(() =>
  (detail.value?.relations || []).filter((relation) => isSupportedJobExperimentRelationType(relation.relationType))
)
const evidenceCoverage = computed(() => buildJobExperimentEvidenceCoverage(visibleRelations.value))
const isDemoContext = computed(() => route.query.demoFlag === 'true' || detail.value?.demoFlag === 1)
type DetailSection = 'metrics' | 'evidence' | 'history' | 'settings'
const detailSections: DetailSection[] = ['metrics', 'evidence', 'history', 'settings']
const activeSecondary = ref<DetailSection>('metrics')
const secondaryOpen = ref(false)
const primaryAction = computed(() => {
  if (weakConclusion.value) {
    return {
      kind: 'settings' as const,
      title: '先补充样本和证据',
      description: sampleWarning.value || '当前样本只能支持弱判断。先把真实投递、反馈或关联证据补齐，再生成下一轮复盘。'
    }
  }
  return {
    kind: 'review' as const,
    title: reviewHistory.value.length ? '查看最新复盘并决定下一步' : '生成第一份实验复盘',
    description: '把当前已经记录的事实整理成一次可执行的复盘，下一步只围绕一个行动推进。'
  }
})

const resolveDetailSection = (value: unknown): DetailSection | undefined => {
  const name = Array.isArray(value) ? value[0] : value
  return typeof name === 'string' && detailSections.includes(name as DetailSection)
    ? name as DetailSection
    : undefined
}

const openSecondary = (section: DetailSection) => {
  activeSecondary.value = section
  secondaryOpen.value = true
  void router.replace({ path: route.path, query: { ...route.query, tab: section } })
}

const closeSecondary = () => {
  secondaryOpen.value = false
  const { tab: _tab, ...query } = route.query
  void router.replace({ path: route.path, query })
}

const handleSecondaryTabChange = (value: string | number) => {
  const section = resolveDetailSection(value)
  if (section) openSecondary(section)
}

const runPrimaryAction = () => {
  if (!detail.value) return
  if (primaryAction.value.kind === 'settings') {
    openSecondary('settings')
    return
  }
  router.push(demoPath(`/job-experiments/${detail.value.id}/review`))
}

const handleHeroCommand = (command: string | number | object) => {
  if (command === 'edit') {
    router.push(demoPath(`/job-experiments/${detail.value?.id}/edit`))
  } else if (command === 'delete') {
    void removeExperiment()
  }
}

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

const loadExperiment = async (id: number, requestGeneration: number) => {
  loading.value = true
  errorMessage.value = ''
  try {
    const nextDetail = await getJobExperimentDetailApi(id)
    if (requestGeneration === detailRequestGeneration) {
      detail.value = nextDetail
    }
  } catch (error) {
    if (requestGeneration === detailRequestGeneration) {
      detail.value = undefined
      errorMessage.value = error instanceof Error ? error.message : '求职实验详情加载失败，请稍后重试。'
    }
  } finally {
    if (requestGeneration === detailRequestGeneration) {
      loading.value = false
    }
  }
}

const load = async () => {
  const id = experimentId.value
  const requestGeneration = ++detailRequestGeneration
  if (!id) {
    loading.value = false
    errorMessage.value = '求职实验编号无效。'
    return
  }
  await loadExperiment(id, requestGeneration)
}

const addRelation = async () => {
  const id = experimentId.value
  if (!id) return
  await addJobExperimentRelationApi(id, relationForm)
  relationDialog.value = false
  await load()
}

const removeRelation = async (relationId: number) => {
  const id = experimentId.value
  if (!id) return
  await deleteJobExperimentRelationApi(id, relationId)
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
    const id = experimentId.value
    if (!id) return
    await deleteJobExperimentApi(id)
    ElMessage.success('实验已删除')
    router.push(demoPath('/job-experiments'))
  } finally {
    deleting.value = false
  }
}

const goSafe = (path: string) => {
  router.push(demoPath(resolveAppRoutePath(path, { knownPaths: defaultUserKnownPaths }).path))
}

watch(
  () => route.query.tab,
  (tab) => {
    const section = resolveDetailSection(tab)
    if (section) {
      activeSecondary.value = section
      secondaryOpen.value = true
    } else {
      secondaryOpen.value = false
    }
  },
  { immediate: true }
)

watch(
  experimentId,
  () => {
    detailRequestGeneration += 1
    detail.value = undefined
    errorMessage.value = ''
    loading.value = false
    relationDialog.value = false
    Object.assign(relationForm, {
      relationType: 'JOB_APPLICATION',
      relationId: 1,
      relationSummary: ''
    })
    void load()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  detailRequestGeneration += 1
})
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
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-surface);
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
  padding: 16px;
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

.feedback-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.fact-list {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.rule-list {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--user-warning-text);
  line-height: 1.6;
}

.sample-strip > div,
.feedback-strip > div,
.coverage-item,
.review-item,
.action-card {
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--user-surface-muted);
}

.sample-strip > div {
  padding: 12px;
}

.feedback-strip > div {
  padding: 10px;
}

.sample-strip strong,
.feedback-strip strong,
.metric strong {
  display: block;
  font-size: 26px;
}

.metric span,
.sample-strip span,
.feedback-strip span,
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
  color: var(--user-warning-text, var(--arena-amber, var(--user-warning)));
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

  .feedback-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style scoped lang="scss">
.job-experiment-detail {
  display: grid;
  gap: 16px;
  color: var(--arena-ink);
}

.arena-card {
  border: 1px solid var(--arena-line);
  border-radius: 16px;
  background: var(--arena-card);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.experiment-hero,
.overview-panel,
.next-step-panel,
.secondary-workspace {
  padding: 20px;
}

.experiment-hero,
.hero-actions,
.hero-meta,
.section-head,
.next-step-panel,
.next-step-actions,
.secondary-header,
.evidence-list {
  display: flex;
  align-items: center;
  gap: 12px;
}

.experiment-hero,
.next-step-panel,
.secondary-header,
.section-head {
  justify-content: space-between;
}

.hero-copy,
.next-step-copy {
  min-width: 0;
}

.page-kicker,
.section-kicker {
  margin: 0 0 6px;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 800;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 26px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

h2 {
  margin-bottom: 6px;
  font-size: 18px;
  line-height: 1.35;
}

h3 {
  margin-bottom: 6px;
  font-size: 15px;
  line-height: 1.4;
}

.hero-description,
.summary-text,
.muted,
.strategy-content,
.coverage-item p,
.review-item p {
  color: var(--arena-sub);
  line-height: 1.65;
}

.hero-description {
  max-width: 72ch;
  margin-bottom: 0;
}

.hero-meta,
.hero-actions,
.next-step-actions {
  flex-wrap: wrap;
}

.hero-actions,
.next-step-actions {
  justify-content: flex-end;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 16px;
}

.overview-panel {
  min-width: 0;
}

.progress-panel {
  display: flex;
  flex-direction: column;
}

.progress-stats,
.metric-strip,
.coverage-grid {
  display: grid;
  gap: 10px;
}

.progress-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 12px 0;
}

.progress-stats > div,
.metric-strip > div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--arena-line2);
  border-radius: 10px;
  background: var(--user-surface-muted);
}

.progress-stats strong,
.metric-strip strong {
  display: block;
  color: var(--arena-ink);
  font-size: 24px;
  line-height: 1.2;
}

.progress-stats span,
.metric-strip span {
  display: block;
  margin-top: 4px;
  color: var(--arena-sub);
  font-size: 12px;
}

.progress-note {
  margin: auto 0 0;
}

.fact-list,
.relation-chip-list {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 20px;
  color: var(--arena-sub);
  line-height: 1.6;
}

.inline-alert {
  margin-top: 14px;
}

.next-step-panel {
  align-items: flex-end;
  padding: 18px 20px;
  background: #f0fbf4;
  border-color: #b9e7cd;
}

.next-step-copy {
  max-width: 70ch;
}

.next-step-copy p:last-child {
  margin-bottom: 0;
  color: var(--arena-sub);
  line-height: 1.65;
}

.secondary-workspace {
  min-width: 0;
}

.secondary-header {
  margin-bottom: 8px;
}

.secondary-content {
  min-width: 0;
  padding-top: 8px;
}

.secondary-subsection {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--arena-line2);
}

.metric-strip {
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
}

.evidence-list {
  flex-wrap: wrap;
  margin: 14px 0;
}

.coverage-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin: 14px 0 16px;
}

.coverage-item {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--user-surface-muted);
}

.coverage-item.is-covered {
  border-color: #b9e7cd;
  background: #f0fbf4;
}

.coverage-item-head,
.review-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.coverage-item p,
.review-item p {
  margin-bottom: 0;
}

.missing-hint,
.form-hint {
  color: var(--arena-amber);
  font-size: 12px;
}

.relation-table {
  max-width: 100%;
}

.review-list {
  display: grid;
  gap: 10px;
}

.review-item {
  padding: 14px;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--user-surface-muted);
}

.review-item-head span {
  flex: 0 0 auto;
  color: var(--arena-mut);
  font-size: 12px;
}

.empty-state {
  padding: 24px;
  border: 1px dashed var(--arena-line);
  border-radius: 12px;
  color: var(--arena-sub);
  text-align: center;
}

.form-hint {
  margin: 6px 0 0;
  line-height: 1.5;
}

@media (max-width: 840px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .experiment-hero,
  .hero-actions,
  .section-head,
  .next-step-panel,
  .secondary-header,
  .coverage-item-head,
  .review-item-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions,
  .next-step-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .progress-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .next-step-actions .el-button {
    max-width: 100%;
  }
}

@media (max-width: 440px) {
  .experiment-hero,
  .overview-panel,
  .next-step-panel,
  .secondary-workspace {
    padding: 16px;
  }

  .progress-stats {
    gap: 6px;
  }

  .progress-stats > div {
    padding: 10px 8px;
  }

  .progress-stats strong {
    font-size: 20px;
  }
}
</style>
