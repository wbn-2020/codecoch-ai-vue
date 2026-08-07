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

    <section class="experiment-command-grid">
      <article class="content-card agent-suggestion">
        <div class="section-label"><Sparkles :size="15" /> Agent 建议</div>
        <h2>{{ agentSuggestion.title }}</h2>
        <p>{{ agentSuggestion.reason }}</p>
        <div class="suggestion-foot">
          <el-tag type="info" effect="plain">{{ agentSuggestion.source }}</el-tag>
          <el-button text type="primary" :disabled="!agentSuggestion.route" @click="agentSuggestion.route && router.push(agentSuggestion.route)">
            {{ agentSuggestion.action }}
            <ArrowRight :size="15" />
          </el-button>
        </div>
      </article>

      <aside class="content-card progress-overview">
        <div class="section-label">本周节奏</div>
        <div class="progress-overview__head">
          <strong>{{ completionPercent }}%</strong>
          <span>{{ activeExperiment ? statusLabel(activeExperiment.status) : '等待建立样本' }}</span>
        </div>
        <el-progress :percentage="completionPercent" :show-text="false" :stroke-width="8" />
        <p>{{ progressSummary }}</p>
      </aside>
    </section>

    <section class="experiment-followup-grid">
      <article class="content-card task-queue">
        <div class="section-head">
          <div>
            <p class="section-label">今日队列</p>
            <h2>按影响度排序</h2>
          </div>
          <el-tag type="warning" effect="plain">+100 经验</el-tag>
        </div>
        <div class="task-list">
          <article v-for="task in taskQueue" :key="task.id" class="task-row" :class="{ 'is-done': completedTaskIds.has(task.id) }">
            <button
              class="task-check"
              type="button"
              :aria-pressed="completedTaskIds.has(task.id)"
              :aria-label="completedTaskIds.has(task.id) ? '取消完成' : '标记完成'"
              @click="toggleTask(task.id)"
            >
              <CheckCircle2 :size="17" />
            </button>
            <div class="task-copy">
              <strong>{{ task.title }}</strong>
              <p>{{ task.detail }}</p>
            </div>
            <el-tag :type="completedTaskIds.has(task.id) ? 'success' : task.tone" effect="plain">
              {{ completedTaskIds.has(task.id) ? '已完成' : task.status }}
            </el-tag>
            <el-button text type="primary" :aria-label="`打开${task.title}`" @click="router.push(task.route)">
              <ArrowRight :size="15" />
            </el-button>
          </article>
        </div>
      </article>

      <aside class="followup-stack">
        <article class="content-card active-experiment-card">
          <div class="section-head">
            <div>
              <p class="section-label">求职实验</p>
              <h2>{{ activeExperiment?.title || '建立第一轮实验' }}</h2>
            </div>
            <el-tag :type="activeExperiment ? statusTone(activeExperiment.status) : 'info'" effect="plain">
              {{ activeExperiment ? statusLabel(activeExperiment.status) : '待开始' }}
            </el-tag>
          </div>
          <p>{{ activeExperiment?.goal || '围绕一个岗位方向绑定简历、投递和项目证据，形成可复盘的样本。' }}</p>
          <div class="active-experiment-stats">
            <span>投递 {{ activeExperiment?.metrics?.applicationCount ?? 0 }}</span>
            <span>简历 {{ activeExperiment?.metrics?.resumeVersionCount ?? 0 }}</span>
            <span>证据 {{ activeExperiment?.metrics?.projectEvidenceCount ?? 0 }}</span>
          </div>
          <el-button type="primary" plain :disabled="!activeExperiment" @click="activeExperiment && router.push(demoPath(`/job-experiments/${activeExperiment.id}`))">
            查看实验
            <ArrowRight :size="15" />
          </el-button>
        </article>

        <article class="content-card closeout-card">
          <p class="section-label">实验收口</p>
          <h2>先确认观察，再决定下一步</h2>
          <p>样本不足时只保留弱观察和待补证据，不把建议包装成确定结论。</p>
          <el-button text type="primary" @click="router.push(activeExperiment ? demoPath(`/job-experiments/${activeExperiment.id}/review`) : '/job-experiments/create')">
            {{ activeExperiment ? '进入复盘' : '新建实验' }}
            <ArrowRight :size="15" />
          </el-button>
        </article>
      </aside>
    </section>

    <section class="experiment-list-surface" v-loading="loading">
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
            <el-tag :type="statusTone(item.status)" effect="plain">{{ statusLabel(item.status) }}</el-tag>
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
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-vue-next'

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
const completedTaskIds = ref(new Set<string>())

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

