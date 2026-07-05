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
          <el-button type="primary" :icon="RefreshCcw" :loading="generating" :disabled="isDemoContext()" @click="generate">生成复盘</el-button>
        </div>
      </section>

      <section class="review-section fact-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">FACTS</p>
            <h2>事实摘要</h2>
          </div>
          <el-tag effect="plain">metrics.facts</el-tag>
        </div>
        <p class="summary-text">{{ latest?.factSummary || '还没有生成复盘。先补齐实验事实，再生成复盘会更可靠。' }}</p>
        <ul class="fact-list" v-if="factItems.length">
          <li v-for="fact in factItems" :key="fact">{{ fact }}</li>
        </ul>
        <div class="metric-strip">
          <div>
            <strong>{{ detail.metrics?.applicationCount ?? 0 }}</strong>
            <span>投递数</span>
          </div>
          <div>
            <strong>{{ detail.metrics?.feedbackCount ?? 0 }}</strong>
            <span>反馈数</span>
          </div>
          <div>
            <strong>{{ detail.metrics?.interviewCompletedCount ?? 0 }}</strong>
            <span>完成面试</span>
          </div>
          <div>
            <strong>{{ detail.metrics?.sampleCount ?? detail.metrics?.applicationCount ?? 0 }}</strong>
            <span>样本数</span>
          </div>
        </div>
      </section>

      <section class="review-section sample-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">SAMPLE LIMIT</p>
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
          {{ weakConclusion ? '当前复盘只能作为下一轮实验假设，不能输出强结论或显著优劣判断。' : '样本未触发强提醒，仍建议保留人工复核。' }}
        </p>
      </section>

      <section class="review-section unsupported-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">UNSUPPORTED</p>
            <h2>不支持结论</h2>
          </div>
          <el-tag type="warning" effect="plain">unsupportedConclusion</el-tag>
        </div>
        <p class="unsupported-text">{{ unsupportedConclusion }}</p>
      </section>

      <section class="review-section strategy-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">STRATEGY</p>
            <h2>策略建议</h2>
          </div>
          <el-tag effect="plain">{{ strategyTitle }}</el-tag>
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
            {{ source.sourceType }} #{{ source.sourceId }} {{ source.evidenceSummary || source.sourceSummary || '' }}
          </el-tag>
        </div>
      </section>

      <section class="review-section next-action">
        <div class="section-head">
          <div>
            <p class="section-kicker">NEXT</p>
            <h2>下一步行动</h2>
          </div>
          <el-tag effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
        </div>
        <p class="summary-text">{{ nextActionText }}</p>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Bot, BriefcaseBusiness, FileText, FolderKanban, Mic, RefreshCcw } from 'lucide-vue-next'

