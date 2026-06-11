<template>
  <div class="resume-editor page-shell">
    <section class="editor-hero">
      <div>
        <div class="hero-kicker">
          <FilePenLine :size="16" />
          简历编辑
        </div>
        <h1>{{ isEdit ? '编辑简历' : '新增简历' }}</h1>
        <p>维护基本信息、求职目标、技术栈和项目经历，供后续面试训练读取。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')">
          <ArrowLeft :size="16" />
          返回我的简历
        </el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          <Save :size="16" />
          保存简历
        </el-button>
      </div>
    </section>

    <div class="editor-layout">
      <main class="editor-main">
        <section class="content-card editor-section" v-loading="loading">
          <div class="section-heading">
            <div class="section-icon">
              <UserRound :size="18" />
            </div>
            <div>
              <h2>基本信息</h2>
              <p>用于识别简历和创建面试时展示候选人基础资料。</p>
            </div>
          </div>

          <el-form ref="formRef" class="resume-form" :model="form" :rules="rules" label-position="top">
            <div class="form-grid">
              <el-form-item label="简历名称" prop="resumeName">
                <el-input v-model.trim="form.resumeName" placeholder="例如：Java 后端 3 年经验简历" />
              </el-form-item>
              <el-form-item label="真实姓名">
                <el-input v-model.trim="form.realName" placeholder="请输入姓名" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model.trim="form.email" placeholder="用于补充联系方式" />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model.trim="form.phone" placeholder="用于补充联系方式" />
              </el-form-item>
            </div>

            <div class="section-divider"></div>

            <div class="section-heading compact">
              <div class="section-icon">
                <Target :size="18" />
              </div>
              <div>
                <h2>求职目标</h2>
                <p>面试创建页会读取简历和求职方向作为候选上下文。</p>
              </div>
            </div>
            <div class="form-grid">
              <el-form-item label="求职方向">
                <el-input v-model.trim="form.targetPosition" placeholder="例如：Java 微服务开发" />
              </el-form-item>
              <el-form-item label="默认简历">
                <div class="switch-line">
                  <el-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" />
                  <span>保存后会更新你的默认简历</span>
                </div>
              </el-form-item>
            </div>

            <el-form-item label="个人摘要">
              <el-input
                v-model="form.summary"
                type="textarea"
                :rows="4"
                placeholder="简要说明工作背景、优势方向、项目类型和求职重点"
              />
            </el-form-item>

            <div class="section-divider"></div>

            <div class="section-heading compact">
              <div class="section-icon">
                <Braces :size="18" />
              </div>
              <div>
                <h2>技术栈</h2>
                <p>用于后续项目深挖、技术八股和综合模拟面试的上下文选择。</p>
              </div>
            </div>
            <el-form-item label="核心技术栈" prop="skills">
              <el-input
                v-model="form.skills"
                type="textarea"
                :rows="4"
                placeholder="Spring Boot、MySQL、Redis、MQ、Spring Cloud、Vue..."
              />
            </el-form-item>

            <div class="section-divider"></div>

            <div class="section-heading compact">
              <div class="section-icon">
                <Building2 :size="18" />
              </div>
              <div>
                <h2>经历与补充</h2>
                <p>保留现有字段结构，本页不提交新的字段。</p>
              </div>
            </div>
            <el-form-item label="工作经历 / 工作摘要">
              <el-input
                v-model="form.workSummary"
                type="textarea"
                :rows="5"
                placeholder="描述公司类型、负责系统、业务规模、核心职责和结果"
              />
            </el-form-item>
            <el-form-item label="教育经历">
              <el-input
                v-model="form.education"
                type="textarea"
                :rows="3"
                placeholder="学校、专业、学历、时间范围等"
              />
            </el-form-item>
          </el-form>

          <div class="form-actions">
            <el-button @click="router.push('/resumes')">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存简历</el-button>
          </div>
        </section>

        <section v-if="isEdit && resumeId" class="content-card editor-section project-section">
          <div class="section-heading project-header">
            <div class="section-heading__left">
              <div class="section-icon">
                <Layers3 :size="18" />
              </div>
              <div>
                <h2>项目经历</h2>
                <p>手动维护项目背景、职责、难点和优化结果，AI 建议只在生成后作为参考。</p>
              </div>
            </div>
            <el-button type="primary" @click="openProjectDialog()">
              <Plus :size="16" />
              新增项目
            </el-button>
          </div>

          <div class="project-list">
            <div v-if="projects.length === 0" class="project-empty">
              <FolderOpen :size="30" />
              <h3>暂无项目经历</h3>
              <p>项目经历会帮助面试创建页构建更完整的简历上下文。</p>
            </div>
            <article v-for="project in projects" v-else :key="project.projectId" class="project-card">
              <div class="project-card__main">
                <div class="project-card__top">
                  <h3>{{ project.projectName }}</h3>
                  <span>{{ project.projectTime || project.projectPeriod || '未填写项目时间' }}</span>
                </div>
                <p class="project-meta">{{ project.techStack || '未填写技术栈' }}</p>
                <p class="project-desc">{{ project.projectBackground || project.description || '暂无项目背景' }}</p>
              </div>
              <div class="project-actions">
                <el-button @click="openProjectDialog(project)">编辑</el-button>
                <el-button type="danger" plain @click="handleDeleteProject(project)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <aside class="editor-aside">
        <section class="content-card side-panel">
          <div class="completion-head">
            <span>本地填写完整度</span>
            <strong>{{ completion }}%</strong>
          </div>
          <el-progress :percentage="completion" :stroke-width="10" :show-text="false" />
          <p>仅基于当前表单真实填写项计算，不代表 AI 评分。</p>
          <div class="completion-list">
            <span v-for="item in completionItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section class="content-card side-panel">
          <h3>面试联动</h3>
          <p>面试页会从真实简历中选择上下文，不在本页改动面试入口。</p>
          <el-button class="full-button" @click="router.push('/interviews/create')">
            <MessagesSquare :size="16" />
            去面试
          </el-button>
        </section>

        <section v-if="isEdit && resumeId" class="content-card side-panel ai-panel">
          <h3>简历建议</h3>
          <p>基于当前已保存简历生成建议。结果只展示改写方向，不会自动覆盖当前表单。</p>
          <el-form class="optimize-form" :model="optimizeForm" label-position="top">
            <el-form-item label="目标岗位">
              <el-input v-model.trim="optimizeForm.targetPosition" placeholder="默认使用当前求职方向" />
            </el-form-item>
            <el-form-item label="工作年限">
              <el-input-number v-model="optimizeForm.experienceYears" :min="0" :max="30" />
            </el-form-item>
            <el-form-item label="行业方向">
              <el-input v-model.trim="optimizeForm.industryDirection" placeholder="例如：电商 / 金融支付 / SaaS" />
            </el-form-item>
          </el-form>
          <el-button class="full-button" type="primary" :loading="optimizing" @click="handleOptimizeResume">
            <Sparkles :size="16" />
            生成建议
          </el-button>

          <div v-if="optimizeSseEvents.length || optimizeSseMessage" class="sse-progress">
            <div class="sse-progress__head">
              <span>建议生成进度</span>
              <el-tag size="small" effect="plain">{{ optimizeSseStatus }}</el-tag>
            </div>
            <p>{{ optimizeSseMessage || '等待建议进度返回。' }}</p>
            <p class="sse-progress__hint">{{ optimizeRecoveryHint }}</p>
            <div class="sse-progress__list">
              <span v-for="(event, index) in optimizeSseEvents" :key="`${event.type}-${index}`">
                {{ event.stage || optimizeSseTypeLabel(event.type) }} · {{ event.message }}
              </span>
            </div>
            <el-button
              v-if="optimizeTask"
              class="sse-progress__action"
              text
              type="primary"
              @click="goOptimizeTaskCenter(optimizeTask)"
            >
              查看任务中心
            </el-button>
            <el-button
              v-if="showOptimizeRefreshAction"
              class="sse-progress__action"
              text
              type="primary"
              :loading="optimizeRecordsRefreshing"
              @click="refreshOptimizeRecords"
            >
              刷新最近记录
            </el-button>
          </div>

          <div class="optimize-records">
            <div class="capability-item">
              <span>最近记录</span>
              <el-tag :type="latestOptimizeRecord?.optimizeStatus === 'FAILED' ? 'danger' : latestOptimizeRecord ? 'success' : 'info'" effect="plain">
                {{ optimizeStatusText(latestOptimizeRecord?.optimizeStatus) }}
              </el-tag>
            </div>
            <button
              v-for="record in optimizeRecords"
              :key="record.optimizeRecordId"
              class="record-row"
              type="button"
              @click="openOptimizeDetail(record.optimizeRecordId)"
            >
              <span>建议记录 {{ record.optimizeRecordId }} · {{ optimizeStatusText(record.optimizeStatus) }}</span>
              <small>{{ formatDateTime(record.createdAt || record.updatedAt) }}</small>
            </button>
          </div>

        <div v-if="optimizeDetail" class="optimize-result">
          <div class="score-line">
            <span>综合评分</span>
            <strong>{{ optimizeDetail.overallScore ?? '--' }}</strong>
          </div>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="已做脱敏展示"
            description="这里只展示字段建议、改写方向和风险提示，不直接展开原始片段。"
          />
          <p>{{ optimizeDetailSummary }}</p>
          <div v-if="optimizeSuggestions.length" class="rewrite-toolbar">
            <span>已选择 {{ selectedOptimizeSuggestionIndexes.length }} / {{ optimizeSuggestions.length }} 个字段建议</span>
            <el-button text size="small" @click="selectAllOptimizeSuggestions">全选</el-button>
            <el-button text size="small" @click="selectedOptimizeSuggestionIndexes = []">清空</el-button>
          </div>
          <div v-if="optimizeSuggestions.length" class="rewrite-list">
            <article v-for="(item, index) in optimizeSuggestions" :key="index">
              <div class="rewrite-head">
                <el-checkbox v-model="selectedOptimizeSuggestionIndexes" :label="index">
                  {{ getOptimizeSuggestionFieldName(item, index) }}
                </el-checkbox>
                <el-tag v-if="item.fabricationRisk" type="warning" effect="plain">需核实真实性</el-tag>
              </div>
              <div class="rewrite-diff">
                <div>
                  <span>字段</span>
                  <p>{{ getOptimizeSuggestionFieldName(item, index) }}</p>
                </div>
                <div>
                  <span>改写建议</span>
                  <p>{{ item.after || item.reason || '暂未返回改写建议' }}</p>
                </div>
              </div>
              <p v-if="item.reason" class="rewrite-reason">{{ item.reason }}</p>
            </article>
          </div>
            <el-tooltip :content="applyOptimizeDisabledReason" placement="top" :disabled="canApplyOptimizeResult">
              <el-button
                class="full-button"
                type="primary"
                :disabled="!canApplyOptimizeResult"
                :loading="applyingOptimize"
                @click="handleApplyOptimizeResult"
              >
                <GitCompareArrows :size="16" />
                应用建议 · 新建草稿
              </el-button>
            </el-tooltip>
          </div>
        </section>

        <section class="content-card side-panel">
          <h3>填写建议</h3>
          <ul>
            <li>技术栈尽量按语言、框架、中间件、数据库分组。</li>
            <li>项目经历建议写清背景、职责、难点和可量化结果。</li>
            <li>个人摘要保持真实，不写无法在面试中展开的内容。</li>
          </ul>
        </section>
      </aside>
    </div>

    <el-dialog
      v-model="projectDialogVisible"
      :title="editingProjectId ? '编辑项目经历' : '新增项目经历'"
      width="760px"
      class="resume-project-dialog"
    >
      <ResumeProjectForm ref="projectFormRef" :model-value="editingProject || undefined" />
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectSaving" @click="handleSaveProject">保存项目</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Braces,
  Building2,
  CheckCircle2,
  Circle,
  FilePenLine,
  FolderOpen,
  GitCompareArrows,
  Layers3,
  MessagesSquare,
  Plus,
  Save,
  Sparkles,
  Target,
  UserRound
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  applyResumeOptimizeResultApi,
  createResumeApi,
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi,
  getResumeDetailApi,
  optimizeResumeApi,
  setDefaultResumeApi,
  updateResumeApi,
  updateResumeProjectApi
} from '@/api/resume'
import ResumeProjectForm from '@/components/resume/ResumeProjectForm.vue'
import type {
  ResumeCreateDTO,
  ResumeDetailVO,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeRequestDTO,
  ResumeOptimizeSubmitVO,
  ResumeRewriteSuggestion,
  ResumeProjectDTO,
  ResumeProjectVO
} from '@/types/resume'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const resumeId = computed(() => getRouteNumberParam(route.params.id as string))
const isEdit = computed(() => Boolean(resumeId.value))

