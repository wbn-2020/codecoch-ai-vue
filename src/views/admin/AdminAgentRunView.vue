<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>生成可观测</span>
        </div>
        <h1 class="admin-hero__title">生成运行记录</h1>
        <p class="admin-hero__desc">查询智能教练生成计划的运行状态、触发方式、模型、耗时和错误信息。</p>
      </div>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>运行总数</span>
        <strong>{{ total }}</strong>
          <small>当前运行记录总数</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页成功</span>
        <strong>{{ successCount }}</strong>
        <small>仅统计当前页</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页失败</span>
        <strong>{{ failedCount }}</strong>
        <small>仅统计当前页</small>
      </article>
      <article class="admin-insight-card">
        <span>平均耗时</span>
        <strong>{{ avgDuration }} ms</strong>
        <small>仅统计当前页</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>运行明细</h2>
          <p>按用户、状态、触发方式和时间范围筛选生成运行记录。</p>
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
          <el-form-item label="生成类型">
            <el-input v-model.trim="query.agentType" clearable placeholder="输入生成类型" style="width: 160px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
              <el-option v-for="item in runStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="触发">
            <el-select v-model="query.triggerType" clearable placeholder="全部" style="width: 130px">
              <el-option label="手动" value="MANUAL" />
              <el-option label="自动" value="AUTO" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间">
            <el-date-picker v-model="timeRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" start-placeholder="开始时间" end-placeholder="结束时间" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="errorMessage ? [] : runs" row-key="id" :size="tableSize">
            <el-table-column v-if="isColumnVisible('id')" prop="id" label="运行编号" width="100" />
            <el-table-column v-if="isColumnVisible('userId')" prop="userId" label="用户编号" width="100" />
            <el-table-column v-if="isColumnVisible('agentType')" prop="agentType" label="生成类型" min-width="130" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('targetJobTitle')" prop="targetJobTitle" label="目标岗位" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('status')" label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :map="runStatusMap" /></template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('triggerType')" prop="triggerType" label="触发" width="100" />
            <el-table-column v-if="isColumnVisible('modelName')" prop="modelName" label="模型" min-width="140" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('durationMs')" label="耗时" width="110">
              <template #default="{ row }">{{ row.durationMs ?? '--' }} ms</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('errorMessage')" label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ displayAgentError(row) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
            <el-table-column v-if="isColumnVisible('traceId')" prop="traceId" label="追踪号" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('aiCallLogId')" label="生成记录编号" width="120">
              <template #default="{ row }">{{ row.aiCallLogId ?? '--' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRunDetail(row.id)">详情</el-button>
              </template>
            </el-table-column>
          <template #empty>
            <AppState
              :type="errorMessage ? 'error' : 'empty'"
              :title="errorMessage ? '运行记录加载失败' : runEmptyTitle"
              :description="errorMessage || runEmptyDescription"
            >
              <el-button v-if="errorMessage" type="primary" @click="fetchRuns">重试</el-button>
              <el-button v-else-if="hasRunFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else @click="fetchRuns">刷新</el-button>
            </AppState>
          </template>
        </el-table>
      </div>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchRuns"
        />
      </div>
    </section>

    <el-dialog v-model="detailVisible" title="生成运行详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-loading="detailLoading" class="admin-detail-dialog__body run-detail-dialog">
        <AppState v-if="detailError" type="error" title="运行详情加载失败" :description="detailError">
          <el-button type="primary" @click="detailId && openRunDetail(detailId)">重试</el-button>
        </AppState>
        <template v-else-if="detail">
          <div class="run-detail-head">
            <div>
              <span>运行编号 {{ detail.id }}</span>
              <h3>{{ detail.targetJobTitle || detail.agentType || '智能教练生成计划' }}</h3>
            </div>
            <StatusTag :status="detail.status" :map="runStatusMap" />
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户编号">{{ detail.userId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ detail.username || '--' }}</el-descriptions-item>
            <el-descriptions-item label="生成类型">{{ detail.agentType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="触发方式">{{ detail.triggerType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="提示词类型">{{ detail.promptType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="提示词版本">{{ detail.promptVersionId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="模型">{{ detail.modelName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="生成记录编号">{{ detail.aiCallLogId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="耗时">{{ detail.durationMs ?? '--' }} ms</el-descriptions-item>
            <el-descriptions-item label="追踪号">{{ detail.traceId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="错误码">{{ detail.errorCode || '--' }}</el-descriptions-item>
            <el-descriptions-item label="错误信息">{{ displayAgentError(detail) }}</el-descriptions-item>
          </el-descriptions>

          <el-alert
            v-if="detail.errorCode || detail.errorMessage"
            class="detail-section"
            type="warning"
            show-icon
            :closable="false"
            :title="agentErrorInfo(detail).title"
            :description="agentErrorInfo(detail).action"
          />

          <div class="detail-section">
            <h4>生成任务</h4>
            <el-table :data="detail.tasks || []" row-key="id" :size="tableSize">
              <el-table-column prop="title" label="任务" min-width="220" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="110">
                <template #default="{ row }"><StatusTag :status="row.status" :map="taskStatusMap" /></template>
              </el-table-column>
              <el-table-column label="优先级" width="100">
                <template #default="{ row }">{{ priorityLabel(row.priority) }}</template>
              </el-table-column>
              <el-table-column prop="dueDate" label="日期" width="120" />
              <template #empty>
                <AppState
                  type="empty"
                  title="本次运行没有生成任务"
                  description="如果运行状态已失败，请优先查看上方失败原因和脱敏诊断；如果任务仍在生成中，可以刷新详情确认任务是否已记录。"
                >
                  <el-button :loading="detailLoading" :disabled="!detailId" @click="detailId && openRunDetail(detailId)">刷新详情</el-button>
                </AppState>
              </template>
            </el-table>
          </div>

          <div v-if="canViewAgentDiagnostics" class="detail-section raw-detail-panel">
            <div class="raw-detail-panel__head">
              <div>
                <h4>敏感生成内容</h4>
                <p>输入摘要、生成结果摘要和完整内容需要填写访问原因后加载。</p>
              </div>
              <el-button
                v-if="!rawDetailVisible"
                type="primary"
                plain
                :loading="rawDetailLoading"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="loadRunRawDetail"
              >
                查看敏感生成内容
              </el-button>
              <el-button v-else @click="rawDetailVisible = false">隐藏敏感内容</el-button>
            </div>
            <p v-if="!rawDetailVisible" class="raw-detail-hint">默认详情只展示脱敏摘要，敏感内容访问会写入操作审计。</p>
            <el-collapse v-else>
              <el-collapse-item title="输入摘要">
                <p class="sensitive-summary">{{ formatSensitiveSummary(rawDetail?.inputSnapshot) }}</p>
                <details class="sensitive-full-content">
                  <summary>查看完整输入内容</summary>
                  <pre class="json-box">{{ formatJson(rawDetail?.inputSnapshot) }}</pre>
                </details>
              </el-collapse-item>
              <el-collapse-item title="生成结果摘要">
                <p class="sensitive-summary">{{ formatSensitiveSummary(rawDetail?.output) }}</p>
                <details class="sensitive-full-content">
                  <summary>查看完整生成结果</summary>
                  <pre class="json-box">{{ formatJson(rawDetail?.output) }}</pre>
                </details>
              </el-collapse-item>
              <el-collapse-item v-if="rawDetail?.rawOutputText" title="完整生成内容">
                <p class="sensitive-summary">{{ formatSensitiveSummary(rawDetail.rawOutputText) }}</p>
                <details class="sensitive-full-content">
                  <summary>查看完整内容</summary>
                  <pre class="json-box">{{ rawDetail.rawOutputText }}</pre>
                </details>
              </el-collapse-item>
            </el-collapse>
          </div>
          <el-alert
            v-else-if="hasAgentRawDiagnostics"
            class="detail-section"
            type="info"
            show-icon
            :closable="false"
            title="敏感诊断内容已隐藏"
            description="当前账号没有查看完整输入快照、结构化输出和 AI 完整输出的权限。"
          />
          <el-alert
            v-else
            class="detail-section"
            type="info"
            show-icon
            :closable="false"
            title="本次运行未记录敏感诊断内容"
            description="当前记录没有可申请查看的完整输入快照、结构化输出或 AI 完整输出。"
          />
        </template>
      </div>
      <template #footer>
        <div class="admin-detail-dialog__footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { getAdminAgentRunDetailApi, getAdminAgentRunRawApi, getAdminAgentRunsApi } from '@/api/adminAgent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { useAuthStore } from '@/stores/auth'
import type { AdminAgentRunQueryDTO, AgentRunDetailVO } from '@/types/agent'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage as normalizeErrorMessage, toFriendlyMessage } from '@/utils/error'

type AgentRunColumnKey =
  | 'id'
  | 'userId'
  | 'agentType'
  | 'targetJobTitle'
  | 'status'
  | 'triggerType'
  | 'modelName'
  | 'durationMs'
  | 'errorMessage'
  | 'createdAt'
  | 'traceId'
  | 'aiCallLogId'

const route = useRoute()
const authStore = useAuthStore()
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const loading = ref(false)
const detailLoading = ref(false)
const errorMessage = ref('')
const detailError = ref('')
const runs = ref<AgentRunDetailVO[]>([])
const detail = ref<AgentRunDetailVO>()
const rawDetail = ref<AgentRunDetailVO>()
const detailId = ref<number>()
const total = ref(0)
const timeRange = ref<[string, string] | ''>('')
const detailVisible = ref(false)
const rawDetailVisible = ref(false)
const rawDetailLoading = ref(false)
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AgentRunColumnKey>('admin:agent-run', [
  { key: 'id', label: '运行编号', required: true },
  { key: 'userId', label: '用户编号' },
  { key: 'agentType', label: '生成类型' },
  { key: 'targetJobTitle', label: '目标岗位' },
  { key: 'status', label: '状态', required: true },
  { key: 'triggerType', label: '触发方式' },
  { key: 'modelName', label: '模型' },
  { key: 'durationMs', label: '耗时' },
  { key: 'errorMessage', label: '错误信息' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'traceId', label: '追踪号', defaultVisible: false },
  { key: 'aiCallLogId', label: '生成记录编号', defaultVisible: false }
])

const query = reactive<AdminAgentRunQueryDTO>({
  pageNum: 1,
  pageSize: 10,
  userId: undefined,
  agentType: '',
  status: '',
  triggerType: '',
  startTime: '',
  endTime: ''
})

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const applyRouteQuery = () => {
  const hasRouteFilter = ['status', 'agentType', 'triggerType'].some((key) => firstQueryString(route.query[key]))
  if (!hasRouteFilter) return false
  const status = firstQueryString(route.query.status)
  const agentType = firstQueryString(route.query.agentType)
  const triggerType = firstQueryString(route.query.triggerType)
  Object.assign(query, {
    status: status ? status.toUpperCase() : '',
    agentType,
    triggerType,
    pageNum: 1
  })
  return true
}

const runStatusOptions = [
  { label: '等待中', value: 'PENDING' },
  { label: '运行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '取消', value: 'CANCELED' }
]

const runStatusMap = Object.fromEntries(runStatusOptions.map((item) => [item.value, item.label]))

watch(timeRange, (value) => {
  query.startTime = Array.isArray(value) ? value[0] : ''
  query.endTime = Array.isArray(value) ? value[1] : ''
})

const successCount = computed(() => runs.value.filter((run) => run.status === 'SUCCESS').length)
const failedCount = computed(() => runs.value.filter((run) => run.status === 'FAILED').length)
const avgDuration = computed(() => {
  const durations = runs.value.map((run) => run.durationMs).filter((value): value is number => typeof value === 'number')
  if (!durations.length) return '--'
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
})
const hasRunFilters = computed(() =>
  Boolean(query.userId || query.agentType || query.status || query.triggerType || query.startTime || query.endTime)
)
const runEmptyTitle = computed(() => hasRunFilters.value ? '没有匹配当前筛选的运行记录' : '暂无生成运行记录')
const runEmptyDescription = computed(() => {
  if (hasRunFilters.value) {
    return '当前筛选条件下没有生成运行记录。清空用户、状态、触发方式或时间范围后，可确认是否真的没有运行数据。'
  }
  return '当前还没有生成运行记录。用户生成今日计划后，这里会展示状态、耗时、模型和失败原因。'
})
const hasAgentRawDiagnostics = computed(() => Boolean(detail.value?.rawAvailable))
const canViewAgentDiagnostics = computed(() => {
  const permission = detail.value?.rawAccessPermission || 'admin:ai:log:raw:view'
  return hasAgentRawDiagnostics.value && authStore.hasPermission(permission)
})

const priorityMap: Record<string, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低'
}

const getErrorMessage = (error: unknown, fallback = '生成运行记录加载失败，请稍后重试。') => {
  return normalizeErrorMessage(error, fallback)
}

const agentErrorInfo = (run: Pick<AgentRunDetailVO, 'errorCode' | 'errorMessage'>) => {
  const value = `${run.errorCode || ''} ${run.errorMessage || ''}`.toUpperCase()
  if (value.includes('TARGET_JOB')) {
    return {
      title: '缺少目标岗位',
      action: '用户需要先创建或设置当前目标岗位，然后重新生成今日计划。'
    }
  }
  if (value.includes('RESUME')) {
    return {
      title: '缺少可用简历',
      action: '用户需要先创建、上传或解析简历，然后重新生成今日计划。'
    }
  }
  if (value.includes('SKILL_PROFILE')) {
    return {
      title: '缺少能力画像',
      action: '用户需要先完成简历匹配并生成能力画像，然后重新生成今日计划。'
    }
  }
  return {
    title: toFriendlyMessage(run.errorMessage || run.errorCode, '生成运行失败'),
    action: '请根据追踪号查看生成链路，必要时提示用户稍后重试。'
  }
}

const displayAgentError = (run: Pick<AgentRunDetailVO, 'errorCode' | 'errorMessage'>) => {
  if (!run.errorCode && !run.errorMessage) return '--'
  return agentErrorInfo(run).title
}

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const priorityLabel = (value?: string | null) => (value ? priorityMap[value] || '优先级待确认' : '--')

const formatJson = (value: unknown) => {
  if (!value) return '--'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const diagnosticKeyLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bprompt\b/gi, '提示词')
    .replace(/\btask\b/gi, '任务')
    .replace(/\bresume\b/gi, '简历')
    .replace(/\bjob\b/gi, '岗位')
    .replace(/\buser\b/gi, '用户')
    .trim()

const compactSensitiveValue = (value: unknown, maxLength = 120) => {
  const text = formatJson(value).replace(/\s+/g, ' ').trim()
  if (!text || text === '--') return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const formatSensitiveSummary = (value: unknown) => {
  if (!value) return '暂无可展示摘要'
  if (Array.isArray(value)) {
    const sample = value.slice(0, 3).map((item) => compactSensitiveValue(item, 80)).filter(Boolean).join('；')
    return sample ? `共 ${value.length} 条内容；${sample}` : `共 ${value.length} 条内容`
  }
  if (typeof value === 'object') {
    const items = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = compactSensitiveValue(item, 80)
        return text ? `${diagnosticKeyLabel(key)}：${text}` : ''
      })
      .filter(Boolean)
      .slice(0, 5)
    return items.length ? items.join('；') : '暂无可展示摘要'
  }
  return compactSensitiveValue(value, 240) || '暂无可展示摘要'
}

const fetchRuns = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAdminAgentRunsApi(query)
    runs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    runs.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNum = 1
  fetchRuns()
}

const handleReset = () => {
  timeRange.value = ''
  Object.assign(query, {
    pageNum: 1,
    pageSize: 10,
    userId: undefined,
    agentType: '',
    status: '',
    triggerType: '',
    startTime: '',
    endTime: ''
  })
  fetchRuns()
}

const openRunDetail = async (id: number) => {
  detailVisible.value = true
  detailId.value = id
  detailLoading.value = true
  detailError.value = ''
  rawDetail.value = undefined
  rawDetailVisible.value = false
  try {
    detail.value = await getAdminAgentRunDetailApi(id)
  } catch (error) {
    detail.value = undefined
    detailError.value = getErrorMessage(error, '生成运行详情暂时加载失败，请稍后重试。')
  } finally {
    detailLoading.value = false
  }
}

const loadRunRawDetail = async () => {
  if (!guardAdminMobileWrite()) return
  if (!detail.value?.id || !canViewAgentDiagnostics.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '生成敏感诊断访问预览',
    action: '查看生成运行输入摘要、提示词变量和完整生成内容',
    target: `运行编号：${detail.value.id}；用户编号：${detail.value.userId ?? '-'}；追踪号：${detail.value.traceId || '-'}`,
    impact: '敏感生成内容可能包含简历、岗位描述、今日计划生成上下文、AI 输出和失败定位细节，查看后需要按敏感信息处理规范使用。',
    rollback: '查看行为无法撤销；若误看或误传播，需要结合审计记录和内部流程处理。',
    audit: '系统会记录访问人、运行编号、查看原因、时间和敏感访问确认标记。',
    tips: ['仅在处理用户反馈、失败运行或合规审计时查看。', '不要把敏感生成内容复制到第三方工具或无权限渠道。'],
    confirmButtonText: '继续填写原因'
  })
  if (!confirmed) return
  let accessReason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      '生成运行内容可能包含简历、岗位描述、提示词变量、AI 输出和失败定位上下文。请填写本次查看原因，系统会记录到操作审计。',
      '确认查看敏感生成内容',
      {
        confirmButtonText: '确认查看',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：定位用户今日计划生成失败',
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
    rawDetail.value = await getAdminAgentRunRawApi(detail.value.id, {
      accessReason,
      confirmSensitiveAccess: true
    })
    rawDetailVisible.value = true
    ElMessage.success('敏感生成内容已按权限加载，访问原因已写入审计')
  } catch (error) {
    rawDetailVisible.value = false
    rawDetail.value = undefined
    ElMessage.error(normalizeErrorMessage(error, '没有权限或敏感生成内容加载失败，请确认权限或稍后重试。'))
  } finally {
    rawDetailLoading.value = false
  }
}

watch(
  () => route.query.runId,
  (value) => {
    const id = Number(value)
    if (Number.isFinite(id) && id > 0) {
      openRunDetail(id)
    }
  },
  { immediate: true }
)

watch(
  () => [route.query.status, route.query.agentType, route.query.triggerType],
  () => {
    if (applyRouteQuery()) {
      void fetchRuns()
    }
  }
)

onMounted(() => {
  applyRouteQuery()
  fetchRuns()
})
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
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

.run-detail-dialog {
  min-height: 360px;
}

.run-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.run-detail-head span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.run-detail-head h3,
.detail-section h4 {
  margin: 6px 0 0;
}

.detail-section {
  margin-top: 18px;
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

.raw-detail-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  padding: 14px;
  background: rgba(248, 250, 252, 0.68);
}

.raw-detail-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.raw-detail-panel__head h4 {
  margin: 0;
}

.raw-detail-panel__head p,
.raw-detail-hint {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.raw-detail-hint {
  margin-bottom: 10px;
}

.json-box {
  overflow: auto;
  max-height: 280px;
  margin: 0;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: #020617;
  color: #dbeafe;
  white-space: pre-wrap;
  word-break: break-word;
}

.sensitive-summary {
  margin: 0 0 10px;
  color: var(--app-text);
  line-height: 1.7;
}

.sensitive-full-content {
  summary {
    cursor: pointer;
    color: var(--app-text-muted);
    font-size: 13px;
  }

  .json-box {
    margin-top: 10px;
  }
}

@media (max-width: 900px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
