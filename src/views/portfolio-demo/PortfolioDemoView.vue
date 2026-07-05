<template>
  <div class="portfolio-demo page-shell" v-loading="loading">
    <section class="page-hero">
      <div class="hero-copy">
        <p class="hero-kicker">作品集演示</p>
        <h1>作品集演示控制台</h1>
        <p>{{ story?.status?.message || '加载脱敏演示数据，沿真实产品链路讲清 CodeCoachAI。' }}</p>
      </div>
      <div class="hero-actions">
        <el-tag :type="story?.status?.loaded ? 'success' : 'warning'">{{ story?.status?.status || 'EMPTY' }}</el-tag>
        <el-button :loading="loadingAction" @click="loadDemo">加载演示数据</el-button>
        <el-button :loading="loadingAction" @click="resetDemo">重置演示数据</el-button>
      </div>
    </section>

    <el-alert
      v-if="errorMessage"
      class="demo-error"
      type="error"
      :closable="false"
      title="演示主线加载失败"
      :description="errorMessage"
    >
      <el-button class="retry-storyline" @click="fetchStory">重试</el-button>
    </el-alert>

    <section class="content-card status-panel">
      <div class="status-main">
        <div>
          <span class="status-label">数据集</span>
          <strong>{{ story?.status?.datasetName || 'CodeCoachAI 作品集演示' }}</strong>
          <p>
            {{ story?.status?.datasetKey || 'portfolio-3b-v1' }}
            <span v-if="story?.status?.version"> / {{ story.status.version }}</span>
          </p>
        </div>
        <div class="coverage-summary" :class="{ 'is-ready': coverage.ready }">
          已覆盖 {{ coverage.covered }}/{{ coverage.total }}
        </div>
      </div>
      <div class="status-grid">
        <div>
          <span>演示标识</span>
          <strong>{{ story?.status?.demoData ? '演示数据' : '待加载' }}</strong>
        </div>
        <div>
          <span>写入策略</span>
          <strong>{{ story?.status?.readOnly ? '只读展示' : '可写入' }}</strong>
        </div>
        <div>
          <span>最近加载</span>
          <strong>最近加载：{{ story?.status?.loadedAt || '-' }}</strong>
        </div>
        <div>
          <span>最近重置</span>
          <strong>最近重置：{{ story?.status?.resetAt || '-' }}</strong>
        </div>
      </div>
    </section>

    <el-alert
      v-if="story && !coverage.ready"
      type="warning"
      :closable="false"
      title="演示主线仍有缺口"
      :description="coverageDescription"
    />

    <section class="content-card demo-section">
      <div class="section-head">
        <div>
          <h2>5 分钟用户侧演示路线</h2>
          <p>目标岗位 -> JD 匹配 -> 项目证据 -> 面试训练 -> 面试报告 -> 能力图谱 -> 求职实验复盘 -> Agent 今日任务</p>
        </div>
        <el-tag type="warning" effect="plain">演示数据</el-tag>
      </div>
      <div v-if="story?.steps?.length" class="story-grid">
        <button
          v-for="step in story.steps"
          :key="step.key"
          class="story-step"
          :class="{ 'is-missing': step.status === 'MISSING' || step.demoData !== true }"
          @click="go(step.route)"
        >
          <span>{{ step.title }}</span>
          <small>{{ step.evidenceSummary || '缺少证据摘要，请重新加载演示数据。' }}</small>
          <em>{{ stepStatusLabel(step) }}</em>
        </button>
      </div>
      <div v-else class="empty-state">暂无用户侧演示路线，请先加载演示数据。</div>
    </section>

    <section class="content-card demo-section">
      <div class="section-head">
        <div>
          <h2>10 分钟深讲路线</h2>
          <p>产品闭环 -> 求职实验台 -> AI 证据链 -> 个人知识库 -> 长期记忆 -> 管理侧工程能力</p>
        </div>
        <el-tag effect="plain">MVP / Preview</el-tag>
      </div>
      <div class="story-grid">
        <button
          v-for="step in deepDiveSteps"
          :key="step.key"
          class="story-step"
          :class="{ 'is-missing': step.status !== 'READY' }"
          @click="go(step.route)"
        >
          <span>{{ step.title }}</span>
          <small>{{ step.evidenceSummary }}</small>
          <em>{{ stepStatusLabel(step) }}</em>
        </button>
      </div>
    </section>

    <section class="content-card demo-section">
      <div class="section-head">
        <div>
          <h2>管理侧工程演示路线</h2>
          <p>Agent 运行记录 -> Prompt 模板 -> Prompt 回归 -> AI 服务记录 -> 异步任务中心 -> 指标字典 -> AI 运营看板</p>
        </div>
        <el-tag effect="plain">AI Ops / Agent / Prompt / Logs</el-tag>
      </div>
      <div v-if="story?.opsSteps?.length" class="story-grid">
        <button
          v-for="step in story.opsSteps"
          :key="step.key"
          class="story-step"
          :class="{ 'is-missing': step.status === 'MISSING' || step.demoData !== true }"
          @click="go(step.route)"
        >
          <span>{{ step.title }}</span>
          <small>{{ step.evidenceSummary || '缺少证据摘要，请重新加载演示数据。' }}</small>
          <em>{{ stepStatusLabel(step) }}</em>
        </button>
      </div>
      <div v-else class="empty-state">暂无管理侧演示路线，请先加载演示数据。</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import {
  getPortfolioDemoStorylineApi,
  loadPortfolioDemoApi,
  resetPortfolioDemoApi
} from '@/api/jobExperiment'
import {
  buildPortfolioDemoCoverage,
  resolvePortfolioDemoRoute
} from '@/features/portfolio-demo'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const router = useRouter()
const loading = ref(false)
const loadingAction = ref(false)
const errorMessage = ref('')
const story = ref<PortfolioDemoStorylineVO>()

