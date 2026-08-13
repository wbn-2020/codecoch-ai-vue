<template>
  <div class="page-shell weekly-report-page">
    <section class="weekly-header">
      <div class="weekly-header__copy">
        <span>每周进展</span>
        <h1>求职周报</h1>
        <p>按自然周和目标岗位汇总已记录事实，区分变化信号、待验证方向和下一周行动。</p>
      </div>

      <div class="weekly-controls">
        <label class="weekly-control">
          <span>报告周</span>
          <el-date-picker
            v-model="weekStartDate"
            type="week"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled-date="disableFutureWeek"
            @change="handleWeekChange"
          />
        </label>
        <label class="weekly-control weekly-control--scope">
          <span>目标范围</span>
          <el-select v-model="targetScopeValue" @change="handleTargetChange">
            <el-option label="全部岗位（仅分组事实）" value="ALL" />
            <el-option
              v-for="target in targetJobs"
              :key="target.id"
              :label="targetLabel(target)"
              :value="String(target.id)"
            />
          </el-select>
        </label>
        <div class="weekly-actions">
          <el-button :icon="History" :loading="historyLoading" @click="openHistory">历史</el-button>
          <el-button
            v-if="!hasGeneratedReport"
            type="primary"
            :icon="FilePlus2"
            :loading="generating"
            :disabled="loading || refreshing"
            @click="generateReport"
          >
            生成周报
          </el-button>
          <el-button
            v-else
            :icon="RefreshCw"
            :loading="refreshing"
            :disabled="loading || generating"
            @click="refreshReport"
          >
            刷新快照
          </el-button>
        </div>
      </div>
    </section>

    <el-alert
      v-if="targetLoadWarning"
      type="warning"
      show-icon
      :closable="false"
      title="目标岗位列表暂不可用"
      :description="targetLoadWarning"
    />

    <AppState
      v-if="errorMessage && !loading"
      type="error"
      title="周报加载失败"
      :description="errorMessage"
    >
      <el-button type="primary" :loading="loading" @click="loadSelection">重新加载</el-button>
    </AppState>

    <div v-else v-loading="loading" class="weekly-content">
      <AppState
        v-if="!hasGeneratedReport && !loading"
        type="empty"
        title="这一周还没有周报快照"
        description="先选择报告周和目标范围，再生成本周周报。"
      >
        <el-button type="primary" :icon="FilePlus2" :loading="generating" @click="generateReport">
          生成周报
        </el-button>
      </AppState>

      <template v-else-if="report">
        <section class="snapshot-strip" aria-label="周报快照状态">
          <div class="snapshot-strip__tags">
            <el-tag effect="plain" :type="reportStatus.tagType">{{ reportStatus.label }}</el-tag>
            <el-tag effect="plain" :type="confidence.tagType">{{ confidence.label }}</el-tag>
            <el-tag v-if="report.fallback" effect="plain" type="warning">基础汇总</el-tag>
            <el-tag v-else effect="plain">{{ resultSourceLabel }}</el-tag>
            <el-tag v-if="report.snapshotVersion != null" effect="plain" type="info">
              第 {{ report.snapshotVersion }} 版
            </el-tag>
          </div>
          <div class="snapshot-strip__meta">
            <span>周范围：{{ report.weekStartDate || weekStartDate }} 至 {{ report.weekEndDate || weekEndDate }}</span>
            <span>范围：{{ scopeLabel }}</span>
            <span>时区：{{ reportTimezoneLabel }}</span>
            <span>数据截点：{{ cutoffText }}</span>
          </div>
        </section>

        <el-alert
          v-if="report.fallback"
          type="warning"
          show-icon
          :closable="false"
          title="本次周报使用基础汇总"
          :description="fallbackReason"
        />

        <section class="weekly-summary">
          <div>
            <span>周报摘要</span>
            <p>{{ summaryText }}</p>
          </div>
          <small v-if="report.range?.windowStatus === 'IN_PROGRESS'">
            当前周仍在进行，摘要只反映数据截点前已发生的活动。
          </small>
        </section>

        <WeeklyReportCoveragePanel
          :coverage="report.coverage"
          :range="report.range"
          :timezone="reportTimezone"
          :source-cutoff-at="report.sourceCutoffAt"
        />
        <WeeklyReportFactsPanel :facts="report.facts" :fact-only="displayPolicy.factOnly" />
        <WeeklyReportSignalsPanel :signals="report.signals" :fact-only="displayPolicy.factOnly" />
        <WeeklyExperimentPanel
          :hypotheses="report.hypotheses"
          :suggestions="report.experimentSuggestions"
          :fact-only="displayPolicy.factOnly"
        />
        <WeeklyPlanDraftPanel
          :draft="report.planDraft"
          :source-id="report.id"
          :source-version="report.snapshotVersion"
          :source-context-hash="report.targetScopeKey"
          :target-job-id="report.targetJobId"
        />
      </template>
    </div>

    <el-drawer v-model="historyVisible" title="历史周报" size="420px">
      <div v-loading="historyLoading" class="history-list">
        <button
          v-for="item in historyReports"
          :key="`${item.id}-${item.snapshotId}-${item.snapshotVersion}`"
          type="button"
          class="history-row"
          :class="{ 'is-current': item.id === report?.id }"
          @click="loadHistoryDetail(item)"
        >
          <span>{{ item.weekStartDate || '未标记周' }} 至 {{ item.weekEndDate || '--' }}</span>
          <strong>{{ historyScopeLabel(item) }}</strong>
          <small>
            {{ getWeeklyReportConfidencePresentation(item.confidenceLevel).label }}
            · v{{ item.snapshotVersion || 1 }}
            · {{ formatWeeklyReportDateTime(item.sourceCutoffAt, item.timezone) }}
          </small>
        </button>
        <p v-if="!historyReports.length && !historyLoading" class="history-empty">暂无历史周报。</p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { FilePlus2, History, RefreshCw } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, inject, onMounted, ref, watch } from 'vue'
