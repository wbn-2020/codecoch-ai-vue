<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Timer :size="16" /><span>任务中心</span></div>
        <h1 class="admin-hero__title">异步任务中心</h1>
        <p class="admin-hero__desc">查看生成与处理任务、失败原因和死信状态，并对失败任务发起重试。</p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="diagnostic-strip">
        <div>
          <strong>处理记录查询</strong>
          <p>按追踪号或关联功能 + 关联记录反查相关异步任务，核对生成、解析、报告和索引同步进度。</p>
        </div>
        <el-form :model="diagnosticQuery" inline>
          <el-form-item label="追踪号">
            <el-input v-model.trim="diagnosticQuery.traceId" clearable placeholder="输入追踪号" />
          </el-form-item>
          <el-form-item label="处理编号">
            <el-input v-model.trim="diagnosticQuery.messageId" clearable placeholder="输入处理编号" />
          </el-form-item>
          <el-form-item label="关联功能">
            <el-input v-model.trim="diagnosticQuery.bizType" clearable placeholder="如 resume.job-match" />
          </el-form-item>
          <el-form-item label="关联记录">
            <el-input v-model.trim="diagnosticQuery.bizId" clearable placeholder="报告/简历/面试记录" />
          </el-form-item>
          <el-form-item>
            <el-button :loading="diagnosticLoading" @click="handleDiagnosticSearch">查询记录</el-button>
            <el-button @click="resetDiagnosticSearch">清空</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="diagnosticSearched" class="diagnostic-result">
        <div class="diagnostic-result__head">
          <strong>查询结果</strong>
          <span>{{ diagnosticTasks.length }} 条相关任务</span>
        </div>
        <el-alert
          v-if="diagnosticError"
          class="diagnostic-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="diagnosticError"
        />
        <el-table
          v-else
          :data="diagnosticTasks"
          size="small"
          row-key="id"
        >
          <el-table-column prop="taskId" label="处理编号" min-width="170" show-overflow-tooltip />
          <el-table-column label="关联功能" min-width="150" show-overflow-tooltip>
            <template #default="{ row }"><span :title="taskTypeCode(row.taskType)">{{ taskTypeLabel(row.taskType) }}</span></template>
          </el-table-column>
          <el-table-column prop="bizId" label="关联记录" min-width="120" show-overflow-tooltip />
          <el-table-column prop="traceId" label="追踪号" min-width="160" show-overflow-tooltip />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link type="primary" :disabled="!row.traceId" @click="goAiLogsByTrace(row.traceId)">生成记录</el-button>
              <el-button link type="primary" :disabled="!row.traceId" @click="goOperationLogsByTrace(row.traceId)">审计记录</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              class="diagnostic-empty-state"
              type="empty"
              :title="diagnosticEmptyTitle"
              :description="diagnosticEmptyDescription"
            >
              <el-button type="primary" @click="handleDiagnosticSearch">重新查询</el-button>
              <el-button v-if="diagnosticQuery.traceId" @click="goAiLogsByTrace(diagnosticQuery.traceId)">按追踪号查生成记录</el-button>
              <el-button v-if="diagnosticQuery.traceId" @click="goOperationLogsByTrace(diagnosticQuery.traceId)">按追踪号查审计记录</el-button>
              <el-button @click="resetDiagnosticSearch">清空条件</el-button>
            </AppState>
          </template>
        </el-table>
      </div>

      <div class="admin-panel__header async-task-table-header">
        <div>
          <h2>任务列表</h2>
          <p>支持按状态、类型和关联记录筛选；列配置会保存在当前浏览器，方便高频处理视图复用。</p>
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
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="任务名 / 关联记录" /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 140px">
              <el-option label="等待" value="PENDING" />
              <el-option label="执行中" value="RUNNING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="死信" value="DEAD_LETTER" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型"><el-input v-model.trim="query.type" clearable placeholder="如 resume.parse" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="tasks" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('taskName')" prop="taskName" label="任务" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('taskType')" label="类型" min-width="170" show-overflow-tooltip>
            <template #default="{ row }"><span :title="taskTypeCode(row.taskType)">{{ taskTypeLabel(row.taskType) }}</span></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('bizId')" prop="bizId" label="关联记录" min-width="130" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('retry')" label="重试" width="90"><template #default="{ row }">{{ row.retryCount ?? 0 }}/{{ row.maxRetryCount ?? '-' }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('deadLetter')" label="死信" width="90"><template #default="{ row }"><el-tag v-if="isDead(row)" type="danger">是</el-tag><span v-else>否</span></template></el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('errorMessage')" label="失败原因" min-width="260">
            <template #default="{ row }">
              <p :class="['task-error-preview', { 'task-error-preview--empty': !row.errorMessage }]">
                {{ row.errorMessage || '-' }}
              </p>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button
                v-if="isDead(row)"
                v-permission="'admin:task:retry'"
                link
                type="danger"
                :disabled="withMobileReadonlyDisabled(retryingId === row.id)"
                :loading="retryingId === row.id"
                :title="mobileReadonlyTitle()"
                @click="handleDeadRetry(row)"
              >
                死信重试
              </el-button>
              <el-button
                v-else-if="canRetry(row)"
                v-permission="'admin:task:retry'"
                link
                type="warning"
                :disabled="withMobileReadonlyDisabled(retryingId === row.id)"
                :loading="retryingId === row.id"
                :title="mobileReadonlyTitle()"
                @click="handleRetry(row)"
              >
                重试
              </el-button>
              <span v-else class="muted-action">无需处理</span>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="taskError ? 'error' : 'empty'"
              :title="taskError ? '任务列表加载失败' : '暂无异步任务'"
              :description="taskError || '当前筛选条件下没有任务记录。'"
            >
              <el-button type="primary" @click="taskError ? fetchTasks() : handleReset()">{{ taskError ? '重新加载' : '清空筛选' }}</el-button>
            </AppState>
          </template>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchTasks" />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="任务详情" size="680px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="处理编号">{{ primaryTaskId(detail) }}</el-descriptions-item>
        <el-descriptions-item v-if="secondaryTaskId(detail)" label="消息编号">{{ secondaryTaskId(detail) }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ taskTypeLabel(detail.taskType) }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)">{{ statusLabel(detail.status) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="关联记录">{{ detail.bizType || '-' }} / {{ detail.bizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="追踪号">{{ detail.traceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联记录">
          <div class="diagnostic-actions">
            <el-button size="small" :disabled="!detail.traceId" @click="goAiLogsByTrace(detail.traceId)">按追踪号查生成记录</el-button>
            <el-button size="small" :disabled="!detail.traceId" @click="goOperationLogsByTrace(detail.traceId)">按追踪号查审计记录</el-button>
            <el-button size="small" :disabled="!detail.bizType || !detail.bizId" @click="fillDiagnosticFromTask(detail)">按关联记录反查任务</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="失败说明">{{ detail.errorMessage || '暂无失败说明' }}</el-descriptions-item>
        <el-descriptions-item label="处理输入摘要">
          <pre class="detail-preview">{{ previewText(detail.payloadPreview, '暂无输入摘要') }}</pre>
          <small v-if="hasPreviewDigest(detail.payloadHash)" class="detail-preview-meta">输入摘要已生成校验指纹，可用于后续核对。</small>
        </el-descriptions-item>
        <el-descriptions-item label="处理结果摘要">
          <pre class="detail-preview">{{ previewText(detail.resultPreview, '暂无结果摘要') }}</pre>
          <small v-if="hasPreviewDigest(detail.resultHash)" class="detail-preview-meta">结果摘要已生成校验指纹，可用于后续核对。</small>
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getAdminDeadLetterRetryPreviewApi,
  getAdminTaskByMessageIdApi,
  getAdminTaskDetailApi,
  getAdminTaskRetryPreviewApi,
  getAdminTasksByBizApi,
  getAdminTasksByTraceApi,
  getAdminTasksApi,
  retryAdminDeadLetterTaskApi,
  retryAdminTaskApi
} from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, AdminTaskImpactPreviewVO, AsyncTaskVO } from '@/types/adminGovernance'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const drawerVisible = ref(false)
const tasks = ref<AsyncTaskVO[]>([])
const detail = ref<AsyncTaskVO | null>(null)
const total = ref(0)
const taskError = ref('')
const retryingId = ref<number | null>(null)
const { guardAdminMobileWrite, mobileReadonlyTitle, withMobileReadonlyDisabled } = useAdminMobileReadonly()
const query = reactive<AdminListQuery>({ keyword: '', status: '', type: '', pageNo: 1, pageSize: 10 })
const diagnosticLoading = ref(false)
const diagnosticSearched = ref(false)
const diagnosticTasks = ref<AsyncTaskVO[]>([])
const diagnosticError = ref('')
const diagnosticQuery = reactive({
  messageId: '',
  traceId: '',
  bizType: '',
  bizId: ''
})

