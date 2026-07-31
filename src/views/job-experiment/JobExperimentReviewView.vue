<template>
  <div class="job-experiment-review page-shell" v-loading="loading">
    <AppState
      v-if="errorMessage"
      type="error"
      title="求职实验复盘加载失败"
      :description="errorMessage"
    >
      <el-button @click="router.push(demoPath('/job-experiments'))">返回列表</el-button>
      <el-button type="primary" :loading="loading" @click="load">重新加载</el-button>
    </AppState>
    <template v-else-if="detail">
      <section class="review-hero">
        <div class="hero-copy">
          <p class="hero-kicker">实验复盘</p>
          <h1>{{ detail.title }}</h1>
          <p>{{ detail.goal || detail.targetDirection || '用事实、样本限制和下一步行动复盘求职实验。' }}</p>
          <div class="hero-meta">
            <el-tag v-if="detail.demoFlag" type="warning" effect="plain">演示数据</el-tag>
            <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
              {{ weakConclusion ? '低样本弱建议' : '可作为候选判断' }}
            </el-tag>
            <el-tag effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
          </div>
        </div>
        <div class="actions">
          <el-button :icon="ArrowLeft" @click="router.push(demoPath(`/job-experiments/${detail.id}`))">实验详情</el-button>
          <el-button
            v-if="appConfig.enableV9EvidenceLearning"
            data-testid="experiment-evidence-usages"
            :icon="ClipboardCheck"
            @click="openEvidenceSamples"
          >
            查看证据使用样本
          </el-button>
          <el-button type="primary" :icon="RefreshCcw" :loading="generating" :disabled="isDemoContext()" @click="generate">生成复盘</el-button>
        </div>
      </section>

      <section class="review-section fact-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">事实</p>
            <h2>事实摘要</h2>
          </div>
          <el-tag effect="plain">metrics.facts</el-tag>
        </div>
        <p class="summary-text">{{ factSummary }}</p>
        <ul class="fact-list" v-if="factItems.length">
          <li v-for="fact in factItems" :key="fact">{{ fact }}</li>
        </ul>
        <div class="metric-strip">
          <div>
            <strong>{{ feedbackSummary.applicationCount }}</strong>
            <span>投递数</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.feedbackCount }}</strong>
            <span>反馈数</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.interviewCompletedCount }}</strong>
            <span>完成面试</span>
          </div>
          <div>
            <strong>{{ metricCountLabel(detail.metrics?.sampleCount ?? detail.metrics?.applicationCount) }}</strong>
            <span>样本数</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.rejectedCount }}</strong>
            <span>拒信</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.noFeedbackCount }}</strong>
            <span>无反馈</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.interviewRoundCount }}</strong>
            <span>面试轮次</span>
          </div>
          <div>
            <strong>{{ feedbackSummary.interviewReportSummaryCount }}</strong>
            <span>报告摘要</span>
          </div>
        </div>
      </section>

      <section class="review-section sample-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">样本边界</p>
            <h2>样本限制</h2>
          </div>
          <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
            {{ confidenceLabel(displayConfidenceLevel) }}
          </el-tag>
        </div>
        <el-alert
          v-if="sampleWarning"
          type="warning"
          :closable="false"
          title="样本不足提醒"
          :description="sampleWarning"
        />
        <p v-if="sampleWarning" class="sample-warning-text">{{ sampleWarning }}</p>
        <p v-else class="summary-text">当前没有后端样本不足提醒，但复盘仍应结合证据链验证后再行动。</p>
        <p class="limit-note">
          {{ reviewModeText }}
        </p>
        <ul v-if="lowSampleRules.length" class="rule-list">
          <li v-for="rule in lowSampleRules" :key="rule">{{ rule }}</li>
        </ul>
      </section>

      <section class="review-section unsupported-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">不支持结论</p>
            <h2>不支持结论</h2>
          </div>
          <el-tag type="warning" effect="plain">unsupportedConclusion</el-tag>
        </div>
        <div class="stack-list">
          <article v-for="item in unsupportedConclusions" :key="`${item.conclusionType}-${item.blockedReason}`">
            <strong>{{ item.conclusionType || '样本边界' }}</strong>
            <p class="unsupported-text">{{ item.blockedReason }}</p>
            <span>{{ item.requiredSampleHint || '补足样本和证据后再判断。' }}</span>
          </article>
        </div>
      </section>

      <section class="review-section weak-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">弱观察</p>
            <h2>弱观察</h2>
          </div>
          <el-tag type="warning" effect="plain">{{ qualityGateLabel }}</el-tag>
        </div>
        <div v-if="weakObservations.length" class="stack-list">
          <article v-for="item in weakObservations" :key="`${item.observationType}-${item.text}`">
            <strong>{{ item.observationType || '观察' }}</strong>
            <p>{{ item.text }}</p>
            <span>{{ metricCountLabel(item.evidenceCount, '条证据') }} · {{ confidenceLabel(item.confidenceLevel) }}</span>
            <span v-if="item.actionHint">{{ item.actionHint }}</span>
          </article>
        </div>
        <p v-else class="summary-text">暂无弱观察。先补投递、反馈、简历版本和项目证据，再观察趋势。</p>
      </section>

      <section class="review-section hypothesis-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">实验假设</p>
            <h2>实验假设</h2>
          </div>
          <el-tag effect="plain">hypotheses</el-tag>
        </div>
        <div class="stack-list">
          <article v-for="item in hypotheses" :key="`${item.targetDirection}-${item.assumption}`">
            <strong>{{ item.targetDirection || detail.targetDirection || '当前方向' }}</strong>
            <p>{{ item.assumption }}</p>
            <span>{{ item.expectedSignal || '观察下一轮投递反馈、面试邀约和证据覆盖变化。' }}</span>
          </article>
        </div>
      </section>

      <section class="review-section next-action">
        <div class="section-head">
          <div>
            <p class="section-kicker">下一步行动</p>
            <h2>下一步行动</h2>
          </div>
          <el-tag effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
        </div>
        <p class="summary-text">{{ nextActionText }}</p>
        <div v-if="reviewNextActions.length" class="stack-list action-stack">
          <article v-for="action in reviewNextActions" :key="`${action.actionType}-${action.title}`">
            <strong>{{ action.title }}</strong>
            <p>{{ action.reason || '把复盘变成下一轮可执行动作。' }}</p>
            <el-button v-if="action.targetRoute" size="small" @click="goStrategyAction(action.targetRoute)">打开入口</el-button>
          </article>
        </div>
        <div class="action-grid">
          <el-button
            v-for="action in nextActionLinks"
            :key="action.path"
            :icon="action.icon"
            @click="router.push(demoPath(action.path))"
          >
            {{ action.label }}
          </el-button>
        </div>
      </section>

      <section class="review-section evidence-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">证据来源</p>
            <h2>证据来源</h2>
          </div>
          <el-tag effect="plain">{{ explainableStrategy.qualityGate?.suggestionStrength || 'WEAK' }}</el-tag>
        </div>
        <p class="summary-text">{{ strategySummary }}</p>
        <p class="strategy-content">{{ strategyContent }}</p>
        <SuggestionEvidencePanel
          :suggestion="explainableStrategy"
          :default-open="true"
          @open-action="goStrategyAction"
        />
        <div class="strategy-evidence-list" v-if="explainableStrategy.evidenceSources.length">
          <el-tag
            v-for="source in explainableStrategy.evidenceSources"
            :key="`${source.sourceType || 'SOURCE'}:${source.sourceId ?? source.evidenceSummary}`"
            effect="plain"
          >
            {{ strategyEvidenceLabel(source.sourceType) }} #{{ source.sourceId }} {{ source.evidenceSummary || source.sourceSummary || '' }}
          </el-tag>
        </div>
        <p v-else class="summary-text">暂无可展示证据来源，请先在实验详情中绑定关联证据。</p>
      </section>

      <CareerExperimentPanel
        :legacy-experiment-id="detail.id"
        mode="review"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Bot, BriefcaseBusiness, ClipboardCheck, FileText, FolderKanban, Mic, RefreshCcw } from 'lucide-vue-next'

