<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">问题组管理</h1>
        <p class="page-subtitle">维护同一考察意图下的问题组，V1 仅做手动维护。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增问题组</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="filters" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="filters.keyword" clearable placeholder="名称 / 知识点" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="filters.categoryId" clearable placeholder="全部分类" style="width: 160px">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
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
        <el-table v-loading="loading" :data="pagedGroups" row-key="id">
          <el-table-column prop="name" label="问题组名称" min-width="200" show-overflow-tooltip />
          <el-table-column label="分类" min-width="160">
            <template #default="{ row }">{{ getCategoryName(row.categoryId) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="filteredGroups.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑问题组' : '新增问题组'" width="680px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="例如：Spring 事务一致性" />
        </el-form-item>
        <el-form-item label="主分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
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
import { computed, onMounted, reactive, ref } from 'vue'

import { getQuestionCategoriesApi } from '@/api/questionCategory'
import {
  createQuestionGroupApi,
  deleteQuestionGroupApi,
  getQuestionGroupsApi,
  updateQuestionGroupApi
} from '@/api/questionGroup'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionCategoryVO, QuestionGroupDTO, QuestionGroupVO } from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const groups = ref<QuestionGroupVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])

const filters = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionGroupDTO>({
  name: '',
  categoryId: undefined,
  description: '',
  status: 1
})

const rules: FormRules<QuestionGroupDTO> = {
  name: [{ required: true, message: '请输入问题组名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择主分类', trigger: 'change' }]
}

const fetchOptions = async () => {
  categories.value = await getQuestionCategoriesApi()
}

const filteredGroups = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return groups.value.filter((item) => {
    const matchKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      (item.description || '').toLowerCase().includes(keyword) ||
      (item.knowledgePoint || '').toLowerCase().includes(keyword)
    const matchCategory = !filters.categoryId || item.categoryId === filters.categoryId
    const matchStatus = filters.status === '' || item.status === filters.status
    return matchKeyword && matchCategory && matchStatus
  })
})

const pagedGroups = computed(() => {
  const start = (filters.pageNo - 1) * filters.pageSize
  return filteredGroups.value.slice(start, start + filters.pageSize)
})

const fetchGroups = async () => {
  loading.value = true
  try {
    groups.value = await getQuestionGroupsApi()
  } finally {
    loading.value = false
  }
}

const getCategoryName = (categoryId?: number) => {
  if (!categoryId) return '-'
  return categories.value.find((item) => item.id === categoryId)?.name || String(categoryId)
}

const openDialog = (row?: QuestionGroupVO) => {
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    categoryId: row?.categoryId,
    description: row?.description || '',
    status: row?.status ?? 1
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    const payload: QuestionGroupDTO = {
      name: form.name,
      categoryId: form.categoryId,
      description: form.description,
      status: form.status
    }
    if (editingId.value) {
      await updateQuestionGroupApi(editingId.value, payload)
    } else {
      await createQuestionGroupApi(payload)
    }
    ElMessage.success('问题组已保存')
    dialogVisible.value = false
    await fetchGroups()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionGroupVO) => {
  await ElMessageBox.confirm(`确认删除问题组 ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteQuestionGroupApi(row.id)
  ElMessage.success('问题组已删除')
  await fetchGroups()
}

const handleReset = () => {
  Object.assign(filters, {
    keyword: '',
    categoryId: undefined,
    status: '',
    pageNo: 1,
    pageSize: 10
  })
}

const handleSearch = () => {
  filters.pageNo = 1
}

onMounted(async () => {
  await fetchOptions()
  await fetchGroups()
})
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
