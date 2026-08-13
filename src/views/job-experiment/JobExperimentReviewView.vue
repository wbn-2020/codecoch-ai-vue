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
      <section class="review-hero arena-card">
        <div class="hero-copy">
          <p class="page-kicker">实验复盘</p>
          <h1>{{ detail.title }}</h1>
          <p class="hero-description">
            {{ detail.goal || detail.targetDirection || '用事实、样本边界和一个下一步行动复盘求职实验。' }}
          </p>
          <div class="hero-meta">
            <el-tag v-if="detail.demoFlag" type="warning" effect="plain">演示数据</el-tag>
            <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
              {{ weakConclusion ? '暂时只能弱判断' : '可以形成候选判断' }}
            </el-tag>
            <el-tag effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
          </div>
        </div>
        <div class="actions">
          <el-button :icon="ArrowLeft" @click="router.push(demoPath(`/job-experiments/${detail.id}`))">
            实验详情
          </el-button>
          <el-dropdown trigger="click" @command="handleReviewCommand">
            <el-button circle :icon="MoreHorizontal" aria-label="更多复盘操作" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="appConfig.enableV9EvidenceLearning"
                  command="evidence"
                >
                  <ClipboardCheck :size="15" /> 查看证据使用样本
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <Settings2 :size="15" /> 打开实验设置与归因
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            type="primary"
            :icon="RefreshCcw"
            :loading="generating"
            :disabled="isDemoContext()"
            @click="generate"
          >
            {{ latest ? '更新复盘' : '生成复盘' }}
          </el-button>
        </div>
      </section>

      <section class="review-overview-grid">
        <article class="review-section conclusion-panel">
          <div class="section-head">
            <div>
              <p class="section-kicker">结论摘要</p>
              <h2>{{ factSummary }}</h2>
            </div>
            <el-tag :type="weakConclusion ? 'warning' : 'success'" effect="plain">
              {{ qualityGateLabel === 'STRONG' ? '证据较充分' : '仍需验证' }}
            </el-tag>
          </div>
          <p class="summary-text">{{ strategySummary }}</p>
        </article>

        <article class="review-section boundary-panel">
          <div class="section-head">
            <div>
              <p class="section-kicker">判断边界</p>
              <h2>哪些事情现在还不能确定</h2>
            </div>
            <el-tag type="warning" effect="plain">{{ confidenceLabel(displayConfidenceLevel) }}</el-tag>
          </div>
          <el-alert
            v-if="sampleWarning"
            type="warning"
            :closable="false"
            title="样本需要继续积累"
            :description="sampleWarning"
          />
          <p v-else class="summary-text">{{ reviewModeText }}</p>
          <p v-if="unsupportedConclusions.length" class="boundary-hint">
            {{ unsupportedConclusions[0].blockedReason }}
          </p>
        </article>
      </section>

      <section class="review-section next-step-panel">
        <div class="next-step-copy">
          <p class="section-kicker">下一步</p>
          <h2>{{ reviewNextActions[0]?.title || '把复盘变成一个可执行动作' }}</h2>
          <p>{{ nextActionText }}</p>
        </div>
        <el-button
          type="primary"
          :icon="ArrowRight"
          @click="runPrimaryNextAction"
        >
          执行下一步
        </el-button>
      </section>

      <section class="materials-entry review-section">
        <div>
          <p class="section-kicker">按需查看</p>
          <h2>完整复盘材料</h2>
          <p class="summary-text">事实明细、观察、假设、行动和证据来源已分开整理，按需要查看。</p>
        </div>
        <el-button :icon="PanelsTopLeft" @click="openReviewMaterials('facts')">
          查看完整材料
        </el-button>
      </section>

      <section v-if="reviewMaterialsOpen" class="review-section review-materials">
        <div class="materials-header">
          <div>
            <p class="section-kicker">完整材料</p>
            <h2>复盘依据与行动记录</h2>
          </div>
          <el-button link :icon="X" aria-label="收起完整材料" @click="closeReviewMaterials">收起</el-button>
        </div>
        <el-tabs v-model="activeReviewTab" @tab-change="handleReviewTabChange">
          <el-tab-pane label="事实与限制" name="facts">
            <div class="material-content">
              <div class="metric-strip">
                <div><strong>{{ metricCountLabel(feedbackSummary.applicationCount) }}</strong><span>投递数</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.feedbackCount) }}</strong><span>反馈数</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.interviewCompletedCount) }}</strong><span>完成面试</span></div>
                <div><strong>{{ metricCountLabel(detail.metrics?.sampleCount ?? detail.metrics?.applicationCount) }}</strong><span>样本数</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.rejectedCount) }}</strong><span>拒信</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.noFeedbackCount) }}</strong><span>无反馈</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.interviewRoundCount) }}</strong><span>面试轮次</span></div>
                <div><strong>{{ metricCountLabel(feedbackSummary.interviewReportSummaryCount) }}</strong><span>报告摘要</span></div>
              </div>
              <ul v-if="factItems.length" class="fact-list">
                <li v-for="fact in factItems" :key="fact">{{ fact }}</li>
              </ul>
              <div class="material-subsection">
                <div class="section-head">
                  <h3>暂不支持的判断</h3>
                  <el-tag type="warning" effect="plain">需要更多证据</el-tag>
                </div>
                <div v-if="unsupportedConclusions.length" class="stack-list">
                  <article
                    v-for="item in unsupportedConclusions"
                    :key="`${item.conclusionType}-${item.blockedReason}`"
                  >
                    <strong>{{ item.conclusionType || '样本边界' }}</strong>
                    <p>{{ item.blockedReason }}</p>
                    <span>{{ item.requiredSampleHint || '补足样本和证据后再判断。' }}</span>
                  </article>
                </div>
                <p v-else class="summary-text">暂无需要特别标记的判断边界。</p>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="观察与假设" name="observations">
            <div class="material-content">
              <div class="material-subsection first-subsection">
                <div class="section-head">
                  <h3>弱观察</h3>
                  <el-tag type="warning" effect="plain">{{ qualityGateLabel }}</el-tag>
                </div>
                <div v-if="weakObservations.length" class="stack-list">
                  <article v-for="item in weakObservations" :key="`${item.observationType}-${item.text}`">
                    <strong>{{ item.observationType || '观察' }}</strong>
                    <p>{{ item.text }}</p>
                    <span>{{ metricCountLabel(item.evidenceCount, ' 条证据') }} · {{ confidenceLabel(item.confidenceLevel) }}</span>
                    <span v-if="item.actionHint">{{ item.actionHint }}</span>
                  </article>
                </div>
                <p v-else class="summary-text">暂无弱观察。先补充真实样本，再观察趋势。</p>
              </div>
              <div class="material-subsection">
                <div class="section-head">
                  <h3>实验假设</h3>
                  <el-tag effect="plain">{{ hypotheses.length }} 条</el-tag>
                </div>
                <div v-if="hypotheses.length" class="stack-list">
                  <article v-for="item in hypotheses" :key="`${item.targetDirection}-${item.assumption}`">
                    <strong>{{ item.targetDirection || detail.targetDirection || '当前方向' }}</strong>
                    <p>{{ item.assumption }}</p>
                    <span>{{ item.expectedSignal || '观察下一轮投递反馈、面试邀约和证据覆盖变化。' }}</span>
                  </article>
                </div>
                <p v-else class="summary-text">暂无实验假设。</p>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="行动与证据" name="actionEvidence">
            <div class="material-content">
              <div class="section-head">
                <div>
                  <h3>行动记录</h3>
                  <p class="muted">完整行动列表保留在这里，首屏只突出一项下一步。</p>
                </div>
                <el-button plain @click="openExperimentSettings">实验设置与归因</el-button>
              </div>
              <div v-if="reviewNextActions.length" class="stack-list">
                <article v-for="action in reviewNextActions" :key="`${action.actionType}-${action.title}`">
                  <strong>{{ action.title }}</strong>
                  <p>{{ action.reason || '把复盘变成下一轮可执行动作。' }}</p>
                  <el-button v-if="action.targetRoute" size="small" @click="goStrategyAction(action.targetRoute)">
                    打开入口
                  </el-button>
                </article>
              </div>
              <div v-else class="empty-state">暂无额外行动记录。</div>
              <div class="material-subsection">
                <div class="section-head">
                  <div>
                    <h3>证据来源</h3>
                    <p class="muted">{{ strategyContent }}</p>
                  </div>
                  <el-tag effect="plain">{{ explainableStrategy.qualityGate?.suggestionStrength || 'WEAK' }}</el-tag>
                </div>
                <SuggestionEvidencePanel
                  :suggestion="explainableStrategy"
                  :default-open="false"
                  @open-action="goStrategyAction"
                />
                <div v-if="explainableStrategy.evidenceSources.length" class="strategy-evidence-list">
                  <el-tag
                    v-for="source in explainableStrategy.evidenceSources"
                    :key="`${source.sourceType || 'SOURCE'}:${source.sourceId ?? source.evidenceSummary}`"
                    effect="plain"
                  >
                    {{ strategyEvidenceLabel(source.sourceType) }} #{{ source.sourceId }}
                    {{ source.evidenceSummary || source.sourceSummary || '' }}
                  </el-tag>
                </div>
                <p v-else class="summary-text">暂无可展示证据来源，请先在实验详情中绑定关联证据。</p>
              </div>
              <div class="secondary-actions">
                <el-button
                  v-for="action in nextActionLinks"
                  :key="action.path"
                  :icon="action.icon"
                  @click="router.push(demoPath(action.path))"
                >
                  {{ action.label }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Mic,
  MoreHorizontal,
  PanelsTopLeft,
  RefreshCcw,
  Settings2,
  X
} from 'lucide-vue-next'

