<template>
  <div class="interview-room">
    <section class="room-topbar">
      <div>
        <div class="eyebrow">
          <Bot :size="16" />
          AI Interview War Room
        </div>
        <h1>AI 面试房间</h1>
        <p>保留真实面试 current、answer、finish 接口，以三栏作战台组织进度、作答和实时评估。</p>
      </div>
      <div class="topbar-actions">
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          工作台
        </el-button>
        <el-button @click="router.push('/interviews/history')">
          <History :size="16" />
          历史记录
        </el-button>
        <el-button type="danger" plain :loading="finishing" @click="handleManualFinish">
          <Square :size="16" />
          结束面试
        </el-button>
      </div>
    </section>

    <section class="war-room" v-loading="loading">
      <aside class="progress-panel">
        <div class="panel-title">
          <span>面试进度</span>
          <StatusTag :status="current?.status || 'NOT_STARTED'" />
        </div>

        <div class="session-card">
          <strong>{{ current?.currentStage?.stageName || '当前阶段' }}</strong>
          <p>{{ current?.currentQuestion?.stageProgress || '等待后端返回当前面试进度' }}</p>
          <div class="mini-meta">
            <span>会话 #{{ interviewId || '-' }}</span>
            <span>{{ current?.currentQuestion?.isFollowUp ? '追问题' : '主问题' }}</span>
          </div>
        </div>

        <div class="progress-list">
          <article
            v-for="item in progressItems"
            :key="item.key"
            class="progress-item"
            :class="item.state"
          >
            <span class="dot"></span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </article>
        </div>

        <el-empty v-if="!current && !loading" description="未找到面试会话" />

        <div class="side-actions">
          <el-button plain @click="fetchCurrent">刷新当前题</el-button>
          <el-button v-if="interviewId" type="primary" plain @click="router.push(`/interviews/${interviewId}/report`)">
            查看报告
          </el-button>
        </div>
      </aside>

      <main class="conversation-panel">
        <template v-if="current">
          <el-alert
            v-if="current.status === 'NOT_STARTED'"
            class="state-alert"
            type="info"
            show-icon
            :closable="false"
            title="面试尚未开始，点击开始后会获取第一道真实题目。"
          />

          <div v-if="current.status === 'NOT_STARTED'" class="start-card">
            <Rocket :size="26" />
            <div>
              <h2>准备进入 AI 面试</h2>
              <p>开始后将调用后端 start/current 流程获取第一道题。</p>
            </div>
            <el-button type="primary" size="large" :loading="starting" @click="handleStart">开始面试</el-button>
          </div>

          <article v-if="current.currentQuestion" class="message-card ai">
            <div class="message-avatar">
              <Bot :size="18" />
            </div>
            <div class="message-body">
              <div class="message-head">
                <strong>{{ current.currentQuestion.questionTitle || 'AI 面试官' }}</strong>
                <el-tag v-if="current.currentQuestion.isFollowUp" type="warning" effect="plain">追问</el-tag>
              </div>
              <MarkdownPreview :content="current.currentQuestion.questionContent" />
              <div v-if="current.currentQuestion.followUpReason" class="reason-box">
                <strong>追问原因</strong>
                <p>{{ current.currentQuestion.followUpReason }}</p>
              </div>
              <div v-if="current.currentQuestion.knowledgePoints?.length" class="tag-row">
                <el-tag v-for="item in current.currentQuestion.knowledgePoints" :key="item" effect="plain">{{ item }}</el-tag>
              </div>
            </div>
          </article>

          <el-empty
            v-else
            :description="current.status === 'NOT_STARTED' ? '点击开始面试后获取第一道题' : '暂无当前问题，请刷新或稍后重试'"
          />

          <article v-if="lastSubmittedAnswer" class="message-card user">
            <div class="message-avatar">
              <UserRound :size="18" />
            </div>
            <div class="message-body">
              <div class="message-head">
                <strong>我的上一轮回答</strong>
                <span>{{ answerDurationText }}</span>
              </div>
              <p class="answer-preview">{{ lastSubmittedAnswer }}</p>
            </div>
          </article>

          <div class="answer-console">
            <div class="console-head">
              <div>
                <h2>作答区</h2>
                <p>{{ answerDisabled ? '当前状态不可提交回答' : '提交后由真实 AI 评分接口返回评分、追问和下一步动作' }}</p>
              </div>
              <StatusTag :status="submitting ? 'AI_EVALUATING' : current.status" />
            </div>
            <el-input
              v-model="answerContent"
              type="textarea"
              :rows="9"
              :disabled="answerDisabled"
              placeholder="请输入你的回答，建议按结论、原理、项目实践、风险取舍组织表达"
            />
            <div class="answer-actions">
              <el-button
                type="primary"
                :disabled="answerDisabled"
                :loading="submitting"
                @click="handleSubmit"
              >
                <Send :size="16" />
                {{ submitting ? 'AI 正在评分并生成下一步问题' : '提交回答' }}
              </el-button>
              <el-button @click="fetchCurrent">刷新当前题</el-button>
              <el-button v-if="interviewId" plain @click="router.push(`/interviews/${interviewId}/report`)">查看报告</el-button>
            </div>
            <el-alert
              v-if="submitting"
              class="state-alert"
              type="info"
              show-icon
              :closable="false"
              title="AI 正在评分并生成下一步问题，预计需要 5-20 秒。"
            />
          </div>
        </template>

        <el-empty v-else-if="!loading" description="未找到面试会话，请从面试历史重新进入" />
      </main>

      <aside class="feedback-panel">
        <div class="panel-title">
          <span>实时评估</span>
          <Activity :size="16" />
        </div>

        <div class="score-card">
          <span>当前题评分</span>
          <strong>{{ latestScoreText }}</strong>
          <p>{{ lastResult?.evaluation.level || '等待真实评分结果' }}</p>
        </div>

        <el-tabs class="feedback-tabs" model-value="evaluation">
          <el-tab-pane label="评估" name="evaluation">
            <div v-if="lastResult" class="feedback-stack">
              <section>
                <h3>AI 点评</h3>
                <MarkdownPreview :content="lastResult.evaluation.comment || lastResult.comment || '暂无点评'" />
              </section>
              <section>
                <h3>回答亮点</h3>
                <p>{{ lastResult.evaluation.advantage || '暂无亮点数据' }}</p>
              </section>
              <section>
                <h3>不足之处</h3>
                <p>{{ lastResult.evaluation.weakness || '暂无不足数据' }}</p>
              </section>
              <section>
                <h3>提升建议</h3>
                <p>{{ lastResult.evaluation.suggestion || '暂无建议数据' }}</p>
              </section>
              <section v-if="lastResult.followUpQuestion || lastResult.followUpReason">
                <h3>AI 追问</h3>
                <p v-if="lastResult.followUpQuestion">{{ lastResult.followUpQuestion }}</p>
                <p v-if="lastResult.followUpReason" class="muted">原因：{{ lastResult.followUpReason }}</p>
              </section>
              <section v-if="lastResult.knowledgePoints?.length">
                <h3>相关知识点</h3>
                <div class="tag-row">
                  <el-tag v-for="item in lastResult.knowledgePoints" :key="item" effect="plain">{{ item }}</el-tag>
                </div>
              </section>
              <el-alert :type="nextActionAlertType" :closable="false" show-icon :title="nextActionText" />
            </div>
            <el-empty v-else description="提交回答后展示真实评分、追问和知识点" />
          </el-tab-pane>

          <el-tab-pane label="简历" name="resume">
            <el-empty description="当前房间接口未返回简历快照，请在面试详情页查看已持久化的简历信息" />
          </el-tab-pane>

          <el-tab-pane label="笔记" name="notes">
            <div class="pending-note">
              <FilePenLine :size="18" />
              <strong>本轮不接入持久化笔记</strong>
              <p>该区域仅作为作战台信息位预留，不会保存本地假数据。</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </aside>
    </section>

    <footer class="room-statusbar">
      <span>会话：{{ interviewId || '-' }}</span>
      <span>状态：{{ current?.status || '-' }}</span>
      <span>接口：{{ submitting ? 'answer 处理中' : loading ? 'current 加载中' : '等待操作' }}</span>
      <span>报告：真实 finish 后跳转报告页轮询</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Activity, Bot, FilePenLine, History, LayoutDashboard, Rocket, Send, Square, UserRound } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  finishInterviewApi,
  getCurrentInterviewQuestionApi,
  startInterviewApi,
  submitInterviewAnswerApi
} from '@/api/interview'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { NEXT_ACTION } from '@/constants/enums'
import type { InterviewAnswerResultVO, InterviewCurrentVO } from '@/types/interview'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const starting = ref(false)
const submitting = ref(false)
const finishing = ref(false)
const current = ref<InterviewCurrentVO | null>(null)
const lastResult = ref<InterviewAnswerResultVO | null>(null)
const answerContent = ref('')
const lastSubmittedAnswer = ref('')
const lastAnswerDuration = ref(0)
const answerStartTime = ref(Date.now())
let slowSubmitTimer: number | undefined

