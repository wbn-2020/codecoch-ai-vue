<template>
  <div class="project-page page-shell">
    <section class="page-hero">
      <div>
        <div class="eyebrow">Project Experience</div>
        <h1>项目经历管理</h1>
        <p>项目经历归属于简历，页面按真实简历上下文调用项目 CRUD 接口。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')">简历列表</el-button>
        <el-button type="primary" :disabled="!selectedResumeId" @click="openDialog()">添加项目经历</el-button>
      </div>
    </section>

    <div class="project-layout">
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Resume</p>
              <h2>选择简历</h2>
            </div>
            <el-button text @click="loadResumes">刷新</el-button>
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
              <strong>{{ resume.resumeName || resume.title || `简历 #${resume.id}` }}</strong>
              <span>{{ resume.targetPosition || '未填写求职方向' }}</span>
            </button>
            <AppState v-if="!loadingResumes && !resumes.length" type="empty" title="暂无简历" description="请先创建或上传一份简历。" />
          </div>
        </div>
      </section>

      <section class="content-card project-main">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Projects</p>
              <h2>{{ selectedResume?.resumeName || '项目经历' }}</h2>
            </div>
            <el-button type="primary" :disabled="!selectedResumeId" @click="openDialog()">新增项目</el-button>
          </div>

          <AppState v-if="error" type="error" title="项目加载失败" :description="error">
            <el-button type="primary" @click="loadSelectedResume">重试</el-button>
          </AppState>

          <div v-else v-loading="loadingDetail" class="project-list">
            <article v-for="project in projects" :key="project.projectId" class="project-card">
              <div class="project-card__head">
                <div>
                  <h3>{{ project.projectName }}</h3>
                  <span>{{ project.projectTime || project.projectPeriod || '未填写项目周期' }}</span>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="openDialog(project)">编辑</el-button>
                  <el-button size="small" type="danger" plain @click="deleteProject(project)">删除</el-button>
                </div>
              </div>
              <p class="tech">{{ project.techStack || '未填写技术栈' }}</p>
              <p>{{ project.projectBackground || project.description || '暂无项目背景' }}</p>
              <div class="detail-grid">
                <div><span>职责</span><p>{{ project.responsibility || project.role || '--' }}</p></div>
                <div><span>核心功能</span><p>{{ project.coreFeatures || project.highlights || '--' }}</p></div>
                <div><span>技术难点</span><p>{{ project.technicalChallenges || project.technicalDifficulties || '--' }}</p></div>
                <div><span>优化结果</span><p>{{ project.optimizationResult || project.optimizationResults || '--' }}</p></div>
              </div>
            </article>
            <AppState v-if="selectedResumeId && !projects.length" type="empty" title="暂无项目经历" description="可以为当前简历新增真实项目经历。" />
            <AppState v-if="!selectedResumeId && !loadingResumes" type="empty" title="请选择简历" description="项目经历必须挂在具体简历下。" />
          </div>
        </div>
      </section>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingProject ? '编辑项目' : '新增项目'" width="720px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="项目名称" prop="projectName">
            <el-input v-model.trim="form.projectName" />
          </el-form-item>
          <el-form-item label="项目周期">
            <el-input v-model.trim="form.projectTime" placeholder="2024.01 - 2024.08" />
          </el-form-item>
        </div>
        <el-form-item label="技术栈">
          <el-input v-model.trim="form.techStack" />
        </el-form-item>
        <el-form-item label="项目背景">
          <el-input v-model="form.projectBackground" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="职责">
          <el-input v-model="form.responsibility" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="核心功能">
          <el-input v-model="form.coreFeatures" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="技术难点">
          <el-input v-model="form.technicalChallenges" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="优化结果">
          <el-input v-model="form.optimizationResult" type="textarea" :rows="3" />
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
import { ElMessage, ElMessageBox } from 'element-plus'
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
    error.value = err instanceof Error ? err.message : '接口请求失败'
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

const saveProject = async () => {
  if (!selectedResumeId.value) return
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editingProject.value?.projectId) {
      await updateResumeProjectApi(selectedResumeId.value, editingProject.value.projectId, form)
      ElMessage.success('项目已更新')
    } else {
      await createResumeProjectApi(selectedResumeId.value, form)
      ElMessage.success('项目已新增')
    }
    dialogVisible.value = false
    await loadSelectedResume()
  } finally {
    saving.value = false
  }
}

const deleteProject = async (project: ResumeProjectVO) => {
  if (!selectedResumeId.value) return
  await ElMessageBox.confirm(`确认删除「${project.projectName}」？`, '删除项目', { type: 'warning' })
  await deleteResumeProjectApi(selectedResumeId.value, project.projectId)
  ElMessage.success('项目已删除')
  await loadSelectedResume()
}

onMounted(loadResumes)
</script>

<style scoped lang="scss">
.page-hero,
.section-head,
.project-card__head,
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-hero {
  margin-bottom: 18px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 6px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.page-hero h1,
.section-head h2,
.project-card h3 {
  margin: 0;
}

.page-hero p,
.project-card p,
.project-card span,
.resume-item span {
  color: var(--app-text-muted);
}

.project-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
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
  background: rgba(15, 23, 42, 0.5);
}

.resume-item {
  display: grid;
  gap: 6px;
  width: 100%;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.resume-item.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.tech {
  color: var(--app-primary) !important;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.detail-grid div {
  padding: 12px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
}

.detail-grid span {
  font-size: 12px;
}

.card-actions,
.form-grid {
  display: flex;
  gap: 8px;
}

.form-grid > * {
  flex: 1;
}

@media (max-width: 900px) {
  .project-layout,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .page-hero,
  .section-head,
  .project-card__head,
  .hero-actions,
  .form-grid {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid > * {
    width: 100%;
  }
}
</style>
