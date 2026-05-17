<template>
  <div class="page-shell admin-console-page relation-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Link2 :size="16" />
          <span>Question Relation Governance</span>
        </div>
        <h1 class="admin-hero__title">题目关系管理</h1>
        <p class="admin-hero__desc">
          基于后端真实关系接口维护题目之间的相似、关联、追问、进阶和前置关系，不扩展后端契约。
        </p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>关系查询</h2>
          <p>输入源题目 ID 后读取 GET /admin/questions/{id}/relations 的真实结果。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form class="relation-query-form" :model="queryForm" inline @submit.prevent>
          <el-form-item label="源题目 ID">
            <el-input-number
              v-model="queryForm.questionId"
              :min="1"
              :step="1"
              :precision="0"
              controls-position="right"
              placeholder="questionId"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchRelations">查询关系</el-button>
            <el-button @click="resetRelations">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="relation-summary">
        <article>
          <span>当前源题目</span>
          <strong>{{ currentQuestionId || '--' }}</strong>
        </article>
        <article>
          <span>关系数量</span>
          <strong>{{ relations.length }}</strong>
        </article>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="relations" row-key="id">
          <el-table-column prop="id" label="关系 ID" width="110" />
          <el-table-column label="源题目" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatQuestion(row.sourceQuestionId, row.sourceQuestion?.title) }}
            </template>
          </el-table-column>
          <el-table-column label="目标题目" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatQuestion(row.targetQuestionId, row.targetQuestion?.title) }}
            </template>
          </el-table-column>
          <el-table-column label="关系类型" width="150">
            <template #default="{ row }">
              <el-tag effect="plain">{{ getRelationTypeLabel(row.relationType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.relationStatus === 'ACTIVE' ? 'success' : 'info'" effect="plain">
                {{ row.relationStatus || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="相似度" width="110">
            <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无题目关系" />
          </template>
        </el-table>
      </div>
    </section>

    <section class="admin-panel relation-create-panel">
      <div class="admin-panel__header">
        <div>
          <h2>新增关系</h2>
          <p>提交 POST /admin/questions/{id}/relations，仅发送 targetQuestionId、relationType、reason。</p>
        </div>
      </div>

      <el-form
        ref="formRef"
        class="relation-create-form"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-row :gutter="16">
          <el-col :xs="24" :md="8">
            <el-form-item label="源题目 ID" prop="questionId">
              <el-input-number
                v-model="form.questionId"
                :min="1"
                :step="1"
                :precision="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="目标题目 ID" prop="targetQuestionId">
              <el-input-number
                v-model="form.targetQuestionId"
                :min="1"
                :step="1"
                :precision="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="关系类型" prop="relationType">
              <el-select v-model="form.relationType" clearable placeholder="后端允许为空" style="width: 100%">
                <el-option
                  v-for="item in relationTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="原因" prop="reason">
              <el-input
                v-model.trim="form.reason"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="例如：语义相近，适合作为同一知识点的追问"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="relation-actions">
          <el-button type="primary" :loading="saving" @click="handleCreate">新增关系</el-button>
          <el-button @click="resetCreateForm">清空表单</el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Link2 } from 'lucide-vue-next'
import { reactive, ref } from 'vue'

import {
  createQuestionRelationApi,
  deleteQuestionRelationApi,
  getQuestionRelationsApi
} from '@/api/question'
import type {
  QuestionRelationCreateDTO,
  QuestionRelationType,
  QuestionRelationVO
} from '@/types/question'

const relationTypeOptions: Array<{ label: string; value: QuestionRelationType }> = [
  { label: '同一意图', value: 'SAME_INTENT' },
  { label: '相关题目', value: 'RELATED' },
  { label: '追问题', value: 'FOLLOW_UP' },
  { label: '进阶题', value: 'ADVANCED' },
  { label: '前置题', value: 'PREREQUISITE' },
  { label: '对比题', value: 'COMPARE' }
]

const relationTypeLabelMap = relationTypeOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label
  return map
}, {})

const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const relations = ref<QuestionRelationVO[]>([])
const currentQuestionId = ref<number>()

const queryForm = reactive({
  questionId: undefined as number | undefined
})

const form = reactive({
  questionId: undefined as number | undefined,
  targetQuestionId: undefined as number | undefined,
  relationType: 'RELATED' as QuestionRelationType | '',
  reason: ''
})

const rules: FormRules = {
  questionId: [{ required: true, message: '请输入源题目 ID', trigger: 'blur' }],
  targetQuestionId: [{ required: true, message: '请输入目标题目 ID', trigger: 'blur' }]
}

const normalizeId = (value?: number) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

const fetchRelations = async () => {
  const questionId = normalizeId(queryForm.questionId)
  if (!questionId) {
    ElMessage.warning('请先输入有效的源题目 ID')
    return
  }

  loading.value = true
  try {
    relations.value = await getQuestionRelationsApi(questionId)
    currentQuestionId.value = questionId
    form.questionId = questionId
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '题目关系列表加载失败')
  } finally {
    loading.value = false
  }
}

const resetRelations = () => {
  queryForm.questionId = undefined
  currentQuestionId.value = undefined
  relations.value = []
}

const resetCreateForm = () => {
  form.questionId = currentQuestionId.value
  form.targetQuestionId = undefined
  form.relationType = 'RELATED'
  form.reason = ''
  formRef.value?.clearValidate()
}

const handleCreate = async () => {
  if (!formRef.value) return
  await formRef.value.validate()

  const questionId = normalizeId(form.questionId)
  const targetQuestionId = normalizeId(form.targetQuestionId)
  if (!questionId || !targetQuestionId) {
    ElMessage.warning('请填写有效的源题目 ID 和目标题目 ID')
    return
  }
  if (questionId === targetQuestionId) {
    ElMessage.warning('源题目和目标题目不能相同')
    return
  }

  const payload: QuestionRelationCreateDTO = {
    targetQuestionId,
    relationType: form.relationType || undefined,
    reason: form.reason.trim() || undefined
  }

  saving.value = true
  try {
    await createQuestionRelationApi(questionId, payload)
    ElMessage.success('题目关系已新增')
    queryForm.questionId = questionId
    await fetchRelations()
    resetCreateForm()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '题目关系新增失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionRelationVO) => {
  const questionId = currentQuestionId.value || row.sourceQuestionId
  await ElMessageBox.confirm(`确认删除关系 ${row.id}？`, '删除题目关系', { type: 'warning' })
  try {
    await deleteQuestionRelationApi(questionId, row.id)
    ElMessage.success('题目关系已删除')
    await fetchRelations()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '题目关系删除失败')
  }
}

const getRelationTypeLabel = (type?: string) => {
  if (!type) return '-'
  return relationTypeLabelMap[type] || type
}

const formatQuestion = (id?: number, title?: string) => {
  if (!id) return title || '-'
  return title ? `#${id} ${title}` : `#${id}`
}

const formatSimilarity = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${Math.round(Number(value) * 100)}%`
}
</script>

<style scoped lang="scss">
.relation-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.relation-query-form {
  width: 100%;
}

.relation-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 0 20px 16px;

  article {
    padding: 16px;
    border: 1px solid var(--app-border);
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.38);
  }

  span {
    display: block;
    margin-bottom: 8px;
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    color: var(--app-text);
    font-size: 24px;
  }
}

.relation-create-panel {
  padding-bottom: 20px;
}

.relation-create-form {
  padding: 0 20px;
}

.relation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .relation-summary {
    grid-template-columns: 1fr;
  }
}
</style>
