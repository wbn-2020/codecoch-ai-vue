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
      <AppState
        v-if="errorMessage"
        type="error"
        title="求职实验加载失败"
        :description="errorMessage"
      >
        <el-button type="primary" :loading="loading" @click="fetchList">重新加载</el-button>
      </AppState>
      <div v-else-if="items.length" class="experiment-grid">
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
            <span>{{ sampleBoundaryLabel(item) }}</span>
            <span v-if="item.demoFlag">演示数据</span>
          </div>
          <div class="evidence-row" v-if="item.metrics">
            <span>投递 {{ item.metrics.applicationCount }}</span>
            <span>简历 {{ item.metrics.resumeVersionCount }}</span>
            <span>项目证据 {{ item.metrics.projectEvidenceCount }}</span>
          </div>
          <el-alert v-if="item.sampleWarning" type="warning" :closable="false" :title="item.sampleWarning" />
          <div class="card-actions">
            <el-button @click="router.push(demoPath(`/job-experiments/${item.id}`))">查看</el-button>
            <el-button type="primary" plain @click="router.push(demoPath(`/job-experiments/${item.id}/review`))">复盘</el-button>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getJobExperimentsApi } from '@/api/jobExperiment'
import AppState from '@/components/common/AppState.vue'
import { confidenceLabel, statusLabel } from '@/features/job-experiment'
import type { JobSearchExperimentListVO, JobSearchExperimentQueryDTO } from '@/types/jobExperiment'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const errorMessage = ref('')
const items = ref<JobSearchExperimentListVO[]>([])
const isDemoContext = computed(() => route.query.demoFlag === 'true')
const query = reactive<JobSearchExperimentQueryDTO>({
  pageNo: 1,
  pageSize: 20,
  demoFlag: isDemoContext.value ? true : undefined
})

const demoPath = (path: string) => {
  if (!isDemoContext.value || path.includes('demoFlag=')) return path
  return path.includes('?') ? `${path}&demoFlag=true` : `${path}?demoFlag=true`
}

const statusTone = (status?: string) => {
  if (status === 'RUNNING') return 'success'
  if (status === 'REVIEWED') return 'primary'
  if (status === 'ARCHIVED') return 'info'
  return 'warning'
}

const fetchList = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getJobExperimentsApi(query)
    items.value = page.records || []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '求职实验加载失败，请稍后重试。'
    items.value = []
  } finally {
    loading.value = false
  }
}

const sampleBoundaryLabel = (item: JobSearchExperimentListVO) => {
  if (item.sampleBoundary?.sampleWarning || item.metrics?.sampleInsufficient) return '低样本'
  if (item.confidenceLevel === 'HIGH') return '样本可复盘'
  if (item.confidenceLevel === 'MEDIUM') return '弱观察'
  return '样本待补'
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

.evidence-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.evidence-row span {
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.2);
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
