<template>
  <div class="job-analysis-page page-shell">
    <section class="analysis-hero">
      <div>
        <div class="hero-kicker">
          <ScanSearch :size="16" />
          JD 分析
        </div>
        <h1>{{ target?.jobTitle || 'JD 解析 / 分析结果' }}</h1>
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
              <span>JD 来源</span>
              <strong>{{ target?.jdSource || '--' }}</strong>
            </div>
            <div>
              <span>当前主目标</span>
              <strong>{{ target?.currentFlag === 1 ? '是' : '否' }}</strong>
            </div>
            <div>
              <span>解析状态</span>
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
              {{ analysis ? '重新解析 JD' : '触发 JD 解析' }}
            </el-button>
            <el-button :loading="loading" @click="loadAll">
              <RefreshCw :size="16" />
              刷新结果
            </el-button>
          </div>

          <div v-if="parseSseStatus !== 'idle' || parseSseEvents.length" class="sse-progress">
            <div class="sse-progress__head">
              <span class="cc-badge" :class="sseBadgeClass(parseSseStatus)">
                <i class="cc-badge__dot" />
                {{ sseStatusLabel(parseSseStatus) }}
              </span>
              <strong>{{ latestParseSseMessage }}</strong>
            </div>
            <p v-if="parseSseError">{{ parseSseError }}</p>
            <div v-if="recentParseSseEvents.length" class="sse-progress__events">
              <span v-for="item in recentParseSseEvents" :key="item.key">
                {{ item.message || item.event }}
              </span>
            </div>
          </div>

          <el-alert
            v-if="target?.parseErrorMessage || analysis?.parseErrorMessage"
            class="side-alert"
            type="error"
            :closable="false"
            show-icon
            title="JD 解析失败"
            :description="toFriendlyMessage(target?.parseErrorMessage || analysis?.parseErrorMessage, 'JD 解析失败，请稍后重试。')"
          />
        </div>
      </aside>

      <main class="content-card main-panel">
        <div v-if="loading" class="state-wrap">
          <AppState type="loading" title="正在读取 JD 分析结果" description="正在同步岗位信息和解析结果。" />
        </div>

        <div v-else-if="loadError" class="state-wrap">
          <AppState type="error" title="JD 分析加载失败" :description="loadError">
            <el-button type="primary" @click="loadAll">重新加载</el-button>
          </AppState>
        </div>

        <div v-else-if="!target" class="state-wrap">
          <AppState type="error" title="岗位目标不存在" description="当前路由没有可用岗位目标，请返回列表重新选择。" />
        </div>

        <div v-else class="content-card__body analysis-workspace">
          <section class="jd-preview">
            <div class="section-head">
              <div>
                <h2>JD 原文</h2>
                <p>这里展示你保存的 JD 原文，重新解析会基于这段内容生成结构化信息。</p>
              </div>
              <JobTargetStatusTag :status="target.parseStatus" />
            </div>
            <pre v-if="target.jdText">{{ target.jdText }}</pre>
            <AppState
              v-else
              type="empty"
              title="JD 原文为空"
              description="请先编辑岗位目标补充 JD 原文，再触发解析。"
            >
              <el-button type="primary" @click="router.push(`/job-targets/${target.id}/edit`)">编辑岗位目标</el-button>
            </AppState>
          </section>

          <section>
            <div class="section-head">
              <div>
                <h2>结构化解析结果</h2>
                <p>职责、技能、关键词和经验要求会在解析完成后展示。</p>
              </div>
              <el-button
                :loading="parsing"
                :disabled="!target.jdText || target.parseStatus === 'PARSING'"
                @click="handleParse"
              >
                <Sparkles :size="16" />
                {{ analysis ? '重新解析' : '解析 JD' }}
              </el-button>
            </div>

            <AppState
              v-if="!analysis"
              type="empty"
              title="暂无 JD 解析结果"
              description="当前还没有解析结果，可以先触发解析。"
            >
              <el-button type="primary" :loading="parsing" :disabled="!target.jdText" @click="handleParse">触发解析</el-button>
            </AppState>

            <JobTargetAnalysisPanel v-else :analysis="analysis" />
          </section>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Files, Pencil, RefreshCw, ScanSearch, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getJobDescriptionAnalysisApi,
  getJobTargetDetailApi,
  parseJobDescriptionApi,
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
const target = ref<TargetJobVO | null>(null)
const analysis = ref<JobDescriptionAnalysisVO | null>(null)
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
  if (!target.value) return '读取岗位详情后展示 JD 原文、解析状态和结构化分析结果。'
  return `${target.value.companyName || '--'} · ${target.value.jobLevel || '--'}`
})
const recentParseSseEvents = computed(() => parseSseEvents.value.slice(-3))
const latestParseSseMessage = computed(() => {
  const recent = recentParseSseEvents.value
  const latest = recent[recent.length - 1]
  return latest?.message || '正在获取 JD 解析进度'
})

