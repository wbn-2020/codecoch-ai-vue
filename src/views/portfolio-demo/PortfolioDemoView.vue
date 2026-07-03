<template>
  <div class="portfolio-demo page-shell" v-loading="loading">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">作品集演示</p>
        <h1>作品集演示模式</h1>
        <p>{{ story?.status?.message || '加载脱敏演示数据，沿真实产品链路讲清 CodeCoachAI。' }}</p>
      </div>
      <div class="hero-actions">
        <el-tag :type="story?.status?.loaded ? 'success' : 'warning'">{{ story?.status?.status || 'EMPTY' }}</el-tag>
        <el-button :loading="loadingAction" @click="loadDemo">加载演示数据</el-button>
        <el-button :loading="loadingAction" @click="resetDemo">重置演示数据</el-button>
      </div>
    </section>

    <el-alert
      v-if="story && !hasCompleteDemoMarkers(story)"
      type="warning"
      :closable="false"
      title="部分演示链路缺少 demo 标记，已按安全路由处理，请先重新加载演示数据。"
    />

    <section class="content-card demo-section">
      <div class="section-head">
        <h2>用户侧链路</h2>
        <el-tag type="warning" effect="plain">演示数据</el-tag>
      </div>
      <div class="story-grid">
        <button v-for="step in story?.steps || []" :key="step.key" class="story-step" @click="go(step.route)">
          <span>{{ step.title }}</span>
          <small>{{ step.evidenceSummary }}</small>
          <em v-if="step.demoData">演示数据</em>
        </button>
      </div>
    </section>

    <section class="content-card demo-section">
      <div class="section-head">
        <h2>工程治理视角</h2>
        <el-tag effect="plain">AI Ops / Agent / Prompt / Logs</el-tag>
      </div>
      <div class="story-grid">
        <button v-for="step in story?.opsSteps || []" :key="step.key" class="story-step" @click="go(step.route)">
          <span>{{ step.title }}</span>
          <small>{{ step.evidenceSummary }}</small>
          <em v-if="step.demoData">演示数据</em>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPortfolioDemoStorylineApi,
  loadPortfolioDemoApi,
  resetPortfolioDemoApi
} from '@/api/jobExperiment'
import { hasCompleteDemoMarkers } from '@/features/portfolio-demo'
import { resolveAppRoutePath, defaultKnownPaths } from '@/features/route-safety'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const router = useRouter()
const loading = ref(false)
const loadingAction = ref(false)
const story = ref<PortfolioDemoStorylineVO>()

const fetchStory = async () => {
  loading.value = true
  try {
    story.value = await getPortfolioDemoStorylineApi()
  } finally {
    loading.value = false
  }
}

const loadDemo = async () => {
  loadingAction.value = true
  try {
    await loadPortfolioDemoApi()
    await fetchStory()
  } finally {
    loadingAction.value = false
  }
}

const resetDemo = async () => {
  loadingAction.value = true
  try {
    await resetPortfolioDemoApi()
    await fetchStory()
  } finally {
    loadingAction.value = false
  }
}

const go = (route: string) => {
  router.push(resolveAppRoutePath(route, { knownPaths: defaultKnownPaths }).path)
}

onMounted(fetchStory)
</script>

<style scoped lang="scss">
.page-hero,
.hero-actions,
.section-head {
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
}

.page-hero p,
.story-step small {
  color: var(--app-text-muted);
}

.demo-section {
  padding: 18px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.story-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 116px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.story-step span {
  font-weight: 700;
}

.story-step em {
  color: #fbbf24;
  font-size: 12px;
  font-style: normal;
}
</style>
