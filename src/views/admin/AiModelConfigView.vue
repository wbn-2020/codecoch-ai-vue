<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Bot :size="16" /><span>Model Config</span></div>
        <h1 class="admin-hero__title">AI 模型配置</h1>
        <p class="admin-hero__desc">维护模型供应商、调用地址、默认模型和启停状态。</p>
      </div>
      <div class="admin-hero__actions"><el-button type="primary" @click="openDialog()">新增模型</el-button></div>
    </section>
    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="模型 / 供应商" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 120px"><el-option label="启用" :value="1" /><el-option label="禁用" :value="0" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="models" row-key="id">
          <el-table-column prop="provider" label="供应商" min-width="120" />
          <el-table-column prop="modelName" label="模型" min-width="180" show-overflow-tooltip />
          <el-table-column prop="displayName" label="显示名" min-width="160" show-overflow-tooltip />
          <el-table-column prop="apiBaseUrl" label="Base URL" min-width="220" show-overflow-tooltip />
          <el-table-column label="默认" width="90"><template #default="{ row }"><el-tag v-if="row.isDefault === 1" type="success">默认</el-tag><span v-else>-</span></template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-switch :model-value="row.enabled ?? row.status" :active-value="1" :inactive-value="0" @change="(value: string | number | boolean) => handleStatus(row, Number(value))" /></template></el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.isDefault === 1" @click="handleDefault(row)">设默认</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchModels" /></div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑模型' : '新增模型'" width="680px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="供应商" prop="provider"><el-input v-model.trim="form.provider" placeholder="openai / deepseek" /></el-form-item>
        <el-form-item label="模型名称" prop="modelName"><el-input v-model.trim="form.modelName" /></el-form-item>
        <el-form-item label="显示名"><el-input v-model.trim="form.displayName" /></el-form-item>
        <el-form-item label="Base URL"><el-input v-model.trim="form.apiBaseUrl" /></el-form-item>
        <el-form-item label="API Key"><el-input v-model.trim="form.apiKey" show-password placeholder="留空则不修改" /></el-form-item>
        <el-form-item label="Temperature"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" /></el-form-item>
        <el-form-item label="Max Tokens"><el-input-number v-model="form.maxTokens" :min="1" :step="512" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bot } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { createAdminAiModelApi, deleteAdminAiModelApi, getAdminAiModelsApi, setDefaultAdminAiModelApi, updateAdminAiModelApi, updateAdminAiModelStatusApi } from '@/api/adminGovernance'
import type { AdminListQuery, AiModelConfigDTO, AiModelConfigVO } from '@/types/adminGovernance'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number>()
const formRef = ref<FormInstance>()
const models = ref<AiModelConfigVO[]>([])
const total = ref(0)
const query = reactive<AdminListQuery>({ keyword: '', status: '', pageNo: 1, pageSize: 10 })
const form = reactive<AiModelConfigDTO>({ provider: '', modelName: '', displayName: '', apiBaseUrl: '', apiKey: '', enabled: 1, temperature: 0.7, maxTokens: 4096, description: '' })
const rules: FormRules<AiModelConfigDTO> = {
  provider: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }]
}
const fetchModels = async () => {
  loading.value = true
  try { const result = await getAdminAiModelsApi(query); models.value = result.records || []; total.value = result.total || 0 } catch { models.value = []; total.value = 0 } finally { loading.value = false }
}
const openDialog = (row?: AiModelConfigVO) => {
  editingId.value = row?.id
  Object.assign(form, { provider: row?.provider || '', modelName: row?.modelName || '', displayName: row?.displayName || '', apiBaseUrl: row?.apiBaseUrl || '', apiKey: '', enabled: row?.enabled ?? 1, temperature: row?.temperature ?? 0.7, maxTokens: row?.maxTokens ?? 4096, description: row?.description || '' })
  dialogVisible.value = true
}
const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = { ...form }
    if (!payload.apiKey) delete payload.apiKey
    if (editingId.value) await updateAdminAiModelApi(editingId.value, payload)
    else await createAdminAiModelApi(payload)
    ElMessage.success('模型配置已保存')
    dialogVisible.value = false
    await fetchModels()
  } finally { saving.value = false }
}
const handleStatus = async (row: AiModelConfigVO, status: number) => { await updateAdminAiModelStatusApi(row.id, status); ElMessage.success('状态已更新'); await fetchModels() }
const handleDefault = async (row: AiModelConfigVO) => { await setDefaultAdminAiModelApi(row.id); ElMessage.success('默认模型已更新'); await fetchModels() }
const handleDelete = async (row: AiModelConfigVO) => { await ElMessageBox.confirm(`确认删除模型 ${row.modelName}？`, '删除确认', { type: 'warning' }); await deleteAdminAiModelApi(row.id); ElMessage.success('模型已删除'); await fetchModels() }
const handleSearch = () => { query.pageNo = 1; fetchModels() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', pageNo: 1, pageSize: 10 }); fetchModels() }
onMounted(fetchModels)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
</style>
