<template>
  <div class="resume-center page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <FileText :size="16" />
          我的简历
        </p>
        <h1>我的简历</h1>
        <p>集中管理简历、导入文件和查看 AI 建议，把简历准备串成一条更清晰的求职路径。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/resumes/create')">
            <Plus :size="17" />
            新建简历
          </el-button>
          <el-button size="large" :loading="uploading" @click="triggerUpload">
            <UploadCloud :size="17" />
            上传简历
          </el-button>
          <el-button size="large" text @click="router.push('/dashboard')">
            <ArrowLeft :size="17" />
            回到今日计划
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="hero-panel__stat">
          <span>简历管理</span>
          <strong>可创建和编辑</strong>
        </div>
        <div class="hero-panel__stat">
          <span>文件导入</span>
          <strong :class="uploadStatusClass">{{ uploadStatusText }}</strong>
        </div>
        <div class="hero-panel__stat">
          <span>AI 建议</span>
          <strong>最近建议可查看</strong>
        </div>
      </div>
    </section>

    <section class="metric-grid resume-metrics">
      <article class="metric-card">
        <div class="metric-card__label">简历总数</div>
        <div class="metric-card__value">{{ total }}</div>
        <p>当前账号已创建的简历数量</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近更新时间</div>
        <div class="metric-card__value is-date">{{ latestUpdatedAt }}</div>
        <p>最近一次编辑或上传时间</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">上传解析状态</div>
        <div class="metric-card__value is-date">{{ uploadStatusText }}</div>
          <p>{{ parseStatusMessage || '等待上传文件后更新解析状态' }}</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近建议记录</div>
        <div class="metric-card__value is-date">{{ latestOptimizeStatus }}</div>
        <p>展示最近一次建议状态，失败时可打开记录查看原因</p>
      </article>
    </section>

    <section class="content-card cc-glass upload-workbench">
      <div class="upload-panel">
        <div>
          <div class="section-title">
            <UploadCloud :size="18" />
            <h2>导入与解析</h2>
          </div>
          <p>支持 PDF、DOC、DOCX、MD、TXT 等格式。上传后系统会异步解析，状态会在这里更新。</p>
        </div>
        <el-upload
          ref="uploadRef"
          class="resume-upload"
          drag
          :accept="RESUME_UPLOAD_ACCEPT"
          :auto-upload="false"
          :before-upload="beforeResumeUpload"
          :limit="1"
          :show-file-list="false"
          :on-change="handleFileChange"
          :disabled="uploading || parsePolling"
        >
          <div class="upload-drop">
            <UploadCloud :size="28" />
            <strong>{{ uploading ? '上传中...' : '选择简历文件' }}</strong>
            <span>上传后会生成解析任务，完成后可确认生成简历</span>
          </div>
        </el-upload>
      </div>

      <div class="pipeline-status">
        <div v-for="item in uploadSteps" :key="item.key" class="pipeline-step" :class="{ active: item.active, done: item.done, error: item.error }">
          <span>{{ item.index }}</span>
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>

      <el-alert
        v-if="uploadError"
        class="resume-alert compact"
        type="error"
        :closable="false"
        show-icon
        title="上传或解析失败"
        :description="uploadError"
      />

      <div v-if="parseTask" class="task-card">
        <div>
          <span>本次解析进度</span>
          <strong>{{ parseStatusText(parseTask.parseStatus) }}</strong>
          <p>{{ parseStatusMessage || '等待解析状态更新' }}</p>
          <div v-if="parseTask.asyncMessageId || parseTask.asyncTraceId || parseTask.asyncSendStatus" class="task-diagnostics">
            <span v-if="parseTask.asyncMessageId">处理进度已提交</span>
            <span v-if="parseTask.asyncTraceId">处理线索已记录</span>
            <span v-if="parseTask.asyncSendStatus">{{ asyncSendStatusText(parseTask.asyncSendStatus) }}</span>
            <span v-if="parseTask.asyncBizType && parseTask.asyncBizId">
              可在任务中心继续查看
            </span>
          </div>
        </div>
        <div class="task-actions">
          <el-button :loading="parsePolling" @click="refreshParseStatus(parseTask.analysisRecordId)">刷新进度</el-button>
          <el-button plain @click="goParseTaskCenter(parseTask)">
            <ListChecks :size="15" />
            任务中心
          </el-button>
          <el-button
            v-if="parseTask.parseStatus === 'WAIT_CONFIRM' || parseTask.parseStatus === 'SUCCESS'"
            type="primary"
            @click="openParseResult(parseTask.analysisRecordId)"
          >
            查看解析结果
          </el-button>
          <el-button
            v-if="parseTask.parseStatus === 'FAILED'"
            :loading="parsePolling"
            @click="handleReparse(parseTask.analysisRecordId)"
          >
            再次解析
          </el-button>
        </div>
      </div>
    </section>

    <section class="content-card cc-glass resume-workspace">
      <div class="content-card__body workspace-toolbar">
        <div>
          <p class="section-kicker">我的简历</p>
          <h2>简历资料</h2>
          <p>维护简历、项目经历和面试上下文，优先补齐能支撑面试表达的内容。</p>
        </div>
        <el-form class="search-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input
              v-model.trim="query.keyword"
              clearable
              placeholder="简历名称 / 求职方向"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <Search :size="15" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">筛选</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        v-if="loadError"
        class="resume-alert"
        type="error"
        :closable="false"
        show-icon
        title="简历加载失败"
        :description="loadError"
      />

      <el-alert
        v-if="optimizeRecordsLoadError"
        class="resume-alert optimize-records-alert"
        type="warning"
        :closable="false"
        show-icon
        title="建议记录加载失败，请稍后重试"
      />

      <div v-if="optimizeRecoveryMessage" class="resume-alert optimize-recovery-card">
        <div>
          <strong>{{ optimizeTask ? '建议任务已提交' : '建议生成进度中断' }}</strong>
          <p>{{ optimizeRecoveryMessage }}</p>
        </div>
        <el-button
          v-if="optimizeTask"
          size="small"
          type="primary"
          plain
          @click="goOptimizeTaskCenter(optimizeTask)"
        >
          查看任务中心
        </el-button>
        <el-button size="small" :loading="optimizeRecordsRefreshing" @click="refreshOptimizeRecords">
          刷新最近记录
        </el-button>
      </div>

      <div class="resume-list" v-loading="loading">
        <div v-if="!loading && !loadError && resumes.length === 0" class="empty-state">
          <div class="empty-icon">
            <FilePlus2 :size="32" />
          </div>
          <h3>还没有可用于面试训练的简历</h3>
          <p>可以手动创建，也可以导入简历文件，等解析完成后再确认生成结构化简历。</p>
          <div class="empty-actions">
            <el-button type="primary" @click="router.push('/resumes/create')">新建简历</el-button>
            <el-button :loading="uploading" @click="triggerUpload">上传简历</el-button>
          </div>
        </div>

        <div v-else-if="!loadError" class="resume-card-grid">
          <article v-for="item in resumes" :key="item.id" class="resume-card">
            <div class="resume-card__header">
              <div class="resume-title-block">
                <div class="resume-icon">
                  <BriefcaseBusiness :size="20" />
                </div>
                <div>
                  <h3>{{ item.resumeName || item.title || '未命名简历' }}</h3>
                  <p>{{ item.targetPosition || '未填写求职方向' }}</p>
                </div>
              </div>
              <div class="resume-tags">
                <el-tag v-if="item.isDefault === 1" type="success" effect="plain">默认</el-tag>
                <StatusTag :status="item.status" />
              </div>
            </div>

            <div class="resume-card__meta">
              <span>
                <Clock3 :size="14" />
                {{ formatDateTime(item.updatedAt || item.createdAt) }}
              </span>
              <span>
                <Layers3 :size="14" />
                项目经历 {{ item.projectCount || 0 }} 个
              </span>
              <span>
                <TimerReset :size="14" />
                工作年限 --
              </span>
            </div>

            <p class="resume-summary">{{ item.summary || item.workExperience || '暂无简历摘要，请在编辑页补充个人优势、项目背景和求职目标。' }}</p>

            <div class="skill-stack">
              <template v-if="splitSkills(item.skills || item.skillStack).length">
                <span v-for="skill in splitSkills(item.skills || item.skillStack).slice(0, 8)" :key="skill">
                  {{ skill }}
                </span>
              </template>
              <span v-else class="is-placeholder">暂未填写技术栈</span>
            </div>

            <div class="resume-card__status">
              <div>
                <span>解析来源</span>
                <strong>已入库</strong>
              </div>
              <div>
                <span>AI 建议</span>
                <strong :class="{ success: latestRecord(item.id)?.optimizeStatus === 'SUCCESS', danger: latestRecord(item.id)?.optimizeStatus === 'FAILED' }">
                  {{ optimizeStatusText(latestRecord(item.id)?.optimizeStatus) }}
                </strong>
              </div>
            </div>

            <div v-if="latestOptimizeSummary(item.id)" class="optimize-summary">
              {{ latestOptimizeSummary(item.id) }}
            </div>
            <div v-else-if="optimizingId === item.id" class="optimize-summary">
              正在生成建议，可以停留等待；离开后也能回到本页刷新最近记录。
            </div>

            <div class="resume-card__actions">
              <el-button type="primary" plain @click="router.push(`/resumes/${item.id}/edit`)">
                <Eye :size="15" />
                编辑
              </el-button>
              <el-button @click="router.push('/interviews/create')">
                <MessagesSquare :size="15" />
                去面试
              </el-button>
              <el-button :loading="optimizingId === item.id" @click="handleOptimize(item)">
                <Sparkles :size="15" />
                AI 建议
              </el-button>
              <el-button :disabled="!latestRecord(item.id)" @click="openOptimizeDetail(latestRecord(item.id)?.optimizeRecordId)">
                <GitCompareArrows :size="15" />
                查看对比
              </el-button>
              <el-dropdown trigger="click">
                <el-button text>
                  <MoreHorizontal :size="16" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :disabled="item.isDefault === 1" @click="handleSetDefault(item)">
                      设为默认
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleDelete(item)">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </article>
        </div>
      </div>

      <div v-if="!loadError && total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchResumes"
        />
      </div>
    </section>

    <el-drawer v-model="parseDrawerVisible" title="简历解析结果" size="520px" class="resume-v2-drawer">
      <div v-if="parseResult" class="drawer-panel">
        <div class="drawer-status">
          <StatusTag :status="parseResult.parseStatus" :map="parseStatusMap" />
          <span>本次解析结果</span>
        </div>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="已做脱敏展示"
          description="这里只展示解析要点，不展开完整简历内容。"
        />
        <el-alert
          v-if="parseResult.errorMessage"
          type="error"
          :closable="false"
          show-icon
          title="解析失败"
          :description="toFriendlyMessage(parseResult.errorMessage, '简历解析失败，请稍后重试。')"
        />
        <div class="resume-parse-preview">
          <h3>解析要点</h3>
          <div v-if="structuredParseSections.length" class="resume-parse-sections">
            <article v-for="section in structuredParseSections" :key="section.title">
              <strong>{{ section.title }}</strong>
              <ul>
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
          <p v-else class="resume-parse-empty">
            暂未识别到可展示要点，可以先确认原简历，或重新上传更清晰的文件后再解析。
          </p>
        </div>
        <div class="drawer-actions">
          <el-button @click="parseDrawerVisible = false">关闭</el-button>
          <el-button
            type="primary"
            :disabled="parseResult.parseStatus !== 'WAIT_CONFIRM'"
            :loading="confirmingParse"
            @click="handleConfirmParse"
          >
            确认生成简历
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="optimizeDrawerVisible" title="AI 建议对比" size="620px" class="resume-v2-drawer">
      <div v-if="optimizeDetail" class="drawer-panel">
        <div class="drawer-status">
          <StatusTag :status="optimizeDetail.optimizeStatus" />
          <span>处理线索已记录</span>
        </div>
        <el-alert
          v-if="optimizeDetail.errorMessage"
          type="error"
          :closable="false"
          show-icon
          title="AI 建议失败"
          :description="toFriendlyMessage(optimizeDetail.errorMessage, 'AI 建议失败，请稍后重试。')"
        />
        <div class="score-strip">
          <div>
            <span>综合评分</span>
            <strong>{{ optimizeDetail.overallScore ?? '--' }}</strong>
          </div>
          <p>{{ optimizeDetail.overallComment || '暂未返回整体评价。' }}</p>
        </div>
        <div class="diff-toolbar">
          <span>已选择 {{ selectedOptimizeSuggestionIndexes.length }} / {{ optimizeSuggestions.length }} 个字段建议</span>
          <el-button text size="small" @click="selectAllOptimizeSuggestions">全选</el-button>
          <el-button text size="small" @click="selectedOptimizeSuggestionIndexes = []">清空</el-button>
        </div>
        <div class="diff-list">
          <article v-for="(item, index) in optimizeSuggestions" :key="index" class="diff-card">
            <div class="diff-head">
              <el-checkbox v-model="selectedOptimizeSuggestionIndexes" :label="index">
                {{ getOptimizeSuggestionFieldName(item, index) }}
              </el-checkbox>
              <el-tag v-if="item.fabricationRisk" type="warning" effect="plain">需核实真实性</el-tag>
            </div>
            <div class="diff-grid">
              <div class="diff-before">
                <span>优化前</span>
                <p>{{ item.before || '暂未返回优化前内容' }}</p>
              </div>
              <div class="diff-after">
                <span>优化后</span>
                <p>{{ item.after || '暂未返回改写建议' }}</p>
              </div>
            </div>
            <p class="diff-reason">{{ item.reason }}</p>
          </article>
        </div>
        <div v-if="optimizeDetail.nextActions?.length" class="next-actions">
          <h3>下一步动作</h3>
          <span v-for="action in optimizeDetail.nextActions" :key="action">{{ action }}</span>
        </div>
        <div class="drawer-actions">
          <el-button @click="optimizeDrawerVisible = false">关闭</el-button>
          <el-tooltip :content="applyOptimizeDisabledReason" placement="top" :disabled="canApplyOptimizeResult">
            <el-button
              type="primary"
              :disabled="!canApplyOptimizeResult"
              :loading="applyingOptimize"
              @click="handleApplyOptimizeResult"
            >
              应用建议 · 新建草稿
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { UploadFile, UploadInstance, UploadRawFile } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  GitCompareArrows,
  Layers3,
  ListChecks,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TimerReset,
  UploadCloud
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  applyResumeOptimizeResultApi,
  confirmResumeParseResultApi,
  deleteResumeApi,
  getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi,
  getResumeParseResultApi,
  getResumeParseTaskApi,
  getResumesApi,
  optimizeResumeApi,
  reparseResumeApi,
  setDefaultResumeApi,
  uploadResumeFileApi
} from '@/api/resume'
import StatusTag from '@/components/common/StatusTag.vue'
import type {
  ResumeAnalysisResultVO,
  ResumeJsonValue,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeSubmitVO,
  ResumeRewriteSuggestion,
  ResumeParseStatus,
  ResumeParseStatusVO,
  ResumeQueryDTO,
  ResumeVO
} from '@/types/resume'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const resumes = ref<ResumeVO[]>([])
const total = ref(0)
const uploadRef = ref<UploadInstance>()
const uploading = ref(false)
const uploadError = ref('')
const parseTask = ref<ResumeParseStatusVO | null>(null)
const parsePolling = ref(false)
const parsePollTimer = ref<ReturnType<typeof window.setTimeout> | null>(null)
const parseResult = ref<ResumeAnalysisResultVO | null>(null)
const parseDrawerVisible = ref(false)
const confirmingParse = ref(false)
const optimizingId = ref<number | null>(null)
const applyingOptimize = ref(false)
const optimizeRecords = ref<Record<number, ResumeOptimizeRecordVO[]>>({})
const optimizeRecordsLoadError = ref(false)
const optimizeRecordsRefreshing = ref(false)
const optimizeRecoveryMessage = ref('')
const optimizeTask = ref<ResumeOptimizeSubmitVO | null>(null)
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const optimizeDrawerVisible = ref(false)
const selectedOptimizeSuggestionIndexes = ref<number[]>([])
let optimizeRecordsRequestSeq = 0

