<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Bot :size="16" /><span>模型配置</span></div>
        <h1 class="admin-hero__title">AI 模型配置</h1>
        <p class="admin-hero__desc">维护模型供应商、调用地址、默认模型和启停状态。</p>
      </div>
      <div class="admin-hero__actions"><el-button v-permission="'admin:ai:model:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增模型</el-button></div>
    </section>
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>模型列表</h2>
          <p>支持按供应商、模型和状态筛选；可调整表格密度和列显隐，排查接口地址、参数和说明时更清楚。</p>
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
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="模型 / 供应商" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 120px"><el-option label="启用" :value="1" /><el-option label="禁用" :value="0" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="models" row-key="id" :size="tableSize">
          <template #empty>
            <AppState v-if="modelError" type="error" title="模型配置加载失败" :description="modelError">
              <el-button type="primary" :loading="loading" @click="fetchModels">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="modelEmptyTitle" :description="modelEmptyDescription">
              <el-button v-if="hasModelFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else v-permission="'admin:ai:model:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增模型</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('id')" prop="id" label="模型编号" width="100" />
          <el-table-column v-if="isColumnVisible('provider')" prop="provider" label="供应商" min-width="120" />
          <el-table-column v-if="isColumnVisible('modelName')" prop="modelName" label="模型" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('displayName')" prop="displayName" label="显示名" min-width="160" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('apiBaseUrl')" prop="apiBaseUrl" label="接口地址" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('temperature')" label="随机度" width="100">
            <template #default="{ row }">{{ row.temperature ?? '-' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('maxTokens')" label="最大输出" width="110">
            <template #default="{ row }">{{ row.maxTokens ?? '-' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('description')" prop="description" label="说明" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('isDefault')" label="默认" width="90"><template #default="{ row }"><el-tag v-if="row.isDefault === 1" type="success">默认</el-tag><span v-else>-</span></template></el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100"><template #default="{ row }"><el-tag :type="getModelStatus(row) === 1 ? 'success' : 'info'">{{ getModelStatus(row) === 1 ? '启用' : '停用' }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button v-permission="'admin:ai:model:write'" link type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog(row)">编辑</el-button>
                <span class="admin-row-actions__risk">
                  <el-dropdown
                    v-permission="'admin:ai:model:write'"
                    trigger="click"
                    :disabled="isAdminMobileReadonly"
                    @command="(command: string | number | object) => handleRiskCommand(command, row)"
                  >
                    <el-button link type="warning" class="risk-operation-trigger" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()">更多操作</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="toggle-status">
                          {{ getModelStatus(row) === 1 ? '停用模型' : '启用模型' }}
                        </el-dropdown-item>
                        <el-dropdown-item command="set-default" :disabled="row.isDefault === 1">设为默认模型</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>删除模型</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
              </div>
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
        <el-form-item label="接口地址"><el-input v-model.trim="form.apiBaseUrl" /></el-form-item>
        <el-form-item label="API Key"><el-input v-model.trim="form.apiKey" show-password placeholder="留空则不修改" /></el-form-item>
        <el-form-item label="Temperature"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" /></el-form-item>
        <el-form-item label="最大输出长度"><el-input-number v-model="form.maxTokens" :min="1" :step="512" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button v-permission="'admin:ai:model:write'" type="primary" :loading="saving" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Bot } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { createAdminAiModelApi, deleteAdminAiModelApi, getAdminAiModelsApi, setDefaultAdminAiModelApi, updateAdminAiModelApi, updateAdminAiModelStatusApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, AiModelConfigDTO, AiModelConfigVO } from '@/types/adminGovernance'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type AiModelColumnKey =
  | 'id'
  | 'provider'
  | 'modelName'
  | 'displayName'
  | 'apiBaseUrl'
  | 'temperature'
  | 'maxTokens'
  | 'description'
  | 'isDefault'
  | 'status'
  | 'updatedAt'

