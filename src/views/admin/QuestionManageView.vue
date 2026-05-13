<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">题目管理</h1>
        <p class="page-subtitle">维护 V1 题库基础数据，支持分类、标签、问题组、难度与状态管理。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增题目</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="题目标题" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="query.categoryId" clearable placeholder="全部分类" style="width: 150px">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="query.tagId" clearable placeholder="全部标签" style="width: 150px">
              <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="query.difficulty" clearable placeholder="全部" style="width: 120px">
              <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-table v-loading="loading" :data="questions" row-key="id">
          <el-table-column prop="title" label="题目标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="categoryName" label="分类" min-width="130" />
          <el-table-column label="问题组" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.groupTitle || getGroupNameById(row.groupId) }}</template>
          </el-table-column>
          <el-table-column label="难度" width="110">
            <template #default="{ row }">{{ getOptionLabel(difficultyOptions, row.difficulty) }}</template>
          </el-table-column>
          <el-table-column label="标签" min-width="220">
            <template #default="{ row }">
              <el-space wrap>
                <el-tag v-for="(tag, index) in getDisplayTags(row)" :key="`${row.id}-${index}`" class="tag-item" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
                <span v-if="getDisplayTags(row).length === 0">-</span>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
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
          @change="fetchQuestions"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑题目' : '新增题目'" width="760px">
      <el-alert
        v-if="editingId"
        class="dialog-alert"
        type="info"
        :closable="false"
        show-icon
        title="若后端列表未返回题干、参考答案或解析，请在编辑保存前补全这些字段。"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="题目标题" prop="title">
          <el-input v-model.trim="form.title" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题组" prop="groupId">
          <el-select v-model="form.groupId" filterable placeholder="请选择问题组" style="width: 100%">
            <el-option v-for="item in groups" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tagIds" multiple filterable collapse-tags placeholder="请选择标签" style="width: 100%">
            <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度" prop="difficulty">
          <el-select v-model="form.difficulty" style="width: 100%">
            <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="题干" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="参考答案" prop="answer">
          <el-input v-model="form.answer" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="form.analysis" type="textarea" :rows="4" />
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
import { onMounted, reactive, ref } from 'vue'

import {
  createAdminQuestionApi,
  deleteAdminQuestionApi,
  getAdminQuestionsApi,
  updateAdminQuestionApi
} from '@/api/question'
import { getQuestionCategoriesApi } from '@/api/questionCategory'
import { getQuestionGroupsApi } from '@/api/questionGroup'
import { getQuestionTagsApi } from '@/api/questionTag'
import StatusTag from '@/components/common/StatusTag.vue'
import { difficultyOptions, QUESTION_DIFFICULTY } from '@/constants/enums'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  QuestionCategoryVO,
  QuestionCreateDTO,
  QuestionGroupVO,
  QuestionTagVO
} from '@/types/question'
import { getOptionLabel } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const questions = ref<AdminQuestionVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])
const tags = ref<QuestionTagVO[]>([])
const groups = ref<QuestionGroupVO[]>([])
const total = ref(0)

const query = reactive<AdminQuestionQueryDTO>({
  keyword: '',
  categoryId: undefined,
  tagId: undefined,
  difficulty: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionCreateDTO>({
  title: '',
  content: '',
  answer: '',
  analysis: '',
  categoryId: undefined,
  groupId: undefined,
  difficulty: QUESTION_DIFFICULTY.MEDIUM,
  tagIds: [],
  status: 1
})

const rules: FormRules<QuestionCreateDTO> = {
  title: [{ required: true, message: '请输入题目标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  groupId: [{ required: true, message: '请选择问题组', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  content: [{ required: true, message: '请输入题干', trigger: 'blur' }],
  answer: [{ required: true, message: '请输入参考答案', trigger: 'blur' }]
}

const getGroupNameById = (groupId?: number) => {
  if (!groupId) return '-'
  return groups.value.find((item) => item.id === groupId)?.name || String(groupId)
}

const getDisplayTags = (row: AdminQuestionVO) => {
  return (row.tags || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name || ''))
    .filter((name) => Boolean(name))
}

const resolveTagIdsFromRow = (row?: AdminQuestionVO): number[] => {
  if (!row?.tags?.length) return []

  return row.tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return tags.value.find((item) => item.name === tag)?.id
      }
      return tag?.id
    })
    .filter((id): id is number => Number.isFinite(Number(id)) && Number(id) > 0)
}

const fetchOptions = async () => {
  const [categoryResult, tagResult, groupResult] = await Promise.all([
    getQuestionCategoriesApi(),
    getQuestionTagsApi(),
    getQuestionGroupsApi({ status: 1 })
  ])
  categories.value = categoryResult
  tags.value = tagResult
  groups.value = groupResult
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const result = await getAdminQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: AdminQuestionVO) => {
  editingId.value = row?.id || null
  Object.assign(form, {
    title: row?.title || '',
    content: row?.content || '',
    answer: row?.answer || row?.referenceAnswer || '',
    analysis: row?.analysis || '',
    categoryId: row?.categoryId,
    groupId: row?.groupId,
    difficulty: row?.difficulty || QUESTION_DIFFICULTY.MEDIUM,
    tagIds: resolveTagIdsFromRow(row),
    status: row?.status ?? 1
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminQuestionApi(editingId.value, form)
    } else {
      await createAdminQuestionApi(form)
    }
    ElMessage.success('题目已保存')
    dialogVisible.value = false
    await fetchQuestions()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: AdminQuestionVO) => {
  await ElMessageBox.confirm(`确认删除题目 ${row.title}？`, '删除确认', { type: 'warning' })
  await deleteAdminQuestionApi(row.id)
  ElMessage.success('题目已删除')
  await fetchQuestions()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchQuestions()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    categoryId: undefined,
    tagId: undefined,
    difficulty: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchQuestions()
}

onMounted(async () => {
  await fetchOptions()
  await fetchQuestions()
})
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.tag-item {
  margin-right: 6px;
}

.dialog-alert {
  margin-bottom: 16px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
