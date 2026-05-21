<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">Analytics Dictionary</div>
        <h1 class="admin-hero__title">Metric dictionary</h1>
        <p class="admin-hero__desc">Read the metric code, definition, data source, and refresh frequency from the V4 analytics dictionary API.</p>
      </div>
      <div class="admin-hero__actions">
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
            @change="applyMetrics"
          />
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getAdminAnalyticsMetricsApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AdminAnalyticsDictionaryQuery, AdminAnalyticsMetricDefinitionVO } from '@/types/analytics'

const loading = ref(false)
const errorMessage = ref('')
const allMetrics = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const metrics = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const total = ref(0)

const query = reactive<AdminAnalyticsDictionaryQuery>({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  category: '',
  enabled: ''
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
}

const applyMetrics = () => {
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const filtered = keyword
    ? allMetrics.value.filter((item) =>
        [item.metricCode, item.metricName, item.definition]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      )
    : allMetrics.value
  const pageNo = query.pageNo || 1
  const pageSize = query.pageSize || 10
  const start = (pageNo - 1) * pageSize
  metrics.value = filtered.slice(start, start + pageSize)
  total.value = filtered.length
}

const fetchMetrics = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getAdminAnalyticsMetricsApi(query)
    allMetrics.value = page.records || []
    applyMetrics()
  } catch (error) {
    allMetrics.value = []
    metrics.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
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
</style>
