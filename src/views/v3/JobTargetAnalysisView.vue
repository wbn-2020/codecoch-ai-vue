<template>
  <div class="arena job-analysis-page page-shell">
    <section class="analysis-hero">
      <div>
        <div class="hero-kicker">
          <ScanSearch :size="16" />
          岗位分析
        </div>
        <h1>{{ target?.jobTitle || '岗位分析结果' }}</h1>
        <p>{{ targetSubtitle }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/job-targets')">
          <ArrowLeft :size="16" />
          返回列表
        </el-button>
        <el-button v-if="targetId" @click="router.push(`/job-targets/${targetId}/edit`)">
          <Pencil :size="16" />
          编辑岗位
        </el-button>
        <el-button :loading="loading" @click="loadAll">
          <RefreshCw :size="16" />
          刷新
        </el-button>
      </div>
    </section>

    <section class="analysis-layout">
      <main class="content-card main-panel">
        <div v-if="loading" class="state-wrap">
          <AppState type="loading" title="正在读取岗位分析结果" description="正在同步岗位信息和分析结果。" />
        </div>

        <div v-else-if="loadError" class="state-wrap">
          <AppState type="error" title="岗位分析加载失败" :description="loadError">
            <el-button type="primary" @click="loadAll">重新加载</el-button>
          </AppState>
        </div>

        <div v-else-if="!target" class="state-wrap">
          <AppState type="error" title="岗位目标不存在" description="当前路由没有可用岗位目标，请返回列表重新选择。" />
        </div>

        <div v-else class="content-card__body analysis-workspace">
          <el-alert
            v-if="partialLoadWarning"
            type="warning"
            show-icon
            :closable="false"
            title="岗位分析结果暂时不可用"
            :description="partialLoadWarning"
          />

          <el-tabs v-model="activeSection" class="analysis-tabs">
            <el-tab-pane label="概览" name="overview">
              <section class="overview-pane">
                <header class="overview-context">
                  <div>
                    <span class="overview-kicker">当前岗位</span>
                    <h2>{{ target.jobTitle }}</h2>
                    <p>{{ targetSubtitle }} · {{ target.jdSource || '未标注来源' }}</p>
                  </div>
                  <JobTargetStatusTag :status="displayParseStatus" />
                </header>

                <section class="overview-conclusion">
                  <span class="overview-kicker">关键结论</span>
                  <template v-if="hasStructuredAnalysis(analysis)">
                    <p>{{ overviewSummary }}</p>
                    <div v-if="overviewSkillItems.length" class="overview-skills">
                      <span v-for="item in overviewSkillItems" :key="item">{{ item }}</span>
                    </div>
                  </template>
                  <p v-else>{{ analysisEmptyStateDescription }}</p>
                </section>

                <section class="overview-next">
                  <div>
                    <span class="overview-kicker">下一步</span>
                    <h3>{{ primaryActionTitle }}</h3>
                    <p>{{ primaryActionDescription }}</p>
                  </div>
                  <el-button
                    v-if="primaryAction === 'edit'"
                    type="primary"
                    @click="router.push(`/job-targets/${target.id}/edit`)"
                  >
                    <Pencil :size="16" />
                    编辑岗位目标
                  </el-button>
                  <el-button
                    v-else-if="primaryAction === 'parse'"
                    type="primary"
                    :loading="parsing"
                    :disabled="target.parseStatus === 'PARSING'"
                    @click="handleParse"
                  >
                    <Sparkles :size="16" />
                    {{ analysis ? '重新分析岗位描述' : '分析岗位描述' }}
                  </el-button>
                  <el-button v-else-if="primaryAction === 'task'" type="primary" @click="goTaskCenter">
                    查看任务
                  </el-button>
                  <el-button v-else type="primary" @click="goResumeMatch">
                    <Files :size="16" />
                    进入简历匹配
                  </el-button>
                </section>

                <div v-if="hasStructuredAnalysis(analysis)" class="overview-secondary">
                  <span>已完成岗位分析</span>
                  <el-button plain @click="goApplicationPackage">
                    <PackageCheck :size="16" />
                    生成投递包
                  </el-button>
                </div>
              </section>
            </el-tab-pane>

            <el-tab-pane label="完整 JD" name="jd">
              <section class="tab-section jd-preview">
                <div class="section-head">
                  <div>
                    <h2>完整岗位描述</h2>
                    <p>重新分析会基于这段内容生成结构化信息。</p>
                  </div>
                  <el-button @click="router.push(`/job-targets/${target.id}/edit`)">
                    <Pencil :size="16" />
                    编辑岗位
                  </el-button>
                </div>
                <pre v-if="target.jdText">{{ target.jdText }}</pre>
                <AppState
                  v-else
                  type="empty"
                  title="岗位描述为空"
                  description="请先编辑岗位目标补充岗位描述，再触发分析。"
                >
                  <el-button type="primary" @click="router.push(`/job-targets/${target.id}/edit`)">编辑岗位目标</el-button>
                </AppState>
              </section>
            </el-tab-pane>

            <el-tab-pane label="深度分析" name="analysis">
              <section class="tab-section">
                <div class="section-head">
                  <div>
                    <h2>全量结构化分析</h2>
                    <p>职责、技能、关键词、经验要求和技能权重。</p>
                  </div>
                  <el-button
                    :loading="parsing"
                    :disabled="!target.jdText || target.parseStatus === 'PARSING'"
                    @click="handleParse"
                  >
                    <Sparkles :size="16" />
                    {{ analysis ? '重新分析' : '分析岗位描述' }}
                  </el-button>
                </div>

                <AppState
                  v-if="!analysis"
                  :type="analysisEmptyStateType"
                  :title="analysisEmptyStateTitle"
                  :description="analysisEmptyStateDescription"
                >
                  <el-button type="primary" :loading="parsing" :disabled="!target.jdText" @click="handleParse">触发分析</el-button>
                </AppState>

                <JobTargetAnalysisPanel v-else :analysis="analysis" />
              </section>
            </el-tab-pane>

            <el-tab-pane label="证据矩阵" name="evidence">
              <section class="tab-section">
                <div class="section-head">
                  <div>
                    <h2>岗位证据矩阵</h2>
                    <p>按岗位要求核对现有证据与投递准备度。</p>
                  </div>
                </div>
                <JobRequirementEvidenceMatrix
                  :target-job-id="target.id"
                  :matrix="requirementMatrix"
                  :readiness="readinessSnapshot"
                  :readiness-history="readinessHistory"
                  :selected-snapshot-id="readinessSnapshot?.id"
                  :snapshot-loading-id="readinessSnapshotLoadingId"
                  :loading="requirementLoading"
                  :refreshing="requirementRefreshing"
                  :error="requirementError"
                  @refresh="refreshRequirementInsights"
                  @action="handleRequirementAction"
                  @select-snapshot="selectReadinessSnapshot"
                />
              </section>
            </el-tab-pane>
          </el-tabs>
        </div>
      </main>

      <aside class="content-card side-panel">
        <div class="content-card__body">
          <div class="status-panel__head">
            <div>
              <span class="overview-kicker">分析状态</span>
              <strong>{{ formatDateTime(target?.updatedAt || analysis?.updatedAt) }}</strong>
            </div>
            <JobTargetStatusTag :status="displayParseStatus" />
          </div>

          <div v-if="parseTaskVisible" class="parse-task-progress">
            <div class="parse-task-progress__head">
              <span class="cc-badge" :class="parseTaskBadgeClass(parseSseStatus)">
                <i class="cc-badge__dot" />
                {{ parseTaskStatusLabel(parseSseStatus) }}
              </span>
              <strong>{{ latestParseSseMessage }}</strong>
            </div>
            <el-button text type="primary" @click="goTaskCenter">查看任务</el-button>
          </div>

          <details v-if="parseTaskVisible" class="parse-task-diagnostics">
            <summary>查看任务诊断</summary>
            <p v-if="parseSseError">{{ parseSseError }}</p>
            <div v-if="parseRecoveryVisible" class="parse-task-progress__recovery">
              <span>{{ parseRecoveryHint }}</span>
              <el-button text type="primary" :loading="loading" @click="refreshAnalysisAfterInterrupt">
                刷新分析结果
              </el-button>
            </div>
            <div v-if="parseTaskDiagnostics.length" class="parse-task-progress__diagnostics">
              <span v-for="item in parseTaskDiagnostics" :key="item">{{ item }}</span>
            </div>
            <div v-if="recentParseSseEvents.length" class="sse-progress__events">
              <span v-for="item in recentParseSseEvents" :key="item.key">
                {{ parseSseEventText(item) }}
              </span>
            </div>
          </details>

          <el-alert
            v-if="target?.parseErrorMessage || analysis?.parseErrorMessage"
            class="side-alert"
            type="error"
            :closable="false"
            show-icon
            title="岗位分析失败"
            :description="toFriendlyMessage(target?.parseErrorMessage || analysis?.parseErrorMessage, '岗位描述解析没有成功，请补充岗位描述内容或稍后重试。')"
          />
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, Files, PackageCheck, Pencil, RefreshCw, ScanSearch, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getJobDescriptionAnalysisApi,
  getJobTargetDetailApi,
  parseJobDescriptionApi,
  submitJobDescriptionParseTaskApi,
  streamJobDescriptionParseApi
} from '@/api/jobTarget'
import {
  getJobRequirementMatrixApi,
  getJobReadinessHistoryApi,
  getJobReadinessSnapshotApi,
  getLatestJobReadinessApi,
  materializeJobRequirementsApi,
  recalculateJobReadinessApi,
  refreshJobRequirementMatrixApi
} from '@/api/jobRequirement'
import AppState from '@/components/common/AppState.vue'
import { useSseState } from '@/composables/useSseState'
import {
  normalizeJobReadiness,
  normalizeJobRequirementMatrix
} from '@/features/job-requirement-matrix'
import { resolveSafeActionPath } from '@/features/job-readiness/readiness'
import type {
  JobReadinessSnapshotVO,
  JobRequirementActionVO,
  JobRequirementMatrixVO
} from '@/types/jobRequirement'
import type {
  JobDescriptionAnalysisVO,
  JobDescriptionParseDTO,
  JobTargetParseSseEvent,
  JobTargetParseSseEventType,
  TargetJobVO
} from '@/types/jobTarget'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import type { StreamSseHandle } from '@/utils/sse'

