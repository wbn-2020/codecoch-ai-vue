<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">Analytics Dictionary</div>
        <h1 class="admin-hero__title">Metric dictionary</h1>
        <p class="admin-hero__desc">Read the metric code, definition, data source, and refresh frequency from the V4 analytics dictionary API.</p>
      </div>
      <div class="admin-hero__actions">
        <el-button v-permission="'admin:analytics:metric:write'" type="primary" @click="openMetricDialog()">New metric</el-button>
        <el-button :loading="loading" @click="fetchMetrics">Refresh</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="Keyword">
            <el-input v-model.trim="query.keyword" clearable placeholder="metric code or name" style="width: 220px" />
          </el-form-item>
          <el-form-item label="Category">
            <el-input v-model.trim="query.category" clearable placeholder="AGENT / AI / TRAINING" style="width: 180px" />
          </el-form-item>
          <el-form-item label="Enabled">
            <el-select v-model="query.enabled" clearable placeholder="All" style="width: 120px">
              <el-option label="Enabled" :value="1" />
              <el-option label="Disabled" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">Search</el-button>
            <el-button @click="handleReset">Reset</el-button>
          </el-form-item>
        </el-form>
      </div>

      <AppState v-if="errorMessage" type="error" title="Metric dictionary failed to load" :description="errorMessage">
        <el-button type="primary" @click="fetchMetrics">Retry</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="metrics" row-key="id">
            <el-table-column prop="metricCode" label="Metric code" min-width="180" show-overflow-tooltip />
            <el-table-column prop="metricName" label="Name" min-width="180" show-overflow-tooltip />
            <el-table-column prop="category" label="Category" width="130" />
            <el-table-column prop="definition" label="Definition" min-width="260" show-overflow-tooltip />
            <el-table-column prop="dataSource" label="Data source" min-width="160" show-overflow-tooltip />
            <el-table-column prop="refreshFrequency" label="Refresh" width="140" />
            <el-table-column label="Enabled" width="110">
              <template #default="{ row }">
                <StatusTag :status="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="Action" width="100" fixed="right">
              <template #default="{ row }">
                <el-button v-permission="'admin:analytics:metric:write'" link type="primary" @click="openMetricDialog(row)">Edit</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="No metric definitions" />
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
            @change="fetchMetrics"
          />
        </div>
      </template>
    </section>

    <el-dialog v-model="metricDialogVisible" :title="metricForm.id ? 'Edit metric' : 'New metric'" width="680px">
      <el-form :model="metricForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="Metric code" required>
            <el-input v-model.trim="metricForm.metricCode" placeholder="AGENT_SUCCESS_RATE" />
          </el-form-item>
          <el-form-item label="Metric name" required>
            <el-input v-model.trim="metricForm.metricName" placeholder="Agent success rate" />
          </el-form-item>
          <el-form-item label="Category">
            <el-input v-model.trim="metricForm.category" placeholder="AGENT / AI / TRAINING" />
          </el-form-item>
          <el-form-item label="Refresh frequency">
            <el-input v-model.trim="metricForm.refreshFrequency" placeholder="DAILY" />
          </el-form-item>
        </div>
        <el-form-item label="Definition">
          <el-input v-model="metricForm.definition" type="textarea" :rows="4" placeholder="Metric definition" />
        </el-form-item>
        <el-form-item label="Data source">
          <el-input v-model.trim="metricForm.dataSource" placeholder="agent_run / agent_task / ai_call_log" />
        </el-form-item>
        <el-form-item label="Enabled">
          <el-switch v-model="metricEnabled" active-text="Enabled" inactive-text="Disabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="metricDialogVisible = false">Cancel</el-button>
        <el-button v-permission="'admin:analytics:metric:write'" type="primary" :loading="savingMetric" @click="saveMetric">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { createAdminAnalyticsMetricApi, getAdminAnalyticsMetricsApi, updateAdminAnalyticsMetricApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AdminAnalyticsDictionaryQuery, AdminAnalyticsMetricDefinitionVO } from '@/types/analytics'

const loading = ref(false)
const errorMessage = ref('')
const metrics = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const total = ref(0)
const metricDialogVisible = ref(false)
const savingMetric = ref(false)

const query = reactive<AdminAnalyticsDictionaryQuery>({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  category: '',
  enabled: ''
})

const metricForm = reactive({
  id: undefined as number | undefined,
  metricCode: '',
  metricName: '',
  category: '',
  definition: '',
  dataSource: '',
  refreshFrequency: '',
  enabled: 1
})

const metricEnabled = computed({
  get: () => metricForm.enabled === 1,
  set: (value: boolean) => {
    metricForm.enabled = value ? 1 : 0
  }
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
}

const fetchMetrics = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getAdminAnalyticsMetricsApi(query)
    metrics.value = page.records || []
    total.value = page.total || 0
  } catch (error) {
    metrics.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openMetricDialog = (row?: AdminAnalyticsMetricDefinitionVO) => {
  Object.assign(metricForm, {
    id: row?.id,
    metricCode: row?.metricCode || '',
    metricName: row?.metricName || '',
    category: row?.category || '',
    definition: row?.definition || '',
    dataSource: row?.dataSource || '',
    refreshFrequency: row?.refreshFrequency || '',
    enabled: row?.enabled ?? 1
  })
  metricDialogVisible.value = true
}

const saveMetric = async () => {
  if (!metricForm.metricCode.trim() || !metricForm.metricName.trim()) {
    ElMessage.warning('Metric code and name are required')
    return
  }
  savingMetric.value = true
  try {
    const payload = {
      metricCode: metricForm.metricCode.trim(),
      metricName: metricForm.metricName.trim(),
      category: metricForm.category.trim(),
      definition: metricForm.definition,
      dataSource: metricForm.dataSource.trim(),
      refreshFrequency: metricForm.refreshFrequency.trim(),
      enabled: metricForm.enabled
    }
    if (metricForm.id) {
      await updateAdminAnalyticsMetricApi(metricForm.id, payload)
    } else {
      await createAdminAnalyticsMetricApi(payload)
    }
    ElMessage.success('Metric saved')
    metricDialogVisible.value = false
    await fetchMetrics()
  } finally {
    savingMetric.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchMetrics()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 10,
    keyword: '',
    category: '',
    enabled: ''
  })
  fetchMetrics()
}

onMounted(fetchMetrics)
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

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