const loading = ref(false)
const saving = ref(false)
const modelError = ref('')
const dialogVisible = ref(false)
const editingId = ref<number>()
const formRef = ref<FormInstance>()
const models = ref<AiModelConfigVO[]>([])
const total = ref(0)
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AiModelColumnKey>('admin:ai-model-config', [
  { key: 'id', label: '模型编号', defaultVisible: false },
  { key: 'provider', label: '供应商', required: true },
  { key: 'modelName', label: '模型', required: true },
  { key: 'displayName', label: '显示名' },
  { key: 'apiBaseUrl', label: '接口地址' },
  { key: 'temperature', label: '随机度', defaultVisible: false },
  { key: 'maxTokens', label: '最大输出', defaultVisible: false },
  { key: 'description', label: '说明', defaultVisible: false },
  { key: 'isDefault', label: '默认' },
  { key: 'status', label: '状态', required: true },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const query = reactive<AdminListQuery>({ keyword: '', status: '', pageNo: 1, pageSize: 10 })
const form = reactive<AiModelConfigDTO>({ provider: '', modelName: '', displayName: '', apiBaseUrl: '', apiKey: '', enabled: 1, temperature: 0.7, maxTokens: 4096, description: '' })
type AiModelRiskCommand = 'toggle-status' | 'set-default' | 'delete'
const rules: FormRules<AiModelConfigDTO> = {
  provider: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }]
}
const getModelStatus = (row: AiModelConfigVO) => Number(row.enabled ?? row.status ?? 0)
const hasModelFilters = computed(() => Boolean(query.keyword || query.status !== ''))
const modelEmptyTitle = computed(() =>
  hasModelFilters.value ? '当前筛选没有模型配置' : '暂无模型配置'
)
const modelEmptyDescription = computed(() =>
  hasModelFilters.value
    ? '当前筛选条件下没有模型配置。可以清空关键词或状态筛选后重新查看，避免把筛选空误判为模型不可用。'
    : '模型配置为空会影响 AI 生成、评分、报告和题目推荐。请先新增模型并明确默认模型。'
)
const fetchModels = async () => {
  loading.value = true
  modelError.value = ''
  try {
    const result = await getAdminAiModelsApi(query)
    models.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    models.value = []
    total.value = 0
    modelError.value = getErrorMessage(error, '模型配置列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}
const openDialog = (row?: AiModelConfigVO) => {
  editingId.value = row?.id
  Object.assign(form, { provider: row?.provider || '', modelName: row?.modelName || '', displayName: row?.displayName || '', apiBaseUrl: row?.apiBaseUrl || '', apiKey: '', enabled: row?.enabled ?? 1, temperature: row?.temperature ?? 0.7, maxTokens: row?.maxTokens ?? 4096, description: row?.description || '' })
  dialogVisible.value = true
}
const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  await formRef.value?.validate()
  const actionLabel = editingId.value ? '更新模型配置' : '新增模型配置'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: actionLabel,
    target: `供应商：${form.provider || '-'}；模型：${form.modelName || '-'}；接口地址：${form.apiBaseUrl || '-'}`,
    impact: '模型配置会影响 AI 生成、评分、报告和推荐链路的可用性、成本、速度和回答质量；如填写密钥，系统会保存新的访问凭据。',
    rollback: editingId.value
      ? '可再次编辑配置或切换默认模型；已产生的 AI 调用结果不会自动回到修改前。'
      : '可在确认无业务依赖后停用或删除该模型；已保存的密钥不会在页面明文回显。',
    audit: '模型配置保存会记录操作人、模型名称、供应商和时间，便于追踪 AI 配置变更。',
    tips: [
      form.apiKey ? '本次会保存或替换模型访问密钥，确认密钥来源可信。' : '本次没有填写新密钥，不会在前端确认中展示任何密钥明文。',
      '确认接口地址、模型名称、随机度和最大输出符合当前环境。',
      '如这是线上默认模型依赖的配置，请先确认可用性和成本。'
    ],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
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
const handleStatus = async (row: AiModelConfigVO, status: number) => {
  if (!guardAdminMobileWrite()) return
  const actionLabel = status === 1 ? '启用' : '停用'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}模型预览`,
    action: `${actionLabel}模型「${row.modelName}」`,
    target: `模型编号：${row.id}；供应商：${row.provider || '-'}；默认模型：${row.isDefault === 1 ? '是' : '否'}`,
    impact:
      status === 1
        ? '该模型会重新进入可用配置，后续 AI 调用可以再次选择该模型。'
        : '该模型会退出可用配置，依赖该模型的 AI 调用或默认模型链路可能切换到其它可用模型。',
    rollback: `可在模型配置页再次${status === 1 ? '停用' : '启用'}；如影响线上回答质量，需要同步检查 AI 运行记录和默认模型配置。`,
    audit: '模型启停会记录操作人、模型编号、目标状态和时间，便于排查 AI 调用质量波动。',
    tips: ['确认当前模型不是唯一可用模型。', '确认已知晓对成本、稳定性和回答质量的影响。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) {
    await fetchModels()
    return
  }
  await updateAdminAiModelStatusApi(row.id, status)
  ElMessage.success('状态已更新')
  await fetchModels()
}
const handleDefault = async (row: AiModelConfigVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '默认模型切换预览',
    action: `将模型「${row.modelName}」设为默认`,
    target: `模型编号：${row.id}；供应商：${row.provider || '-'}；接口地址：${row.apiBaseUrl || '-'}`,
    impact: '后续全局 AI 调用会优先使用该模型配置，可能影响所有用户的 AI 回答质量、成本、速度和稳定性。',
    rollback: '可重新选择其它可用模型设为默认；已产生的 AI 调用结果不会自动回到切换前。',
    audit: '默认模型切换会记录操作人、原模型、目标模型和时间，便于回溯回答质量变化。',
    tips: ['确认目标模型已通过可用性和成本检查。', '确认不是在排障时误点默认切换。'],
    confirmButtonText: '确认设为默认'
  })
  if (!confirmed) return
  await setDefaultAdminAiModelApi(row.id)
  ElMessage.success('默认模型已更新')
  await fetchModels()
}
const handleDelete = async (row: AiModelConfigVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除模型预览',
    action: `删除模型「${row.modelName}」`,
    target: `模型编号：${row.id}；供应商：${row.provider || '-'}；默认模型：${row.isDefault === 1 ? '是' : '否'}`,
    impact: '该模型配置将从管理端移除，依赖该模型的 AI 调用、默认模型切换或历史排障会受到影响。',
    rollback: '删除后无法直接恢复该模型配置；误删后需重新录入模型、接口地址、密钥和参数。',
    audit: '删除操作会记录操作人、模型编号、模型名称和时间，便于审计。',
    tips: ['确认该模型不是默认模型或唯一可用模型。', '确认已备份必要的模型参数和供应商信息。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteAdminAiModelApi(row.id)
  ElMessage.success('模型已删除')
  await fetchModels()
}
const handleRiskCommand = async (command: string | number | object, row: AiModelConfigVO) => {
  const riskCommand = String(command) as AiModelRiskCommand
  if (riskCommand === 'toggle-status') {
    await handleStatus(row, getModelStatus(row) === 1 ? 0 : 1)
    return
  }
  if (riskCommand === 'set-default') {
    await handleDefault(row)
    return
  }
  if (riskCommand === 'delete') {
    await handleDelete(row)
  }
}
const handleSearch = () => { query.pageNo = 1; fetchModels() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', pageNo: 1, pageSize: 10 }); fetchModels() }
onMounted(fetchModels)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }

.admin-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-row-actions__risk {
  display: inline-flex;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid rgba(148, 163, 184, 0.22);
}

.risk-operation-trigger {
  font-weight: 600;
}

.table-view-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

:global(.column-config-menu) {
  min-width: 180px;
  padding: 8px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

@media (max-width: 900px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