import JobTargetAnalysisPanel from './components/JobTargetAnalysisPanel.vue'
import JobRequirementEvidenceMatrix from './components/JobRequirementEvidenceMatrix.vue'
import JobTargetStatusTag from './components/JobTargetStatusTag.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const parsing = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
type AnalysisSection = 'overview' | 'jd' | 'analysis' | 'evidence'
const activeSection = ref<AnalysisSection>('overview')
const target = ref<TargetJobVO | null>(null)
const analysis = ref<JobDescriptionAnalysisVO | null>(null)
const requirementMatrix = ref<JobRequirementMatrixVO | null>(null)
const readinessSnapshot = ref<JobReadinessSnapshotVO | null>(null)
const readinessHistory = ref<JobReadinessSnapshotVO[]>([])
const readinessSnapshotLoadingId = ref<number | null>(null)
const requirementLoading = ref(false)
const requirementRefreshing = ref(false)
const requirementError = ref('')
let readinessSnapshotRequestVersion = 0
const JOB_TARGET_PARSE_TASK_BIZ_TYPE = 'job-target.parse'
const {
  status: parseSseStatus,
  error: parseSseError,
  events: parseSseEvents,
  reset: resetParseSse,
  setConnecting: setParseSseConnecting,
  setDone: setParseSseDone,
  setError: setParseSseError,
  addEvent: addParseSseEvent
} = useSseState()
let parseSseHandle: StreamSseHandle | null = null
let parsePollTimer: ReturnType<typeof window.setTimeout> | null = null
let parsePollAttempts = 0
const MAX_PARSE_POLL_ATTEMPTS = 10