import { generateJobExperimentReviewApi, getJobExperimentDetailApi } from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import SuggestionEvidencePanel from '@/components/suggestion/SuggestionEvidencePanel.vue'
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
type ReviewTab = 'facts' | 'observations' | 'actionEvidence'
const reviewTabs: ReviewTab[] = ['facts', 'observations', 'actionEvidence']
const activeReviewTab = ref<ReviewTab>('facts')
const reviewMaterialsOpen = ref(false)
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

const resolveReviewTab = (value: unknown): ReviewTab | undefined => {
  const name = Array.isArray(value) ? value[0] : value
  return typeof name === 'string' && reviewTabs.includes(name as ReviewTab)
    ? name as ReviewTab
    : undefined
}

const openReviewMaterials = (tab: ReviewTab) => {
  activeReviewTab.value = tab
  reviewMaterialsOpen.value = true
  void router.replace({ path: route.path, query: { ...route.query, reviewTab: tab } })
}

const closeReviewMaterials = () => {
  reviewMaterialsOpen.value = false
  const { reviewTab: _reviewTab, ...query } = route.query
  void router.replace({ path: route.path, query })
}

const handleReviewTabChange = (value: string | number) => {
  const tab = resolveReviewTab(value)
  if (tab) openReviewMaterials(tab)
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

const openExperimentSettings = () => {
  const id = detail.value?.id ?? experimentId.value
  if (!id) return
  router.push(demoPath(`/job-experiments/${id}?tab=settings`))
}

const handleReviewCommand = (command: string | number | object) => {
  if (command === 'evidence') {
    openEvidenceSamples()
  } else if (command === 'settings') {
    openExperimentSettings()
  }
}

const runPrimaryNextAction = () => {
  const firstAction = reviewNextActions.value[0]
  if (firstAction?.targetRoute) {
    goStrategyAction(firstAction.targetRoute)
    return
  }
  goStrategyAction(detail.value?.strategy?.actionUrl || '/agent/today')
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
  () => route.query.reviewTab,
  (value) => {
    const tab = resolveReviewTab(value)
    if (tab) {
      activeReviewTab.value = tab
      reviewMaterialsOpen.value = true
    } else {
      reviewMaterialsOpen.value = false
    }
  },
  { immediate: true }
)

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
  border-radius: var(--arena-radius-card, 16px);
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
  border-radius: var(--arena-radius-card, 16px);
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
  color: var(--user-warning-text);
  line-height: 1.6;
}