const MAX_RESUME_UPLOAD_SIZE = 50 * 1024 * 1024
const RESUME_UPLOAD_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.md',
  '.txt',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain'
].join(',')
const RESUME_UPLOAD_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'md', 'txt'])
const RESUME_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain'
])

const query = reactive<ResumeQueryDTO>({
  keyword: '',
  pageNo: 1,
  pageSize: 10
})

const parseStatusMap: Record<string, string> = {
  PENDING: '待解析',
  PARSING: '解析中',
  WAIT_CONFIRM: '待确认',
  SUCCESS: '解析成功',
  FAILED: '解析失败'
}

const latestUpdatedAt = computed(() => {
  const sortedDates = resumes.value
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort()
  const latest = sortedDates[sortedDates.length - 1]
  return latest ? formatDateTime(latest) : '--'
})

const uploadStatusText = computed(() => {
  if (uploading.value) return '上传中'
  if (parsePolling.value) return '解析中'
  if (parseTask.value) return parseStatusText(parseTask.value.parseStatus)
  return '待上传'
})

const uploadStatusClass = computed(() => ({
  'is-muted': !parseTask.value,
  'is-success': parseTask.value?.parseStatus === 'SUCCESS',
  'is-danger': parseTask.value?.parseStatus === 'FAILED'
}))