const loading = ref(false)
const saving = ref(false)
const projectSaving = ref(false)
const optimizing = ref(false)
const applyingOptimize = ref(false)
const formRef = ref<FormInstance>()
const projectFormRef = ref<InstanceType<typeof ResumeProjectForm>>()
const projectDialogVisible = ref(false)
const editingProjectId = ref<number | null>(null)
const editingProject = ref<ResumeProjectVO | null>(null)
const projects = ref<ResumeProjectVO[]>([])
const optimizeRecords = ref<ResumeOptimizeRecordVO[]>([])
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const selectedOptimizeSuggestionIndexes = ref<number[]>([])
const optimizeSseEvents = ref<Array<{ type: string; stage?: string; message: string }>>([])
const optimizeSseMessage = ref('')
const optimizeSseStatus = ref('未开始')
const optimizeTask = ref<ResumeOptimizeSubmitVO | null>(null)
const optimizeRecordsRefreshing = ref(false)

const form = reactive<ResumeCreateDTO>({
  resumeName: '',
  realName: '',
  email: '',
  phone: '',
  targetPosition: '',
  summary: '',
  skills: '',
  workSummary: '',
  education: '',
  isDefault: 0
})

const optimizeForm = reactive<ResumeOptimizeRequestDTO>({
  targetPosition: '',
  experienceYears: undefined,
  industryDirection: ''
})