import { routeLocationKey, routerKey, type LocationQueryRaw } from 'vue-router'

import {
  generateAgentWeeklyReportApi,
  getAgentWeeklyReportDetailApi,
  getAgentWeeklyReportsApi,
  getCurrentAgentWeeklyReportApi,
  refreshAgentWeeklyReportApi
} from '@/api/agentWeeklyReport'
import { getJobTargetsApi } from '@/api/jobTarget'
import WeeklyExperimentPanel from '@/components/agent-weekly-report/WeeklyExperimentPanel.vue'
import WeeklyPlanDraftPanel from '@/components/agent-weekly-report/WeeklyPlanDraftPanel.vue'
import WeeklyReportCoveragePanel from '@/components/agent-weekly-report/WeeklyReportCoveragePanel.vue'
import WeeklyReportFactsPanel from '@/components/agent-weekly-report/WeeklyReportFactsPanel.vue'
import WeeklyReportSignalsPanel from '@/components/agent-weekly-report/WeeklyReportSignalsPanel.vue'
import AppState from '@/components/common/AppState.vue'
import {
  buildWeeklyReportIdempotencyKey,
  buildWeeklyReportRequestId,
  clampWeeklyReportWeekStart,
  createWeeklyReportRequestGate,
  formatWeeklyReportDateTime,
  getCurrentWeeklyReportWeekStart,
  getWeeklyReportFallbackReason,
  getWeeklyReportConfidencePresentation,
  getWeeklyReportDisplayPolicy,
  getWeeklyReportResultSourceLabel,
  getWeeklyReportStatusPresentation,
  getWeeklyReportTimezoneLabel,
  getWeeklyReportUserText,
  getWeeklyReportWeekEnd,
  isFutureWeeklyReportWeek,
  normalizeWeeklyReportTimezone,
  toWeeklyReportWeekStart
} from '@/features/agent-weekly-report'
import type { AgentWeeklyReport } from '@/types/agentWeeklyReport'
import type { TargetJobVO } from '@/types/jobTarget'
import { getErrorMessage } from '@/utils/error'

const timezone = normalizeWeeklyReportTimezone(
  Intl.DateTimeFormat().resolvedOptions().timeZone,
  'Asia/Shanghai'
)
const route = inject(routeLocationKey, null)
const router = inject(routerKey, null)

const stringQueryValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const parseRouteWeekStartDate = (value: unknown) => {
  const text = stringQueryValue(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined
  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return undefined
  }
  return clampWeeklyReportWeekStart(text, timezone)
}

const parseRouteTargetJobId = (value: unknown) => {
  const text = stringQueryValue(value)
  if (!/^[1-9]\d*$/.test(text)) return undefined
  const id = Number(text)
  return Number.isSafeInteger(id) ? id : undefined
}

const routeSelection = () => ({
  weekStartDate: parseRouteWeekStartDate(route?.query.weekStartDate)
    || getCurrentWeeklyReportWeekStart(timezone),
  targetJobId: parseRouteTargetJobId(route?.query.targetJobId)
})