const targetId = computed(() => {
  const raw = route.params.id
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(id) && id > 0 ? id : null
})

const targetSubtitle = computed(() => {
  if (!target.value) return '读取岗位详情后展示岗位描述、分析状态和结构化分析结果。'
  return `${target.value.companyName || '--'} · ${target.value.jobLevel || '--'}`
})
const recentParseSseEvents = computed(() => parseSseEvents.value.slice(-3))
const currentParseStatus = computed(() => String(analysis.value?.parseStatus || target.value?.parseStatus || '').toUpperCase())
const displayParseStatus = computed(() => {
  if (hasStructuredAnalysis(analysis.value)) return 'PARSED'
  return currentParseStatus.value || target.value?.parseStatus || analysis.value?.parseStatus
})
const targetHasRecoverableParseStatus = computed(() => ['PARSING', 'FAILED'].includes(currentParseStatus.value))
const shouldAutoPollParse = computed(() => {
  if (!target.value || parsing.value) return false
  if (hasStructuredAnalysis(analysis.value)) return false
  if (currentParseStatus.value === 'FAILED') return false
  return currentParseStatus.value === 'PARSING' || Boolean(analysis.value?.asyncMessageId || analysis.value?.asyncTraceId)
})
const analysisEmptyStateType = computed(() => shouldAutoPollParse.value ? 'loading' : 'empty')
const analysisEmptyStateTitle = computed(() =>
  shouldAutoPollParse.value ? '岗位分析正在生成' : '暂无岗位分析结果'
)
const analysisEmptyStateDescription = computed(() =>
  shouldAutoPollParse.value
    ? '系统已提交岗位分析任务，页面会自动刷新结果；也可以去任务中心查看进度。'
    : '当前还没有分析结果，可以先触发分析。'
)
const overviewSummary = computed(() => (
  analysis.value?.summary
  || target.value?.analysisSummary
  || '已完成结构化提取，可进入深度分析查看职责、技能和经验要求。'
))
const overviewSkillItems = computed(() => toDisplayItems(
  analysis.value?.requiredSkills || target.value?.requiredSkills
).slice(0, 6))
const primaryAction = computed<'edit' | 'parse' | 'task' | 'match'>(() => {
  if (!target.value?.jdText) return 'edit'
  if (hasStructuredAnalysis(analysis.value)) return 'match'
  if (shouldAutoPollParse.value || target.value.parseStatus === 'PARSING') return 'task'
  return 'parse'
})
const primaryActionTitle = computed(() => {
  const titles = {
    edit: '补充岗位描述',
    parse: '生成岗位分析',
    task: '跟进分析任务',
    match: '开始简历匹配'
  }
  return titles[primaryAction.value]
})
const primaryActionDescription = computed(() => {
  const descriptions = {
    edit: '先补齐完整 JD，才能生成可靠的岗位要求和后续准备建议。',
    parse: '基于当前 JD 提取岗位要求、技能重点和面试关注点。',
    task: '分析正在处理中，任务中心会保留完整处理状态。',
    match: '将当前岗位要求与一份简历对账，定位覆盖项和缺口。'
  }
  return descriptions[primaryAction.value]
})
const parseTaskDiagnostics = computed(() => {
  const result = analysis.value
  const items: string[] = []
  if (result?.asyncMessageId) items.push('处理进度已提交')
  if (result?.asyncTraceId) items.push('处理线索已记录')
  if (result?.asyncBizType || result?.asyncBizId) {
    items.push('岗位分析记录已保存')
  } else if (targetHasRecoverableParseStatus.value && target.value?.id) {
    items.push('岗位分析记录已保存')
  }
  if (result?.asyncSendStatus) items.push(parseSubmitStatusText(result.asyncSendStatus))
  return items
})

