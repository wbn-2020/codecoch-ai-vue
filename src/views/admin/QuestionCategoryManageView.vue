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
      <div class="table-card">
        <el-table v-loading="loading" :data="categories" row-key="id">
          <el-table-column prop="name" label="分类名称" min-width="180" />
          <el-table-column label="编码" min-width="140">
            <template #default="{ row }">{{ row.code || '-' }}</template>
          </el-table-column>
          <el-table-column label="父级" width="120">
            <template #default="{ row }">{{ row.parentId || '-' }}</template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="90" />
          <el-table-column label="描述" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link @click="toggleStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新增分类'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item label="编码"><el-input v-model.trim="form.code" /></el-form-item>
        <el-form-item label="父级 ID"><el-input-number v-model="form.parentId" :min="0" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
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
  createQuestionCategoryApi,
  deleteQuestionCategoryApi,
  getQuestionCategoriesApi,
  updateQuestionCategoryApi,
  updateQuestionCategoryStatusApi
} from '@/api/questionCategory'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionCategoryDTO, QuestionCategoryVO } from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const categories = ref<QuestionCategoryVO[]>([])

const form = reactive<QuestionCategoryDTO>({
  name: '',
  code: '',
  parentId: 0,
  sort: 0,
  status: 1,
  description: ''
})

const rules: FormRules<QuestionCategoryDTO> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

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
    code: row?.code || '',
    parentId: row?.parentId ?? 0,
    sort: row?.sort || 0,
    status: row?.status ?? 1,
    description: row?.description || ''
  })
  dialogVisible.value = true
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

const toggleStatus = async (row: QuestionCategoryVO) => {
  await updateQuestionCategoryStatusApi(row.id, row.status === 1 ? 0 : 1)
  ElMessage.success('状态已更新')
  await fetchCategories()
}

const handleDelete = async (row: QuestionCategoryVO) => {
  await ElMessageBox.confirm(`确认删除分类 ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteQuestionCategoryApi(row.id)
  ElMessage.success('分类已删除')
  await fetchCategories()
}

onMounted(fetchCategories)
</script>