type AsyncTaskColumnKey =
  | 'taskName'
  | 'taskType'
  | 'bizId'
  | 'status'
  | 'retry'
  | 'deadLetter'
  | 'createdAt'
  | 'errorMessage'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AsyncTaskColumnKey>('admin:async-task', [
  { key: 'taskName', label: '任务', required: true },
  { key: 'taskType', label: '类型', required: true },
  { key: 'bizId', label: '关联记录' },
  { key: 'status', label: '状态', required: true },
  { key: 'retry', label: '重试次数' },
  { key: 'deadLetter', label: '死信' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'errorMessage', label: '失败原因' }
])

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const hasRouteQueryValue = (...keys: string[]) => keys.some((key) => firstQueryString(route.query[key]))

const applyRouteQuery = () => {
  if (!hasRouteQueryValue('status', 'type', 'keyword', 'messageId', 'traceId', 'bizType', 'bizId')) return false
  const status = firstQueryString(route.query.status)
  const type = firstQueryString(route.query.type || route.query.bizType)
  const keyword = firstQueryString(route.query.keyword || route.query.messageId || route.query.traceId || route.query.bizId)
  Object.assign(query, {
    keyword,
    status: status ? status.toUpperCase() : '',
    type,
    pageNo: 1
  })
  return true
}