type AgentTask = {
  id: string
  title: string
  detail: string
  status: string
  tone: 'warning' | 'info' | 'success'
  route: string
}

const activeExperiment = computed(() =>
  items.value.find((item) => item.status === 'RUNNING') || items.value[0]
)

const agentSuggestion = computed(() => {
  const item = activeExperiment.value
  if (!item) {
    return {
      title: '先建立一个可复盘样本',
      reason: '围绕一个明确岗位方向绑定简历、JD 和投递记录，后续的实验结论才有边界。',
      source: '来源：求职主线',
      action: '新建实验',
      route: '/job-experiments/create'
    }
  }

  if (item.metrics?.sampleInsufficient || item.sampleBoundary?.sampleInsufficient) {
    return {
      title: '优先补齐实验样本',
      reason: item.sampleWarning || '当前样本还不足以比较简历版本或投递策略，先补记录再下结论。',
      source: '来源：样本边界',
      action: '查看实验',
      route: demoPath(`/job-experiments/${item.id}`)
    }
  }

  return {
    title: item.nextStrategy || '进入实验复盘，确认下一步行动',
    reason: item.summary || item.goal || '从事实、观察和下一步动作三层查看本轮实验。',
    source: '来源：最近一轮实验',
    action: '进入复盘',
    route: demoPath(`/job-experiments/${item.id}/review`)
  }
})

const taskQueue = computed<AgentTask[]>(() => {
  const item = activeExperiment.value
  const prefix = item ? `实验「${item.title}」` : '当前求职主线'
  return [
    {
      id: 'target',
      title: '确认岗位主目标',
      detail: `来源：岗位目标 · ${prefix}的后续动作都围绕它收束`,
      status: '高影响',
      tone: 'warning',
      route: '/job-targets'
    },
    {
      id: 'match',
      title: '完成 JD 匹配报告',
      detail: '来源：目标岗位 · 把岗位要求转成可执行的缺口',
      status: '待处理',
      tone: 'info',
      route: '/resume-match'
    },
    {
      id: 'evidence',
      title: '补充项目证据',
      detail: '来源：JD 缺口 · 完成后可以提高岗位投递包的可信度',
      status: '高影响',
      tone: 'warning',
      route: '/project-evidence'
    },
    {
      id: 'training',
      title: '完成一轮专项训练',
      detail: '来源：面试训练室 · 预计 12 分钟，完成后回流行动计划',
      status: '明日截止',
      tone: 'info',
      route: '/questions/recommendations'
    }
  ]
})

const completionPercent = computed(() => {
  if (!taskQueue.value.length) return 0
  return Math.round((taskQueue.value.filter((task) => completedTaskIds.value.has(task.id)).length / taskQueue.value.length) * 100)
})

const progressSummary = computed(() => {
  const item = activeExperiment.value
  if (!item) return '还没有可复盘实验，先建立一轮清晰的岗位准备样本。'
  const sampleCount = item.sampleCount ?? item.metrics?.sampleCount ?? 0
  return `当前实验已有 ${sampleCount} 条样本；完成任务后再回到实验复盘确认观察。`
})

