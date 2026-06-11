<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">提示词回归</div>
        <h1 class="admin-hero__title">提示词回归测试</h1>
        <p class="admin-hero__desc">加载固定回归用例和执行结果，按用例与提示词版本触发回归运行。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-permission="'admin:agent:prompt-regression:write'"
          type="primary"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="openCaseDialog()"
        >
          新增用例
        </el-button>
        <el-button
          v-permission="'admin:agent:prompt-regression:run'"
          type="primary"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="runDialogVisible = true"
        >
          运行用例
        </el-button>
        <el-button :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="提示词类型">
            <el-input v-model.trim="query.promptType" clearable placeholder="JOB_COACH_DAILY_PLAN" style="width: 240px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px">
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

      <AppState v-if="errorMessage" type="error" title="提示词回归数据加载失败" :description="errorMessage">
        <el-button type="primary" @click="loadPage">重试</el-button>
      </AppState>

      <template v-else>
        <el-alert
          v-if="partialRegressionErrorMessage"
          class="regression-partial-alert"
          type="warning"
          show-icon
          :closable="false"
          title="部分数据加载失败"
          :description="partialRegressionErrorMessage"
        />

        <el-tabs v-model="activeTab" class="regression-tabs">
        <el-tab-pane label="用例" name="cases">
          <div class="tab-table-header">
            <div>
              <h2>回归用例</h2>
              <p>固定输入和预期结构默认收起，需要排查时再打开长内容诊断列。</p>
            </div>
            <div class="table-view-tools">
              <el-segmented v-model="caseTableSize" :options="caseTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in caseColumnOptions" :key="item.key">
                      <el-checkbox v-model="caseVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetCaseTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="table-card admin-table-card">
            <el-table v-loading="loading" :data="cases" row-key="id" :size="caseTableSize">
              <el-table-column v-if="isCaseColumnVisible('caseName')" prop="caseName" label="用例" min-width="220" show-overflow-tooltip />
              <el-table-column v-if="isCaseColumnVisible('promptType')" prop="promptType" label="提示词类型" min-width="220" show-overflow-tooltip />
              <el-table-column v-if="isCaseColumnVisible('enabled')" label="状态" width="110">
                <template #default="{ row }"><StatusTag :status="row.enabled" /></template>
              </el-table-column>
              <el-table-column v-if="isCaseColumnVisible('inputJson')" label="输入" min-width="180">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('输入内容', row.inputJson)">查看</el-button>
                </template>
              </el-table-column>
              <el-table-column v-if="isCaseColumnVisible('expectedSchemaJson')" label="预期结构" min-width="180">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('预期结构', row.expectedSchemaJson)">查看</el-button>
                </template>
              </el-table-column>
              <el-table-column v-if="isCaseColumnVisible('updatedAt')" label="更新时间" width="180">
                <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="230" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-permission="'admin:agent:prompt-regression:write'"
                    link
                    type="primary"
                    :disabled="pageActionDisabled"
                    :title="pageActionDisabledTitle"
                    @click="openCaseDialog(row)"
                  >
                    编辑
                  </el-button>
                  <el-button link type="primary" @click="viewCaseResults(row.id)">结果</el-button>
                  <el-button
                    v-permission="'admin:agent:prompt-regression:run'"
                    link
                    type="primary"
                    :disabled="pageActionDisabled"
                    :title="pageActionDisabledTitle"
                    @click="openRun(row.id)"
                  >
                    运行
                  </el-button>
                </template>
              </el-table-column>
              <template #empty>
                <AppState v-if="caseErrorMessage" type="error" title="回归用例加载失败" :description="caseErrorMessage">
                  <el-button type="primary" :loading="loading" @click="loadPage">重新加载</el-button>
                </AppState>
                <AppState v-else type="empty" :title="caseEmptyTitle" :description="caseEmptyDescription">
                  <el-button v-if="hasCaseFilters" type="primary" @click="handleReset">清空筛选</el-button>
                  <el-button v-else v-permission="'admin:agent:prompt-regression:write'" type="primary" @click="openCaseDialog()">新增用例</el-button>
                </AppState>
              </template>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="结果" name="results">
          <div class="tab-table-header">
            <div>
              <h2>运行结果</h2>
              <p>优先查看状态、分数和错误信息；输出明细默认收起，避免长结果挤压列表。</p>
            </div>
            <div class="table-view-tools">
              <el-segmented v-model="resultTableSize" :options="resultTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in resultColumnOptions" :key="item.key">
                      <el-checkbox v-model="resultVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetResultTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="table-card admin-table-card">
            <el-table v-loading="loading" :data="results" row-key="id" :size="resultTableSize">
              <el-table-column v-if="isResultColumnVisible('caseId')" prop="caseId" label="用例编号" width="110" />
              <el-table-column v-if="isResultColumnVisible('promptVersionId')" prop="promptVersionId" label="提示词版本编号" width="140" />
              <el-table-column v-if="isResultColumnVisible('status')" label="状态" width="120">
                <template #default="{ row }"><StatusTag :status="row.status" /></template>
              </el-table-column>
              <el-table-column v-if="isResultColumnVisible('score')" prop="score" label="分数" width="100" />
              <el-table-column v-if="isResultColumnVisible('errorMessage')" prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ formatRegressionError(row.errorMessage) }}</template>
              </el-table-column>
              <el-table-column v-if="isResultColumnVisible('outputJson')" label="输出" min-width="160">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('回归输出明细', row.outputJson)">查看</el-button>
                </template>
              </el-table-column>
              <el-table-column v-if="isResultColumnVisible('createdAt')" prop="createdAt" label="创建时间" width="180" />
              <template #empty>
                <AppState v-if="resultErrorMessage" type="error" title="运行结果加载失败" :description="resultErrorMessage">
                  <el-button type="primary" :loading="loading" @click="loadPage">重新加载</el-button>
                </AppState>
                <AppState v-else type="empty" :title="resultEmptyTitle" :description="resultEmptyDescription">
                  <el-button v-if="resultCaseId" type="primary" @click="clearResultFilter">查看全部结果</el-button>
                  <el-button v-else v-permission="'admin:agent:prompt-regression:run'" type="primary" @click="runDialogVisible = true">运行用例</el-button>
                </AppState>
              </template>
            </el-table>
          </div>
          <div v-if="resultCaseId" class="result-filter-note">
            当前仅展示用例编号 {{ resultCaseId }} 的结果
            <el-button link type="primary" @click="clearResultFilter">显示全部</el-button>
          </div>
        </el-tab-pane>
        </el-tabs>
      </template>
    </section>

    <el-dialog v-model="runDialogVisible" title="运行提示词回归" width="460px">
      <el-form label-position="top">
        <el-form-item label="用例编号">
          <el-input-number v-model="runForm.caseId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="提示词版本编号">
          <el-input-number v-model="runForm.promptVersionId" :min="1" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:agent:prompt-regression:run'"
          type="primary"
          :loading="running"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="runRegression"
        >
          运行
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="caseDialogVisible" :title="caseForm.id ? '编辑回归用例' : '新增回归用例'" width="760px">
      <el-form :model="caseForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="用例名称" required>
            <el-input v-model.trim="caseForm.caseName" placeholder="每日计划结构校验" />
          </el-form-item>
          <el-form-item label="提示词类型" required>
            <el-input v-model.trim="caseForm.promptType" placeholder="JOB_COACH_DAILY_PLAN" />
          </el-form-item>
        </div>
        <el-form-item label="输入内容" required>
          <el-input v-model="caseForm.inputJson" type="textarea" :rows="8" placeholder="{...}" />
        </el-form-item>
        <el-form-item label="预期结构" required>
          <el-input v-model="caseForm.expectedSchemaJson" type="textarea" :rows="8" placeholder="{...}" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="caseEnabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="caseDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:agent:prompt-regression:write'"
          type="primary"
          :loading="savingCase"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="saveCase"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="jsonDialogVisible" :title="jsonDialogTitle" width="720px">
      <el-alert
        class="json-sensitive-alert"
        type="warning"
        show-icon
        :closable="false"
        title="完整内容默认隐藏"
        description="回归输入、预期结构和输出明细可能包含提示词变量、简历/岗位样例或模型输出，默认只展示脱敏摘要。"
      />
      <div class="json-dialog-actions">
        <el-button v-if="!jsonDialogRevealed" type="primary" plain @click="revealJsonDetail">查看完整内容</el-button>
        <el-button v-else plain @click="hideJsonDetail">收起完整内容</el-button>
      </div>
      <pre class="json-preview">{{ jsonDialogContent || '--' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createPromptRegressionCaseApi,
  getPromptRegressionCasesApi,
  getPromptRegressionResultsApi,
  runPromptRegressionApi,
  updatePromptRegressionCaseApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { PromptRegressionCaseVO, PromptRegressionQuery, PromptRegressionResultVO } from '@/types/analytics'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'

type PromptCaseColumnKey = 'caseName' | 'promptType' | 'enabled' | 'inputJson' | 'expectedSchemaJson' | 'updatedAt'
type PromptResultColumnKey = 'caseId' | 'promptVersionId' | 'status' | 'score' | 'errorMessage' | 'outputJson' | 'createdAt'

const {
  tableSize: caseTableSize,
  tableSizeOptions: caseTableSizeOptions,
  columnOptions: caseColumnOptions,
  visibleColumns: caseVisibleColumns,
  isColumnVisible: isCaseColumnVisible,
  resetTableView: resetCaseTableView
} = useAdminTableView<PromptCaseColumnKey>('admin:prompt-regression:cases', [
  { key: 'caseName', label: '用例', required: true },
  { key: 'promptType', label: '提示词类型', required: true },
  { key: 'enabled', label: '状态', required: true },
  { key: 'inputJson', label: '输入内容', defaultVisible: false },
  { key: 'expectedSchemaJson', label: '预期结构', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间' }
])

const {
  tableSize: resultTableSize,
  tableSizeOptions: resultTableSizeOptions,
  columnOptions: resultColumnOptions,
  visibleColumns: resultVisibleColumns,
  isColumnVisible: isResultColumnVisible,
  resetTableView: resetResultTableView
} = useAdminTableView<PromptResultColumnKey>('admin:prompt-regression:results', [
  { key: 'caseId', label: '用例编号', required: true },
  { key: 'promptVersionId', label: '提示词版本编号', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'score', label: '分数', required: true },
  { key: 'errorMessage', label: '错误信息', required: true },
  { key: 'outputJson', label: '输出明细', defaultVisible: false },
  { key: 'createdAt', label: '创建时间' }
])

const loading = ref(false)
const running = ref(false)
const errorMessage = ref('')
const caseErrorMessage = ref('')
const resultErrorMessage = ref('')
const activeTab = ref('cases')
const cases = ref<PromptRegressionCaseVO[]>([])
const results = ref<PromptRegressionResultVO[]>([])
const resultCaseId = ref<number>()
const runDialogVisible = ref(false)
const caseDialogVisible = ref(false)
const savingCase = ref(false)
const jsonDialogVisible = ref(false)
const jsonDialogTitle = ref('')
const jsonDialogContent = ref('')
const jsonDialogRawContent = ref('')
const jsonDialogRevealed = ref(false)
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const query = reactive<PromptRegressionQuery>({
  pageNo: 1,
  pageSize: 20,
  promptType: '',
  enabled: ''
})

const runForm = reactive({
  caseId: undefined as number | undefined,
  promptVersionId: undefined as number | undefined
})

const caseForm = reactive({
  id: undefined as number | undefined,
  caseName: '',
  promptType: '',
  inputJson: '',
  expectedSchemaJson: '',
  enabled: 1
})

const caseEnabled = computed({
  get: () => caseForm.enabled === 1,
  set: (value: boolean) => {
    caseForm.enabled = value ? 1 : 0
  }
})
const hasCaseFilters = computed(() => Boolean(query.promptType || query.enabled !== ''))
const hasPageError = computed(() => Boolean(errorMessage.value || caseErrorMessage.value || resultErrorMessage.value))
const pageActionDisabled = computed(() => hasPageError.value || isAdminMobileReadonly.value)
const pageActionDisabledTitle = computed(() =>
  mobileReadonlyTitle(hasPageError.value ? '当前数据加载失败，请先重试加载，确认用例和结果状态后再执行写操作。' : undefined)
)
const partialRegressionErrorMessage = computed(() => {
  const items = [
    caseErrorMessage.value ? `回归用例：${caseErrorMessage.value}` : '',
    resultErrorMessage.value ? `运行结果：${resultErrorMessage.value}` : ''
  ].filter(Boolean)
  return items.length ? `${items.join('；')}。页面会继续展示已成功返回的数据，建议重新加载后再执行写操作。` : ''
})
const caseEmptyTitle = computed(() =>
  hasCaseFilters.value ? '当前筛选没有回归用例' : '暂无提示词回归用例'
)
const caseEmptyDescription = computed(() =>
  hasCaseFilters.value
    ? '当前筛选条件下没有回归用例。可以清空提示词类型或状态筛选后重新查看。'
    : '提示词回归需要固定输入和预期结构。请先新增一条可复现用例，再用于发布前验证。'
)
const resultEmptyTitle = computed(() =>
  resultCaseId.value ? `用例编号 ${resultCaseId.value} 暂无回归结果` : '暂无提示词回归结果'
)
const resultEmptyDescription = computed(() =>
  resultCaseId.value
    ? `当前只查看用例编号 ${resultCaseId.value}。如果近期运行过该用例，请刷新或查看全部结果确认是否被用例筛选限制。`
    : '运行回归用例后，这里会展示分数、错误信息和输出摘要，帮助判断提示词发布是否可靠。'
)

const sensitiveKeyPattern = /(prompt|input|output|resume|jd|jobDescription|job_description|content|answer|question|mobile|phone|email|idCard|token|secret|password|raw)/i

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '提示词回归数据加载失败，请稍后重试。')
  }
  return '提示词回归数据加载失败，请稍后重试。'
}

