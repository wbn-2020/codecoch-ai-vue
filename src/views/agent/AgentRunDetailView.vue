<template>
  <div class="agent-run-page page-shell">
    <section class="run-hero">
      <div>
        <div class="run-eyebrow">
          <Sparkles :size="16" />
          AI 教练生成详情
        </div>
        <h1>{{ detail?.targetJobTitle || '训练计划详情' }}</h1>
        <p>查看这次智能教练生成的状态、耗时、关注技能和训练任务。页面只展示本次已有的计划内容。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/agent/tasks')">
          <ListChecks :size="16" />
          任务列表
        </el-button>
        <el-button type="primary" @click="router.push('/agent/today')">
          <CalendarDays :size="16" />
          今日计划
        </el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="生成详情加载失败" :description="errorMessage">
      <el-button type="primary" @click="fetchDetail">重试</el-button>
    </AppState>

    <section v-else v-loading="loading" class="run-panel">
      <AppState
        v-if="!loading && !detail"
        type="empty"
        title="未找到运行记录"
        description="该运行不存在，或当前账号没有访问权限。"
      />

      <template v-else-if="detail">
        <div class="run-overview">
          <div class="run-title-block">
            <span>训练计划已保存</span>
            <h2>{{ detail.targetJobTitle || '今日训练计划' }}</h2>
            <p>{{ statusDescription }}</p>
          </div>
          <StatusTag :status="detail.status" :map="runStatusMap" />
        </div>

        <section class="metric-grid">
          <article v-for="metric in metrics" :key="metric.label" class="metric-card">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <p>{{ metric.desc }}</p>
          </article>
        </section>

        <el-alert
          v-if="isFailedRun"
          class="run-alert"
          type="error"
          show-icon
          :closable="false"
          title="本次生成失败"
          :description="displayAgentError(detail.errorMessage || detail.errorCode)"
        />

        <section class="info-grid">
          <article class="info-card">
            <div class="section-head">
              <div>
                <p>生成信息</p>
                <h3>触发与耗时</h3>
              </div>
              <Activity :size="18" />
            </div>
            <dl>
              <div>
                <dt>触发方式</dt>
                <dd>{{ triggerLabel(detail.triggerType) }}</dd>
              </div>
              <div>
                <dt>计划日期</dt>
                <dd>{{ detail.planDate || '--' }}</dd>
              </div>
              <div>
                <dt>开始时间</dt>
                <dd>{{ formatDateTime(detail.startedAt) }}</dd>
              </div>
              <div>
                <dt>结束时间</dt>
                <dd>{{ formatDateTime(detail.finishedAt) }}</dd>
              </div>
            </dl>
          </article>

          <article class="info-card">
            <div class="section-head">
              <div>
                <p>生成线索</p>
                <h3>智能教练</h3>
              </div>
              <Cpu :size="18" />
            </div>
            <dl>
              <div>
                <dt>计划类型</dt>
                <dd>{{ agentTypeLabel(detail.agentType) }}</dd>
              </div>
              <div>
                <dt>生成服务</dt>
                <dd>{{ displayModelService(detail.modelName) }}</dd>
              </div>
              <div>
                <dt>计划模板</dt>
                <dd>{{ promptTypeLabel(detail.promptType) }}</dd>
              </div>
              <div>
                <dt>处理线索</dt>
                <dd>{{ detail.traceId ? '已保存' : '--' }}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section class="summary-panel">
          <div class="section-head">
            <div>
              <p>摘要</p>
              <h3>本次计划摘要</h3>
            </div>
          </div>
          <p class="summary-text">{{ detail.summary || summaryFallback }}</p>
          <div v-if="detail.focusSkills?.length" class="skill-tags">
            <el-tag v-for="skill in detail.focusSkills" :key="skill.code || skill.name" effect="plain">
              {{ skill.name || skill.code }}
            </el-tag>
          </div>
        </section>

        <section class="tasks-panel">
          <div class="section-head">
            <div>
              <p>任务</p>
              <h3>生成任务</h3>
            </div>
            <el-button text type="primary" @click="router.push('/agent/tasks')">查看全部任务</el-button>
          </div>

          <div class="task-list">
            <AppState
              v-if="!runTasks.length"
              type="empty"
              title="本次生成还没有任务"
              description="本次生成暂未产生可执行任务。可以回到今日计划重新生成，或查看任务列表中的历史记录。"
            >
              <el-button type="primary" @click="router.push('/agent/today')">回到今日计划</el-button>
            </AppState>

            <article v-for="task in runTasks" :key="task.id" class="task-card" :class="`is-${normalizeStatus(task.status).toLowerCase()}`">
              <div class="task-main">
                <div class="task-head">
                  <div>
                    <span>{{ formatDate(task.dueDate || task.createdAt) }}</span>
                    <h4>{{ displayTaskTitle(task) }}</h4>
                  </div>
                  <StatusTag :status="task.status" :map="taskStatusMap" />
                </div>
                <p>{{ displayTaskDescription(task) }}</p>
                <div class="task-meta">
                  <span>{{ taskTypeLabel(task.taskType) }}</span>
                  <span>{{ priorityLabel(task.priority) }}</span>
                  <span>{{ task.estimatedMinutes ?? 0 }} 分钟</span>
                  <span v-if="task.relatedSkillName">{{ task.relatedSkillName }}</span>
                </div>
              </div>
              <el-button class="task-action" @click="router.push('/agent/tasks')">
                去处理
                <ChevronRight :size="16" />
              </el-button>
            </article>
          </div>
        </section>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, CalendarDays, ChevronRight, Cpu, ListChecks, Sparkles } from 'lucide-vue-next'

