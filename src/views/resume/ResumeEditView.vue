<template>
  <div class="resume-editor page-shell">
    <section class="editor-hero">
      <div>
        <div class="hero-kicker">
          <FilePenLine :size="16" />
          Structured Resume Editor
        </div>
        <h1>{{ isEdit ? '编辑简历' : '新增简历' }}</h1>
        <p>以结构化方式维护基本信息、求职目标、技术栈和项目经历，供后续真实面试流程读取。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')">
          <ArrowLeft :size="16" />
          返回简历中心
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
                  <span>保存后会通过默认简历接口生效</span>
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
                <p>保留现有字段结构，不向后端提交本轮新增字段。</p>
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
                <p>手动维护项目背景、职责、难点和优化结果，不伪造 AI 解析或优化结论。</p>
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
          <p>创建面试页会从真实简历列表中选择简历作为上下文，不在本页改动面试接口。</p>
          <el-button class="full-button" @click="router.push('/interviews/create')">
            <MessagesSquare :size="16" />
            去创建面试
          </el-button>
        </section>

        <section v-if="isEdit && resumeId" class="content-card side-panel ai-panel">
          <h3>AI 简历优化</h3>
          <p>基于当前已保存简历触发真实 V2 优化接口。结果只展示建议，不会自动覆盖当前表单。</p>
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
            发起 AI 优化
          </el-button>

          <div v-if="optimizeSseEvents.length || optimizeSseMessage" class="sse-progress">
            <div class="sse-progress__head">
              <span>阶段式优化进度</span>
              <el-tag size="small" effect="plain">{{ optimizeSseStatus }}</el-tag>
            </div>
            <p>{{ optimizeSseMessage || '等待后端阶段事件返回。' }}</p>
            <div class="sse-progress__list">
              <span v-for="(event, index) in optimizeSseEvents" :key="`${event.type}-${index}`">
                {{ event.stage || event.type }} · {{ event.message }}
              </span>
            </div>
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
              <span>#{{ record.optimizeRecordId }} · {{ optimizeStatusText(record.optimizeStatus) }}</span>
              <small>{{ formatDateTime(record.createdAt || record.updatedAt) }}</small>
            </button>
          </div>

          <div v-if="optimizeDetail" class="optimize-result">
            <div class="score-line">
              <span>综合评分</span>
              <strong>{{ optimizeDetail.resultJson?.overallScore ?? '--' }}</strong>
            </div>
            <p>{{ optimizeDetail.resultJson?.overallComment || optimizeDetail.errorMessage || '后端未返回整体评价。' }}</p>
            <div v-if="optimizeDetail.resultJson?.rewriteSuggestions?.length" class="rewrite-list">
              <article v-for="(item, index) in optimizeDetail.resultJson.rewriteSuggestions.slice(0, 3)" :key="index">
                <span>{{ item.projectName || item.section || `建议 ${index + 1}` }}</span>
                <p>{{ item.after || item.reason || '后端未返回改写内容' }}</p>
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
                应用优化结果 · 创建 AI 草稿
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
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
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
  streamResumeOptimizeApi,
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
  ResumeOptimizeSseEvent,
  ResumeProjectDTO,
  ResumeProjectVO
} from '@/types/resume'
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
const optimizeSseEvents = ref<Array<{ type: string; stage?: string; message: string }>>([])
const optimizeSseMessage = ref('')
const optimizeSseStatus = ref('未开始')
const optimizeSseHandle = ref<ReturnType<typeof streamResumeOptimizeApi> | null>(null)

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

const canApplyOptimizeResult = computed(() => optimizeDetail.value?.optimizeStatus === 'SUCCESS')

const applyOptimizeDisabledReason = computed(() => {
  if (!optimizeDetail.value) return '请选择一条优化记录'
  if (optimizeDetail.value.optimizeStatus !== 'SUCCESS') return '仅成功的优化记录可应用'
  return ''
})

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
  } finally {
    loading.value = false
  }
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '优化中',
    SUCCESS: '优化成功',
    FAILED: '优化失败'
  }
  return status ? map[status] || status : '暂无记录'
}

const fetchOptimizeRecords = async () => {
  if (!resumeId.value) return
  optimizeRecords.value = await getResumeOptimizeRecordsApi(resumeId.value)
  if (!optimizeDetail.value && optimizeRecords.value[0]) {
    optimizeDetail.value = await getResumeOptimizeResultApi(optimizeRecords.value[0].optimizeRecordId)
  }
}

