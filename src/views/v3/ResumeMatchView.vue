<template>
  <div class="v3-page">
    <section class="page-hero">
      <div class="hero-copy">
        <div class="hero-kicker"><GitCompareArrows :size="16" /> 简历匹配</div>
        <h1>简历岗位匹配</h1>
        <p>把简历证据、岗位风险和训练缺口放在同一张卡里，再决定今天先补优势、风险还是下一步训练。</p>
        <div class="hero-pills">
          <span>优势</span>
          <span>风险</span>
          <span>缺口</span>
          <span>下一步训练</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')"><FileText :size="16" /> 简历中心</el-button>
        <el-button type="primary" @click="router.push('/job-targets')"><Crosshair :size="16" /> 岗位目标</el-button>
      </div>
    </section>

    <section v-if="loadError" class="content-panel">
      <AppState type="error" title="基础数据加载失败" :description="loadError">
        <el-button type="primary" @click="loadInitial">重新加载</el-button>
      </AppState>
    </section>
    <section v-else-if="partialLoadWarning" class="content-panel match-warning">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="部分基础数据暂时不可用"
        :description="partialLoadWarning"
      />
    </section>

    <section class="match-layout">
      <div class="content-panel form-panel" v-loading="loading">
        <div class="section-head">
          <div>
            <h2>发起匹配分析</h2>
            <p>默认带入当前主目标岗位和默认简历，可手动切换，报告会给出后续训练建议。</p>
          </div>
          <el-tag v-if="currentTarget" type="success" effect="plain">当前岗位已读取</el-tag>
        </div>

        <el-form label-position="top">
          <el-form-item label="简历">
            <el-select v-model="form.resumeId" filterable placeholder="选择简历" class="full">
              <el-option
                v-for="resume in resumes"
                :key="resume.id"
                :label="`${resume.resumeName || resume.title || '简历'}${resume.isDefault === 1 ? ' · 默认' : ''}`"
                :value="resume.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="目标岗位">
            <el-select v-model="form.targetJobId" filterable placeholder="选择岗位目标" class="full">
              <el-option
                v-for="target in targets"
                :key="target.id"
                :label="`${target.jobTitle || '未命名岗位'} · ${target.companyName || '--'}`"
                :value="target.id"
              />
            </el-select>
          </el-form-item>
          <el-checkbox v-model="form.forceRefresh">强制重新生成报告</el-checkbox>
          <div class="submit-row">
            <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submitMatch">
              <Sparkles :size="16" /> 提交匹配报告
            </el-button>
            <el-button :loading="loading" @click="loadInitial"><RefreshCw :size="16" /> 刷新数据</el-button>
          </div>
        </el-form>

        <div v-if="matchSseStatus !== 'idle' || matchSseEvents.length" class="match-stream">
          <div class="match-stream__head">
            <span class="cc-badge" :class="sseBadgeClass(matchSseStatus)">
              <i class="cc-badge__dot" />
              {{ sseStatusLabel(matchSseStatus) }}
            </span>
            <strong>{{ latestMatchSseMessage }}</strong>
          </div>
          <p v-if="matchSseError">{{ matchSseError }}</p>
          <div v-if="recentMatchSseEvents.length" class="match-stream__events">
            <span v-for="item in recentMatchSseEvents" :key="item.key">
              {{ matchSseEventText(item) }}
            </span>
          </div>
          <div v-if="matchTaskRoute" class="match-stream__task">
            <span>{{ matchTaskHint }}</span>
            <el-button size="small" text type="primary" @click="goMatchTaskCenter">去任务中心查看</el-button>
          </div>
          <div v-if="matchRecoveryVisible" class="match-stream__recovery">
            <span>{{ matchRecoveryHint }}</span>
            <el-button size="small" text type="primary" :loading="reportsLoading" @click="refreshMatchReportsAfterInterrupt">
              刷新最近报告
            </el-button>
          </div>
        </div>

        <AppState
          v-if="!loading && (!resumes.length || !targets.length)"
          type="empty"
          title="缺少匹配输入"
          :description="!resumes.length ? '还没有可用简历，请先创建或上传简历。' : '还没有目标岗位，请先创建岗位目标并分析岗位描述。'"
        />
      </div>

      <div class="content-panel">
        <div class="section-head">
          <div>
            <h2>最近报告</h2>
            <p>展示最近生成的匹配报告，便于直接回到详情继续训练。</p>
          </div>
          <el-button text :loading="reportsLoading" @click="loadReports">刷新</el-button>
        </div>
        <div v-loading="reportsLoading" class="report-list">
          <AppState v-if="reportsError" type="error" title="匹配报告加载失败" :description="reportsError">
            <el-button type="primary" @click="loadReports">重试</el-button>
          </AppState>
          <AppState v-else-if="!reports.length" type="empty" title="暂无匹配报告" description="提交一次岗位匹配后，这里会显示最新报告。" />
          <button v-for="report in reports" v-else :key="report.reportId" class="report-card" type="button" @click="router.push({ path: `/resume-match/${report.reportId}`, query: { resumeId: report.resumeId, targetJobId: report.targetJobId } })">
            <span>
              <strong>{{ report.jobTitle || '未命名岗位' }}</strong>
              <small>{{ report.resumeTitle || '未命名简历' }} · {{ formatDateTime(report.updatedAt || report.createdAt) }}</small>
              <small v-if="report.status === 'FAILED'" class="report-error">
                {{ toFriendlyMessage(report.errorMessage, '本次报告暂不适合直接继续训练，可进入详情查看处理线索并重新生成。') }}
              </small>
              <small class="report-evidence">
                {{ report.evidenceSummary || '推荐来源待确认' }}
              </small>
              <small v-if="report.schemaWarningCount" class="report-warning">
                {{ report.schemaWarningCount }} 项内容需复核，详情页可查看处理提示
              </small>
            </span>
            <el-tag :type="trustStatusType(report.trustStatus, report.fallback ? 'warning' : statusTag(report.status))" effect="plain">
              {{ trustStatusLabel(report.trustStatus) }}
            </el-tag>
            <b>{{ reportScoreText(report) }}</b>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Crosshair, FileText, GitCompareArrows, RefreshCw, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import { getResumesApi } from '@/api/resume'
