<template>
  <div class="dashboard-page">
    <section class="dashboard-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow">
          <Sparkles :size="16" />
          <span>AI Java Interview Workspace</span>
        </div>
        <h1>欢迎回来，{{ displayName }}</h1>
        <p>
          这里是你的 AI 求职训练工作台，聚合 Java 面试训练、简历准备、题库复盘和后续学习计划入口。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="go('/interviews/create')">
            <PlayCircle :size="18" />
            开始 AI 模拟面试
          </el-button>
          <el-button size="large" @click="go('/resumes')">
            <FileText :size="18" />
            进入简历中心
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="panel-header">
          <span>Current Training Position</span>
          <span class="status-pill status-pill--info">V2 能力接入中</span>
        </div>
        <div class="terminal-card">
          <div class="terminal-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <code>
            <span>$ codecoach status</span>
            <span>track: Java Backend Interview</span>
            <span>mode: resume + question bank + AI mock</span>
            <span>next: start-interview --with-real-api</span>
          </code>
        </div>
      </div>
    </section>

    <section v-if="overviewError" class="dashboard-alert">
      <AlertTriangle :size="18" />
      <span>工作台概览加载失败，已保留页面入口和空状态。请稍后刷新重试。</span>
      <el-button text @click="fetchOverview">重试</el-button>
    </section>

    <section class="metric-grid dashboard-metrics" v-loading="overviewLoading">
      <button
        v-for="item in metrics"
        :key="item.label"
        class="metric-card metric-card--interactive"
        type="button"
        :disabled="item.disabled"
        @click="item.path && go(item.path)"
      >
        <span class="metric-card__icon" :class="item.tone">
          <component :is="item.icon" :size="20" />
        </span>
        <span class="metric-card__label">{{ item.label }}</span>
        <strong class="metric-card__value">{{ item.value }}</strong>
        <span class="metric-card__hint">{{ item.hint }}</span>
      </button>
    </section>

    <section class="dashboard-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Quick Actions</p>
          <h2>核心训练入口</h2>
        </div>
        <span class="section-note">仅绑定当前真实存在的路由</span>
      </div>

      <div class="action-grid">
        <button
          v-for="item in actionCards"
          :key="item.title"
          class="action-card"
          type="button"
          :disabled="item.disabled"
          @click="item.path && go(item.path)"
        >
          <span class="action-card__icon" :class="item.tone">
            <component :is="item.icon" :size="22" />
          </span>
          <span class="action-card__content">
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </span>
          <span v-if="item.badge" class="status-pill">{{ item.badge }}</span>
          <ArrowRight v-else :size="17" class="action-card__arrow" />
        </button>
      </div>
    </section>

    <div class="dashboard-main-grid">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Training Path</p>
            <h2>面试训练路径</h2>
          </div>
        </div>

        <div class="timeline">
          <button
            v-for="(step, index) in trainingPath"
            :key="step.title"
            class="timeline-step"
            type="button"
            :disabled="step.disabled"
            @click="step.path && go(step.path)"
          >
            <span class="timeline-step__index">{{ index + 1 }}</span>
            <span class="timeline-step__body">
              <strong>{{ step.title }}</strong>
              <span>{{ step.desc }}</span>
            </span>
            <span v-if="step.badge" class="status-pill">{{ step.badge }}</span>
          </button>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Skill Radar</p>
            <h2>能力模块 / 薄弱点</h2>
          </div>
        </div>

        <div class="skill-panel">
          <div class="skill-empty">
            <BrainCircuit :size="22" />
            <span>完成一次 AI 模拟面试后，将通过真实报告生成能力诊断。</span>
          </div>
          <div class="skill-tags">
            <span v-for="skill in skillModules" :key="skill">{{ skill }}</span>
          </div>
        </div>
      </section>
    </div>

    <div class="dashboard-main-grid">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Recent Activity</p>
            <h2>最近面试 / 报告</h2>
          </div>
          <el-button text @click="go('/interviews/history')">查看历史</el-button>
        </div>

        <div v-loading="recentLoading" class="recent-list">
          <template v-if="recentInterviews.length">
            <button
              v-for="item in recentInterviews"
              :key="item.interviewId"
              class="recent-item"
              type="button"
              @click="go(`/interviews/${item.interviewId}`)"
            >
              <span class="recent-item__icon">
                <Clock3 :size="18" />
              </span>
              <span class="recent-item__content">
                <strong>{{ item.interviewName || '未命名面试' }}</strong>
                <span>{{ formatInterviewMeta(item) }}</span>
              </span>
              <span class="status-pill">{{ formatStatus(item.status) }}</span>
            </button>
          </template>
          <div v-else class="empty-state">
            <History :size="24" />
            <strong>{{ recentError ? '最近动态加载失败' : '暂无最近面试记录' }}</strong>
            <span>{{ recentError ? '可稍后重试或进入面试历史查看。' : '完成一次模拟面试后，这里会显示真实记录。' }}</span>
          </div>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">AI Suggestion</p>
            <h2>下一步建议</h2>
          </div>
        </div>

        <div class="ai-suggestion">
          <div class="suggestion-icon">
            <Route :size="24" />
          </div>
          <div>
            <strong>先完成一次基于简历的模拟面试</strong>
            <p>
              当前没有真实 AI 个性化建议数据。完成面试并生成报告后，可继续接入学习计划和薄弱点复盘能力。
            </p>
          </div>
          <el-button type="primary" plain @click="go('/interviews/create')">创建面试</el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  FileText,
  History,
  Layers,
  PlayCircle,
  RefreshCcw,
  Route,
  Sparkles,
  Star,
  Target
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getInterviewsApi } from '@/api/interview'
import { getUserOverviewApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { InterviewListVO } from '@/types/interview'
import type { UserOverviewVO } from '@/types/user'

interface MetricItem {
  label: string
  value: string | number
  hint: string
  icon: Component
  tone: string
  path?: string
  disabled?: boolean
}

interface ActionItem {
  title: string
  desc: string
  icon: Component
  tone: string
  path?: string
  badge?: string
  disabled?: boolean
}

const router = useRouter()
const authStore = useAuthStore()

const overviewLoading = ref(false)
const overviewError = ref(false)
const overview = ref<UserOverviewVO | null>(null)
const recentLoading = ref(false)
const recentError = ref(false)
const recentInterviews = ref<InterviewListVO[]>([])

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)