const loadAll = async () => {
  if (!targetId.value) {
    loadError.value = '路由参数 id 无效。'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const [detail, result] = await Promise.all([
      getJobTargetDetailApi(targetId.value),
      getJobDescriptionAnalysisApi(targetId.value)
    ])
    target.value = detail
    analysis.value = result || null
  } catch (error) {
    target.value = null
    analysis.value = null
    loadError.value = getErrorMessage(error, 'JD 分析暂时无法加载，请确认登录状态后重试。')
  } finally {
    loading.value = false
  }
}

const sseStatusLabel = (status: string) => {
  if (status === 'connecting') return '连接中'
  if (status === 'streaming') return '解析中'
  if (status === 'done') return '已完成'
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

const stopParseSse = () => {
  parseSseHandle?.abort()
  parseSseHandle = null
}

const runParseFallback = async (id: number, payload: JobDescriptionParseDTO) => {
  try {
    analysis.value = await parseJobDescriptionApi(id, payload)
    setParseSseDone()
    ElMessage.success(analysis.value.parseStatus === 'FAILED' ? 'JD 解析已返回失败状态' : 'JD 解析已完成')
    await loadAll()
  } catch (error) {
    const message = getErrorMessage(error, 'JD 解析失败，请稍后重试。')
    setParseSseError(message)
    ElMessage.error(message)
  } finally {
    parsing.value = false
  }
}

const applyParseSseEvent = (event: JobTargetParseSseEventType, data?: JobTargetParseSseEvent) => {
  const message = toFriendlyMessage(data?.message || data?.content || data?.stage, sseStatusLabel(event))
  addParseSseEvent(event, message)
  if (data?.result) {
    analysis.value = data.result
  }
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
          addParseSseEvent('fallback', '已切换为同步解析')
          ElMessage.warning('JD 解析流未启动，已切换为同步解析')
          void runParseFallback(id, payload)
          return
        }
        parsing.value = false
        const message = getErrorMessage(error, 'JD 解析流中断，请稍后重试。')
        setParseSseError(message, true)
        ElMessage.error(message)
      },
      onDone: () => {
        parseSseHandle = null
        parsing.value = false
        if (parseSseStatus.value === 'error') return
        setParseSseDone()
        void loadAll().then(() => ElMessage.success('JD 解析已完成'))
      }
    }
  )
  void parseSseHandle.finished.catch(() => undefined)
}

const handleParse = async () => {
  if (!target.value) return
  if (!target.value.jdText) {
    ElMessage.warning('请先编辑岗位目标补充 JD 原文。')
    return
  }
  const forceRefresh = Boolean(analysis.value || target.value.parseStatus === 'PARSED')
  if (forceRefresh) {
    try {
      await ElMessageBox.confirm('确认重新解析当前 JD？系统会重新分析并刷新最新结果。', '重新解析 JD', {
        type: 'warning',
        confirmButtonText: '重新解析',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }
  startParseSse(target.value.id, { forceRefresh })
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

.sse-progress {
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

.sse-progress__head,
.sse-progress__events {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sse-progress__head {
  align-items: flex-start;
  flex-direction: column;

  strong {
    color: #dbeafe;
    font-size: 13px;
    line-height: 1.5;
  }
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
