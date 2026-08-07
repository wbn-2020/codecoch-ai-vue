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
        <AppState
          v-if="isEdit && loadError"
          type="error"
          title="项目证据读取失败"
          :description="loadError"
        >
          <el-button type="primary" :loading="loading" @click="retryLoad">重新加载</el-button>
          <el-button @click="goBack">返回详情</el-button>
        </AppState>
        <template v-else>
          <el-alert
            v-if="sourceMode && !isEdit"
            class="source-alert"
            type="info"
            show-icon
            :closable="false"
            title="本次会从简历项目生成一份独立证据"
            description="生成后仅记录来源 resume_project，不会建立自动双向同步。"
          />
          <div v-if="sourceMode && !isEdit" class="source-import-actions">
            <el-button
              type="primary"
              :loading="importing"
              :disabled="saving"
              @click="handleImportFromSource"
            >
              确认从简历项目生成
            </el-button>
            <span>确认后才会创建独立项目证据。</span>
          </div>
          <ProjectEvidenceForm :key="formKey" ref="formRef" :model-value="formModel" />
          <div class="form-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button
              type="primary"
              :loading="saving"
              :disabled="importing"
              @click="handleSave"
            >
              保存证据
            </el-button>
          </div>
        </template>
      </main>

      <aside v-if="!isEdit || !loadError" class="edit-aside">
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter
} from 'vue-router'

import {
  createProjectEvidenceApi,
  getProjectEvidenceDetailApi,
  importProjectEvidenceFromResumeProjectApi,
  updateProjectEvidenceApi
} from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
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
const routeContext = computed(() => ({
  projectId: projectId.value,
  sourceResumeId: sourceResumeId.value,
  sourceResumeProjectId: sourceResumeProjectId.value
}))
const formKey = computed(() => [
  projectId.value || 'create',
  sourceResumeId.value || 'manual',
  sourceResumeProjectId.value || 'manual'
].join(':'))

const formRef = ref<InstanceType<typeof ProjectEvidenceForm>>()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const importing = ref(false)
const importSubmitting = ref(false)
const detail = ref<ProjectEvidenceDetailVO | null>(null)
let routeLoadGeneration = 0
let saveOperationGeneration = 0
let sourceImportOperationGeneration = 0

const formModel = computed<Partial<ProjectEvidenceDTO>>(() => detail.value || {
  sourceResumeId: sourceResumeId.value,
  sourceResumeProjectId: sourceResumeProjectId.value
})

const fetchDetail = async (id: number, requestGeneration: number) => {
  loading.value = true
  loadError.value = ''
  try {
    const nextDetail = await getProjectEvidenceDetailApi(id)
    if (requestGeneration === routeLoadGeneration) {
      detail.value = nextDetail
    }
  } catch (error) {
    if (requestGeneration === routeLoadGeneration) {
      detail.value = null
      loadError.value = getErrorMessage(error, '项目证据暂时无法读取，请稍后重试。')
    }
  } finally {
    if (requestGeneration === routeLoadGeneration) {
      loading.value = false
    }
  }
}

const retryLoad = () => {
  const id = projectId.value
  if (!id || loading.value) return
  const requestGeneration = ++routeLoadGeneration
  detail.value = null
  void fetchDetail(id, requestGeneration)
}

const goBack = () => {
  if (projectId.value) {
    router.push(`/project-evidence/${projectId.value}`)
    return
  }
  router.push('/project-evidence')
}

const handleSave = async () => {
  if (saving.value || importing.value || !formRef.value) return
  const operationGeneration = ++saveOperationGeneration
  const requestGeneration = routeLoadGeneration
  const targetProjectId = projectId.value
  if (targetProjectId && (loadError.value || !detail.value)) {
    ElMessage.warning('项目证据尚未成功读取，不能覆盖保存。请先重新加载。')
    return
  }
  const isCurrentOperation = () => (
    operationGeneration === saveOperationGeneration
    && requestGeneration === routeLoadGeneration
    && targetProjectId === projectId.value
  )

  saving.value = true
  try {
    const payload = (await formRef.value.validate()) as ProjectEvidenceDTO | false
    if (!payload || !isCurrentOperation()) return
    const payloadSnapshot: ProjectEvidenceDTO = { ...payload }
    let saved: ProjectEvidenceDetailVO
    if (targetProjectId) {
      saved = await updateProjectEvidenceApi(targetProjectId, payloadSnapshot)
    } else {
      saved = await createProjectEvidenceApi(payloadSnapshot)
    }
    if (!isCurrentOperation()) return
    ElMessage.success('项目证据已保存。')
    await router.replace(`/project-evidence/${saved.id}`)
  } catch (error) {
    if (isCurrentOperation()) {
      ElMessage.error(getErrorMessage(error, '项目证据保存失败，请稍后重试'))
    }
  } finally {
    if (operationGeneration === saveOperationGeneration) {
      saving.value = false
    }
  }
}

