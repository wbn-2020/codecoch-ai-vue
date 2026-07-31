<template>
  <div class="page-shell agent-review-page">
    <section class="review-header">
      <div>
        <div class="review-eyebrow">Agent daily review</div>
        <h1>多日闭环复盘</h1>
        <p>先展示任务事实，再说明限制、偏移、调整和下一步。样本不足或降级来源只作为弱调整信号。</p>
      </div>
      <div class="review-actions">
        <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" />
        <el-button type="primary" :loading="generating" @click="generate">生成复盘</el-button>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <section class="review-metrics">
      <article>
        <span>最近复盘</span>
        <strong>{{ reviews.length }}</strong>
      </article>
      <article>
        <span>最新任务完成</span>
        <strong>{{ latest?.doneCount ?? 0 }}</strong>
      </article>
      <article>
        <span>跳过反馈</span>
        <strong>{{ latest?.skippedCount ?? 0 }}</strong>
      </article>
      <article>
        <span>下一步</span>
        <strong>{{ latestNextActionCount }}</strong>
      </article>
    </section>

    <section class="content-card">
      <div class="content-card__body" v-loading="loading">
        <AppState v-if="errorMessage && !loading" type="error" title="每日复盘加载失败" :description="errorMessage">
          <div class="empty-actions">
            <el-button type="primary" :loading="loading" @click="load">重新加载</el-button>
            <el-button @click="goTodayPlan">去今日任务</el-button>
          </div>
        </AppState>

        <AppState
          v-else-if="!reviewCards.length && !loading"
          type="empty"
          title="还没有每日复盘"
          description="完成或跳过今日任务后再生成复盘；没有复盘时，今日计划和任务中心仍可作为降级入口。"
        >
          <div class="empty-actions">
            <el-button type="primary" :loading="generating" @click="generate">生成今日复盘</el-button>
            <el-button @click="goTodayPlan">去今日任务</el-button>
            <el-button @click="router.push('/agent/tasks')">查看任务中心</el-button>
          </div>
        </AppState>

        <div v-else class="review-list">
          <article v-for="card in reviewCards" :key="card.review.id" class="review-row">
            <div class="review-row__head">
              <div>
                <span>{{ card.review.reviewDate || card.review.createdAt || '未标记日期' }}</span>
                <h2>{{ card.review.summary || '每日复盘' }}</h2>
              </div>
              <div class="review-tags">
                <el-tag effect="plain">{{ card.review.completionRate ?? 0 }}%</el-tag>
                <el-tag v-if="card.review.fallback" type="warning" effect="plain">降级复盘</el-tag>
                <el-tag v-if="card.review.confidenceLevel" type="info" effect="plain">{{ card.review.confidenceLevel }}</el-tag>
              </div>
            </div>

            <div class="review-sections">
              <section v-for="section in card.sections" :key="section.key">
                <h3>{{ section.title }}</h3>
                <ul>
                  <li v-for="item in section.items" :key="item">{{ item }}</li>
                </ul>
              </section>
            </div>

            <ReviewPlanSuggestionPanel
              v-if="adaptivePlanEnabled && card.planSuggestionData"
              :data="card.planSuggestionData"
              :submitting="isReviewDecisionSubmitting(card.review.id)"
              :previewing="previewPendingReviewId === card.review.id"
              @decide="handleReviewPlanDecision(card.review.id, $event)"
              @preview="handleReviewPlanPreview(card.review.id, $event)"
            />
          </article>
        </div>
      </div>
    </section>

    <PlanChangePreviewDialog
      v-if="adaptivePlanEnabled"
      v-model="previewDialogVisible"
      :preview="currentPreview"
      :suggestions="currentPreviewSuggestions"
      :source-review-date="currentPreviewReviewDate"
      :loading="previewPendingReviewId !== null"
      :confirming="confirming"
      @back="previewDialogVisible = false"
      @refresh="refreshCurrentPreview"
      @confirm="confirmCurrentPreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  confirmAgentPlanChangeSetApi,
  createAgentPlanChangePreviewApi,
  decideAgentReviewPlanSuggestionsApi,
  getAgentPlanChangeSetApi,
  getAgentReviewPlanSuggestionsApi
} from '@/api/agentPlanChange'
import { generateAgentReviewApi, getAgentReviewsApi, type AgentReviewVO } from '@/api/v4'
import PlanChangePreviewDialog from '@/components/agent-review/PlanChangePreviewDialog.vue'
import ReviewPlanSuggestionPanel from '@/components/agent-review/ReviewPlanSuggestionPanel.vue'
import AppState from '@/components/common/AppState.vue'
import { appConfig } from '@/config'
import {
  buildAgentReviewPlanSuggestionList,
  createAgentPlanChangeRequestIdentity,
  createSingleFlight,
  getAcceptedAgentReviewPlanSuggestionIds,
  getAgentPlanChangeErrorMessage,
  getCurrentAgentReviewPlanSuggestions,
  isAgentPlanChangeConflictError,
  mergeAgentPlanChangeConfirmResult,
  shouldRecoverAgentPlanConfirmByQuery
} from '@/features/agent-plan-change'
import { buildReviewSections } from '@/features/agent-loop/agentLoopAdapter'
import type {
  AgentPlanChangeConfirmVO,
  AgentPlanChangePreviewCommand,
  AgentPlanChangePreviewVO,
  AgentPlanChangeRequestIdentity,
  AgentReviewPlanDecisionCommand,
  AgentReviewPlanFields,
  AgentReviewPlanSuggestionListVO
} from '@/types/agentPlanChange'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