const parseSubmitStatusText = (status?: string | null) => {
  const normalized = String(status || '').trim().toUpperCase()
  if (!normalized) return '提交进度待更新'
  const map: Record<string, string> = {
    SENT: '处理请求已提交',
    SUCCESS: '处理请求已提交',
    SUBMITTED: '处理请求已提交',
    PENDING: '等待提交处理',
    WAITING: '等待提交处理',
    PROCESSING: '正在提交处理',
    SENDING: '正在提交处理',
    FAILED: '提交处理失败',
    ERROR: '提交处理失败'
  }
  return map[normalized] || '提交进度已更新'
}
const parseTaskVisible = computed(() => (
  parseSseStatus.value !== 'idle'
  || parseSseEvents.value.length > 0
  || parseTaskDiagnostics.value.length > 0
  || targetHasRecoverableParseStatus.value
))
const parseRecoveryVisible = computed(() => parseSseStatus.value === 'error' && !parsing.value)
const parseRecoveryHint = computed(() => (
  hasParseTaskReceipt(analysis.value)
    ? '处理记录已保留，也可以刷新分析结果确认结构化分析是否已经落库。'
    : '如果分析结果已经落库，刷新后可继续查看；没有新结果时再重新提交分析。'
))
const latestParseSseMessage = computed(() => {
  const recent = recentParseSseEvents.value
  const latest = recent[recent.length - 1]
  if (latest?.message) return latest.message
  if (analysis.value?.asyncMessageId) return '岗位分析已提交，可以离开页面，稍后回到任务中心查看。'
  if (currentParseStatus.value === 'PARSING') return '岗位分析正在生成中，可以离开页面，稍后在任务中心查看。'
  if (currentParseStatus.value === 'FAILED') return '岗位分析失败，失败原因已保留，可以重新分析或到任务中心按分析记录查看。'
  return '正在获取岗位分析进度'
})

const compactRouteQuery = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => Boolean(value))) as Record<string, string>

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const stringifyDisplayItem = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const record = asRecord(value)
  if (!record || Array.isArray(value)) return ''
  const preferred = ['name', 'skill', 'label', 'title', 'description', 'requirement', 'point']
  const text = preferred.map((key) => record[key]).find((item) => typeof item === 'string')
  if (typeof text === 'string') return text
  return Object.entries(record)
    .map(([key, item]) => `${key}: ${stringifyDisplayItem(item)}`)
    .join(' / ')
}

const toDisplayItems = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.map(stringifyDisplayItem).filter(Boolean)
  const record = asRecord(value)
  if (record) return Object.entries(record).map(([key, item]) => `${key}: ${stringifyDisplayItem(item)}`)
  const text = stringifyDisplayItem(value)
  return text ? [text] : []
}

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

const firstParseStatus = (...values: unknown[]) => {
  const status = firstText(...values)
  return status || undefined
}

const hasParseTaskReceipt = (result?: JobDescriptionAnalysisVO | null) => Boolean(
  result?.asyncMessageId
  || result?.asyncTraceId
  || result?.asyncBizType
  || result?.asyncBizId
  || result?.parseStatus === 'PARSING'
)

const hasStructuredAnalysis = (result?: JobDescriptionAnalysisVO | null) => Boolean(
  result?.parseStatus === 'PARSED'
  || result?.summary
  || result?.responsibilities
  || result?.requiredSkills
  || result?.interviewFocusPoints
  || result?.techStackKeywords
  || result?.businessKeywords
)

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === 'fulfilled'

const stopParsePolling = (reset = true) => {
  if (parsePollTimer) {
    window.clearTimeout(parsePollTimer)
    parsePollTimer = null
  }
  if (reset) {
    parsePollAttempts = 0
  }
}

const scheduleParsePolling = () => {
  if (parsePollTimer || parsePollAttempts >= MAX_PARSE_POLL_ATTEMPTS) return
  parsePollTimer = window.setTimeout(() => {
    parsePollTimer = null
    parsePollAttempts += 1
    void loadAll(true)
  }, 4000)
}

const syncParsePollingState = () => {
  if (shouldAutoPollParse.value) {
    scheduleParsePolling()
    return
  }
  stopParsePolling()
}

