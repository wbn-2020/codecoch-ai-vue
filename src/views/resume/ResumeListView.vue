<template>
  <div class="resume-center page-shell">
    <section class="resume-hero">
      <div class="hero-copy">
        <div class="hero-kicker">
          <FileText :size="16" />
          Resume Intelligence Hub
        </div>
        <h1>简历中心</h1>
        <p>管理求职简历、上传文件解析结构化简历，并基于真实 V2 接口获取 AI 优化建议。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/resumes/create')">
            <Plus :size="17" />
            新增简历
          </el-button>
          <el-button size="large" :loading="uploading" @click="triggerUpload">
            <UploadCloud :size="17" />
            上传简历解析
          </el-button>
          <el-button size="large" text @click="router.push('/dashboard')">
            <ArrowLeft :size="17" />
            返回工作台
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="panel-line">
          <span>V1 数据源</span>
          <strong>真实简历 CRUD</strong>
        </div>
        <div class="panel-line">
          <span>V2 上传解析</span>
          <strong :class="uploadStatusClass">{{ uploadStatusText }}</strong>
        </div>
        <div class="panel-line">
          <span>AI 优化</span>
          <strong>同步优化接口</strong>
        </div>
      </div>
    </section>

    <section class="metric-grid resume-metrics">
      <article class="metric-card">
        <div class="metric-card__label">简历总数</div>
        <div class="metric-card__value">{{ total }}</div>
        <p>来自 `/resumes` 真实列表接口</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近更新时间</div>
        <div class="metric-card__value is-date">{{ latestUpdatedAt }}</div>
        <p>基于当前页真实记录计算</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">上传解析状态</div>
        <div class="metric-card__value is-date">{{ uploadStatusText }}</div>
        <p>{{ parseStatusMessage || '等待上传文件后由后端任务更新' }}</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近优化记录</div>
        <div class="metric-card__value is-date">{{ latestOptimizeStatus }}</div>
        <p>来自 `/resumes/{id}/optimize-records`</p>
      </article>
    </section>

    <section class="content-card upload-workbench">
      <div class="upload-panel">
        <div>
          <div class="section-title">
            <UploadCloud :size="18" />
            <h2>上传解析工作流</h2>
          </div>
          <p>支持 PDF、DOC、DOCX、MD、TXT 等后端允许格式。上传后由后端异步解析，前端轮询到成功、失败或超时后停止。</p>
        </div>
        <el-upload
          ref="uploadRef"
          class="resume-upload"
          drag
          :auto-upload="false"
          :limit="1"
          :show-file-list="false"
          :on-change="handleFileChange"
          :disabled="uploading || parsePolling"
        >
          <div class="upload-drop">
            <UploadCloud :size="28" />
            <strong>{{ uploading ? '上传中...' : '选择简历文件' }}</strong>
            <span>不会写入 Mock 数据，解析结果来自真实后端任务</span>
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
          <span>解析任务 #{{ parseTask.analysisRecordId }}</span>
          <strong>{{ parseStatusText(parseTask.parseStatus) }}</strong>
          <p>{{ parseTask.message || parseTask.errorMessage || '等待后端解析任务更新状态' }}</p>
        </div>
        <div class="task-actions">
          <el-button :loading="parsePolling" @click="refreshParseStatus(parseTask.analysisRecordId)">刷新状态</el-button>
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
            重新解析
          </el-button>
        </div>
      </div>
    </section>

    <section class="content-card resume-workspace">
      <div class="content-card__body workspace-toolbar">
        <div>
          <h2>求职资料库</h2>
          <p>以卡片方式维护简历、项目经历和面试上下文，保留现有真实接口。</p>
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
            <el-button type="primary" @click="handleSearch">查询</el-button>
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
        title="简历列表加载失败"
        :description="loadError"
      />

      <el-alert
        v-if="optimizeRecordsLoadError"
        class="resume-alert optimize-records-alert"
        type="warning"
        :closable="false"
        show-icon
        title="优化记录加载失败，请稍后重试"
      />

      <div class="resume-list" v-loading="loading">
        <div v-if="!loading && !loadError && resumes.length === 0" class="empty-state">
          <div class="empty-icon">
            <FilePlus2 :size="32" />
          </div>
          <h3>还没有可用于面试训练的简历</h3>
          <p>可以手动创建，也可以上传简历文件并在解析完成后确认生成结构化简历。</p>
          <div class="empty-actions">
            <el-button type="primary" @click="router.push('/resumes/create')">新增简历</el-button>
            <el-button :loading="uploading" @click="triggerUpload">上传简历解析</el-button>
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
                <strong>列表接口无解析字段</strong>
              </div>
              <div>
                <span>AI 优化</span>
                <strong :class="{ success: latestRecord(item.id)?.optimizeStatus === 'SUCCESS', danger: latestRecord(item.id)?.optimizeStatus === 'FAILED' }">
                  {{ optimizeStatusText(latestRecord(item.id)?.optimizeStatus) }}
                </strong>
              </div>
            </div>

            <div v-if="latestRecord(item.id)?.overallComment || latestRecord(item.id)?.errorMessage" class="optimize-summary">
              {{ latestRecord(item.id)?.overallComment || latestRecord(item.id)?.errorMessage }}
            </div>

            <div class="resume-card__actions">
              <el-button type="primary" plain @click="router.push(`/resumes/${item.id}/edit`)">
                <Eye :size="15" />
                查看 / 编辑
              </el-button>
              <el-button @click="router.push('/interviews/create')">
                <MessagesSquare :size="15" />
                创建面试
              </el-button>
              <el-button :loading="optimizingId === item.id" @click="handleOptimize(item)">
                <Sparkles :size="15" />
                AI 优化
              </el-button>
              <el-button :disabled="!latestRecord(item.id)" @click="openOptimizeDetail(latestRecord(item.id)?.optimizeRecordId)">
                <GitCompareArrows :size="15" />
                优化对比
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
                      删除简历
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
          <span>任务 #{{ parseResult.analysisRecordId }}</span>
        </div>
        <el-alert
          v-if="parseResult.errorMessage"
          type="error"
          :closable="false"
          show-icon
          title="解析失败"
          :description="parseResult.errorMessage"
        />
        <div class="json-preview">
          <h3>结构化结果</h3>
          <pre>{{ formatJson(parseResult.structuredJson) }}</pre>
        </div>
        <div v-if="parseResult.rawTextSummary" class="raw-summary">
          <h3>原文摘要</h3>
          <p>{{ parseResult.rawTextSummary }}</p>
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

    <el-drawer v-model="optimizeDrawerVisible" title="AI 优化对比" size="620px" class="resume-v2-drawer">
      <div v-if="optimizeDetail" class="drawer-panel">
        <div class="drawer-status">
          <StatusTag :status="optimizeDetail.optimizeStatus" />
          <span>记录 #{{ optimizeDetail.optimizeRecordId }}</span>
        </div>
        <el-alert
          v-if="optimizeDetail.errorMessage"
          type="error"
          :closable="false"
          show-icon
          title="AI 优化失败"
          :description="optimizeDetail.errorMessage"
        />
        <div class="score-strip">
          <div>
            <span>综合评分</span>
            <strong>{{ optimizeDetail.resultJson?.overallScore ?? '--' }}</strong>
          </div>
          <p>{{ optimizeDetail.resultJson?.overallComment || '后端未返回整体评价。' }}</p>
        </div>
        <div class="diff-list">
          <article v-for="(item, index) in optimizeDetail.resultJson?.rewriteSuggestions || []" :key="index" class="diff-card">
            <div class="diff-head">
              <strong>{{ item.projectName || item.section || `建议 ${index + 1}` }}</strong>
              <el-tag v-if="item.fabricationRisk" type="warning" effect="plain">需核实真实性</el-tag>
            </div>
            <div class="diff-grid">
              <div>
                <span>优化前</span>
                <p>{{ item.before || '后端未返回原文片段' }}</p>
              </div>
              <div>
                <span>优化后</span>
                <p>{{ item.after || '后端未返回改写建议' }}</p>
              </div>
            </div>
            <p class="diff-reason">{{ item.reason }}</p>
          </article>
        </div>
        <div v-if="optimizeDetail.resultJson?.nextActions?.length" class="next-actions">
          <h3>下一步动作</h3>
          <span v-for="action in optimizeDetail.resultJson.nextActions" :key="action">{{ action }}</span>
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
              应用优化结果 · 创建 AI 草稿
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { UploadFile, UploadInstance } from 'element-plus'
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
  streamResumeOptimizeApi,
  uploadResumeFileApi
} from '@/api/resume'
import StatusTag from '@/components/common/StatusTag.vue'
import type {
  ResumeAnalysisResultVO,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeSseEvent,
  ResumeParseStatus,
  ResumeParseStatusVO,
  ResumeQueryDTO,
  ResumeVO
} from '@/types/resume'
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
const optimizeSseHandle = ref<ReturnType<typeof streamResumeOptimizeApi> | null>(null)
const applyingOptimize = ref(false)
const optimizeRecords = ref<Record<number, ResumeOptimizeRecordVO[]>>({})
const optimizeRecordsLoadError = ref(false)
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const optimizeDrawerVisible = ref(false)

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

