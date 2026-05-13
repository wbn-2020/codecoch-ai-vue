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
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="标签名称" />
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
        <el-table v-loading="loading" :data="pagedTags" row-key="id">
          <el-table-column prop="name" label="标签名称" min-width="180" />
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
          :total="filteredTags.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
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
  createQuestionTagApi,
  deleteQuestionTagApi,
  getQuestionTagsApi,
  updateQuestionTagApi
} from '@/api/questionTag'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionTagDTO, QuestionTagVO } from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const tags = ref<QuestionTagVO[]>([])

const query = reactive({
  keyword: '',
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionTagDTO>({
  name: '',
  code: '',
  status: 1,
  description: ''
})

const rules: FormRules<QuestionTagDTO> = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

const filteredTags = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return tags.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchStatus = query.status === '' || item.status === query.status
    return matchKeyword && matchStatus
  })
})

const pagedTags = computed(() => {
  const start = (query.pageNo - 1) * query.pageSize
  return filteredTags.value.slice(start, start + query.pageSize)
})

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

const handleDelete = async (row: QuestionTagVO) => {
  await ElMessageBox.confirm(`确认删除标签 ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteQuestionTagApi(row.id)
  ElMessage.success('标签已删除')
  await fetchTags()
}

onMounted(fetchTags)
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