const nextActionText = computed(() => {
  switch (lastResult.value?.nextAction) {
    case NEXT_ACTION.FOLLOW_UP:
      return '系统已生成追问，请继续作答。'
    case NEXT_ACTION.NEXT_QUESTION:
      return '已进入下一题，请继续作答。'
    case NEXT_ACTION.NEXT_STAGE:
      return '当前阶段已完成，系统已切换到下一阶段。'
    case NEXT_ACTION.FINISH:
      return '面试已满足结束条件，正在进入报告生成流程。'
    default:
      return '等待下一步动作。'
  }
})

const nextActionAlertType = computed(() => {
  if (lastResult.value?.nextAction === NEXT_ACTION.FINISH) return 'success'
  if (lastResult.value?.nextAction === NEXT_ACTION.FOLLOW_UP) return 'warning'
  return 'info'
})

const answerDisabled = computed(() => {
  return !current.value?.currentQuestion || ['COMPLETED', 'REPORT_GENERATING', 'FAILED'].includes(current.value.status)
})

const progressItems = computed(() => [
  {
    key: 'stage',
    title: current.value?.currentStage?.stageName || '等待阶段',
    desc: current.value?.currentStage
      ? `阶段序号 ${current.value.currentStage.stageOrder || '-'}，预期 ${current.value.currentStage.expectedQuestionCount || '-'} 题`
      : '后端 current 接口尚未返回阶段',
    state: current.value?.currentStage ? 'done' : 'pending'
  },
  {
    key: 'question',
    title: current.value?.currentQuestion?.questionTitle || '当前题目',
    desc: current.value?.currentQuestion?.questionContent ? '当前题已加载，等待作答' : '暂无当前题',
    state: current.value?.currentQuestion ? 'active' : 'pending'
  },
  {
    key: 'evaluation',
    title: 'AI 评分',
    desc: lastResult.value ? '已返回真实评分与下一步动作' : '提交回答后展示',
    state: lastResult.value ? 'done' : 'pending'
  }
])