const initialRouteSelection = routeSelection()
const weekStartDate = ref(initialRouteSelection.weekStartDate)
const targetScopeValue = ref(
  initialRouteSelection.targetJobId == null ? 'ALL' : String(initialRouteSelection.targetJobId)
)
const targetJobs = ref<TargetJobVO[]>([])
const report = ref<AgentWeeklyReport | null>(null)
const historyReports = ref<AgentWeeklyReport[]>([])
const loading = ref(false)
const historyLoading = ref(false)
const detailLoading = ref(false)
const generating = ref(false)
const refreshing = ref(false)
const historyVisible = ref(false)
const errorMessage = ref('')
const targetLoadWarning = ref('')
const requestGate = createWeeklyReportRequestGate()
let selectionSequence = 0
let routeSelectionReady = false

const selectedTargetJobId = computed(() => {
  if (targetScopeValue.value === 'ALL') return undefined
  const id = Number(targetScopeValue.value)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
})
const hasGeneratedReport = computed(() =>
  Boolean(
    report.value
    && report.value.reportStatus !== 'NOT_GENERATED'
    && (report.value.id || report.value.snapshotId || report.value.facts.length)
  )
)
const displayPolicy = computed(() => getWeeklyReportDisplayPolicy(report.value))
const confidence = computed(() => getWeeklyReportConfidencePresentation(report.value?.confidenceLevel))
const reportStatus = computed(() =>
  getWeeklyReportStatusPresentation(report.value?.reportStatus, report.value?.range?.windowStatus)
)
const reportTimezone = computed(() =>
  normalizeWeeklyReportTimezone(report.value?.timezone || report.value?.range?.timezone, timezone)
)
const weekEndDate = computed(() => getWeeklyReportWeekEnd(weekStartDate.value))
const cutoffText = computed(() =>
  formatWeeklyReportDateTime(
    report.value?.sourceCutoffAt || report.value?.range?.sourceCutoffAt,
    reportTimezone.value
  )
)
const selectedTarget = computed(() =>
  targetJobs.value.find((item) => item.id === selectedTargetJobId.value)
)
const scopeLabel = computed(() =>
  selectedTarget.value
    ? targetLabel(selectedTarget.value)
    : selectedTargetJobId.value == null
      ? '全部岗位'
      : '指定岗位'
)
const reportTimezoneLabel = computed(() => getWeeklyReportTimezoneLabel(reportTimezone.value))
const resultSourceLabel = computed(() => getWeeklyReportResultSourceLabel(report.value?.resultSource))
const fallbackReason = computed(() => getWeeklyReportFallbackReason(report.value?.fallbackReason))
const defaultSummary = computed(() =>
  displayPolicy.value.factOnly
    ? '当前样本仅支持事实汇总，请先补齐可比较投递、反馈或可信面试记录。'
    : '本周记录已完成汇总，请结合样本范围审阅下一轮行动。'
)
const summaryText = computed(() =>
  getWeeklyReportUserText(report.value?.summary, defaultSummary.value)
)

const targetLabel = (target: TargetJobVO) =>
  [target.jobTitle, target.companyName].filter(Boolean).join(' · ') || '未命名岗位'

const weeklyReportErrorMessage = (error: unknown, fallback: string) =>
  getWeeklyReportUserText(getErrorMessage(error, fallback), fallback)

const disableFutureWeek = (value: Date) =>
  isFutureWeeklyReportWeek(value, timezone)

const queryParams = () => ({
  weekStartDate: weekStartDate.value,
  targetJobId: selectedTargetJobId.value,
  timezone
})

const applyRouteSelection = () => {
  const selection = routeSelection()
  const nextTargetScopeValue = selection.targetJobId == null
    ? 'ALL'
    : String(selection.targetJobId)
  const changed = weekStartDate.value !== selection.weekStartDate
    || targetScopeValue.value !== nextTargetScopeValue
  weekStartDate.value = selection.weekStartDate
  targetScopeValue.value = nextTargetScopeValue
  return changed
}