const coverage = computed(() => buildPortfolioDemoCoverage(story.value))
const deepDiveSteps = computed(() => {
  const experiment = story.value?.steps?.find((step) => step.key === 'job-experiment-review')
  return [
    {
      key: 'deep-product-loop',
      title: '产品闭环',
      route: '/portfolio-demo',
      evidenceSummary: '从用户侧路线总览说明目标、训练、复盘、建议和行动如何串起来。',
      status: coverage.value.ready ? 'READY' : 'MVP',
      demoData: coverage.value.ready
    },
    {
      key: 'deep-job-experiment',
      title: '求职实验台',
      route: experiment?.route || '/job-experiments?demoFlag=true',
      evidenceSummary: experiment?.evidenceSummary || '使用求职实验复盘说明样本不足和弱建议边界。',
      status: experiment?.status || 'MVP',
      demoData: experiment?.demoData === true
    },
    {
      key: 'deep-ai-evidence',
      title: 'AI 建议证据链',
      route: '/agent/today?demoFlag=true',
      evidenceSummary: '展示建议来源、置信度、样本边界、反馈状态和 trace 信息。',
      status: 'MVP',
      demoData: false
    },
    {
      key: 'deep-knowledge',
      title: '个人知识库',
      route: '/knowledge?demoFlag=true',
      evidenceSummary: '个人知识库仍按 preview/MVP 讲解，说明资料沉淀和引用来源。',
      status: 'MVP',
      demoData: false
    },
    {
      key: 'deep-memory',
      title: '长期记忆',
      route: '/agent/memory?demoFlag=true',
      evidenceSummary: '长期记忆仍按 preview/MVP 讲解，强调启停、删除和推荐影响边界。',
      status: 'MVP',
      demoData: false
    },
    {
      key: 'deep-ops',
      title: '管理侧工程能力',
      route: '/admin/agent/runs?demoFlag=true',
      evidenceSummary: '进入管理侧路线讲 Agent 运行、Prompt、日志、任务和指标治理。',
      status: 'MVP',
      demoData: false
    }
  ]
})
const coverageDescription = computed(() => {
  const current = coverage.value
  const parts: string[] = []
  if (current.missingKeys.length) parts.push(`缺少节点：${current.missingKeys.join('、')}`)
  if (current.missingTitleKeys.length) parts.push(`缺少标题：${current.missingTitleKeys.join('、')}`)
  if (current.missingStatusKeys.length) parts.push(`状态不可用：${current.missingStatusKeys.join('、')}`)
  if (current.missingEvidenceKeys.length) parts.push(`缺少证据摘要：${current.missingEvidenceKeys.join('、')}`)
  if (current.missingDemoMarkerKeys.length) parts.push(`缺少 demo 标记：${current.missingDemoMarkerKeys.join('、')}`)
  if (current.invalidRoutes.length) parts.push(`不可用路线：${current.invalidRoutes.map((item) => item.key).join('、')}`)
  return parts.join('；') || '请重新加载演示数据。'
})

const fetchStory = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    story.value = await getPortfolioDemoStorylineApi()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请稍后重试。'
  } finally {
    loading.value = false
  }
}

const loadDemo = async () => {
  loadingAction.value = true
  try {
    await loadPortfolioDemoApi()
    await fetchStory()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '演示数据加载失败。')
  } finally {
    loadingAction.value = false
  }
}

const resetDemo = async () => {
  loadingAction.value = true
  try {
    await resetPortfolioDemoApi()
    await fetchStory()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '演示数据重置失败。')
  } finally {
    loadingAction.value = false
  }
}

const go = (route: string) => {
  const resolved = resolvePortfolioDemoRoute(route)
  if (resolved.unavailableReason) ElMessage.warning(resolved.unavailableReason)
  router.push(resolved.path)
}

const stepStatusLabel = (step: { status?: string; demoData?: boolean }) => {
  if (step.status === 'READY' && step.demoData === true) return '演示数据已覆盖'
  if (step.status === 'MISSING') return '缺少演示数据'
  if (step.status === 'MVP') return 'MVP 兜底讲解'
  return step.demoData ? '演示数据' : '需人工验收'
}

onMounted(fetchStory)
</script>

<style scoped lang="scss">
.page-hero,
.hero-actions,
.section-head,
.status-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.hero-copy {
  min-width: 0;
}

.hero-kicker,
.status-label {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 6px;
}

h2 {
  margin-bottom: 6px;
}

.page-hero p,
.section-head p,
.story-step small,
.status-main p,
.status-grid span {
  color: var(--app-text-muted);
}

.status-panel,
.demo-section {
  padding: 18px;
}

.status-main {
  justify-content: space-between;
  margin-bottom: 16px;
}

.coverage-summary {
  min-width: 108px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  color: #fbbf24;
  font-weight: 700;
  text-align: center;
}

.coverage-summary.is-ready {
  color: #34d399;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.status-grid > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.22);
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
  min-height: 124px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.story-step:hover {
  border-color: var(--app-primary);
}

.story-step.is-missing {
  border-color: #f59e0b;
}

.story-step span {
  font-weight: 700;
}

.story-step em {
  color: #fbbf24;
  font-size: 12px;
  font-style: normal;
}

.empty-state {
  padding: 22px;
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  color: var(--app-text-muted);
  text-align: center;
}

@media (max-width: 720px) {
  .page-hero,
  .hero-actions,
  .section-head,
  .status-main {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
