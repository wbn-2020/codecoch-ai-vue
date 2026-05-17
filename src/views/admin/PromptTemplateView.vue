<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <MessageSquareCode :size="16" />
          <span>Prompt Engineering</span>
        </div>
        <h1 class="admin-hero__title">Prompt 模板治理</h1>
        <p class="admin-hero__desc">
          维护面试提问、答案评分、动态追问和报告生成模板。当前保留模板真实 CRUD，
          Prompt 内容变更已收敛到版本 API，版本管理面板已接入，测试面板待接入。
        </p>
      </div>
      <el-button type="primary" @click="openDialog()">
        <Plus :size="16" />
        新增模板
      </el-button>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>模板总数</span>
        <strong>{{ total }}</strong>
        <small>来自 Prompt 列表接口 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页启用</span>
        <strong>{{ enabledCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>场景类型</span>
        <strong>{{ sceneCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>版本治理</span>
        <strong>面板已接入</strong>
        <small>测试面板待接入</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header admin-panel__header--toolbar">
        <div>
          <h2>模板列表</h2>
          <p>搜索、启停、新增、编辑、删除均复用现有 Prompt 管理接口。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="名称 / 编码" />
          </el-form-item>
          <el-form-item label="场景类型">
            <el-select v-model="query.scene" clearable placeholder="全部类型" style="width: 220px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="prompts" row-key="id">
          <el-table-column prop="promptName" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="templateCode" label="模板编码" min-width="220" show-overflow-tooltip />
          <el-table-column label="场景类型" min-width="210">
            <template #default="{ row }">
              <el-tag type="primary" effect="plain">{{ getSceneLabel(row.promptType || row.scene) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="版本" width="100">
            <template #default="{ row }">{{ row.version || 'V1' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ row.updatedAt || row.updateTime || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openVersionDrawer(row)">版本管理</el-button>
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="warning" @click="handleStatus(row)">
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchPrompts"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 Prompt 模板' : '新增 Prompt 模板'" width="820px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model.trim="form.name" />
        </el-form-item>
        <el-form-item label="模板类型" prop="scene">
          <el-select v-model="form.scene" style="width: 100%">
            <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="9"
            :readonly="Boolean(editingId)"
            :placeholder="editingId ? 'Prompt 内容请通过版本管理新增版本修改' : '请输入模板内容'"
          />
          <div v-if="editingId" class="field-note">
            Prompt 内容请通过版本管理新增版本修改，本次保存只更新名称、类型、描述和状态。
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" size="880px" destroy-on-close class="version-drawer">
      <template #header>
        <div class="drawer-head">
          <div>
            <p>Prompt Version Control</p>
            <h2>{{ currentPrompt?.promptName || currentPrompt?.name || '版本管理' }}</h2>
          </div>
          <el-tag effect="plain">{{ getSceneLabel(currentPrompt?.promptType || currentPrompt?.scene || '') }}</el-tag>
        </div>
      </template>

      <section class="version-create-panel">
        <div class="version-section-head">
          <div>
            <h3>创建新版本</h3>
            <p>Prompt 内容变更通过版本 API 提交，创建后可在下方激活为当前生效版本。</p>
          </div>
        </div>
        <el-form ref="versionFormRef" :model="versionForm" :rules="versionRules" label-position="top">
          <div class="version-form-grid">
            <el-form-item label="版本号" prop="versionCode">
              <el-input v-model.trim="versionForm.versionCode" placeholder="例如：v2" />
            </el-form-item>
            <el-form-item label="版本名称">
              <el-input v-model.trim="versionForm.versionName" placeholder="例如：强化项目追问" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="versionForm.status" style="width: 100%">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="停用" value="INACTIVE" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="Prompt 内容" prop="content">
            <el-input v-model="versionForm.content" type="textarea" :rows="7" placeholder="请输入新版本 Prompt 内容" />
          </el-form-item>
          <el-form-item label="变更说明">
            <el-input v-model="versionForm.changeLog" type="textarea" :rows="2" placeholder="可选：说明本次版本调整原因" />
          </el-form-item>
          <div class="version-actions">
            <el-button @click="resetVersionForm">重置</el-button>
            <el-button type="primary" :loading="versionSaving" @click="handleCreateVersion">创建版本</el-button>
          </div>
        </el-form>
      </section>

      <section class="version-list-panel">
        <div class="version-section-head">
          <div>
            <h3>版本列表</h3>
            <p>展示后端返回版本状态，不伪造灰度、Diff 或测试结果。</p>
          </div>
          <el-button :loading="versionLoading" @click="fetchVersions">刷新</el-button>
        </div>

        <el-table v-loading="versionLoading" :data="versions" row-key="id">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="version-content-preview">
                <strong>Prompt 内容预览</strong>
                <pre>{{ row.content || '暂无内容' }}</pre>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="versionCode" label="版本号" width="110" />
          <el-table-column prop="versionName" label="版本名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="versionStatusType(row.status)" effect="plain">{{ versionStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Active" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.isActive === 1" type="success" effect="plain">Active</el-tag>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="changeLog" label="变更说明" min-width="160" show-overflow-tooltip />
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ row.updatedAt || row.createdAt || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canActivateVersion(row)" link type="primary" @click="handleActivateVersion(row)">激活</el-button>
              <el-button v-if="canDisableVersion(row)" link type="warning" @click="handleDisableVersion(row)">禁用</el-button>
              <span v-if="!canActivateVersion(row) && !canDisableVersion(row)" class="muted-text">无操作</span>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!versionLoading && !versions.length" description="暂无版本记录，请先创建新版本" />
        <div v-if="versionPagination.total > versionPagination.pageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="versionQuery.pageNo"
            v-model:page-size="versionQuery.pageSize"
            background
            layout="total, prev, pager, next"
            :total="versionPagination.total"
            @change="fetchVersions"
          />
        </div>
      </section>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MessageSquareCode, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  activatePromptTemplateVersionApi,
  createAdminAiPromptApi,
  createPromptTemplateVersionApi,
  deleteAdminAiPromptApi,
  getAdminAiPromptsApi,
  getPromptTemplateVersionsApi,
  disablePromptTemplateVersionApi,
  updateAdminAiPromptApi,
  updateAdminAiPromptStatusApi
} from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE } from '@/constants/enums'
import type {
  AiScene,
  CreatePromptTemplateVersionDTO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVersionQuery,
  PromptTemplateVersionVO,
  PromptTemplateVO
} from '@/types/ai'

const sceneOptions = [
  { label: '八股文提问模板', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问模板', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分模板', value: AI_SCENE.INTERVIEW_ANSWER_EVALUATE },
  { label: '动态追问模板', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成模板', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const prompts = ref<PromptTemplateVO[]>([])
const total = ref(0)
const versionDrawerVisible = ref(false)
const versionLoading = ref(false)
const versionSaving = ref(false)
const versionFormRef = ref<FormInstance>()
const currentPrompt = ref<PromptTemplateVO | null>(null)
const versions = ref<PromptTemplateVersionVO[]>([])

const query = reactive<PromptTemplateQueryDTO>({
  keyword: '',
  scene: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<PromptTemplateDTO>({
  scene: AI_SCENE.INTERVIEW_QUESTION_GENERATE,
  name: '',
  content: '',
  status: 1,
  description: ''
})

const versionQuery = reactive<PromptTemplateVersionQuery>({
  status: '',
  isActive: '',
  pageNo: 1,
  pageSize: 10
})

const versionPagination = reactive({
  total: 0,
  pageSize: 10
})

const versionForm = reactive<CreatePromptTemplateVersionDTO>({
  versionCode: '',
  versionName: '',
  content: '',
  status: 'DRAFT',
  changeLog: ''
})

const rules = computed<FormRules<PromptTemplateDTO>>(() => ({
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: editingId.value ? [] : [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}))

const versionRules: FormRules<CreatePromptTemplateVersionDTO> = {
  versionCode: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  content: [{ required: true, message: '请输入 Prompt 内容', trigger: 'blur' }]
}

const enabledCount = computed(() => prompts.value.filter((item) => item.status === 1).length)
const sceneCount = computed(() => new Set(prompts.value.map((item) => item.promptType || item.scene).filter(Boolean)).size)

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || value || '-'

const fetchPrompts = async () => {
  loading.value = true
  try {
    const result = await getAdminAiPromptsApi(query)
    prompts.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const resetVersionForm = () => {
  Object.assign(versionForm, {
    versionCode: '',
    versionName: '',
    content: '',
    status: 'DRAFT',
    changeLog: ''
  })
  versionFormRef.value?.clearValidate()
}

const fetchVersions = async () => {
  if (!currentPrompt.value?.id) return
  versionLoading.value = true
  try {
    const result = await getPromptTemplateVersionsApi(currentPrompt.value.id, versionQuery)
    versions.value = result.records || []
    versionPagination.total = result.total || 0
    versionPagination.pageSize = result.pageSize || versionQuery.pageSize || 10
  } finally {
    versionLoading.value = false
  }
}

const applyPrompt = (prompt?: PromptTemplateVO) => {
  Object.assign(form, {
    name: prompt?.promptName || prompt?.name || '',
    scene: prompt?.promptType || prompt?.scene || AI_SCENE.INTERVIEW_QUESTION_GENERATE,
    content: prompt?.templateContent || prompt?.content || '',
    status: prompt?.status ?? 1,
    description: prompt?.description || ''
  })
}

const openDialog = (row?: PromptTemplateVO) => {
  editingId.value = row?.id || null
  applyPrompt(row)
  dialogVisible.value = true
}

const openVersionDrawer = async (row: PromptTemplateVO) => {
  currentPrompt.value = row
  versionQuery.pageNo = 1
  resetVersionForm()
  versionDrawerVisible.value = true
  await fetchVersions()
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminAiPromptApi(editingId.value, form)
    } else {
      await createAdminAiPromptApi(form)
    }
    ElMessage.success('Prompt 模板已保存')
    dialogVisible.value = false
    await fetchPrompts()
  } finally {
    saving.value = false
  }
}

const handleCreateVersion = async () => {
  if (!versionFormRef.value || !currentPrompt.value?.id) return
  await versionFormRef.value.validate()
  versionSaving.value = true
  try {
    await createPromptTemplateVersionApi(currentPrompt.value.id, {
      versionCode: versionForm.versionCode,
      versionName: versionForm.versionName || undefined,
      content: versionForm.content,
      status: versionForm.status || 'DRAFT',
      changeLog: versionForm.changeLog || undefined
    })
    ElMessage.success('Prompt 版本已创建')
    resetVersionForm()
    await fetchVersions()
  } finally {
    versionSaving.value = false
  }
}

const isVersionActive = (row: PromptTemplateVersionVO) => row.isActive === 1 || row.status === 'ACTIVE'

const canActivateVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row)

const canDisableVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row) && row.status !== 'DISABLED'

const handleActivateVersion = async (row: PromptTemplateVersionVO) => {
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写激活说明', `激活版本 ${row.versionCode}`, {
      confirmButtonText: '激活',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：上线优化后的 Prompt'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await activatePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('Prompt 版本已激活')
    await fetchVersions()
    await fetchPrompts()
  } catch {
    ElMessage.error('激活失败，请稍后重试')
  }
}

const handleDisableVersion = async (row: PromptTemplateVersionVO) => {
  if (isVersionActive(row)) {
    ElMessage.warning('当前激活版本不能直接禁用')
    return
  }
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写禁用说明', `禁用版本 ${row.versionCode}`, {
      confirmButtonText: '禁用',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：版本内容过期'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await disablePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('Prompt 版本已禁用')
    await fetchVersions()
  } catch {
    ElMessage.error('禁用失败，请稍后重试')
  }
}

const handleStatus = async (row: PromptTemplateVO) => {
  const nextStatus = row.status === 1 ? 0 : 1
  await updateAdminAiPromptStatusApi(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? 'Prompt 模板已启用' : 'Prompt 模板已禁用')
  await fetchPrompts()
}

const handleDelete = async (row: PromptTemplateVO) => {
  await ElMessageBox.confirm(`确认删除 Prompt 模板 ${row.promptName || row.name}？`, '删除确认', {
    type: 'warning'
  })
  await deleteAdminAiPromptApi(row.id)
  ElMessage.success('Prompt 模板已删除')
  await fetchPrompts()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchPrompts()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    scene: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchPrompts()
}

const versionStatusText = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    DRAFT: '草稿',
    ACTIVE: '已激活',
    INACTIVE: '未激活',
    DISABLED: '已禁用'
  }
  return map[value] || status || '-'
}

const versionStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE') return 'success'
  if (value === 'DISABLED') return 'danger'
  if (value === 'DRAFT') return 'warning'
  return 'info'
}

onMounted(fetchPrompts)
</script>

<style scoped lang="scss">
.field-note {
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  p {
    margin: 0 0 6px;
    color: var(--app-text-muted);
    font-size: 12px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--app-text-primary);
    font-size: 20px;
    font-weight: 700;
  }
}

.version-create-panel,
.version-list-panel {
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.version-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
    color: var(--app-text-primary);
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.version-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.version-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.version-content-preview {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.68);

  strong {
    display: block;
    margin-bottom: 10px;
    color: var(--app-text-primary);
    font-size: 13px;
  }

  pre {
    max-height: 260px;
    margin: 0;
    overflow: auto;
    color: var(--app-text-secondary);
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.muted-text {
  color: var(--app-text-muted);
  font-size: 12px;
}

@media (max-width: 760px) {
  .version-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