const loadAll = async (silent = false) => {
  if (!targetId.value) {
    loadError.value = '岗位目标链接不完整，请从岗位目标列表重新进入。'
    return
  }
  if (!silent) {
    loading.value = true
    loadError.value = ''
    partialLoadWarning.value = ''
  }
  try {
    const [detailResult, analysisResult] = await Promise.allSettled([
      getJobTargetDetailApi(targetId.value),
      getJobDescriptionAnalysisApi(targetId.value)
    ])

    if (!isFulfilled(detailResult)) {
      if (!silent) {
        target.value = null
        analysis.value = null
        loadError.value = getErrorMessage(detailResult.reason, '岗位目标暂时无法加载，请确认登录状态后重试。')
      }
      return
    }

    target.value = detailResult.value
    if (isFulfilled(analysisResult)) {
      if (analysisResult.value) {
        captureParseTaskReceipt(analysisResult.value)
      } else if (!hasParseTaskReceipt(analysis.value)) {
        analysis.value = null
      }
    } else {
      if (!silent) {
        partialLoadWarning.value = getErrorMessage(analysisResult.reason, '岗位分析结果暂时无法加载；岗位描述仍可查看，也可以重新分析。')
      }
      if (!hasParseTaskReceipt(analysis.value)) {
        analysis.value = null
      }
    }
  } catch (error) {
    if (!silent) {
      target.value = null
      analysis.value = null
      loadError.value = getErrorMessage(error, '岗位分析暂时无法加载，请确认登录状态后重试。')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
    syncParsePollingState()
  }
}

const loadRequirementInsights = async (silent = false) => {
  const id = targetId.value
  readinessSnapshotRequestVersion += 1
  readinessSnapshotLoadingId.value = null
  if (!id || !hasStructuredAnalysis(analysis.value)) {
    requirementMatrix.value = null
    readinessSnapshot.value = null
    readinessHistory.value = []
    requirementError.value = ''
    return
  }
  if (!silent) {
    requirementLoading.value = true
    requirementError.value = ''
  }
  const [matrixResult, readinessResult, historyResult] = await Promise.allSettled([
    getJobRequirementMatrixApi(id),
    getLatestJobReadinessApi(id),
    getJobReadinessHistoryApi(id)
  ])
  if (isFulfilled(matrixResult)) {
    requirementMatrix.value = normalizeJobRequirementMatrix(matrixResult.value, id)
  } else if (!silent) {
    requirementMatrix.value = null
    requirementError.value = getErrorMessage(
      matrixResult.reason,
      '岗位证据矩阵暂时无法加载；原岗位分析不受影响。'
    )
  }
  if (isFulfilled(readinessResult)) {
    readinessSnapshot.value = normalizeJobReadiness(readinessResult.value, id)
  } else {
    readinessSnapshot.value = null
  }
  if (isFulfilled(historyResult)) {
    readinessHistory.value = (historyResult.value || [])
      .map((item) => normalizeJobReadiness(item, id))
      .filter((item): item is JobReadinessSnapshotVO => Boolean(item))
  } else if (!silent) {
    readinessHistory.value = readinessSnapshot.value ? [readinessSnapshot.value] : []
  }
  if (!silent) requirementLoading.value = false
}

const selectReadinessSnapshot = async (snapshotId: number) => {
  const id = targetId.value
  if (!id || readinessSnapshotLoadingId.value != null || readinessSnapshot.value?.id === snapshotId) return

  const requestVersion = ++readinessSnapshotRequestVersion
  readinessSnapshotLoadingId.value = snapshotId
  try {
    const detail = await getJobReadinessSnapshotApi(id, snapshotId)
    if (requestVersion !== readinessSnapshotRequestVersion || targetId.value !== id) return

    const normalized = normalizeJobReadiness(detail, id)
    if (!normalized) throw new Error('readiness snapshot detail is empty')
    readinessSnapshot.value = normalized
  } catch (error) {
    if (requestVersion === readinessSnapshotRequestVersion && targetId.value === id) {
      ElMessage.error(getErrorMessage(error, '就绪度快照详情暂时无法加载，请稍后重试。'))
    }
  } finally {
    if (requestVersion === readinessSnapshotRequestVersion) {
      readinessSnapshotLoadingId.value = null
    }
  }
}

const refreshRequirementInsights = async () => {
  const id = targetId.value
  if (!id) return
  requirementRefreshing.value = true
  requirementError.value = ''
  try {
    await materializeJobRequirementsApi(id)
    await refreshJobRequirementMatrixApi(id)
    try {
      await recalculateJobReadinessApi(id)
    } catch {
      // Evidence matrix remains useful while readiness is unavailable or still collecting samples.
    }
    await loadRequirementInsights()
    if (!requirementError.value) ElMessage.success('岗位要求和证据已刷新')
  } catch (error) {
    requirementError.value = getErrorMessage(error, '岗位证据刷新失败，请稍后重试。')
    ElMessage.error(requirementError.value)
  } finally {
    requirementRefreshing.value = false
  }
}

const loadRequirementInsightsForActiveTab = async (silent = false) => {
  if (activeSection.value !== 'evidence') return
  await loadRequirementInsights(silent)
}

const handleRequirementAction = (action: JobRequirementActionVO) => {
  if (!action.actionUrl) {
    ElMessage.info(action.description || '该行动暂时没有可用入口。')
    return
  }
  const resolved = resolveSafeActionPath(action.actionUrl)
  if (resolved.unavailableReason) {
    ElMessage.warning(resolved.unavailableReason)
  }
  router.push(resolved.path)
}

const refreshAnalysisAfterInterrupt = async () => {
  const hadStructuredAnalysis = hasStructuredAnalysis(analysis.value)
  await loadAll()
  await loadRequirementInsightsForActiveTab(true)
  if (loadError.value) {
    ElMessage.error(loadError.value)
    return
  }
  if (hasStructuredAnalysis(analysis.value) && !hadStructuredAnalysis) {
    ElMessage.success('岗位分析结果已刷新，可以继续查看。')
    return
  }
  if (hasStructuredAnalysis(analysis.value)) {
    ElMessage.success('岗位分析结果已刷新。')
    return
  }
  ElMessage.info('暂未发现新的分析结果，可以稍后刷新或重新提交分析。')
}

const mergeAnalysisReceipt = (next: JobDescriptionAnalysisVO): JobDescriptionAnalysisVO => {
  const current = analysis.value
  if (!current || current.targetJobId !== next.targetJobId) return next
  return {
    ...next,
    asyncMessageId: next.asyncMessageId || current.asyncMessageId,
    asyncTraceId: next.asyncTraceId || current.asyncTraceId,
    asyncBizType: next.asyncBizType || current.asyncBizType,
    asyncBizId: next.asyncBizId || current.asyncBizId,
    asyncSendStatus: next.asyncSendStatus || current.asyncSendStatus
  }
}

const captureParseTaskReceipt = (...sources: unknown[]) => {
  const id = targetId.value
  if (!id) return
  const records = sources.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item))
  if (!records.length) return

  const resultRecord = asRecord(records.find((item) => asRecord(item.result))?.result)
  const metadataRecord = asRecord(records.find((item) => asRecord(item.metadata))?.metadata)
  const flatRecords = [...records, resultRecord, metadataRecord].filter((item): item is Record<string, unknown> => Boolean(item))
  const directAnalysisRecord = records.find((item) => 'targetJobId' in item) as Partial<JobDescriptionAnalysisVO> | undefined
  const currentAnalysis = analysis.value?.targetJobId === id ? analysis.value : null
  const next: JobDescriptionAnalysisVO = {
    ...(currentAnalysis || {}),
    ...(resultRecord || {}),
    ...(directAnalysisRecord || {}),
    targetJobId: id,
    asyncMessageId: firstText(...flatRecords.flatMap((item) => [item.asyncMessageId, item.messageId])),
    asyncTraceId: firstText(...flatRecords.flatMap((item) => [item.asyncTraceId, item.traceId, item.requestId])),
    asyncBizType: firstText(...flatRecords.flatMap((item) => [item.asyncBizType, item.bizType])) || JOB_TARGET_PARSE_TASK_BIZ_TYPE,
    asyncBizId: firstText(...flatRecords.flatMap((item) => [item.asyncBizId, item.bizId])) || String(id),
    asyncSendStatus: firstText(...flatRecords.flatMap((item) => [item.asyncSendStatus, item.sendStatus])),
    parseStatus: firstParseStatus(...flatRecords.flatMap((item) => [item.parseStatus, item.status]))
  }
  analysis.value = mergeAnalysisReceipt(next)
}

