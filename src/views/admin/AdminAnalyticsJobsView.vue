<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">Analytics Jobs</div>
        <h1 class="admin-hero__title">Analytics jobs</h1>
        <p class="admin-hero__desc">Inspect V4 aggregation job logs and rerun a failed or stale job when the backend exposes the rerun API.</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :loading="loading" @click="fetchJobs">Refresh</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="Job code">
            <el-input v-model.trim="query.jobCode" clearable placeholder="DAILY_AGENT_METRIC" style="width: 220px" />
          </el-form-item>
          <el-form-item label="Status">
            <el-select v-model="query.status" clearable placeholder="All" style="width: 150px">
              <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">Search</el-button>
            <el-button @click="handleReset">Reset</el-button>
          </el-form-item>
        </el-form>
      </div>

      <AppState v-if="errorMessage" type="error" title="Analytics jobs failed to load" :description="errorMessage">
        <el-button type="primary" @click="fetchJobs">Retry</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="jobs" row-key="id">
            <el-table-column prop="jobCode" label="Job code" min-width="180" show-overflow-tooltip />
            <el-table-column prop="jobName" label="Name" min-width="180" show-overflow-tooltip />
            <el-table-column label="Status" width="120">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column prop="statDate" label="Stat date" width="130" />
            <el-table-column prop="durationMs" label="Duration" width="120">
              <template #default="{ row }">{{ row.durationMs ?? '--' }} ms</template>
            </el-table-column>
            <el-table-column prop="errorMessage" label="Error" min-width="220" show-overflow-tooltip />
            <el-table-column prop="startedAt" label="Started" width="180" />
            <el-table-column prop="finishedAt" label="Finished" width="180" />
            <el-table-column label="Action" width="120" fixed="right">
              <template #default="{ row }">
                <el-button v-permission="'admin:analytics:job:run'" link type="primary" :loading="rerunningId === row.id" @click="rerun(row.id)">Rerun</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="No analytics job logs" />
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
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import { getAdminAnalyticsJobsApi, rerunAdminAnalyticsJobApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AdminAnalyticsJobLogVO, AdminAnalyticsJobQuery } from '@/types/analytics'

const statusOptions = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELED']
const loading = ref(false)
const errorMessage = ref('')
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const total = ref(0)
const rerunningId = ref<number>()

const query = reactive<AdminAnalyticsJobQuery>({
  pageNo: 1,
  pageSize: 10,
  jobCode: '',
  status: ''
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
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

const rerun = async (id: number) => {
  await ElMessageBox.confirm('Confirm rerun this analytics job?', 'Rerun confirmation', { type: 'warning' })
  rerunningId.value = id
  try {
    await rerunAdminAnalyticsJobApi(id)
    ElMessage.success('Rerun requested')
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
</style>
