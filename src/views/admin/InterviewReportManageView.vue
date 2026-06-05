<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><FileText :size="16" /><span>Report Admin</span></div>
        <h1 class="admin-hero__title">面试报告管理</h1>
        <p class="admin-hero__desc">只读查看报告状态、分数、摘要和失败原因。</p>
      </div>
    </section>
    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="面试 / 用户 / 摘要" /></el-form-item>
          <el-form-item label="用户 ID"><el-input-number v-model="query.userId" :min="1" controls-position="right" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 150px"><el-option label="生成中" value="GENERATING" /><el-option label="已生成" value="GENERATED" /><el-option label="失败" value="FAILED" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="reports" row-key="reportId">
          <el-table-column prop="reportId" label="报告 ID" width="100" />
          <el-table-column prop="interviewName" label="面试" min-width="190" show-overflow-tooltip />
          <el-table-column prop="username" label="用户" min-width="120" show-overflow-tooltip />
          <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.reportStatus)">{{ row.reportStatus || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="分数" width="100"><template #default="{ row }">{{ displayReportScore(row) }}</template></el-table-column>
          <el-table-column prop="summary" label="摘要" min-width="280" show-overflow-tooltip />
          <el-table-column prop="failedReason" label="失败原因" min-width="200" show-overflow-tooltip />
          <el-table-column prop="generatedAt" label="生成时间" min-width="170" />
          <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchReports" /></div>
    </section>
    <el-dialog v-model="drawerVisible" title="报告详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div class="admin-detail-dialog__body">
        <el-descriptions v-if="detail" :column="1" border>
          <el-descriptions-item label="报告 ID">{{ detail.reportId || detail.id }}</el-descriptions-item>
          <el-descriptions-item label="面试 ID">{{ detail.interviewId }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detail.username || detail.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.reportStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="总分">{{ displayReportScore(detail) }}</el-descriptions-item>
          <el-descriptions-item label="摘要"><pre>{{ detail.summary || '-' }}</pre></el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ detail.failedReason || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <div class="admin-detail-dialog__footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminInterviewReportDetailApi, getAdminInterviewReportsApi } from '@/api/adminGovernance'
import type { AdminInterviewReportVO, AdminListQuery } from '@/types/adminGovernance'

const loading = ref(false)
const drawerVisible = ref(false)
const reports = ref<AdminInterviewReportVO[]>([])
const detail = ref<AdminInterviewReportVO | null>(null)
const total = ref(0)
const query = reactive<AdminListQuery>({ keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 })
const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['GENERATED', 'SUCCESS'].includes(value)) return 'success'
  if (['FAILED', 'ERROR'].includes(value)) return 'danger'
  if (['GENERATING', 'PENDING'].includes(value)) return 'warning'
  return 'info'
}
const isReportSuccess = (status?: string) => ['GENERATED', 'COMPLETED', 'SUCCESS'].includes(String(status || '').toUpperCase())
const displayReportScore = (row?: AdminInterviewReportVO | null) => {
  if (!row || !isReportSuccess(row.reportStatus)) return '-'
  const score = Number(row.totalScore)
  return Number.isFinite(score) && score > 0 ? score : '-'
}
const fetchReports = async () => {
  loading.value = true
  try { const result = await getAdminInterviewReportsApi(query); reports.value = result.records || []; total.value = result.total || 0 } catch { reports.value = []; total.value = 0 } finally { loading.value = false }
}
const openDetail = async (row: AdminInterviewReportVO) => { detail.value = await getAdminInterviewReportDetailApi(row.reportId || row.id || row.interviewId); drawerVisible.value = true }
const handleSearch = () => { query.pageNo = 1; fetchReports() }
const handleReset = () => { Object.assign(query, { keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 }); fetchReports() }
onMounted(fetchReports)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }

.admin-detail-dialog__body {
  overflow: auto;
  max-height: min(72vh, 720px);
  padding-right: 2px;
}

.admin-detail-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
</style>