const parseStatusMessage = computed(() => toFriendlyMessage(parseTask.value?.message || parseTask.value?.errorMessage, ''))

const allOptimizeRecords = computed(() => Object.values(optimizeRecords.value).flat())

const latestOptimizeStatus = computed(() => {
  if (optimizeRecordsLoadError.value) return '加载失败'
  const latest = allOptimizeRecords.value[0]
  return latest ? optimizeStatusText(latest.optimizeStatus) : '暂无记录'
})

const optimizeSuggestions = computed(() => optimizeDetail.value?.rewriteSuggestions || [])

const canApplyOptimizeResult = computed(() =>
  optimizeDetail.value?.optimizeStatus === 'SUCCESS' && selectedOptimizeSuggestionIndexes.value.length > 0
)

const applyOptimizeDisabledReason = computed(() => {
  if (!optimizeDetail.value) return '请选择一条优化记录'
  if (optimizeDetail.value.optimizeStatus !== 'SUCCESS') return '仅成功的优化记录可应用'
  if (!selectedOptimizeSuggestionIndexes.value.length) return '请至少选择一个字段建议'
  return ''
})

const getOptimizeSuggestionFieldName = (item: ResumeRewriteSuggestion, index: number) =>
  item.fieldName || item.fieldKey || item.projectName || item.section || `建议 ${index + 1}`

