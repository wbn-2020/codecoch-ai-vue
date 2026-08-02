<template>
  <div class="arena arena-match v3-page match-entry-page">
    <section v-if="!entryResolved || redirectingToLatestReport" class="match-state-card match-route-resolving">
      <AppState
        type="loading"
        :title="redirectingToLatestReport ? '正在打开最近的匹配报告' : '正在确认最近的匹配报告'"
        :description="redirectingToLatestReport ? '已找到可继续使用的报告，正在进入覆盖率和短板结算页。' : '先确认是否已有可继续使用的报告，避免重复回到新建工作台。'"
      />
    </section>

    <template v-else>
      <header class="match-entry-head">
        <div>
          <div class="arena-kicker">第 3 关 · 新建 JD 匹配</div>
          <h1 class="arena-h1">为这份岗位做一次对账 🔍</h1>
          <p class="arena-p">选择一份简历和目标岗位，生成覆盖率、缺口和下一步训练建议。</p>
        </div>
        <div class="match-entry-head__actions">
          <el-button @click="router.push('/resumes')"><FileText :size="16" /> 选择简历</el-button>
          <el-button @click="router.push('/job-targets')"><Crosshair :size="16" /> 管理岗位</el-button>
        </div>
      </header>

      <el-alert
        v-if="loadError"
        class="match-state-card"
        type="error"
        show-icon
        :closable="false"
        title="基础数据加载失败"
        :description="loadError"
      >
        <el-button type="primary" @click="loadInitial">重新加载</el-button>
      </el-alert>
      <el-alert
        v-else-if="partialLoadWarning"
        class="match-warning"
        type="warning"
        show-icon
        :closable="false"
        title="部分基础数据暂时不可用"
        :description="partialLoadWarning"
      />

      <section class="match-entry-grid" v-loading="loading">
        <main class="match-entry-main">
          <section class="arena-card match-input-card">
            <div class="arena-between">
              <div>
                <span class="arena-kicker">开始一次匹配</span>
                <h2 class="arena-h2">选择简历和目标岗位</h2>
              </div>
              <span class="arena-chip" :class="canSubmit ? 'arena-chip--grn' : 'arena-chip--amber'">
                {{ canSubmit ? '可以开始' : '需要补资料' }}
              </span>
            </div>

            <el-alert
              v-if="isVersionEntry"
              class="match-version-notice"
              type="info"
              show-icon
              :closable="false"
              title="已从简历版本进入匹配"
              :description="versionSourceNotice"
            />

            <el-form label-position="top" class="match-input-form">
              <div class="match-input-form__grid">
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
              </div>

              <div class="match-jd-preview">
                <div>
                  <span>当前 JD</span>
                  <strong>{{ selectedTargetMeta.title }}</strong>
                  <small>{{ selectedTargetMeta.company }}</small>
                </div>
                <p>{{ selectedTargetMeta.analysis }}</p>
                <el-button text type="primary" :disabled="!form.targetJobId" @click="goSelectedTargetAnalysis">查看岗位分析</el-button>
              </div>

              <el-alert
                v-if="versionResumeMismatch || matchQualityIssues.length"
                class="match-quality-alert"
                type="warning"
                show-icon
                :closable="false"
                :title="versionResumeMismatch ? '请确认简历版本' : '用于 AI 匹配前请先补齐资料'"
                :description="versionResumeMismatch ? '当前简历与入口版本不一致，请返回版本页重新选择。' : matchQualityDescription"
              />

              <div class="match-input-card__actions">
                <el-checkbox v-model="form.forceRefresh">重新生成一份报告</el-checkbox>
                <div class="arena-row">
                  <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submitMatch">
                    <Sparkles :size="16" /> 生成匹配报告
                  </el-button>
                  <el-button :loading="loading" @click="loadInitial"><RefreshCw :size="16" /> 刷新</el-button>
                </div>
              </div>
            </el-form>

            <AppState
              v-if="!loading && (!resumes.length || !targets.length)"
              class="match-empty-state"
              type="empty"
              title="缺少匹配输入"
              :description="!resumes.length ? '还没有可用简历，请先创建或上传简历。' : '还没有目标岗位，请先创建岗位目标并分析岗位描述。'"
            />
          </section>

          <details v-if="matchSseStatus !== 'idle' || matchSseEvents.length" class="arena-card match-stream">
            <summary>匹配生成进度 <span>{{ sseStatusLabel(matchSseStatus) }}</span></summary>
            <div class="match-stream__body">
              <strong>{{ latestMatchSseMessage }}</strong>
              <p v-if="matchSseError">{{ matchSseError }}</p>
              <div v-if="recentMatchSseEvents.length" class="match-stream__events">
                <span v-for="item in recentMatchSseEvents" :key="item.key">{{ matchSseEventText(item) }}</span>
              </div>
              <div v-if="matchTaskRoute" class="arena-between">
                <span>{{ matchTaskHint }}</span>
                <el-button size="small" text type="primary" @click="goMatchTaskCenter">去任务中心查看</el-button>
              </div>
              <div v-if="matchRecoveryVisible" class="arena-between">
                <span>{{ matchRecoveryHint }}</span>
                <el-button size="small" text type="primary" :loading="reportsLoading" @click="refreshMatchReportsAfterInterrupt">刷新最近报告</el-button>
              </div>
            </div>
          </details>
        </main>

        <aside class="match-entry-side">
          <section class="arena-card match-readiness-card">
            <div class="arena-between">
              <div>
                <span class="arena-kicker">投前准备</span>
                <h2 class="arena-h3">材料准备度</h2>
              </div>
              <span class="arena-chip" :class="`arena-chip--${readinessTagType === 'success' ? 'grn' : 'amber'}`">{{ readinessTagText }}</span>
            </div>
            <p class="arena-tiny">{{ readinessSummary }}</p>
            <div class="match-readiness-list">
              <div v-for="item in readinessItems" :key="item.key" class="match-readiness-item">
                <component :is="item.icon" :size="16" />
                <span><b>{{ item.title }}</b>{{ item.desc }}</span>
              </div>
            </div>
            <div v-if="matchQualityIssues.length" class="arena-col match-readiness-actions">
              <el-button text type="primary" :disabled="!form.resumeId" @click="goSelectedResumeEdit">补简历信息</el-button>
              <el-button text type="primary" :disabled="!form.resumeId" @click="goSelectedResumeProjects">补项目经历</el-button>
              <el-button text type="primary" :disabled="!form.targetJobId" @click="goSelectedTargetAnalysis">分析岗位</el-button>
            </div>
          </section>

          <section class="arena-card match-next-card">
            <span class="arena-chip arena-chip--grn-solid">匹配后会得到</span>
            <h2 class="arena-h3">覆盖率、缺口和押题方向</h2>
            <p class="arena-tiny">结果页会直接给出缺失技能点和下一组训练入口。</p>
          </section>

          <details class="arena-card match-support-details">
            <summary>资料与历史报告</summary>
            <div class="match-support-details__body">
              <div class="match-version-summary">
                <div class="arena-between">
                  <b>简历版本来源</b>
                  <span class="arena-chip">{{ isVersionEntry ? '版本已绑定' : '使用当前简历' }}</span>
                </div>
                <p>{{ versionSourceNotice }}</p>
                <dl>
                  <div><dt>简历</dt><dd>{{ selectedResumeMeta.title }}</dd></div>
                  <div><dt>版本</dt><dd>{{ selectedResumeMeta.version }}</dd></div>
                  <div><dt>项目证据</dt><dd>{{ selectedResumeMeta.projects }}</dd></div>
                </dl>
                <div class="arena-row">
                  <el-button size="small" :disabled="!form.resumeId" @click="goSelectedResumeEdit">编辑简历</el-button>
                  <el-button size="small" :disabled="!form.resumeId" @click="goSelectedResumeVersions">版本记录</el-button>
                </div>
              </div>

              <div class="match-history">
                <div class="arena-between">
                  <b>历史报告</b>
                  <el-button text size="small" :loading="reportsLoading" @click="loadReports">刷新</el-button>
                </div>
                <div v-loading="reportsLoading" class="match-history__list">
                  <AppState v-if="reportsError" type="error" title="匹配报告加载失败" :description="reportsError">
                    <el-button type="primary" @click="loadReports">重试</el-button>
                  </AppState>
                  <AppState v-else-if="!reports.length" type="empty" title="还没有匹配报告" :description="emptyReportStateDescription">
                    <el-button type="primary" :disabled="emptyReportPrimaryDisabled" :loading="submitting" @click="handleEmptyReportPrimaryAction">{{ emptyReportPrimaryActionLabel }}</el-button>
                  </AppState>
                  <button v-for="report in reports" v-else :key="report.reportId" class="match-history__item" type="button" @click="router.push({ path: `/resume-match/${report.reportId}`, query: matchReportRouteQuery(report) })">
                    <span><b>{{ report.jobTitle || '未命名岗位' }}</b><small>{{ report.resumeTitle || '未命名简历' }} · {{ formatDateTime(report.updatedAt || report.createdAt) }}</small></span>
                    <strong>{{ reportScoreText(report) }}</strong>
                  </button>
                </div>
              </div>
            </div>
          </details>
        </aside>
      </section>
    </template>
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
const entryResolved = ref(false)
const redirectingToLatestReport = ref(false)
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
const isNewMatchEntry = computed(() => route.query.new === '1')
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
const emptyReportStateDescription = computed(() => {
  if (!form.resumeId && !form.targetJobId) return '先选择一份简历和一个岗位描述，再点击“生成 JD 匹配报告”。报告生成后，详情页会展示真实返回的匹配度、差距、风险和训练入口。'
  if (!form.resumeId) return '还缺少实验简历。先创建或选择简历，再回到这里选择 JD 并生成报告。'
  if (!form.targetJobId) return '还缺少岗位描述。先选择或补充岗位目标，再生成报告。'
  if (versionResumeMismatch.value) return '当前版本入口和所选简历不一致。请返回简历版本页重新选择，或使用入口绑定的原简历后再生成报告。'
  if (matchQualityIssues.value.length) return `当前资料还不适合生成报告：${matchQualityIssues.value.join('、')}。补齐后再生成，避免空报告或低置信结论。`
  return '简历和 JD 已就绪，可以生成一份报告；生成完成后会出现在这里，详情页再承接学习计划、岗位面试和短板题组。'
})
const emptyReportPrimaryActionLabel = computed(() => {
  if (!form.resumeId) return '先创建简历'
  if (!form.targetJobId) return '先选择 JD'
  if (versionResumeMismatch.value) return '返回版本记录'
  if (matchQualityIssues.value.length) return '先补齐资料'
  return '生成 JD 匹配报告'
})
const emptyReportPrimaryDisabled = computed(() =>
  Boolean(submitting.value)
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

const handleEmptyReportPrimaryAction = () => {
  if (!form.resumeId) {
    router.push('/resumes/create')
    return
  }
  if (!form.targetJobId) {
    router.push('/job-targets')
    return
  }
  if (versionResumeMismatch.value) {
    goSelectedResumeVersions()
    return
  }
  if (matchQualityIssues.value.length) {
    ElMessage.warning(matchQualityDescription.value)
    return
  }
  void submitMatch()
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
const routeToLatestCompletedReport = async () => {
  if (isNewMatchEntry.value) return false
  const routeTargetJobId = Number(route.query.targetJobId)
  const hasScopedEntry = Boolean(
    routeResumeId.value
    || (Number.isFinite(routeTargetJobId) && routeTargetJobId > 0)
    || versionSourceId.value
  )
  const latestReport = reports.value.find((item) =>
    item.status === 'SUCCESS'
    && item.reportId
    && (!hasScopedEntry || (
      (!routeResumeId.value || item.resumeId === routeResumeId.value)
      && (!(Number.isFinite(routeTargetJobId) && routeTargetJobId > 0) || item.targetJobId === routeTargetJobId)
      && (!versionSourceId.value || item.resumeVersionId === versionSourceId.value)
    ))
  )
  if (!latestReport) return false

  redirectingToLatestReport.value = true
  try {
    await router.replace({
      path: `/resume-match/${latestReport.reportId}`,
        query: matchReportRouteQuery(latestReport)
      })
    return true
  } catch {
    redirectingToLatestReport.value = false
    return false
  }
}

const waitForLatestReportDecision = async () => {
  const reportLoad = loadReports().then(() => true).catch(() => false)
  const timedOut = new Promise<false>((resolve) => {
    window.setTimeout(() => resolve(false), 5000)
  })
  const reportsReady = await Promise.race([reportLoad, timedOut])
  return reportsReady ? routeToLatestCompletedReport() : false
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
  void loadInitial()
  const redirected = await waitForLatestReportDecision()
  if (!redirected) {
    entryResolved.value = true
  }
})
onBeforeUnmount(stopMatchSse)
</script>

<style scoped lang="scss">
.match-entry-page {
  width: min(990px, 100%);
  margin: 0 auto;
  padding: 30px 24px 48px;
}

.match-entry-head,
.match-entry-head__actions,
.match-entry-grid,
.match-input-card__actions,
.match-input-form__grid,
.match-entry-side,
.match-readiness-list,
.match-stream__body,
.match-support-details__body,
.match-history__list {
  display: grid;
  gap: 16px;
}

.match-entry-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  margin-bottom: 22px;
}

