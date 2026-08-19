<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Timer :size="16" /><span>任务中心</span></div>
        <h1 class="admin-hero__title">异步任务中心</h1>
        <p class="admin-hero__desc">查看处理状态、失败诊断和治理结论；治理分类与实际重试分离，避免误触发补偿。</p>
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
            <template #default="{ row }"><span :title="taskTypeTitle(row.taskType)">{{ taskTypeLabel(row.taskType) }}</span></template>
          </el-table-column>
          <el-table-column prop="bizId" label="关联记录" min-width="120" show-overflow-tooltip />
          <el-table-column prop="traceId" label="追踪号" min-width="160" show-overflow-tooltip />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button v-permission="'admin:ai:log:list'" link type="primary" :disabled="!row.traceId" @click="goAiLogsByTrace(row.traceId)">生成记录</el-button>
              <el-button v-permission="'admin:audit:operation-log'" link type="primary" :disabled="!row.traceId" @click="goOperationLogsByTrace(row.traceId)">审计记录</el-button>
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
              <el-option label="全部失败终态" :value="failedTaskStatusFilter" />
              <el-option label="等待" value="PENDING" />
              <el-option label="执行中" value="RUNNING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="死信" value="DEAD_LETTER" />
            </el-select>
          </el-form-item>
          <el-form-item label="治理状态">
            <el-select v-model="query.governanceStatus" clearable placeholder="全部" style="width: 160px">
              <el-option label="待评估" value="UNASSESSED" />
              <el-option label="已批准重试" value="RETRY_APPROVED" />
              <el-option label="重试中" value="RETRYING" />
              <el-option label="已解决" value="RESOLVED" />
              <el-option label="不再重试" value="WONT_RETRY" />
              <el-option label="需人工处理" value="MANUAL_ACTION_REQUIRED" />
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
        <section v-if="tasks.length" class="task-mobile-summary" aria-label="任务移动摘要">
          <article v-for="row in tasks.slice(0, 3)" :key="`mobile-${row.id}`">
            <div>
              <strong>{{ taskTypeLabel(row.taskType) }}</strong>
              <span>{{ row.bizId || primaryTaskId(row) }}</span>
            </div>
            <div class="task-mobile-summary__meta">
              <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              <el-tag :type="governanceTagType(row.governanceStatus)">{{ governanceLabel(row.governanceStatus) }}</el-tag>
              <small>重试 {{ row.retryCount ?? 0 }}/{{ row.maxRetryCount ?? '-' }}</small>
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </div>
          </article>
        </section>
        <el-table v-loading="loading" :data="tasks" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('taskName')" prop="taskName" label="任务" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('taskType')" label="类型" min-width="170" show-overflow-tooltip>
            <template #default="{ row }"><span :title="taskTypeTitle(row.taskType)">{{ taskTypeLabel(row.taskType) }}</span></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('bizId')" prop="bizId" label="关联记录" min-width="130" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('governance')" label="治理" min-width="150">
            <template #default="{ row }">
              <div class="governance-cell">
                <el-tag :type="governanceTagType(row.governanceStatus)">{{ governanceLabel(row.governanceStatus) }}</el-tag>
                <small v-if="row.failureClass">{{ failureClassLabel(row.failureClass) }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('retry')" label="重试" width="90"><template #default="{ row }">{{ row.retryCount ?? 0 }}/{{ row.maxRetryCount ?? '-' }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('deadLetter')" label="死信" width="90"><template #default="{ row }"><el-tag v-if="isDead(row)" type="danger">是</el-tag><span v-else>否</span></template></el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('errorMessage')" label="失败原因" min-width="260">
            <template #default="{ row }">
              <div
                v-if="rawTaskFailure(row)"
                class="task-error-preview"
                :title="`原始技术错误：${rawTaskFailure(row)}`"
              >
                <strong>{{ taskFailureDiagnosis(row).reason }}</strong>
                <small>{{ taskFailureDiagnosis(row).action }}</small>
              </div>
              <span v-else class="task-error-preview--empty">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="320" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <template v-if="canGovern(row)">
                <el-button
                  v-permission="'admin:task:retry'"
                  link
                  type="primary"
                  :disabled="withMobileReadonlyDisabled(governingId === row.id)"
                  :loading="governingId === row.id"
                  :title="mobileReadonlyTitle()"
                  @click="handleGovernance(row, 'RETRY_APPROVED')"
                >
                  批准重试
                </el-button>
                <el-button
                  v-permission="'admin:task:retry'"
                  link
                  :disabled="withMobileReadonlyDisabled(governingId === row.id)"
                  :loading="governingId === row.id"
                  :title="mobileReadonlyTitle()"
                  @click="handleGovernance(row, 'WONT_RETRY')"
                >
                  不再重试
                </el-button>
                <el-button
                  v-permission="'admin:task:retry'"
                  link
                  type="danger"
                  :disabled="withMobileReadonlyDisabled(governingId === row.id)"
                  :loading="governingId === row.id"
                  :title="mobileReadonlyTitle()"
                  @click="handleGovernance(row, 'MANUAL_ACTION_REQUIRED')"
                >
                  人工处理
                </el-button>
              </template>
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

    <el-drawer v-model="drawerVisible" title="任务详情" size="680px" class="task-detail-drawer">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="处理编号">{{ primaryTaskId(detail) }}</el-descriptions-item>
        <el-descriptions-item v-if="secondaryTaskId(detail)" label="消息编号">{{ secondaryTaskId(detail) }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">
          <span :title="taskTypeTitle(detail.taskType)">{{ taskTypeLabel(detail.taskType) }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="!isRegisteredTaskType(detail.taskType)" label="原始任务代码">
          <code>{{ taskTypeCode(detail.taskType) || '-' }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)">{{ statusLabel(detail.status) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="治理状态">
          <el-tag :type="governanceTagType(detail.governanceStatus)">{{ governanceLabel(detail.governanceStatus) }}</el-tag>
          <span v-if="detail.governanceOwner"> / {{ detail.governanceOwner }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="治理说明">{{ detail.governanceReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="失败分类">{{ failureClassLabel(detail.failureClass) }}</el-descriptions-item>
        <el-descriptions-item label="执行编号">{{ detail.executionId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="父执行编号">{{ detail.parentExecutionId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="执行尝试">{{ detail.attemptNo ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="终态原因代码">{{ detail.terminalReasonCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联记录">{{ detail.bizType || '-' }} / {{ detail.bizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="追踪号">{{ detail.traceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联记录">
          <div class="diagnostic-actions">
            <el-button size="small" :disabled="!detail.traceId" @click="goAiLogsByTrace(detail.traceId)">按追踪号查生成记录</el-button>
            <el-button size="small" :disabled="!detail.traceId" @click="goOperationLogsByTrace(detail.traceId)">按追踪号查审计记录</el-button>
            <el-button size="small" :disabled="!detail.bizType || !detail.bizId" @click="fillDiagnosticFromTask(detail)">按关联记录反查任务</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="失败原因">{{ taskFailureDiagnosis(detail).reason }}</el-descriptions-item>
        <el-descriptions-item label="建议动作">{{ taskFailureDiagnosis(detail).action }}</el-descriptions-item>
        <el-descriptions-item label="建议责任方">{{ taskFailureDiagnosis(detail).owner }}</el-descriptions-item>
        <el-descriptions-item label="诊断追踪号">{{ failureTraceId(detail) || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="rawTaskFailure(detail)" label="原始技术错误">
          <pre class="detail-preview technical-error">{{ rawTaskFailure(detail) }}</pre>
        </el-descriptions-item>
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
  getAdminTaskGovernancePreviewApi,
  getAdminTaskRetryPreviewApi,
  getAdminTasksByBizApi,
  getAdminTasksByTraceApi,
  getAdminTasksApi,
  retryAdminDeadLetterTaskApi,
  retryAdminTaskApi,
  updateAdminTaskGovernanceApi
} from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type {
  AdminListQuery,
  AdminTaskActionPayload,
  AdminTaskGovernanceActionPayload,
  AdminTaskGovernancePreviewVO,
  AdminTaskImpactPreviewVO,
  AsyncTaskVO
} from '@/types/adminGovernance'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

const route = useRoute()
const router = useRouter()
const failedTaskStatusFilter = 'FAILED,DEAD,ERROR,DEAD_LETTER'
const loading = ref(false)
const drawerVisible = ref(false)
const tasks = ref<AsyncTaskVO[]>([])
const detail = ref<AsyncTaskVO | null>(null)
const total = ref(0)
const taskError = ref('')
const retryingId = ref<number | null>(null)
const governingId = ref<number | null>(null)
const { guardAdminMobileWrite, mobileReadonlyTitle, withMobileReadonlyDisabled } = useAdminMobileReadonly()
const query = reactive<AdminListQuery>({ keyword: '', status: '', type: '', governanceStatus: '', pageNo: 1, pageSize: 10 })
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
  | 'governance'
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
  { key: 'governance', label: '治理状态' },
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
  if (!hasRouteQueryValue('status', 'type', 'keyword', 'governanceStatus')) return false
  const status = firstQueryString(route.query.status)
  const type = firstQueryString(route.query.type)
  const keyword = firstQueryString(route.query.keyword)
  const governanceStatus = firstQueryString(route.query.governanceStatus)
  Object.assign(query, {
    keyword,
    status: status ? status.toUpperCase() : '',
    type,
    governanceStatus: governanceStatus ? governanceStatus.toUpperCase() : '',
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
  return statusLabels[value] || '未登记状态'
}

const governanceLabels: Record<string, string> = {
  UNASSESSED: '待评估',
  RETRY_APPROVED: '已批准重试',
  RETRYING: '重试中',
  RESOLVED: '已解决',
  WONT_RETRY: '不再重试',
  MANUAL_ACTION_REQUIRED: '需人工处理'
}

const governanceLabel = (status?: string | null) => {
  const value = String(status || 'UNASSESSED').trim().toUpperCase()
  return governanceLabels[value] || '未登记治理状态'
}

const governanceTagType = (status?: string | null) => {
  const value = String(status || 'UNASSESSED').trim().toUpperCase()
  if (value === 'RESOLVED') return 'success'
  if (value === 'RETRY_APPROVED' || value === 'RETRYING') return 'warning'
  if (value === 'MANUAL_ACTION_REQUIRED') return 'danger'
  return 'info'
}

const failureClassLabels: Record<string, string> = {
  NONE: '无失败',
  AUTH_OR_CONFIGURATION: '认证或配置',
  PAYLOAD_CONTRACT: '数据契约',
  UPSTREAM_UNAVAILABLE: '上游不可用',
  RETRY_EXHAUSTED: '重试耗尽',
  UNCLASSIFIED_FAILURE: '未分类失败',
  PENDING_ASSESSMENT: '待评估'
}

const failureClassLabel = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase()
  return failureClassLabels[normalized] || (normalized ? '未登记分类' : '-')
}

const taskTypeLabels: Record<string, string> = {
  'agent.daily-plan.generate': '今日计划生成',
  'agent.week-plan.generate': '每周计划生成',
  'agent.review.generate': '智能教练复盘',
  'job-target.parse': '岗位描述解析',
  'resume.parse': '简历解析',
  'resume.optimize': '简历优化',
  'resume.export': '简历导出',
  'resume-job-match.analyze': '简历匹配',
  'question-recommendation.generate': '推荐题生成',
  'question.generate': '题目生成',
  'question.ai-generate': 'AI 题目生成',
  'interview.report': '面试报告生成',
  'interview.voice.transcribe': '面试语音转写',
  'study-plan.generate': '学习计划生成',
  'search.sync': '检索索引同步',
  'knowledge.sync': '知识库索引同步',
  'knowledge.rebuild': '知识库索引重建',
  'application-package.generate': '求职材料包生成',
  'notification.send': '通知发送',
  QUESTION_PRACTICE: '刷题练习',
  QUESTION_REVIEW: '题目复盘',
  WRONG_QUESTION_REVIEW: '错题复习',
  RESUME_OPTIMIZE: '简历优化',
  APPLICATION_FOLLOW_UP: '投递跟进',
  INTERVIEW: '面试准备',
  INTERVIEW_REPORT: '面试报告复盘',
  REPORT_REVIEW: '报告复盘',
  KNOWLEDGE_REVIEW: '知识复盘',
  STUDY_TASK: '学习任务'
}

const taskTypeCode = (value?: string | null) => String(value || '').trim()

const registeredTaskTypeLabel = (value?: string | null) => {
  const raw = taskTypeCode(value)
  if (!raw) return undefined
  return taskTypeLabels[raw] || taskTypeLabels[raw.toLowerCase()] || taskTypeLabels[raw.toUpperCase()]
}

const isRegisteredTaskType = (value?: string | null) => Boolean(registeredTaskTypeLabel(value))

const taskTypeLabel = (value?: string | null) => {
  const raw = taskTypeCode(value)
  if (!raw) return '-'
  return registeredTaskTypeLabel(raw) || '未登记任务类型'
}

const taskTypeTitle = (value?: string | null) => {
  const raw = taskTypeCode(value)
  if (!raw) return '未返回任务类型代码'
  return isRegisteredTaskType(raw) ? `任务类型代码：${raw}` : `未登记任务类型，原始代码：${raw}`
}

type FailureDiagnosis = {
  reason: string
  action: string
  owner: string
}

const rawTaskFailure = (row?: Pick<AsyncTaskVO, 'errorMessage'> | null) =>
  String(row?.errorMessage || '').replace(/\s+/g, ' ').trim()

const includesAny = (value: string, keywords: string[]) => keywords.some((keyword) => value.includes(keyword))

const compactFailureText = (value?: string | null, maxLength = 90) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const diagnoseTaskFailureText = (value?: string | null): FailureDiagnosis => {
  const raw = String(value || '').replace(/\s+/g, ' ').trim()
  if (!raw) {
    return {
      reason: '未记录失败原因',
      action: '先按追踪号核对生成记录和审计记录，再判断是否需要人工重试。',
      owner: '平台运维 / 业务研发'
    }
  }

  const lower = raw.toLowerCase()
  if (includesAny(lower, ['rate limit', 'too many requests', 'http 429', 'status 429', 'quota exceeded', 'insufficient quota'])) {
    return {
      reason: '上游调用频率或额度受限',
      action: '检查供应商额度和限流策略，等待限流窗口恢复或降低并发后再重试。',
      owner: 'AI 平台管理员'
    }
  }
  if (includesAny(lower, ['unauthorized', 'forbidden', 'invalid api key', 'invalid_api_key', 'authentication', 'http 401', 'status 401', 'http 403', 'status 403', 'api-key decrypt failed'])) {
    return {
      reason: '上游服务认证失败',
      action: '核对调用凭据、账号权限和密钥解密状态，验证通过后再重试任务。',
      owner: '平台管理员'
    }
  }
  if (includesAny(lower, ['not configured', 'missing configuration', 'base-url', 'base url', 'model is not configured', 'provider not configured', 'configuration error'])) {
    return {
      reason: '任务依赖配置不完整',
      action: '补齐模型、供应商或业务服务配置，确认依赖健康后再重试。',
      owner: '平台管理员 / 业务研发'
    }
  }
  if (includesAny(lower, ['timeout', 'timed out', 'read timed out', 'connect timeout', 'deadline exceeded', 'provider timeout'])) {
    return {
      reason: '任务等待上游响应超时',
      action: '检查上游服务状态、网络延迟和超时配置，确认恢复后按追踪号重试。',
      owner: '平台运维 / 上游服务负责人'
    }
  }
  if (includesAny(lower, ['connection refused', 'connection reset', 'connection failed', 'connectexception', 'unknownhost', 'dns', 'no route to host', 'network is unreachable', 'socket'])) {
    return {
      reason: '任务依赖服务连接失败',
      action: '检查服务地址、DNS、网络和网关状态，恢复连通后再重试。',
      owner: '基础设施运维'
    }
  }
  if (includesAny(lower, ['json', 'deserialize', 'serialization', 'parse response', 'malformed', 'invalid format'])) {
    return {
      reason: '任务数据格式无法解析',
      action: '核对任务输入、上游响应和数据契约，修正格式问题后再重试。',
      owner: '业务研发'
    }
  }
  if (includesAny(lower, ['async task failed', 'request failed', 'provider request failed', 'bad gateway', 'service unavailable', 'http 502', 'http 503', 'status 502', 'status 503'])) {
    return {
      reason: '异步任务调用上游服务失败',
      action: '使用追踪号查看生成记录和审计记录，确认上游恢复且不存在重复结果后再重试。',
      owner: '业务研发 / 平台运维'
    }
  }

  return {
    reason: /[\u4e00-\u9fff]/.test(raw) ? compactFailureText(raw) : '未识别的任务技术错误',
    action: '按追踪号查看原始技术错误和上下游日志，确认根因及幂等影响后再决定是否重试。',
    owner: '业务研发 / 平台运维'
  }
}

const taskFailureDiagnosis = (row?: Pick<AsyncTaskVO, 'errorMessage'> | null) =>
  diagnoseTaskFailureText(rawTaskFailure(row))

const extractTraceId = (value?: string | null) => {
  const text = String(value || '')
  const match = text.match(/(?:trace[\s_-]*id|traceId)\s*[=:]\s*["']?([a-zA-Z0-9._:-]+)/i)
  return match?.[1] || ''
}

const failureTraceId = (row?: Pick<AsyncTaskVO, 'traceId' | 'errorMessage'> | null) =>
  String(row?.traceId || '').trim() || extractTraceId(rawTaskFailure(row))

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
const canGovern = (row: AsyncTaskVO) => canRetry(row)

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
  try {
    detail.value = await getAdminTaskDetailApi(row.id)
    drawerVisible.value = true
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '任务详情加载失败，请稍后重试或按追踪号查询。'))
  }
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
  if (retryingId.value !== null) return
  retryingId.value = row.id
  let attempted = false
  try {
    const preview = await getAdminTaskRetryPreviewApi(row.id)
    const note = await promptActionNote('重试失败任务', row, preview)
    if (note === null) return
    attempted = true
    await retryAdminTaskApi(row.id, buildTaskActionPayload('admin-task-retry', row, note, preview))
    ElMessage.success('已提交重试')
  } catch (error) {
    if (isTaskActionCancelled(error)) return
    const message = getErrorMessage(error, '任务重试失败，请检查依赖状态和当前账号权限后重试。')
    if (message === '当前状态不可执行') ElMessage.warning(message)
    else ElMessage.error(message)
  } finally {
    retryingId.value = null
    if (attempted) await fetchTasks()
  }
}

const handleDeadRetry = async (row: AsyncTaskVO) => {
  if (!guardAdminMobileWrite()) return
  if (retryingId.value !== null) return
  retryingId.value = row.id
  let attempted = false
  try {
    const preview = await getAdminDeadLetterRetryPreviewApi(row.id)
    const note = await promptActionNote('死信任务重试', row, preview)
    if (note === null) return
    attempted = true
    await retryAdminDeadLetterTaskApi(
      row.id,
      buildTaskActionPayload('admin-dead-letter-retry', row, note, preview)
    )
    ElMessage.success('已提交死信重试')
  } catch (error) {
    if (isTaskActionCancelled(error)) return
    const message = getErrorMessage(error, '死信任务重试失败，请检查依赖状态和当前账号权限后重试。')
    if (message === '当前状态不可执行') ElMessage.warning(message)
    else ElMessage.error(message)
  } finally {
    retryingId.value = null
    if (attempted) await fetchTasks()
  }
}

const governanceActionLabels: Record<string, string> = {
  RETRY_APPROVED: '批准任务重试',
  WONT_RETRY: '标记不再重试',
  MANUAL_ACTION_REQUIRED: '标记需人工处理'
}

const handleGovernance = async (row: AsyncTaskVO, governanceStatus: string) => {
  if (!guardAdminMobileWrite()) return
  governingId.value = row.id
  let attempted = false
  try {
    const preview = await getAdminTaskGovernancePreviewApi(row.id)
    if (!(preview.allowedGovernanceStatuses || []).includes(governanceStatus)) {
      ElMessage.warning('当前任务状态不支持该治理操作，请刷新列表后重试')
      return
    }
    const note = await promptGovernanceNote(row, preview, governanceStatus)
    if (note === null) return
    attempted = true
    await updateAdminTaskGovernanceApi(row.id, buildGovernanceActionPayload(row, preview, governanceStatus, note))
    ElMessage.success('治理结论已记录，未触发任务重试')
  } catch (error) {
    if (isTaskActionCancelled(error)) return
    ElMessage.error(getErrorMessage(error, '治理状态更新失败，请刷新预览后重试。'))
  } finally {
    governingId.value = null
    if (attempted) await fetchTasks()
  }
}

const isTaskActionCancelled = (error: unknown) => {
  const value = String(
    typeof error === 'object' && error !== null && 'action' in error
      ? (error as { action?: unknown }).action
      : (error as Error)?.message || error || ''
  ).toLowerCase()
  return value === 'cancel' || value === 'close'
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

const promptGovernanceNote = async (
  row: AsyncTaskVO,
  preview: AdminTaskGovernancePreviewVO,
  governanceStatus: string
) => {
  const action = governanceActionLabels[governanceStatus] || '更新任务治理状态'
  const confirmed = await confirmDangerActionPreview({
    title: `${action}预览`,
    action,
    target: `处理编号：${row.taskId || row.id}；任务类型：${taskTypeLabel(row.taskType)}；关联记录：${preview.bizType || row.bizType || '-'} / ${preview.bizId || row.bizId || '-'}`,
    impact: preview.impact || '仅记录治理结论，不会投递 MQ 消息或改变当前执行状态。',
    rollback: '治理结论可在刷新预览后重新分类；已实际重试的消息不能由本操作撤回。',
    audit: '会记录操作人、治理状态、处理说明、预览校验值和时间，便于审计补偿决策。',
    tips: [
      `失败分类：${failureClassLabel(preview.failureClass)}`,
      `建议责任方：${preview.recommendedOwner || '待确定'}`,
      `任务已停留：${preview.ageMinutes ?? 0} 分钟`,
      '此操作不会触发实际重试；实际重试需要单独使用“重试”按钮。'
    ],
    confirmButtonText: '继续填写说明'
  })
  if (!confirmed) return null
  const result = await ElMessageBox.prompt(
    `${preview.impact || '仅记录治理结论。'}\n请填写当前处置依据和后续责任方。`,
    action,
    {
      type: governanceStatus === 'MANUAL_ACTION_REQUIRED' ? 'warning' : 'info',
      inputType: 'textarea',
      inputPlaceholder: '例如：已确认模型供应商额度恢复，由平台值班人员执行后续重试',
      inputValidator: (value) => Boolean(String(value || '').trim()) || '请填写治理说明',
      confirmButtonText: '确认记录',
      cancelButtonText: '取消'
    }
  )
  return String(result.value || '').trim()
}

type RetryPreviewContract = AdminTaskImpactPreviewVO & { previewHash?: string }
type RetryTaskActionPayload = AdminTaskActionPayload & { previewHash: string }

const requireRetryPreviewHash = (preview: RetryPreviewContract) => {
  const previewHash = String(preview.previewHash || '').trim()
  if (!previewHash) {
    throw new Error('重试预览缺少校验值，请刷新后重新确认')
  }
  return previewHash
}

const buildTaskActionPayload = (
  operation: string,
  row: AsyncTaskVO,
  note: string,
  preview: RetryPreviewContract
): RetryTaskActionPayload => ({
  note,
  confirm: true,
  dryRun: false,
  reason: `${operation} confirmed for async task ${row.id}: ${note}`.slice(0, 300),
  idempotencyKey: createOperationIdempotencyKey(`${operation}-${row.id}`),
  previewHash: requireRetryPreviewHash(preview)
})

const buildGovernanceActionPayload = (
  row: AsyncTaskVO,
  preview: AdminTaskGovernancePreviewVO,
  governanceStatus: string,
  note: string
): AdminTaskGovernanceActionPayload => ({
  ...buildTaskActionPayload('admin-task-governance', row, note, preview),
  reason: `governance ${governanceStatus} confirmed for async task ${row.id}: ${note}`.slice(0, 300),
  idempotencyKey: createOperationIdempotencyKey(`admin-task-governance-${row.id}`),
  governanceStatus,
  governanceOwner: preview.recommendedOwner || undefined,
  previewHash: preview.previewHash
})

const handleSearch = () => { query.pageNo = 1; fetchTasks() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', type: '', governanceStatus: '', pageNo: 1, pageSize: 10 }); fetchTasks() }

watch(
  () => [route.query.status, route.query.type, route.query.keyword, route.query.governanceStatus, route.query.messageId, route.query.traceId, route.query.bizType, route.query.bizId],
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
  background: var(--app-surface-soft);
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
  display: grid;
  gap: 3px;
  min-width: 0;
  line-height: 1.45;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--app-danger, #dc2626);
    font-size: 13px;
    font-weight: 600;
  }

  small {
    color: var(--app-text-muted, #64748b);
  }
}

.task-error-preview--empty {
  color: var(--app-text-muted, #64748b);
}

.governance-cell {
  display: grid;
  gap: 4px;

  small {
    color: var(--app-text-muted, #64748b);
    font-size: 12px;
  }
}

.task-mobile-summary {
  display: none;
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

.technical-error {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
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

  .task-mobile-summary {
    display: grid;
    gap: 1px;
    border-bottom: 1px solid var(--app-border, #e5e7eb);
    background: var(--app-border, #e5e7eb);

    article {
      display: grid;
      gap: 8px;
      padding: 12px;
      background: var(--app-surface, #fff);
    }

    strong,
    span {
      display: block;
      overflow-wrap: anywhere;
    }

    span,
    small {
      margin-top: 3px;
      color: var(--app-text-muted, #64748b);
      font-size: 12px;
    }
  }

  .task-mobile-summary__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
}
</style>