import { generateJobExperimentReviewApi, getJobExperimentDetailApi } from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import SuggestionEvidencePanel from '@/components/suggestion/SuggestionEvidencePanel.vue'
import { confidenceLabel, shouldKeepConclusionWeak } from '@/features/job-experiment'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import type { JobSearchExperimentDetailVO, JobSearchExperimentStrategyVO } from '@/types/jobExperiment'
import type { ExplainableSuggestionVO } from '@/types/suggestion'
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
const latest = computed(() => detail.value?.latestReview || detail.value?.reviews?.[0])
const weakConclusion = computed(() => shouldKeepConclusionWeak(detail.value?.metrics))
const reviewStrategy = computed<JobSearchExperimentStrategyVO>(() => ({
  ...(latest.value?.strategy || {}),
  ...(detail.value?.strategy || {})
}))
const strategySampleInsufficient = computed(() =>
  detail.value?.metrics?.sampleInsufficient ?? reviewStrategy.value.sampleInsufficient ?? weakConclusion.value
)
const displayConfidenceLevel = computed(() =>
  detail.value?.metrics?.confidenceLevel || reviewStrategy.value.confidenceLevel || latest.value?.confidenceLevel || 'LOW'
)
const factItems = computed(() => detail.value?.metrics?.facts || [])
const metricSampleWarning = computed(() => {
  const metrics = detail.value?.metrics
  return metrics && 'sampleWarning' in metrics ? metrics.sampleWarning || '' : undefined
})
const strategySampleWarning = computed(() => {
  const strategy = detail.value?.strategy
  return strategy && 'sampleWarning' in strategy ? strategy.sampleWarning || '' : undefined
})
const currentSampleWarning = computed(() => metricSampleWarning.value ?? strategySampleWarning.value)
const sampleWarning = computed(() =>
  currentSampleWarning.value !== undefined
    ? currentSampleWarning.value
    : reviewStrategy.value.sampleWarning || (strategySampleInsufficient.value ? '当前样本不足，复盘只能作为弱建议，不能输出强结论。' : '')
)
const joinedCurrentUnsupportedConclusions = computed(() => {
  const metrics = detail.value?.metrics
  if (metrics && 'unsupportedConclusions' in metrics) {
    return (metrics.unsupportedConclusions || []).join('；')
  }
  const strategy = detail.value?.strategy
  if (strategy && 'unsupportedConclusions' in strategy) {
    return (strategy.unsupportedConclusions || []).join('；')
  }
  return undefined
})
const unsupportedConclusion = computed(() =>
  joinedCurrentUnsupportedConclusions.value !== undefined
    ? joinedCurrentUnsupportedConclusions.value
    : reviewStrategy.value.unsupportedConclusions?.join('；') ||
      (weakConclusion.value
        ? '当前样本不足，不能证明某个简历版本、岗位方向或项目证据一定带来更高转化。'
        : '暂无明确不支持结论；仍建议避免把单次成功或失败归因到单一因素。')
)
const strategyTitle = computed(() => textFromStrategy('title') || '下一轮实验假设')
const strategyContent = computed(() =>
  textFromStrategy('content') ||
  '先补齐目标岗位、简历、项目证据和投递反馈，再生成下一轮复盘。样本不足时只提出可验证行动。'
)
const strategySummary = computed(() =>
  weakConclusion.value ? strategyContent.value : latest.value?.insightSummary || '暂无洞察摘要。'
)
const strategyFeedbackContext = computed(() => {
  const reviewId = latest.value?.id
  return {
    scene: 'JOB_EXPERIMENT_STRATEGY',
    bizType: reviewId ? 'JOB_EXPERIMENT_REVIEW' : 'JOB_EXPERIMENT',
    bizId: reviewId || detail.value?.id || id()
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
    unsupportedConclusions: reviewStrategy.value.unsupportedConclusions || detail.value?.metrics?.unsupportedConclusions || [],
    weakObservations: reviewStrategy.value.weakObservations || detail.value?.metrics?.weakObservations || []
  }, {
    scene: 'JOB_EXPERIMENT_STRATEGY',
    bizType: strategyFeedbackContext.value.bizType,
    bizId: strategyFeedbackContext.value.bizId,
    experimentId: detail.value?.id || id(),
    traceId: latest.value?.aiTraceId || undefined
  })
)
const nextActionText = computed(() =>
  weakConclusion.value
    ? strategyContent.value
    : latest.value?.nextAction || strategyContent.value || '优先补齐 Agent 今日任务、简历、项目证据、目标岗位和模拟面试数据。'
)
const nextActionLinks = [
  { label: 'Agent 今日任务', path: '/agent/today', icon: Bot },
  { label: '简历', path: '/resumes', icon: FileText },
  { label: '项目证据', path: '/project-evidence', icon: FolderKanban },
  { label: '继续投递/目标岗位', path: '/job-targets', icon: BriefcaseBusiness },
  { label: '模拟面试', path: '/interviews/create', icon: Mic }
]

const id = () => Number(route.params.id)
const isDemoContext = () => route.query.demoFlag === 'true' || detail.value?.demoFlag === 1
const demoPath = (path: string) => {
  if (!isDemoContext()) return path
  return path.includes('?') ? `${path}&demoFlag=true` : `${path}?demoFlag=true`
}

const textFromStrategy = (key: string) => {
  const value = reviewStrategy.value[key as keyof JobSearchExperimentStrategyVO]
  return typeof value === 'string' ? value : ''
}

const goStrategyAction = (action?: SuggestionPanelAction | string) => {
  const actionUrl = typeof action === 'string' ? action : action?.path || action?.actionUrl
  const safePath = resolveAppRoutePath(actionUrl || '/agent/today', {
    fallbackPath: '/agent/today',
    knownPaths: defaultUserKnownPaths
  }).path
  router.push(demoPath(safePath))
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    detail.value = await getJobExperimentDetailApi(id())
  } catch (error) {
    detail.value = undefined
    errorMessage.value = error instanceof Error ? error.message : '求职实验复盘加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const generate = async () => {
  generating.value = true
  try {
    await generateJobExperimentReviewApi(id())
    await load()
    ElMessage.success('复盘建议已生成')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '复盘建议生成失败，请稍后重试。')
  } finally {
    generating.value = false
  }
}

onMounted(load)
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
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
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
  padding: 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.56);
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
  background: rgba(2, 6, 23, 0.22);
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
