<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ListChecks :size="16" />
          <span>Agent Tasks</span>
        </div>
        <h1 class="admin-hero__title">Agent 任务诊断</h1>
        <p class="admin-hero__desc">查看所有用户的 Agent 任务分布、状态和关联运行记录，用于 V4-A 基础诊断。</p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>任务明细</h2>
          <p>按用户、日期、类型、优先级和状态筛选 Agent task。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="用户 ID">
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

      <AppState v-if="errorMessage" type="error" title="Agent 任务加载失败" :description="errorMessage">
        <el-button type="primary" @click="fetchTasks">重试</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="tasks" row-key="id">
            <el-table-column prop="id" label="任务 ID" width="100" />
            <el-table-column prop="userId" label="用户 ID" width="100" />
            <el-table-column label="任务" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="task-cell">
                  <strong>{{ row.title || `Agent 任务 #${row.id}` }}</strong>
                  <span>{{ row.description || '暂无描述' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="targetJobTitle" label="目标岗位" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :map="statusMap" /></template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="100" />
            <el-table-column prop="taskType" label="类型" width="150" show-overflow-tooltip />
            <el-table-column label="耗时" width="90">
              <template #default="{ row }">{{ row.estimatedMinutes ?? '--' }}m</template>
            </el-table-column>
            <el-table-column prop="dueDate" label="日期" width="120" />
            <el-table-column label="运行" width="100">
              <template #default="{ row }">
                <el-button v-if="row.agentRunId" link type="primary" @click="openRun(row.agentRunId)">Run</el-button>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <template #empty>
              <AppState type="empty" title="暂无 Agent 任务" description="当前筛选条件下没有真实任务数据。" />
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
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminAgentTasksApi } from '@/api/adminAgent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AdminAgentTaskQueryDTO, AgentTaskVO } from '@/types/agent'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const tasks = ref<AgentTaskVO[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | ''>('')

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

const statusOptions = [
  { label: '待完成', value: 'TODO' },
  { label: '进行中', value: 'DOING' },
  { label: '已完成', value: 'DONE' },
  { label: '已跳过', value: 'SKIPPED' },
  { label: '已过期', value: 'EXPIRED' }
]

const statusMap = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))

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
</style>