const metricValue = (key: keyof UserOverviewVO) => {
  const value = overview.value?.[key]
  return typeof value === 'number' ? value : '--'
}

const metrics = computed<MetricItem[]>(() => [
  {
    label: '已完成面试',
    value: metricValue('completedInterviewCount'),
    hint: '来自用户概览接口',
    icon: Target,
    tone: 'tone-blue',
    path: '/interviews/history'
  },
  {
    label: '平均得分',
    value: '--',
    hint: '暂无真实聚合字段',
    icon: BrainCircuit,
    tone: 'tone-purple',
    disabled: true
  },
  {
    label: '简历数量',
    value: metricValue('resumeCount'),
    hint: '来自用户概览接口',
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    label: '错题数',
    value: metricValue('wrongQuestionCount'),
    hint: '来自用户概览接口',
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/questions/wrong-records'
  },
  {
    label: '收藏题数',
    value: metricValue('favoriteQuestionCount'),
    hint: '来自用户概览接口',
    icon: Star,
    tone: 'tone-green',
    path: '/questions/favorites'
  },
  {
    label: '学习计划进度',
    value: '--',
    hint: '待接入真实能力',
    icon: Route,
    tone: 'tone-muted',
    disabled: true
  }
])

const actionCards: ActionItem[] = [
  {
    title: '开始 AI 模拟面试',
    desc: '进入真实创建面试流程',
    icon: PlayCircle,
    tone: 'tone-blue',
    path: '/interviews/create'
  },
  {
    title: '简历中心 / 优化入口',
    desc: '管理简历，V2 优化能力待接入',
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    title: '题库练习',
    desc: '按真实题库接口进行刷题训练',
    icon: BookOpenCheck,
    tone: 'tone-purple',
    path: '/questions'
  },
  {
    title: '错题复盘',
    desc: '查看真实错题记录',
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/questions/wrong-records'
  },
  {
    title: '收藏题目',
    desc: '沉淀高频重点题',
    icon: Star,
    tone: 'tone-green',
    path: '/questions/favorites'
  },
  {
    title: '面试历史 / 报告',
    desc: '查看历史面试和报告入口',
    icon: History,
    tone: 'tone-blue',
    path: '/interviews/history'
  },
  {
    title: '学习计划',
    desc: '完成报告后生成训练计划',
    icon: Route,
    tone: 'tone-muted',
    badge: '待接入',
    disabled: true
  }
]