const rules: FormRules<ResumeCreateDTO> = {
  resumeName: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  skills: [{ required: true, message: '请输入技术栈', trigger: 'blur' }]
}

const completionItems = computed(() => [
  { label: '简历名称', done: Boolean(form.resumeName?.trim()) },
  { label: '求职方向', done: Boolean(form.targetPosition?.trim()) },
  { label: '技术栈', done: Boolean(form.skills?.trim()) },
  { label: '个人摘要', done: Boolean(form.summary?.trim()) },
  { label: '工作经历', done: Boolean(form.workSummary?.trim()) },
  { label: '教育经历', done: Boolean(form.education?.trim()) },
  { label: '项目经历', done: projects.value.length > 0 }
])

const completion = computed(() => {
  const done = completionItems.value.filter((item) => item.done).length
  return Math.round((done / completionItems.value.length) * 100)
})

const latestOptimizeRecord = computed(() => optimizeRecords.value[0])

const optimizeSuggestions = computed(() => optimizeDetail.value?.rewriteSuggestions || [])

const optimizeDetailSummary = computed(() => {
  const raw = optimizeDetail.value?.overallComment || optimizeDetail.value?.errorMessage
  return raw ? toFriendlyMessage(raw, '建议结果暂不可用，请稍后重试。') : '暂未返回整体评价。'
})