const parseStatusMessage = computed(() => parseTask.value?.message || parseTask.value?.errorMessage || '')

const allOptimizeRecords = computed(() => Object.values(optimizeRecords.value).flat())

const latestOptimizeStatus = computed(() => {
  if (optimizeRecordsLoadError.value) return '加载失败'
  const latest = allOptimizeRecords.value[0]
  return latest ? optimizeStatusText(latest.optimizeStatus) : '暂无记录'
})

const canApplyOptimizeResult = computed(() => optimizeDetail.value?.optimizeStatus === 'SUCCESS')

const applyOptimizeDisabledReason = computed(() => {
  if (!optimizeDetail.value) return '请选择一条优化记录'
  if (optimizeDetail.value.optimizeStatus !== 'SUCCESS') return '仅成功的优化记录可应用'
  return ''
})

const uploadSteps = computed(() => {
  const status = parseTask.value?.parseStatus
  return [
    {
      key: 'upload',
      index: '01',
      label: '文件上传',
      description: uploading.value ? '文件正在发送到后端' : parseTask.value ? '文件已上传并生成解析任务' : '等待选择本地简历文件',
      active: uploading.value,
      done: Boolean(parseTask.value),
      error: false
    },
    {
      key: 'parse',
      index: '02',
      label: '异步解析',
      description: status ? parseStatusText(status) : '后端任务会提取文本并调用 AI 结构化解析',
      active: status === 'PENDING' || status === 'PARSING',
      done: status === 'WAIT_CONFIRM' || status === 'SUCCESS',
      error: status === 'FAILED'
    },
    {
      key: 'confirm',
      index: '03',
      label: '确认生成',
      description: status === 'SUCCESS' ? '已确认生成结构化简历' : '需要用户确认后才生成简历，不自动覆盖',
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
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message
    if (message) return message
  }
  return fallback
}

const parseStatusText = (status?: ResumeParseStatus) => {
  if (!status) return '未解析'
  return parseStatusMap[status] || status
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '优化中',
    SUCCESS: '优化成功',
    FAILED: '优化失败'
  }
  return status ? map[status] || status : '暂无记录'
}

const latestRecord = (resumeId: number) => optimizeRecords.value[resumeId]?.[0]

const formatJson = (value: unknown) => {
  if (!value) return '后端未返回结构化 JSON'
  return JSON.stringify(value, null, 2)
}

const fetchOptimizeRecords = async () => {
  let hasLoadError = false
  const entries = await Promise.all(
    resumes.value.map(async (resume) => {
      try {
        const records = await getResumeOptimizeRecordsApi(resume.id)
        return [resume.id, records] as const
      } catch {
        hasLoadError = true
        return [resume.id, []] as const
      }
    })
  )
  optimizeRecords.value = Object.fromEntries(entries)
  optimizeRecordsLoadError.value = hasLoadError
}

const fetchResumes = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getResumesApi(query)
    resumes.value = result.records || []
    total.value = result.total || 0
    optimizeRecordsLoadError.value = false
    await fetchOptimizeRecords()
  } catch (error) {
    resumes.value = []
    total.value = 0
    optimizeRecords.value = {}
    optimizeRecordsLoadError.value = false
    loadError.value = getErrorMessage(error, '请稍后重试，或确认后端简历服务是否可用。')
  } finally {
    loading.value = false
  }
}

