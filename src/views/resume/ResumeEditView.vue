<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? '编辑简历' : '新建简历' }}</h1>
        <p class="page-subtitle">填写基础信息和项目经历，后续创建面试时可以选择这份简历作为上下文。</p>
      </div>
      <el-button @click="router.push('/resumes')">返回列表</el-button>
    </div>

    <section class="content-card" v-loading="loading">
      <div class="content-card__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
          <el-form-item label="简历名称" prop="resumeName">
            <el-input v-model.trim="form.resumeName" placeholder="例如：Java 后端 3 年经验简历" />
          </el-form-item>
          <el-form-item label="求职方向">
            <el-input v-model.trim="form.targetPosition" placeholder="例如：Java 微服务开发" />
          </el-form-item>
          <el-form-item label="技能栈" prop="skills">
            <el-input v-model="form.skills" type="textarea" :rows="3" placeholder="Spring Boot、MySQL、Redis、MQ..." />
          </el-form-item>
          <el-form-item label="工作摘要">
            <el-input v-model="form.workSummary" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="教育经历">
            <el-input v-model="form.education" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="默认简历">
            <el-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" />
            <span class="form-tip">保存后会通过默认简历接口生效。</span>
          </el-form-item>
        </el-form>

        <div class="form-actions">
          <el-button @click="router.push('/resumes')">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存简历</el-button>
        </div>
      </div>
    </section>

    <section v-if="isEdit && resumeId" class="content-card">
      <div class="content-card__body project-header">
        <div>
          <h2>项目经历</h2>
          <p>手动维护项目背景、职责、难点和优化成果，不提供文件解析或 AI 优化入口。</p>
        </div>
        <el-button type="primary" @click="openProjectDialog()">新增项目</el-button>
      </div>

      <div class="project-list">
        <el-empty v-if="projects.length === 0" description="暂无项目经历" />
        <article v-for="project in projects" v-else :key="project.projectId" class="project-item">
          <div>
            <h3>{{ project.projectName }}</h3>
            <p>{{ project.projectTime || '未填写项目时间' }} · {{ project.techStack || '未填写技术栈' }}</p>
            <p>{{ project.projectBackground || '暂无项目背景' }}</p>
          </div>
          <div class="project-actions">
            <el-button @click="openProjectDialog(project)">编辑</el-button>
            <el-button type="danger" plain @click="handleDeleteProject(project)">删除</el-button>
          </div>
        </article>
      </div>
    </section>

    <el-dialog v-model="projectDialogVisible" :title="editingProjectId ? '编辑项目经历' : '新增项目经历'" width="760px">
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createResumeApi,
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeDetailApi,
  setDefaultResumeApi,
  updateResumeApi,
  updateResumeProjectApi
} from '@/api/resume'
import ResumeProjectForm from '@/components/resume/ResumeProjectForm.vue'
import type { ResumeCreateDTO, ResumeDetailVO, ResumeProjectDTO, ResumeProjectVO } from '@/types/resume'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const resumeId = computed(() => getRouteNumberParam(route.params.id as string))
const isEdit = computed(() => Boolean(resumeId.value))

const loading = ref(false)
const saving = ref(false)
const projectSaving = ref(false)
const formRef = ref<FormInstance>()
const projectFormRef = ref<InstanceType<typeof ResumeProjectForm>>()
const projectDialogVisible = ref(false)
const editingProjectId = ref<number | null>(null)
const editingProject = ref<ResumeProjectVO | null>(null)
const projects = ref<ResumeProjectVO[]>([])

const form = reactive<ResumeCreateDTO>({
  resumeName: '',
  targetPosition: '',
  skills: '',
  workSummary: '',
  education: '',
  isDefault: 0
})

const rules: FormRules<ResumeCreateDTO> = {
  resumeName: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  skills: [{ required: true, message: '请输入技能栈', trigger: 'blur' }]
}

const applyDetail = (detail: ResumeDetailVO) => {
  Object.assign(form, {
    resumeName: detail.resumeName,
    targetPosition: detail.targetPosition || '',
    skills: detail.skills || '',
    workSummary: detail.workSummary || '',
    education: detail.education || '',
    isDefault: detail.isDefault
  })
  projects.value = detail.projects || []
}

const fetchDetail = async () => {
  if (!resumeId.value) return
  loading.value = true
  try {
    applyDetail(await getResumeDetailApi(resumeId.value))
  } finally {
    loading.value = false
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
      await updateResumeProjectApi(editingProjectId.value, payload)
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
  await ElMessageBox.confirm(`确认删除项目经历 ${project.projectName}？`, '删除确认', { type: 'warning' })
  await deleteResumeProjectApi(project.projectId)
  ElMessage.success('项目经历已删除')
  await fetchDetail()
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.form-tip {
  margin-left: 10px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.project-list {
  border-top: 1px solid var(--app-border);
}

.project-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--app-border);

  h3 {
    margin: 0;
    font-size: 16px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.project-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 760px) {
  .project-header,
  .project-item {
    flex-direction: column;
  }
}
</style>
