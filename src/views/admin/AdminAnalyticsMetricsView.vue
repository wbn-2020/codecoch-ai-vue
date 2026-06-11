<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">指标字典</div>
        <h1 class="admin-hero__title">指标字典</h1>
        <p class="admin-hero__desc">维护分析指标编码、定义、数据来源和刷新频率。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-permission="'admin:analytics:metric:write'"
          type="primary"
          :disabled="isAdminMobileReadonly"
          :title="mobileReadonlyTitle()"
          @click="openMetricDialog()"
        >新增指标</el-button>
        <el-button :loading="loading" @click="fetchMetrics">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>指标列表</h2>
          <p>按运营场景维护指标定义；可调整密度和列显隐，先看口径，再展开低频审计字段。</p>
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
          <el-table v-loading="loading" :data="metrics" row-key="id" :size="tableSize">
            <el-table-column v-if="isColumnVisible('id')" prop="id" label="指标编号" width="100" />
            <el-table-column v-if="isColumnVisible('metricCode')" prop="metricCode" label="指标编码" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('metricName')" label="指标名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricName(row.metricName) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('category')" label="分类" width="130">
              <template #default="{ row }">{{ translateMetricCategory(row.category) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('definition')" label="定义" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricDefinition(row.definition) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('dataSource')" prop="dataSource" label="数据来源" min-width="160" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('refreshFrequency')" label="刷新频率" width="140">
              <template #default="{ row }">{{ translateRefreshFrequency(row.refreshFrequency) }}</template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('enabled')" label="状态" width="110">
              <template #default="{ row }">
                <StatusTag :status="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
            <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'admin:analytics:metric:write'"
                  link
                  type="primary"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="openMetricDialog(row)"
                >编辑</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <AppState type="empty" :title="metricEmptyTitle" :description="metricEmptyDescription">
                <el-button v-if="hasMetricFilters" type="primary" @click="handleReset">清空筛选</el-button>
                <el-button
                  v-else
                  v-permission="'admin:analytics:metric:write'"
                  type="primary"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="openMetricDialog()"
                >新增指标</el-button>
              </AppState>
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
            <el-input v-model.trim="metricForm.metricCode" placeholder="例如：PLAN_GENERATION_SUCCESS_RATE" />
          </el-form-item>
          <el-form-item label="指标名称" required>
            <el-input v-model.trim="metricForm.metricName" placeholder="计划生成成功率" />
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
          <el-input v-model.trim="metricForm.dataSource" placeholder="例如：智能教练运行、任务反馈、AI 运行记录" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="metricEnabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="metricDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:analytics:metric:write'"
          type="primary"
          :loading="savingMetric"
          :disabled="isAdminMobileReadonly"
          :title="mobileReadonlyTitle()"
          @click="saveMetric"
        >保存</el-button>
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
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminAnalyticsDictionaryQuery, AdminAnalyticsMetricDefinitionVO } from '@/types/analytics'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'
import {
  translateMetricCategory,
  translateMetricDefinition,
  translateMetricName,
  translateRefreshFrequency
} from '@/utils/adminDisplay'

type MetricColumnKey =
  | 'id'
  | 'metricCode'
  | 'metricName'
  | 'category'
  | 'definition'
  | 'dataSource'
  | 'refreshFrequency'
  | 'enabled'
  | 'createdAt'
  | 'updatedAt'

const loading = ref(false)
const errorMessage = ref('')
const metrics = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const total = ref(0)
const metricDialogVisible = ref(false)
const savingMetric = ref(false)
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<MetricColumnKey>('admin:analytics-metrics', [
  { key: 'id', label: '指标编号', defaultVisible: false },
  { key: 'metricCode', label: '指标编码', required: true },
  { key: 'metricName', label: '指标名称', required: true },
  { key: 'category', label: '分类' },
  { key: 'definition', label: '定义' },
  { key: 'dataSource', label: '数据来源' },
  { key: 'refreshFrequency', label: '刷新频率' },
  { key: 'enabled', label: '状态', required: true },
  { key: 'createdAt', label: '创建时间', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const categoryOptions = [
  { label: '智能教练', value: 'AGENT' },
  { label: 'AI', value: 'AI' },
  { label: 'AI 运营', value: 'AI_OPS' },
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

const hasMetricFilters = computed(() => Boolean(query.keyword || query.category || query.enabled !== ''))
const metricEmptyTitle = computed(() => (hasMetricFilters.value ? '没有匹配当前筛选的指标定义' : '暂无指标定义'))
const metricEmptyDescription = computed(() =>
  hasMetricFilters.value
    ? '当前筛选条件下没有指标定义。清空筛选后可确认是否真的没有指标。'
    : '当前还没有配置分析指标。运营首页、AI 运营看板和聚合报表需要指标定义后才能稳定解释数据口径。'
)

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
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
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
  if (!guardAdminMobileWrite()) return
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
  if (!guardAdminMobileWrite()) return
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
    const actionLabel = metricForm.id ? '更新指标定义' : '新增指标定义'
    const confirmed = await confirmDangerActionPreview({
      title: `${actionLabel}预览`,
      action: `${actionLabel}「${payload.metricName}」`,
      target: `指标编码：${payload.metricCode}；分类：${translateMetricCategory(payload.category) || '未分类'}；状态：${payload.enabled === 1 ? '启用' : '禁用'}`,
      impact: '指标字典会影响运营首页、AI 运营看板和分析报表的展示口径，错误配置可能导致管理员误判趋势或异常。',
      rollback: '可再次编辑指标定义恢复原值；若已影响报表解读，需要结合操作日志和变更时间重新核对。',
      audit: '保存操作会记录操作人、指标编码、指标编号和时间，便于追踪统计口径变更。',
      tips: ['确认指标编码不会与既有统计口径冲突。', '确认数据来源和刷新频率已经与统计聚合任务一致。'],
      confirmButtonText: '确认保存'
    })
    if (!confirmed) return
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

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
