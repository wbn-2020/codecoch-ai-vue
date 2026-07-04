<template>
  <div class="v3-page">
    <section class="page-hero match-hero">
      <div class="hero-copy">
        <div class="hero-kicker"><FlaskConical :size="16" /> JD 匹配实验台</div>
        <h1>判断这份简历能不能投这个岗位</h1>
        <p>先检查简历版本、岗位 JD 和项目证据是否足够，再生成匹配报告。资料不足时先补关键输入，不包装成强结论。</p>
        <div class="hero-pills">
          <span>准备度检查</span>
          <span>版本快照</span>
          <span>JD 输入</span>
          <span>报告闭环</span>
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

    <section v-if="isVersionEntry" class="content-panel match-version-notice">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="已从简历版本进入匹配"
        :description="versionSourceNotice"
      />
      <div class="version-entry-actions">
        <el-button :disabled="!form.resumeId" @click="goSelectedResumeVersions">
          <GitCompareArrows :size="16" />
          返回版本
        </el-button>
        <el-button type="primary" plain :disabled="!form.resumeId" @click="goSelectedResumeEdit">编辑当前简历</el-button>
      </div>
    </section>

    <section class="experiment-flow" aria-label="JD 匹配流程">
      <article v-for="step in experimentSteps" :key="step.title" class="flow-step" :class="`flow-step--${step.tone}`">
        <span>{{ step.index }}</span>
        <div>
          <strong>{{ step.title }}</strong>
          <small>{{ step.desc }}</small>
        </div>
      </article>
    </section>

    <section class="match-layout">
      <div class="left-rail">
        <div class="content-panel readiness-panel" v-loading="loading">
          <div class="section-head">
            <div>
              <h2>投前准备度</h2>
              <p>{{ readinessSummary }}</p>
            </div>
            <el-tag :type="readinessTagType" effect="plain">{{ readinessTagText }}</el-tag>
          </div>
          <div class="readiness-list">
            <article v-for="item in readinessItems" :key="item.key" class="readiness-item" :class="`readiness-item--${item.tone}`">
              <component :is="item.icon" :size="18" />
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </div>
            </article>
          </div>
          <div v-if="matchQualityIssues.length" class="quality-gate-actions">
            <el-button text type="primary" :disabled="!form.resumeId" @click="goSelectedResumeEdit">补简历信息</el-button>
            <el-button text type="primary" :disabled="!form.resumeId" @click="goSelectedResumeProjects">补项目经历</el-button>
            <el-button text type="primary" :disabled="!form.targetJobId" @click="goSelectedTargetAnalysis">分析岗位</el-button>
          </div>
        </div>

        <div class="content-panel version-card">
          <div class="section-head">
            <div>
              <h2>简历版本来源</h2>
              <p>{{ versionSourceNotice }}</p>
            </div>
            <el-tag :type="isVersionEntry ? 'success' : 'info'" effect="plain">
              {{ isVersionEntry ? '版本已绑定' : '使用当前简历' }}
            </el-tag>
          </div>
          <dl class="source-facts">
            <div>
              <dt>简历</dt>
              <dd>{{ selectedResumeMeta.title }}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{{ selectedResumeMeta.version }}</dd>
            </div>
            <div>
              <dt>项目证据</dt>
              <dd>{{ selectedResumeMeta.projects }}</dd>
            </div>
          </dl>
          <div class="version-entry-actions">
            <el-button :disabled="!form.resumeId" @click="goSelectedResumeEdit">编辑简历</el-button>
            <el-button :disabled="!form.resumeId" @click="goSelectedResumeVersions">版本记录</el-button>
          </div>
        </div>
      </div>

      <div class="content-panel form-panel" v-loading="loading">
        <div class="section-head">
          <div>
            <h2>JD 输入与匹配启动</h2>
            <p>默认带入当前主目标岗位和默认简历；如果岗位还未分析，先补 JD，再生成报告。</p>
          </div>
          <el-tag v-if="currentTarget" type="success" effect="plain">已读取当前岗位</el-tag>
        </div>

        <el-form label-position="top" class="experiment-form">
          <div class="input-grid">
            <el-form-item label="实验简历">
              <el-select
                v-model="form.resumeId"
                filterable
                placeholder="选择简历"
                class="full"
                :disabled="isVersionResumeLocked"
              >
                <el-option
                  v-for="resume in resumes"
                  :key="resume.id"
                  :label="`${resume.resumeName || resume.title || '简历'}${resume.isDefault === 1 ? ' · 默认' : ''}`"
                  :value="resume.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="岗位描述 / 目标岗位">
              <el-select v-model="form.targetJobId" filterable placeholder="选择岗位目标" class="full">
                <el-option
                  v-for="target in targets"
                  :key="target.id"
                  :label="`${target.jobTitle || '未命名岗位'} · ${target.companyName || '--'}`"
                  :value="target.id"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="jd-preview">
            <div>
              <span>当前 JD</span>
              <strong>{{ selectedTargetMeta.title }}</strong>
              <small>{{ selectedTargetMeta.company }}</small>
            </div>
            <p>{{ selectedTargetMeta.analysis }}</p>
            <el-button text type="primary" :disabled="!form.targetJobId" @click="goSelectedTargetAnalysis">查看/补充岗位分析</el-button>
          </div>

          <el-alert
            v-if="versionResumeMismatch"
            class="quality-gate-alert"
            type="warning"
            show-icon
            :closable="false"
            title="简历版本入口已绑定原简历"
            description="当前简历与入口版本不一致，已阻止提交。请返回版本页重新选择，或清空版本入口后再切换简历。"
          />
          <el-alert
            v-if="matchQualityIssues.length"
            class="quality-gate-alert"
            type="warning"
            show-icon
            :closable="false"
            title="用于 AI 匹配前请先补齐资料"
            :description="matchQualityDescription"
          />

          <div class="launch-panel">
            <el-checkbox v-model="form.forceRefresh">重新生成一份报告</el-checkbox>
            <div class="submit-row">
              <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submitMatch">
                <Sparkles :size="16" /> 生成 JD 匹配报告
              </el-button>
              <el-button :loading="loading" @click="loadInitial"><RefreshCw :size="16" /> 刷新数据</el-button>
            </div>
            <p>报告会基于真实返回字段展示匹配度、优势、差距和建议；字段不足时只给待补齐提示。</p>
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

      <div class="content-panel reports-panel">
        <div class="section-head">
          <div>
            <h2>历史报告</h2>
            <p>{{ reportHistoryHint }}</p>
          </div>
          <el-button text :loading="reportsLoading" @click="loadReports">刷新</el-button>
        </div>
        <div v-loading="reportsLoading" class="report-list">
          <AppState v-if="reportsError" type="error" title="匹配报告加载失败" :description="reportsError">
            <el-button type="primary" @click="loadReports">重试</el-button>
          </AppState>
          <AppState v-else-if="!reports.length" type="empty" title="暂无匹配报告" description="提交一次岗位匹配后，这里会显示最新报告。" />
          <button v-for="report in reports" v-else :key="report.reportId" class="report-card" type="button" @click="router.push({ path: `/resume-match/${report.reportId}`, query: matchReportRouteQuery(report) })">
            <span>
              <strong>{{ report.jobTitle || '未命名岗位' }}</strong>
              <small>{{ report.resumeTitle || '未命名简历' }}<template v-if="report.resumeVersionId"> · {{ resumeVersionLabel(report) }}</template> · {{ formatDateTime(report.updatedAt || report.createdAt) }}</small>
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
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  FileText,
  FlaskConical,
  GitCompareArrows,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'
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