const parseTaskStatusLabel = (status: string) => {
  if (status === 'connecting') return '提交中'
  if (status === 'streaming') return '分析中'
  if (status === 'done') return '已完成'
  if (status === 'error') return '失败'
  if (currentParseStatus.value === 'FAILED') return '失败'
  if (analysis.value?.asyncMessageId || currentParseStatus.value === 'PARSING') return '已入队'
  return '待开始'
}

const parseSseEventText = (item: { message?: string; event?: string }) => (
  item.message || parseTaskStatusLabel(item.event || '') || '处理进度已更新'
)

const parseTaskBadgeClass = (status: string) => {
  if (status === 'connecting') return 'cc-badge--thinking'
  if (status === 'streaming') return 'cc-badge--streaming'
  if (status === 'done') return 'cc-badge--success'
  if (status === 'error') return 'cc-badge--danger'
  if (currentParseStatus.value === 'FAILED') return 'cc-badge--danger'
  if (currentParseStatus.value === 'PARSING') return 'cc-badge--warning'
  return 'cc-badge--idle'
}

const stopParseSse = () => {
  parseSseHandle?.abort()
  parseSseHandle = null
}

const runParseFallback = async (id: number, payload: JobDescriptionParseDTO) => {
  try {
    captureParseTaskReceipt(await parseJobDescriptionApi(id, payload))
    setParseSseDone()
    ElMessage.success(analysis.value?.parseStatus === 'FAILED' ? '岗位分析已返回失败状态' : '岗位分析已完成')
    await loadAll()
    await loadRequirementInsightsForActiveTab(true)
  } catch (error) {
    const message = getErrorMessage(error, '岗位分析失败，请稍后重试。')
    setParseSseError(message)
    ElMessage.error(message)
  } finally {
    parsing.value = false
  }
}