const hasDiagnosticRouteQuery = () =>
  Boolean(diagnosticQuery.messageId || diagnosticQuery.traceId || (diagnosticQuery.bizType && diagnosticQuery.bizId))

const applyDiagnosticRouteQuery = () => {
  const messageId = firstQueryString(route.query.messageId)
  const traceId = firstQueryString(route.query.traceId)
  const bizType = firstQueryString(route.query.bizType || route.query.type)
  const bizId = firstQueryString(route.query.bizId)
  Object.assign(diagnosticQuery, {
    messageId,
    traceId,
    bizType,
    bizId
  })
  return hasDiagnosticRouteQuery()
}

const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'DONE'].includes(value)) return 'success'
  if (['FAILED', 'ERROR', 'DEAD', 'DEAD_LETTER'].includes(value)) return 'danger'
  if (['PENDING', 'WAITING', 'QUEUED', 'RUNNING', 'PROCESSING'].includes(value)) return 'warning'
  return 'info'
}

const statusLabels: Record<string, string> = {
  PENDING: '等待中',
  WAITING: '等待中',
  QUEUED: '排队中',
  RUNNING: '执行中',
  PROCESSING: '处理中',
  SUCCESS: '成功',
  COMPLETED: '已完成',
  DONE: '已完成',
  FAILED: '失败',
  ERROR: '异常',
  DEAD: '死信',
  DEAD_LETTER: '死信',
  CANCELED: '已取消',
  CANCELLED: '已取消'
}

const statusLabel = (status?: string | null) => {
  const value = String(status || '').trim().toUpperCase()
  if (!value) return '-'
  return statusLabels[value] || '状态待确认'
}

const taskTypeLabels: Record<string, string> = {
  'agent.daily-plan.generate': '今日计划生成',
  'job-target.parse': '岗位描述解析',
  'resume.parse': '简历解析',
  'resume-job-match.analyze': '简历匹配',
  'question-recommendation.generate': '推荐题生成',
  'interview.report': '面试报告生成',
  'study-plan.generate': '学习计划生成',
  'search.sync': '检索索引同步'
}

const taskTypeCode = (value?: string | null) => String(value || '').trim()

const taskTypeLabel = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  return taskTypeLabels[raw] || raw
}

const primaryTaskId = (row: AsyncTaskVO) => row.taskId || row.messageId || row.id || '-'

const secondaryTaskId = (row: AsyncTaskVO) => {
  const messageId = String(row.messageId || '').trim()
  const taskId = String(row.taskId || '').trim()
  if (!messageId || messageId === taskId) return ''
  return messageId
}

const previewText = (value: string | null | undefined, emptyText: string) => String(value || '').trim() || emptyText

const hasPreviewDigest = (value: string | null | undefined) => Boolean(String(value || '').trim())

const isDead = (row: AsyncTaskVO) => row.deadLetter === true || row.deadLetter === 1 || ['DEAD', 'DEAD_LETTER'].includes(String(row.status).toUpperCase())
const canRetry = (row: AsyncTaskVO) => ['FAILED', 'ERROR', 'DEAD', 'DEAD_LETTER'].includes(String(row.status).toUpperCase())

const diagnosticEmptyTitle = computed(() => {
  if (diagnosticQuery.messageId) return '未找到这个处理编号'
  if (diagnosticQuery.traceId) return '未找到这个追踪号对应的任务'
  if (diagnosticQuery.bizType && diagnosticQuery.bizId) return '未找到这个关联记录对应的任务'
  return '请先填写查询条件'
})