const triggerUpload = () => {
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click()
}

const handleFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  uploadRef.value?.clearFiles()
  if (!file) return
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
      message: result.message
    }
    ElMessage.success(result.message || '上传成功，等待后端解析')
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
      parseTask.value = status
      if (['WAIT_CONFIRM', 'SUCCESS', 'FAILED'].includes(status.parseStatus) || attempt >= 30) {
        parsePolling.value = false
        if (attempt >= 30 && !['WAIT_CONFIRM', 'SUCCESS', 'FAILED'].includes(status.parseStatus)) {
          uploadError.value = '解析状态查询已超时，请稍后手动刷新任务状态。'
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
  parseTask.value = status
  if (status.parseStatus === 'WAIT_CONFIRM' || status.parseStatus === 'SUCCESS') {
    await openParseResult(analysisRecordId)
  }
}

const handleReparse = async (analysisRecordId: number) => {
  parseTask.value = await reparseResumeApi(analysisRecordId)
  ElMessage.success('已重新提交解析任务')
  startParsePolling(analysisRecordId)
}

const openParseResult = async (analysisRecordId: number) => {
  parseResult.value = await getResumeParseResultApi(analysisRecordId)
  parseDrawerVisible.value = true
}

const handleConfirmParse = async () => {
  if (!parseResult.value) return
  await ElMessageBox.confirm('确认后将根据后端解析结果生成一份结构化简历，不会覆盖正在编辑的已有简历。', '确认生成简历', {
    type: 'warning'
  })
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

const runSyncOptimizeFallback = async (row: ResumeVO) => {
  const result = await optimizeResumeApi(row.id, {
    targetPosition: row.targetPosition
  })
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(result.errorMessage || 'AI 优化失败')
  } else {
    ElMessage.success('AI 优化已完成')
  }
  await openLatestOptimizeRecord(result.optimizeRecordId)
}

const resolveOptimizeRecordId = (data?: ResumeOptimizeSseEvent) => {
  const result = data?.result
  const resultRecordId =
    typeof result === 'object' && result && 'optimizeRecordId' in result
      ? Number(result.optimizeRecordId)
      : undefined
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}
  const metadataRecordId =
    'recordId' in metadata
      ? Number(metadata.recordId)
      : 'optimizeRecordId' in metadata
        ? Number(metadata.optimizeRecordId)
        : undefined
  return data?.recordId || resultRecordId || metadataRecordId
}

