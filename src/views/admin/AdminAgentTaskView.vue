<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ListChecks :size="16" />
          <span>生成任务处理</span>
        </div>
        <h1 class="admin-hero__title">生成任务处理</h1>
        <p class="admin-hero__desc">查看所有用户的智能任务分布、状态和关联计划记录，用于核对生成进度与失败原因。</p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>任务明细</h2>
          <p>按用户、日期、类型、优先级和状态筛选智能任务。</p>
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

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="errorMessage ? [] : tasks" row-key="id" :size="tableSize">
            <el-table-column v-if="isColumnVisible('id')" prop="id" label="任务编号" width="100" />
            <el-table-column v-if="isColumnVisible('userId')" prop="userId" label="用户编号" width="100" />
            <el-table-column v-if="isColumnVisible('task')" label="任务" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="task-cell">
                  <strong>{{ displayTaskTitle(row) }}</strong>
                  <span>{{ displayTaskDescription(row) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('targetJobTitle')" prop="targetJobTitle" label="目标岗位" min-width="160" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('status')" label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :map="statusMap" /></template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('priority')" label="优先级" width="100"><template #default="{ row }">{{ priorityLabel(row.priority) }}</template></el-table-column>
            <el-table-column v-if="isColumnVisible('taskType')" label="类型" width="150" show-overflow-tooltip><template #default="{ row }">{{ taskTypeLabel(row.taskType) }}</template></el-table-column>
            <el-table-column v-if="isColumnVisible('estimatedMinutes')" label="耗时" width="90">
              <template #default="{ row }">{{ row.estimatedMinutes ?? '--' }}m</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('dueDate')" prop="dueDate" label="日期" width="120" />
            <el-table-column v-if="isColumnVisible('source')" label="来源" min-width="170" show-overflow-tooltip>
              <template #default="{ row }">{{ formatTaskSource(row) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('traceId')" prop="traceId" label="追踪号" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('run')" label="运行" width="100">
              <template #default="{ row }">
                <el-button v-if="row.agentRunId" link type="primary" @click="openRun(row.agentRunId)">详情</el-button>
                <span v-else>--</span>
              </template>
            </el-table-column>
          <template #empty>
            <AppState
              :type="errorMessage ? 'error' : 'empty'"
              :title="errorMessage ? '生成任务加载失败' : taskEmptyTitle"
              :description="errorMessage || taskEmptyDescription"
            >
              <el-button v-if="errorMessage" type="primary" @click="fetchTasks">重试</el-button>
              <el-button v-else-if="hasTaskFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else @click="fetchTasks">刷新任务</el-button>
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
          @change="fetchTasks"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminAgentTasksApi } from '@/api/adminAgent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminAgentTaskQueryDTO, AgentTaskVO } from '@/types/agent'
import { toFriendlyMessage } from '@/utils/error'

type AgentTaskColumnKey =
  | 'id'
  | 'userId'
  | 'task'
  | 'targetJobTitle'
  | 'status'
  | 'priority'
  | 'taskType'
  | 'estimatedMinutes'
  | 'dueDate'
  | 'source'
  | 'traceId'
  | 'run'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const tasks = ref<AgentTaskVO[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | ''>('')
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AgentTaskColumnKey>('admin:agent-task', [
  { key: 'id', label: '任务编号', required: true },
  { key: 'userId', label: '用户编号' },
  { key: 'task', label: '任务', required: true },
  { key: 'targetJobTitle', label: '目标岗位' },
  { key: 'status', label: '状态', required: true },
  { key: 'priority', label: '优先级' },
  { key: 'taskType', label: '类型' },
  { key: 'estimatedMinutes', label: '耗时' },
  { key: 'dueDate', label: '日期' },
  { key: 'source', label: '来源', defaultVisible: false },
  { key: 'traceId', label: '追踪号', defaultVisible: false },
  { key: 'run', label: '运行' }
])

const query = reactive<AdminAgentTaskQueryDTO>({
  pageNum: 1,
  pageSize: 10,
  userId: undefined,
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
const taskTypeMap = Object.fromEntries(taskTypeOptions.map((item) => [item.value, item.label]))
const priorityMap: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }

const statusOptions = [
  { label: '待完成', value: 'TODO' },
  { label: '进行中', value: 'DOING' },
  { label: '已完成', value: 'DONE' },
  { label: '已跳过', value: 'SKIPPED' },
  { label: '已过期', value: 'EXPIRED' }
]

const statusMap = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))
const hasTaskFilters = computed(() =>
  Boolean(query.userId || query.startDate || query.endDate || query.taskType || query.status || query.priority)
)
const taskEmptyTitle = computed(() => hasTaskFilters.value ? '没有匹配当前筛选的智能任务' : '暂无智能任务')
const taskEmptyDescription = computed(() => {
  if (hasTaskFilters.value) {
    return '当前筛选条件下没有智能任务。清空用户、日期、类型、状态或优先级筛选后，可确认是否真的没有任务数据。'
  }
  return '当前还没有智能任务。用户生成今日计划并保存任务后，这里会展示任务类型、优先级、状态和关联运行记录。'
})

const skillFromText = (value?: string) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const readableTaskText = (value?: string) => {
  const text = value?.trim()
  if (!text) return ''
  return /^[A-Z0-9_:.#-]+$/.test(text) ? '' : text
}

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
    KNOWLEDGE_REVIEW: `${skill} 表达素材复盘`
  }
  return map[row.taskType || ''] || readableTaskText(row.title) || `任务编号 ${row.id}`
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
    KNOWLEDGE_REVIEW: '从项目经历、训练记录或面试工具中提取可复用表达。'
  }
  return map[row.taskType || ''] || readableTaskText(row.description) || '暂无描述'
}

const taskTypeLabel = (value?: string) => taskTypeMap[value || ''] || (value ? '任务类型待确认' : '--')
const priorityLabel = (value?: string) => priorityMap[value || ''] || (value ? '优先级待确认' : '--')
const taskSourceTypeMap: Record<string, string> = {
  TARGET_JOB: '目标岗位',
  RESUME_MATCH: '简历匹配',
  TRAINING_MATERIAL: '训练素材',
  QUESTION: '题目',
  INTERVIEW: '面试',
  RESUME: '简历',
  AGENT_RUN: '计划生成记录'
}

const formatTaskSource = (row: AgentTaskVO) => {
  const type = row.sourceType || row.relatedBizType || ''
  const id = row.sourceId ?? row.relatedBizId
  if (!type && !id) return '--'
  const typeLabel = taskSourceTypeMap[String(type).toUpperCase()] || (type ? '关联来源' : '来源')
  return [typeLabel, id ? `来源编号 ${id}` : ''].filter(Boolean).join(' ')
}

watch(dateRange, (value) => {
  query.startDate = Array.isArray(value) ? value[0] : ''
  query.endDate = Array.isArray(value) ? value[1] : ''
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '生成任务列表加载失败，请稍后重试。')
  }
  return '生成任务列表加载失败，请稍后重试。'
}

const fetchTasks = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAdminAgentTasksApi(query)
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
    userId: undefined,
    startDate: '',
    endDate: '',
    taskType: '',
    status: '',
    priority: ''
  })
  fetchTasks()
}

const openRun = (runId: number) => {
  router.push({ path: '/admin/agent/runs', query: { runId } })
}

onMounted(fetchTasks)
</script>

<style scoped lang="scss">
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
</style>