const diagnosticEmptyDescription = computed(() => {
  if (diagnosticQuery.messageId) {
    return '处理编号没有命中异步任务记录。请确认是否填入了完整编号，也可以改用追踪号或关联功能 + 关联记录继续反查。'
  }
  if (diagnosticQuery.traceId) {
    return '当前追踪号没有命中异步任务记录，不代表处理一定没有执行。可继续按同一追踪号查看生成记录和审计记录，确认任务是否已同步处理或暂未写入任务中心。'
  }
  if (diagnosticQuery.bizType && diagnosticQuery.bizId) {
    return '当前关联功能和关联记录没有命中异步任务记录。请确认关联功能标识、关联记录是否来自同一环境，并可按页面列表关键词再查一次。'
  }
  return '填写处理编号、追踪号，或同时填写关联功能和关联记录后再查询。'
})

const goAiLogsByTrace = (traceId?: string) => {
  const value = String(traceId || '').trim()
  if (!value) return
  router.push({ path: '/admin/ai/logs', query: { traceId: value, source: 'async-task' } })
}

const goOperationLogsByTrace = (traceId?: string) => {
  const value = String(traceId || '').trim()
  if (!value) return
  router.push({ path: '/admin/operation-logs', query: { traceId: value, source: 'async-task' } })
}

const fillDiagnosticFromTask = (row: AsyncTaskVO) => {
  Object.assign(diagnosticQuery, {
    messageId: row.messageId || row.taskId || '',
    traceId: row.traceId || '',
    bizType: row.bizType || row.taskType || '',
    bizId: row.bizId || ''
  })
  void handleDiagnosticSearch()
}