const redactSensitiveText = (value: string) =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱已隐藏]')
    .replace(/1[3-9]\d{9}/g, '[手机号已隐藏]')
    .replace(/\b\d{15}(\d{2}[0-9Xx])?\b/g, '[证件号已隐藏]')

const maskJsonValue = (value: unknown, key = '', depth = 0): unknown => {
  if (value == null) return value
  if (sensitiveKeyPattern.test(key)) return '[完整内容已隐藏]'
  if (typeof value === 'string') {
    const text = redactSensitiveText(value)
    return text.length > 80 ? `${text.slice(0, 80)}...` : text
  }
  if (typeof value !== 'object') return value
  if (depth >= 2) return '[下级内容已隐藏]'
  if (Array.isArray(value)) {
    return value.slice(0, 5).map((item, index) => maskJsonValue(item, `${key}[${index}]`, depth + 1))
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([itemKey, itemValue]) => [
      itemKey,
      maskJsonValue(itemValue, itemKey, depth + 1)
    ])
  )
}

const maskJsonContent = (content?: string) => {
  if (!content) return ''
  try {
    return JSON.stringify(maskJsonValue(JSON.parse(content)), null, 2)
  } catch {
    const text = redactSensitiveText(content)
    return text.length > 240 ? `${text.slice(0, 240)}...` : text
  }
}