import {
  createResumeJobMatchReportApi,
  getResumeJobMatchReportsApi,
  streamCreateResumeJobMatchReportApi
} from '@/api/resumeJobMatch'
import AppState from '@/components/common/AppState.vue'
import { useSseState } from '@/composables/useSseState'
import type { TargetJobVO } from '@/types/jobTarget'
import type { ResumeVO } from '@/types/resume'
import type {
  ResumeJobMatchCreateDTO,
  ResumeJobMatchReportListVO,
  ResumeJobMatchSubmitVO,
  ResumeJobMatchSseEvent,
  ResumeJobMatchSseEventType
} from '@/types/resumeJobMatch'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import type { StreamSseHandle } from '@/utils/sse'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const reportsLoading = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const reportsError = ref('')
const resumes = ref<ResumeVO[]>([])
const targets = ref<TargetJobVO[]>([])
const currentTarget = ref<TargetJobVO | null>(null)
const reports = ref<ResumeJobMatchReportListVO[]>([])
const {
  status: matchSseStatus,
  error: matchSseError,
  events: matchSseEvents,
  reset: resetMatchSse,
  setConnecting: setMatchSseConnecting,
  setDone: setMatchSseDone,
  setError: setMatchSseError,
  addEvent: addMatchSseEvent
} = useSseState()
let matchSseHandle: StreamSseHandle | null = null
let navigatingToReport = false

type MatchTaskSnapshot = {
  messageId?: string
  traceId?: string
  bizType?: string
  bizId?: string
  reportId?: number
}

const RESUME_JOB_MATCH_TASK_BIZ_TYPE = 'resume-job-match.analyze'
const lastMatchTask = ref<MatchTaskSnapshot | null>(null)

