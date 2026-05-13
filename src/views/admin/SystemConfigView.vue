<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <p class="page-subtitle">维护 V1 基础配置项，例如追问次数、每场题数和 AI 超时时间。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增配置</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="配置名称 / Key" />
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
        <el-table v-loading="loading" :data="configs" row-key="configKey">
          <el-table-column prop="configKey" label="配置 Key" min-width="200" show-overflow-tooltip />
          <el-table-column prop="configName" label="配置名称" min-width="160" />
          <el-table-column prop="configValue" label="配置值" min-width="180" show-overflow-tooltip />
          <el-table-column prop="configType" label="类型" width="110" />
          <el-table-column label="可编辑" width="100">
            <template #default="{ row }">{{ row.editable === 1 ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="row.editable !== 1" @click="openDialog(row)">编辑</el-button>
              <el-button link @click="toggleStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
              <el-button link type="danger" :disabled="row.editable !== 1" @click="handleDelete(row)">删除</el-button>
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
          @change="fetchConfigs"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingKey ? '编辑配置' : '新增配置'" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="配置 Key" prop="configKey">
          <el-input v-model.trim="form.configKey" :disabled="Boolean(editingKey)" />
        </el-form-item>
        <el-form-item label="配置名称">
          <el-input v-model.trim="form.configName" :disabled="Boolean(editingKey)" />
        </el-form-item>
        <el-form-item label="配置类型">
          <el-select v-model="form.configType" :disabled="Boolean(editingKey)" style="width: 100%">
            <el-option label="STRING" value="STRING" />
            <el-option label="NUMBER" value="NUMBER" />
            <el-option label="BOOLEAN" value="BOOLEAN" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置值" prop="configValue">
          <el-input v-model="form.configValue" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="!editingKey" label="可编辑">
          <el-switch v-model="form.editable" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item v-if="!editingKey" label="状态">
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
  createSystemConfigApi,
  deleteSystemConfigApi,
  getSystemConfigsApi,
  updateSystemConfigApi,
  updateSystemConfigStatusApi
} from '@/api/system'
import StatusTag from '@/components/common/StatusTag.vue'
import type { SystemConfigCreateDTO, SystemConfigQueryDTO, SystemConfigVO } from '@/types/system'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingKey = ref<string | null>(null)
const formRef = ref<FormInstance>()
const configs = ref<SystemConfigVO[]>([])
const total = ref(0)

const query = reactive<SystemConfigQueryDTO>({
  keyword: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<SystemConfigCreateDTO>({
  configKey: '',
  configName: '',
  configValue: '',
  configType: 'STRING',
  editable: 1,
  status: 1,
  description: ''
})

const rules: FormRules<SystemConfigCreateDTO> = {
  configKey: [{ required: true, message: '请输入配置 Key', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入配置值', trigger: 'blur' }]
}

const fetchConfigs = async () => {
  loading.value = true
  try {
    const result = await getSystemConfigsApi(query)
    configs.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: SystemConfigVO) => {
  editingKey.value = row?.configKey || null
  Object.assign(form, {
    configKey: row?.configKey || '',
    configName: row?.configName || '',
    configValue: row?.configValue || '',
    configType: row?.configType || 'STRING',
    editable: row?.editable ?? 1,
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
    if (editingKey.value) {
      await updateSystemConfigApi(editingKey.value, {
        configValue: form.configValue || '',
        description: form.description
      })
    } else {
      await createSystemConfigApi(form)
    }
    ElMessage.success('系统配置已保存')
    dialogVisible.value = false
    await fetchConfigs()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: SystemConfigVO) => {
  await updateSystemConfigStatusApi(row.configKey, row.status === 1 ? 0 : 1)
  ElMessage.success('配置状态已更新')
  await fetchConfigs()
}

const handleDelete = async (row: SystemConfigVO) => {
  await ElMessageBox.confirm(`确认删除配置 ${row.configKey}？`, '删除确认', { type: 'warning' })
  await deleteSystemConfigApi(row.configKey)
  ElMessage.success('系统配置已删除')
  await fetchConfigs()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchConfigs()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchConfigs()
}

onMounted(fetchConfigs)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