const formatRegressionError = (message?: string) => {
  if (!message) return '--'
  if (/JSON|schema|exception|stack|raw|prompt|response|deserialize|serialize|字段|原始/i.test(message)) {
    return '回归运行未通过结构校验，完整诊断请在输出明细中按权限查看。'
  }
  return redactSensitiveText(message)
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  caseErrorMessage.value = ''
  resultErrorMessage.value = ''
  try {
    const [caseResult, resultResult] = await Promise.allSettled([
      getPromptRegressionCasesApi(query),
      getPromptRegressionResultsApi({ pageNo: 1, pageSize: 20, caseId: resultCaseId.value })
    ])
    if (caseResult.status === 'fulfilled') {
      cases.value = caseResult.value.records || []
    } else {
      cases.value = []
      caseErrorMessage.value = getErrorMessage(caseResult.reason)
    }
    if (resultResult.status === 'fulfilled') {
      results.value = resultResult.value.records || []
    } else {
      results.value = []
      resultErrorMessage.value = getErrorMessage(resultResult.reason)
    }
    if (caseErrorMessage.value && resultErrorMessage.value) {
      errorMessage.value = `回归用例和运行结果都加载失败。${partialRegressionErrorMessage.value}`
    }
  } catch (error) {
    cases.value = []
    results.value = []
    caseErrorMessage.value = ''
    resultErrorMessage.value = ''
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  loadPage()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 20,
    promptType: '',
    enabled: ''
  })
  loadPage()
}