const openOptimizeDetail = async (recordId: number) => {
  optimizeDetail.value = await getResumeOptimizeResultApi(recordId)
}

const buildOptimizePayload = (): ResumeOptimizeRequestDTO => ({
  targetPosition: optimizeForm.targetPosition || form.targetPosition,
  experienceYears: optimizeForm.experienceYears,
  industryDirection: optimizeForm.industryDirection,
  selectedProjectIds: projects.value.map((project) => project.projectId).filter(Boolean)
})

const runSyncOptimizeFallback = async () => {
  if (!resumeId.value) return
  optimizeSseStatus.value = '同步 fallback'
  optimizeSseMessage.value = 'SSE 未启动成功，已回退到原同步优化接口。'
  const result = await optimizeResumeApi(resumeId.value, buildOptimizePayload())
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(result.errorMessage || 'AI 优化失败')
  } else {
    ElMessage.success('AI 优化已完成')
  }
  await fetchOptimizeRecords()
  if (result.optimizeRecordId) {
    await openOptimizeDetail(result.optimizeRecordId)
  }
}

const pushOptimizeSseEvent = (type: string, data?: ResumeOptimizeSseEvent) => {
  const messageMap: Record<string, string> = {
    start: '简历优化开始',
    delta: '简历优化进行中',
    metadata: '简历优化状态更新',
    progress: '简历优化进行中',
    result: '已收到优化结果',
    done: '简历优化完成',
    error: '简历优化失败'
  }
  const message = data?.message || messageMap[type] || type
  optimizeSseStatus.value = type
  optimizeSseMessage.value = data?.stage ? `${data.stage}：${message}` : message
  optimizeSseEvents.value.push({
    type,
    stage: data?.stage,
    message
  })
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

const handleOptimizeResume = async () => {
  if (!resumeId.value || optimizing.value) return
  optimizeSseHandle.value?.abort()
  optimizing.value = true
  optimizeSseEvents.value = []
  optimizeSseMessage.value = '正在启动阶段式优化进度。'
  optimizeSseStatus.value = '启动中'
  let streamStarted = false
  let resultRecordId: number | undefined

  try {
    optimizeSseHandle.value = streamResumeOptimizeApi(
      {
        resumeId: resumeId.value,
        targetPosition: optimizeForm.targetPosition || form.targetPosition,
        experienceYears: optimizeForm.experienceYears,
        industryDirection: optimizeForm.industryDirection
      },
      {
        onEvent: (event, data) => {
          if (event === 'start' || event === 'delta' || event === 'metadata' || event === 'progress' || event === 'result' || event === 'done') {
            streamStarted = true
          }
          pushOptimizeSseEvent(event, data)
          resultRecordId = resolveOptimizeRecordId(data) || resultRecordId
        }
      }
    )
    await optimizeSseHandle.value.finished
    await fetchOptimizeRecords()
    if (resultRecordId) {
      await openOptimizeDetail(resultRecordId)
    }
    ElMessage.success('AI 优化已完成')
  } catch (error) {
    if (!streamStarted) {
      await runSyncOptimizeFallback()
    } else {
      ElMessage.error(error instanceof Error ? error.message : 'AI 优化流中断，请稍后手动重试。')
    }
  } finally {
    optimizing.value = false
    optimizeSseHandle.value = null
  }
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
  await formRef.value.validate()
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
  const payload = (await projectFormRef.value.validate()) as ResumeProjectDTO | false
  if (!payload) return
  projectSaving.value = true
  try {
    if (editingProjectId.value) {
      await updateResumeProjectApi(resumeId.value, editingProjectId.value, payload)
    } else {
      await createResumeProjectApi(resumeId.value, payload)
    }
    ElMessage.success('项目经历已保存')
    projectDialogVisible.value = false
    await fetchDetail()
  } finally {
    projectSaving.value = false
  }
}

const handleDeleteProject = async (project: ResumeProjectVO) => {
  if (!resumeId.value) return
  await ElMessageBox.confirm(`确认删除项目经历「${project.projectName}」？`, '删除确认', { type: 'warning' })
  await deleteResumeProjectApi(resumeId.value, project.projectId)
  ElMessage.success('项目经历已删除')
  await fetchDetail()
}

onMounted(fetchDetail)
onUnmounted(() => {
  optimizeSseHandle.value?.abort()
})
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