type AgentReviewWithPlanSuggestions = AgentReviewVO & AgentReviewPlanFields

interface ActivePreviewRequest extends AgentPlanChangePreviewCommand {
  reviewId: number
}

const today = formatLocalDate()
const router = useRouter()
const adaptivePlanEnabled = computed(() => appConfig.enableV4AdaptivePlan)
const date = ref(today)
const loading = ref(false)
const generating = ref(false)
const reviews = ref<AgentReviewWithPlanSuggestions[]>([])
const errorMessage = ref('')
const suggestionLists = ref<Record<number, AgentReviewPlanSuggestionListVO>>({})
const decisionPendingReviewIds = ref<Set<number>>(new Set())
const previewPendingReviewId = ref<number | null>(null)
const previewDialogVisible = ref(false)
const currentPreview = ref<AgentPlanChangePreviewVO | null>(null)
const currentPreviewRequest = ref<ActivePreviewRequest | null>(null)
const currentPreviewReviewId = ref<number | null>(null)
const confirming = ref(false)
const confirmIdentity = ref<{
  signature: string
  identity: AgentPlanChangeRequestIdentity
} | null>(null)
const confirmSingleFlight = createSingleFlight<AgentPlanChangeConfirmVO>()

const latest = computed(() => reviews.value[0])
const latestNextActionCount = computed(() => latest.value?.nextActions?.length || 0)
const currentPreviewSuggestionList = computed(() =>
  currentPreviewReviewId.value == null
    ? null
    : suggestionLists.value[currentPreviewReviewId.value] || null
)
const currentPreviewSuggestions = computed(() =>
  getCurrentAgentReviewPlanSuggestions(currentPreviewSuggestionList.value)
)
const currentPreviewReviewDate = computed(() =>
  currentPreviewSuggestionList.value?.reviewDate
  || reviews.value.find((review) => review.id === currentPreviewReviewId.value)?.reviewDate
  || ''
)

const reviewCards = computed(() =>
  reviews.value.map((review) => {
    const sections = buildReviewSections(review)
    return {
      review,
      planSuggestionData: String(review.reviewType || '').toUpperCase() === 'DAILY'
        ? suggestionLists.value[review.id] || buildAgentReviewPlanSuggestionList(review)
        : null,
      sections: [
        { key: 'facts', title: '事实', items: sections.facts },
        { key: 'limits', title: '限制', items: sections.limits },
        { key: 'drifts', title: '偏移', items: sections.drifts },
        { key: 'adjustments', title: '调整', items: sections.adjustments },
        { key: 'next', title: '下一步', items: sections.nextActions }
      ]
    }
  })
)

const initializeSuggestionLists = (items: AgentReviewWithPlanSuggestions[]) => {
  suggestionLists.value = Object.fromEntries(
    items
      .filter((review) => String(review.reviewType || '').toUpperCase() === 'DAILY')
      .map((review) => [review.id, buildAgentReviewPlanSuggestionList(review)])
  )
}