const openRun = (caseId: number) => {
  runForm.caseId = caseId
  runForm.promptVersionId = undefined
  runDialogVisible.value = true
}

const viewCaseResults = async (caseId: number) => {
  resultCaseId.value = caseId
  activeTab.value = 'results'
  await loadPage()
}

const clearResultFilter = async () => {
  resultCaseId.value = undefined
  await loadPage()
}

const openCaseDialog = (row?: PromptRegressionCaseVO) => {
  Object.assign(caseForm, {
    id: row?.id,
    caseName: row?.caseName || '',
    promptType: row?.promptType || '',
    inputJson: row?.inputJson || '',
    expectedSchemaJson: row?.expectedSchemaJson || '',
    enabled: row?.enabled ?? 1
  })
  caseDialogVisible.value = true
}

const openJsonDetail = (title: string, content?: string) => {
  jsonDialogTitle.value = title
  jsonDialogRawContent.value = content || ''
  jsonDialogContent.value = maskJsonContent(content)
  jsonDialogRevealed.value = false
  jsonDialogVisible.value = true
}

const revealJsonDetail = async () => {
  const confirmed = await confirmDangerActionPreview({
    title: `${jsonDialogTitle.value || '回归明细'}敏感访问预览`,
    action: '查看提示词回归完整 JSON 明细',
    target: jsonDialogTitle.value || '当前回归明细',
    impact: '完整 JSON 可能包含提示词变量、测试样例、岗位描述、模型输出或失败诊断细节，查看后需要按敏感信息处理规范使用。',
    rollback: '查看行为无法撤销；如果发现内容包含真实用户敏感信息，应按内部审计和清理流程处理。',
    audit: '本次查看需要二次确认，后续如接入后端原始内容接口也应写入敏感访问审计。',
    tips: ['仅在排查提示词质量或回归失败原因时查看。', '不要把完整 JSON 复制到第三方工具或无权限渠道。'],
    confirmButtonText: '确认查看'
  })
  if (!confirmed) return
  jsonDialogContent.value = jsonDialogRawContent.value || ''
  jsonDialogRevealed.value = true
}

