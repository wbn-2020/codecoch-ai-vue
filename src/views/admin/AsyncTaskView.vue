<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Timer :size="16" /><span>Task Center</span></div>
        <h1 class="admin-hero__title">异步任务中心</h1>
        <p class="admin-hero__desc">查看后台任务、失败原因和死信状态，并对失败任务发起重试。</p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="任务名 / 业务 ID" /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 140px">
              <el-option label="等待" value="PENDING" />
              <el-option label="执行中" value="RUNNING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="死信" value="DEAD_LETTER" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型"><el-input v-model.trim="query.type" clearable placeholder="taskType" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="tasks" row-key="id">
          <el-table-column prop="taskName" label="任务" min-width="180" show-overflow-tooltip />
          <el-table-column prop="taskType" label="类型" min-width="150" show-overflow-tooltip />
          <el-table-column prop="bizId" label="业务 ID" min-width="130" show-overflow-tooltip />
          <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column label="重试" width="90"><template #default="{ row }">{{ row.retryCount ?? 0 }}/{{ row.maxRetryCount ?? '-' }}</template></el-table-column>
          <el-table-column label="死信" width="90"><template #default="{ row }"><el-tag v-if="isDead(row)" type="danger">是</el-tag><span v-else>否</span></template></el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="失败原因" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.errorMessage || '-' }}</template></el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link type="warning" :disabled="!canRetry(row)" @click="handleRetry(row)">重试</el-button>
              <el-button link type="danger" :disabled="!isDead(row)" @click="handleDeadRetry(row)">死信重试</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchTasks" />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="任务详情" size="680px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="任务 ID">{{ detail.taskId || detail.id }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ detail.taskType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)">{{ detail.status }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="业务">{{ detail.bizType || '-' }} / {{ detail.bizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误">{{ detail.errorMessage || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Payload"><pre>{{ detail.payload || '-' }}</pre></el-descriptions-item>
        <el-descriptions-item label="Result"><pre>{{ detail.result || '-' }}</pre></el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminTaskDetailApi, getAdminTasksApi, retryAdminDeadLetterTaskApi, retryAdminTaskApi } from '@/api/adminGovernance'
import type { AdminListQuery, AsyncTaskVO } from '@/types/adminGovernance'

const loading = ref(false)
const drawerVisible = ref(false)
const tasks = ref<AsyncTaskVO[]>([])
const detail = ref<AsyncTaskVO | null>(null)
const total = ref(0)
const query = reactive<AdminListQuery>({ keyword: '', status: '', type: '', pageNo: 1, pageSize: 10 })

const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'DONE'].includes(value)) return 'success'
  if (['FAILED', 'ERROR', 'DEAD_LETTER'].includes(value)) return 'danger'
  if (['RUNNING', 'PROCESSING'].includes(value)) return 'warning'
  return 'info'
}
const isDead = (row: AsyncTaskVO) => row.deadLetter === true || row.deadLetter === 1 || String(row.status).toUpperCase() === 'DEAD_LETTER'
const canRetry = (row: AsyncTaskVO) => ['FAILED', 'ERROR', 'DEAD_LETTER'].includes(String(row.status).toUpperCase())

const fetchTasks = async () => {
  loading.value = true
  try {
    const result = await getAdminTasksApi(query)
    tasks.value = result.records || []
    total.value = result.total || 0
  } catch {
    tasks.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: AsyncTaskVO) => {
  detail.value = await getAdminTaskDetailApi(row.id)
  drawerVisible.value = true
}

const handleRetry = async (row: AsyncTaskVO) => {
  await ElMessageBox.confirm(`确认重试任务 ${row.taskName || row.id}？`, '重试确认', { type: 'warning' })
  await retryAdminTaskApi(row.id)
  ElMessage.success('已提交重试')
  await fetchTasks()
}

const handleDeadRetry = async (row: AsyncTaskVO) => {
  await ElMessageBox.confirm(`确认从死信队列重试任务 ${row.taskName || row.id}？`, '死信重试确认', { type: 'warning' })
  await retryAdminDeadLetterTaskApi(row.id)
  ElMessage.success('已提交死信重试')
  await fetchTasks()
}

const handleSearch = () => { query.pageNo = 1; fetchTasks() }
const handleReset = () => { Object.assign(query, { keyword: '', status: '', type: '', pageNo: 1, pageSize: 10 }); fetchTasks() }

onMounted(fetchTasks)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
pre { overflow: auto; max-height: 220px; margin: 0; white-space: pre-wrap; word-break: break-word; }
</style>
