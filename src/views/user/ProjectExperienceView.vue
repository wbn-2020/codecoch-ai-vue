<template>
  <div class="project-page page-shell">
    <section class="page-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <FileText :size="16" />
          项目证据库
        </p>
        <h1>把项目说成面试能用的证据</h1>
        <p>围绕当前简历整理项目背景、职责、技术难点和结果，让后续岗位匹配、模拟面试和答题训练都能直接引用。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" :disabled="!selectedResumeId" @click="openDialog()">
            <Plus :size="17" />
            新增项目证据
          </el-button>
          <el-button size="large" @click="router.push('/resumes/manage')">
            <Briefcase :size="17" />
            返回简历列表
          </el-button>
          <el-button size="large" text :loading="loadingResumes" @click="loadResumes">
            <RefreshCw :size="17" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="hero-panel" v-loading="loadingResumes || loadingDetail">
        <span>当前简历</span>
        <template v-if="selectedResume">
          <strong>{{ selectedResume.resumeName || selectedResume.title || '当前简历' }}</strong>
          <p>{{ selectedResume.targetPosition || '目标方向暂未填写' }}</p>
          <dl>
            <div>
              <dt>项目数量</dt>
              <dd>{{ projects.length }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ formatDate(selectedResume.updatedAt || selectedResume.createdAt) }}</dd>
            </div>
          </dl>
        </template>
        <template v-else>
          <strong>还没有选中简历</strong>
          <p>先选一份简历，项目证据才会挂到对应的求职上下文里。</p>
        </template>
      </div>
    </section>

    <section class="overview-grid">
      <article class="overview-card">
        <span>项目总数</span>
        <strong>{{ projects.length }}</strong>
        <p>当前简历下可以直接用于面试表达的项目条目。</p>
      </article>
      <article class="overview-card">
        <span>高完整度</span>
        <strong>{{ completeProjects }}</strong>
        <p>已经补齐技术栈、职责、难点和结果的项目。</p>
      </article>
      <article class="overview-card">
        <span>待补充</span>
        <strong>{{ incompleteProjects }}</strong>
        <p>还需要补一两项关键信息才能更好地支撑追问。</p>
      </article>
      <article class="overview-card">
        <span>最近更新时间</span>
        <strong class="overview-date">{{ latestUpdatedAt }}</strong>
        <p>帮助判断项目证据是否需要再整理一轮。</p>
      </article>
    </section>

    <section class="project-layout">
      <section class="content-card resume-panel">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">简历上下文</p>
              <h2>选择一份简历</h2>
            </div>
            <el-button text @click="loadResumes">刷新列表</el-button>
          </div>

          <div v-loading="loadingResumes" class="resume-list">
            <button
              v-for="resume in resumes"
              :key="resume.id"
              class="resume-item"
              :class="{ active: selectedResumeId === resume.id }"
              type="button"
              @click="selectResume(resume.id)"
            >
              <strong>{{ resume.resumeName || resume.title || '简历' }}</strong>
              <span>{{ resume.targetPosition || '目标方向待补充' }}</span>
              <small>{{ resume.projectCount || 0 }} 个项目</small>
            </button>
            <AppState
              v-if="!loadingResumes && !resumes.length"
              type="empty"
              title="暂无简历"
              description="先创建或上传一份简历，再来整理项目证据。"
            >
              <el-button type="primary" @click="router.push('/resumes/create')">创建简历</el-button>
            </AppState>
          </div>
        </div>
      </section>

      <section class="content-card project-main">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">项目表达</p>
              <h2>{{ selectedResume?.resumeName || '项目证据' }}</h2>
            </div>
            <el-button type="primary" :disabled="!selectedResumeId" @click="openDialog()">
              <Plus :size="16" />
              新增项目
            </el-button>
          </div>

          <AppState v-if="error" type="error" title="项目加载失败" :description="error">
            <el-button type="primary" @click="loadSelectedResume">重新加载</el-button>
          </AppState>

          <div v-else v-loading="loadingDetail" class="project-list">
            <AppState
              v-if="selectedResumeId && !projects.length"
              type="empty"
              title="还没有项目证据"
              description="可以从最近做过的业务、实习或课程项目开始整理。"
            >
              <el-button type="primary" @click="openDialog()">添加第一个项目</el-button>
            </AppState>

            <AppState
              v-if="!selectedResumeId && !loadingResumes"
              type="empty"
              title="请选择简历"
              description="项目证据需要挂在具体简历下。"
            />

            <article v-for="project in projects" :key="project.projectId" class="project-card">
              <div class="project-card__head">
                <div>
                  <h3>{{ project.projectName }}</h3>
                  <p>{{ project.projectTime || project.projectPeriod || '项目周期待补充' }}</p>
                </div>
                <div class="card-actions">
                  <el-tag :type="projectCompletionType(project)" effect="plain">
                    {{ projectCompletionLabel(project) }}
                  </el-tag>
                  <el-button size="small" @click="openDialog(project)">编辑</el-button>
                  <el-button size="small" type="danger" plain @click="deleteProject(project)">删除</el-button>
                </div>
              </div>

              <p class="project-summary">
                {{ project.projectBackground || project.description || '补充项目背景后，这里会更适合面试开场。' }}
              </p>

              <div class="evidence-grid">
                <article>
                  <span>技术栈</span>
                  <strong>{{ project.techStack || '待补充' }}</strong>
                </article>
                <article>
                  <span>职责</span>
                  <strong>{{ project.responsibility || project.role || '待补充' }}</strong>
                </article>
                <article>
                  <span>核心功能</span>
                  <strong>{{ project.coreFeatures || project.highlights || '待补充' }}</strong>
                </article>
                <article>
                  <span>技术难点</span>
                  <strong>{{ project.technicalChallenges || project.technicalDifficulties || '待补充' }}</strong>
                </article>
                <article class="evidence-grid__wide">
                  <span>结果与优化</span>
                  <strong>{{ project.optimizationResult || project.optimizationResults || '待补充' }}</strong>
                </article>
              </div>
            </article>
          </div>
        </div>
      </section>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingProject ? '编辑项目证据' : '新增项目证据'" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="项目名称" prop="projectName">
            <el-input v-model.trim="form.projectName" placeholder="例：IM 课程答疑平台" />
          </el-form-item>
          <el-form-item label="项目周期">
            <el-input v-model.trim="form.projectTime" placeholder="2024.01 - 2024.08" />
          </el-form-item>
        </div>
        <el-form-item label="技术栈">
          <el-input v-model.trim="form.techStack" placeholder="Spring Boot / Vue / Redis / MySQL" />
        </el-form-item>
        <el-form-item label="项目背景">
          <el-input v-model="form.projectBackground" type="textarea" :rows="3" placeholder="这个项目解决了什么问题" />
        </el-form-item>
        <el-form-item label="职责">
          <el-input v-model="form.responsibility" type="textarea" :rows="3" placeholder="你具体负责什么" />
        </el-form-item>
        <el-form-item label="核心功能">
          <el-input v-model="form.coreFeatures" type="textarea" :rows="3" placeholder="项目里最关键的能力" />
        </el-form-item>
        <el-form-item label="技术难点">
          <el-input v-model="form.technicalChallenges" type="textarea" :rows="3" placeholder="最值得被追问的地方" />
        </el-form-item>
        <el-form-item label="结果与优化">
          <el-input v-model="form.optimizationResult" type="textarea" :rows="3" placeholder="最好有结果、指标或改进" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeDetailApi,
  getResumesApi,
  updateResumeProjectApi
} from '@/api/resume'
import AppState from '@/components/common/AppState.vue'
import type { ResumeDetailVO, ResumeProjectDTO, ResumeProjectVO, ResumeVO } from '@/types/resume'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const resumes = ref<ResumeVO[]>([])
const selectedResumeId = ref<number>()
const selectedDetail = ref<ResumeDetailVO>()
const loadingResumes = ref(false)
const loadingDetail = ref(false)
const saving = ref(false)
const error = ref('')
const dialogVisible = ref(false)
const editingProject = ref<ResumeProjectVO>()
const formRef = ref<FormInstance>()