const hideJsonDetail = () => {
  jsonDialogContent.value = maskJsonContent(jsonDialogRawContent.value)
  jsonDialogRevealed.value = false
}

const validateJson = (value: string, label: string) => {
  if (!value.trim()) {
    ElMessage.warning(`请填写${label}`)
    return false
  }
  try {
    JSON.parse(value)
    return true
  } catch {
    ElMessage.warning(`${label}必须是合法对象格式`)
    return false
  }
}

const saveCase = async () => {
  if (!guardAdminMobileWrite()) return
  if (!caseForm.caseName.trim() || !caseForm.promptType.trim()) {
    ElMessage.warning('请填写用例名称和提示词类型')
    return
  }
  if (!validateJson(caseForm.inputJson, '输入内容') || !validateJson(caseForm.expectedSchemaJson, '预期结构')) {
    return
  }
  const actionLabel = caseForm.id ? '更新提示词回归用例' : '新增提示词回归用例'
  const confirmed = await confirmDangerActionPreview({
    title: '提示词回归用例保存预览',
    action: `${actionLabel}「${caseForm.caseName.trim()}」`,
    target: `提示词类型：${caseForm.promptType.trim()}；状态：${caseForm.enabled === 1 ? '启用' : '禁用'}${
      caseForm.id ? `；用例编号：${caseForm.id}` : ''
    }`,
    impact: '保存后会影响后续提示词回归运行的输入内容、预期结构和启用范围，可能改变 AI 质量验收结果。',
    rollback: '保存后无法自动恢复旧输入或旧预期结构；如误改，需要根据操作记录或历史备份手动还原用例内容。',
    audit: '该操作受 admin:agent:prompt-regression:write 权限保护，系统会记录操作人和变更时间，便于追踪回归配置变更。',
    tips: [
      '确认输入内容不包含真实用户敏感信息或临时调试字段。',
      '确认预期结构与当前提示词输出约束一致，避免误判回归通过或失败。',
      '确认启用状态符合本次回归范围。'
    ],
    confirmButtonText: '确认保存用例'
  })
  if (!confirmed) return
  savingCase.value = true
  try {
    const payload = {
      caseName: caseForm.caseName.trim(),
      promptType: caseForm.promptType.trim(),
      inputJson: caseForm.inputJson,
      expectedSchemaJson: caseForm.expectedSchemaJson,
      enabled: caseForm.enabled
    }
    if (caseForm.id) {
      await updatePromptRegressionCaseApi(caseForm.id, payload)
    } else {
      await createPromptRegressionCaseApi(payload)
    }
    ElMessage.success('回归用例已保存')
    caseDialogVisible.value = false
    await loadPage()
  } finally {
    savingCase.value = false
  }
}