const showOptimizeRefreshAction = computed(() => Boolean(optimizeSseMessage.value) && !optimizing.value)

const showOptimizeTaskCenterAction = computed(() => Boolean(optimizeTask.value))

const optimizeRecoveryHint = computed(() => {
  if (showOptimizeTaskCenterAction.value) {
    return '建议任务已进入任务中心，可以离开本页，完成后再刷新最近记录查看结果。'
  }
  if (optimizing.value) {
    return '建议生成可能需要一点时间。你可以停留等待，也可以稍后回到本页，从最近记录继续查看结果。'
  }
  if (latestOptimizeRecord.value) {
    return '最近建议记录已保留，可打开记录查看结果或失败原因。'
  }
  return '如果刚才离开或网络中断，可以刷新最近记录；仍没有结果时再重新生成建议。'
})

const hasOptimizeAsyncReceipt = (result: ResumeOptimizeSubmitVO) =>
  Boolean(result.asyncMessageId || result.asyncTraceId || result.asyncBizId || result.asyncSendStatus)

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

const applyDetail = (detail: ResumeDetailVO) => {
  Object.assign(form, {
    resumeName: detail.resumeName,
    realName: detail.realName || '',
    email: detail.email || '',
    phone: detail.phone || '',
    targetPosition: detail.targetPosition || '',
    summary: detail.summary || '',
    skills: detail.skills || detail.skillStack || '',
    workSummary: detail.workSummary || detail.workExperience || '',
    education: detail.education || detail.educationExperience || '',
    isDefault: detail.isDefault
  })
  if (!optimizeForm.targetPosition) {
    optimizeForm.targetPosition = detail.targetPosition || ''
  }
  projects.value = detail.projects || []
}

