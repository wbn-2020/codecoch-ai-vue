<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>智能生成监控</span>
        </div>
        <h1 class="admin-hero__title">智能生成监控</h1>
        <p class="admin-hero__desc">
          查询智能生成场景、模型、消耗、耗时、状态、失败原因和处理链路，便于把一次操作和对应生成过程串起来定位。
        </p>
      </div>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>生成次数</span>
        <strong>{{ total }}</strong>
        <small>按当前查询条件统计</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页失败</span>
        <strong>{{ failedCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页消耗</span>
        <strong>{{ tokenTotal }}</strong>
        <small>仅统计返回消耗明细的记录</small>
      </article>
      <article class="admin-insight-card">
        <span>模型类型</span>
        <strong>{{ modelCount }}</strong>
        <small>仅统计当前页模型名称</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>生成明细</h2>
          <p>支持按用户、场景、模型、状态和追踪号定位智能生成记录。</p>
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
          <el-form-item label="用户编号">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="场景">
            <el-select v-model="query.scene" clearable placeholder="全部场景" style="width: 220px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联记录">
            <el-input v-model.trim="query.businessId" clearable placeholder="输入关联记录" />
          </el-form-item>
          <el-form-item label="模型">
            <el-input v-model.trim="query.modelName" clearable placeholder="模型名称" />
          </el-form-item>
          <el-form-item label="追踪号">
            <el-input v-model.trim="query.traceId" clearable placeholder="输入追踪号" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="成功" :value="1" />
              <el-option label="失败" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        v-if="highlightedAiCallLogId || directLogError"
        class="direct-log-alert"
        :type="directLogError ? 'warning' : 'info'"
        :title="directLogError || `已定位生成记录 ${highlightedAiCallLogId}`"
        :closable="false"
        show-icon
      >
        <template #default>
          <span v-if="!directLogError">详情弹窗已打开；关闭后仍可继续筛选列表。</span>
        </template>
      </el-alert>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="生成时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('modelName')" prop="modelName" label="模型" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('traceId')" label="追踪号" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ displayAiTraceId(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('scene')" label="场景 / 类型" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ getSceneLabel(row.scene || row.callType) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('tokens')" label="消耗" width="110">
            <template #default="{ row }">{{ row.totalTokens ?? '-' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('latency')" label="耗时" width="110">
            <template #default="{ row }">{{ row.elapsedMs ?? row.latencyMs ?? '-' }} ms</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="110">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('failure')" label="失败原因" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ translateFailureReason(row.failReason || row.errorMessage) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('preview')" label="摘要 / 脱敏预览" min-width="320" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="log-preview">
                <strong>{{ displayAiSummary(row) }}</strong>
                <small>{{ displayAiMaskedPreview(row) }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="logError ? 'error' : 'empty'"
              :title="logError ? '智能生成记录加载失败' : logEmptyTitle"
              :description="logError || logEmptyDescription"
            >
              <el-button type="primary" @click="logError ? fetchLogs() : handleLogEmptyAction()">
                {{ logError ? '重新加载' : logEmptyActionLabel }}
              </el-button>
            </AppState>
          </template>
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
          @change="fetchLogs"
        />
      </div>
    </section>

    <el-dialog v-model="drawerVisible" title="生成详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-loading="detailLoading" class="admin-detail-dialog__body log-detail">
        <AppState
          v-if="detailError"
          type="error"
          title="生成详情加载失败"
          :description="detailError"
        >
          <el-button type="primary" :loading="detailLoading" :disabled="!detailId" @click="retryOpenDetail">重新加载详情</el-button>
          <el-button :loading="loading" @click="fetchLogs">刷新记录列表</el-button>
        </AppState>
        <AppState
          v-else-if="!detail"
          type="empty"
          title="生成详情暂未加载"
          description="还没有可展示的生成详情。请从列表打开记录，或刷新列表后重新进入详情。"
        >
          <el-button type="primary" :loading="loading" @click="fetchLogs">刷新记录列表</el-button>
        </AppState>
        <template v-else>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="生成记录">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="追踪号">{{ detail.traceId || displayAiTraceId(detail) }}</el-descriptions-item>
          <el-descriptions-item label="处理场景">{{ getSceneLabel(detail.scene || detail.callType) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">{{ detail.modelName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联业务">{{ detail.businessId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="调用资源">{{ detail.totalTokens ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ detail.elapsedMs ?? detail.latencyMs ?? '-' }} ms</el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ translateFailureReason(detail.failReason || detail.errorMessage) }}</el-descriptions-item>
          <el-descriptions-item label="摘要">{{ displayAiSummary(detail) }}</el-descriptions-item>
          <el-descriptions-item label="脱敏预览">{{ displayAiMaskedPreview(detail) }}</el-descriptions-item>
          <el-descriptions-item label="敏感诊断内容">
            <span>{{ detail.rawFieldsAvailable ? '已记录，需按权限申请查看' : '未记录敏感诊断内容' }}</span>
          </el-descriptions-item>
        </el-descriptions>
        <el-collapse
          v-if="detail.requestPromptHash || detail.requestBodyHash || detail.responseContentHash || detail.responseBodyHash"
          class="log-diagnostic-collapse"
        >
          <el-collapse-item title="技术诊断（内容指纹，按需展开）" name="content-fingerprint">
            <div class="log-diagnostic-list">
              <span v-if="detail.requestPromptHash">输入上下文指纹 {{ detail.requestPromptHash }}</span>
              <span v-if="detail.requestBodyHash">请求内容指纹 {{ detail.requestBodyHash }}</span>
              <span v-if="detail.responseContentHash">模型返回指纹 {{ detail.responseContentHash }}</span>
              <span v-if="detail.responseBodyHash">响应内容指纹 {{ detail.responseBodyHash }}</span>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-alert
          class="sensitive-detail-alert"
          type="warning"
          show-icon
          :closable="false"
          title="提示词、变量和响应内容可能包含简历、面试回答或内部定位变量，默认隐藏。"
        />
        <div class="raw-detail-toggle">
          <span>敏感诊断内容</span>
          <div class="raw-detail-actions">
            <el-button
              v-if="!rawDetailVisible"
              type="warning"
              plain
              :loading="rawDetailLoading"
              :disabled="isAdminMobileReadonly || !canViewRawLog || !detail.rawFieldsAvailable"
              :title="mobileReadonlyTitle(!canViewRawLog ? '当前账号没有 AI 敏感诊断内容查看权限' : !detail.rawFieldsAvailable ? '未记录敏感诊断内容' : undefined)"
              @click="loadRawDetail"
            >
              申请查看敏感诊断内容
            </el-button>
            <el-button v-else @click="rawDetailVisible = false">隐藏敏感诊断内容</el-button>
          </div>
        </div>
        <p v-if="!canViewRawLog && detail.rawFieldsAvailable" class="raw-detail-hint">当前账号没有 AI 敏感诊断内容查看权限。</p>
        <p v-else-if="detail.rawFieldsAvailable && !rawDetailVisible" class="raw-detail-hint">
          查看敏感诊断内容前需要再次确认访问原因，系统会写入操作审计。
        </p>
        <template v-if="rawDetailVisible">
          <h3>输入上下文（敏感）</h3>
          <pre>{{ detail.requestPrompt || detail.promptContent || detail.requestParams || '-' }}</pre>
          <h3>请求变量（敏感）</h3>
          <pre>{{ detail.inputVariablesJson || detail.requestBody || '-' }}</pre>
          <h3>模型返回内容（敏感）</h3>
          <pre>{{ detail.responseContent || detail.responseBody || '-' }}</pre>
        </template>
        </template>
      </div>
      <template #footer>
        <div class="admin-detail-dialog__footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Activity } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getAdminAiLogDetailApi, getAdminAiLogRawApi, getAdminAiLogsApi } from '@/api/aiAdmin'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { AI_SCENE } from '@/constants/enums'
import { useAuthStore } from '@/stores/auth'
import type { AiCallLogQueryDTO, AiCallLogVO, AiScene } from '@/types/ai'
import { translateFailureReason } from '@/utils/adminDisplay'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const sceneOptions = [
  { label: 'AI 题目生成', value: 'AI_QUESTION_GENERATE' },
  { label: '八股文提问', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分', value: AI_SCENE.INTERVIEW_ANSWER_EVALUATE },
  { label: '动态追问', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]

const loading = ref(false)
const drawerVisible = ref(false)
const logs = ref<AiCallLogVO[]>([])
const detail = ref<AiCallLogVO | null>(null)
const total = ref(0)
const detailLoading = ref(false)
const detailError = ref('')
const detailId = ref<number | null>(null)
const rawDetailVisible = ref(false)
const rawDetailLoading = ref(false)
const logError = ref('')
const highlightedAiCallLogId = ref<number | null>(null)
const directLogError = ref('')
const authStore = useAuthStore()
const route = useRoute()
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

type AiLogColumnKey =
  | 'createdAt'
  | 'modelName'
  | 'traceId'
  | 'scene'
  | 'tokens'
  | 'latency'
  | 'status'
  | 'failure'
  | 'preview'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AiLogColumnKey>('admin:ai-call-log', [
  { key: 'createdAt', label: '生成时间', required: true },
  { key: 'modelName', label: '模型' },
  { key: 'traceId', label: '追踪号' },
  { key: 'scene', label: '场景 / 类型' },
  { key: 'tokens', label: '消耗' },
  { key: 'latency', label: '耗时' },
  { key: 'status', label: '状态', required: true },
  { key: 'failure', label: '失败原因' },
  { key: 'preview', label: '摘要 / 脱敏预览' }
])

const query = reactive<AiCallLogQueryDTO>({
  userId: undefined,
  scene: '',
  businessId: '',
  modelName: '',
  traceId: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const failedCount = computed(() =>
  logs.value.filter((item) => String(item.status) === 'FAILED' || String(item.status) === '0').length
)
const tokenTotal = computed(() => logs.value.reduce((sum, item) => sum + (item.totalTokens || 0), 0))
const modelCount = computed(() => new Set(logs.value.map((item) => item.modelName).filter(Boolean)).size)
const canViewRawLog = computed(() => authStore.hasPermission('admin:ai:log:raw:view'))
const hasLogFilters = computed(() =>
  Boolean(query.userId || query.scene || query.businessId || query.modelName || query.traceId || query.status !== '')
)
const logEmptyTitle = computed(() =>
  hasLogFilters.value ? '没有匹配当前筛选条件的智能生成记录' : '暂无智能生成记录'
)
const logEmptyDescription = computed(() =>
  hasLogFilters.value
    ? '请调整场景、模型、状态或追踪号，或清空筛选后查看全部生成记录。'
    : '当前环境还没有智能生成记录。执行一次题目生成、简历匹配或面试报告生成后，可回到这里查看追踪号、失败原因和脱敏摘要。'
)
const logEmptyActionLabel = computed(() => (hasLogFilters.value ? '清空筛选' : '刷新列表'))

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || (value ? '场景待确认' : '-')

const compactText = (value?: string, maxLength = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const maskSensitiveText = (value?: string) =>
  compactText(value)
    .replace(/([\w.+-]{2})[\w.+-]*@([\w-]+\.[\w.-]+)/g, '$1***@$2')
    .replace(/(1[3-9]\d)\d{4}(\d{4})/g, '$1****$2')
    .replace(/(api[_-]?key|token|password|secret)["'=:\s]+([^,\s}"']+)/gi, '$1=***')

const displayAiSummary = (row: AiCallLogVO) =>
  row.summary ||
  row.callSummary ||
  `${getSceneLabel(row.scene || row.callType)} · ${row.businessId ? `业务 ${row.businessId}` : displayAiTraceId(row)}`

const displayAiTraceId = (row: AiCallLogVO) =>
  row.traceIdShort || row.shortTraceId || compactText(row.traceId, 12) || '-'

const displayAiMaskedPreview = (row: AiCallLogVO) => {
  const preview =
  row.maskedPreview ||
  row.inputVariablesPreview ||
  row.requestBodyHash ||
  row.requestPromptHash ||
  row.responseContentHash ||
  row.responseBodyHash
  return preview ? maskSensitiveText(preview) : '敏感诊断内容默认隐藏'
}

const fetchLogs = async () => {
  loading.value = true
  logError.value = ''
  try {
    const result = await getAdminAiLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    logs.value = []
    total.value = 0
    logError.value = getErrorMessage(error, '暂时无法获取智能生成记录，请稍后重试或检查服务状态。')
  } finally {
    loading.value = false
  }
}

const openDetailById = async (id: number, showError = true) => {
  drawerVisible.value = true
  detailId.value = id
  detail.value = null
  detailError.value = ''
  rawDetailVisible.value = false
  detailLoading.value = true
  try {
    const result = await getAdminAiLogDetailApi(id)
    if (detailId.value === id) {
      detail.value = result
    }
    return true
  } catch (error) {
    const message = getErrorMessage(error, '生成详情加载失败，请确认权限或稍后重试。')
    if (detailId.value === id) {
      detailError.value = message
    }
    if (showError) {
      ElMessage.error(message)
    }
    return false
  } finally {
    if (detailId.value === id) {
      detailLoading.value = false
    }
  }
}

const openDetail = async (row: AiCallLogVO) => {
  await openDetailById(row.id)
}

const retryOpenDetail = () => {
  if (detailId.value === null) return
  void openDetailById(detailId.value)
}

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

const parseAiLogStatusQuery = (value: string) => {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return ''
  if (['FAILED', 'FAIL', 'ERROR', '0'].includes(normalized)) return 0
  if (['SUCCESS', 'SUCCEEDED', '1'].includes(normalized)) return 1
  return ''
}

const getDirectAiLogId = () => {
  const value = firstQueryString(route.query.aiCallLogId) || firstQueryString(route.query.id)
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

const openDirectAiLogFromRoute = async () => {
  const aiCallLogId = getDirectAiLogId()
  if (!aiCallLogId) return
  highlightedAiCallLogId.value = aiCallLogId
  directLogError.value = ''
  const opened = await openDetailById(aiCallLogId, false)
  if (!opened) {
    directLogError.value = `未能打开智能生成记录 ${aiCallLogId}，请检查权限或记录是否存在。`
  }
}

const applyRouteFilters = () => {
  const traceId = firstQueryString(route.query.traceId)
  const status = firstQueryString(route.query.status)
  const businessId = firstQueryString(route.query.businessId || route.query.bizId)
  const source = firstQueryString(route.query.source)
  if (!traceId && !status && !businessId) {
    if (!getDirectAiLogId()) {
      highlightedAiCallLogId.value = null
      directLogError.value = ''
    }
    return false
  }
  Object.assign(query, {
    traceId,
    status: parseAiLogStatusQuery(status),
    businessId,
    pageNo: 1
  })
  if (source === 'async-task' && traceId) {
    highlightedAiCallLogId.value = null
    directLogError.value = `已按异步任务追踪号 ${compactText(traceId, 18)} 筛选智能生成记录。`
  } else if (source === 'request-error' && traceId) {
    highlightedAiCallLogId.value = null
    directLogError.value = `已按请求异常追踪号 ${compactText(traceId, 18)} 筛选智能生成记录。`
  }
  return true
}

const handleSearch = () => {
  query.pageNo = 1
  highlightedAiCallLogId.value = null
  directLogError.value = ''
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, {
    userId: undefined,
    scene: '',
    businessId: '',
    modelName: '',
    traceId: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  highlightedAiCallLogId.value = null
  directLogError.value = ''
  fetchLogs()
}

const handleLogEmptyAction = () => {
  if (hasLogFilters.value) {
    handleReset()
    return
  }
  fetchLogs()
}

const loadRawDetail = async () => {
  if (!guardAdminMobileWrite()) return
  if (!detail.value?.id || !canViewRawLog.value) return
  const confirmed = await confirmDangerActionPreview({
    title: 'AI 敏感诊断内容访问预览',
    action: '查看智能生成记录中的输入上下文、请求变量和模型返回内容',
    target: `运行记录：${detail.value.id}；场景：${getSceneLabel(detail.value.scene || detail.value.callType)}；追踪号：${detail.value.traceId || '-'}`,
    impact: '敏感诊断内容可能包含简历、面试回答、岗位描述、调试变量或模型输出细节，查看后需要按敏感信息处理规范使用。',
    rollback: '查看行为无法撤销；若误看或误传播，需要结合审计记录和内部流程处理。',
    audit: '系统会记录访问人、运行记录、查看原因、时间和敏感访问确认标记。',
    tips: ['仅在处理用户反馈、失败任务或合规审计时查看。', '不要把敏感生成内容复制到第三方工具或无权限渠道。'],
    confirmButtonText: '继续填写原因'
  })
  if (!confirmed) return
  let accessReason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      '输入上下文、请求变量和模型返回内容可能包含简历、面试回答、岗位描述或内部定位变量。请填写本次查看原因，系统会记录到操作审计。',
      '确认查看 AI 敏感诊断内容',
      {
        confirmButtonText: '确认查看',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：定位用户反馈的简历匹配失败',
        inputType: 'textarea',
        inputValidator: (value) => {
          const text = String(value || '').trim()
          if (!text) return '请填写访问原因'
          if (text.length > 300) return '访问原因不能超过 300 个字符'
          return true
        }
      }
    )
    accessReason = String(value || '').trim()
  } catch {
    return
  }

  rawDetailLoading.value = true
  try {
    detail.value = await getAdminAiLogRawApi(detail.value.id, {
      accessReason,
      confirmSensitiveAccess: true
    })
    rawDetailVisible.value = true
    ElMessage.success('敏感诊断内容已按权限加载，访问原因已写入审计')
  } catch (error) {
    rawDetailVisible.value = false
    ElMessage.error(getErrorMessage(error, '没有权限或敏感诊断内容加载失败，请确认权限或稍后重试。'))
  } finally {
    rawDetailLoading.value = false
  }
}

onMounted(async () => {
  applyRouteFilters()
  await fetchLogs()
  await openDirectAiLogFromRoute()
})

watch(
  () => [route.query.aiCallLogId, route.query.id, route.query.traceId, route.query.status, route.query.businessId, route.query.bizId, route.query.source],
  () => {
    if (applyRouteFilters()) {
      void fetchLogs()
    }
    void openDirectAiLogFromRoute()
  }
)
</script>

<style scoped lang="scss">
.table-view-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.direct-log-alert {
  margin: 12px 0;
}

:global(.column-config-menu) {
  min-width: 180px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.log-preview {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--app-text);
    font-weight: 600;
  }

  small {
    color: var(--app-text-muted);
  }
}

.admin-detail-dialog__body {
  overflow: auto;
  max-height: min(72vh, 720px);
  padding-right: 2px;
}

.admin-detail-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

.sensitive-detail-alert {
  margin-top: 18px;
}

.log-diagnostic-collapse {
  margin-top: 12px;
}

.log-diagnostic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.log-diagnostic-list span {
  max-width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.raw-detail-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0 0;
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 8px;
  background: rgba(120, 53, 15, 0.16);
}

.raw-detail-toggle span {
  color: var(--app-text);
  font-weight: 600;
}

.raw-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.raw-detail-hint {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.log-detail {
  h3 {
    margin: 20px 0 10px;
    font-size: 16px;
  }

  pre {
    overflow: auto;
    max-height: 260px;
    margin: 0;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 8px;
    background: #0f172a;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