const syncSelectionQuery = async () => {
  if (!route || !router) return
  const selectedTargetId = selectedTargetJobId.value
  const hasTargetQuery = Object.prototype.hasOwnProperty.call(route.query, 'targetJobId')
  const weekIsCanonical = stringQueryValue(route.query.weekStartDate) === weekStartDate.value
  const targetIsCanonical = selectedTargetId == null
    ? !hasTargetQuery
    : stringQueryValue(route.query.targetJobId) === String(selectedTargetId)
  if (weekIsCanonical && targetIsCanonical) return

  const query: LocationQueryRaw = {
    ...route.query,
    weekStartDate: weekStartDate.value
  }
  if (selectedTargetId == null) {
    delete query.targetJobId
  } else {
    query.targetJobId = String(selectedTargetId)
  }
  await router.replace({ path: route.path, query, hash: route.hash }).catch(() => undefined)
}

const loadTargetJobs = async () => {
  try {
    targetJobs.value = await getJobTargetsApi({ pageNo: 1, pageSize: 100 })
    targetLoadWarning.value = ''
  } catch (error) {
    targetJobs.value = []
    targetLoadWarning.value = weeklyReportErrorMessage(
      error,
      '仍可使用“全部岗位”范围查看周报，具体岗位范围暂不可选。'
    )
  }
}

const loadHistory = async () => {
  historyLoading.value = true
  try {
    historyReports.value = await getAgentWeeklyReportsApi({
      targetJobId: selectedTargetJobId.value,
      timezone,
      limit: 12
    })
  } catch {
    historyReports.value = []
  } finally {
    historyLoading.value = false
  }
}

const loadSelection = async () => {
  const sequence = ++selectionSequence
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getCurrentAgentWeeklyReportApi(queryParams(), { silentError: true })
    if (sequence === selectionSequence) report.value = result
  } catch (error) {
    if (sequence === selectionSequence) {
      report.value = null
      errorMessage.value = weeklyReportErrorMessage(error, '周报暂时加载失败，请稍后重试。')
    }
  } finally {
    if (sequence === selectionSequence) loading.value = false
  }
  void loadHistory()
}

const handleWeekChange = async (value?: string) => {
  weekStartDate.value = clampWeeklyReportWeekStart(value, timezone)
  await syncSelectionQuery()
  await loadSelection()
}

const handleTargetChange = async (value?: string | number) => {
  const targetJobId = parseRouteTargetJobId(String(value ?? ''))
  targetScopeValue.value = targetJobId == null ? 'ALL' : String(targetJobId)
  await syncSelectionQuery()
  await loadSelection()
}

const generateReport = async () => {
  if (generating.value || refreshing.value || loading.value) return
  const idempotencyKey = buildWeeklyReportIdempotencyKey('generate', {
    weekStartDate: weekStartDate.value,
    targetJobId: selectedTargetJobId.value,
    timezone
  })
  generating.value = true
  try {
    const result = await requestGate.run(idempotencyKey, () =>
      generateAgentWeeklyReportApi({
        ...queryParams(),
        forceRefresh: false,
        requestId: buildWeeklyReportRequestId('generate'),
        idempotencyKey
      })
    )
    if (result) report.value = result
    ElMessage.success(result?.operationResult === 'NO_CHANGE' ? '来源未变化，已返回当前快照' : '周报已生成')
    await loadHistory()
  } catch (error) {
    ElMessage.error(weeklyReportErrorMessage(error, '周报生成失败，请稍后重试。'))
  } finally {
    generating.value = false
  }
}

const refreshReport = async () => {
  const current = report.value
  if (!current?.id || refreshing.value || generating.value || loading.value) return
  const idempotencyKey = buildWeeklyReportIdempotencyKey('refresh', {
    weekStartDate: current.weekStartDate || weekStartDate.value,
    targetJobId: current.targetJobId,
    timezone: current.timezone || timezone,
    reportId: current.id,
    snapshotId: current.snapshotId,
    snapshotVersion: current.snapshotVersion
  })
  refreshing.value = true
  try {
    const result = await requestGate.run(idempotencyKey, () =>
      refreshAgentWeeklyReportApi(current.id as number, {
        requestId: buildWeeklyReportRequestId('refresh'),
        idempotencyKey
      })
    )
    if (result) report.value = result
    ElMessage.success(result?.operationResult === 'NO_CHANGE' ? '来源未变化，保留当前快照' : '周报快照已刷新')
    await loadHistory()
  } catch (error) {
    ElMessage.error(weeklyReportErrorMessage(error, '周报刷新失败，请稍后重试。'))
  } finally {
    refreshing.value = false
  }
}

const openHistory = async () => {
  historyVisible.value = true
  await loadHistory()
}

