<template>
  <div class="page-shell admin-console-page slow-sql-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <DatabaseZap :size="16" />
          <span>性能诊断</span>
        </div>
        <h1 class="admin-hero__title">慢 SQL 查询</h1>
        <p class="admin-hero__desc">查看超过阈值的 MyBatis SQL 执行记录，用于定位页面卡顿背后的数据库耗时。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :icon="RefreshCw" :loading="loading" @click="fetchLogs">刷新</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="Mapper / SQL / 数据源" />
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
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="createdAt" label="时间" min-width="170" />
          <el-table-column prop="mapperId" label="Mapper" min-width="260" show-overflow-tooltip />
          <el-table-column prop="sqlCommandType" label="类型" width="100" />
          <el-table-column label="耗时" width="120" sortable>
            <template #default="{ row }">
              <strong :class="{ danger: Number(row.costMs) >= 2000 }">{{ row.costMs ?? '-' }} ms</strong>
            </template>
          </el-table-column>
          <el-table-column prop="thresholdMs" label="阈值" width="110" />
          <el-table-column prop="resultSize" label="结果/行数" width="110" />
          <el-table-column prop="sqlText" label="SQL" min-width="320" show-overflow-tooltip />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
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

    <el-drawer v-model="drawerVisible" title="慢 SQL 详情" size="760px">
      <el-descriptions v-if="currentLog" :column="1" border>
        <el-descriptions-item label="日志 ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ currentLog.createdAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Mapper">{{ currentLog.mapperId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentLog.sqlCommandType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ currentLog.costMs ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="阈值">{{ currentLog.thresholdMs ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="数据源">{{ currentLog.databaseName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="参数摘要">{{ currentLog.parameterSummary || '-' }}</el-descriptions-item>
        <el-descriptions-item label="SQL 指纹">{{ currentLog.sqlTextHash || '-' }}</el-descriptions-item>
        <el-descriptions-item label="参数指纹">{{ currentLog.parameterSummaryHash || '-' }}</el-descriptions-item>
      </el-descriptions>
      <pre v-if="currentLog?.sqlText" class="sql-block">{{ currentLog.sqlText }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { DatabaseZap, RefreshCw } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminSlowSqlLogsApi } from '@/api/adminGovernance'
import type { AdminListQuery, SlowSqlLogVO } from '@/types/adminGovernance'

const loading = ref(false)
const drawerVisible = ref(false)
const logs = ref<SlowSqlLogVO[]>([])
const currentLog = ref<SlowSqlLogVO>()
const total = ref(0)

const query = reactive<AdminListQuery>({
  keyword: '',
  sqlCommandType: '',
  minCostMs: undefined,
  pageNo: 1,
  pageSize: 10
})

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await getAdminSlowSqlLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch {
    logs.value = []
    total.value = 0
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

onMounted(fetchLogs)
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
}
</style>