const toggleTask = (taskId: string) => {
  const next = new Set(completedTaskIds.value)
  if (next.has(taskId)) next.delete(taskId)
  else next.add(taskId)
  completedTaskIds.value = next
}

onMounted(fetchList)
</script>

<style scoped lang="scss">
.job-experiment {
  gap: 22px;
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
  gap: 20px;
  padding: 22px 24px;
  border: 1.5px solid var(--user-primary-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface-tint);
  box-shadow: var(--user-shadow-sm);
}

.hero-kicker {
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
  text-transform: none;
}

h1 {
  margin: 6px 0;
  font-size: 26px;
  font-weight: 900;
}

.page-hero p:last-child,
.card-head p,
.goal,
.metrics {
  color: var(--app-text-muted);
}

.toolbar {
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-sm);
}

.toolbar .el-input {
  max-width: 360px;
}

.toolbar .el-select {
  width: 180px;
}

.experiment-command-grid,
.experiment-followup-grid {
  display: grid;
  gap: 14px;
}

.experiment-command-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.75fr);
}

.experiment-followup-grid {
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  align-items: start;
}

.agent-suggestion,
.progress-overview,
.task-queue,
.active-experiment-card,
.closeout-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-sm);
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.agent-suggestion h2,
.progress-overview h2,
.task-queue h2,
.active-experiment-card h2,
.closeout-card h2 {
  margin: 8px 0 0;
  color: var(--user-text);
  font-size: 17px;
  line-height: 1.4;
}

.agent-suggestion > p,
.progress-overview > p,
.active-experiment-card > p,
.closeout-card > p {
  margin: 8px 0 0;
  color: var(--user-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.suggestion-foot,
.progress-overview__head,
.section-head,
.active-experiment-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.suggestion-foot {
  margin-top: 16px;
}

.suggestion-foot .el-button,
.active-experiment-card .el-button,
.closeout-card .el-button {
  gap: 5px;
}

.progress-overview__head {
  margin: 10px 0 12px;
}

.progress-overview__head strong {
  color: var(--user-primary);
  font-size: 28px;
  line-height: 1;
}

.progress-overview__head span {
  color: var(--user-text-muted);
  font-size: 12px;
}

.task-queue {
  display: grid;
  gap: 14px;
}

.section-head {
  align-items: flex-start;
}

.task-list {
  display: grid;
  gap: 8px;
}

.task-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--user-border);
}

.task-row:last-child {
  border-bottom: 0;
}

.task-row.is-done .task-copy strong {
  color: var(--user-text-muted);
  text-decoration: line-through;
}

.task-check {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--user-border);
  border-radius: 50%;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  cursor: pointer;
}

.task-row.is-done .task-check {
  border-color: var(--user-primary-border);
  background: var(--user-primary-soft);
  color: var(--user-primary);
}

.task-copy {
  min-width: 0;
}

.task-copy strong,
.task-copy p {
  display: block;
  overflow-wrap: anywhere;
}

.task-copy strong {
  color: var(--user-text);
  font-size: 13px;
  line-height: 1.45;
}

.task-copy p {
  margin: 3px 0 0;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.followup-stack {
  display: grid;
  gap: 14px;
}

.active-experiment-card,
.closeout-card {
  display: grid;
  gap: 12px;
}

.active-experiment-stats {
  justify-content: flex-start;
  flex-wrap: wrap;
  color: var(--user-text-muted);
  font-size: 12px;
}

.active-experiment-stats span {
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--user-surface-muted);
}

.experiment-list-surface {
  min-width: 0;
}

.experiment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.experiment-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-sm);
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
  border-radius: 10px;
  background: var(--user-surface-muted);
}

.card-actions {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
}

@media (max-width: 760px) {
  .page-hero,
  .toolbar,
  .experiment-command-grid,
  .experiment-followup-grid {
    align-items: flex-start;
    flex-direction: column;
  }

  .experiment-command-grid,
  .experiment-followup-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .task-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .task-row > .el-button {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