const handleOptimize = async (row: ResumeVO) => {
  if (optimizingId.value) return
  optimizeSseHandle.value?.abort()
  optimizingId.value = row.id
  let streamStarted = false
  let resultRecordId: number | undefined
  try {
    optimizeSseHandle.value = streamResumeOptimizeApi(
      {
        resumeId: row.id,
        targetPosition: row.targetPosition
      },
      {
        onEvent: (event, data?: ResumeOptimizeSseEvent) => {
          if (event === 'start' || event === 'delta' || event === 'metadata' || event === 'progress' || event === 'result' || event === 'done') {
            streamStarted = true
          }
          resultRecordId = resolveOptimizeRecordId(data) || resultRecordId
          if ((event === 'progress' || event === 'delta') && data?.message) {
            ElMessage.info(data.stage ? `${data.stage}：${data.message}` : data.message)
          }
        }
      }
    )
    await optimizeSseHandle.value.finished
    ElMessage.success('AI 优化已完成')
    await openLatestOptimizeRecord(resultRecordId)
  } catch (error) {
    if (!streamStarted) {
      await runSyncOptimizeFallback(row)
    } else {
      ElMessage.error(error instanceof Error ? error.message : 'AI 优化流中断，请稍后手动重试。')
    }
  } finally {
    optimizingId.value = null
    optimizeSseHandle.value = null
  }
}

const openOptimizeDetail = async (recordId?: number) => {
  if (!recordId) return
  optimizeDetail.value = await getResumeOptimizeResultApi(recordId)
  optimizeDrawerVisible.value = true
}

const showApplyResultMessage = async (message?: string, warnings?: string[], newResumeId?: number) => {
  const warningText = warnings?.length ? `\n\n注意事项：\n${warnings.map((item) => `- ${item}`).join('\n')}` : ''
  await ElMessageBox.alert(
    `${message || '已创建新的 AI 优化草稿。'}${warningText}\n\n新简历 ID：${newResumeId || '--'}`,
    '应用优化结果',
    { type: warnings?.length ? 'warning' : 'success' }
  )
}

const handleApplyOptimizeResult = async () => {
  if (!optimizeDetail.value || !canApplyOptimizeResult.value) {
    ElMessage.warning('仅成功的优化记录可应用')
    return
  }
  try {
    await ElMessageBox.confirm('将创建一份新的 AI 优化草稿，不会覆盖当前简历。', '应用优化结果', {
      type: 'warning',
      confirmButtonText: '创建草稿',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  applyingOptimize.value = true
  try {
    const result = await applyResumeOptimizeResultApi(optimizeDetail.value.optimizeRecordId, {
      applyMode: 'CREATE_DRAFT'
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
  await ElMessageBox.confirm(`确认删除简历「${row.resumeName || row.title}」？历史面试会继续使用已保存快照。`, '删除确认', {
    type: 'warning'
  })
  await deleteResumeApi(row.id)
  ElMessage.success('简历已删除')
  await fetchResumes()
}

onMounted(fetchResumes)
onUnmounted(() => {
  stopParsePolling()
  optimizeSseHandle.value?.abort()
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
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
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

.json-preview,
.raw-summary,
.score-strip,
.diff-card,
.next-actions {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
}

.json-preview {
  h3 {
    margin: 0 0 10px;
    font-size: 15px;
  }

  pre {
    max-height: 360px;
    margin: 0;
    overflow: auto;
    color: #c4b5fd;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
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

.diff-head {
  justify-content: space-between;
  gap: 10px;
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

  span {
    color: var(--app-text-muted);
    font-size: 12px;
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
