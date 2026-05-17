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
          Prompt 内容变更已收敛到版本 API，完整管理面板下一步接入。
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
        <strong>API 已接入</strong>
        <small>管理面板下一步接入</small>
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
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
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
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MessageSquareCode, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createAdminAiPromptApi,
  deleteAdminAiPromptApi,
  getAdminAiPromptsApi,
  updateAdminAiPromptApi,
  updateAdminAiPromptStatusApi
} from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE } from '@/constants/enums'
import type { AiScene, PromptTemplateDTO, PromptTemplateQueryDTO, PromptTemplateVO } from '@/types/ai'

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

const rules = computed<FormRules<PromptTemplateDTO>>(() => ({
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: editingId.value ? [] : [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}))

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
</style>