import { getAgentRunDetailApi } from '@/api/agent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AgentRunDetailVO, AgentTaskVO } from '@/types/agent'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const detail = ref<AgentRunDetailVO>()

const runStatusMap = {
  PENDING: '等待中',
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
  CANCELED: '取消'
}

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const triggerMap: Record<string, string> = {
  MANUAL: '手动触发',
  AUTO: '自动触发'
}

const taskTypeMap: Record<string, string> = {
  QUESTION_PRACTICE: '刷题练习',
  WRONG_QUESTION_REVIEW: '错题复习',
  RESUME_OPTIMIZE: '简历优化',
  INTERVIEW: '模拟面试',
  STUDY_TASK: '学习任务',
  REPORT_REVIEW: '报告复盘',
  SKILL_REVIEW: '技能复习',
  KNOWLEDGE_REVIEW: '知识复盘'
}

const priorityMap: Record<string, string> = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
}

const summaryFallback = '本次生成暂未返回摘要。你仍可以查看下方生成任务，按优先级完成后系统会更新后续计划。'

const runTasks = computed(() => detail.value?.tasks || [])
const isFailedRun = computed(() => normalizeStatus(detail.value?.status) === 'FAILED')
const generatedTaskCount = computed(() => runTasks.value.length)
const doneTaskCount = computed(() => runTasks.value.filter((task) => normalizeStatus(task.status) === 'DONE').length)
const estimatedMinutes = computed(() => runTasks.value.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0))
const tokenTotal = computed(() => (detail.value?.tokenInput || 0) + (detail.value?.tokenOutput || 0))

const statusDescription = computed(() => {
  const status = normalizeStatus(detail.value?.status)
  if (status === 'SUCCESS') return '本次生成已完成，可查看摘要和生成任务。'
  if (status === 'RUNNING') return '智能教练正在生成计划，稍后刷新查看结果。'
  if (status === 'FAILED') return '本次生成失败，下方会展示失败原因。'
  if (status === 'CANCELED') return '本次生成已取消。'
  return '本次处理进度来自你的智能教练计划生成。'
})

const metrics = computed(() => [
  { label: '生成任务', value: generatedTaskCount.value, desc: '本次生成返回的任务数量' },
  { label: '已完成', value: doneTaskCount.value, desc: '这些任务后续会进入训练反馈' },
  { label: '预计耗时', value: `${estimatedMinutes.value}m`, desc: '任务预计训练时间合计' },
  { label: '生成耗时', value: formatDuration(detail.value?.durationMs), desc: tokenTotal.value ? '生成过程已记录，可用于后续查看原因' : '从开始到完成的等待时间' }
])

const normalizeStatus = (value?: string | null) => String(value || '').toUpperCase()
const displayAgentError = (value?: string | null) => toFriendlyMessage(value, '--')
const taskTypeLabel = (value?: string | null) => (value ? taskTypeMap[String(value).toUpperCase()] || '专项训练' : '未分类')
const priorityLabel = (value?: string | null) => (value ? priorityMap[String(value).toUpperCase()] || '普通优先级' : '无优先级')
const triggerLabel = (value?: string | null) => (value ? triggerMap[String(value).toUpperCase()] || '系统触发' : '--')
const agentTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  if (type.includes('DAILY') || type.includes('PLAN')) return '今日训练计划'
  if (type.includes('REVIEW')) return '训练复盘'
  if (type.includes('TASK')) return '任务生成'
  return value ? '智能教练计划' : '--'
}

const promptTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  if (type.includes('DAILY') || type.includes('PLAN')) return '今日计划模板'
  if (type.includes('REVIEW')) return '复盘模板'
  return value ? '通用计划模板' : '--'
}

const displayModelService = (value?: string | null) => (value ? '智能生成服务' : '--')
const displayTaskTitle = (task: AgentTaskVO) => {
  if (task.title) return task.title
  if (task.relatedSkillName) return `${task.relatedSkillName} ${taskTypeLabel(task.taskType)}`
  if (task.targetJobTitle) return `${task.targetJobTitle} 训练任务`
  return '训练任务'
}

const displayTaskDescription = (task: AgentTaskVO) => {
  if (task.description) return task.description
  if (task.reason) return task.reason
  return '暂无任务描述，可先查看任务标题和下一步动作。'
}

const formatDate = (value?: string) => {
  if (!value) return '时间未定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatDuration = (value?: number) => {
  if (!Number.isFinite(value) || !value) return '--'
  if (value < 1000) return '不足 1 秒'
  return `约 ${Math.round(value / 100) / 10} 秒`
}

const fetchDetail = async () => {
  const rawId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) {
    errorMessage.value = '计划链接不完整'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    detail.value = await getAgentRunDetailApi(id)
  } catch (error) {
    detail.value = undefined
    errorMessage.value = getErrorMessage(error, '生成详情加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.agent-run-page {
  display: grid;
  gap: 22px;
}

.run-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(20, 184, 166, 0.08)),
    var(--app-surface, #ffffff);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
}

.run-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.run-hero h1 {
  margin: 0;
  color: var(--app-text, #111827);
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 0;
}

.run-hero p {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--app-text-muted, #64748b);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.run-panel {
  min-height: 360px;
  padding: 22px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: var(--app-surface, #ffffff);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
}

.run-overview {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.run-title-block span,
.section-head p {
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
}

.run-title-block h2,
.section-head h3 {
  margin: 6px 0 0;
  color: var(--app-text, #111827);
  letter-spacing: 0;
}

.run-title-block h2 {
  font-size: 24px;
  line-height: 1.25;
}

.run-title-block p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.metric-card {
  padding: 18px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: #f8fafc;
}

.metric-card span {
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text, #111827);
  font-size: 24px;
  line-height: 1.15;
}

.metric-card p {
  margin: 8px 0 0;
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.6;
}

.run-alert,
.info-grid,
.summary-panel,
.tasks-panel {
  margin-top: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.info-card,
.summary-panel,
.tasks-panel {
  padding: 20px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: #ffffff;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.section-head p {
  margin: 0;
}

.info-card dl {
  display: grid;
  gap: 12px;
  margin: 18px 0 0;
}

.info-card dl div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.info-card dl div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.info-card dt {
  color: var(--app-text-muted, #64748b);
}

.info-card dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--app-text, #111827);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-text {
  margin: 14px 0 0;
  color: #475569;
  line-height: 1.75;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.task-list {
  margin-top: 16px;
}

.task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 18px;
  align-items: center;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  border-radius: 8px;
  background: #ffffff;
}

.task-card + .task-card {
  margin-top: 12px;
}

.task-card.is-todo {
  border-left-color: #2563eb;
}

.task-card.is-doing {
  border-left-color: #0f766e;
}

.task-card.is-done {
  border-left-color: #16a34a;
}

.task-card.is-skipped {
  border-left-color: #f59e0b;
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-head span {
  display: block;
  margin-bottom: 6px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
  font-weight: 600;
}

.task-head h4 {
  margin: 0;
  color: var(--app-text, #111827);
  font-size: 17px;
  line-height: 1.35;
  letter-spacing: 0;
}

.task-main p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.65;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.task-meta span {
  padding: 5px 9px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}

.task-action {
  width: 100%;
}

@media (max-width: 1000px) {
  .metric-grid,
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .run-hero,
  .run-overview,
  .task-head {
    flex-direction: column;
  }

  .run-hero {
    padding: 22px;
  }

  .run-hero h1 {
    font-size: 24px;
  }

  .hero-actions,
  .hero-actions :deep(.el-button) {
    width: 100%;
  }

  .run-panel {
    padding: 16px;
  }

  .metric-grid,
  .info-grid,
  .task-card {
    grid-template-columns: 1fr;
  }

  .info-card dl div {
    flex-direction: column;
    gap: 6px;
  }

  .info-card dd {
    text-align: left;
    white-space: normal;
  }
}
</style>