const runRegression = async () => {
  if (!guardAdminMobileWrite()) return
  if (!runForm.caseId || !runForm.promptVersionId) {
    ElMessage.warning('请填写用例编号和提示词版本编号')
    return
  }
  const caseName = cases.value.find((item) => item.id === runForm.caseId)?.caseName
  const confirmed = await confirmDangerActionPreview({
    title: '提示词回归运行预览',
    action: '运行提示词回归用例',
    target: `用例编号：${runForm.caseId}${caseName ? `（${caseName}）` : ''}；提示词版本编号：${runForm.promptVersionId}`,
    impact: '运行后会写入一条新的回归结果记录，并可能触发提示词解析、结构校验或后续 AI 回归执行逻辑。',
    rollback: '回归结果会作为历史诊断记录保留，无法自动撤销；如误运行，需要在结果列表和操作日志中标记排查。',
    audit: '该操作受 admin:agent:prompt-regression:run 权限保护，系统会保留回归结果，便于按用例、版本和时间追踪。',
    tips: [
      '确认用例输入内容与预期结构已经保存且可复现。',
      '确认选择的是要验证的提示词版本，避免把旧版本结果误当作当前质量。'
    ],
    confirmButtonText: '确认运行回归'
  })
  if (!confirmed) return
  running.value = true
  try {
    await runPromptRegressionApi({
      caseId: runForm.caseId,
      promptVersionId: runForm.promptVersionId
    })
    runDialogVisible.value = false
    ElMessage.success('回归运行请求已提交')
    activeTab.value = 'results'
    await loadPage()
  } finally {
    running.value = false
  }
}

onMounted(loadPage)
</script>

<style scoped lang="scss">
.regression-tabs {
  padding: 0 20px 20px;
}

.tab-table-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0 16px;
}

.tab-table-header h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
}

.tab-table-header p {
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

.json-sensitive-alert {
  margin-bottom: 12px;
}

.json-dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

:global(.column-config-menu) {
  min-width: 180px;
  padding: 8px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.json-preview {
  max-height: 520px;
  overflow: auto;
  margin: 0;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-filter-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .tab-table-header {
    flex-direction: column;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
