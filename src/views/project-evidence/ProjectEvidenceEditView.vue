<template>
  <div class="project-evidence-edit page-shell">
    <section class="edit-hero">
      <div>
        <p class="hero-kicker">项目证据</p>
        <h1>{{ isEdit ? '编辑项目证据' : '新增项目证据' }}</h1>
        <p>{{ sourceMode ? '从简历项目生成一份独立证据，后续编辑不会同步回简历。' : '手动维护项目事实、难点、结果和复盘证据。' }}</p>
      </div>
      <el-button @click="goBack">
        <ArrowLeft :size="16" />
        返回
      </el-button>
    </section>

    <div class="edit-layout">
      <main class="content-card edit-main" v-loading="loading">
        <el-alert
          v-if="sourceMode && !isEdit"
          class="source-alert"
          type="info"
          show-icon
          :closable="false"
          title="本次会从简历项目生成一份独立证据"
          description="生成后仅记录来源 resume_project，不会建立自动双向同步。"
        />
        <ProjectEvidenceForm ref="formRef" :model-value="formModel" />
        <div class="form-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存证据</el-button>
        </div>
      </main>

      <aside class="edit-aside">
        <ProjectCompletenessPanel
          v-if="detail"
          :score="detail.completenessScore"
          :status="detail.completenessStatus"
          :missing-fields="detail.missingFields"
        />
        <section class="content-card side-note">
          <h3>证据状态</h3>
          <p>在这里维护项目事实和能力证据。面试讲述生成、JD 覆盖和后续任务交接可在详情页完成。</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createProjectEvidenceApi,
  getProjectEvidenceDetailApi,
  importProjectEvidenceFromResumeProjectApi,
  updateProjectEvidenceApi
} from '@/api/projectEvidence'
import ProjectCompletenessPanel from '@/components/project-evidence/ProjectCompletenessPanel.vue'
import ProjectEvidenceForm from '@/components/project-evidence/ProjectEvidenceForm.vue'
import type { ProjectEvidenceDTO, ProjectEvidenceDetailVO } from '@/types/projectEvidence'
import { getErrorMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => getRouteNumberParam(route.params.id as string))
const isEdit = computed(() => Boolean(projectId.value))
const sourceResumeId = computed(() => Number(route.query.sourceResumeId || 0) || undefined)
const sourceResumeProjectId = computed(() => Number(route.query.sourceResumeProjectId || 0) || undefined)
const sourceMode = computed(() => Boolean(sourceResumeId.value && sourceResumeProjectId.value))

const formRef = ref<InstanceType<typeof ProjectEvidenceForm>>()
const loading = ref(false)
const saving = ref(false)
const detail = ref<ProjectEvidenceDetailVO | null>(null)

const formModel = computed<Partial<ProjectEvidenceDTO>>(() => detail.value || {
  sourceResumeId: sourceResumeId.value,
  sourceResumeProjectId: sourceResumeProjectId.value
})

const fetchDetail = async () => {
  if (!projectId.value) return
  loading.value = true
  try {
    detail.value = await getProjectEvidenceDetailApi(projectId.value)
  } finally {
    loading.value = false
  }
}

const importFromSource = async () => {
  if (!sourceMode.value || isEdit.value || loading.value) return
  loading.value = true
  try {
    const saved = await importProjectEvidenceFromResumeProjectApi({
      sourceResumeId: sourceResumeId.value!,
      sourceResumeProjectId: sourceResumeProjectId.value!
    })
    ElMessage.success('已从简历项目生成项目证据。')
    await router.replace(`/project-evidence/${saved.id}/edit`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '从简历项目生成项目证据失败，请稍后重试。'))
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (projectId.value) {
    router.push(`/project-evidence/${projectId.value}`)
    return
  }
  router.push('/project-evidence')
}

const handleSave = async () => {
  const payload = (await formRef.value?.validate()) as ProjectEvidenceDTO | false
  if (!payload) return
  saving.value = true
  try {
    let saved: ProjectEvidenceDetailVO
    if (projectId.value) {
      saved = await updateProjectEvidenceApi(projectId.value, payload)
    } else {
      saved = await createProjectEvidenceApi(payload)
    }
    ElMessage.success('项目证据已保存。')
    await router.replace(`/project-evidence/${saved.id}`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '项目证据保存失败，请稍后重试'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (sourceMode.value && !isEdit.value) {
    importFromSource()
    return
  }
  fetchDetail()
})
</script>

<style scoped lang="scss">
.project-evidence-edit {
  gap: 18px;
}

.edit-hero,
.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.72);

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
  }

  p:last-child {
    margin: 8px 0 0;
    color: var(--app-text-muted);
  }
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.edit-main {
  padding: 20px;
}

.source-alert {
  margin-bottom: 18px;
}

.form-actions {
  justify-content: flex-end;
  margin-top: 18px;
}

.edit-aside {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 84px;
}

.side-note {
  padding: 18px;

  h3 {
    margin: 0;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

@media (max-width: 1020px) {
  .edit-layout {
    grid-template-columns: 1fr;
  }

  .edit-aside {
    position: static;
  }
}

@media (max-width: 760px) {
  .edit-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
