<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">指标字典</div>
        <h1 class="admin-hero__title">指标字典</h1>
        <p class="admin-hero__desc">从 V4 分析指标字典接口读取指标编码、定义、数据来源和刷新频率。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button v-permission="'admin:analytics:metric:write'" type="primary" @click="openMetricDialog()">新增指标</el-button>
        <el-button :loading="loading" @click="fetchMetrics">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="指标编码或名称" style="width: 220px" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="query.category" clearable placeholder="全部分类" style="width: 180px">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <AppState v-if="errorMessage" type="error" title="指标字典加载失败" :description="errorMessage">
        <el-button type="primary" @click="fetchMetrics">重试</el-button>
      </AppState>

      <template v-else>
        <div class="table-card admin-table-card">
          <el-table v-loading="loading" :data="metrics" row-key="id">
            <el-table-column prop="metricCode" label="指标编码" min-width="180" show-overflow-tooltip />
            <el-table-column label="指标名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricName(row.metricName) }}</template>
            </el-table-column>
            <el-table-column label="分类" width="130">
              <template #default="{ row }">{{ translateMetricCategory(row.category) }}</template>
            </el-table-column>
            <el-table-column label="定义" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricDefinition(row.definition) }}</template>
            </el-table-column>
            <el-table-column prop="dataSource" label="数据来源" min-width="160" show-overflow-tooltip />
            <el-table-column label="刷新频率" width="140">
              <template #default="{ row }">{{ translateRefreshFrequency(row.refreshFrequency) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <StatusTag :status="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button v-permission="'admin:analytics:metric:write'" link type="primary" @click="openMetricDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无指标定义" />
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

    <el-dialog v-model="metricDialogVisible" :title="metricForm.id ? '编辑指标' : '新增指标'" width="680px">
      <el-form :model="metricForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="指标编码" required>
            <el-input v-model.trim="metricForm.metricCode" placeholder="AGENT_SUCCESS_RATE" />
          </el-form-item>
          <el-form-item label="指标名称" required>
            <el-input v-model.trim="metricForm.metricName" placeholder="Agent 成功率" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="metricForm.category" clearable placeholder="选择分类">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="刷新频率">
            <el-input v-model.trim="metricForm.refreshFrequency" placeholder="DAILY" />
          </el-form-item>
        </div>
        <el-form-item label="定义">
          <el-input v-model="metricForm.definition" type="textarea" :rows="4" placeholder="指标定义" />
        </el-form-item>
        <el-form-item label="数据来源">
          <el-input v-model.trim="metricForm.dataSource" placeholder="agent_run / agent_task / ai_call_log" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="metricEnabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="metricDialogVisible = false">取消</el-button>
        <el-button v-permission="'admin:analytics:metric:write'" type="primary" :loading="savingMetric" @click="saveMetric">保存</el-button>
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
import {
  translateMetricCategory,
  translateMetricDefinition,
  translateMetricName,
  translateRefreshFrequency
} from '@/utils/adminDisplay'

const loading = ref(false)
const errorMessage = ref('')
const metrics = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const total = ref(0)
const metricDialogVisible = ref(false)
const savingMetric = ref(false)

const categoryOptions = [
  { label: 'Agent', value: 'AGENT' },
  { label: 'AI', value: 'AI' },
  { label: 'AI Ops', value: 'AI_OPS' },
  { label: '训练', value: 'TRAINING' },
  { label: '通用', value: 'GENERAL' }
]

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
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
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
    ElMessage.warning('请填写指标编码和指标名称')
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
    ElMessage.success('指标已保存')
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