.stack-list {
  display: grid;
  gap: 10px;
}

.stack-list article {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
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
  border-radius: var(--arena-radius-card, 16px);
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
  color: var(--user-warning-text, var(--arena-amber, var(--user-warning)));
  line-height: 1.7;
}

.sample-warning-text {
  margin-bottom: 8px;
  color: var(--user-warning-text, var(--arena-amber, var(--user-warning)));
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

<style scoped lang="scss">
.job-experiment-review {
  display: grid;
  gap: 16px;
  color: var(--arena-ink);
}

.arena-card,
.review-section {
  border: 1px solid var(--arena-line);
  border-radius: 16px;
  background: var(--arena-card);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.review-hero,
.review-section,
.materials-entry {
  padding: 20px;
}

.review-hero,
.hero-meta,
.actions,
.section-head,
.next-step-panel,
.materials-entry,
.materials-header,
.secondary-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-hero,
.next-step-panel,
.materials-entry,
.materials-header,
.section-head {
  justify-content: space-between;
}

.hero-copy,
.next-step-copy,
.materials-entry > div {
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
.boundary-hint,
.stack-list p,
.stack-list span {
  color: var(--arena-sub);
  line-height: 1.65;
}

.hero-description {
  max-width: 72ch;
  margin-bottom: 0;
}

.hero-meta,
.actions,
.secondary-actions {
  flex-wrap: wrap;
}

.actions {
  justify-content: flex-end;
}

.review-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 16px;
}

.review-section {
  min-width: 0;
}

.conclusion-panel {
  background: #f0fbf4;
  border-color: #b9e7cd;
}

.conclusion-panel h2 {
  max-width: 40ch;
  overflow-wrap: anywhere;
}

.summary-text {
  margin-bottom: 0;
}

.boundary-panel {
  display: flex;
  flex-direction: column;
}

.boundary-hint {
  margin: 12px 0 0;
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
}

.materials-entry {
  background: var(--user-surface-muted);
  box-shadow: none;
}

.materials-entry p:last-child {
  margin-bottom: 0;
}

.review-materials {
  min-width: 0;
}

.materials-header {
  margin-bottom: 8px;
}

.material-content {
  min-width: 0;
  padding-top: 8px;
}

.metric-strip,
.stack-list {
  display: grid;
  gap: 10px;
}

.metric-strip {
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
}

.metric-strip > div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--arena-line2);
  border-radius: 10px;
  background: var(--user-surface-muted);
}

