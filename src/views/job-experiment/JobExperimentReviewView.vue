<template>
  <div class="job-experiment-review page-shell" v-loading="loading">
    <section class="content-card review-card" v-if="detail">
      <div class="section-head">
        <div>
          <p class="hero-kicker">实验复盘</p>
          <h1>{{ detail.title }}</h1>
        </div>
        <div class="actions">
          <el-button @click="router.push(`/job-experiments/${detail.id}`)">实验详情</el-button>
          <el-button type="primary" :loading="generating" @click="generate">生成复盘</el-button>
        </div>
      </div>
      <el-alert v-if="detail.metrics?.sampleWarning" type="warning" :closable="false" :title="detail.metrics.sampleWarning" />
      <div class="review-grid">
        <article>
          <h2>事实摘要</h2>
          <ul>
            <li v-for="fact in detail.metrics?.facts || []" :key="fact">{{ fact }}</li>
          </ul>
        </article>
        <article>
          <h2>最新复盘</h2>
          <p>{{ latest?.factSummary || '还没有生成复盘。' }}</p>
          <p>{{ latest?.insightSummary }}</p>
          <el-alert
            v-if="weakConclusion"
            type="warning"
            :closable="false"
            title="当前样本不足，复盘只能作为弱建议，不能输出强结论。"
          />
          <p class="warning">{{ latest?.unsupportedConclusion }}</p>
        </article>
      </div>
      <section v-if="latest" class="next-action">
        <h2>下一步行动</h2>
        <p>{{ latest.nextAction }}</p>
        <el-tag>{{ confidenceLabel(latest.confidenceLevel || detail.metrics?.confidenceLevel) }}</el-tag>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { generateJobExperimentReviewApi, getJobExperimentDetailApi } from '@/api/jobExperiment'
import { confidenceLabel, shouldKeepConclusionWeak } from '@/features/job-experiment'
import type { JobSearchExperimentDetailVO } from '@/types/jobExperiment'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const detail = ref<JobSearchExperimentDetailVO>()
const latest = computed(() => detail.value?.latestReview || detail.value?.reviews?.[0])
const weakConclusion = computed(() => shouldKeepConclusionWeak(detail.value?.metrics))

const id = () => Number(route.params.id)

const load = async () => {
  loading.value = true
  try {
    detail.value = await getJobExperimentDetailApi(id())
  } finally {
    loading.value = false
  }
}

const generate = async () => {
  generating.value = true
  try {
    await generateJobExperimentReviewApi(id())
    await load()
  } finally {
    generating.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.review-card {
  padding: 22px;
}

.section-head,
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-head {
  justify-content: space-between;
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.review-grid article,
.next-action {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.22);
}

.warning {
  color: #fbbf24;
}
</style>