const versionSourceId = computed(() => {
  const value = Number(route.query.resumeVersionId)
  return Number.isFinite(value) && value > 0 ? value : undefined
})
const routeResumeId = computed(() => {
  const value = Number(route.query.resumeId)
  return Number.isFinite(value) && value > 0 ? value : undefined
})
const isVersionEntry = computed(() => route.query.source === 'resume-version' || Boolean(versionSourceId.value))
const isVersionResumeLocked = computed(() => Boolean(versionSourceId.value && routeResumeId.value))
const versionResumeMismatch = computed(() =>
  Boolean(isVersionResumeLocked.value && form.resumeId && routeResumeId.value && form.resumeId !== routeResumeId.value)
)
const versionSourceNotice = computed(() =>
  versionSourceId.value
    ? `来源版本 ID：${versionSourceId.value}。本次匹配会绑定该版本快照，并锁定入口简历，避免版本和简历混用。`
    : isVersionEntry.value
      ? '当前入口来自版本页；选择具体版本后，匹配报告会保留版本来源。'
      : '当前使用所选简历的最新内容生成报告；如果要锁定投递版本，请从简历版本页进入。'
)
const selectedResume = computed(() => resumes.value.find((item) => item.id === form.resumeId) || null)
const selectedTarget = computed(() => {
  const matched = targets.value.find((item) => item.id === form.targetJobId)
  if (matched) return matched
  if (currentTarget.value && (!form.targetJobId || currentTarget.value.id === form.targetJobId)) {
    return currentTarget.value
  }
  return null
})
const selectedTargetReady = computed(() => {
  const target = selectedTarget.value
  if (!target) return false
  const parseStatus = String(target.parseStatus || '').toUpperCase()
  return parseStatus === 'PARSED' || Boolean(target.analysisSummary || target.requiredSkills || target.interviewFocusPoints)
})
const matchQualityIssues = computed(() => {
  const issues: string[] = []
  const resume = selectedResume.value
  const target = selectedTarget.value
  if (resume) {
    if (!resume.targetPosition?.trim()) issues.push('简历缺少求职方向')
    if (!(resume.summary?.trim() || resume.workExperience?.trim())) issues.push('简历缺少个人摘要或工作经历')
    if (typeof resume.projectCount === 'number' && resume.projectCount <= 0) issues.push('简历缺少项目经历')
  }
  if (target && !selectedTargetReady.value) issues.push('目标岗位还没有完成结构化分析')
  return issues
})
const matchQualityDescription = computed(() =>
  matchQualityIssues.value.length
    ? `当前还差：${matchQualityIssues.value.join('、')}。补齐后再生成报告，能减少空结果和不可用匹配。`
    : ''
)
const readinessTagType = computed(() => {
  if (!form.resumeId || !form.targetJobId) return 'info'
  if (versionResumeMismatch.value || matchQualityIssues.value.length) return 'warning'
  return 'success'
})
const readinessTagText = computed(() => {
  if (!form.resumeId || !form.targetJobId) return '等待输入'
  if (versionResumeMismatch.value) return '版本需确认'
  if (matchQualityIssues.value.length) return '先补资料'
  return '可以生成'
})
const readinessSummary = computed(() => {
  if (!form.resumeId && !form.targetJobId) return '先选择一份简历和一个目标岗位，系统才会判断是否适合生成报告。'
  if (versionResumeMismatch.value) return '当前版本入口和所选简历不一致，已阻止提交，避免版本快照混用。'
  if (matchQualityIssues.value.length) return matchQualityDescription.value
  return '简历、目标岗位和版本来源已就绪，可以生成一份 JD 匹配报告。'
})
const selectedResumeMeta = computed(() => {
  const resume = selectedResume.value
  const projectCount = typeof resume?.projectCount === 'number' ? resume.projectCount : undefined
  return {
    title: resume?.resumeName || resume?.title || '尚未选择简历',
    version: versionSourceId.value ? `版本 ${versionSourceId.value}` : '未锁定版本快照',
    projects: projectCount == null ? '项目证据待确认' : projectCount > 0 ? `${projectCount} 个项目` : '缺少项目经历'
  }
})
const selectedTargetMeta = computed(() => {
  const target = selectedTarget.value
  return {
    title: target?.jobTitle || '尚未选择目标岗位',
    company: target?.companyName || '公司信息待补充',
    analysis: selectedTargetReady.value
      ? (target?.analysisSummary || '岗位要求已结构化，可用于匹配。')
      : '岗位还未完成结构化分析，建议先补充 JD 或运行岗位分析。'
  }
})
const readinessItems = computed(() => [
  {
    key: 'resume',
    title: form.resumeId ? '简历已选择' : '选择实验简历',
    desc: form.resumeId
      ? selectedResumeMeta.value.title
      : '先选择一份要投递或要验证的简历。',
    tone: form.resumeId ? 'ready' : 'todo',
    icon: form.resumeId ? CheckCircle2 : FileText
  },
  {
    key: 'version',
    title: isVersionEntry.value ? '版本来源已记录' : '未锁定简历版本',
    desc: isVersionEntry.value
      ? versionSourceNotice.value
      : '可以直接匹配当前简历，也可以从版本页进入以绑定快照。',
    tone: versionResumeMismatch.value ? 'risk' : isVersionEntry.value ? 'ready' : 'neutral',
    icon: versionResumeMismatch.value ? AlertTriangle : ShieldCheck
  },
  {
    key: 'target',
    title: selectedTargetReady.value ? '岗位已分析' : '补充岗位分析',
    desc: selectedTargetMeta.value.analysis,
    tone: selectedTargetReady.value ? 'ready' : 'todo',
    icon: selectedTargetReady.value ? CheckCircle2 : Crosshair
  },
  {
    key: 'quality',
    title: matchQualityIssues.value.length ? '资料仍有缺口' : '匹配输入可用',
    desc: matchQualityIssues.value.length
      ? matchQualityIssues.value.join('、')
      : '当前输入可以进入报告生成。',
    tone: matchQualityIssues.value.length ? 'risk' : 'ready',
    icon: matchQualityIssues.value.length ? AlertTriangle : ClipboardCheck
  }
] as Array<{ key: string; title: string; desc: string; tone: 'ready' | 'todo' | 'risk' | 'neutral'; icon: unknown }>)
const experimentSteps = computed(() => [
  {
    index: '01',
    title: '选定简历与版本',
    desc: isVersionEntry.value ? '报告将绑定入口版本' : '可使用当前简历内容',
    tone: versionResumeMismatch.value ? 'risk' : form.resumeId ? 'ready' : 'todo'
  },
  {
    index: '02',
    title: '确认岗位描述',
    desc: selectedTargetReady.value ? '岗位要求已可用于匹配' : '先补充或分析岗位描述',
    tone: selectedTargetReady.value ? 'ready' : 'todo'
  },
  {
    index: '03',
    title: '生成匹配报告',
    desc: canSubmit.value ? '可以开始生成' : '等待准备度通过',
    tone: canSubmit.value ? 'ready' : 'todo'
  },
  {
    index: '04',
    title: '进入训练闭环',
    desc: reports.value.length ? '已有历史报告可复用' : '报告生成后形成行动入口',
    tone: reports.value.length ? 'ready' : 'neutral'
  }
] as Array<{ index: string; title: string; desc: string; tone: 'ready' | 'todo' | 'risk' | 'neutral' }>)
const reportHistoryHint = computed(() =>
  versionSourceId.value
    ? `仅展示与版本 ${versionSourceId.value} 相关的最近报告，避免和其他简历版本混用。`
    : '展示最近生成的匹配报告，便于回到详情继续修复简历、重跑报告或进入训练。'
)
const canSubmit = computed(() =>
  Boolean(form.resumeId && form.targetJobId && !submitting.value && !matchQualityIssues.value.length && !versionResumeMismatch.value)
)
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
    form.resumeId = routeResumeId.value || resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
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
    const page = await getResumeJobMatchReportsApi({
      pageNo: 1,
      pageSize: 8,
      ...(versionSourceId.value ? { resumeVersionId: versionSourceId.value } : {})
    })
    reports.value = page.records || []
  } catch (error) {
    reportsError.value = getErrorMessage(error, '读取匹配报告失败。')
  } finally {
    reportsLoading.value = false
  }
}