const loadHistoryDetail = async (item: AgentWeeklyReport) => {
  if (!item.id || detailLoading.value) return
  detailLoading.value = true
  try {
    const detail = await getAgentWeeklyReportDetailApi(item.id)
    if (detail) {
      report.value = detail
      weekStartDate.value = toWeeklyReportWeekStart(detail.weekStartDate, detail.timezone || timezone)
      targetScopeValue.value = detail.targetJobId == null ? 'ALL' : String(detail.targetJobId)
      await syncSelectionQuery()
      historyVisible.value = false
    }
  } catch (error) {
    ElMessage.error(weeklyReportErrorMessage(error, '历史周报加载失败，请稍后重试。'))
  } finally {
    detailLoading.value = false
  }
}

const historyScopeLabel = (item: AgentWeeklyReport) => {
  if (item.targetJobId == null) return '全部岗位'
  const target = targetJobs.value.find((entry) => entry.id === item.targetJobId)
  return target ? targetLabel(target) : '指定岗位'
}

if (route) {
  watch(
    () => [route.query.weekStartDate, route.query.targetJobId],
    async () => {
      if (!routeSelectionReady) return
      const changed = applyRouteSelection()
      await syncSelectionQuery()
      if (changed) await loadSelection()
    },
    { deep: true }
  )
}

onMounted(async () => {
  await loadTargetJobs()
  applyRouteSelection()
  await syncSelectionQuery()
  routeSelectionReady = true
  await loadSelection()
})
</script>

<style scoped lang="scss">
.weekly-report-page,
.weekly-content {
  min-width: 0;
}

.weekly-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  border: 1.5px solid var(--arena-line, var(--app-border));
  border-radius: var(--arena-radius-card, 20px);
  background: var(--arena-card, var(--app-surface));
  box-shadow: var(--arena-shadow-card, 0 2px 4px rgba(21, 33, 27, 0.04));
}

.weekly-header__copy {
  min-width: 0;
}

.weekly-header__copy > span {
  color: var(--arena-grn-d, var(--app-primary-hover));
  font-size: 13px;
  font-weight: 700;
}

.weekly-header h1,
.weekly-header p {
  margin: 0;
}

.weekly-header h1 {
  margin-top: 6px;
  font-size: 26px;
  line-height: 1.3;
}

.weekly-header p {
  max-width: 72ch;
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.weekly-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 10px;
}

.weekly-control {
  display: grid;
  gap: 6px;
  min-width: 168px;
}

.weekly-control--scope {
  min-width: 250px;
}

.weekly-control > span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.weekly-control :deep(.el-date-editor),
.weekly-control :deep(.el-select) {
  width: 100%;
}

.weekly-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weekly-content {
  display: grid;
  gap: 14px;
}

.snapshot-strip {
  display: grid;
  gap: 10px;
  padding: 13px 16px;
  border: 1px solid var(--arena-line, var(--app-border));
  border-radius: 14px;
  background: var(--user-surface-muted, var(--app-surface));
}

.snapshot-strip__tags,
.snapshot-strip__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  align-items: center;
}

.snapshot-strip__meta {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.snapshot-strip__meta span {
  overflow-wrap: anywhere;
}

.weekly-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 15px 18px;
  border-top: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
}

.weekly-summary span {
  color: var(--arena-grn-d, var(--app-primary-hover));
  font-size: 12px;
  font-weight: 700;
}

.weekly-summary p {
  max-width: 82ch;
  margin: 5px 0 0;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.weekly-summary small {
  max-width: 36ch;
  color: var(--user-warning-text, var(--user-warning));
  line-height: 1.55;
}

.history-list {
  display: grid;
  gap: 8px;
}

.history-row {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--arena-line, var(--app-border));
  border-radius: 14px;
  color: var(--app-text);
  background: var(--arena-card, var(--app-surface));
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.history-row:hover,
.history-row.is-current {
  border-color: var(--arena-grn, var(--app-primary));
  background: var(--user-primary-faint, var(--app-surface-raised));
}

.history-row span,
.history-row small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.history-row strong,
.history-row small {
  overflow-wrap: anywhere;
}

.history-empty {
  color: var(--app-text-muted);
  text-align: center;
}

@media (max-width: 1100px) {
  .weekly-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .weekly-controls {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 760px) {
  .weekly-header {
    padding: 16px;
  }

  .weekly-controls,
  .weekly-control,
  .weekly-control--scope,
  .weekly-actions {
    width: 100%;
  }

  .weekly-actions :deep(.el-button) {
    flex: 1 1 140px;
    margin-left: 0;
  }

  .weekly-summary {
    flex-direction: column;
  }
}
</style>
