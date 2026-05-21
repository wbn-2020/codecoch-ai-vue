<template>
  <div class="page-shell agent-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Agent 任务列表</h1>
        <p class="page-subtitle">按日期、类型、优先级和状态查询历史任务，操作会直接调用 V4-A 任务接口。</p>
      </div>
      <el-button type="primary" :icon="CalendarDays" @click="router.push('/agent/today')">今日计划</el-button>
    </section>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" class="agent-filter" inline>
          <el-form-item label="日期">
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.taskType" clearable placeholder="全部类型" style="width: 160px">
              <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="query.priority" clearable placeholder="全部" style="width: 120px">
              <el-option label="高" value="HIGH" />
              <el-option label="中" value="MEDIUM" />
              <el-option label="低" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="任务列表加载失败" :description="errorMessage">
      <el-button type="primary" @click="fetchTasks">重试</el-button>
    </AppState>

    <section v-else class="table-card">
      <el-table v-loading="loading" :data="tasks" row-key="id">
        <el-table-column prop="dueDate" label="日期" width="120" />
        <el-table-column label="任务" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="task-cell">
              <strong>{{ row.title || `Agent 任务 #${row.id}` }}</strong>
              <span>{{ row.description || '暂无描述' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="140">
          <template #default="{ row }">{{ getTaskTypeLabel(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">{{ getPriorityLabel(row.priority) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="{ row }">{{ row.estimatedMinutes ?? '-' }}m</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" :map="statusMap" /></template>
        </el-table-column>
        <el-table-column label="运行" width="90">
          <template #default="{ row }">
            <el-button v-if="row.agentRunId" link type="primary" @click="router.push(`/agent/runs/${row.agentRunId}`)">详情</el-button>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="row.status !== 'TODO'" @click="handleStartTask(row)">Start</el-button>
            <el-button link type="primary" :disabled="row.status === 'DONE'" @click="openCompleteDialog(row)">完成</el-button>
            <el-button link type="info" :disabled="row.status === 'DONE' || row.status === 'SKIPPED'" @click="openSkipDialog(row)">跳过</el-button>
            <el-button link type="warning" :disabled="row.status !== 'SKIPPED'" @click="handleRestoreTask(row)">Restore</el-button>
            <el-button link type="info" @click="openFeedbackDialog(row)">Feedback</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <AppState type="empty" title="暂无 Agent 任务" description="当前筛选条件下没有真实任务记录。" />
        </template>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchTasks"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'complete' ? '完成任务' : '跳过任务'" width="460px">
      <el-input v-model="note" type="textarea" :rows="4" :placeholder="dialogMode === 'complete' ? '可填写完成备注' : '请填写跳过原因'" maxlength="200" show-word-limit />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="mutating" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDialogVisible" title="Agent feedback" width="460px">
      <el-form label-position="top">
        <el-form-item label="Feedback type">
          <el-select v-model="feedbackForm.feedbackType" style="width: 100%">
            <el-option v-for="item in feedbackTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Comment">
          <el-input v-model="feedbackForm.comment" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="mutating" @click="submitFeedback">Submit</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { CalendarDays } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  getAgentTasksApi,
  restoreAgentTaskApi,
  skipAgentTaskApi,
  startAgentTaskApi,
  submitAgentFeedbackApi
} from '@/api/agent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AgentTaskQueryDTO, AgentTaskVO } from '@/types/agent'

const router = useRouter()
const loading = ref(false)
const mutating = ref(false)
const errorMessage = ref('')
const tasks = ref<AgentTaskVO[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | ''>('')
const dialogVisible = ref(false)
const dialogMode = ref<'complete' | 'skip'>('complete')
const selectedTask = ref<AgentTaskVO>()
const note = ref('')
const feedbackDialogVisible = ref(false)
const feedbackTask = ref<AgentTaskVO>()
const feedbackForm = reactive({
  feedbackType: 'HELPFUL',
  comment: ''
})

const query = reactive<AgentTaskQueryDTO>({
  pageNum: 1,
  pageSize: 10,
  startDate: '',
  endDate: '',
  taskType: '',
  status: '',
  priority: ''
})

const taskTypeOptions = [
  { label: '刷题练习', value: 'QUESTION_PRACTICE' },
  { label: '错题复习', value: 'WRONG_QUESTION_REVIEW' },
  { label: '模拟面试', value: 'INTERVIEW' },
  { label: '简历优化', value: 'RESUME_OPTIMIZE' },
  { label: '学习任务', value: 'STUDY_TASK' },
  { label: '报告复盘', value: 'REPORT_REVIEW' },
  { label: '技能复习', value: 'SKILL_REVIEW' }
]

const statusOptions = [
  { label: '待完成', value: 'TODO' },
  { label: '进行中', value: 'DOING' },
  { label: '已完成', value: 'DONE' },
  { label: '已跳过', value: 'SKIPPED' },
  { label: '已过期', value: 'EXPIRED' }
]

const statusMap = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))
const priorityMap: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }
const feedbackTypeOptions = [
  { label: 'Helpful', value: 'HELPFUL' },
  { label: 'Not helpful', value: 'NOT_HELPFUL' },
  { label: 'Too hard', value: 'TOO_HARD' },
  { label: 'Too easy', value: 'TOO_EASY' },
  { label: 'Irrelevant', value: 'IRRELEVANT' }
]