const getOptimizeSuggestionFieldKey = (item: ResumeRewriteSuggestion) =>
  item.fieldKey || item.section || item.fieldName || (item.projectName ? 'project' : undefined)

const selectAllOptimizeSuggestions = () => {
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const getSelectedOptimizeSuggestions = () =>
  selectedOptimizeSuggestionIndexes.value
    .filter((index) => index >= 0 && index < optimizeSuggestions.value.length)
    .map((index) => ({
      index,
      item: optimizeSuggestions.value[index]
    }))

const uploadSteps = computed(() => {
  const status = parseTask.value?.parseStatus
  return [
    {
      key: 'upload',
      index: '01',
      label: '文件上传',
      description: uploading.value ? '文件正在上传' : parseTask.value ? '文件已上传，等待解析' : '等待选择本地简历文件',
      active: uploading.value,
      done: Boolean(parseTask.value),
      error: false
    },
    {
      key: 'parse',
      index: '02',
      label: '异步解析',
      description: status ? parseStatusText(status) : '系统会提取文本并生成解析要点',
      active: status === 'PENDING' || status === 'PARSING',
      done: status === 'WAIT_CONFIRM' || status === 'SUCCESS',
      error: status === 'FAILED'
    },
    {
      key: 'confirm',
      index: '03',
      label: '确认生成',
      description: status === 'SUCCESS' ? '已确认生成结构化简历' : '需要你确认后才会生成简历，不会自动覆盖当前内容',
      active: status === 'WAIT_CONFIRM',
      done: status === 'SUCCESS',
      error: false
    }
  ]
})

const splitSkills = (value?: string) => {
  if (!value) return []
  return value
    .split(/[,\n;；、，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return toFriendlyMessage(error.message, fallback)
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message
    if (message) return toFriendlyMessage(message, fallback)
  }
  return fallback
}

const parseStatusText = (status?: ResumeParseStatus) => {
  if (!status) return '未解析'
  return parseStatusMap[status] || '状态待确认'
}

const asyncSendStatusText = (status?: string | null) => {
  const normalized = String(status || '').trim().toUpperCase()
  if (!normalized) return '提交进度待更新'
  const statusMap: Record<string, string> = {
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
  return statusMap[normalized] || '提交进度已更新'
}

const mergeParseTask = (next: ResumeParseStatusVO): ResumeParseStatusVO => {
  const current = parseTask.value
  return {
    ...next,
    asyncMessageId: next.asyncMessageId || current?.asyncMessageId,
    asyncTraceId: next.asyncTraceId || current?.asyncTraceId,
    asyncBizType: next.asyncBizType || current?.asyncBizType,
    asyncBizId: next.asyncBizId || current?.asyncBizId,
    asyncSendStatus: next.asyncSendStatus || current?.asyncSendStatus
  }
}

const buildParseTaskCenterQuery = (task: ResumeParseStatusVO) => {
  const query: Record<string, string> = {
    bizType: task.asyncBizType || 'resume.parse',
    bizId: task.asyncBizId || String(task.analysisRecordId)
  }
  if (task.asyncMessageId) query.messageId = task.asyncMessageId
  if (task.asyncTraceId) query.traceId = task.asyncTraceId
  return query
}

const goParseTaskCenter = (task: ResumeParseStatusVO) => {
  router.push({ path: '/agent/tasks', query: buildParseTaskCenterQuery(task) })
}

const buildOptimizeTaskCenterQuery = (task: ResumeOptimizeSubmitVO) => {
  const query: Record<string, string> = {
    bizType: task.asyncBizType || 'resume.optimize',
    bizId: task.asyncBizId || String(task.optimizeRecordId)
  }
  if (task.asyncMessageId) query.messageId = task.asyncMessageId
  if (task.asyncTraceId) query.traceId = task.asyncTraceId
  return query
}

const goOptimizeTaskCenter = (task: ResumeOptimizeSubmitVO) => {
  router.push({ path: '/agent/tasks', query: buildOptimizeTaskCenterQuery(task) })
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '建议生成中',
    SUCCESS: '建议已生成',
    FAILED: '建议生成失败'
  }
  return status ? map[status] || '状态待确认' : '暂无记录'
}

const latestRecord = (resumeId: number) => optimizeRecords.value[resumeId]?.[0]

const latestOptimizeSummary = (resumeId: number) => {
  const record = latestRecord(resumeId)
  const raw = record?.overallComment || record?.errorMessage
  return raw ? toFriendlyMessage(raw, '建议结果暂不可用，请稍后重试。') : ''
}

const resumeParseKeyLabels: Record<string, string> = {
  name: '姓名',
  realName: '姓名',
  gender: '性别',
  age: '年龄',
  phone: '电话',
  mobile: '电话',
  email: '邮箱',
  city: '城市',
  targetPosition: '目标岗位',
  expectedSalary: '期望薪资',
  education: '教育经历',
  school: '学校',
  degree: '学历',
  major: '专业',
  graduationYear: '毕业年份',
  skills: '技能',
  skillTags: '技能标签',
  workExperience: '工作经历',
  company: '公司',
  position: '职位',
  projectExperience: '项目经历',
  projectName: '项目名称',
  responsibilities: '职责',
  achievements: '成果',
  description: '说明',
  startDate: '开始时间',
  endDate: '结束时间',
  summary: '摘要',
  advantages: '优势',
  certificates: '证书',
  languages: '语言能力'
}

const isResumeParseRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const resumeParseKeyLabel = (key: string) =>
  resumeParseKeyLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim()

const formatStructuredResumeParseValue = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return toFriendlyMessage(value, value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const indent = '  '.repeat(depth)
  if (Array.isArray(value)) {
    if (!value.length) return ''
    return value
      .map((item, index) => {
        const formatted = formatStructuredResumeParseValue(item, depth + 1)
        if (!formatted) return ''
        return `${indent}${index + 1}. ${isResumeParseRecord(item) || Array.isArray(item) ? '\n' : ''}${formatted}`
      })
      .filter(Boolean)
      .join('\n')
  }

  if (isResumeParseRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const formatted = formatStructuredResumeParseValue(item, depth + 1)
        if (!formatted) return ''
        return `${indent}- ${resumeParseKeyLabel(key)}：${isResumeParseRecord(item) || Array.isArray(item) ? '\n' : ''}${formatted}`
      })
      .filter(Boolean)
      .join('\n')
  }

  return String(value)
}

