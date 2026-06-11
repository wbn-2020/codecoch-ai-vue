<template>
  <div class="page-shell admin-console-page relation-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Link2 :size="16" />
          <span>题目关系治理</span>
        </div>
        <h1 class="admin-hero__title">题目关系管理</h1>
        <p class="admin-hero__desc">
          维护题目之间的相似、关联、追问、进阶和前置关系。
        </p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>关系查询</h2>
          <p>题目关系来自重复题审核合并或手动新增；先选择题目或输入题目编号，再按治理场景调整显示列。</p>
        </div>
        <div class="table-view-tools">
          <el-segmented v-model="tableSize" :options="tableSizeOptions" />
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button plain>列配置</el-button>
            <template #dropdown>
              <el-dropdown-menu class="column-config-menu">
                <el-dropdown-item v-for="item in columnOptions" :key="item.key">
                  <el-checkbox v-model="visibleColumns[item.key]" :disabled="item.required">
                    {{ item.label }}
                  </el-checkbox>
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-button link type="primary" @click.stop="resetTableView">恢复默认视图</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form class="relation-query-form" :model="queryForm" inline @submit.prevent>
          <el-form-item label="快速选择">
            <el-select
              v-model="queryForm.questionId"
              clearable
              filterable
              placeholder="选择最近题目"
              style="width: min(360px, 100%)"
              @change="handleQuestionSelect"
            >
              <el-option
                v-for="item in latestQuestions"
                :key="item.id"
                :label="formatQuestion(item.id, item.title)"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="源题目编号">
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
        <AppState
          v-if="questionOptionsError"
          class="relation-inline-state"
          type="error"
          title="最近题目加载失败"
          :description="questionOptionsError"
        >
          <el-button type="primary" @click="fetchQuestionOptions">重新加载最近题目</el-button>
        </AppState>
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
        <el-table v-loading="loading" :data="relations" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('id')" prop="id" label="关系编号" width="110" />
          <el-table-column v-if="isColumnVisible('source')" label="源题目" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatQuestion(row.sourceQuestionId, row.sourceQuestion?.title) }}
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('target')" label="目标题目" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatQuestion(row.targetQuestionId, row.targetQuestion?.title) }}
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('relationType')" label="关系类型" width="150">
            <template #default="{ row }">
              <el-tag effect="plain">{{ getRelationTypeLabel(row.relationType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('relationStatus')" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="relationStatusTagType(row.relationStatus)" effect="plain">
                {{ relationStatusLabel(row.relationStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('similarityScore')" label="相似度" width="110">
            <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('reason')" prop="reason" label="原因" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="'admin:question:relation'"
                link
                type="danger"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleDelete(row)"
              >删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="relationError ? 'error' : currentQuestionId ? 'empty' : 'disabled'"
              :title="relationStateTitle"
              :description="relationError || relationStateDescription"
            >
              <el-button v-if="relationError" type="primary" @click="fetchRelations">重新加载</el-button>
            </AppState>
          </template>
        </el-table>
      </div>
    </section>

    <section class="admin-panel relation-create-panel">
      <div class="admin-panel__header">
        <div>
          <h2>新增关系</h2>
          <p>手动补充源题与目标题的关系，仅保存目标题、关系类型和原因。</p>
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
            <el-form-item label="源题目编号" prop="questionId">
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
            <el-form-item label="目标题目编号" prop="targetQuestionId">
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
              <el-select v-model="form.relationType" clearable placeholder="可不选择，默认按相关题处理" style="width: 100%">
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
          <el-button
            v-permission="'admin:question:relation'"
            type="primary"
            :loading="saving"
            :disabled="isAdminMobileReadonly"
            :title="mobileReadonlyTitle()"
            @click="handleCreate"
          >新增关系</el-button>
          <el-button @click="resetCreateForm">清空表单</el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Link2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createQuestionRelationApi,
  deleteQuestionRelationApi,
  getAdminQuestionsApi,
  getQuestionRelationsApi
} from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type {
  AdminQuestionVO,
  QuestionRelationCreateDTO,
  QuestionRelationType,
  QuestionRelationVO
} from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const relationTypeOptions: Array<{ label: string; value: QuestionRelationType }> = [
  { label: '同一意图', value: 'SAME_INTENT' },
  { label: '相关题目', value: 'RELATED' },
  { label: '追问题', value: 'FOLLOW_UP' },
  { label: '进阶题', value: 'ADVANCED' },
  { label: '前置题', value: 'PREREQUISITE' },
  { label: '对比题', value: 'COMPARE' }
]

type RelationColumnKey = 'id' | 'source' | 'target' | 'relationType' | 'relationStatus' | 'similarityScore' | 'reason' | 'createdAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<RelationColumnKey>('admin:question-relation', [
  { key: 'id', label: '关系编号', defaultVisible: false },
  { key: 'source', label: '源题目', required: true },
  { key: 'target', label: '目标题目', required: true },
  { key: 'relationType', label: '关系类型', required: true },
  { key: 'relationStatus', label: '状态', required: true },
  { key: 'similarityScore', label: '相似度', defaultVisible: true },
  { key: 'reason', label: '原因', defaultVisible: false },
  { key: 'createdAt', label: '创建时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const relationTypeLabelMap = relationTypeOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label
  return map
}, {})

const relationStatusLabelMap: Record<string, string> = {
  ACTIVE: '生效中',
  ENABLED: '生效中',
  INACTIVE: '已停用',
  DISABLED: '已停用',
  DELETED: '已删除'
}

const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const relations = ref<QuestionRelationVO[]>([])
const currentQuestionId = ref<number>()
const latestQuestions = ref<AdminQuestionVO[]>([])
const questionOptionsError = ref('')
const relationError = ref('')

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
  questionId: [{ required: true, message: '请输入源题目编号', trigger: 'blur' }],
  targetQuestionId: [{ required: true, message: '请输入目标题目编号', trigger: 'blur' }]
}

const normalizeId = (value?: number) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

const relationStateTitle = computed(() => {
  if (relationError.value) return '题目关系加载失败'
  if (!currentQuestionId.value) return '请选择源题目'
  return '暂无题目关系'
})

const relationStateDescription = computed(() => {
  if (!currentQuestionId.value) return '先选择最近题目或输入源题目编号，再查看它关联到哪些题。'
  return '当前源题目暂无关系，关系通常在重复题审核点击“合并”后产生，也可以在下方手动新增。'
})

const fetchQuestionOptions = async () => {
  questionOptionsError.value = ''
  try {
    const result = await getAdminQuestionsApi({ pageNo: 1, pageSize: 30, status: 1 })
    latestQuestions.value = result.records || []
  } catch (error) {
    latestQuestions.value = []
    questionOptionsError.value = getErrorMessage(error, '最近题目加载失败，请稍后重试；也可以手动输入源题目编号查询关系。')
  }
}

const handleQuestionSelect = async () => {
  if (normalizeId(queryForm.questionId)) {
    await fetchRelations()
  }
}

const fetchRelations = async () => {
  const questionId = normalizeId(queryForm.questionId)
  if (!questionId) {
    ElMessage.warning('请先输入有效的源题目编号')
    return
  }

  loading.value = true
  relationError.value = ''
  try {
    relations.value = await getQuestionRelationsApi(questionId)
    currentQuestionId.value = questionId
    form.questionId = questionId
  } catch (error) {
    relations.value = []
    currentQuestionId.value = questionId
    relationError.value = getErrorMessage(error, '题目关系列表加载失败，请稍后重试。')
    ElMessage.error(relationError.value)
  } finally {
    loading.value = false
  }
}

const resetRelations = () => {
  queryForm.questionId = undefined
  currentQuestionId.value = undefined
  relations.value = []
  relationError.value = ''
}

const resetCreateForm = () => {
  form.questionId = currentQuestionId.value
  form.targetQuestionId = undefined
  form.relationType = 'RELATED'
  form.reason = ''
  formRef.value?.clearValidate()
}

const handleCreate = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()

  const questionId = normalizeId(form.questionId)
  const targetQuestionId = normalizeId(form.targetQuestionId)
  if (!questionId || !targetQuestionId) {
    ElMessage.warning('请填写有效的源题目编号和目标题目编号')
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

  const confirmed = await confirmDangerActionPreview({
    title: '新增题目关系预览',
    action: '新增题目关系',
    target: `源题：${formatQuestion(questionId)}；目标题：${formatQuestion(targetQuestionId)}；关系：${getRelationTypeLabel(payload.relationType)}`,
    impact: '新增关系会进入题目关系网络，可能影响同意图排重、推荐串联、追问题和进阶题导航。',
    rollback: '如关系设置错误，可在关系列表中删除后重新创建；已产生的推荐或治理判断不会自动回到新增前。',
    audit: '新增题目关系会记录操作人、源题、目标题、关系类型和时间，便于审计题库治理行为。',
    tips: [
      payload.reason ? `治理原因：${payload.reason}` : '建议填写治理原因，方便后续复核。',
      '确认源题和目标题不是同一道题。',
      '确认 SAME_INTENT 等强关系不会误伤正常推荐。'
    ],
    confirmButtonText: '确认新增'
  })
  if (!confirmed) return

  saving.value = true
  try {
    await createQuestionRelationApi(questionId, payload)
    ElMessage.success('题目关系已新增')
    queryForm.questionId = questionId
    await fetchRelations()
    resetCreateForm()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '题目关系新增失败，请检查题目编号、关系类型或权限后重试。'))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionRelationVO) => {
  if (!guardAdminMobileWrite()) return
  const questionId = currentQuestionId.value || row.sourceQuestionId
  const confirmed = await confirmDangerActionPreview({
    title: '删除题目关系预览',
    action: `删除题目关系「${row.id}」`,
    target: `源题：${formatQuestion(row.sourceQuestionId, row.sourceQuestion?.title)}；目标题：${formatQuestion(row.targetQuestionId, row.targetQuestion?.title)}；关系：${getRelationTypeLabel(row.relationType)}`,
    impact: '该关系会从题目关系网络中移除，可能影响同意图排重、推荐串联、追问题和进阶题导航。',
    rollback: '删除后无法直接恢复该关系；误删后需要重新按源题和目标题创建关系。',
    audit: '删除题目关系会记录操作人、关系编号、源题、目标题和时间，便于审计题库治理行为。',
    tips: ['确认不是只需要调整关系类型或原因。', '确认该关系不是推荐排重依赖的 SAME_INTENT 关系。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteQuestionRelationApi(questionId, row.id)
    ElMessage.success('题目关系已删除')
    await fetchRelations()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '题目关系删除失败，请确认权限或稍后重试。'))
  }
}

const getRelationTypeLabel = (type?: string) => {
  if (!type) return '-'
  return relationTypeLabelMap[type] || '关系待确认'
}

const relationStatusLabel = (status?: string) => {
  if (!status) return '状态待确认'
  return relationStatusLabelMap[status] || '状态待确认'
}

const relationStatusTagType = (status?: string) => {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success'
  if (status === 'INACTIVE' || status === 'DISABLED') return 'info'
  if (status === 'DELETED') return 'danger'
  return 'warning'
}

const formatQuestion = (id?: number, title?: string) => {
  if (!id) return title || '-'
  return title ? `题目编号 ${id} ${title}` : `题目编号 ${id}`
}

const formatSimilarity = (value?: number) => {
  if (value === undefined || value === null) return '-'
  const score = Number(value)
  if (!Number.isFinite(score)) return '-'
  const percent = score > 1 ? score : score * 100
  return `${percent.toFixed(percent >= 99 ? 0 : 2).replace(/\.00$/, '')}%`
}

onMounted(fetchQuestionOptions)
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

.relation-inline-state {
  margin-top: 10px;
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