.metric-strip strong {
  display: block;
  color: var(--arena-ink);
  font-size: 24px;
  line-height: 1.2;
}

.metric-strip span {
  display: block;
  margin-top: 4px;
  color: var(--arena-sub);
  font-size: 12px;
}

.fact-list {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  padding-left: 20px;
  color: var(--arena-sub);
  line-height: 1.6;
}

.material-subsection {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--arena-line2);
}

.first-subsection {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.stack-list article {
  padding: 14px;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--user-surface-muted);
}

.stack-list strong {
  display: block;
  margin-bottom: 6px;
}

.stack-list p {
  margin-bottom: 6px;
}

.stack-list span {
  display: block;
  font-size: 12px;
}

.strategy-evidence-list,
.secondary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.empty-state {
  padding: 24px;
  border: 1px dashed var(--arena-line);
  border-radius: 12px;
  color: var(--arena-sub);
  text-align: center;
}

@media (max-width: 840px) {
  .review-overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .review-hero,
  .actions,
  .section-head,
  .next-step-panel,
  .materials-entry,
  .materials-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .actions,
  .secondary-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .next-step-panel .el-button {
    max-width: 100%;
  }
}

@media (max-width: 440px) {
  .review-hero,
  .review-section {
    padding: 16px;
  }
}
</style>