interface ResumeParseSection {
  title: string
  items: string[]
}

const compactResumeParseItem = (value: unknown) =>
  formatStructuredResumeParseValue(value)
    .replace(/\n+/g, '；')
    .replace(/\s+/g, ' ')
    .replace(/；\s*；/g, '；')
    .trim()

const normalizeStructuredResumeValue = (value?: ResumeJsonValue | Record<string, ResumeJsonValue> | null): unknown => {
  if (!value) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }
  return value
}

const buildResumeParseSections = (value?: ResumeJsonValue | Record<string, ResumeJsonValue> | null): ResumeParseSection[] => {
  const normalized = normalizeStructuredResumeValue(value)
  if (!normalized) return []

  if (Array.isArray(normalized)) {
    const items = normalized.map((item) => compactResumeParseItem(item)).filter(Boolean).slice(0, 12)
    return items.length ? [{ title: '解析摘要', items }] : []
  }

  if (!isResumeParseRecord(normalized)) {
    const item = compactResumeParseItem(normalized)
    return item ? [{ title: '解析摘要', items: [item] }] : []
  }

  return Object.entries(normalized)
    .map(([key, item]) => {
      const title = resumeParseKeyLabel(key)
      const items = Array.isArray(item)
        ? item.map((entry) => compactResumeParseItem(entry)).filter(Boolean).slice(0, 8)
        : isResumeParseRecord(item)
          ? Object.entries(item)
            .map(([childKey, childValue]) => {
              const formatted = compactResumeParseItem(childValue)
              return formatted ? `${resumeParseKeyLabel(childKey)}：${formatted}` : ''
            })
            .filter(Boolean)
            .slice(0, 8)
          : [compactResumeParseItem(item)].filter(Boolean)
      return { title, items }
    })
    .filter((section) => section.items.length)
    .slice(0, 10)
}

const structuredParseSections = computed(() => buildResumeParseSections(parseResult.value?.structuredJson))

const fetchOptimizeRecords = async () => {
  const requestSeq = ++optimizeRecordsRequestSeq
  const resumeIds = resumes.value.map((resume) => resume.id)
  if (!resumeIds.length) {
    optimizeRecords.value = {}
    optimizeRecordsLoadError.value = false
    return
  }
  const results = await Promise.allSettled(
    resumeIds.map(async (resumeId) => {
      const records = await getResumeOptimizeRecordsApi(resumeId)
      return [resumeId, records] as const
    })
  )
  if (requestSeq !== optimizeRecordsRequestSeq) return
  let hasLoadError = false
  const entries = results.map((result, index) => {
    const resumeId = resumeIds[index]
    if (result.status === 'fulfilled') {
      return result.value
    }
    hasLoadError = true
    return [resumeId, []] as const
  })
  optimizeRecords.value = Object.fromEntries(entries)
  optimizeRecordsLoadError.value = hasLoadError
}

const refreshOptimizeRecords = async () => {
  optimizeRecordsRefreshing.value = true
  try {
    await fetchOptimizeRecords()
    if (allOptimizeRecords.value.length) {
      ElMessage.success('最近建议记录已刷新')
    } else {
      ElMessage.info('暂未发现新的建议记录')
    }
  } finally {
    optimizeRecordsRefreshing.value = false
  }
}

const fetchResumes = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getResumesApi(query)
    resumes.value = result.records || []
    total.value = result.total || 0
    optimizeRecords.value = {}
    optimizeRecordsLoadError.value = false
    void fetchOptimizeRecords()
  } catch (error) {
    optimizeRecordsRequestSeq += 1
    resumes.value = []
    total.value = 0
    optimizeRecords.value = {}
    optimizeRecordsLoadError.value = false
    loadError.value = getErrorMessage(error, '请稍后重试，或确认简历服务是否可用。')
  } finally {
    loading.value = false
  }
}

const triggerUpload = () => {
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click()
}

