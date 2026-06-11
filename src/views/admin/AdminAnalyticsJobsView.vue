<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">聚合任务</div>
        <h1 class="admin-hero__title">聚合任务日志</h1>
        <p class="admin-hero__desc">查看聚合任务日志，并按需重跑失败或过期任务。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-permission="'admin:analytics:job:run'"
          type="primary"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="openManualRun"
        >
          运行每日计划
        </el-button>
        <el-button :loading="loading" @click="fetchJobs">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>任务日志</h2>
          <p>聚合任务用于支撑运营首页和 AI 运营看板；可按排障场景调整表格密度和诊断列。</p>
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
          <el-form-item label="任务编码">
            <el-input v-model.trim="query.jobCode" clearable placeholder="如 AGENT_DAILY_PLAN" style="width: 220px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 150px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <AppState v-if="errorMessage" type="error" title="聚合任务加载失败" :description="errorMessage">
        <el-button type="primary" @click="fetchJobs">重试</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="jobs" row-key="id" :size="tableSize">
            <el-table-column v-if="isColumnVisible('id')" prop="id" label="任务编号" width="100" />
            <el-table-column v-if="isColumnVisible('jobCode')" prop="jobCode" label="任务编码" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('jobName')" label="任务名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateJobName(row.jobName || row.jobCode) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('status')" label="状态" width="120">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('statDate')" prop="statDate" label="统计日期" width="130" />
            <el-table-column v-if="isColumnVisible('durationMs')" prop="durationMs" label="耗时" width="120">
              <template #default="{ row }">{{ row.durationMs ?? '--' }} ms</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('errorMessage')" label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ translateFailureReason(row.errorMessage) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('outputJson')" label="输出" width="110">
              <template #default="{ row }">
                <el-button link type="primary" @click="openOutput(row.outputJson)">查看</el-button>
              </template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('startedAt')" prop="startedAt" label="开始时间" width="180" />
            <el-table-column v-if="isColumnVisible('finishedAt')" prop="finishedAt" label="结束时间" width="180" />
            <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'admin:analytics:job:run'"
                  link
                  type="primary"
                  :loading="rerunningId === row.id"
                  :disabled="pageActionDisabled"
                  :title="pageActionDisabledTitle"
                  @click="rerun(row)"
                >
                  重跑
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <AppState type="empty" :title="jobEmptyTitle" :description="jobEmptyDescription">
                <el-button v-if="hasJobFilters" type="primary" @click="handleReset">清空筛选</el-button>
                <el-button
                  v-else
                  v-permission="'admin:analytics:job:run'"
                  type="primary"
                  :disabled="pageActionDisabled"
                  :title="pageActionDisabledTitle"
                  @click="openManualRun"
                >
                  运行每日计划
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
            @change="fetchJobs"
          />
        </div>
      </template>
    </section>

    <el-dialog v-model="manualDialogVisible" title="运行每日计划聚合" width="620px">
      <el-form :model="manualForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="统计日期">
            <el-date-picker v-model="manualForm.statDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="目标岗位编号">
            <el-input-number v-model="manualForm.targetJobId" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="任务数量">
            <el-input-number v-model="manualForm.taskCount" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大总分钟数">
            <el-input-number v-model="manualForm.maxTotalMinutes" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="用户编号">
          <el-input v-model.trim="manualUserIds" placeholder="多个用户编号用英文逗号分隔，可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:analytics:job:run'"
          type="primary"
          :loading="manualRunning"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="runDailyPlan"
        >
          运行
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="outputDialogVisible" title="任务输出" width="720px">
      <pre class="json-preview">{{ outputDialogContent || '--' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminAnalyticsJobsApi, rerunAdminAnalyticsJobApi, runAdminAnalyticsDailyPlanApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminAnalyticsJobLogVO, AdminAnalyticsJobQuery } from '@/types/analytics'
import { translateFailureReason, translateJobName } from '@/utils/adminDisplay'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'

const statusOptions = [
  { label: '待执行', value: 'PENDING' },
  { label: '执行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '已取消', value: 'CANCELED' }
]
type JobColumnKey =
  | 'id'
  | 'jobCode'
  | 'jobName'
  | 'status'
  | 'statDate'
  | 'durationMs'
  | 'errorMessage'
  | 'outputJson'
  | 'startedAt'
  | 'finishedAt'
  | 'createdAt'
  | 'updatedAt'

const loading = ref(false)
const errorMessage = ref('')
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const total = ref(0)
const rerunningId = ref<number>()
const manualDialogVisible = ref(false)
const manualRunning = ref(false)
const manualUserIds = ref('')
const outputDialogVisible = ref(false)
const outputDialogContent = ref('')
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<JobColumnKey>('admin:analytics-jobs', [
  { key: 'id', label: '任务编号', defaultVisible: false },
  { key: 'jobCode', label: '任务编码', required: true },
  { key: 'jobName', label: '任务名称' },
  { key: 'status', label: '状态', required: true },
  { key: 'statDate', label: '统计日期' },
  { key: 'durationMs', label: '耗时' },
  { key: 'errorMessage', label: '错误信息' },
  { key: 'outputJson', label: '输出', defaultVisible: false },
  { key: 'startedAt', label: '开始时间' },
  { key: 'finishedAt', label: '结束时间', defaultVisible: false },
  { key: 'createdAt', label: '创建时间', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])

const query = reactive<AdminAnalyticsJobQuery>({
  pageNo: 1,
  pageSize: 10,
  jobCode: '',
  status: ''
})

const manualForm = reactive({
  statDate: '',
  targetJobId: undefined as number | undefined,
  taskCount: undefined as number | undefined,
  maxTotalMinutes: undefined as number | undefined
})
const hasJobFilters = computed(() => Boolean(query.jobCode || query.status))
const hasPageError = computed(() => Boolean(errorMessage.value))
const pageActionDisabled = computed(() => hasPageError.value || isAdminMobileReadonly.value)
const pageActionDisabledTitle = computed(() =>
  mobileReadonlyTitle(hasPageError.value ? '当前聚合任务加载失败，请先重试加载，确认任务状态后再执行运行或重跑。' : undefined)
)
const jobEmptyTitle = computed(() =>
  hasJobFilters.value ? '当前筛选没有聚合任务' : '暂无聚合任务日志'
)
const jobEmptyDescription = computed(() =>
  hasJobFilters.value
    ? '当前筛选条件下没有聚合任务。可以清空任务编码或状态筛选后重新查看，避免把筛选空误判为任务调度异常。'
    : '暂无聚合任务日志。手动运行每日计划或等待定时聚合后，可在这里查看状态、耗时、错误信息和输出。'
)

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const fetchJobs = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getAdminAnalyticsJobsApi(query)
    jobs.value = page.records || []
    total.value = page.total || 0
  } catch (error) {
    jobs.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchJobs()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 10,
    jobCode: '',
    status: ''
  })
  fetchJobs()
}