const submitMatch = async () => {
  if (!form.resumeId || !form.targetJobId) return
  if (versionResumeMismatch.value) {
    if (routeResumeId.value) {
      form.resumeId = routeResumeId.value
    }
    ElMessage.warning('当前简历版本入口已绑定原简历，请不要混用其他简历。')
    return
  }
  if (matchQualityIssues.value.length) {
    ElMessage.warning(matchQualityDescription.value)
    return
  }
  const payload: ResumeJobMatchCreateDTO = {
    resumeId: form.resumeId,
    targetJobId: form.targetJobId,
    ...(versionSourceId.value ? { resumeVersionId: versionSourceId.value } : {}),
    forceRefresh: form.forceRefresh
  }
  startMatchSse(payload)
}

const goSelectedResumeEdit = () => {
  if (!form.resumeId) return
  router.push(`/resumes/${form.resumeId}/edit`)
}

const goSelectedResumeProjects = () => {
  if (!form.resumeId) return
  router.push({
    path: '/project-evidence',
    query: {
      resumeId: form.resumeId,
      ...(versionSourceId.value ? { resumeVersionId: versionSourceId.value } : {})
    }
  })
}

const goSelectedResumeVersions = () => {
  if (!form.resumeId) return
  router.push(`/resumes/${form.resumeId}/versions`)
}

