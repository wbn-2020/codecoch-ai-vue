<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><MessagesSquare :size="16" /><span>Interview Admin</span></div>
        <h1 class="admin-hero__title">面试记录管理</h1>
        <p class="admin-hero__desc">只读查看后台面试记录，便于排查状态、用户和报告生成情况。</p>
      </div>
    </section>
    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="标题 / 用户 / 岗位" /></el-form-item>
          <el-form-item label="用户 ID"><el-input-number v-model="query.userId" :min="1" controls-position="right" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 160px"><el-option label="进行中" value="IN_PROGRESS" /><el-option label="已完成" value="COMPLETED" /><el-option label="失败" value="FAILED" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="interviews" row-key="interviewId">
          <el-table-column prop="interviewId" label="ID" width="90" />
          <el-table-column prop="interviewName" label="面试" min-width="190" show-overflow-tooltip />
          <el-table-column prop="username" label="用户" min-width="120" show-overflow-tooltip />
          <el-table-column prop="targetPosition" label="目标岗位" min-width="150" show-overflow-tooltip />
          <el-table-column prop="interviewMode" label="模式" width="110" />
          <el-table-column label="状态" width="130"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="报告" width="140"><template #default="{ row }"><el-tag :type="statusType(row.reportStatus)">{{ row.reportStatus || '-' }}</el-tag></template></el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchInterviews" /></div>
    </section>
    <el-drawer v-model="drawerVisible" title="面试详情" size="620px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="面试 ID">{{ detail.interviewId }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ detail.interviewName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ detail.username || detail.userId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标岗位">{{ detail.targetPosition || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status || '-' }}</el-descriptions-item>
        <el-descriptions-item label="报告状态">{{ detail.reportStatus || '-' }}</el-descriptions-item>
        <el-descriptions-item label="题目数">{{ detail.questionCount ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ detail.startedAt || '-' }} - {{ detail.finishedAt || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { MessagesSquare } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminInterviewDetailApi, getAdminInterviewsApi } from '@/api/adminGovernance'
import type { AdminInterviewVO, AdminListQuery } from '@/types/adminGovernance'

const loading = ref(false)
const drawerVisible = ref(false)
const interviews = ref<AdminInterviewVO[]>([])
const detail = ref<AdminInterviewVO | null>(null)
const total = ref(0)
const query = reactive<AdminListQuery>({ keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 })
const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['COMPLETED', 'GENERATED', 'SUCCESS'].includes(value)) return 'success'
  if (['FAILED', 'CANCELED'].includes(value)) return 'danger'
  if (['IN_PROGRESS', 'GENERATING', 'WAITING_ANSWER'].includes(value)) return 'warning'
  return 'info'
}
const fetchInterviews = async () => {
  loading.value = true
  try { const result = await getAdminInterviewsApi(query); interviews.value = result.records || []; total.value = result.total || 0 } catch { interviews.value = []; total.value = 0 } finally { loading.value = false }
}
const openDetail = async (row: AdminInterviewVO) => { detail.value = await getAdminInterviewDetailApi(row.interviewId); drawerVisible.value = true }
const handleSearch = () => { query.pageNo = 1; fetchInterviews() }
const handleReset = () => { Object.assign(query, { keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 }); fetchInterviews() }
onMounted(fetchInterviews)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
</style>
