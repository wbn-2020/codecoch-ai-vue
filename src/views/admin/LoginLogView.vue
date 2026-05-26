<template>
  <div class="page-shell admin-console-page audit-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <KeyRound :size="16" />
          <span>登录审计</span>
        </div>
        <h1 class="admin-hero__title">登录日志</h1>
        <p class="admin-hero__desc">追踪登录成功、失败、来源 IP、客户端信息和 traceId。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :icon="RefreshCw" :loading="loading || summaryLoading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="audit-metrics">
      <article class="audit-metric">
        <span>登录日志总数</span>
        <strong>{{ summary?.totalLoginLogs ?? total }}</strong>
        <small>最近登录 {{ summary?.latestLoginAt || '--' }}</small>
      </article>
      <article class="audit-metric">
        <span>今日登录</span>
        <strong>{{ summary?.todayLoginLogs ?? 0 }}</strong>
        <small>按 loginTime 统计</small>
      </article>
      <article class="audit-metric audit-metric--danger">
        <span>失败登录</span>
        <strong>{{ summary?.failedLoginLogs ?? 0 }}</strong>
        <small>今日失败 {{ summary?.todayFailedLoginLogs ?? 0 }}</small>
      </article>
      <article class="audit-metric">
        <span>当前筛选结果</span>
        <strong>{{ total }}</strong>
        <small>来自分页接口 total</small>
      </article>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="用户名 / IP / 客户端" />
          </el-form-item>
          <el-form-item label="用户 ID">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="traceId">
            <el-input v-model.trim="query.traceId" clearable placeholder="链路 ID" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="loginTime" label="登录时间" min-width="170" />
          <el-table-column prop="username" label="用户" min-width="140" show-overflow-tooltip />
          <el-table-column prop="loginType" label="登录类型" min-width="120" />
          <el-table-column prop="traceId" label="traceId" min-width="150" show-overflow-tooltip />
          <el-table-column prop="ip" label="IP" min-width="130" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="isSuccess(row.status) ? 'success' : 'danger'">
                {{ isSuccess(row.status) ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="消息" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.message || (isSuccess(row.status) ? '登录成功' : '-') }}</template>
          </el-table-column>
          <el-table-column prop="userAgent" label="客户端" min-width="260" show-overflow-tooltip />
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
  </div>
</template>

<script setup lang="ts">
import { KeyRound, RefreshCw } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminLogSummaryApi, getAdminLoginLogsApi } from '@/api/adminGovernance'
import type { AdminListQuery, AdminLogSummaryVO, LoginLogVO } from '@/types/adminGovernance'

const loading = ref(false)
const summaryLoading = ref(false)
const logs = ref<LoginLogVO[]>([])
const summary = ref<AdminLogSummaryVO>()
const total = ref(0)

const query = reactive<AdminListQuery>({
  keyword: '',
  userId: undefined,
  traceId: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const isSuccess = (status?: string | number) => status === 1 || status === '1' || String(status).toUpperCase() === 'SUCCESS'

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    summary.value = await getAdminLogSummaryApi()
  } finally {
    summaryLoading.value = false
  }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await getAdminLoginLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch {
    logs.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadPage = () => {
  fetchSummary()
  fetchLogs()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', userId: undefined, traceId: '', status: '', pageNo: 1, pageSize: 10 })
  fetchLogs()
}

onMounted(loadPage)
</script>

<style scoped lang="scss">
.audit-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.audit-metric {
  min-height: 116px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.audit-metric span,
.audit-metric small {
  display: block;
  color: var(--app-text-muted);
}

.audit-metric strong {
  display: block;
  margin: 8px 0;
  color: var(--app-text);
  font-size: 28px;
  line-height: 1;
}

.audit-metric--danger strong {
  color: #f87171;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

@media (max-width: 1080px) {
  .audit-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .audit-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