const form = reactive({
  resumeId: undefined as number | undefined,
  targetJobId: undefined as number | undefined,
  forceRefresh: false
})

const canSubmit = computed(() => Boolean(form.resumeId && form.targetJobId && !submitting.value))
const recentMatchSseEvents = computed(() => matchSseEvents.value.slice(-3))
const latestMatchSseMessage = computed(() => {
  const recent = recentMatchSseEvents.value
  const latest = recent[recent.length - 1]
  return latest?.message || '正在提交简历岗位匹配任务'
})

const matchSseEventText = (item: { message?: string; event?: string }) => (
  item.message || matchSseStageLabel(item.event) || sseStatusLabel(matchSseStatus.value) || '生成进度已更新'
)

const matchTaskRoute = computed(() => {
  const task = lastMatchTask.value
  if (!task) return null
  const query = compactRouteQuery({
    messageId: task.messageId,
    traceId: task.traceId,
    bizType: task.bizType,
    bizId: task.bizId
  })
  return Object.keys(query).length ? { path: '/agent/tasks', query } : null
})
const matchTaskHint = computed(() => {
  const task = lastMatchTask.value
  if (!task) return ''
  return task.messageId || task.traceId
    ? '已记录处理线索，离开页面后也可以在任务中心继续查看进度。'
    : '已按匹配报告关联任务中心，可稍后查看生成状态和失败原因。'
})
const matchRecoveryVisible = computed(() => matchSseStatus.value === 'error')
const matchRecoveryHint = computed(() =>
  matchTaskRoute.value
    ? '处理线索已保留，也可以刷新最近报告确认报告是否已经落库。'
    : '如果报告已经落库，刷新最近报告后可打开详情查看进度或失败原因；没有新报告时再重新提交。'
)

const compactRouteQuery = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => Boolean(value))) as Record<string, string>

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

const firstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }
  return undefined
}

const isAsyncMatchStatus = (status?: string) => ['PENDING', 'PROCESSING', 'RUNNING'].includes((status || '').toUpperCase())

const captureMatchTask = (...sources: unknown[]) => {
  const records = sources.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item))
  if (!records.length) return

  const messageId = firstText(...records.flatMap((item) => [item.asyncMessageId, item.messageId]))
  const traceId = firstText(...records.flatMap((item) => [item.asyncTraceId, item.traceId]))
  const asyncBizType = firstText(...records.flatMap((item) => [item.asyncBizType, item.bizType]))
  const asyncBizId = firstText(...records.flatMap((item) => [item.asyncBizId, item.bizId]))
  const status = firstText(...records.flatMap((item) => [item.status, item.reportStatus]))
  const reportId = firstNumber(...records.flatMap((item) => [item.reportId, item.id]))
  const hasAsyncIdentifier = Boolean(messageId || traceId || asyncBizType || asyncBizId)

  if (!hasAsyncIdentifier && !isAsyncMatchStatus(status)) return

  const bizId = asyncBizId || (reportId == null ? '' : String(reportId))
  const bizType = asyncBizType || (bizId ? RESUME_JOB_MATCH_TASK_BIZ_TYPE : '')
  if (!messageId && !traceId && !(bizType && bizId)) return

  lastMatchTask.value = {
    messageId: messageId || undefined,
    traceId: traceId || undefined,
    bizType: bizType || undefined,
    bizId: bizId || undefined,
    reportId
  }
}

const statusTag = (status?: string) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'PENDING') return 'warning'
  return 'info'
}

const isReportSuccess = (status?: string) => status === 'SUCCESS'

const trustStatusType = (
  value?: string | null,
  fallback: 'success' | 'warning' | 'info' | 'danger' = 'info'
): 'success' | 'warning' | 'info' | 'danger' => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'VERIFIED') return 'success'
  if (normalized === 'FALLBACK') return 'warning'
  if (normalized === 'PARTIAL') return 'info'
  return fallback
}