const fetchDetail = async () => {
  if (!resumeId.value) return
  loading.value = true
  try {
    applyDetail(await getResumeDetailApi(resumeId.value))
    await fetchOptimizeRecords()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '简历详情加载失败，请返回我的简历重试。'))
  } finally {
    loading.value = false
  }
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '建议生成中',
    SUCCESS: '建议已生成',
    FAILED: '建议生成失败'
  }
  return status ? map[status] || '状态待确认' : '暂无记录'
}

const fetchOptimizeRecords = async () => {
  if (!resumeId.value) return
  try {
    optimizeRecords.value = await getResumeOptimizeRecordsApi(resumeId.value)
    if (!optimizeDetail.value && optimizeRecords.value[0]) {
      optimizeDetail.value = await getResumeOptimizeResultApi(optimizeRecords.value[0].optimizeRecordId)
      selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
    }
  } catch {
    optimizeRecords.value = []
  }
}

const openOptimizeDetail = async (recordId: number) => {
  optimizeDetail.value = await getResumeOptimizeResultApi(recordId)
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const refreshOptimizeRecords = async () => {
  optimizeRecordsRefreshing.value = true
  try {
    await fetchOptimizeRecords()
    if (latestOptimizeRecord.value) {
      ElMessage.success('最近记录已刷新')
    } else {
      ElMessage.info('暂未发现新的建议记录')
    }
  } finally {
    optimizeRecordsRefreshing.value = false
  }
}

const buildOptimizePayload = (): ResumeOptimizeRequestDTO => ({
  targetPosition: optimizeForm.targetPosition || form.targetPosition,
  experienceYears: optimizeForm.experienceYears,
  industryDirection: optimizeForm.industryDirection,
  selectedProjectIds: projects.value.map((project) => project.projectId).filter(Boolean)
})

const runSyncOptimizeFallback = async () => {
  if (!resumeId.value) return
  optimizeSseStatus.value = '普通生成'
  optimizeSseMessage.value = '生成进度暂时不可用，系统会继续生成建议，稍后可刷新最近记录查看。'
  const result = await optimizeResumeApi(resumeId.value, buildOptimizePayload())
  if (hasOptimizeAsyncReceipt(result)) {
    optimizeTask.value = result
    optimizeSseStatus.value = '已提交'
    optimizeSseMessage.value = '建议生成任务已提交，可在任务中心查看进度；完成后刷新最近记录查看结果。'
    optimizeSseEvents.value = [{
      type: 'task',
      stage: '任务中心',
      message: '建议生成任务已提交'
    }]
    ElMessage.success('建议生成任务已提交')
    await fetchOptimizeRecords()
    return
  }
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(toFriendlyMessage(result.errorMessage, '生成建议失败，请稍后重试'))
  } else {
    ElMessage.success('建议已生成')
  }
  await fetchOptimizeRecords()
  if (result.optimizeRecordId) {
    await openOptimizeDetail(result.optimizeRecordId)
  }
}

const optimizeSseTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    start: '建议开始',
    delta: '建议生成中',
    metadata: '状态更新',
    progress: '生成进度',
    result: '建议结果',
    done: '建议完成',
    error: '生成失败'
  }
  return type ? map[type] || '状态更新' : '状态更新'
}

const handleOptimizeResume = async () => {
  if (!resumeId.value || optimizing.value) return
  optimizing.value = true
  optimizeSseEvents.value = []
  optimizeSseMessage.value = '正在启动建议生成进度。'
  optimizeSseStatus.value = '启动中'
  optimizeTask.value = null

  try {
    await runSyncOptimizeFallback()
  } catch (error) {
    optimizeSseStatus.value = '提交失败'
    optimizeSseMessage.value = getErrorMessage(error, '建议任务提交失败，可以刷新最近记录，或稍后重新生成。')
    ElMessage.error(optimizeSseMessage.value)
  } finally {
    optimizing.value = false
  }
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
    target: `${form.resumeName || '当前简历'}，${selectedSuggestions.length} 个字段建议`,
    impact: '会创建一份新的建议草稿，不会覆盖当前正在编辑的简历；草稿内容仍需要你人工检查后再用于投递或匹配。',
    rollback: '当前简历不会被修改；如果草稿不合适，可以继续编辑原简历或删除草稿。',
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
    if (result.newResumeId) {
      await router.push(`/resumes/${result.newResumeId}/edit`)
    } else {
      await fetchDetail()
    }
  } finally {
    applyingOptimize.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (resumeId.value) {
      await updateResumeApi(resumeId.value, form)
      if (form.isDefault === 1) {
        await setDefaultResumeApi(resumeId.value)
      }
      ElMessage.success('简历已保存')
      await fetchDetail()
    } else {
      const created = await createResumeApi(form)
      if (form.isDefault === 1) {
        await setDefaultResumeApi(created.id)
      }
      ElMessage.success('简历已创建')
      await router.replace(`/resumes/${created.id}/edit`)
    }
  } finally {
    saving.value = false
  }
}

const openProjectDialog = (project?: ResumeProjectVO) => {
  editingProjectId.value = project?.projectId || null
  editingProject.value = project || null
  projectDialogVisible.value = true
}

const handleSaveProject = async () => {
  if (!resumeId.value || !projectFormRef.value) return
  const payload = (await projectFormRef.value.validate().catch(() => false)) as ResumeProjectDTO | false
  if (!payload) return
  projectSaving.value = true
  try {
    const projectPayload = { ...payload }
    if (editingProjectId.value) {
      await updateResumeProjectApi(resumeId.value, editingProjectId.value, projectPayload)
    } else {
      await createResumeProjectApi(resumeId.value, projectPayload)
    }
    ElMessage.success('项目经历已保存')
    projectDialogVisible.value = false
    editingProjectId.value = null
    editingProject.value = null
    await fetchDetail()
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '项目经历保存失败，请检查必填项后重试'))
  } finally {
    projectSaving.value = false
  }
}

