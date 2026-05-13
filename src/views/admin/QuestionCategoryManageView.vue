<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">分类管理</h1>
        <p class="page-subtitle">维护题目分类，V1 支持基础层级与状态管理。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增分类</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="分类名称" />
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
        <el-table v-loading="loading" :data="pagedCategories" row-key="id">
          <el-table-column prop="name" label="分类名称" min-width="180" />
          <el-table-column prop="sort" label="排序" width="90" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
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
          :total="filteredCategories.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新增分类'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
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

import {
  createQuestionCategoryApi,
  deleteQuestionCategoryApi,
  getQuestionCategoriesApi,
  updateQuestionCategoryApi
} from '@/api/questionCategory'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionCategoryDTO, QuestionCategoryVO } from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const categories = ref<QuestionCategoryVO[]>([])

const query = reactive({
  keyword: '',
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionCategoryDTO>({
  name: '',
  code: '',
  parentId: undefined,
  sort: 0,
  status: 1,
  description: ''
})

const rules: FormRules<QuestionCategoryDTO> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const filteredCategories = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return categories.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchStatus = query.status === '' || item.status === query.status
    return matchKeyword && matchStatus
  })
})

const pagedCategories = computed(() => {
  const start = (query.pageNo - 1) * query.pageSize
  return filteredCategories.value.slice(start, start + query.pageSize)
})

const fetchCategories = async () => {
  loading.value = true
  try {
    categories.value = await getQuestionCategoriesApi()
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: QuestionCategoryVO) => {
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    sort: row?.sort || 0,
    status: row?.status ?? 1
  })
  dialogVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateQuestionCategoryApi(editingId.value, form)
    } else {
      await createQuestionCategoryApi(form)
    }
    ElMessage.success('分类已保存')
    dialogVisible.value = false
    await fetchCategories()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionCategoryVO) => {
  await ElMessageBox.confirm(`确认删除分类 ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteQuestionCategoryApi(row.id)
  ElMessage.success('分类已删除')
  await fetchCategories()
}

onMounted(fetchCategories)
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