const openManualRun = () => {
  Object.assign(manualForm, {
    statDate: '',
    targetJobId: undefined,
    taskCount: undefined,
    maxTotalMinutes: undefined
  })
  manualUserIds.value = ''
  manualDialogVisible.value = true
}

const parseUserIds = () =>
  manualUserIds.value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)

const runDailyPlan = async () => {
  if (!guardAdminMobileWrite()) return
  const userIds = parseUserIds()
  const confirmed = await confirmDangerActionPreview({
    title: '运行每日计划高风险确认',
    action: '手动运行每日计划聚合',
    target: userIds.length ? `指定用户 ${userIds.length} 人：${userIds.join(', ')}` : '未指定用户，按任务规则筛选可生成计划的用户',
    impact: '可能为多个用户生成或刷新今日训练计划，并产生 AI 调用、任务日志和统计记录。',
    rollback: '已生成的计划无法自动撤销；如误执行，需要通过任务日志和业务记录人工排查。',
    audit: '系统会记录聚合任务日志，执行人、时间、任务参数可用于追踪。',
    tips: ['确认统计日期、目标岗位和任务数量参数正确。', '确认当前不是演示只读模式或共享演示环境。'],
    confirmButtonText: '确认运行'
  })
  if (!confirmed) return
  manualRunning.value = true
  try {
    await runAdminAnalyticsDailyPlanApi({
      jobCode: 'AGENT_DAILY_PLAN',
      jobName: '智能教练每日计划聚合',
      statDate: manualForm.statDate || undefined,
      userIds,
      targetJobId: manualForm.targetJobId,
      taskCount: manualForm.taskCount,
      maxTotalMinutes: manualForm.maxTotalMinutes
    })
    ElMessage.success('每日计划聚合任务已提交')
    manualDialogVisible.value = false
    await fetchJobs()
  } finally {
    manualRunning.value = false
  }
}

const openOutput = (content?: string) => {
  outputDialogContent.value = content || ''
  outputDialogVisible.value = true
}

const rerun = async (row: AdminAnalyticsJobLogVO) => {
  if (!guardAdminMobileWrite()) return
  const id = row.id
  const confirmed = await confirmDangerActionPreview({
    title: '重跑聚合任务高风险确认',
    action: `重跑聚合任务 ${translateJobName(row.jobName || row.jobCode)}`,
    target: `任务编号：${id}；统计日期：${row.statDate || '未提供'}`,
    impact: '会重新提交该任务，可能覆盖或追加统计结果，并产生新的任务执行记录。',
    rollback: '任务提交后不能直接撤销；如结果异常，需要依据任务输出和操作日志人工修正。',
    audit: '重跑请求会进入聚合任务日志，可通过任务编号和操作时间追踪。',
    tips: ['优先确认原任务失败原因已处理。', '避免对运行中任务重复提交。'],
    confirmButtonText: '确认重跑'
  })
  if (!confirmed) return
  rerunningId.value = id
  try {
    await rerunAdminAnalyticsJobApi(id)
    ElMessage.success('重跑请求已提交')
    await fetchJobs()
  } finally {
    rerunningId.value = undefined
  }
}

onMounted(fetchJobs)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
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

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