const setReviewDecisionPending = (reviewId: number, pending: boolean) => {
  const next = new Set(decisionPendingReviewIds.value)
  if (pending) next.add(reviewId)
  else next.delete(reviewId)
  decisionPendingReviewIds.value = next
}

const isReviewDecisionSubmitting = (reviewId: number) =>
  decisionPendingReviewIds.value.has(reviewId)

const updateSuggestionList = (
  reviewId: number,
  data: AgentReviewPlanSuggestionListVO
) => {
  suggestionLists.value = {
    ...suggestionLists.value,
    [reviewId]: data
  }
  const review = reviews.value.find((item) => item.id === reviewId)
  if (review) {
    review.reviewVersion = data.reviewVersion
    review.sourceSnapshotHash = data.sourceSnapshotHash
    review.planSuggestions = data.suggestions || []
    review.planDecisionSummary = data.decisionSummary
  }
}

const refreshReviewPlanSuggestions = async (reviewId: number) => {
  const data = await getAgentReviewPlanSuggestionsApi(reviewId, { silentError: true })
  updateSuggestionList(reviewId, data)
  return data
}

const load = async () => {
  loading.value = true
  try {
    const loaded = await getAgentReviewsApi() as AgentReviewWithPlanSuggestions[]
    reviews.value = loaded
    initializeSuggestionLists(loaded)
    errorMessage.value = ''
  } catch (error) {
    reviews.value = []
    suggestionLists.value = {}
    errorMessage.value = getErrorMessage(error, '每日复盘暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const generate = async () => {
  if (loading.value || generating.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '生成每日复盘预览',
    action: '生成或刷新指定日期的每日复盘',
    target: `复盘日期：${date.value || today}`,
    impact: '系统会读取当天任务完成、跳过和剩余情况，并写入一条可追踪复盘；低样本只会形成弱调整信号。',
    rollback: '如果复盘不准确，可以补充或修正当天任务后重新生成；已采纳的行动建议不会自动撤回。',
    audit: '复盘记录保留日期、任务计数、完成率和下一步动作，便于后续追踪。',
    tips: ['建议先确认当天任务状态已经同步。', '如果只是查看历史复盘，请使用刷新按钮。'],
    confirmButtonText: '确认生成复盘'
  })
  if (!confirmed) return
  generating.value = true
  try {
    await generateAgentReviewApi({ date: date.value })
    ElMessage.success('复盘已生成')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '每日复盘生成失败，请稍后重试。'))
  } finally {
    generating.value = false
  }
}

const decisionSuccessMessage = (commands: AgentReviewPlanDecisionCommand[]) => {
  const decision = commands[0]?.decision
  if (decision === 'ACCEPTED') return '建议已采纳，尚未影响计划。'
  if (decision === 'IGNORED') return '建议已忽略，未影响计划。'
  return '建议已恢复为待决定，未影响计划。'
}

const handleReviewPlanDecision = async (
  reviewId: number,
  commands: AgentReviewPlanDecisionCommand[]
) => {
  const data = suggestionLists.value[reviewId]
  if (!data?.reviewVersion || !commands.length || isReviewDecisionSubmitting(reviewId)) return
  const identity = createAgentPlanChangeRequestIdentity(`decision:${reviewId}`)
  setReviewDecisionPending(reviewId, true)
  try {
    const result = await decideAgentReviewPlanSuggestionsApi(reviewId, {
      ...identity,
      expectedReviewVersion: data.reviewVersion,
      decisions: commands.map((command) => ({
        suggestionId: command.suggestion.id,
        decision: command.decision,
        expectedDecisionVersion: command.suggestion.decisionVersion || 1,
        reason: command.reason
      }))
    }, { silentError: true })
    updateSuggestionList(reviewId, result)
    if (currentPreviewReviewId.value === reviewId) {
      currentPreview.value = currentPreview.value
        ? { ...currentPreview.value, status: 'STALE', confirmable: false }
        : null
      previewDialogVisible.value = false
      confirmIdentity.value = null
    }
    ElMessage.success(decisionSuccessMessage(commands))
  } catch (error) {
    if (isAgentPlanChangeConflictError(error)) {
      try {
        await refreshReviewPlanSuggestions(reviewId)
      } catch {
        // Keep the original conflict message when the refresh also fails.
      }
    }
    ElMessage.warning(getAgentPlanChangeErrorMessage(
      error,
      '建议状态已变化，请刷新后重试。'
    ))
  } finally {
    setReviewDecisionPending(reviewId, false)
  }
}