const applyParseSseEvent = (event: JobTargetParseSseEventType, data?: JobTargetParseSseEvent) => {
  const message = toFriendlyMessage(data?.message || data?.content || data?.stage, parseTaskStatusLabel(event))
  addParseSseEvent(event, message)
  captureParseTaskReceipt(data, data?.result, data?.metadata)
  if (event === 'done') {
    setParseSseDone()
  }
}

const startParseSse = (id: number, payload: JobDescriptionParseDTO) => {
  stopParsePolling()
  stopParseSse()
  resetParseSse()
  setParseSseConnecting()
  parsing.value = true
  parseSseHandle = streamJobDescriptionParseApi(
    id,
    payload,
    {
      onEvent: applyParseSseEvent,
      onError: (error, hasStarted) => {
        parseSseHandle = null
        if (!hasStarted) {
          addParseSseEvent('fallback', '进度连接暂时不稳定，系统会继续完成分析')
          ElMessage.warning('岗位分析进度暂时无法实时显示，系统会继续完成分析')
          void runParseFallback(id, payload)
          return
        }
        parsing.value = false
        const message = getErrorMessage(error, '岗位分析生成进度中断，可以刷新分析结果；如果处理记录已出现，也可以到任务中心查看。')
        setParseSseError(message, true)
        ElMessage.error(message)
        void loadAll()
      },
      onDone: () => {
        parseSseHandle = null
        parsing.value = false
        if (parseSseStatus.value === 'error') return
        setParseSseDone()
        void loadAll()
          .then(() => loadRequirementInsightsForActiveTab(true))
          .then(() => ElMessage.success('岗位分析已完成'))
      }
    }
  )
  void parseSseHandle.finished.catch(() => undefined)
}

const submitParseTask = async (id: number, payload: JobDescriptionParseDTO) => {
  stopParsePolling()
  stopParseSse()
  resetParseSse()
  setParseSseConnecting()
  parsing.value = true
  try {
    captureParseTaskReceipt(await submitJobDescriptionParseTaskApi(id, payload))
    setParseSseDone()
    if (analysis.value?.asyncMessageId || analysis.value?.parseStatus === 'PARSING') {
      ElMessage.success('岗位分析已提交，可以稍后在任务中心查看')
    } else {
      ElMessage.success(analysis.value?.parseStatus === 'FAILED' ? '岗位分析已返回失败状态' : '岗位分析已完成')
    }
    await loadAll()
    await loadRequirementInsightsForActiveTab(true)
  } catch (error) {
    addParseSseEvent('fallback', '任务提交暂时失败，已尝试继续分析')
    ElMessage.warning(getErrorMessage(error, '岗位分析提交暂时失败，已尝试继续处理。'))
    startParseSse(id, payload)
  } finally {
    if (!parseSseHandle) {
      parsing.value = false
    }
  }
}

const handleParse = async () => {
  if (!target.value) return
  if (!target.value.jdText) {
    ElMessage.warning('请先编辑岗位目标补充岗位描述。')
    return
  }
  const forceRefresh = Boolean(analysis.value || target.value.parseStatus === 'PARSED')
  if (forceRefresh) {
    const confirmed = await confirmDangerActionPreview({
      title: '重新分析岗位描述',
      action: '重新分析当前岗位描述并刷新分析结果',
      target: target.value.jobTitle || target.value.companyName || '当前岗位目标',
      impact: '会刷新当前岗位分析结果，后续能力画像、推荐题、简历匹配和今日计划可能跟随新的分析结果变化。',
      rollback: '旧分析结果不会自动恢复；如新结果不合适，可以再次编辑岗位描述后重新分析。',
      audit: '系统会保存处理记录，便于在任务中心查看进度。',
      tips: ['确认岗位描述已经更新到最新版本。', '确认可以接受基于新分析结果刷新后续推荐。'],
      confirmButtonText: '重新分析'
    })
    if (!confirmed) return
  }
  void submitParseTask(target.value.id, { forceRefresh })
}

const goTaskCenter = () => {
  const query = compactRouteQuery({
    messageId: analysis.value?.asyncMessageId || undefined,
    traceId: analysis.value?.asyncTraceId || undefined,
    bizType: analysis.value?.asyncBizType || JOB_TARGET_PARSE_TASK_BIZ_TYPE,
    bizId: analysis.value?.asyncBizId || (targetId.value ? String(targetId.value) : undefined)
  })
  router.push({ path: '/agent/tasks', query })
}

const goResumeMatch = () => {
  if (!targetId.value) return
  router.push({
    path: '/resume-match',
    query: {
      targetJobId: String(targetId.value)
    }
  })
}

const goApplicationPackage = () => {
  if (!targetId.value) return
  router.push({
    path: '/application-packages/preview',
    query: compactRouteQuery({
      targetJobId: String(targetId.value),
      jdAnalysisId: analysis.value?.id ? String(analysis.value.id) : undefined,
      jobTitle: target.value?.jobTitle || undefined,
      companyName: target.value?.companyName || undefined,
      jdSource: target.value?.jdSource || undefined
    })
  })
}