watch(dateRange, (value) => {
  query.startDate = Array.isArray(value) ? value[0] : ''
  query.endDate = Array.isArray(value) ? value[1] : ''
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const getTaskTypeLabel = (value?: string) => taskTypeOptions.find((item) => item.value === value)?.label || value || '--'
const getPriorityLabel = (value?: string) => priorityMap[value || ''] || value || '--'

const fetchTasks = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAgentTasksApi(query)
    tasks.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    tasks.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNum = 1
  fetchTasks()
}

const handleReset = () => {
  dateRange.value = ''
  Object.assign(query, {
    pageNum: 1,
    pageSize: 10,
    startDate: '',
    endDate: '',
    taskType: '',
    status: '',
    priority: ''
  })
  fetchTasks()
}

const openCompleteDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  dialogMode.value = 'complete'
  note.value = ''
  dialogVisible.value = true
}

const openSkipDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  dialogMode.value = 'skip'
  note.value = ''
  dialogVisible.value = true
}

const submitAction = async () => {
  if (!selectedTask.value) return
  mutating.value = true
  try {
    if (dialogMode.value === 'complete') {
      await completeAgentTaskApi(selectedTask.value.id, { note: note.value || undefined })
      ElMessage.success('任务已完成')
    } else {
      await skipAgentTaskApi(selectedTask.value.id, { skipReason: note.value || undefined })
      ElMessage.success('任务已跳过')
    }
    dialogVisible.value = false
    await fetchTasks()
  } finally {
    mutating.value = false
  }
}

const handleStartTask = async (task: AgentTaskVO) => {
  mutating.value = true
  try {
    await startAgentTaskApi(task.id)
    ElMessage.success('Task started')
    await fetchTasks()
  } finally {
    mutating.value = false
  }
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  mutating.value = true
  try {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('Task restored')
    await fetchTasks()
  } finally {
    mutating.value = false
  }
}

const openFeedbackDialog = (task: AgentTaskVO) => {
  feedbackTask.value = task
  Object.assign(feedbackForm, {
    feedbackType: 'HELPFUL',
    comment: ''
  })
  feedbackDialogVisible.value = true
}

const submitFeedback = async () => {
  if (!feedbackTask.value) return
  mutating.value = true
  try {
    await submitAgentFeedbackApi({
      agentTaskId: feedbackTask.value.id,
      agentRunId: feedbackTask.value.agentRunId,
      feedbackType: feedbackForm.feedbackType,
      comment: feedbackForm.comment || undefined
    })
    feedbackDialogVisible.value = false
    ElMessage.success('Feedback submitted')
  } finally {
    mutating.value = false
  }
}

onMounted(fetchTasks)
</script>

<style scoped lang="scss">
.agent-filter {
  row-gap: 8px;
}

.task-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.task-cell strong,
.task-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-cell span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