const form = reactive<ResumeProjectDTO>({
  projectName: '',
  projectTime: '',
  projectBackground: '',
  techStack: '',
  responsibility: '',
  coreFeatures: '',
  technicalChallenges: '',
  optimizationResult: ''
})

const rules: FormRules = {
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const selectedResume = computed(() => resumes.value.find((item) => item.id === selectedResumeId.value))
const projects = computed(() => selectedDetail.value?.projects || [])

const completeProjects = computed(() =>
  projects.value.filter((project) => projectCompletionScore(project) >= 4).length
)

const incompleteProjects = computed(() => projects.value.length - completeProjects.value)

const latestUpdatedAt = computed(() => {
  const sortedDates = projects.value
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort()
  const latest = sortedDates[sortedDates.length - 1]
  return latest ? formatDateTime(latest) : '--'
})

const projectCompletionScore = (project: ResumeProjectVO) =>
  [
    project.techStack,
    project.responsibility || project.role,
    project.coreFeatures || project.highlights,
    project.technicalChallenges || project.technicalDifficulties,
    project.optimizationResult || project.optimizationResults
  ].filter((item) => Boolean(item && String(item).trim())).length

const projectCompletionLabel = (project: ResumeProjectVO) => {
  const score = projectCompletionScore(project)
  if (score >= 5) return '完整'
  if (score >= 3) return '可追问'
  return '待补充'
}

const projectCompletionType = (project: ResumeProjectVO) => {
  const score = projectCompletionScore(project)
  if (score >= 5) return 'success'
  if (score >= 3) return 'warning'
  return 'info'
}

const resetForm = () => {
  Object.assign(form, {
    projectName: '',
    projectTime: '',
    projectBackground: '',
    techStack: '',
    responsibility: '',
    coreFeatures: '',
    technicalChallenges: '',
    optimizationResult: ''
  })
}

const loadResumes = async () => {
  loadingResumes.value = true
  try {
    const page = await getResumesApi({ pageNo: 1, pageSize: 50 })
    resumes.value = page.records || []
    selectedResumeId.value ||= resumes.value[0]?.id
    if (selectedResumeId.value) await loadSelectedResume()
  } catch (err) {
    error.value = getErrorMessage(err, '简历列表加载失败。')
  } finally {
    loadingResumes.value = false
  }
}

const selectResume = async (resumeId: number) => {
  selectedResumeId.value = resumeId
  await loadSelectedResume()
}

const loadSelectedResume = async () => {
  if (!selectedResumeId.value) return
  loadingDetail.value = true
  error.value = ''
  try {
    selectedDetail.value = await getResumeDetailApi(selectedResumeId.value)
  } catch (err) {
    error.value = getErrorMessage(err, '项目证据加载失败，请稍后重试。')
  } finally {
    loadingDetail.value = false
  }
}

const openDialog = (project?: ResumeProjectVO) => {
  editingProject.value = project
  resetForm()
  if (project) {
    Object.assign(form, {
      projectName: project.projectName,
      projectTime: project.projectTime || project.projectPeriod || '',
      projectBackground: project.projectBackground || project.description || '',
      techStack: project.techStack || '',
      responsibility: project.responsibility || project.role || '',
      coreFeatures: project.coreFeatures || project.highlights || '',
      technicalChallenges: project.technicalChallenges || project.technicalDifficulties || '',
      optimizationResult: project.optimizationResult || project.optimizationResults || ''
    })
  }
  dialogVisible.value = true
}

const validateProjectForm = async () => {
  if (!formRef.value) return false
  return formRef.value.validate().catch(() => false)
}

const saveProject = async () => {
  if (!selectedResumeId.value) return
  const valid = await validateProjectForm()
  if (!valid) return

  saving.value = true
  try {
    if (editingProject.value?.projectId) {
      await updateResumeProjectApi(selectedResumeId.value, editingProject.value.projectId, form)
      ElMessage.success('项目证据已更新')
    } else {
      await createResumeProjectApi(selectedResumeId.value, form)
      ElMessage.success('项目证据已新增')
    }
    dialogVisible.value = false
    await loadSelectedResume()
  } catch (err) {
    const message = getErrorMessage(err, '项目证据保存失败，请检查必填项后重试。')
    ElMessage.error(message)
  } finally {
    saving.value = false
  }
}

const deleteProject = async (project: ResumeProjectVO) => {
  if (!selectedResumeId.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除项目证据',
    action: '删除当前简历中的项目证据',
    target: project.projectName || '项目证据',
    impact: '该项目证据会从当前简历中移除，后续简历匹配、面试追问和训练推荐将不再把它作为依据。',
    rollback: '系统不会自动恢复已删除项目；如误删，需要重新录入项目证据。',
    audit: '删除操作会记录当前账号、简历和项目证据。',
    tips: ['确认这段项目不再用于目标岗位表达。', '确认删除后仍有其他项目可支撑核心技能。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteResumeProjectApi(selectedResumeId.value, project.projectId)
  ElMessage.success('项目证据已删除')
  await loadSelectedResume()
}

const formatDate = (value?: string) => (value ? formatDateTime(value) : '--')

onMounted(loadResumes)
</script>

<style scoped lang="scss">
.project-page {
  gap: 18px;
}

.page-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.05)),
    #ffffff;
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions,
.section-head,
.project-card__head,
.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-copy h1,
.section-head h2,
.project-card h3 {
  margin: 0;
}

.hero-copy h1 {
  color: var(--app-text);
  font-size: 32px;
  line-height: 1.18;
}

.hero-copy p,
.project-card p,
.project-card strong,
.overview-card p,
.resume-item span,
.resume-item small,
.hero-panel p {
  color: var(--app-text-muted);
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-copy p {
  max-width: 720px;
  margin: 12px 0 0;
  line-height: 1.8;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.hero-panel {
  align-self: stretch;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
}

.hero-panel span,
.overview-card span,
.evidence-grid span,
.resume-item small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.hero-panel strong {
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.4;
}

.hero-panel dl {
  display: grid;
  gap: 10px;
  margin: 6px 0 0;
}

.hero-panel dl div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.hero-panel dd {
  margin: 0;
  color: var(--app-text);
  font-weight: 700;
  text-align: right;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.overview-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.overview-card strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 26px;
}

.overview-date {
  font-size: 16px !important;
  line-height: 1.5;
}

.overview-card p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.project-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 18px;
}

.resume-list,
.project-list {
  display: grid;
  gap: 12px;
}

.resume-item,
.project-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.resume-item {
  display: grid;
  gap: 4px;
  width: 100%;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.resume-item.active {
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--app-primary-soft);
}

.project-card__head {
  justify-content: space-between;
  align-items: flex-start;
}

.project-card h3 {
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.35;
}

.project-summary {
  margin: 14px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  line-height: 1.7;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.evidence-grid article {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.evidence-grid strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  line-height: 1.6;
}

.evidence-grid__wide {
  grid-column: 1 / -1;
}

.card-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-grid > * {
  min-width: 0;
}

@media (max-width: 1080px) {
  .page-hero,
  .project-layout,
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .form-grid,
  .evidence-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .card-actions,
  .project-card__head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
