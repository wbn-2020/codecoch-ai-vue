<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Bot :size="16" /><span>模型配置</span></div>
        <h1 class="admin-hero__title">AI 模型配置</h1>
        <p class="admin-hero__desc">维护模型供应商、调用地址、默认作用域、业务路由和启停状态。</p>
      </div>
      <div class="admin-hero__actions"><el-button v-permission="'admin:ai:model:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增模型</el-button></div>
    </section>
    <section v-if="runtimeStatus || runtimeError" class="admin-runtime-strip" aria-live="polite">
      <div class="admin-runtime-strip__summary">
        <div>
          <span>当前业务路由</span>
          <strong>{{ runtimeStatus?.effectiveModeLabel || '运行态待确认' }}</strong>
        </div>
        <el-tag :type="runtimeModeTagType">{{ runtimeStatus?.realRoutingAllowed ? '允许真实调用' : '真实调用已阻止' }}</el-tag>
        <el-tag effect="plain">默认作用域：{{ defaultModelScopeLabel }}</el-tag>
        <el-tag v-if="runtimeStatus?.effectivePrimaryProvider" effect="plain">
          实际主路由：{{ runtimeStatus.effectivePrimaryProvider }}{{ runtimeStatus.effectivePrimaryModel ? ` / ${runtimeStatus.effectivePrimaryModel}` : '' }}
        </el-tag>
        <el-button link type="primary" :loading="runtimeLoading" @click="fetchRuntimeStatus">刷新运行态</el-button>
      </div>
      <p v-if="runtimeError" class="admin-runtime-strip__error">{{ runtimeError }}</p>
      <p v-else-if="runtimeStatus?.operatorMessages?.length" class="admin-runtime-strip__messages">
        {{ runtimeStatus.operatorMessages.join('；') }}
      </p>
      <p class="admin-runtime-strip__policy">
        真实业务路由必须且只能有一个已启用的全局默认模型。不支持直接取消默认；将其它模型设为默认时会原子替换当前默认模型。
      </p>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>模型列表</h2>
          <p>支持按供应商、模型和配置状态筛选；调用健康和最近调用摘要仅按后端真实字段展示，未提供时保持未知。</p>
        </div>
        <AdminTableViewSettings
          v-model:size="tableSize"
          :size-options="tableSizeOptions"
          :columns="columnOptions"
          :visible-columns="visibleColumns"
          aria-label="模型列表表格视图设置"
          @update:column-visible="({ key, visible }) => visibleColumns[key as AiModelColumnKey] = visible"
          @reset="resetTableView"
        />
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
          <el-table-column v-if="isColumnVisible('isDefault')" label="默认模型" min-width="180">
            <template #default="{ row }">
              <div v-if="row.isDefault === 1" class="model-default-cell">
                <el-tag type="success">默认</el-tag>
                <span>{{ defaultModelScopeShortLabel }}</span>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="配置状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getModelStatus(row) === 1 ? 'success' : 'info'">
                {{ getModelStatus(row) === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('callHealth')" label="调用健康" width="120">
            <template #default="{ row }">
              <el-tag :type="getModelHealth(row).type">{{ getModelHealth(row).label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('recentCalls')" label="最近成功 / 失败摘要" min-width="300">
            <template #default="{ row }">
              <div class="model-call-summary">
                <span><strong>成功</strong>{{ formatModelCallEvent(row.lastCallSuccessAt, row.lastCallSuccessSummary) }}</span>
                <span><strong>失败</strong>{{ formatModelCallEvent(row.lastCallFailureAt, row.lastCallFailureSummary) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button v-permission="'admin:ai:model:write'" link type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog(row)">编辑</el-button>
                <el-button
                  v-if="canManageModelProbe"
                  v-permission="'admin:ai:model:publish'"
                  link
                  type="success"
                  :loading="probingId === row.id"
                  :disabled="isAdminMobileReadonly || probingId === row.id"
                  :title="mobileReadonlyTitle()"
                  @click="handleProbe(row)"
                >{{ probingId === row.id ? probeProgressLabel : '测活' }}</el-button>
                <span class="admin-row-actions__risk">
                  <el-dropdown
                    v-if="canManageModelWrite || canManageModelPublish"
                    trigger="click"
                    :disabled="isAdminMobileReadonly || mutatingId !== undefined"
                    @command="(command: string | number | object) => handleRiskCommand(command, row)"
                  >
                    <el-button
                      link
                      type="warning"
                      class="risk-operation-trigger"
                      :loading="mutatingId === row.id"
                      :disabled="isAdminMobileReadonly || mutatingId !== undefined"
                      :title="mobileReadonlyTitle()"
                    >更多操作</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-if="canManageModelPublish" v-permission="'admin:ai:model:publish'" command="toggle-status" :disabled="row.isDefault === 1 && getModelStatus(row) === 1">
                          {{ getModelStatus(row) === 1 ? '停用模型' : '启用模型' }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="canManageModelPublish" v-permission="'admin:ai:model:publish'" command="set-default" :disabled="row.isDefault === 1">设为默认模型</el-dropdown-item>
                        <el-dropdown-item v-if="canManageModelWrite" v-permission="'admin:ai:model:write'" command="delete" divided :disabled="row.isDefault === 1">删除模型</el-dropdown-item>
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
        <el-alert v-if="modelFormErrorMessage" class="admin-form-error" type="error" :closable="false" show-icon :title="modelFormErrorMessage" />
        <el-form-item label="供应商标识" prop="provider" :error="modelFieldErrors.provider"><el-input v-model.trim="form.provider" placeholder="OPENAI_COMPATIBLE" @input="clearModelFieldError('provider')" /></el-form-item>
        <el-form-item label="模型标识" prop="modelName" :error="modelFieldErrors.modelName"><el-input v-model.trim="form.modelName" placeholder="服务商要求的模型 ID" @input="clearModelFieldError('modelName')" /></el-form-item>
        <el-form-item label="显示名"><el-input v-model.trim="form.displayName" /></el-form-item>
        <el-form-item label="接口地址" prop="apiBaseUrl" :error="modelFieldErrors.apiBaseUrl"><el-input v-model.trim="form.apiBaseUrl" placeholder="https://provider.example.com/v1/chat/completions" @input="clearModelFieldError('apiBaseUrl')" /></el-form-item>
        <el-form-item label="API Key" prop="apiKey" :error="modelFieldErrors.apiKey"><el-input v-model.trim="form.apiKey" show-password :placeholder="editingId ? '留空则不修改' : form.enabled === 1 ? '启用模型时必填' : '停用草稿可稍后配置'" @input="clearModelFieldError('apiKey')" /></el-form-item>
        <el-form-item label="配置状态" :error="modelFieldErrors.enabled"><el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" @change="clearModelFieldError('enabled')" /></el-form-item>
        <el-form-item label="Temperature"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" /></el-form-item>
        <el-form-item label="最大输出长度"><el-input-number v-model="form.maxTokens" :min="1" :step="512" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button v-permission="'admin:ai:model:write'" type="primary" :loading="saving" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleSave">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="probeDialogVisible" title="AI 模型测活结果" width="560px">
      <div v-if="probeResult" class="model-probe-result" :class="{ 'is-success': probeResult.success, 'is-failure': !probeResult.success }">
        <div class="model-probe-result__headline">
          <div>
            <strong>{{ probeResult.modelCode }}</strong>
            <span>{{ probeResult.provider }}</span>
          </div>
          <el-tag :type="probeResult.success ? 'success' : 'danger'">
            {{ probeResult.success ? '连接成功' : '连接失败' }}
          </el-tag>
        </div>
        <dl class="model-probe-result__metrics">
          <div><dt>耗时</dt><dd>{{ probeResult.elapsedMs ?? '-' }} ms</dd></div>
          <div><dt>失败类型</dt><dd>{{ probeResult.success ? '-' : (probeResult.failureType || '-') }}</dd></div>
          <div><dt>HTTP 状态</dt><dd>{{ probeResult.httpStatus ?? '-' }}</dd></div>
          <div><dt>Token</dt><dd>{{ probeResult.totalTokens ?? '-' }}</dd></div>
        </dl>
        <div v-if="probeResult.requestPromptPreview" class="model-probe-result__section">
          <span>测试语句</span>
          <pre class="model-probe-result__preview">{{ probeResult.requestPromptPreview }}</pre>
        </div>
        <p class="model-probe-result__message">{{ probeResult.message || '-' }}</p>
        <div v-if="probeResult.responsePreview" class="model-probe-result__section">
          <span>模型返回</span>
          <pre class="model-probe-result__preview">{{ probeResult.responsePreview }}</pre>
        </div>
      </div>
      <template #footer><el-button @click="probeDialogVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="probePromptDialogVisible" title="配置模型测活" width="560px" :close-on-click-modal="false">
      <div v-if="probeTarget" class="model-probe-form__target">
        <strong>{{ probeTarget.modelName }}</strong>
        <span>{{ probeTarget.provider }} · {{ probeTarget.apiBaseUrl || '未配置接口地址' }}</span>
      </div>
      <el-form label-position="top">
        <el-form-item label="测试语句">
          <el-input
            v-model="probePrompt"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="例如：请用一句话回复：连接正常。"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="probingId !== undefined" @click="probePromptDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!probePrompt.trim()" @click="confirmProbe">查看测活影响</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="probeProgressVisible" title="正在测活模型" width="440px" :close-on-click-modal="false" :show-close="false">
      <div class="model-probe-progress">
        <strong>{{ probeProgressLabel }}</strong>
        <p>{{ probeProgressDescription }}</p>
        <el-progress :percentage="probeProgressPercent" :indeterminate="probeProgressPercent < 100" :show-text="false" />
        <small>仅当前模型行处于等待状态；其它模型仍可继续查看和操作。</small>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Bot } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { createAdminAiModelApi, deleteAdminAiModelApi, getAdminAiModelsApi, getAdminAiRuntimeStatusApi, probeAdminAiModelApi, setDefaultAdminAiModelApi, updateAdminAiModelApi, updateAdminAiModelStatusApi } from '@/api/adminGovernance'
import AdminTableViewSettings from '@/components/admin/AdminTableViewSettings.vue'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { useAuthStore } from '@/stores/auth'
import type { AdminListQuery, AiModelConfigDTO, AiModelConfigVO, AiModelProbeVO, AiRuntimeStatusVO } from '@/types/adminGovernance'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

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
  | 'callHealth'
  | 'recentCalls'
  | 'updatedAt'

const loading = ref(false)
const saving = ref(false)
const modelError = ref('')
const dialogVisible = ref(false)
const editingId = ref<number>()
const formRef = ref<FormInstance>()
const modelFormErrorMessage = ref('')
const modelFieldErrors = reactive<Record<string, string>>({})
const models = ref<AiModelConfigVO[]>([])
const total = ref(0)
const probingId = ref<number>()
const mutatingId = ref<number>()
const probeDialogVisible = ref(false)
const probeResult = ref<AiModelProbeVO>()
const probePromptDialogVisible = ref(false)
const probeTarget = ref<AiModelConfigVO>()
const probePrompt = ref('请仅回复：连接正常。')
const probeProgressVisible = ref(false)
const probeElapsedSeconds = ref(0)
let probeProgressTimer: number | undefined
const runtimeLoading = ref(false)
const runtimeError = ref('')
const runtimeStatus = ref<AiRuntimeStatusVO>()
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const authStore = useAuthStore()
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
  { key: 'status', label: '配置状态', required: true },
  { key: 'callHealth', label: '调用健康' },
  { key: 'recentCalls', label: '最近成功 / 失败摘要' },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const query = reactive<AdminListQuery>({ keyword: '', status: '', pageNo: 1, pageSize: 10 })
const form = reactive<AiModelConfigDTO>({ provider: '', modelName: '', displayName: '', apiBaseUrl: '', apiKey: '', enabled: 0, temperature: 0.7, maxTokens: 4096, description: '' })
type AiModelRiskCommand = 'toggle-status' | 'set-default' | 'delete'
const validateApiBaseUrl = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) {
    callback(new Error('请输入接口地址'))
    return
  }
  try {
    const url = new URL(rawValue)
    callback(url.protocol === 'https:' ? undefined : new Error('接口地址必须使用 HTTPS'))
  } catch {
    callback(new Error('请输入有效的 HTTPS 接口地址'))
  }
}
const validateApiKey = (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
  const enabledDraftNeedsKey = !editingId.value && form.enabled === 1
  callback(enabledDraftNeedsKey && !String(value || '').trim() ? new Error('启用模型时必须填写 API Key') : undefined)
}
const rules: FormRules<AiModelConfigDTO> = {
  provider: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型标识', trigger: 'blur' }],
  apiBaseUrl: [{ validator: validateApiBaseUrl, trigger: 'blur' }],
  apiKey: [{ validator: validateApiKey, trigger: 'blur' }]
}
const getModelStatus = (row: AiModelConfigVO) => Number(row.enabled ?? row.status ?? 0)
const runtimeModeTagType = computed(() => {
  const mode = runtimeStatus.value?.effectiveMode
  if (mode === 'REAL') return 'success'
  if (mode === 'MOCK' || mode === 'DEGRADED') return 'warning'
  return 'info'
})
const defaultModelScopeLabel = computed(
  () => runtimeStatus.value?.defaultModelScopeLabel || '全局唯一默认模型'
)
const defaultModelScopeShortLabel = computed(() =>
  runtimeStatus.value?.defaultModelScope === 'GLOBAL' || !runtimeStatus.value?.defaultModelScope
    ? '全局默认'
    : defaultModelScopeLabel.value
)
const probeProgressLabel = computed(() => {
  if (probeElapsedSeconds.value >= 30) return `供应商响应较慢，已等待 ${probeElapsedSeconds.value} 秒`
  if (probeElapsedSeconds.value >= 8) return `正在等待模型返回，已等待 ${probeElapsedSeconds.value} 秒`
  if (probeElapsedSeconds.value >= 2) return '已发起调用，正在等待供应商响应'
  return '正在校验配置并建立连接'
})
const probeProgressDescription = computed(() => {
  if (probeElapsedSeconds.value >= 30) return '调用仍在进行。完成后会展示实际返回内容或可诊断的失败信息。'
  if (probeElapsedSeconds.value >= 8) return '供应商调用可能需要较长时间，页面会持续保留当前测活状态。'
  return '正在向当前模型发送测试语句，不会切换默认模型或修改启停状态。'
})
const probeProgressPercent = computed(() => Math.min(95, 12 + probeElapsedSeconds.value * 3))
const startProbeProgress = () => {
  stopProbeProgress()
  probeElapsedSeconds.value = 0
  probeProgressVisible.value = true
  probeProgressTimer = window.setInterval(() => {
    probeElapsedSeconds.value += 1
  }, 1000)
}
const stopProbeProgress = () => {
  if (probeProgressTimer) {
    window.clearInterval(probeProgressTimer)
    probeProgressTimer = undefined
  }
  probeProgressVisible.value = false
}
const getModelHealth = (row: AiModelConfigVO) => {
  const status = String(row.callHealthStatus || '').trim().toUpperCase()
  if (['HEALTHY', 'SUCCESS', 'SUCCEEDED', 'AVAILABLE', 'OK'].includes(status)) {
    return { label: '健康', type: 'success' as const }
  }
  if (['DEGRADED', 'WARNING', 'PARTIAL'].includes(status)) {
    return { label: '受限', type: 'warning' as const }
  }
  if (['FAILED', 'ERROR', 'DOWN', 'UNHEALTHY'].includes(status)) {
    return { label: '异常', type: 'danger' as const }
  }
  return { label: '未知', type: 'info' as const }
}
const formatModelCallEvent = (at?: string, summary?: string) => {
  if (!at && !summary) return '未提供'
  return [at, summary].filter(Boolean).join(' · ')
}
const canManageModelWrite = computed(() => authStore.hasAnyAuthority(['admin:ai:model:write', 'ADMIN']))
const canManageModelPublish = computed(() => authStore.hasAnyAuthority(['admin:ai:model:publish', 'ADMIN']))
const canManageModelProbe = computed(() => canManageModelPublish.value)
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
const fetchRuntimeStatus = async () => {
  runtimeLoading.value = true
  runtimeError.value = ''
  try {
    runtimeStatus.value = await getAdminAiRuntimeStatusApi()
  } catch (error) {
    runtimeError.value = getErrorMessage(error, 'AI 运行态暂时获取失败，模型列表仍可继续管理。')
  } finally {
    runtimeLoading.value = false
  }
}
const refreshModelWorkspace = async () => {
  await Promise.all([fetchModels(), fetchRuntimeStatus()])
}
const clearModelFormErrors = () => {
  modelFormErrorMessage.value = ''
  Object.keys(modelFieldErrors).forEach((key) => delete modelFieldErrors[key])
}
const clearModelFieldError = (field: string) => {
  delete modelFieldErrors[field]
  if (Object.keys(modelFieldErrors).length === 0) modelFormErrorMessage.value = ''
}
const modelMutationDiagnostics = (error: unknown, fallback: string) => {
  const value = (error && typeof error === 'object' ? error : {}) as {
    message?: unknown
    msg?: unknown
    nextStep?: unknown
    traceId?: unknown
    requestId?: unknown
    fieldErrors?: unknown
    response?: {
      data?: {
        message?: unknown
        msg?: unknown
        nextStep?: unknown
        traceId?: unknown
        requestId?: unknown
        fieldErrors?: unknown
      }
      headers?: { get?: (name: string) => string | null }
    }
  }
  const payload = value.response?.data || value
  const rawFields = payload.fieldErrors
  const normalizedFields: Record<string, string> = {}
  if (rawFields && typeof rawFields === 'object') {
    Object.entries(rawFields as Record<string, unknown>).forEach(([field, message]) => {
      if (typeof message !== 'string' || !message.trim()) return
      const normalizedField = field === 'modelCode' ? 'modelName' : field
      normalizedFields[normalizedField] = message.trim()
    })
  }
  const rawMessage = [payload.message, payload.msg, value.message, value.msg]
    .find((item) => typeof item === 'string' && item.trim())
  const reason = rawMessage ? String(rawMessage).trim() : getErrorMessage(error, fallback)
  const nextStep = typeof payload.nextStep === 'string' && payload.nextStep.trim()
    ? payload.nextStep.trim()
    : ''
  const traceId = [
    payload.traceId,
    payload.requestId,
    value.traceId,
    value.requestId,
    value.response?.headers?.get?.('X-Trace-Id'),
    value.response?.headers?.get?.('X-Request-Id')
  ].find((item) => typeof item === 'string' && item.trim())
  return {
    fieldErrors: normalizedFields,
    message: [
      reason,
      nextStep ? `下一步：${nextStep}` : '',
      traceId ? `追踪号：${String(traceId).trim()}` : ''
    ].filter(Boolean).join('；')
  }
}
const openDialog = (row?: AiModelConfigVO) => {
  editingId.value = row?.id
  Object.assign(form, { provider: row?.provider || '', modelName: row?.modelName || '', displayName: row?.displayName || '', apiBaseUrl: row?.apiBaseUrl || '', apiKey: '', enabled: row?.enabled ?? 0, temperature: row?.temperature ?? 0.7, maxTokens: row?.maxTokens ?? 4096, description: row?.description || '' })
  clearModelFormErrors()
  formRef.value?.clearValidate()
  dialogVisible.value = true
}
const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  clearModelFormErrors()
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
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
    const payload: AiModelConfigDTO = { ...form }
    if (!payload.apiKey) delete payload.apiKey
    const confirmedPayload = {
      ...payload,
      confirm: true,
      dryRun: false,
      reason: editingId.value
        ? 'Admin confirmed AI model config update from model management page.'
        : 'Admin confirmed AI model config create from model management page.',
      idempotencyKey: createOperationIdempotencyKey(
        editingId.value ? `ai-model-update-${editingId.value}` : 'ai-model-create'
      )
    }
    if (editingId.value) await updateAdminAiModelApi(editingId.value, confirmedPayload)
    else await createAdminAiModelApi(confirmedPayload)
    ElMessage.success('模型配置已保存')
    dialogVisible.value = false
    await refreshModelWorkspace()
  } catch (error) {
    const diagnostic = modelMutationDiagnostics(
      error,
      '模型配置保存失败，请检查接口地址、密钥和当前账号权限后重试。'
    )
    Object.assign(modelFieldErrors, diagnostic.fieldErrors)
    modelFormErrorMessage.value = diagnostic.message
    ElMessage.error(diagnostic.message)
  } finally { saving.value = false }
}
const handleStatus = async (row: AiModelConfigVO, status: number) => {
  if (!canManageModelPublish.value || !guardAdminMobileWrite()) return
  if (row.isDefault === 1 && status === 0) {
    ElMessage.warning('默认模型不能直接停用，请先将另一台已启用模型设为默认。')
    return
  }
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
    return
  }
  mutatingId.value = row.id
  try {
    await updateAdminAiModelStatusApi(row.id, status, {
      confirm: true,
      dryRun: false,
      reason: `Admin confirmed AI model ${status === 1 ? 'enable' : 'disable'} from model management page.`,
      idempotencyKey: createOperationIdempotencyKey(`ai-model-status-${row.id}`)
    })
    ElMessage.success('状态已更新')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${actionLabel}模型失败，当前页面状态未改变。请稍后重试或打开诊断中心查看追踪信息。`))
  } finally {
    mutatingId.value = undefined
    await refreshModelWorkspace()
  }
}
const handleProbe = async (row: AiModelConfigVO) => {
  if (!canManageModelProbe.value || !guardAdminMobileWrite()) return
  probeTarget.value = row
  probePrompt.value = '请仅回复：连接正常。'
  probePromptDialogVisible.value = true
}
const confirmProbe = async () => {
  const row = probeTarget.value
  const prompt = probePrompt.value.trim()
  if (!row || !prompt) return
  const confirmed = await confirmDangerActionPreview({
    title: '模型测活预览',
    action: `测试模型「${row.modelName}」`,
    target: `模型编号：${row.id}；供应商：${row.provider || '-'}；接口地址：${row.apiBaseUrl || '-'}`,
    impact: `系统会向该模型发送测试语句「${prompt.slice(0, 120)}${prompt.length > 120 ? '…' : ''}」，产生一次真实供应商调用和可能的少量费用；不会切换默认模型或改变启停状态。`,
    rollback: '测活不会修改模型配置；如不希望继续调用，可关闭当前模型或移除访问凭据。',
    audit: '测活会记录模型编号、供应商、结果、耗时和脱敏错误摘要；测试语句不会写入模型运行记录。',
    tips: ['确认测试语句不包含不应发送给供应商的业务敏感信息。', '确认供应商可能产生少量调用费用。'],
    confirmButtonText: '确认测活'
  })
  if (!confirmed) return
  probePromptDialogVisible.value = false
  probingId.value = row.id
  probeResult.value = undefined
  startProbeProgress()
  try {
    const result = await probeAdminAiModelApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed AI model live probe from model management page.',
      idempotencyKey: createOperationIdempotencyKey(`ai-model-probe-${row.id}`),
      prompt
    })
    probeResult.value = result
    probeDialogVisible.value = true
    ElMessage[result.success ? 'success' : 'warning'](
      result.success ? '模型连接成功' : '模型连接失败，请查看测活结果'
    )
    await refreshModelWorkspace()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '模型测活失败，请检查接口地址、密钥和当前账号权限。'))
  } finally {
    stopProbeProgress()
    probingId.value = undefined
  }
}
const handleDefault = async (row: AiModelConfigVO) => {
  if (!canManageModelPublish.value || !guardAdminMobileWrite()) return
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
  mutatingId.value = row.id
  try {
    await setDefaultAdminAiModelApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed default AI model switch from model management page.',
      idempotencyKey: createOperationIdempotencyKey(`ai-model-default-${row.id}`)
    })
    ElMessage.success('默认模型已更新')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '默认模型切换失败，当前页面状态未改变。请确认模型已启用且默认作用域没有冲突。'))
  } finally {
    mutatingId.value = undefined
    await refreshModelWorkspace()
  }
}
const handleDelete = async (row: AiModelConfigVO) => {
  if (!canManageModelWrite.value || !guardAdminMobileWrite()) return
  if (row.isDefault === 1) {
    ElMessage.warning('默认模型不能直接删除，请先将另一台已启用模型设为默认。')
    return
  }
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
  mutatingId.value = row.id
  try {
    await deleteAdminAiModelApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed AI model delete from model management page.',
      idempotencyKey: createOperationIdempotencyKey(`ai-model-delete-${row.id}`)
    })
    ElMessage.success('模型已删除')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '模型删除失败，当前配置仍然保留。请确认该模型不是默认模型或唯一可用模型。'))
  } finally {
    mutatingId.value = undefined
    await refreshModelWorkspace()
  }
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
const handleSearch = () => { query.pageNo = 1; void fetchModels() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', pageNo: 1, pageSize: 10 }); void fetchModels() }
onMounted(refreshModelWorkspace)
onBeforeUnmount(stopProbeProgress)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }

.admin-runtime-strip {
  display: grid;
  gap: 8px;
  margin: 0 0 16px;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}
.admin-runtime-strip__summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.admin-runtime-strip__summary > div { display: inline-flex; align-items: baseline; gap: 8px; }
.admin-runtime-strip__summary span,
.admin-runtime-strip__messages,
.admin-runtime-strip__error,
.admin-runtime-strip__policy { color: var(--el-text-color-secondary); font-size: 13px; }
.admin-runtime-strip__summary strong { color: var(--el-text-color-primary); font-size: 14px; }
.admin-runtime-strip__error { margin: 0; color: var(--el-color-danger); }
.admin-runtime-strip__messages { margin: 0; line-height: 1.6; }
.admin-runtime-strip__policy { margin: 0; line-height: 1.6; }
.admin-form-error { margin-bottom: 16px; }
.model-default-cell { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.model-default-cell span { color: var(--el-text-color-secondary); font-size: 12px; }

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

.model-probe-result {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 18px;
  background: rgba(15, 23, 42, 0.24);
}

.model-probe-result.is-success {
  border-color: rgba(52, 211, 153, 0.42);
}

.model-probe-result.is-failure {
  border-color: rgba(248, 113, 113, 0.42);
}

.model-probe-result__headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.model-probe-result__headline div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.model-probe-result__headline strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-probe-result__headline span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.model-probe-result__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.model-probe-result__metrics div {
  min-width: 0;
}

.model-probe-result__metrics dt {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.model-probe-result__metrics dd {
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-probe-result__message {
  margin: 0;
  line-height: 1.6;
  word-break: break-word;
}

.model-probe-result__section {
  display: grid;
  gap: 6px;
  margin-top: 14px;
}

.model-probe-result__section > span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.model-probe-result__preview {
  max-height: 140px;
  margin: 0;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.42);
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.model-probe-form__target {
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.model-probe-form__target span {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-probe-progress {
  display: grid;
  gap: 12px;
}

.model-probe-progress strong {
  color: var(--el-text-color-primary);
}

.model-probe-progress p,
.model-probe-progress small {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.model-call-summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  line-height: 1.45;
}

.model-call-summary span {
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-call-summary strong {
  margin-right: 8px;
  color: var(--app-text);
  font-weight: 600;
}
</style>
