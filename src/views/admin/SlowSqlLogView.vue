<template>
  <div class="page-shell admin-console-page slow-sql-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <DatabaseZap :size="16" />
          <span>性能诊断</span>
        </div>
        <h1 class="admin-hero__title">慢 SQL 查询</h1>
        <p class="admin-hero__desc">查看超过阈值的数据库执行记录，用于定位页面卡顿背后的高耗时访问。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :icon="RefreshCw" :loading="loading" @click="fetchLogs">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header slow-sql-table-header">
        <div>
          <h2>慢 SQL 列表</h2>
          <p>支持按性能排障场景调整密度和列显隐；SQL 原文默认放在技术诊断中。</p>
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
            <el-input v-model.trim="query.keyword" clearable placeholder="Mapper / 关键词 / 数据源" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.sqlCommandType" clearable placeholder="全部" style="width: 130px">
              <el-option label="SELECT" value="SELECT" />
              <el-option label="INSERT" value="INSERT" />
              <el-option label="UPDATE" value="UPDATE" />
              <el-option label="DELETE" value="DELETE" />
            </el-select>
          </el-form-item>
          <el-form-item label="最低耗时">
            <el-input-number v-model="query.minCostMs" :min="0" :step="100" controls-position="right" style="width: 150px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('mapperId')" label="Mapper" min-width="260">
            <template #default="{ row }">
              <p :class="['slow-sql-text-preview', { 'slow-sql-text-preview--empty': !row.mapperId }]">
                {{ row.mapperId || '-' }}
              </p>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('sqlCommandType')" prop="sqlCommandType" label="类型" width="100" />
          <el-table-column v-if="isColumnVisible('costMs')" label="耗时" width="120" sortable>
            <template #default="{ row }">
              <strong :class="{ danger: Number(row.costMs) >= 2000 }">{{ row.costMs ?? '-' }} ms</strong>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('thresholdMs')" prop="thresholdMs" label="阈值" width="110" />
          <el-table-column v-if="isColumnVisible('resultSize')" prop="resultSize" label="结果/行数" width="110" />
          <el-table-column v-if="isColumnVisible('databaseName')" prop="databaseName" label="数据源" min-width="130" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('sqlText')" label="SQL 摘要" min-width="340">
            <template #default="{ row }">
              <p :class="['slow-sql-text-preview', { 'slow-sql-text-preview--empty': !row.sqlTextPreview && !row.sqlText }]">
                {{ formatSlowSqlPreview(row) }}
              </p>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="slowSqlError ? 'error' : 'empty'"
              :title="slowSqlError ? '慢 SQL 列表加载失败' : '暂无慢 SQL 记录'"
              :description="slowSqlError || slowSqlEmptyDescription"
            >
              <el-button type="primary" @click="slowSqlError ? fetchLogs() : handleReset()">
                {{ slowSqlError ? '重新加载' : hasSlowSqlFilters ? '清空筛选' : '刷新列表' }}
              </el-button>
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
          @change="fetchLogs"
        />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="慢查询详情" size="760px">
      <el-descriptions v-if="currentLog" :column="1" border>
        <el-descriptions-item label="记录状态">{{ currentLog.id ? '已记录，可追踪' : '未返回记录状态' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ currentLog.createdAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Mapper">{{ currentLog.mapperId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentLog.sqlCommandType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ currentLog.costMs ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="阈值">{{ currentLog.thresholdMs ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="数据源">{{ currentLog.databaseName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="SQL 摘要">{{ formatSlowSqlPreview(currentLog) }}</el-descriptions-item>
        <el-descriptions-item label="参数状态">{{ currentLog.parameterSummary ? '已记录，展开技术诊断查看' : '未记录参数摘要' }}</el-descriptions-item>
      </el-descriptions>
      <el-collapse v-if="hasSlowSqlDiagnostics" class="slow-sql-diagnostics">
        <el-collapse-item title="技术诊断（SQL 原文/参数/指纹，按需展开）" name="slow-sql-raw">
          <div class="slow-sql-diagnostic-list">
            <span>日志记录 {{ currentLog?.id || '-' }}</span>
            <span>SQL 指纹 {{ currentLog?.sqlTextHash || '-' }}</span>
            <span>参数指纹 {{ currentLog?.parameterSummaryHash || '-' }}</span>
            <span>参数摘要 {{ currentLog?.parameterSummary || '-' }}</span>
          </div>
          <pre v-if="currentLog?.sqlText" class="sql-block">{{ currentLog.sqlText }}</pre>
        </el-collapse-item>
      </el-collapse>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { DatabaseZap, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getAdminSlowSqlLogsApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, SlowSqlLogVO } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const loading = ref(false)
const drawerVisible = ref(false)
const logs = ref<SlowSqlLogVO[]>([])
const currentLog = ref<SlowSqlLogVO>()
const total = ref(0)
const slowSqlError = ref('')

type SlowSqlColumnKey =
  | 'createdAt'
  | 'mapperId'
  | 'sqlCommandType'
  | 'costMs'
  | 'thresholdMs'
  | 'resultSize'
  | 'databaseName'
  | 'sqlText'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<SlowSqlColumnKey>('admin:slow-sql-log', [
  { key: 'createdAt', label: '时间', required: true },
  { key: 'mapperId', label: 'Mapper' },
  { key: 'sqlCommandType', label: '类型' },
  { key: 'costMs', label: '耗时', required: true },
  { key: 'thresholdMs', label: '阈值' },
  { key: 'resultSize', label: '结果/行数' },
  { key: 'databaseName', label: '数据源', defaultVisible: false },
  { key: 'sqlText', label: 'SQL 摘要', required: true }
])

const query = reactive<AdminListQuery>({
  keyword: '',
  sqlCommandType: '',
  minCostMs: undefined,
  pageNo: 1,
  pageSize: 10
})

const hasSlowSqlFilters = computed(() =>
  Boolean(query.keyword || query.sqlCommandType || query.minCostMs)
)
const slowSqlEmptyDescription = computed(() =>
  hasSlowSqlFilters.value
    ? '没有匹配当前筛选条件的慢 SQL 记录'
    : '当前没有超过阈值的慢 SQL 记录，可稍后刷新或从运营首页按异常入口定位'
)
const hasSlowSqlDiagnostics = computed(() =>
  Boolean(currentLog.value?.id || currentLog.value?.sqlText || currentLog.value?.parameterSummary || currentLog.value?.sqlTextHash || currentLog.value?.parameterSummaryHash)
)

const formatSlowSqlPreview = (row?: SlowSqlLogVO) => {
  if (!row) return '-'
  if (row.sqlTextPreview) return row.sqlTextPreview
  if (row.sqlText) return '已记录 SQL 原文，展开技术诊断查看'
  return '-'
}

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const applyRouteQuery = () => {
  const hasRouteFilter = ['keyword', 'mapperId', 'sqlCommandType', 'minCostMs'].some((key) => firstQueryString(route.query[key]))
  if (!hasRouteFilter) return false
  const keyword = firstQueryString(route.query.keyword || route.query.mapperId)
  const sqlCommandType = firstQueryString(route.query.sqlCommandType)
  const minCostMs = Number(firstQueryString(route.query.minCostMs))
  Object.assign(query, {
    keyword,
    sqlCommandType: sqlCommandType ? sqlCommandType.toUpperCase() : '',
    minCostMs: Number.isFinite(minCostMs) && minCostMs > 0 ? minCostMs : undefined,
    pageNo: 1
  })
  return true
}

const fetchLogs = async () => {
  loading.value = true
  slowSqlError.value = ''
  try {
    const result = await getAdminSlowSqlLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    logs.value = []
    total.value = 0
    slowSqlError.value = getErrorMessage(error, '慢 SQL 记录暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openDetail = (row: SlowSqlLogVO) => {
  currentLog.value = row
  drawerVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', sqlCommandType: '', minCostMs: undefined, pageNo: 1, pageSize: 10 })
  fetchLogs()
}

watch(
  () => [route.query.keyword, route.query.mapperId, route.query.sqlCommandType, route.query.minCostMs],
  () => {
    if (applyRouteQuery()) {
      void fetchLogs()
    }
  }
)

onMounted(() => {
  applyRouteQuery()
  fetchLogs()
})
</script>

<style scoped lang="scss">
.danger {
  color: #f87171;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.slow-sql-table-header {
  margin-bottom: 14px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

:global(.column-config-menu) {
  min-width: 168px;
  padding: 6px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.slow-sql-text-preview {
  display: -webkit-box;
  max-height: 42px;
  margin: 0;
  overflow: hidden;
  color: var(--app-text, #1f2937);
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.slow-sql-text-preview--empty {
  color: var(--app-text-muted, #64748b);
}

.sql-block {
  margin: 18px 0 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.86);
  color: var(--app-text);
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.slow-sql-diagnostics {
  margin-top: 14px;
}

.slow-sql-diagnostic-list {
  display: grid;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.slow-sql-diagnostic-list span {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .slow-sql-table-header {
    align-items: flex-start;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