const generatePlanChangePreview = async (
  reviewId: number,
  command: AgentPlanChangePreviewCommand
) => {
  if (previewPendingReviewId.value !== null) return
  const data = suggestionLists.value[reviewId]
  if (!data?.reviewVersion) {
    ElMessage.warning('复盘版本暂不可用，请刷新复盘后重试。')
    return
  }
  const accepted = new Set(getAcceptedAgentReviewPlanSuggestionIds(data))
  const acceptedSuggestionIds = command.acceptedSuggestionIds
    .filter((id) => accepted.has(id))
  if (!acceptedSuggestionIds.length) {
    ElMessage.warning('请先采纳至少一条可执行建议。')
    return
  }
  const identity = createAgentPlanChangeRequestIdentity(`preview:${reviewId}`)
  previewPendingReviewId.value = reviewId
  try {
    const preview = await createAgentPlanChangePreviewApi(reviewId, {
      ...identity,
      expectedReviewVersion: data.reviewVersion,
      acceptedSuggestionIds,
      targetDate: command.targetDate,
      maxTotalMinutes: command.maxTotalMinutes
    }, { silentError: true })
    currentPreview.value = preview
    currentPreviewReviewId.value = reviewId
    currentPreviewRequest.value = {
      reviewId,
      acceptedSuggestionIds,
      targetDate: command.targetDate,
      maxTotalMinutes: command.maxTotalMinutes
    }
    confirmIdentity.value = null
    previewDialogVisible.value = true
  } catch (error) {
    if (isAgentPlanChangeConflictError(error)) {
      try {
        await refreshReviewPlanSuggestions(reviewId)
      } catch {
        // The user can still use the page-level refresh action.
      }
    }
    ElMessage.warning(getAgentPlanChangeErrorMessage(
      error,
      '计划差异预览生成失败，请稍后重试。'
    ))
  } finally {
    previewPendingReviewId.value = null
  }
}

const handleReviewPlanPreview = (
  reviewId: number,
  command: AgentPlanChangePreviewCommand
) => generatePlanChangePreview(reviewId, command)

const refreshCurrentPreview = async () => {
  const status = String(currentPreview.value?.status || '').toUpperCase()
  if (status && !['PREVIEW_READY', 'STALE'].includes(status)) {
    try {
      await refreshCurrentChangeSet()
    } catch (error) {
      ElMessage.error(getAgentPlanChangeErrorMessage(
        error,
        '计划变更状态刷新失败，请稍后重试。'
      ))
    }
    return
  }
  const request = currentPreviewRequest.value
  if (!request) return
  await generatePlanChangePreview(request.reviewId, {
    acceptedSuggestionIds: getAcceptedAgentReviewPlanSuggestionIds(
      suggestionLists.value[request.reviewId]
    ),
    targetDate: request.targetDate,
    maxTotalMinutes: request.maxTotalMinutes
  })
}

const ensureConfirmIdentity = (preview: AgentPlanChangePreviewVO) => {
  const signature = `${preview.changeSetId}:${preview.previewVersion || 0}:${preview.previewHash || ''}`
  if (!confirmIdentity.value || confirmIdentity.value.signature !== signature) {
    confirmIdentity.value = {
      signature,
      identity: createAgentPlanChangeRequestIdentity(`confirm:${preview.changeSetId}`)
    }
  }
  return confirmIdentity.value.identity
}

const refreshCurrentChangeSet = async () => {
  if (!currentPreview.value?.changeSetId) return null
  const refreshed = await getAgentPlanChangeSetApi(
    currentPreview.value.changeSetId,
    { silentError: true }
  )
  currentPreview.value = refreshed
  return refreshed
}