const fetchTasks = async () => {
  loading.value = true
  taskError.value = ''
  try {
    const result = await getAdminTasksApi(query)
    tasks.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    tasks.value = []
    total.value = 0
    taskError.value = getErrorMessage(error, '暂时无法获取任务列表，请稍后重试或检查任务服务状态。')
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: AsyncTaskVO) => {
  detail.value = await getAdminTaskDetailApi(row.id)
  drawerVisible.value = true
}

const handleDiagnosticSearch = async () => {
  const messageId = diagnosticQuery.messageId.trim()
  const traceId = diagnosticQuery.traceId.trim()
  const bizType = diagnosticQuery.bizType.trim()
  const bizId = diagnosticQuery.bizId.trim()
  if (!messageId && !traceId && (!bizType || !bizId)) {
    ElMessage.warning('请填写处理编号、追踪号，或同时填写关联功能和关联记录')
    return
  }
  diagnosticLoading.value = true
  diagnosticSearched.value = true
  diagnosticError.value = ''
  try {
    if (messageId) {
      diagnosticTasks.value = [await getAdminTaskByMessageIdApi(messageId)]
    } else {
      diagnosticTasks.value = traceId
        ? await getAdminTasksByTraceApi({ traceId, limit: 50 })
        : await getAdminTasksByBizApi({ bizType, bizId, limit: 50 })
    }
  } catch (error) {
    diagnosticTasks.value = []
    const message = (error as Error)?.message
    diagnosticError.value = message || '记录查询失败，请检查处理编号、追踪号或关联记录是否正确'
    ElMessage.warning(diagnosticError.value)
  } finally {
    diagnosticLoading.value = false
  }
}

const resetDiagnosticSearch = () => {
  Object.assign(diagnosticQuery, { messageId: '', traceId: '', bizType: '', bizId: '' })
  diagnosticTasks.value = []
  diagnosticError.value = ''
  diagnosticSearched.value = false
}

const handleRetry = async (row: AsyncTaskVO) => {
  if (!guardAdminMobileWrite()) return
  retryingId.value = row.id
  try {
    const preview = await getAdminTaskRetryPreviewApi(row.id)
    const note = await promptActionNote('重试失败任务', row, preview)
    if (note === null) return
    await retryAdminTaskApi(row.id, note)
    ElMessage.success('已提交重试')
    await fetchTasks()
  } catch (error) {
    if ((error as Error)?.message === '当前状态不可执行') ElMessage.warning('当前状态不可执行')
  } finally {
    retryingId.value = null
  }
}

const handleDeadRetry = async (row: AsyncTaskVO) => {
  if (!guardAdminMobileWrite()) return
  retryingId.value = row.id
  try {
    const preview = await getAdminDeadLetterRetryPreviewApi(row.id)
    const note = await promptActionNote('死信任务重试', row, preview)
    if (note === null) return
    await retryAdminDeadLetterTaskApi(row.id, note)
    ElMessage.success('已提交死信重试')
    await fetchTasks()
  } catch (error) {
    if ((error as Error)?.message === '当前状态不可执行') ElMessage.warning('当前状态不可执行')
  } finally {
    retryingId.value = null
  }
}

const promptActionNote = async (title: string, row: AsyncTaskVO, preview?: AdminTaskImpactPreviewVO) => {
  if (preview && preview.executable === false) {
    throw new Error('当前状态不可执行')
  }
  const confirmed = await confirmDangerActionPreview({
    title: `${title}预览`,
    action: title,
    target: `处理编号：${row.taskId || row.id}；任务类型：${taskTypeLabel(row.taskType)}；关联记录：${preview?.bizType || row.bizType || '-'} / ${preview?.bizId || row.bizId || '-'}`,
    impact: preview?.impact || '该操作会重新执行任务，请确认依赖已经恢复，避免重复写入、重复通知或重复消耗 AI 资源。',
    rollback: '重新投递后的任务无法自动撤销；若重试造成重复结果，需要结合业务数据、任务处理记录和审计记录人工处理。',
    audit: '重试操作会记录操作人、处理编号、关联记录、处理说明和时间，便于核对补偿行为。',
    tips: [
      `风险等级：${preview?.riskLevel || '未知'}`,
      preview?.requiredNote || '需要填写本次人工处理说明。',
      '确认依赖服务、消息队列、AI 服务或业务数据已经恢复。'
    ],
    confirmButtonText: '继续填写说明'
  })
  if (!confirmed) return null
  const message = [
    `对象：${row.taskName || row.taskId || row.id}`,
    preview?.impact || '该操作会重新执行任务，请确认依赖已经恢复。',
    preview?.requiredNote || '请填写本次人工处理说明。'
  ].join('\n')
  const result = await ElMessageBox.prompt(message, title, {
    type: preview?.riskLevel === 'HIGH' ? 'error' : 'warning',
    inputType: 'textarea',
    inputPlaceholder: '例如：已确认依赖恢复，允许人工补偿重试',
    inputValidator: (value) => Boolean(String(value || '').trim()) || '请填写处理说明',
    confirmButtonText: '确认执行',
    cancelButtonText: '取消'
  })
  return String(result.value || '').trim()
}

const handleSearch = () => { query.pageNo = 1; fetchTasks() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', type: '', pageNo: 1, pageSize: 10 }); fetchTasks() }

watch(
  () => [route.query.status, route.query.type, route.query.keyword, route.query.messageId, route.query.traceId, route.query.bizType, route.query.bizId],
  () => {
    if (applyRouteQuery()) {
      void fetchTasks()
    }
    if (applyDiagnosticRouteQuery()) {
      void handleDiagnosticSearch()
    } else {
      diagnosticTasks.value = []
      diagnosticError.value = ''
      diagnosticSearched.value = false
    }
  }
)

onMounted(() => {
  applyRouteQuery()
  applyDiagnosticRouteQuery()
  fetchTasks()
  if (hasDiagnosticRouteQuery()) {
    handleDiagnosticSearch()
  }
})
</script>

<style scoped lang="scss">
.diagnostic-strip,
.diagnostic-result {
  margin: 16px 20px 0;
  padding: 14px 16px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: #f8fafc;
}

.diagnostic-strip {
  display: grid;
  gap: 12px;

  strong,
  p {
    margin: 0;
  }

  p {
    margin-top: 4px;
    color: var(--app-text-muted, #64748b);
    font-size: 13px;
    line-height: 1.6;
  }
}

.diagnostic-result__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  span {
    color: var(--app-text-muted, #64748b);
    font-size: 13px;
  }
}

.diagnostic-alert {
  margin-bottom: 10px;
}

.async-task-table-header {
  margin-top: 18px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

:global(.column-config-menu) {
  min-width: 168px;
  padding: 6px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.task-error-preview {
  display: -webkit-box;
  max-height: 42px;
  margin: 0;
  overflow: hidden;
  color: var(--app-text, #1f2937);
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-error-preview--empty {
  color: var(--app-text-muted, #64748b);
}

.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
.muted-action { color: var(--app-text-muted); font-size: 12px; }

.detail-preview {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-preview-meta {
  display: block;
  margin-top: 6px;
  color: var(--app-text-muted, #64748b);
}

@media (max-width: 768px) {
  .async-task-table-header {
    align-items: flex-start;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
