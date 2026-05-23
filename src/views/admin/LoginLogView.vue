<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><KeyRound :size="16" /><span>登录审计</span></div>
        <h1 class="admin-hero__title">登录日志</h1>
        <p class="admin-hero__desc">追踪登录成功、失败、来源 IP 和客户端信息。</p>
      </div>
    </section>
    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="用户名 / IP" /></el-form-item>
          <el-form-item label="用户 ID"><el-input-number v-model="query.userId" :min="1" controls-position="right" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 120px"><el-option label="成功" value="SUCCESS" /><el-option label="失败" value="FAILED" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="loginTime" label="登录时间" min-width="170" />
          <el-table-column prop="username" label="用户" min-width="140" show-overflow-tooltip />
          <el-table-column prop="ip" label="IP" min-width="130" />
          <el-table-column prop="location" label="位置" min-width="150" show-overflow-tooltip />
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="isSuccess(row.status) ? 'success' : 'danger'">{{ isSuccess(row.status) ? '成功' : '失败' }}</el-tag></template></el-table-column>
          <el-table-column label="消息" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.message || (isSuccess(row.status) ? '登录成功' : '-') }}</template></el-table-column>
          <el-table-column prop="userAgent" label="客户端" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchLogs" /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminLoginLogsApi } from '@/api/adminGovernance'
import type { AdminListQuery, LoginLogVO } from '@/types/adminGovernance'

const loading = ref(false)
const logs = ref<LoginLogVO[]>([])
const total = ref(0)
const query = reactive<AdminListQuery>({ keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 })
const isSuccess = (status?: string | number) => status === 1 || status === '1' || String(status).toUpperCase() === 'SUCCESS'
const fetchLogs = async () => {
  loading.value = true
  try { const result = await getAdminLoginLogsApi(query); logs.value = result.records || []; total.value = result.total || 0 } catch { logs.value = []; total.value = 0 } finally { loading.value = false }
}
const handleSearch = () => { query.pageNo = 1; fetchLogs() }
const handleReset = () => { Object.assign(query, { keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 }); fetchLogs() }
onMounted(fetchLogs)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
</style>