const trustStatusLabel = (value?: string | null) => {
  const normalized = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    VERIFIED: '来源已记录',
    PARTIAL: '部分内容待复核',
    FALLBACK: '资料不完整'
  }
  return normalized ? labels[normalized] || '来源待确认' : '来源待确认'
}

const reportScoreText = (report: ResumeJobMatchReportListVO) => {
  if (isReportSuccess(report.status)) return report.overallScore ?? '--'
  if (report.status === 'FAILED') return '重试'
  if (report.status === 'PROCESSING' || report.status === 'PENDING') return '生成中'
  return '--'
}

const matchSseStageLabel = (stage?: string) => {
  const normalized = (stage || '').trim().toUpperCase()
  const labels: Record<string, string> = {
    START: '开始生成',
    VALIDATE_REQUEST: '检查资料',
    REQUEST_VALIDATED: '资料已检查',
    LOAD_RESUME: '读取简历',
    LOAD_TARGET_JOB: '读取岗位',
    CALL_AI: 'AI 正在分析',
    AI_STREAMING: 'AI 生成中',
    PARSE_RESULT: '整理结果',
    SAVE_REPORT: '生成报告',
    DONE: '生成完成',
    ERROR: '生成失败',
    FALLBACK: '继续提交'
  }
  return labels[normalized] || ''
}

const sseStatusLabel = (status: string) => {
  if (status === 'connecting') return '连接中'
  if (status === 'streaming') return '生成中'
  if (status === 'done') return '已提交'
  if (status === 'error') return '失败'
  return '待开始'
}

const sseBadgeClass = (status: string) => {
  if (status === 'connecting') return 'cc-badge--thinking'
  if (status === 'streaming') return 'cc-badge--streaming'
  if (status === 'done') return 'cc-badge--success'
  if (status === 'error') return 'cc-badge--danger'
  return 'cc-badge--idle'
}

const loadInitial = async () => {
  loading.value = true
  loadError.value = ''
  partialLoadWarning.value = ''
  try {
    const [resumeResult, targetResult, currentResult] = await Promise.allSettled([
      getResumesApi({ pageNo: 1, pageSize: 50 }),
      getJobTargetsApi({ pageNo: 1, pageSize: 50 }),
      getCurrentJobTargetApi()
    ])

    const warnings: string[] = []
    if (resumeResult.status === 'fulfilled') {
      resumes.value = Array.isArray(resumeResult.value.records) ? resumeResult.value.records : []
    } else {
      resumes.value = []
      warnings.push(getErrorMessage(resumeResult.reason, '简历列表读取失败'))
    }

    if (targetResult.status === 'fulfilled') {
      targets.value = Array.isArray(targetResult.value) ? targetResult.value : []
    } else {
      targets.value = []
      warnings.push(getErrorMessage(targetResult.reason, '岗位目标读取失败'))
    }

    if (resumeResult.status === 'rejected' && targetResult.status === 'rejected') {
      loadError.value = warnings.join('；') || '读取简历或岗位目标失败，请确认登录状态后重试。'
      return
    }

    if (currentResult.status === 'rejected') {
      warnings.push(getErrorMessage(currentResult.reason, '当前岗位读取失败，已先使用岗位列表中的信息'))
    }

    currentTarget.value = currentResult.status === 'fulfilled' ? currentResult.value || null : null
    form.resumeId = Number(route.query.resumeId) || resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
    form.targetJobId = Number(route.query.targetJobId) || currentTarget.value?.id || targets.value[0]?.id
    partialLoadWarning.value = warnings.filter(Boolean).join('；')
  } catch (error) {
    loadError.value = getErrorMessage(error, '读取简历或岗位目标失败，请确认登录状态后重试。')
  } finally {
    loading.value = false
  }
}

const loadReports = async () => {
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const page = await getResumeJobMatchReportsApi({ pageNo: 1, pageSize: 8 })
    reports.value = page.records || []
  } catch (error) {
    reportsError.value = getErrorMessage(error, '读取匹配报告失败。')
  } finally {
    reportsLoading.value = false
  }
}