const announceConfirmedStatus = (
  status?: string,
  message?: string
) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'APPLIED') {
    ElMessage.success(message || '复盘调整已确认并应用到计划。')
    return
  }
  if (normalized === 'CONFIRMED_WAITING_PLAN') {
    ElMessage.success('调整已确认，尚未写入目标日计划；将在计划生成时按本次预览应用。')
    return
  }
  if (normalized === 'PARTIALLY_APPLIED') {
    ElMessage.warning(message || '部分已确认调整已应用，另有前置条件失效。')
    return
  }
  if (normalized === 'APPLY_FAILED') {
    ElMessage.error(message || '调整已确认，但应用失败；请刷新状态后重试。')
    return
  }
  if (normalized === 'APPLYING') {
    ElMessage.info('确认请求正在处理，已刷新真实状态，请勿重复提交。')
  }
}

const confirmCurrentPreview = async (acknowledgedWarningCodes: string[]) => {
  const preview = currentPreview.value
  if (
    !preview
    || !preview.previewVersion
    || !preview.previewHash
    || confirming.value
  ) return
  const identity = ensureConfirmIdentity(preview)
  confirming.value = true
  try {
    const result = await confirmSingleFlight.run(() =>
      confirmAgentPlanChangeSetApi(preview.changeSetId, {
        ...identity,
        previewVersion: preview.previewVersion!,
        previewHash: preview.previewHash!,
        acknowledgedWarningCodes
      }, { silentError: true })
    )
    currentPreview.value = mergeAgentPlanChangeConfirmResult(preview, result)
    let refreshed: AgentPlanChangePreviewVO | null = null
    try {
      refreshed = await refreshCurrentChangeSet()
    } catch {
      // The confirm response is authoritative when the follow-up read is unavailable.
    }
    announceConfirmedStatus(
      refreshed?.status || result.status,
      result.message || refreshed?.failureMessage
    )
  } catch (error) {
    let refreshed: AgentPlanChangePreviewVO | null = null
    if (
      shouldRecoverAgentPlanConfirmByQuery(error)
      || isAgentPlanChangeConflictError(error)
    ) {
      try {
        refreshed = await refreshCurrentChangeSet()
      } catch {
        refreshed = null
      }
    }
    const refreshedStatus = String(refreshed?.status || '').toUpperCase()
    if (['APPLIED', 'CONFIRMED_WAITING_PLAN', 'PARTIALLY_APPLIED', 'APPLY_FAILED', 'APPLYING'].includes(refreshedStatus)) {
      announceConfirmedStatus(refreshedStatus, refreshed?.failureMessage)
      return
    }
    if (refreshedStatus === 'STALE' || isAgentPlanChangeConflictError(error)) {
      if (currentPreviewReviewId.value != null) {
        try {
          await refreshReviewPlanSuggestions(currentPreviewReviewId.value)
        } catch {
          // Keep the refreshed change-set state even if suggestions cannot refresh.
        }
      }
      ElMessage.warning(
        refreshed?.failureMessage
        || getAgentPlanChangeErrorMessage(error, '计划基线已变化，请重新生成预览。')
      )
      return
    }
    ElMessage.error(getAgentPlanChangeErrorMessage(
      error,
      '确认状态暂不可用，请刷新变更集后再重试。'
    ))
  } finally {
    confirming.value = false
  }
}

const goTodayPlan = () => router.push('/agent/today')

onMounted(load)
</script>

<style scoped lang="scss">
.agent-review-page {
  display: grid;
  gap: 16px;
}

.review-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
}

.review-header h1 {
  margin: 8px 0 0;
  font-size: 26px;
  letter-spacing: 0;
}

.review-header p {
  max-width: 720px;
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.review-eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.review-actions,
.empty-actions,
.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.review-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.review-metrics article {
  padding: 12px 14px;
  border-right: 1px solid var(--app-border);
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.review-metrics span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.review-metrics strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 24px;
}

.review-list {
  display: grid;
  gap: 14px;
}

.review-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.review-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.review-row__head span {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.review-row__head h2 {
  margin: 6px 0 0;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.45;
}

.review-sections {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.review-sections section {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.review-sections h3 {
  margin: 0 0 8px;
  color: var(--app-text);
  font-size: 13px;
}

.review-sections ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 16px;
}

.review-sections li {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

@media (max-width: 1100px) {
  .review-sections {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .review-header,
  .review-row__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-metrics,
  .review-sections {
    grid-template-columns: 1fr;
  }

  .review-metrics article {
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .review-metrics article:last-child {
    border-bottom: 0;
  }
}
</style>