import { generateJobExperimentReviewApi, getJobExperimentDetailApi } from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import SuggestionEvidencePanel from '@/components/suggestion/SuggestionEvidencePanel.vue'
import CareerExperimentPanel from '@/views/job-experiment/components/CareerExperimentPanel.vue'
import { buildJobExperimentReviewDisplayModel, confidenceLabel, shouldKeepConclusionWeak } from '@/features/job-experiment'
import { appConfig } from '@/config'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import type { JobSearchExperimentDetailVO, JobSearchExperimentStrategyVO } from '@/types/jobExperiment'
import type { ExplainableSuggestionVO } from '@/types/suggestion'
import { getSuggestionSourceTypeLabel } from '@/types/suggestion'
import { fromJobExperimentStrategy } from '@/utils/suggestionAdapter'

type SuggestionPanelAction = {
  path?: string
  actionUrl?: string
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const errorMessage = ref('')
const detail = ref<JobSearchExperimentDetailVO>()
const experimentId = computed(() => {
  const value = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
  return Number.isSafeInteger(value) && value > 0 ? value : null
})
let detailRequestGeneration = 0
let generateRequestGeneration = 0
const latest = computed(() => detail.value?.latestReview || detail.value?.reviews?.[0])
const reviewStrategy = computed<JobSearchExperimentStrategyVO>(() => ({
  ...(latest.value?.strategy || {}),
  ...(detail.value?.strategy || {})
}))
const reviewDisplay = computed(() => buildJobExperimentReviewDisplayModel(detail.value, latest.value, reviewStrategy.value))
const feedbackSummary = computed(() => reviewDisplay.value.applicationFeedbackSummary)
const lowSampleRules = computed(() => reviewDisplay.value.lowSampleRules)
const reviewModeText = computed(() => {
  if (reviewDisplay.value.reviewMode === 'FACTS_ONLY') return '投递数少于 5，本次复盘只展示事实，不输出策略优劣、趋势判断或版本比较。'
  if (reviewDisplay.value.reviewMode === 'WEAK_OBSERVATION') return '当前只能输出弱观察；样本不足时请继续补充投递、拒信、无反馈和面试记录。'
  return '样本达到候选复盘门槛，但仍需保留证据链和人工复核。'
})
const weakConclusion = computed(() =>
  shouldKeepConclusionWeak(detail.value?.metrics) ||
  !['NORMAL', 'STRONG'].includes(String(reviewDisplay.value.qualityGate.suggestionStrength))
)
const strategySampleInsufficient = computed(() =>
  reviewDisplay.value.sampleBoundary.sampleInsufficient ?? detail.value?.metrics?.sampleInsufficient ?? reviewStrategy.value.sampleInsufficient ?? weakConclusion.value
)
const displayConfidenceLevel = computed(() =>
  detail.value?.metrics?.confidenceLevel || reviewStrategy.value.confidenceLevel || latest.value?.confidenceLevel || 'UNKNOWN'
)
const metricCountLabel = (value?: number, suffix = '') =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '暂无数据'
const factItems = computed(() => reviewDisplay.value.facts)
const factSummary = computed(() =>
  factItems.value[0] ||
  latest.value?.factSummary ||
  '还没有生成复盘。先补齐实验事实，再生成复盘会更可靠。'
)
const sampleWarning = computed(() =>
  reviewDisplay.value.sampleBoundary.sampleWarning ||
  reviewStrategy.value.sampleWarning ||
  (strategySampleInsufficient.value ? '当前样本不足，复盘只能作为弱建议，不能输出强结论。' : '')
)
const unsupportedConclusions = computed(() => reviewDisplay.value.unsupportedConclusions)
const weakObservations = computed(() => reviewDisplay.value.weakObservations)
const hypotheses = computed(() => reviewDisplay.value.hypotheses)
const reviewNextActions = computed(() => reviewDisplay.value.nextActions)
const qualityGateLabel = computed(() => reviewDisplay.value.qualityGate.suggestionStrength || 'WEAK')
const strategyTitle = computed(() => textFromStrategy('title') || '下一轮实验假设')
const strategyContent = computed(() =>
  reviewDisplay.value.reviewMode === 'FACTS_ONLY'
    ? '投递样本少于 5 条，暂不生成策略优劣判断；请继续记录投递状态、拒信、无反馈、面试轮次和面试报告摘要。'
    : textFromStrategy('content') ||
      '先补齐目标岗位、简历、项目证据和投递反馈，再生成下一轮复盘。样本不足时只提出可验证行动。'
)
const strategySummary = computed(() =>
  weakConclusion.value ? strategyContent.value : detail.value?.strategy ? factSummary.value : latest.value?.insightSummary || factSummary.value || '暂无洞察摘要。'
)
const strategyFeedbackContext = computed(() => {
  const reviewId = latest.value?.id
  return {
    scene: 'JOB_EXPERIMENT_STRATEGY',
    bizType: reviewId ? 'JOB_EXPERIMENT_REVIEW' : 'JOB_EXPERIMENT',
    bizId: reviewId || detail.value?.id || experimentId.value || 0
  }
})
const explainableStrategy = computed<ExplainableSuggestionVO>(() =>
  fromJobExperimentStrategy({
    ...reviewStrategy.value,
    title: strategyTitle.value,
    content: strategyContent.value,
    confidenceLevel: displayConfidenceLevel.value,
    sampleInsufficient: strategySampleInsufficient.value,
    sampleWarning: sampleWarning.value,
    evidenceSources: reviewDisplay.value.evidenceSources.length
      ? reviewDisplay.value.evidenceSources.flatMap((source) => {
          const sourceId = Number(source.sourceId)
          if (!Number.isSafeInteger(sourceId) || sourceId <= 0) return []
          return [{
            sourceType: source.sourceType || '',
            sourceId,
            sourceSummary: source.evidenceSummary || source.sourceSummary || source.summary,
            trustStatus: source.trustStatus,
            metadata: source.metadata
          }]
        })
      : reviewStrategy.value.evidenceSources,
    unsupportedConclusions: unsupportedConclusions.value.map((item) => item.blockedReason),
    weakObservations: weakObservations.value.map((item) => item.text),
    qualityGate: reviewDisplay.value.qualityGate
  }, {
    scene: 'JOB_EXPERIMENT_STRATEGY',
    bizType: strategyFeedbackContext.value.bizType,
    bizId: strategyFeedbackContext.value.bizId,
    experimentId: detail.value?.id || experimentId.value || 0,
    traceId: latest.value?.traceId || latest.value?.aiTraceId || undefined,
    aiCallLogId: latest.value?.aiCallLogId ?? undefined,
    resultSource: latest.value?.resultSource || 'RULE',
    fallback: latest.value?.fallback ?? false
  })
)
const nextActionText = computed(() =>
  reviewNextActions.value[0]?.title ||
  (weakConclusion.value
    ? strategyContent.value
    : detail.value?.strategy ? strategyContent.value : latest.value?.nextAction || strategyContent.value || '优先补齐 Agent 今日任务、简历、项目证据、目标岗位和模拟面试数据。')
)
const nextActionLinks = [
  { label: 'Agent 今日任务', path: '/agent/today', icon: Bot },
  { label: '简历', path: '/resumes', icon: FileText },
  { label: '项目证据', path: '/project-evidence', icon: FolderKanban },
  { label: '继续投递/目标岗位', path: '/job-targets', icon: BriefcaseBusiness },
  { label: '模拟面试', path: '/interviews/create', icon: Mic }
]

const isDemoContext = () => route.query.demoFlag === 'true' || detail.value?.demoFlag === 1
const demoPath = (path: string) => {
  if (!isDemoContext()) return path
  return path.includes('?') ? `${path}&demoFlag=true` : `${path}?demoFlag=true`
}

const openEvidenceSamples = () => {
  const currentExperimentId = detail.value?.id ?? experimentId.value
  if (!currentExperimentId || !Number.isSafeInteger(currentExperimentId)) {
    ElMessage.warning('实验编号待确认，暂不能打开证据使用样本。')
    return
  }
  void router.push({
    path: '/evidence-assets',
    query: {
      tab: 'usages',
      experimentId: String(currentExperimentId)
    }
  })
}

const textFromStrategy = (key: string) => {
  const value = reviewStrategy.value[key as keyof JobSearchExperimentStrategyVO]
  return typeof value === 'string' ? value : ''
}

const strategyEvidenceLabel = (sourceType?: string) => getSuggestionSourceTypeLabel(sourceType)

const goStrategyAction = (action?: SuggestionPanelAction | string) => {
  const actionUrl = typeof action === 'string' ? action : action?.path || action?.actionUrl
  const safePath = resolveAppRoutePath(actionUrl || '/agent/today', {
    fallbackPath: '/agent/today',
    knownPaths: defaultUserKnownPaths
  }).path
  router.push(demoPath(safePath))
}

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
      errorMessage.value = error instanceof Error ? error.message : '求职实验复盘加载失败，请稍后重试。'
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

const generate = async () => {
  const id = experimentId.value
  if (!id) return
  const requestGeneration = ++generateRequestGeneration
  generating.value = true
  try {
    await generateJobExperimentReviewApi(id)
    if (requestGeneration !== generateRequestGeneration) return
    await load()
    if (requestGeneration !== generateRequestGeneration) return
    ElMessage.success('复盘建议已生成')
  } catch (error) {
    if (requestGeneration === generateRequestGeneration) {
      ElMessage.error(error instanceof Error ? error.message : '复盘建议生成失败，请稍后重试。')
    }
  } finally {
    if (requestGeneration === generateRequestGeneration) {
      generating.value = false
    }
  }
}

watch(
  experimentId,
  () => {
    detailRequestGeneration += 1
    generateRequestGeneration += 1
    detail.value = undefined
    errorMessage.value = ''
    loading.value = false
    generating.value = false
    void load()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  detailRequestGeneration += 1
  generateRequestGeneration += 1
})
</script>

<style scoped lang="scss">
.review-hero,
.section-head,
.actions,
.hero-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-hero {
  justify-content: space-between;
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.hero-copy {
  min-width: 0;
}

.actions,
.hero-meta {
  flex-wrap: wrap;
}

.actions {
  justify-content: flex-end;
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.review-hero h1,
.review-section h2,
.review-section p {
  margin-top: 0;
}

.review-hero h1 {
  margin-bottom: 8px;
}

.review-hero p,
.summary-text,
.limit-note {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.review-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.section-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.fact-list {
  display: grid;
  gap: 8px;
  padding-left: 20px;
  margin: 12px 0 0;
}

.rule-list {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 20px;
  color: #fbbf24;
  line-height: 1.6;
}

.stack-list {
  display: grid;
  gap: 10px;
}

.stack-list article {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.stack-list strong {
  display: block;
  margin-bottom: 6px;
}

.stack-list p {
  margin-bottom: 6px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.stack-list span {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.action-stack {
  margin-bottom: 14px;
}

.metric-strip,
.action-grid {
  display: grid;
  gap: 12px;
}

.metric-strip {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  margin-top: 16px;
}

.metric-strip > div {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.metric-strip strong {
  display: block;
  font-size: 26px;
}

.metric-strip span {
  color: var(--app-text-muted);
}

.unsupported-text {
  color: #fbbf24;
  line-height: 1.7;
}

.sample-warning-text {
  margin-bottom: 8px;
  color: #fbbf24;
  line-height: 1.7;
}

.strategy-content {
  margin-bottom: 0;
  line-height: 1.7;
}

.strategy-evidence-list,
.strategy-feedback-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.action-grid {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

@media (max-width: 720px) {
  .review-hero,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .actions {
    justify-content: flex-start;
  }
}
</style>
