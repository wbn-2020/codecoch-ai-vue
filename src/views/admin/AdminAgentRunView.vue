<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>Agent 可观测</span>
        </div>
        <h1 class="admin-hero__title">Agent 运行记录</h1>
        <p class="admin-hero__desc">查询 JobCoachAgent 运行状态、触发方式、模型、耗时和错误信息。</p>
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
          <p>按用户、状态、触发方式和时间范围筛选 Agent run。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="用户 ID">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="Agent">
            <el-input v-model.trim="query.agentType" clearable placeholder="JOB_COACH" style="width: 160px" />
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

      <AppState v-if="errorMessage" type="error" title="运行记录加载失败" :description="errorMessage">
        <el-button type="primary" @click="fetchRuns">重试</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="runs" row-key="id">
            <el-table-column prop="id" label="运行 ID" width="100" />
            <el-table-column prop="userId" label="用户 ID" width="100" />
            <el-table-column prop="agentType" label="Agent" min-width="130" show-overflow-tooltip />
            <el-table-column prop="targetJobTitle" label="目标岗位" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :map="runStatusMap" /></template>
            </el-table-column>
            <el-table-column prop="triggerType" label="触发" width="100" />
            <el-table-column prop="modelName" label="模型" min-width="140" show-overflow-tooltip />
            <el-table-column label="耗时" width="110">
              <template #default="{ row }">{{ row.durationMs ?? '--' }} ms</template>
            </el-table-column>
            <el-table-column prop="errorMessage" label="错误信息" min-width="180" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" min-width="170" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRunDetail(row.id)">详情</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <AppState type="empty" title="暂无 Agent 运行记录" description="当前筛选条件下没有运行数据。" />
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
      </template>
    </section>

    <el-dialog v-model="detailVisible" title="Agent 运行详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-loading="detailLoading" class="admin-detail-dialog__body run-detail-dialog">
        <AppState v-if="detailError" type="error" title="运行详情加载失败" :description="detailError">
          <el-button type="primary" @click="detailId && openRunDetail(detailId)">重试</el-button>
        </AppState>
        <template v-else-if="detail">
          <div class="run-detail-head">
            <div>
              <span>运行 #{{ detail.id }}</span>
              <h3>{{ detail.targetJobTitle || detail.agentType || 'JobCoachAgent' }}</h3>
            </div>
            <StatusTag :status="detail.status" :map="runStatusMap" />
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户 ID">{{ detail.userId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ detail.username || '--' }}</el-descriptions-item>
            <el-descriptions-item label="Agent 类型">{{ detail.agentType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="触发方式">{{ detail.triggerType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="Prompt 类型">{{ detail.promptType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="Prompt 版本">{{ detail.promptVersionId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="模型">{{ detail.modelName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="AI 日志 ID">{{ detail.aiCallLogId ?? '--' }}</el-descriptions-item>
            <el-descriptions-item label="耗时">{{ detail.durationMs ?? '--' }} ms</el-descriptions-item>
            <el-descriptions-item label="Trace ID">{{ detail.traceId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="错误码">{{ detail.errorCode || '--' }}</el-descriptions-item>
            <el-descriptions-item label="错误信息">{{ detail.errorMessage || '--' }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section">
            <h4>生成任务</h4>
            <el-table :data="detail.tasks || []" row-key="id">
              <el-table-column prop="title" label="任务" min-width="220" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="110">
                <template #default="{ row }"><StatusTag :status="row.status" :map="taskStatusMap" /></template>
              </el-table-column>
              <el-table-column prop="priority" label="优先级" width="100" />
              <el-table-column prop="dueDate" label="日期" width="120" />
              <template #empty>
                <el-empty description="本次运行没有任务产物" />
              </template>
            </el-table>
          </div>

          <el-collapse class="detail-section">
            <el-collapse-item title="输入快照">
              <pre class="json-box">{{ formatJson(detail.inputSnapshot) }}</pre>
            </el-collapse-item>
            <el-collapse-item title="结构化输出">
              <pre class="json-box">{{ formatJson(detail.output) }}</pre>
            </el-collapse-item>
            <el-collapse-item v-if="detail.rawOutputText" title="AI 原始输出">
              <pre class="json-box">{{ detail.rawOutputText }}</pre>
            </el-collapse-item>
          </el-collapse>
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

import { getAdminAgentRunDetailApi, getAdminAgentRunsApi } from '@/api/adminAgent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AdminAgentRunQueryDTO, AgentRunDetailVO } from '@/types/agent'

const route = useRoute()
const loading = ref(false)
const detailLoading = ref(false)
const errorMessage = ref('')
const detailError = ref('')
const runs = ref<AgentRunDetailVO[]>([])
const detail = ref<AgentRunDetailVO>()
const detailId = ref<number>()
const total = ref(0)
const timeRange = ref<[string, string] | ''>('')
const detailVisible = ref(false)

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

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const formatJson = (value: unknown) => {
  if (!value) return '--'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
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
  try {
    detail.value = await getAdminAgentRunDetailApi(id)
  } catch (error) {
    detail.value = undefined
    detailError.value = getErrorMessage(error)
  } finally {
    detailLoading.value = false
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

onMounted(fetchRuns)
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
</style>