const isCurrentSourceImport = (
  operationGeneration: number,
  requestGeneration: number,
  resumeId: number,
  resumeProjectId: number
) => (
  operationGeneration === sourceImportOperationGeneration
  && requestGeneration === routeLoadGeneration
  && !projectId.value
  && resumeId === sourceResumeId.value
  && resumeProjectId === sourceResumeProjectId.value
)

const handleImportFromSource = async () => {
  if (importing.value || saving.value) return
  const resumeId = sourceResumeId.value
  const resumeProjectId = sourceResumeProjectId.value
  if (!resumeId || !resumeProjectId || projectId.value) return

  const operationGeneration = ++sourceImportOperationGeneration
  const requestGeneration = routeLoadGeneration
  importing.value = true
  try {
    try {
      await ElMessageBox.confirm(
        '将从当前简历项目创建一份独立项目证据。创建完成后，后续编辑不会同步回原简历。',
        '确认生成项目证据',
        {
          type: 'warning',
          confirmButtonText: '确认生成',
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }

    if (!isCurrentSourceImport(
      operationGeneration,
      requestGeneration,
      resumeId,
      resumeProjectId
    )) return

    importSubmitting.value = true
    const saved = await importProjectEvidenceFromResumeProjectApi({
      sourceResumeId: resumeId,
      sourceResumeProjectId: resumeProjectId
    })
    if (!isCurrentSourceImport(
      operationGeneration,
      requestGeneration,
      resumeId,
      resumeProjectId
    )) return

    importSubmitting.value = false
    importing.value = false
    ElMessage.success('已从简历项目生成项目证据。')
    await router.replace(`/project-evidence/${saved.id}/edit`)
  } catch (error) {
    if (isCurrentSourceImport(
      operationGeneration,
      requestGeneration,
      resumeId,
      resumeProjectId
    )) {
      ElMessage.error(getErrorMessage(error, '从简历项目生成项目证据失败，请稍后重试。'))
    }
  } finally {
    if (operationGeneration === sourceImportOperationGeneration) {
      importSubmitting.value = false
      importing.value = false
    }
  }
}

const guardSourceImportNavigation = () => {
  if (!importSubmitting.value) return true
  ElMessage.warning('项目证据正在创建，请等待当前操作完成后再离开。')
  return false
}

onBeforeRouteLeave(guardSourceImportNavigation)
onBeforeRouteUpdate(guardSourceImportNavigation)

watch(
  routeContext,
  ({ projectId: nextProjectId }) => {
    const requestGeneration = ++routeLoadGeneration
    sourceImportOperationGeneration += 1
    importing.value = false
    importSubmitting.value = false
    detail.value = null
    loading.value = false
    loadError.value = ''

    if (nextProjectId) {
      void fetchDetail(nextProjectId, requestGeneration)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  routeLoadGeneration += 1
  saveOperationGeneration += 1
  sourceImportOperationGeneration += 1
})
</script>

<style scoped lang="scss">
.project-evidence-edit {
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.edit-hero,
.form-actions,
.source-import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.source-import-actions {
  color: var(--user-text-muted);
  font-size: 13px;
}

.edit-hero {
  justify-content: space-between;
  padding: 22px 24px;
  border: 1.5px solid var(--user-primary-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface-tint);
  box-shadow: var(--arena-shadow-card);

  h1 {
    margin: 6px 0 0;
    color: var(--arena-ink);
    font-size: 26px;
  }

  p:last-child {
    margin: 8px 0 0;
    color: var(--arena-sub);
  }
}

.hero-kicker {
  margin: 0;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
  gap: 14px;
  align-items: start;
}

.edit-main {
  padding: 16px;
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
    color: var(--user-text-muted);
    line-height: 1.65;
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