const beforeResumeUpload = (file: UploadRawFile) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const isAllowedType = RESUME_UPLOAD_EXTENSIONS.has(extension) || RESUME_UPLOAD_MIME_TYPES.has(file.type)
  if (!isAllowedType) {
    ElMessage.warning('仅支持上传 PDF、DOC、DOCX、MD、TXT 格式的简历文件')
    return false
  }

  if (file.size > MAX_RESUME_UPLOAD_SIZE) {
    ElMessage.warning('简历文件大小不能超过 50MB')
    return false
  }

  return true
}

const handleFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  uploadRef.value?.clearFiles()
  if (!file) return
  if (!beforeResumeUpload(file)) return
  uploading.value = true
  uploadError.value = ''
  parseTask.value = null
  try {
    const result = await uploadResumeFileApi(file)
    parseTask.value = {
      analysisRecordId: result.analysisRecordId,
      resumeId: result.resumeId,
      fileId: result.fileId,
      parseStatus: result.parseStatus,
      message: result.message,
      asyncMessageId: result.asyncMessageId,
      asyncTraceId: result.asyncTraceId,
      asyncBizType: result.asyncBizType,
      asyncBizId: result.asyncBizId,
      asyncSendStatus: result.asyncSendStatus
    }
    ElMessage.success(result.message || '上传成功，等待解析')
    startParsePolling(result.analysisRecordId)
  } catch (error) {
    uploadError.value = getErrorMessage(error, '上传失败，请检查文件格式或稍后重试。')
  } finally {
    uploading.value = false
  }
}

const stopParsePolling = () => {
  if (parsePollTimer.value) {
    window.clearTimeout(parsePollTimer.value)
    parsePollTimer.value = null
  }
  parsePolling.value = false
}

const startParsePolling = (analysisRecordId: number, attempt = 0) => {
  stopParsePolling()
  parsePolling.value = true
  parsePollTimer.value = window.setTimeout(async () => {
    try {
      const status = await getResumeParseTaskApi(analysisRecordId)
      parseTask.value = mergeParseTask(status)
      if (['WAIT_CONFIRM', 'SUCCESS', 'FAILED'].includes(status.parseStatus) || attempt >= 30) {
        parsePolling.value = false
        if (attempt >= 30 && !['WAIT_CONFIRM', 'SUCCESS', 'FAILED'].includes(status.parseStatus)) {
          uploadError.value = '解析状态查询已超时，可以手动刷新进度，或到任务中心继续查看。'
        }
        return
      }
      startParsePolling(analysisRecordId, attempt + 1)
    } catch (error) {
      parsePolling.value = false
      uploadError.value = getErrorMessage(error, '解析状态查询失败。')
    }
  }, attempt === 0 ? 1200 : 3000)
}

const refreshParseStatus = async (analysisRecordId: number) => {
  const status = await getResumeParseTaskApi(analysisRecordId)
  parseTask.value = mergeParseTask(status)
  if (status.parseStatus === 'WAIT_CONFIRM' || status.parseStatus === 'SUCCESS') {
    await openParseResult(analysisRecordId)
  }
}

const handleReparse = async (analysisRecordId: number) => {
  const result = await reparseResumeApi(analysisRecordId)
  parseTask.value = mergeParseTask(result)
  ElMessage.success(result.asyncMessageId ? '已重新开始解析，可在任务中心查看进度。' : '已重新开始解析')
  startParsePolling(analysisRecordId)
}

const openParseResult = async (analysisRecordId: number) => {
  parseResult.value = await getResumeParseResultApi(analysisRecordId)
  parseDrawerVisible.value = true
}

const handleConfirmParse = async () => {
  if (!parseResult.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '确认生成简历',
    action: '根据解析结果创建一份结构化简历',
    target: '本次简历解析结果',
    impact: '会把本次解析结果保存为新的结构化简历；不会覆盖正在编辑的简历内容，但后续可能被你设为默认简历或用于岗位匹配。',
    rollback: '生成后可以进入简历编辑页继续修改；如不需要，可在简历清单中删除这份新简历。',
    audit: '解析记录和新简历记录会保留，方便回看来源。',
    tips: ['确认解析出的姓名、项目、技能和经历基本可信。', '确认要用这份解析结果继续生成简历。'],
    confirmButtonText: '生成简历'
  })
  if (!confirmed) return
  confirmingParse.value = true
  try {
    const result = await confirmResumeParseResultApi(parseResult.value.analysisRecordId)
    ElMessage.success('解析结果已确认，简历已生成')
    parseDrawerVisible.value = false
    parseTask.value = {
      analysisRecordId: result.analysisRecordId,
      resumeId: result.resumeId,
      parseStatus: result.parseStatus,
      message: '已确认生成简历'
    }
    await fetchResumes()
    await router.push(`/resumes/${result.resumeId}/edit`)
  } finally {
    confirmingParse.value = false
  }
}

const openLatestOptimizeRecord = async (recordId?: number) => {
  await fetchOptimizeRecords()
  if (recordId) {
    await openOptimizeDetail(recordId)
  }
}

const hasOptimizeAsyncReceipt = (result: ResumeOptimizeSubmitVO) =>
  Boolean(result.asyncMessageId || result.asyncTraceId || result.asyncBizId || result.asyncSendStatus)

const submitOptimizeTask = async (row: ResumeVO) => {
  const result = await optimizeResumeApi(row.id, {
    targetPosition: row.targetPosition
  })
  if (hasOptimizeAsyncReceipt(result)) {
    optimizeTask.value = result
    optimizeRecoveryMessage.value = '建议生成任务已提交，可在任务中心查看进度；完成后刷新最近记录查看结果。'
    ElMessage.success('建议生成任务已提交')
    await fetchOptimizeRecords()
    return
  }
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(toFriendlyMessage(result.errorMessage, '建议生成失败，请稍后重试。'))
  } else if (result.optimizeStatus === 'PROCESSING') {
    optimizeRecoveryMessage.value = '建议生成中，可以稍后刷新最近记录查看结果。'
    ElMessage.success('建议生成中')
  } else {
    ElMessage.success('建议已生成')
    await openLatestOptimizeRecord(result.optimizeRecordId)
  }
}