const handleDeleteProject = async (project: ResumeProjectVO) => {
  if (!resumeId.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除项目经历',
    action: '删除该简历中的项目经历',
    target: project.projectName || '项目经历',
    impact: '该项目经历会从当前简历中移除，后续简历匹配、面试追问和推荐任务将不再把它作为证据。',
    rollback: '系统不会自动恢复已删除项目；如误删，需要重新录入项目经历。',
    audit: '删除操作会记录当前账号、简历和项目经历。',
    tips: ['确认这段项目经历不再用于证明目标岗位能力。', '确认删除后仍有足够项目证据支撑简历。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteResumeProjectApi(resumeId.value, project.projectId)
  ElMessage.success('项目经历已删除')
  await fetchDetail()
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.resume-editor {
  gap: 20px;
}

.editor-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  border: 1px solid rgba(129, 140, 248, 0.26);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.06)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);

  h1 {
    margin: 12px 0 0;
    font-size: 30px;
  }

  p {
    max-width: 680px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.hero-kicker,
.hero-actions,
.section-heading,
.section-heading__left,
.section-icon,
.switch-line,
.form-actions,
.project-card,
.project-card__top,
.project-actions,
.completion-head,
.completion-list span,
.capability-item,
.full-button {
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

.hero-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.editor-main,
.editor-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.editor-aside {
  position: sticky;
  top: 84px;
}

.editor-section {
  padding: 22px;
}

.section-heading {
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 19px;
  }

  p {
    margin: 7px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.section-heading.compact {
  margin-bottom: 16px;
}

.section-heading__left {
  align-items: flex-start;
  gap: 12px;
}

.section-icon {
  flex: 0 0 auto;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.16);
  color: #c4b5fd;
}

.resume-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.section-divider {
  height: 1px;
  margin: 8px 0 22px;
  background: rgba(148, 163, 184, 0.14);
}

.switch-line {
  min-height: 32px;
  gap: 10px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-actions {
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.project-header {
  justify-content: space-between;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-empty {
  padding: 42px 20px;
  border: 1px dashed rgba(148, 163, 184, 0.22);
  border-radius: var(--app-radius);
  color: var(--app-text-muted);
  text-align: center;

  h3 {
    margin: 14px 0 0;
    color: var(--app-text);
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
  }
}

.project-card {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: var(--app-radius);
  background: rgba(2, 6, 23, 0.28);
}

.project-card__main {
  min-width: 0;
}

.project-card__top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
  }

  span {
    flex: 0 0 auto;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.project-meta,
.project-desc {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.project-desc {
  color: #cbd5e1;
}

.project-actions {
  flex: 0 0 auto;
  gap: 8px;
}

.side-panel {
  padding: 18px;

  h3 {
    margin: 0 0 10px;
    font-size: 16px;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  ul {
    margin: 10px 0 0;
    padding-left: 18px;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.8;
  }
}

.completion-head {
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    font-size: 24px;
  }
}

.completion-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 16px;

  span {
    gap: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .done {
    color: #86efac;
  }
}

.capability-item {
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  font-size: 13px;

  &:last-of-type {
    border-bottom: 0;
  }
}

.full-button {
  justify-content: center;
  width: 100%;
  margin-top: 14px;
  gap: 8px;
}

.ai-panel {
  border-color: rgba(129, 140, 248, 0.24);
  background:
    linear-gradient(180deg, rgba(99, 102, 241, 0.1), rgba(2, 6, 23, 0.12)),
    rgba(15, 23, 42, 0.72);
}

.optimize-form {
  margin-top: 14px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

.optimize-records {
  margin-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.sse-progress {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.24);

  p {
    margin: 8px 0 0;
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.6;
  }
}

.sse-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
}

.sse-progress__hint {
  color: #a5b4fc;
}

.sse-progress__action {
  margin-top: 8px;
  padding-left: 0;
}

.sse-progress__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.record-row {
  display: block;
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  span,
  small {
    display: block;
  }

  span {
    color: #dbeafe;
    font-size: 13px;
  }

  small {
    margin-top: 4px;
    color: var(--app-text-muted);
  }
}

.optimize-result {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 14px;
  background: rgba(8, 47, 73, 0.18);

  > p {
    margin: 10px 0 0;
    color: #cbd5e1;
  }
}

.score-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    color: #a5b4fc;
    font-size: 26px;
  }
}

.rewrite-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;

  article {
    padding: 10px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.26);
  }

  span {
    color: #dbeafe;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}

.rewrite-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.rewrite-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  :deep(.el-checkbox__label) {
    color: #dbeafe;
    font-weight: 700;
  }
}

.rewrite-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;

  div {
    min-width: 0;
    padding: 10px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.42);
  }
}

.rewrite-reason {
  color: #cbd5e1 !important;
}

@media (max-width: 1120px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-aside {
    position: static;
  }
}

@media (max-width: 760px) {
  .editor-hero,
  .project-header,
  .project-card,
  .project-card__top {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .form-grid,
  .completion-list {
    grid-template-columns: 1fr;
  }
}
</style>
