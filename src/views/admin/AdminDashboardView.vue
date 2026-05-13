<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">管理首页</h1>
        <p class="page-subtitle">展示 V1 后台基础统计和快捷入口，不做复杂数据大屏。</p>
      </div>
    </div>

    <div class="metric-grid" v-loading="loading">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <div class="metric-card__label">{{ item.label }}</div>
        <div class="metric-card__value">{{ item.value }}</div>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-alert
          title="管理端已接入用户、题库、Prompt、AI 日志和系统配置的 V1 基础维护入口。"
          type="info"
          show-icon
          :closable="false"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAdminSystemOverviewApi } from '@/api/system'
import type { AdminOverviewVO } from '@/types/system'

const loading = ref(false)
const overview = ref<AdminOverviewVO>({
  userCount: 0,
  questionCount: 0,
  resumeCount: 0,
  interviewCount: 0,
  completedInterviewCount: 0,
  aiCallCount: 0,
  aiCallFailedCount: 0,
  promptCount: 0,
  todayInterviewCount: 0,
  todayAiCallCount: 0
})

const metrics = computed(() => [
  { label: '用户数', value: overview.value.userCount || 0 },
  { label: '题目数', value: overview.value.questionCount || 0 },
  { label: '简历数', value: overview.value.resumeCount || 0 },
  { label: '面试数', value: overview.value.interviewCount || 0 },
  { label: 'AI 调用数', value: overview.value.aiCallCount || 0 }
])

const fetchOverview = async () => {
  loading.value = true
  try {
    overview.value = await getAdminSystemOverviewApi()
  } catch {
    // Keep zero-valued cards when backend aggregation is not ready.
  } finally {
    loading.value = false
  }
}

onMounted(fetchOverview)
</script>