const handleOptimize = async (row: ResumeVO) => {
  if (optimizingId.value) return
  optimizingId.value = row.id
  optimizeRecoveryMessage.value = ''
  optimizeTask.value = null
  try {
    await submitOptimizeTask(row)
  } catch (error) {
    optimizeRecoveryMessage.value = getErrorMessage(error, '建议任务提交失败，可以刷新最近记录，或稍后从本页继续查看。')
    ElMessage.error(optimizeRecoveryMessage.value)
    await fetchOptimizeRecords()
  } finally {
    optimizingId.value = null
  }
}

const openOptimizeDetail = async (recordId?: number) => {
  if (!recordId) return
  optimizeDetail.value = await getResumeOptimizeResultApi(recordId)
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
  optimizeDrawerVisible.value = true
}

const showApplyResultMessage = async (message?: string, warnings?: string[], newResumeId?: number) => {
  const warningText = warnings?.length ? `\n\n注意事项：\n${warnings.map((item) => `- ${item}`).join('\n')}` : ''
  const draftText = newResumeId ? '\n\n建议草稿已创建，稍后会自动打开编辑页。' : ''
  await ElMessageBox.alert(
    `${message || '已创建建议草稿，可继续编辑后再用于投递或匹配。'}${warningText}${draftText}`,
    '应用建议',
    { type: warnings?.length ? 'warning' : 'success' }
  )
}

const handleApplyOptimizeResult = async () => {
  if (!optimizeDetail.value || !canApplyOptimizeResult.value) {
    ElMessage.warning(applyOptimizeDisabledReason.value || '仅成功的优化记录可应用')
    return
  }
  const selectedSuggestions = getSelectedOptimizeSuggestions()
  const selectedFields = selectedSuggestions
    .map(({ item }) => getOptimizeSuggestionFieldKey(item))
    .filter((field): field is string => Boolean(field))
  const confirmed = await confirmDangerActionPreview({
    title: '应用建议',
    action: '应用选中的 AI 建议并创建建议草稿',
    target: `${selectedSuggestions.length} 个字段建议，字段：${selectedFields.length ? selectedFields.join('、') : '按建议内容自动判断'}`,
    impact: '会创建一份新的建议草稿，不会覆盖当前简历；草稿内容仍需要你人工检查后再用于投递或匹配。',
    rollback: '当前简历不会被修改；如果草稿不合适，可以不使用或删除草稿。',
    audit: '优化记录、选中字段和建议草稿记录会保留。',
    tips: ['确认建议没有夸大经历或编造项目结果。', '确认需要先创建草稿再继续人工编辑。'],
    confirmButtonText: '创建草稿'
  })
  if (!confirmed) return
  applyingOptimize.value = true
  try {
    const result = await applyResumeOptimizeResultApi(optimizeDetail.value.optimizeRecordId, {
      applyMode: 'CREATE_DRAFT',
      selectedSuggestionIndexes: selectedSuggestions.map(({ index }) => index),
      selectedFields
    })
    await showApplyResultMessage(result.message, result.warnings, result.newResumeId)
    optimizeDrawerVisible.value = false
    await fetchResumes()
    if (result.newResumeId) {
      await router.push(`/resumes/${result.newResumeId}/edit`)
    }
  } finally {
    applyingOptimize.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchResumes()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchResumes()
}

const handleSetDefault = async (row: ResumeVO) => {
  await setDefaultResumeApi(row.id)
  ElMessage.success('默认简历已更新')
  await fetchResumes()
}

const handleDelete = async (row: ResumeVO) => {
  const confirmed = await confirmDangerActionPreview({
    title: '删除简历',
    action: '删除这份简历',
    target: row.resumeName || row.title || '这份简历',
    impact: '该简历会从简历清单移除，后续不能再用它发起新的岗位匹配或面试；历史面试仍会继续使用当时保存的快照。',
    rollback: '系统不会自动恢复已删除简历；如误删，需要重新创建或重新上传。',
    audit: '删除操作会按当前账号和简历记录进入操作记录。',
    tips: ['确认这不是当前要用于投递或训练的默认简历。', '确认不再需要基于这份简历继续生成匹配报告。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteResumeApi(row.id)
  ElMessage.success('简历已删除')
  await fetchResumes()
}

onMounted(fetchResumes)
onUnmounted(() => {
  stopParsePolling()
})
</script>

<style scoped lang="scss">
.resume-center {
  gap: 20px;
}

.resume-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border-radius: var(--cc-radius-xl);
}

.hero-kicker,
.hero-actions,
.panel-line,
.section-title,
.pipeline-step,
.task-card,
.task-actions,
.resume-card__meta span,
.resume-card__actions,
.empty-actions,
.drawer-status,
.drawer-actions,
.diff-head {
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

.hero-copy {
  h1 {
    margin: 14px 0 0;
    font-size: 34px;
    line-height: 1.2;
  }

  p {
    max-width: 680px;
    margin: 12px 0 0;
    color: var(--app-text-muted);
    line-height: 1.8;
  }
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.hero-panel {
  align-self: stretch;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(2, 6, 23, 0.42);
}

.panel-line {
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  &:last-child {
    border-bottom: 0;
  }

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    font-size: 14px;
  }
}

.is-muted {
  color: var(--app-text-muted);
}

.is-success,
.success {
  color: #86efac !important;
}

.is-danger,
.danger {
  color: #fca5a5 !important;
}

.resume-metrics {
  .metric-card {
    p {
      margin: 10px 0 0;
      color: var(--app-text-muted);
      font-size: 12px;
    }
  }

  .metric-card__value.is-date {
    font-size: 16px;
    line-height: 1.5;
  }
}

.upload-workbench {
  padding: 20px;
}

.upload-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: stretch;
}

.section-title {
  gap: 10px;

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.upload-panel p {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.resume-upload {
  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    border-color: rgba(129, 140, 248, 0.32);
    background: rgba(2, 6, 23, 0.34);

    &:hover {
      border-color: rgba(34, 211, 238, 0.58);
    }
  }
}

.upload-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #dbeafe;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.pipeline-status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.pipeline-step {
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.28);

  > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: rgba(99, 102, 241, 0.16);
    color: #c4b5fd;
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    display: block;
    font-size: 14px;
  }

  p {
    margin: 5px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  &.active {
    border-color: rgba(34, 211, 238, 0.45);
  }

  &.done {
    border-color: rgba(34, 197, 94, 0.38);
  }

  &.error {
    border-color: rgba(248, 113, 113, 0.48);
  }
}

.task-card {
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(129, 140, 248, 0.22);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.62);

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 4px;
  }

  p {
    margin: 5px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.task-diagnostics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;

  span {
    max-width: 220px;
    padding: 3px 7px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.42);
    color: rgba(226, 232, 240, 0.78);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.task-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.resume-workspace {
  overflow: hidden;
}

.workspace-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.search-form {
  display: flex;
  justify-content: flex-end;
}

.resume-alert {
  margin: 0 20px 16px;
}

.resume-alert.compact {
  margin: 16px 0 0;
}

.optimize-records-alert {
  border: 1px solid rgba(245, 158, 11, 0.26);
  background: rgba(120, 53, 15, 0.24);

  :deep(.el-alert__title),
  :deep(.el-alert__icon) {
    color: #facc15;
  }
}

.optimize-recovery-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(129, 140, 248, 0.22);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.62);

  strong {
    display: block;
    color: #dbeafe;
    font-size: 13px;
  }

  p {
    margin: 4px 0 0;
    color: #a5b4fc;
    font-size: 12px;
    line-height: 1.6;
  }
}

