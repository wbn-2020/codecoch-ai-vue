<template>
  <div class="job-experiment page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">求职实验</p>
        <h1>求职实验台</h1>
        <p>把简历版本、JD、投递、面试报告放进同一轮策略复盘，先看证据和样本，再决定下一步。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/portfolio-demo')">演示控制台</el-button>
        <el-button type="primary" @click="router.push('/job-experiments/create')">新建实验</el-button>
      </div>
    </section>

    <section class="content-card toolbar">
      <el-input v-model.trim="query.keyword" clearable placeholder="搜索实验名称或方向" @keyup.enter="fetchList" />
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="草稿" value="DRAFT" />
        <el-option label="进行中" value="RUNNING" />
        <el-option label="已复盘" value="REVIEWED" />
        <el-option label="已归档" value="ARCHIVED" />
      </el-select>
      <el-button @click="fetchList">筛选</el-button>
    </section>

    <section class="content-card" v-loading="loading">
      <div v-if="items.length" class="experiment-grid">
        <article v-for="item in items" :key="item.id" class="experiment-card">
          <div class="card-head">
            <div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.targetDirection || '暂无目标方向' }}</p>
            </div>
            <el-tag :type="statusTone(item.status)" effect="dark">{{ statusLabel(item.status) }}</el-tag>
          </div>
          <p class="goal">{{ item.goal || '还没有写入实验目标。' }}</p>
          <div class="metrics">
            <span>{{ item.sampleCount || 0 }} 条样本</span>
            <span>{{ confidenceLabel(item.confidenceLevel) }}</span>
            <span v-if="item.demoFlag">演示数据</span>
          </div>
          <el-alert v-if="item.sampleWarning" type="warning" :closable="false" :title="item.sampleWarning" />
          <div class="card-actions">
            <el-button @click="router.push(`/job-experiments/${item.id}`)">查看</el-button>
            <el-button type="primary" plain @click="router.push(`/job-experiments/${item.id}/review`)">复盘</el-button>
          </div>
        </article>
      </div>
      <AppState v-else type="empty" title="暂无求职实验" description="围绕一版简历、一个岗位方向、一组投递或一份面试报告创建实验。">
        <el-button type="primary" @click="router.push('/job-experiments/create')">新建实验</el-button>
      </AppState>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getJobExperimentsApi } from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import { confidenceLabel, statusLabel } from '@/features/job-experiment'
import type { JobSearchExperimentListVO, JobSearchExperimentQueryDTO } from '@/types/jobExperiment'

const router = useRouter()
const loading = ref(false)
const items = ref<JobSearchExperimentListVO[]>([])
const query = reactive<JobSearchExperimentQueryDTO>({ pageNo: 1, pageSize: 20 })

const statusTone = (status?: string) => {
  if (status === 'RUNNING') return 'success'
  if (status === 'REVIEWED') return 'primary'
  if (status === 'ARCHIVED') return 'info'
  return 'warning'
}

const fetchList = async () => {
  loading.value = true
  try {
    const page = await getJobExperimentsApi(query)
    items.value = page.records || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped lang="scss">
.job-experiment {
  gap: 18px;
}

.page-hero,
.toolbar,
.card-head,
.metrics,
.card-actions,
.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.72);
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0;
  font-size: 30px;
}

.page-hero p:last-child,
.card-head p,
.goal,
.metrics {
  color: var(--app-text-muted);
}

.toolbar {
  padding: 16px;
}

.toolbar .el-input {
  max-width: 360px;
}

.toolbar .el-select {
  width: 180px;
}

.experiment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  padding: 18px;
}

.experiment-card {
  display: flex;
  flex-direction: column;
  min-height: 270px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.card-head {
  align-items: flex-start;
  justify-content: space-between;
}

.card-head h2 {
  margin: 0;
  font-size: 18px;
}

.goal {
  min-height: 54px;
  line-height: 1.6;
}

.metrics {
  flex-wrap: wrap;
  font-size: 12px;
}

.card-actions {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
}

@media (max-width: 760px) {
  .page-hero,
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
