<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">面试历史</h1>
        <p class="page-subtitle">查看模拟面试状态、总分和报告入口。</p>
      </div>
      <el-button type="primary" @click="router.push('/interviews/create')">创建面试</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" inline>
          <el-form-item>
            <el-button type="primary" @click="fetchInterviews">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="interviews" row-key="interviewId">
          <el-table-column prop="interviewName" label="面试名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="interviewMode" label="模式" min-width="150" />
          <el-table-column prop="targetPosition" label="目标岗位" min-width="150" />
          <el-table-column prop="industryDirection" label="行业" min-width="120" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="报告" width="120">
            <template #default="{ row }"><StatusTag :status="row.reportStatus" /></template>
          </el-table-column>
          <el-table-column prop="totalScore" label="总分" width="90" />
          <el-table-column prop="startedAt" label="开始时间" min-width="170" />
          <el-table-column prop="finishedAt" label="结束时间" min-width="170" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/interviews/${row.interviewId}`)">详情</el-button>
              <el-button link @click="router.push(`/interviews/room/${row.interviewId}`)">房间</el-button>
              <el-button link type="success" @click="router.push(`/interviews/${row.interviewId}/report`)">报告</el-button>
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
          @change="fetchInterviews"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getInterviewsApi } from '@/api/interview'
import StatusTag from '@/components/common/StatusTag.vue'
import type { InterviewListVO, InterviewQueryDTO } from '@/types/interview'

const router = useRouter()
const loading = ref(false)
const interviews = ref<InterviewListVO[]>([])
const total = ref(0)

const query = reactive<InterviewQueryDTO>({
  pageNo: 1,
  pageSize: 10
})

const fetchInterviews = async () => {
  loading.value = true
  try {
    const result = await getInterviewsApi(query)
    interviews.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchInterviews)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