.resume-list {
  min-height: 280px;
  padding: 0 20px 20px;
  border-top: 1px solid var(--app-border);
}

.resume-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding-top: 20px;
}

.resume-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: var(--app-radius);
  background: rgba(15, 23, 42, 0.66);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(129, 140, 248, 0.42);
    background: rgba(15, 23, 42, 0.86);
    transform: translateY(-2px);
  }
}

.resume-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.resume-title-block {
  display: flex;
  min-width: 0;
  gap: 12px;

  h3 {
    margin: 0;
    overflow: hidden;
    color: #f8fafc;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.resume-icon,
.empty-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(129, 140, 248, 0.28);
  background: rgba(99, 102, 241, 0.16);
  color: #c4b5fd;
}

.resume-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.resume-tags {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.resume-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    gap: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.resume-summary {
  display: -webkit-box;
  min-height: 44px;
  margin: 0;
  overflow: hidden;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.skill-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 5px 9px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.28);
    color: #cbd5e1;
    font-size: 12px;
  }

  .is-placeholder {
    color: var(--app-text-muted);
  }
}

.resume-card__status {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  div {
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.28);
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
    margin-top: 4px;
    color: var(--cc-warning);
    font-size: 13px;
  }
}

.optimize-summary {
  padding: 10px 12px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 10px;
  background: rgba(8, 47, 73, 0.22);
  color: #bae6fd;
  font-size: 12px;
  line-height: 1.6;
}

.resume-card__actions {
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 32px 20px;
  text-align: center;

  h3 {
    margin: 18px 0 0;
    font-size: 20px;
  }

  p {
    max-width: 520px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
}

.empty-actions {
  gap: 10px;
  margin-top: 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 20px;
}

.drawer-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-status {
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.resume-parse-preview,
.raw-summary,
.score-strip,
.diff-card,
.next-actions {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
}

.resume-parse-preview {
  h3 {
    margin: 0 0 10px;
    font-size: 15px;
  }
}

.resume-parse-sections {
  display: grid;
  gap: 10px;
}

.resume-parse-sections article {
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.26);

  strong {
    display: block;
    margin-bottom: 6px;
    color: var(--app-text);
    font-size: 13px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.7;
  }

  li + li {
    margin-top: 4px;
  }
}

.resume-parse-empty {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.raw-summary {
  h3 {
    margin: 0 0 8px;
    font-size: 15px;
  }

  p {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.7;
  }
}

.score-strip {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.7;
  }
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diff-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.diff-head {
  justify-content: space-between;
  gap: 10px;
}

.diff-head :deep(.el-checkbox__label) {
  color: #dbeafe;
  font-weight: 700;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;

  div {
    min-width: 0;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.52);
  }

  .diff-before {
    border-color: rgba(239, 68, 68, 0.28);
    background: rgba(127, 29, 29, 0.18);
  }

  .diff-after {
    border-color: rgba(34, 197, 94, 0.32);
    background: rgba(20, 83, 45, 0.18);
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .diff-before span {
    color: #fca5a5;
  }

  .diff-after span {
    color: #86efac;
  }

  p {
    margin: 8px 0 0;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.7;
  }
}

.diff-reason {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  font-size: 12px;
}

.next-actions {
  h3 {
    margin: 0 0 10px;
    font-size: 15px;
  }

  span {
    display: block;
    color: #cbd5e1;
    line-height: 1.7;
  }
}

.drawer-actions {
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1080px) {
  .resume-hero,
  .resume-card-grid,
  .upload-panel,
  .pipeline-status {
    grid-template-columns: 1fr;
  }

  .workspace-toolbar {
    flex-direction: column;
  }

  .search-form {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .resume-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .resume-card__header,
  .task-card {
    flex-direction: column;
  }

  .resume-tags,
  .task-actions {
    justify-content: flex-start;
  }

  .resume-card__status,
  .diff-grid,
  .score-strip {
    grid-template-columns: 1fr;
  }
}
</style>