.match-entry-head__actions {
  grid-auto-flow: column;
  gap: 8px;
}

.arena-kicker {
  color: var(--arena-grn-d);
  font-size: 12.5px;
  font-weight: 800;
}

.arena-h1,
.arena-h2,
.arena-h3,
strong,
b {
  color: var(--arena-ink);
}

.arena-h1 {
  margin: 5px 0 0;
}

.arena-p,
.arena-tiny,
.match-jd-preview p,
.match-version-summary p {
  color: var(--arena-sub);
}

.match-entry-grid {
  grid-template-columns: minmax(0, 1.48fr) minmax(280px, 0.92fr);
  align-items: start;
}

.match-entry-main,
.match-entry-side {
  min-width: 0;
}

.arena-card,
.match-state-card {
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: #fff;
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.match-route-resolving {
  display: grid;
  min-height: 240px;
  place-items: center;
  padding: 22px;
}

.match-input-card {
  padding: 24px 26px;
}

.match-input-form {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.match-input-form__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.full {
  width: 100%;
}

.match-jd-preview {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1.5px solid #b9e7cd;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0fbf4, #fff 70%);
}

.match-jd-preview span,
.match-jd-preview small,
.match-jd-preview strong {
  display: block;
}

.match-jd-preview span,
.match-jd-preview small {
  color: var(--arena-sub);
  font-size: 12px;
}

.match-jd-preview strong {
  margin: 4px 0;
}

.match-jd-preview p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
}

.match-input-card__actions {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.match-quality-alert,
.match-version-notice {
  margin: 0;
}

.match-empty-state {
  margin-top: 4px;
}

.match-readiness-card,
.match-next-card {
  padding: 18px 20px;
}

.match-readiness-card .arena-tiny,
.match-next-card .arena-tiny {
  margin: 8px 0 0;
  line-height: 1.6;
}

.match-readiness-list {
  gap: 9px;
  margin-top: 14px;
}

.match-readiness-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  padding: 9px 0;
  border-bottom: 1px solid var(--arena-line);
  color: var(--arena-grn-d);
}

.match-readiness-item:last-child {
  border-bottom: 0;
}

.match-readiness-item span {
  display: grid;
  gap: 2px;
  color: var(--arena-sub);
  font-size: 12px;
  line-height: 1.45;
}

.match-readiness-item b {
  font-size: 12.5px;
}

.match-readiness-actions {
  gap: 2px;
  margin-top: 8px;
}

.match-next-card {
  border-color: #b9e7cd;
  background: linear-gradient(135deg, #f0fbf4, #fff 74%);
}

.match-next-card .arena-h3 {
  margin: 12px 0 0;
}

.match-support-details,
.match-stream {
  overflow: hidden;
}

.match-support-details summary,
.match-stream summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  list-style: none;
  padding: 14px 17px;
  color: var(--arena-ink);
  font-size: 13px;
  font-weight: 800;
}

.match-support-details summary::-webkit-details-marker,
.match-stream summary::-webkit-details-marker {
  display: none;
}

.match-support-details summary::after,
.match-stream summary::after {
  content: '+';
  color: var(--arena-grn-d);
}

.match-support-details[open] summary::after,
.match-stream[open] summary::after {
  content: '-';
}

.match-support-details__body,
.match-stream__body {
  gap: 14px;
  padding: 0 17px 17px;
  border-top: 1px solid var(--arena-line);
}

.match-version-summary,
.match-history {
  display: grid;
  gap: 10px;
}

.match-version-summary p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.match-version-summary dl {
  display: grid;
  gap: 6px;
  margin: 0;
}

.match-version-summary dl div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.match-version-summary dt {
  color: var(--arena-mut);
}

.match-version-summary dd {
  margin: 0;
  color: var(--arena-sub);
  text-align: right;
}

.match-history__list {
  gap: 8px;
}

.match-history__item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--arena-line);
  background: transparent;
  color: var(--arena-ink);
  text-align: left;
  cursor: pointer;
}

