<template>
  <div class="page-shell agent-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">任务列表</h1>
        <p class="page-subtitle">按日期、类型、优先级和状态查看历史训练任务，继续推进未完成事项。</p>
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
              <strong>{{ displayTaskTitle(row) }}</strong>
              <span>{{ displayTaskDescription(row) }}</span>
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
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <div class="task-table-actions">
              <el-button
                v-if="row.status === 'TODO'"
                link
                type="primary"
                :loading="isTaskActionPending(row, 'start')"
                :disabled="isTaskPending(row)"
                @click="handleStartTask(row)"
              >
                开始
              </el-button>
              <el-button v-else-if="row.status === 'DOING'" link type="success" :disabled="isTaskPending(row)" @click="openCompleteDialog(row)">完成</el-button>
              <el-button
                v-else-if="row.status === 'SKIPPED'"
                link
                type="warning"
                :loading="isTaskActionPending(row, 'restore')"
                :disabled="isTaskPending(row)"
                @click="handleRestoreTask(row)"
              >
                恢复
              </el-button>
              <el-button v-else-if="row.status === 'DONE'" link disabled>已完成</el-button>
              <el-button v-else link type="primary" :disabled="isTaskPending(row)" @click="openCompleteDialog(row)">完成</el-button>
              <el-dropdown trigger="click">
                <el-button link type="info" :icon="MoreHorizontal">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.status !== 'DONE'" :disabled="isTaskPending(row)" @click="openCompleteDialog(row)">标记完成</el-dropdown-item>
                    <el-dropdown-item v-if="row.status !== 'DONE' && row.status !== 'SKIPPED'" :disabled="isTaskPending(row)" @click="openSkipDialog(row)">跳过任务</el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'SKIPPED'" :disabled="isTaskPending(row)" @click="handleRestoreTask(row)">恢复待办</el-dropdown-item>
                    <el-dropdown-item divided :disabled="isTaskPending(row)" @click="openFeedbackDialog(row)">提交反馈</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <AppState type="empty" title="暂无训练任务" description="当前筛选条件下没有任务记录，可以回到今日任务生成新的准备计划。" />
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
        <el-button type="primary" :loading="selectedTask ? isTaskActionPending(selectedTask, dialogMode) : false" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDialogVisible" title="Agent 反馈" width="460px">
      <el-form label-position="top">
        <el-form-item label="反馈类型">
          <el-select v-model="feedbackForm.feedbackType" style="width: 100%">
            <el-option v-for="item in feedbackTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="feedbackForm.comment" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="feedbackTask ? isTaskActionPending(feedbackTask, 'feedback') : false" @click="submitFeedback">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { CalendarDays, MoreHorizontal } from 'lucide-vue-next'
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
import { getErrorMessage as normalizeErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
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
  { label: '技能复习', value: 'SKILL_REVIEW' },
  { label: '知识复盘', value: 'KNOWLEDGE_REVIEW' }
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
  { label: '有帮助', value: 'HELPFUL' },
  { label: '没有帮助', value: 'NOT_HELPFUL' },
  { label: '内容不准确', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '疑似幻觉', value: 'HALLUCINATION' },
  { label: '太难', value: 'TOO_HARD' },
  { label: '太简单', value: 'TOO_EASY' },
  { label: '不相关', value: 'IRRELEVANT' }
]

type TaskAction = 'start' | 'complete' | 'skip' | 'restore' | 'feedback'

const pendingTaskActions = ref<Set<string>>(new Set())

const taskActionKey = (task: AgentTaskVO, action: TaskAction) => `${task.id}:${action}`
const isTaskActionPending = (task: AgentTaskVO, action: TaskAction) => pendingTaskActions.value.has(taskActionKey(task, action))
const isTaskPending = (task: AgentTaskVO) => Array.from(pendingTaskActions.value).some((key) => key.startsWith(`${task.id}:`))

const setTaskActionPending = (task: AgentTaskVO, action: TaskAction, pending: boolean) => {
  const next = new Set(pendingTaskActions.value)
  const key = taskActionKey(task, action)
  if (pending) {
    next.add(key)
  } else {
    next.delete(key)
  }
  pendingTaskActions.value = next
}

const withTaskPending = async (task: AgentTaskVO, action: TaskAction, handler: () => Promise<void>) => {
  if (isTaskActionPending(task, action)) return
  setTaskActionPending(task, action, true)
  try {
    await handler()
  } finally {
    setTaskActionPending(task, action, false)
  }
}

watch(dateRange, (value) => {
  query.startDate = Array.isArray(value) ? value[0] : ''
  query.endDate = Array.isArray(value) ? value[1] : ''
})

const getErrorMessage = (error: unknown) => {
  return normalizeErrorMessage(error, '请求失败，请稍后重试。')
}

const skillFromText = (value?: string) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const displayTaskTitle = (row: AgentTaskVO) => {
  const skill = row.relatedSkillName || skillFromText(row.title) || row.targetJobTitle || '目标技能'
  const map: Record<string, string> = {
    QUESTION_PRACTICE: `${skill} 面试题练习`,
    WRONG_QUESTION_REVIEW: `${skill} 错题复习`,
    INTERVIEW: '目标岗位模拟面试',
    RESUME_OPTIMIZE: `${skill} 简历证据优化`,
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 个人知识复盘`
  }
  return map[row.taskType || ''] || row.title || `Agent 任务 #${row.id}`
}

const displayTaskDescription = (row: AgentTaskVO) => {
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚证明目标技能和业务影响。',
    STUDY_TASK: '完成学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '从个人知识库中提取可复用的项目例子和面试表达。'
  }
  return map[row.taskType || ''] || row.description || '暂无描述'
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
  const task = selectedTask.value
  if (!task) return
  if (dialogMode.value === 'skip' && !note.value.trim()) {
    ElMessage.warning('请填写跳过原因')
    return
  }
  await withTaskPending(task, dialogMode.value, async () => {
    if (dialogMode.value === 'complete') {
      await completeAgentTaskApi(task.id, { note: note.value || undefined })
      ElMessage.success('任务已完成')
    } else {
      await skipAgentTaskApi(task.id, { skipReason: note.value || undefined })
      ElMessage.success('任务已跳过')
    }
    dialogVisible.value = false
    await fetchTasks()
  })
}

const handleStartTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'start', async () => {
    await startAgentTaskApi(task.id)
    ElMessage.success('任务已开始')
    await fetchTasks()
  })
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'restore', async () => {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('任务已恢复')
    await fetchTasks()
  })
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
  const task = feedbackTask.value
  if (!task) return
  await withTaskPending(task, 'feedback', async () => {
    await submitAgentFeedbackApi({
      agentTaskId: task.id,
      agentRunId: task.agentRunId,
      feedbackType: feedbackForm.feedbackType,
      comment: feedbackForm.comment || undefined
    })
    feedbackDialogVisible.value = false
    ElMessage.success('反馈已提交')
  })
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

.task-table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-table-actions :deep(.el-button) {
  margin-left: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
