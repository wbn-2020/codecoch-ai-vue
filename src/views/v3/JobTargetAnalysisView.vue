<template>
  <div class="job-analysis-page page-shell">
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
        <el-button v-if="targetId" type="primary" @click="goResumeMatch">
          <Files :size="16" />
          进入简历匹配
        </el-button>
      </div>
    </section>

    <section class="analysis-layout">
      <aside class="content-card side-panel">
        <div class="content-card__body">
          <h2>岗位上下文</h2>
          <div class="info-list">
            <div>
              <span>公司</span>
              <strong>{{ target?.companyName || '--' }}</strong>
            </div>
            <div>
              <span>级别 / 经验</span>
              <strong>{{ target?.jobLevel || '--' }}</strong>
            </div>
            <div>
              <span>岗位描述来源</span>
              <strong>{{ target?.jdSource || '--' }}</strong>
            </div>
            <div>
              <span>当前主目标</span>
              <strong>{{ target?.currentFlag === 1 ? '是' : '否' }}</strong>
            </div>
            <div>
              <span>分析状态</span>
              <JobTargetStatusTag :status="target?.parseStatus || analysis?.parseStatus" />
            </div>
            <div>
              <span>更新时间</span>
              <strong>{{ formatDateTime(target?.updatedAt || analysis?.updatedAt) }}</strong>
            </div>
          </div>

          <div class="parse-actions">
            <el-button
              type="primary"
              :loading="parsing"
              :disabled="loading || !target || target.parseStatus === 'PARSING'"
              @click="handleParse"
            >
              <Sparkles :size="16" />
              {{ analysis ? '重新分析岗位描述' : '分析岗位描述' }}
            </el-button>
            <el-button :loading="loading" @click="loadAll">
              <RefreshCw :size="16" />
              刷新结果
            </el-button>
          </div>

          <div v-if="parseTaskVisible" class="parse-task-progress">
            <div class="parse-task-progress__head">
              <span class="cc-badge" :class="parseTaskBadgeClass(parseSseStatus)">
                <i class="cc-badge__dot" />
                {{ parseTaskStatusLabel(parseSseStatus) }}
              </span>
              <strong>{{ latestParseSseMessage }}</strong>
            </div>
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
            <div class="parse-task-progress__actions">
              <el-button text type="primary" @click="goTaskCenter">去任务中心查看</el-button>
              <el-button text :loading="loading" @click="loadAll">刷新结果</el-button>
            </div>
          </div>

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

          <section class="jd-preview">
            <div class="section-head">
              <div>
                <h2>完整岗位描述</h2>
                <p>这里展示你保存的岗位描述，重新分析会基于这段内容生成结构化信息。</p>
              </div>
              <JobTargetStatusTag :status="target.parseStatus" />
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

          <section>
            <div class="section-head">
              <div>
                <h2>结构化分析结果</h2>
                <p>职责、技能、关键词和经验要求会在分析完成后展示。</p>
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
              type="empty"
              title="暂无岗位分析结果"
              description="当前还没有分析结果，可以先触发分析。"
            >
              <el-button type="primary" :loading="parsing" :disabled="!target.jdText" @click="handleParse">触发分析</el-button>
            </AppState>

            <JobTargetAnalysisPanel v-else :analysis="analysis" />
          </section>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, Files, Pencil, RefreshCw, ScanSearch, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getJobDescriptionAnalysisApi,
  getJobTargetDetailApi,
  parseJobDescriptionApi,
  submitJobDescriptionParseTaskApi,
  streamJobDescriptionParseApi
} from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import { useSseState } from '@/composables/useSseState'
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
import JobTargetStatusTag from './components/JobTargetStatusTag.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const parsing = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const target = ref<TargetJobVO | null>(null)
const analysis = ref<JobDescriptionAnalysisVO | null>(null)
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
const targetHasRecoverableParseStatus = computed(() => ['PARSING', 'FAILED'].includes(currentParseStatus.value))
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

const loadAll = async () => {
  if (!targetId.value) {
    loadError.value = '岗位目标链接不完整，请从岗位目标列表重新进入。'
    return
  }
  loading.value = true
  loadError.value = ''
  partialLoadWarning.value = ''
  try {
    const [detailResult, analysisResult] = await Promise.allSettled([
      getJobTargetDetailApi(targetId.value),
      getJobDescriptionAnalysisApi(targetId.value)
    ])

    if (!isFulfilled(detailResult)) {
      target.value = null
      analysis.value = null
      loadError.value = getErrorMessage(detailResult.reason, '岗位目标暂时无法加载，请确认登录状态后重试。')
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
      partialLoadWarning.value = getErrorMessage(analysisResult.reason, '岗位分析结果暂时无法加载；岗位描述仍可查看，也可以重新分析。')
      if (!hasParseTaskReceipt(analysis.value)) {
        analysis.value = null
      }
    }
  } catch (error) {
    target.value = null
    analysis.value = null
    loadError.value = getErrorMessage(error, '岗位分析暂时无法加载，请确认登录状态后重试。')
  } finally {
    loading.value = false
  }
}

const refreshAnalysisAfterInterrupt = async () => {
  const hadStructuredAnalysis = hasStructuredAnalysis(analysis.value)
  await loadAll()
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
        void loadAll().then(() => ElMessage.success('岗位分析已完成'))
      }
    }
  )
  void parseSseHandle.finished.catch(() => undefined)
}

const submitParseTask = async (id: number, payload: JobDescriptionParseDTO) => {
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

watch(
  () => route.params.id,
  () => {
    loadAll()
  }
)

onMounted(loadAll)
onBeforeUnmount(stopParseSse)
</script>

<style scoped lang="scss">
.job-analysis-page {
  gap: 20px;
}

.analysis-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.07)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions,
.parse-actions,
.section-head {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.analysis-hero h1 {
  margin: 14px 0 0;
  font-size: 32px;
}

.analysis-hero p {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.side-panel,
.main-panel {
  min-width: 0;
}

.side-panel {
  align-self: start;

  h2 {
    margin: 0 0 14px;
    font-size: 19px;
  }
}

.info-list {
  display: grid;
  gap: 10px;

  div {
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.3);
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
    margin-top: 6px;
    overflow-wrap: anywhere;
    color: #dbeafe;
    font-size: 13px;
  }
}

.parse-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.side-alert {
  margin-top: 16px;
}

.parse-task-progress {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid rgba(99, 102, 241, 0.24);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.42);

  p {
    margin: 0;
    color: #fca5a5;
    font-size: 12px;
    line-height: 1.5;
  }
}

.parse-task-progress__head,
.sse-progress__events {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parse-task-progress__head {
  align-items: flex-start;
  flex-direction: column;

  strong {
    color: #dbeafe;
    font-size: 13px;
    line-height: 1.5;
  }
}

.parse-task-progress__diagnostics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    min-width: 0;
    max-width: 100%;
    padding: 4px 8px;
    border: 1px dashed rgba(148, 163, 184, 0.34);
    border-radius: 6px;
    color: #cbd5e1;
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
  padding: 8px 10px;
  border: 1px dashed rgba(34, 211, 238, 0.28);
  border-radius: 8px;
  background: rgba(8, 47, 73, 0.24);
  color: #bfdbfe;
  font-size: 12px;
  line-height: 1.5;
}

.parse-task-progress__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sse-progress__events {
  flex-wrap: wrap;

  span {
    max-width: 100%;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.12);
    color: var(--app-text-muted);
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
  gap: 22px;
}

.section-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.jd-preview pre {
  max-height: 320px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.42);
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 980px) {
  .analysis-hero,
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
}
</style>