const goSelectedTargetAnalysis = () => {
  if (!form.targetJobId) return
  router.push(`/job-targets/${form.targetJobId}/analysis`)
}

const routeToReport = async (reportId?: number, payload?: ResumeJobMatchCreateDTO) => {
  if (!reportId || !payload || navigatingToReport) return
  navigatingToReport = true
  await router.push({
    path: `/resume-match/${reportId}`,
    query: {
      resumeId: payload.resumeId,
      targetJobId: payload.targetJobId,
      ...(payload.resumeVersionId ? { resumeVersionId: payload.resumeVersionId } : {})
    }
  })
}

const resumeVersionLabel = (report: Pick<ResumeJobMatchReportListVO, 'resumeVersionId' | 'resumeVersionNo' | 'resumeVersionName'>) => {
  if (!report.resumeVersionId) return ''
  return report.resumeVersionName || (report.resumeVersionNo ? `V${report.resumeVersionNo}` : `版本 ${report.resumeVersionId}`)
}

const matchReportRouteQuery = (report: ResumeJobMatchReportListVO) => ({
  resumeId: report.resumeId,
  targetJobId: report.targetJobId,
  ...(report.resumeVersionId ? { resumeVersionId: report.resumeVersionId } : {})
})

const goMatchTaskCenter = () => {
  const route = matchTaskRoute.value
  if (!route) return
  router.push(route)
}