const latestScoreText = computed(() => {
  const score = lastResult.value?.evaluation.score ?? lastResult.value?.score
  return score === undefined || score === null ? '--' : `${score}`
})

const answerDurationText = computed(() => {
  return lastAnswerDuration.value ? `耗时 ${lastAnswerDuration.value}s` : '最近一次提交'
})

const fetchCurrent = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    current.value = await getCurrentInterviewQuestionApi(interviewId)
    answerStartTime.value = Date.now()
  } finally {
    loading.value = false
  }
}

const handleStart = async () => {
  if (!interviewId) return
  starting.value = true
  try {
    current.value = await startInterviewApi(interviewId)
    await fetchCurrent()
    if (!current.value?.currentQuestion) {
      ElMessage.warning('面试已开始，但暂未获取到题目，请稍后刷新当前题。')
      return
    }
    ElMessage.success('面试已开始')
  } finally {
    starting.value = false
  }
}

const applyAnswerResult = async (result: InterviewAnswerResultVO) => {
  lastResult.value = result
  lastSubmittedAnswer.value = answerContent.value
  answerContent.value = ''

  if (result.nextAction === NEXT_ACTION.FINISH) {
    await handleFinish(false)
    return
  }

  if (result.nextAction === NEXT_ACTION.FOLLOW_UP && result.nextQuestion) {
    current.value = {
      interviewId: result.interviewId,
      status: result.interviewStatus,
      currentStage: result.currentStage,
      currentQuestion: result.nextQuestion
    }
    answerStartTime.value = Date.now()
    return
  }

  await fetchCurrent()
}

const startSlowSubmitHint = () => {
  window.clearTimeout(slowSubmitTimer)
  slowSubmitTimer = window.setTimeout(() => {
    if (submitting.value) {
      ElMessage.info('真实 AI 响应较慢，请稍候，不要重复提交')
    }
  }, 20000)
}

const handleSubmit = async () => {
  if (!interviewId || !current.value?.currentQuestion) return
  if (!answerContent.value.trim()) {
    ElMessage.warning('请先填写回答')
    return
  }

  submitting.value = true
  startSlowSubmitHint()
  lastAnswerDuration.value = Math.max(1, Math.round((Date.now() - answerStartTime.value) / 1000))
  try {
    const result = await submitInterviewAnswerApi(interviewId, {
      messageId: current.value.currentQuestion.messageId,
      answerContent: answerContent.value,
      answerDurationSeconds: lastAnswerDuration.value,
      clientSubmitTime: new Date().toISOString()
    })
    await applyAnswerResult(result)
  } finally {
    window.clearTimeout(slowSubmitTimer)
    submitting.value = false
  }
}