const submitMatch = async () => {
  if (!form.resumeId || !form.targetJobId) return
  const payload: ResumeJobMatchCreateDTO = {
    resumeId: form.resumeId,
    targetJobId: form.targetJobId,
    forceRefresh: form.forceRefresh
  }
  startMatchSse(payload)
}

const routeToReport = async (reportId?: number, payload?: ResumeJobMatchCreateDTO) => {
  if (!reportId || !payload || navigatingToReport) return
  navigatingToReport = true
  await router.push({
    path: `/resume-match/${reportId}`,
    query: { resumeId: payload.resumeId, targetJobId: payload.targetJobId }
  })
}

const goMatchTaskCenter = () => {
  const route = matchTaskRoute.value
  if (!route) return
  router.push(route)
}

const refreshMatchReportsAfterInterrupt = async () => {
  await loadReports()
  const relatedReport = reports.value.find((item) =>
    item.resumeId === form.resumeId && item.targetJobId === form.targetJobId
  )
  if (relatedReport) {
    captureMatchTask(relatedReport)
    ElMessage.success('最近报告已刷新，可打开详情继续查看。')
  } else {
    ElMessage.info('暂未发现新的匹配报告，可以稍后再刷新或重新提交。')
  }
}

const runMatchFallback = async (payload: ResumeJobMatchCreateDTO) => {
  submitting.value = true
  try {
    const result = await createResumeJobMatchReportApi(payload)
    captureMatchTask(result)
    setMatchSseDone()
    ElMessage.success(result.status === 'FAILED' ? '本次报告暂不适合直接使用，请查看详情' : '匹配报告任务已提交')
    await routeToReport(result.reportId, payload)
  } catch (error) {
    const message = getErrorMessage(error, '提交匹配报告失败。')
    setMatchSseError(message)
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}

const applyMatchSseEvent = (
  event: ResumeJobMatchSseEventType,
  data: ResumeJobMatchSseEvent | undefined,
  payload: ResumeJobMatchCreateDTO
) => {
  const stageLabel = matchSseStageLabel(data?.stage) || matchSseStageLabel(event)
  const rawMessage = data?.message || data?.content || event
  const message = [stageLabel, toFriendlyMessage(rawMessage, '简历岗位匹配生成中')].filter(Boolean).join('：')
  addMatchSseEvent(event, message)
  const metadata = asRecord(data?.metadata)
  const result = asRecord(data?.result)
  const sseTaskSnapshot: Partial<ResumeJobMatchSubmitVO> = {
    reportId: firstNumber(result?.reportId, data?.bizId, metadata?.reportId),
    status: firstText(result?.status, metadata?.status),
    asyncMessageId: firstText(result?.asyncMessageId, metadata?.asyncMessageId, data?.messageId),
    asyncTraceId: firstText(result?.asyncTraceId, metadata?.asyncTraceId, data?.traceId),
    asyncBizType: firstText(result?.asyncBizType, metadata?.asyncBizType, data?.bizType),
    asyncBizId: firstText(result?.asyncBizId, metadata?.asyncBizId, data?.bizId)
  }
  captureMatchTask(sseTaskSnapshot, result, metadata)
  const reportId = sseTaskSnapshot.reportId
  if ((event === 'result' || event === 'done') && reportId) {
    setMatchSseDone()
    ElMessage.success('匹配报告任务已提交')
    void routeToReport(reportId, payload)
  }
}

const stopMatchSse = () => {
  matchSseHandle?.abort()
  matchSseHandle = null
}

const startMatchSse = (payload: ResumeJobMatchCreateDTO) => {
  stopMatchSse()
  resetMatchSse()
  lastMatchTask.value = null
  navigatingToReport = false
  setMatchSseConnecting()
  submitting.value = true
  matchSseHandle = streamCreateResumeJobMatchReportApi(
    payload,
    {
      onEvent: (event, data) => applyMatchSseEvent(event, data, payload),
      onError: (error, hasStarted) => {
        matchSseHandle = null
        if (!hasStarted) {
          addMatchSseEvent('fallback', '已继续提交生成请求')
          ElMessage.warning('生成进度暂时未返回，已继续提交生成请求')
          void runMatchFallback(payload)
          return
        }
        submitting.value = false
        const message = getErrorMessage(error, '匹配生成进度中断，可以刷新最近报告；如果处理线索已出现，也可以到任务中心查看。')
        setMatchSseError(message, true)
        ElMessage.error(message)
        void loadReports()
      },
      onDone: () => {
        matchSseHandle = null
        submitting.value = false
        if (matchSseStatus.value !== 'error') {
          setMatchSseDone()
        }
      }
    }
  )
  void matchSseHandle.finished.catch(() => undefined)
}

onMounted(async () => {
  await Promise.allSettled([loadInitial(), loadReports()])
})
onBeforeUnmount(stopMatchSse)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-copy { min-width: 0; }
.hero-kicker, .hero-actions, .submit-row, .section-head, .hero-pills { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.hero-pills { flex-wrap: wrap; margin-top: 14px; }
.hero-pills span { padding: 4px 10px; border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 999px; background: rgba(148, 163, 184, 0.08); color: var(--app-text-muted); font-size: 12px; }
.match-layout { display: grid; grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr); gap: 18px; }
.content-panel { padding: 20px; min-width: 0; }
.section-head { justify-content: space-between; margin-bottom: 18px; }
.full { width: 100%; }
.submit-row { flex-wrap: wrap; margin-top: 18px; }
.match-stream { display: grid; gap: 10px; margin-top: 18px; padding: 12px; border: 1px solid rgba(99, 102, 241, 0.24); border-radius: 8px; background: rgba(15, 23, 42, 0.42); }
.match-stream p { margin: 0; color: #fca5a5; font-size: 12px; }
.match-stream__head, .match-stream__events, .match-stream__task, .match-stream__recovery { display: flex; align-items: center; gap: 8px; }
.match-stream__head { align-items: flex-start; flex-direction: column; }
.match-stream__head strong { color: #dbeafe; font-size: 13px; line-height: 1.5; }
.match-stream__events { flex-wrap: wrap; }
.match-stream__events span { max-width: 100%; padding: 4px 8px; border-radius: 999px; background: rgba(148, 163, 184, 0.12); color: var(--app-text-muted); font-size: 11px; overflow-wrap: anywhere; }
.match-stream__task { justify-content: space-between; flex-wrap: wrap; padding-top: 2px; color: var(--app-text-muted); font-size: 12px; line-height: 1.5; }
.match-stream__task span { min-width: 0; overflow-wrap: anywhere; }
.match-stream__recovery { justify-content: space-between; flex-wrap: wrap; padding-top: 2px; color: #a5b4fc; font-size: 12px; line-height: 1.5; }
.match-stream__recovery span { min-width: 0; overflow-wrap: anywhere; }
.report-list { min-height: 220px; display: grid; gap: 12px; }
.report-card { display: grid; grid-template-columns: minmax(0, 1fr) auto 54px; gap: 12px; align-items: center; width: 100%; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.34); color: var(--app-text); text-align: left; cursor: pointer; }
.report-card strong, .report-card small { display: block; overflow-wrap: anywhere; }
.report-card small { margin-top: 5px; color: var(--app-text-muted); }
.report-card .report-error { color: #fca5a5; }
.report-card .report-evidence { font-size: 12px; line-height: 1.5; }
.report-card .report-warning { color: #fbbf24; font-size: 12px; line-height: 1.5; }
.report-card b { text-align: right; font-size: 22px; }
@media (max-width: 960px) { .page-hero, .match-layout { grid-template-columns: 1fr; flex-direction: column; } .hero-actions { flex-wrap: wrap; } }


@media (max-width: 720px) { .page-hero, .match-layout { flex-direction: column; align-items: stretch; } .hero-actions { flex-wrap: wrap; } }
</style>
