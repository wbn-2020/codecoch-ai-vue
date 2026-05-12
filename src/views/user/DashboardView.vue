<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">工作台</h1>
        <p class="page-subtitle">
          欢迎回来，{{ displayName }}。这里先聚合 V1 第一阶段可用的学习概览和快捷入口。
        </p>
      </div>
      <el-button type="primary" @click="router.push('/interviews/create')">创建面试</el-button>
    </div>

    <div class="metric-grid" v-loading="loading">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <div class="metric-card__label">{{ item.label }}</div>
        <div class="metric-card__value">{{ item.value }}</div>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body dashboard-grid">
        <div>
          <h2>最近面试</h2>
          <el-empty description="暂无最近面试记录" />
        </div>
        <div>
          <h2>快捷入口</h2>
          <div class="quick-actions">
            <el-button @click="router.push('/questions')">进入题库</el-button>
            <el-button @click="router.push('/resumes')">管理简历</el-button>
            <el-button @click="router.push('/interviews/history')">面试历史</el-button>
            <el-button @click="router.push('/profile')">个人资料</el-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getUserOverviewApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserOverviewVO } from '@/types/user'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const overview = ref<UserOverviewVO>({
  resumeCount: 0,
  interviewCount: 0,
  completedInterviewCount: 0,
  questionAnsweredCount: 0,
  wrongQuestionCount: 0,
  favoriteQuestionCount: 0
})

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)

const metrics = computed(() => [
  { label: '累计刷题数', value: overview.value.questionAnsweredCount || 0 },
  { label: '错题数', value: overview.value.wrongQuestionCount || 0 },
  { label: '模拟面试次数', value: overview.value.interviewCount || 0 },
  { label: '简历数', value: overview.value.resumeCount || 0 }
])

const fetchOverview = async () => {
  loading.value = true
  try {
    const data = await getUserOverviewApi()
    overview.value = {
      ...overview.value,
      ...data
    }
  } catch {
    // Overview is P2. Keep the dashboard usable while backend aggregation is incomplete.
  } finally {
    loading.value = false
  }
}

onMounted(fetchOverview)
</script>

<style scoped lang="scss">
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
  gap: 24px;

  h2 {
    margin: 0 0 16px;
    font-size: 18px;
  }
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 860px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
