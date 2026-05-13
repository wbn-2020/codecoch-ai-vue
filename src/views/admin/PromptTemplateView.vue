<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Prompt 模板</h1>
        <p class="page-subtitle">维护 V1 面试提问、评分、追问和报告生成模板，不做版本管理或 A/B 测试。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增模板</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="名称 / 编码" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.promptType" clearable placeholder="全部类型" style="width: 220px">
              <el-option v-for="item in promptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
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

      <div class="table-card">
        <el-table v-loading="loading" :data="prompts" row-key="id">
          <el-table-column prop="promptName" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="templateCode" label="模板编码" min-width="220" show-overflow-tooltip />
          <el-table-column label="类型" min-width="210">
            <template #default="{ row }">{{ getOptionLabel(promptTypeOptions, row.promptType) }}</template>
          </el-table-column>
          <el-table-column label="版本" width="100">
            <template #default="{ row }">{{ row.version || 'V1' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="变量说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.variables || '-' }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ row.updatedAt || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
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
            <el-option v-for="item in promptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="9" />
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
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createAdminAiPromptApi,
  getAdminAiPromptsApi,
  updateAdminAiPromptApi
} from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE, promptTypeOptions } from '@/constants/enums'
import type { PromptTemplateDTO, PromptTemplateQueryDTO, PromptTemplateVO } from '@/types/ai'
import { getOptionLabel } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const prompts = ref<PromptTemplateVO[]>([])
const total = ref(0)

const query = reactive<PromptTemplateQueryDTO>({
  keyword: '',
  promptType: '',
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

const rules: FormRules<PromptTemplateDTO> = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}

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

const handleSearch = () => {
  query.pageNo = 1
  fetchPrompts()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    promptType: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchPrompts()
}

onMounted(fetchPrompts)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
