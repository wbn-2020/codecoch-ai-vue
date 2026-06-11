<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <p class="page-subtitle">维护基础配置项，例如追问次数、每场题数和 AI 超时时间。</p>
      </div>
      <el-button
        v-permission="'admin:system:config:write'"
        type="primary"
        :disabled="isAdminMobileReadonly"
        :title="mobileReadonlyTitle()"
        @click="openDialog()"
      >新增配置</el-button>
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
        <div class="table-card__header">
          <div>
            <h2>配置列表</h2>
            <p>按排障场景调整密度和诊断列，配置值与说明长字段默认保留折叠。</p>
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

        <el-table v-loading="loading" :data="configs" row-key="configKey" :size="tableSize">
          <template #empty>
            <AppState v-if="configError" type="error" title="系统配置加载失败" :description="configError">
              <el-button type="primary" :loading="loading" @click="fetchConfigs">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="configEmptyTitle" :description="configEmptyDescription">
              <el-button v-if="hasConfigFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button
                v-else
                v-permission="'admin:system:config:write'"
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog()"
              >新增配置</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('configKey')" prop="configKey" label="配置 Key" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('configName')" prop="configName" label="配置名称" min-width="160" />
          <el-table-column v-if="isColumnVisible('configValue')" prop="configValue" label="配置值" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('configType')" prop="configType" label="类型" width="110" />
          <el-table-column v-if="isColumnVisible('editable')" label="可编辑" width="100">
            <template #default="{ row }">{{ row.editable === 1 ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('description')" prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button
                  v-permission="'admin:system:config:write'"
                  link
                  type="primary"
                  :disabled="isAdminMobileReadonly || row.editable !== 1"
                  :title="mobileReadonlyTitle(row.editable !== 1 ? '系统内置配置不可编辑' : undefined)"
                  @click="openDialog(row)"
                >编辑</el-button>
                <span class="admin-row-actions__risk">
                  <el-button
                    v-permission="'admin:system:config:write'"
                    link
                    type="danger"
                    :disabled="isAdminMobileReadonly || row.editable !== 1"
                    :title="mobileReadonlyTitle(row.editable !== 1 ? '系统内置配置不可删除' : undefined)"
                    @click="handleDelete(row)"
                  >
                    删除配置
                  </el-button>
                </span>
              </div>
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

    <el-dialog v-model="dialogVisible" :title="editingConfigId ? '编辑配置' : '新增配置'" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="配置 Key" prop="configKey">
          <el-input v-model.trim="form.configKey" :disabled="Boolean(editingConfigId)" />
        </el-form-item>
        <el-form-item label="配置名称">
          <el-input v-model.trim="form.configName" :disabled="Boolean(editingConfigId)" />
        </el-form-item>
        <el-form-item label="配置类型">
          <el-select v-model="form.configType" :disabled="Boolean(editingConfigId)" style="width: 100%">
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
        <el-form-item v-if="!editingConfigId" label="可编辑">
          <el-switch v-model="form.editable" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item v-if="!editingConfigId" label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:system:config:write'"
          type="primary"
          :loading="saving"
          :disabled="isAdminMobileReadonly"
          :title="mobileReadonlyTitle()"
          @click="handleSave"
        >保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createSystemConfigApi,
  deleteSystemConfigApi,
  getSystemConfigsApi,
  updateSystemConfigApi
} from '@/api/system'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { SystemConfigCreateDTO, SystemConfigQueryDTO, SystemConfigVO } from '@/types/system'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type SystemConfigColumnKey =
  | 'configKey'
  | 'configName'
  | 'configValue'
  | 'configType'
  | 'editable'
  | 'status'
  | 'description'
  | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<SystemConfigColumnKey>('admin:system-config', [
  { key: 'configKey', label: '配置 Key', required: true },
  { key: 'configName', label: '配置名称', required: true },
  { key: 'configValue', label: '配置值', required: true },
  { key: 'configType', label: '类型' },
  { key: 'editable', label: '可编辑' },
  { key: 'status', label: '状态', required: true },
  { key: 'description', label: '说明', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingConfigId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const configs = ref<SystemConfigVO[]>([])
const total = ref(0)
const configError = ref('')

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

const hasConfigFilters = computed(() => Boolean(query.keyword || query.status !== ''))
const configEmptyTitle = computed(() => (hasConfigFilters.value ? '没有匹配当前筛选的系统配置' : '暂无系统配置'))
const configEmptyDescription = computed(() =>
  hasConfigFilters.value
    ? '当前筛选条件下没有系统配置。清空筛选后可确认配置是否真的缺失。'
    : '系统配置为空时，追问次数、面试题数、AI 超时等运行参数可能只能依赖系统默认值。建议先补齐基础配置。'
)

const fetchConfigs = async () => {
  loading.value = true
  configError.value = ''
  try {
    const result = await getSystemConfigsApi(query)
    configs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    configs.value = []
    total.value = 0
    configError.value = getErrorMessage(error, '系统配置暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: SystemConfigVO) => {
  if (!guardAdminMobileWrite()) return
  editingConfigId.value = row?.id || null
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

const validateConfigForm = async () => {
  if (!formRef.value) return false
  return formRef.value.validate().catch(() => false)
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  const valid = await validateConfigForm()
  if (!valid) return
  const actionLabel = editingConfigId.value ? '变更系统配置' : '新增系统配置'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.configKey}」`,
    target: `${editingConfigId.value ? `配置编号：${editingConfigId.value}；` : ''}名称：${form.configName || '-'}；类型：${form.configType || '-'}`,
    impact: '系统配置保存后会影响依赖该 Key 的后台运行参数、管理端读取结果和相关业务开关。',
    rollback: editingConfigId.value
      ? '保存后不会自动保留旧值；如误改，需要凭操作记录或备份手动恢复原配置值。'
      : '新增后可再次编辑或删除该配置；如果业务已经开始依赖该 Key，需要同步评估影响范围。',
    audit: '系统配置保存会记录操作人、配置键名、配置编号和时间，便于追踪参数变更。',
    tips: [
      '确认配置值格式与类型匹配。',
      '敏感配置值不会在确认预览中明文展示。',
      '确认该配置不是生产关键开关或凭据类敏感值。'
    ],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingConfigId.value) {
      await updateSystemConfigApi(editingConfigId.value, {
        configValue: form.configValue || '',
        description: form.description
      })
    } else {
      await createSystemConfigApi(form)
    }
    ElMessage.success('系统配置已保存')
    dialogVisible.value = false
    await fetchConfigs()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '系统配置保存失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}


const handleDelete = async (row: SystemConfigVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除系统配置预览',
    action: `删除系统配置「${row.configKey}」`,
    target: `配置编号：${row.id}；名称：${row.configName || '-'}；类型：${row.configType || '-'}`,
    impact: '该配置项会从系统配置列表移除，依赖该 Key 的后台参数读取、管理端展示和业务开关可能受到影响。',
    rollback: '删除后无法直接恢复该配置；误删后需要重新创建配置并补齐原配置值。',
    audit: '系统配置删除会记录操作人、配置键名、配置编号和时间，便于审计。',
    tips: ['确认没有服务仍依赖该配置 Key。', '确认已记录当前配置值和说明。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteSystemConfigApi(row.id)
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

.table-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.table-card__header h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
}

.table-card__header p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
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

@media (max-width: 900px) {
  .table-card__header {
    flex-direction: column;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