const trainingPath: ActionItem[] = [
  {
    title: '完善简历',
    desc: '先维护真实简历内容',
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    title: '选择场景',
    desc: '在创建面试页选择当前已支持配置',
    icon: Layers,
    tone: 'tone-purple',
    path: '/interviews/create'
  },
  {
    title: '开始面试',
    desc: '通过真实面试流程进入作答',
    icon: PlayCircle,
    tone: 'tone-blue',
    path: '/interviews/create'
  },
  {
    title: '查看报告',
    desc: '从面试历史进入真实报告',
    icon: History,
    tone: 'tone-green',
    path: '/interviews/history'
  },
  {
    title: '生成学习计划',
    desc: '后续版本接入真实学习计划',
    icon: Route,
    tone: 'tone-muted',
    badge: '待接入',
    disabled: true
  }
]

const skillModules = ['JVM', '并发', 'MySQL', 'Redis', 'Spring Boot', 'Spring Cloud', '项目深挖']
const statusTextMap: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  WAITING_ANSWER: '待作答',
  AI_EVALUATING: 'AI 评分中',
  REPORT_GENERATING: '报告生成中',
  COMPLETED: '已完成',
  CANCELED: '已取消',
  FAILED: '失败'
}

const go = (path: string) => {
  router.push(path)
}

const formatStatus = (status: string) => statusTextMap[status] || status || '未知状态'

const formatDate = (value?: string) => {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatInterviewMeta = (item: InterviewListVO) => {
  const time = item.finishedAt || item.startedAt || item.createdAt
  const score = typeof item.totalScore === 'number' ? ` · ${item.totalScore} 分` : ''
  return `${formatDate(time)}${score}`
}

const fetchOverview = async () => {
  overviewLoading.value = true
  overviewError.value = false
  try {
    overview.value = await getUserOverviewApi()
  } catch {
    overviewError.value = true
  } finally {
    overviewLoading.value = false
  }
}

const fetchRecentInterviews = async () => {
  recentLoading.value = true
  recentError.value = false
  try {
    const page = await getInterviewsApi({ pageNo: 1, pageSize: 3 })
    recentInterviews.value = page.records
  } catch {
    recentError.value = true
    recentInterviews.value = []
  } finally {
    recentLoading.value = false
  }
}

onMounted(() => {
  fetchOverview()
  fetchRecentInterviews()
})
</script>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-hero,
.dashboard-section,
.dashboard-alert {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.64)),
    rgba(15, 23, 42, 0.76);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.dashboard-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 24px;
  overflow: hidden;
  padding: 28px;

  &::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: '';
    background:
      radial-gradient(circle at 18% 18%, rgba(59, 130, 246, 0.22), transparent 26rem),
      radial-gradient(circle at 78% 10%, rgba(139, 92, 246, 0.2), transparent 24rem);
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.hero-copy {
  min-width: 0;

  h1 {
    max-width: 760px;
    margin: 14px 0 0;
    color: #f8fafc;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 800;
    line-height: 1.06;
  }

  p {
    max-width: 680px;
    margin: 18px 0 0;
    color: #cbd5e1;
    font-size: 15px;
    line-height: 1.8;
  }
}

.hero-eyebrow,
.section-kicker,
.metric-card__icon,
.action-card__icon,
.recent-item__icon,
.suggestion-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.hero-eyebrow {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;

  :deep(.el-button) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
}

.hero-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: rgba(2, 6, 23, 0.54);
}

.panel-header,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-header {
  color: var(--app-text-muted);
  font-size: 12px;
}

