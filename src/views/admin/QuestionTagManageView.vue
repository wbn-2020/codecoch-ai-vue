<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">标签管理</h1>
        <p class="page-subtitle">维护题目标签，用于筛选和知识点标记。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增标签</el-button>
    </div>

    <section class="content-card">
      <div class="table-card">
        <el-table v-loading="loading" :data="tags" row-key="id">
          <el-table-column prop="name" label="标签名称" min-width="180" />
          <el-table-column label="编码" min-width="140">
            <template #default="{ row }">{{ row.code || '-' }}</template>
          </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item label="编码"><el-input v-model.trim="form.code" /></el-form-item>
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
  createQuestionTagApi,
  deleteQuestionTagApi,
  getQuestionTagsApi,
  updateQuestionTagApi,
  updateQuestionTagStatusApi
} from '@/api/questionTag'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionTagDTO, QuestionTagVO } from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const tags = ref<QuestionTagVO[]>([])

const form = reactive<QuestionTagDTO>({
  name: '',
  code: '',
  status: 1,
  description: ''
})

const rules: FormRules<QuestionTagDTO> = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

const fetchTags = async () => {
  loading.value = true
  try {
    tags.value = await getQuestionTagsApi()
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: QuestionTagVO) => {
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    code: row?.code || '',
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
      await updateQuestionTagApi(editingId.value, form)
    } else {
      await createQuestionTagApi(form)
    }
    ElMessage.success('标签已保存')
    dialogVisible.value = false
    await fetchTags()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: QuestionTagVO) => {
  await updateQuestionTagStatusApi(row.id, row.status === 1 ? 0 : 1)
  ElMessage.success('状态已更新')
  await fetchTags()
}

const handleDelete = async (row: QuestionTagVO) => {
  await ElMessageBox.confirm(`确认删除标签 ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteQuestionTagApi(row.id)
  ElMessage.success('标签已删除')
  await fetchTags()
}

onMounted(fetchTags)
</script>