watch(
  () => route.params.id,
  () => {
    stopParsePolling()
    activeSection.value = 'overview'
    void loadAll().then(() => loadRequirementInsightsForActiveTab())
  }
)

watch(activeSection, (section) => {
  if (section === 'evidence') {
    void loadRequirementInsights()
  }
})

onMounted(async () => {
  await loadAll()
})
onBeforeUnmount(() => {
  stopParseSse()
  stopParsePolling()
})
</script>

<style scoped lang="scss">
.job-analysis-page {
  gap: 16px;
  color: var(--arena-ink);
}

.analysis-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
}

.hero-kicker,
.hero-actions,
.section-head {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 700;
}

.analysis-hero h1 {
  margin: 8px 0 0;
  color: var(--arena-ink);
  font-size: 28px;
}

.analysis-hero p {
  margin: 8px 0 0;
  color: var(--arena-sub);
  line-height: 1.7;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 280px);
  align-items: start;
  gap: 16px;
}

.side-panel,
.main-panel {
  min-width: 0;
}

.side-panel {
  align-self: start;
  border-color: var(--arena-line);
}

.side-alert {
  margin-top: 16px;
}

.status-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    margin-top: 6px;
    color: var(--arena-sub);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
  }
}

.overview-kicker {
  display: block;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 700;
}

.parse-task-progress {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--arena-grn-soft);

  p {
    margin: 0;
    color: var(--arena-red);
    font-size: 12px;
    line-height: 1.5;
  }
}

.parse-task-progress__head {
  strong {
    display: block;
    margin-top: 8px;
    color: var(--arena-ink);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
  }
}

.parse-task-diagnostics {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--arena-line);

  summary {
    color: var(--arena-sub);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }

  > p {
    margin: 12px 0 0;
    color: var(--arena-red);
    font-size: 12px;
    line-height: 1.6;
  }
}

.parse-task-progress__diagnostics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;

  span {
    min-width: 0;
    max-width: 100%;
    padding: 4px 8px;
    border: 1px dashed var(--arena-line);
    border-radius: 6px;
    color: var(--arena-sub);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.parse-task-progress__recovery {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px dashed var(--arena-grn);
  border-radius: 8px;
  background: var(--arena-grn-soft);
  color: var(--arena-sub);
  font-size: 12px;
  line-height: 1.5;
}

.sse-progress__events {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;

  span {
    max-width: 100%;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--arena-line2);
    color: var(--arena-sub);
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.state-wrap {
  padding: 20px;
}

.analysis-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.analysis-tabs {
  :deep(.el-tabs__header) {
    margin: 0 0 20px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    background: var(--arena-line);
  }

  :deep(.el-tabs__item) {
    height: 38px;
    color: var(--arena-sub);
    font-weight: 600;
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--arena-grn-d);
  }

  :deep(.el-tabs__active-bar) {
    background: var(--arena-grn);
  }
}

.overview-pane {
  display: grid;
  gap: 16px;
}

.overview-context,
.overview-conclusion,
.overview-next,
.overview-secondary,
.tab-section {
  min-width: 0;
}

.overview-context {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--arena-line);

  h2 {
    margin: 6px 0 0;
    color: var(--arena-ink);
    font-size: 22px;
  }

  p {
    margin: 6px 0 0;
    color: var(--arena-sub);
    font-size: 13px;
    line-height: 1.6;
  }
}

.overview-conclusion {
  padding: 18px;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--arena-card);

  > p {
    margin: 10px 0 0;
    color: var(--arena-ink);
    line-height: 1.75;
  }
}

.overview-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;

  span {
    max-width: 100%;
    padding: 5px 9px;
    overflow-wrap: anywhere;
    border: 1px solid var(--arena-line);
    border-radius: 999px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-size: 12px;
    font-weight: 600;
  }
}

.overview-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  border: 1.5px solid var(--arena-grn);
  border-radius: 12px;
  background: var(--arena-grn-soft);

  h3 {
    margin: 6px 0 0;
    color: var(--arena-ink);
    font-size: 17px;
  }

  p {
    margin: 6px 0 0;
    color: var(--arena-sub);
    font-size: 13px;
    line-height: 1.6;
  }

  :deep(.el-button--primary) {
    flex: 0 0 auto;
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 3px 0 var(--arena-grn-d);
  }
}

.overview-secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--arena-sub);
  font-size: 13px;
}

.section-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: var(--arena-ink);
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--arena-sub);
    font-size: 13px;
    line-height: 1.6;
  }
}

.jd-preview pre {
  max-height: 320px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: var(--arena-line2);
  color: var(--arena-ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 980px) {
  .analysis-layout {
    grid-template-columns: 1fr;
  }

  .analysis-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-next {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .analysis-hero,
  .overview-conclusion,
  .overview-next {
    padding: 16px;
  }

  .overview-context,
  .overview-secondary {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-next :deep(.el-button) {
    width: 100%;
  }
}
</style>