const handleFinish = async (_manual: boolean) => {
  if (!interviewId) return
  finishing.value = true
  try {
    const result = await finishInterviewApi(interviewId)
    ElMessage.success(result.message || '正在结束面试并提交报告生成任务')
    await router.push(`/interviews/${interviewId}/report`)
  } finally {
    finishing.value = false
  }
}

const handleManualFinish = async () => {
  await ElMessageBox.confirm('确认现在结束面试并生成报告？', '结束面试', { type: 'warning' })
  await handleFinish(true)
}

onMounted(fetchCurrent)
onBeforeUnmount(() => window.clearTimeout(slowSubmitTimer))
</script>

<style scoped lang="scss">
.interview-room {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--app-text);
}

.room-topbar,
.war-room,
.room-statusbar {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.room-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  padding: 22px;

  h1 {
    margin: 8px 0;
    font-size: 28px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.eyebrow,
.topbar-actions,
.answer-actions,
.tag-row,
.side-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.eyebrow {
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.topbar-actions {
  justify-content: flex-end;
}

.war-room {
  display: grid;
  min-height: calc(100vh - 210px);
  grid-template-columns: 280px minmax(0, 1fr) 330px;
  overflow: hidden;
}

.progress-panel,
.conversation-panel,
.feedback-panel {
  min-width: 0;
  padding: 18px;
}

.progress-panel,
.feedback-panel {
  background: rgba(2, 6, 23, 0.28);
}

.conversation-panel {
  border-right: 1px solid var(--app-border);
  border-left: 1px solid var(--app-border);
}

.panel-title,
.message-head,
.console-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  margin-bottom: 16px;
  font-weight: 700;
}

.session-card,
.score-card,
.message-card,
.answer-console,
.start-card,
.pending-note,
.feedback-stack section {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.36);
}

.session-card {
  padding: 16px;

  p {
    margin: 8px 0 14px;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.mini-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.14);
    color: #c4b5fd;
    font-size: 12px;
  }
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.progress-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.46);

  strong {
    display: block;
    font-size: 13px;
  }

  p {
    margin: 5px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .dot {
    width: 9px;
    height: 9px;
    margin-top: 4px;
    border-radius: 999px;
    background: #64748b;
  }

  &.active .dot {
    background: var(--cc-ai-cyan);
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.7);
  }

  &.done .dot {
    background: var(--cc-success);
  }
}

.side-actions {
  margin-top: 16px;
}

.state-alert {
  margin: 14px 0;
}

.start-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 18px;

  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
  }
}

.message-card {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;

  &.ai {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(2, 6, 23, 0.34));
  }

  &.user {
    background: rgba(6, 182, 212, 0.08);
  }
}

.message-avatar {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.2);
  color: #c4b5fd;
}

.message-body {
  min-width: 0;
  flex: 1;
}

.message-head {
  margin-bottom: 10px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.reason-box {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;

  p {
    margin: 6px 0 0;
    color: #fcd34d;
  }
}

.answer-preview {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
  white-space: pre-wrap;
}

.answer-console {
  padding: 16px;
}

.console-head {
  align-items: flex-start;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.answer-actions {
  justify-content: flex-end;
  margin-top: 14px;
}

.score-card {
  padding: 18px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08));

  span,
  p {
    color: var(--app-text-muted);
  }

  strong {
    display: block;
    margin: 8px 0;
    font-size: 42px;
    line-height: 1;
  }

  p {
    margin: 0;
  }
}

.feedback-tabs {
  margin-top: 14px;
}

.feedback-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;

  section {
    padding: 13px;

    h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    p {
      margin: 0;
      color: var(--app-text-muted);
      line-height: 1.6;
    }
  }
}

.muted {
  color: var(--app-text-muted);
}

.pending-note {
  padding: 16px;
  color: var(--app-text-muted);

  svg {
    color: var(--cc-ai-cyan);
  }

  strong {
    display: block;
    margin: 10px 0 6px;
    color: var(--app-text);
  }

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.room-statusbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  color: var(--app-text-muted);
  font-size: 12px;

  span {
    padding-right: 12px;
    border-right: 1px solid var(--app-border);

    &:last-child {
      border-right: 0;
    }
  }
}

@media (max-width: 1280px) {
  .war-room {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .feedback-panel {
    grid-column: 1 / -1;
    border-top: 1px solid var(--app-border);
  }

  .conversation-panel {
    border-right: 0;
  }
}

@media (max-width: 860px) {
  .room-topbar {
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .war-room {
    grid-template-columns: 1fr;
  }

  .conversation-panel {
    border: 0;
    border-top: 1px solid var(--app-border);
    border-bottom: 1px solid var(--app-border);
  }
}
</style>