.match-history__item span {
  min-width: 0;
}

.match-history__item b,
.match-history__item small {
  display: block;
}

.match-history__item small {
  margin-top: 3px;
  color: var(--arena-mut);
  font-size: 11px;
}

.match-history__item strong {
  color: var(--arena-grn-d);
  font-size: 14px;
}

.match-stream {
  margin-top: 14px;
  border-color: #d7ccff;
  background: #fbfaff;
}

.match-stream summary span,
.match-stream__body p {
  color: var(--arena-sub);
  font-size: 12px;
}

.match-stream__events {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.match-stream__events span {
  padding: 4px 7px;
  border-radius: 999px;
  background: #f2f4f2;
  color: var(--arena-sub);
  font-size: 11px;
}

:deep(.el-button--primary) {
  border-color: var(--arena-grn);
  background: var(--arena-grn);
  box-shadow: 0 4px 0 var(--arena-grn-d);
  font-weight: 800;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1.5px var(--arena-line) inset;
}

@media (max-width: 800px) {
  .match-entry-page {
    padding: 18px 14px calc(28px + var(--user-mobile-nav-height, 0px));
  }

  .match-entry-head,
  .match-entry-grid,
  .match-input-form__grid,
  .match-jd-preview,
  .match-input-card__actions {
    grid-template-columns: 1fr;
  }

  .match-entry-head__actions {
    grid-auto-flow: row;
  }

  .match-entry-head__actions :deep(.el-button),
  .match-input-card__actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .match-input-card {
    padding: 19px 16px;
  }
}
</style>