const refreshMatchReportsAfterInterrupt = async () => {
  await loadReports()
  const relatedReport = reports.value.find((item) =>
    item.resumeId === form.resumeId && item.targetJobId === form.targetJobId
    && (!versionSourceId.value || item.resumeVersionId === versionSourceId.value)
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
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; overflow: hidden; }
.match-hero { background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(6, 182, 212, 0.08) 42%, rgba(22, 163, 74, 0.08)); }
.hero-copy { min-width: 0; }
.hero-kicker, .hero-actions, .submit-row, .section-head, .hero-pills { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.hero-pills { flex-wrap: wrap; margin-top: 14px; }
.hero-pills span { padding: 4px 10px; border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 999px; background: rgba(148, 163, 184, 0.08); color: var(--app-text-muted); font-size: 12px; }
.experiment-flow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.flow-step { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; min-width: 0; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.22); }
.flow-step span { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: rgba(37, 99, 235, 0.16); color: #bfdbfe; font-weight: 800; font-size: 12px; }
.flow-step strong, .flow-step small { display: block; min-width: 0; overflow-wrap: anywhere; }
.flow-step small { margin-top: 5px; color: var(--app-text-muted); line-height: 1.5; }
.flow-step--ready { border-color: rgba(22, 163, 74, 0.34); }
.flow-step--ready span { background: rgba(22, 163, 74, 0.16); color: #86efac; }
.flow-step--risk { border-color: rgba(245, 158, 11, 0.42); }
.flow-step--risk span { background: rgba(245, 158, 11, 0.16); color: #fcd34d; }
.match-layout { display: grid; grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1.28fr) minmax(320px, 0.9fr); gap: 18px; align-items: start; }
.left-rail { display: grid; gap: 18px; min-width: 0; }
.content-panel { padding: 20px; min-width: 0; }
.section-head { justify-content: space-between; margin-bottom: 18px; }
.section-head > div { min-width: 0; }
.section-head h2 { font-size: 18px; }
.full { width: 100%; }
.readiness-list { display: grid; gap: 10px; }
.readiness-item { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; padding: 12px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.2); }
.readiness-item svg { margin-top: 2px; color: var(--app-text-muted); }
.readiness-item strong, .readiness-item span { display: block; overflow-wrap: anywhere; }
.readiness-item span { margin-top: 5px; color: var(--app-text-muted); font-size: 12px; line-height: 1.6; }
.readiness-item--ready { border-color: rgba(22, 163, 74, 0.28); }
.readiness-item--ready svg { color: #22c55e; }
.readiness-item--risk { border-color: rgba(245, 158, 11, 0.38); }
.readiness-item--risk svg { color: #f59e0b; }
.readiness-item--todo svg { color: #60a5fa; }
.source-facts { display: grid; gap: 10px; margin: 0; }
.source-facts div { min-width: 0; padding: 10px 12px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.2); }
.source-facts dt { color: var(--app-text-muted); font-size: 12px; }
.source-facts dd { margin: 5px 0 0; overflow-wrap: anywhere; }
.experiment-form { display: grid; gap: 14px; }
.input-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.jd-preview { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) auto; gap: 12px; align-items: center; padding: 14px; border: 1px solid rgba(37, 99, 235, 0.24); border-radius: 8px; background: rgba(37, 99, 235, 0.08); }
.jd-preview span, .jd-preview small { display: block; color: var(--app-text-muted); font-size: 12px; }
.jd-preview strong { display: block; margin: 4px 0; overflow-wrap: anywhere; }
.jd-preview p { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
.launch-panel { display: grid; gap: 10px; padding: 14px; border: 1px solid rgba(6, 182, 212, 0.22); border-radius: 8px; background: rgba(6, 182, 212, 0.07); }
.launch-panel p { margin: 0; font-size: 12px; }
.submit-row { flex-wrap: wrap; margin-top: 18px; }
.launch-panel .submit-row { margin-top: 0; }
.match-version-notice { display: grid; gap: 12px; }
.version-entry-actions { display: flex; flex-wrap: wrap; gap: 10px; }
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
.quality-gate-alert { margin: 8px 0 10px; }
.quality-gate-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: -2px 0 12px; }
.quality-gate-actions :deep(.el-button) { margin-left: 0; }
.reports-panel { align-self: stretch; }
.report-list { min-height: 220px; display: grid; gap: 12px; }
.report-card { display: grid; grid-template-columns: minmax(0, 1fr) auto 54px; gap: 12px; align-items: center; width: 100%; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.34); color: var(--app-text); text-align: left; cursor: pointer; }
.report-card strong, .report-card small { display: block; overflow-wrap: anywhere; }
.report-card small { margin-top: 5px; color: var(--app-text-muted); }
.report-card .report-error { color: #fca5a5; }
.report-card .report-evidence { font-size: 12px; line-height: 1.5; }
.report-card .report-warning { color: #fbbf24; font-size: 12px; line-height: 1.5; }
.report-card b { text-align: right; font-size: 22px; }
@media (max-width: 1180px) { .match-layout { grid-template-columns: 1fr 1fr; } .reports-panel { grid-column: 1 / -1; } .experiment-flow { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 960px) { .page-hero, .match-layout { grid-template-columns: 1fr; flex-direction: column; } .hero-actions { flex-wrap: wrap; } .input-grid, .jd-preview { grid-template-columns: 1fr; } .reports-panel { grid-column: auto; } }


@media (max-width: 720px) {
  .page-hero, .match-layout { flex-direction: column; align-items: stretch; }
  .experiment-flow { grid-template-columns: 1fr; }
  .hero-actions, .version-entry-actions, .submit-row { flex-wrap: wrap; }
  .hero-actions :deep(.el-button), .version-entry-actions :deep(.el-button), .submit-row :deep(.el-button), .jd-preview :deep(.el-button) { width: 100%; margin-left: 0; }
  .report-card { grid-template-columns: minmax(0, 1fr); }
  .report-card b { text-align: left; }
}
</style>