.terminal-card {
  min-height: 180px;
  padding: 16px;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.72);
}

.terminal-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;

  span {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.42);

    &:first-child {
      background: #f87171;
    }

    &:nth-child(2) {
      background: #fbbf24;
    }

    &:nth-child(3) {
      background: #34d399;
    }
  }
}

.terminal-card code {
  display: grid;
  gap: 10px;
  color: #a7f3d0;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: normal;
}

.dashboard-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: #fed7aa;
}

.dashboard-metrics {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.metric-card--interactive {
  display: flex;
  min-height: 166px;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid var(--app-border);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:not(:disabled):hover {
    transform: translateY(-2px);
    border-color: rgba(129, 140, 248, 0.48);
    background: rgba(30, 41, 59, 0.82);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.metric-card__icon,
.action-card__icon,
.recent-item__icon,
.suggestion-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.14);
  color: #c4b5fd;
}

.metric-card__label {
  margin-top: 16px;
}

.metric-card__hint {
  margin-top: auto;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.dashboard-section {
  padding: 20px;
}

.section-heading {
  margin-bottom: 16px;

  h2 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 18px;
  }
}

.section-kicker {
  margin: 0;
  color: var(--cc-ai-cyan);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.section-note {
  color: var(--app-text-muted);
  font-size: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.action-card,
.timeline-step,
.recent-item {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.58);
  color: var(--app-text);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &:not(:disabled):hover {
    transform: translateY(-1px);
    border-color: rgba(129, 140, 248, 0.46);
    background: rgba(30, 41, 59, 0.76);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }
}

.action-card {
  min-height: 118px;
  gap: 14px;
  padding: 16px;
  text-align: left;
}

.action-card__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 6px;

  strong {
    color: #f8fafc;
    font-size: 15px;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.55;
  }
}

.action-card__arrow {
  color: var(--app-text-muted);
}

.status-pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #cbd5e1;
  font-size: 12px;
  white-space: nowrap;
}

.status-pill--info {
  border-color: rgba(34, 211, 238, 0.28);
  background: rgba(6, 182, 212, 0.12);
  color: #67e8f9;
}

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 18px;
}

.timeline {
  display: grid;
  gap: 10px;
}

.timeline-step {
  gap: 12px;
  padding: 13px;
  text-align: left;
}

.timeline-step__index {
  display: inline-flex;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: rgba(99, 102, 241, 0.16);
  color: #c4b5fd;
  font-weight: 700;
}

.timeline-step__body {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;

  strong {
    color: #f8fafc;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.skill-panel {
  display: grid;
  gap: 16px;
}

.skill-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.6;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    padding: 8px 10px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.58);
    color: #cbd5e1;
    font-size: 12px;
  }
}

.recent-list {
  min-height: 188px;
}

.recent-item {
  gap: 12px;
  padding: 12px;

  & + & {
    margin-top: 10px;
  }
}

.recent-item__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
  text-align: left;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #f8fafc;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.empty-state {
  display: grid;
  min-height: 188px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: var(--app-text-muted);
  text-align: center;

  strong {
    color: #e2e8f0;
  }

  span {
    max-width: 360px;
    font-size: 13px;
    line-height: 1.6;
  }
}

.ai-suggestion {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  strong {
    color: #f8fafc;
  }

  p {
    margin: 8px 0 16px;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.7;
  }
}

.tone-blue {
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.tone-purple {
  background: rgba(139, 92, 246, 0.14);
  color: #c4b5fd;
}

.tone-cyan {
  background: rgba(6, 182, 212, 0.14);
  color: #67e8f9;
}

.tone-amber {
  background: rgba(245, 158, 11, 0.14);
  color: #fcd34d;
}

.tone-green {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.tone-muted {
  background: rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
}

@media (max-width: 1280px) {
  .dashboard-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .dashboard-hero,
  .dashboard-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .dashboard-hero,
  .dashboard-section {
    padding: 16px;
  }

  .dashboard-metrics,
  .action-grid {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .section-heading,
  .dashboard-alert {
    flex-direction: column;
  }

  .ai-suggestion {
    grid-template-columns: 1fr;
  }
}
</style>
