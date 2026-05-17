<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">行业模板维护</h1>
        <p class="page-subtitle">维护行业场景面试使用的真实模板，不影响用户端创建面试接口。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增模板</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="行业编码 / 名称 / 描述" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchTemplates">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="templates" row-key="industryTemplateId">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="template-detail">
                <div>
                  <span>适用岗位</span>
                  <p>{{ row.targetPositions || '-' }}</p>
                </div>
                <div>
                  <span>核心业务场景 JSON</span>
                  <pre>{{ row.coreBusinessScenarios || '-' }}</pre>
                </div>
                <div>
                  <span>关键技术点 JSON</span>
                  <pre>{{ row.keyTechnicalPoints || '-' }}</pre>
                </div>
                <div>
                  <span>常见追问方向 JSON</span>
                  <pre>{{ row.commonQuestionDirections || '-' }}</pre>
                </div>
                <div>
                  <span>风险点 JSON</span>
                  <pre>{{ row.riskPoints || '-' }}</pre>
                </div>
                <div class="template-detail__wide">
                  <span>Prompt 上下文</span>
                  <p>{{ row.promptContext || '-' }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="industryCode" label="编码" min-width="150" show-overflow-tooltip />
          <el-table-column prop="industryName" label="行业名称" min-width="140" />
          <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.enabled === 1 ? 'success' : 'info'" effect="plain">
                {{ row.enabled === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="90" />
          <el-table-column prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button
                link
                :type="row.enabled === 1 ? 'warning' : 'success'"
                @click="handleToggle(row)"
              >
                {{ row.enabled === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑行业模板' : '新增行业模板'" width="860px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px">
        <div class="form-grid">
          <el-form-item label="行业编码" prop="industryCode">
            <el-input v-model.trim="form.industryCode" placeholder="例如 ECOMMERCE" />
          </el-form-item>
          <el-form-item label="行业名称" prop="industryName">
            <el-input v-model.trim="form.industryName" placeholder="例如 电商" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sortOrder" :min="0" :step="10" />
          </el-form-item>
        </div>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="适用岗位">
          <el-input v-model="form.targetPositions" placeholder="逗号分隔，例如 Java 后端,电商后端" />
        </el-form-item>
        <el-form-item label="核心业务场景 JSON" prop="coreBusinessScenarios">
          <el-input v-model="form.coreBusinessScenarios" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="关键技术点 JSON" prop="keyTechnicalPoints">
          <el-input v-model="form.keyTechnicalPoints" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="追问方向 JSON" prop="commonQuestionDirections">
          <el-input v-model="form.commonQuestionDirections" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="风险点 JSON" prop="riskPoints">
          <el-input v-model="form.riskPoints" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Prompt 上下文">
          <el-input v-model="form.promptContext" type="textarea" :rows="4" />
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
import { onMounted, reactive, ref } from 'vue'

import {
  createAdminIndustryTemplateApi,
  deleteAdminIndustryTemplateApi,
  disableAdminIndustryTemplateApi,
  enableAdminIndustryTemplateApi,
  getAdminIndustryTemplatesApi,
  updateAdminIndustryTemplateApi
} from '@/api/industryTemplate'
import type {
  AdminIndustryTemplateQuery,
  CreateIndustryTemplateDTO,
  IndustryTemplateVO
} from '@/types/industryTemplate'

type JsonArrayField =
  | 'coreBusinessScenarios'
  | 'keyTechnicalPoints'
  | 'commonQuestionDirections'
  | 'riskPoints'

const jsonArrayFields: JsonArrayField[] = [
  'coreBusinessScenarios',
  'keyTechnicalPoints',
  'commonQuestionDirections',
  'riskPoints'
]

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const templates = ref<IndustryTemplateVO[]>([])

const query = reactive<AdminIndustryTemplateQuery>({
  keyword: '',
  enabled: ''
})

const form = reactive<CreateIndustryTemplateDTO>({
  industryCode: '',
  industryName: '',
  description: '',
  targetPositions: '',
  coreBusinessScenarios: '',
  keyTechnicalPoints: '',
  commonQuestionDirections: '',
  riskPoints: '',
  promptContext: '',
  enabled: 1,
  sortOrder: 0
})

const validateJsonArray = (_rule: unknown, value: string | undefined, callback: (error?: Error) => void) => {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    callback()
    return
  }
  try {
    if (!Array.isArray(JSON.parse(trimmed))) {
      callback(new Error('请输入 JSON 数组字符串'))
      return
    }
    callback()
  } catch {
    callback(new Error('请输入合法 JSON 数组字符串'))
  }
}

const rules: FormRules<CreateIndustryTemplateDTO> = {
  industryCode: [{ required: true, message: '请输入行业编码', trigger: 'blur' }],
  industryName: [{ required: true, message: '请输入行业名称', trigger: 'blur' }],
  coreBusinessScenarios: [{ validator: validateJsonArray, trigger: 'blur' }],
  keyTechnicalPoints: [{ validator: validateJsonArray, trigger: 'blur' }],
  commonQuestionDirections: [{ validator: validateJsonArray, trigger: 'blur' }],
  riskPoints: [{ validator: validateJsonArray, trigger: 'blur' }]
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    templates.value = await getAdminIndustryTemplatesApi({
      keyword: query.keyword || undefined,
      enabled: query.enabled
    })
  } finally {
    loading.value = false
  }
}

const resetForm = (row?: IndustryTemplateVO) => {
  Object.assign(form, {
    industryCode: row?.industryCode || '',
    industryName: row?.industryName || '',
    description: row?.description || '',
    targetPositions: row?.targetPositions || '',
    coreBusinessScenarios: row?.coreBusinessScenarios || '',
    keyTechnicalPoints: row?.keyTechnicalPoints || '',
    commonQuestionDirections: row?.commonQuestionDirections || '',
    riskPoints: row?.riskPoints || '',
    promptContext: row?.promptContext || '',
    enabled: row?.enabled ?? 1,
    sortOrder: row?.sortOrder ?? 0
  })
}

const openDialog = (row?: IndustryTemplateVO) => {
  editingId.value = row?.industryTemplateId || null
  resetForm(row)
  dialogVisible.value = true
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    enabled: ''
  })
  fetchTemplates()
}

const toPayload = (): CreateIndustryTemplateDTO => {
  const payload: CreateIndustryTemplateDTO = {
    industryCode: form.industryCode,
    industryName: form.industryName,
    description: form.description,
    targetPositions: form.targetPositions,
    promptContext: form.promptContext,
    enabled: form.enabled,
    sortOrder: form.sortOrder
  }
  jsonArrayFields.forEach((field) => {
    payload[field] = (form[field] || '').trim()
  })
  return payload
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminIndustryTemplateApi(editingId.value, toPayload())
    } else {
      await createAdminIndustryTemplateApi(toPayload())
    }
    ElMessage.success('行业模板已保存')
    dialogVisible.value = false
    await fetchTemplates()
  } finally {
    saving.value = false
  }
}

const handleToggle = async (row: IndustryTemplateVO) => {
  if (row.enabled === 1) {
    await disableAdminIndustryTemplateApi(row.industryTemplateId)
    ElMessage.success('行业模板已禁用')
  } else {
    await enableAdminIndustryTemplateApi(row.industryTemplateId)
    ElMessage.success('行业模板已启用')
  }
  await fetchTemplates()
}

const handleDelete = async (row: IndustryTemplateVO) => {
  await ElMessageBox.confirm(`确认删除行业模板 ${row.industryName}？`, '删除确认', { type: 'warning' })
  await deleteAdminIndustryTemplateApi(row.industryTemplateId)
  ElMessage.success('行业模板已删除')
  await fetchTemplates()
}

onMounted(fetchTemplates)
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.template-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 16px 48px;

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--cc-text-muted);
    font-size: 13px;
  }

  p,
  pre {
    min-height: 42px;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--cc-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.62);
    color: var(--cc-text);
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.template-detail__wide {
  grid-column: 1 / -1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

@media (max-width: 768px) {
  .template-detail,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
