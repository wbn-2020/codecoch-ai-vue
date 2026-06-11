<template>
  <div class="interview-room">
    <section class="room-topbar cc-glass">
      <div>
        <div class="eyebrow">
          <Bot :size="16" />
          AI 面试训练室
        </div>
        <h1>AI 面试房间</h1>
        <p>围绕当前题目、作答区和实时反馈组织面试流程，帮助你稳定完成一次模拟训练。</p>
      </div>
      <div class="topbar-actions">
        <span class="cc-badge" :class="sseStatusBadgeClass">
          <span class="cc-badge__dot"></span>
          {{ sseStatusLabel }}
        </span>
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          今日计划
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

    <section class="war-room cc-glass" v-loading="loading">
      <aside class="progress-panel">
        <div class="panel-title">
          <span>面试进度</span>
          <StatusTag :status="current?.status || 'NOT_STARTED'" />
        </div>

        <div class="session-card">
          <strong>{{ current?.currentStage?.stageName || '当前阶段' }}</strong>
          <p>{{ current?.currentQuestion?.stageProgress || '等待当前面试进度' }}</p>
          <div class="mini-meta">
            <span>面试会话已记录</span>
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

        <div v-if="outlineStages.length" class="outline-section">
          <div class="outline-title">面试大纲</div>
          <div class="outline-list">
            <div
              v-for="stage in outlineStages"
              :key="stage.stageOrder"
              class="outline-item"
              :class="outlineStageState(stage)"
            >
              <span class="outline-order">{{ stage.stageOrder }}</span>
              <div class="outline-info">
                <strong>{{ stage.stageName }}</strong>
                <span v-if="stage.expectedQuestionCount">{{ stage.expectedQuestionCount }} 题</span>
                <span v-if="stage.estimatedMinutes">~{{ stage.estimatedMinutes }}min</span>
              </div>
            </div>
          </div>
        </div>

        <AppState
          v-if="!current && !loading"
          type="empty"
          title="未找到面试会话"
          description="可能是面试记录无效、会话已结束，或当前账号没有访问这场面试。请从历史记录重新进入。"
        >
          <el-button type="primary" @click="router.push('/interviews/history')">返回面试历史</el-button>
          <el-button @click="fetchCurrent">重新加载</el-button>
        </AppState>

        <div class="side-actions">
          <el-button plain @click="fetchCurrent">刷新当前题</el-button>
          <el-button
            v-if="interviewId"
            type="primary"
            plain
            :disabled="!canViewReport"
            :title="reportButtonTip"
            @click="handleViewReport"
          >
            {{ reportButtonText }}
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
              <p>开始后将获取第一道题，并根据你的回答继续推进面试。</p>
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

          <AppState
            v-else
            type="empty"
            :title="current.status === 'NOT_STARTED' ? '等待开始面试' : '当前题暂未加载'"
            :description="current.status === 'NOT_STARTED' ? '点击开始面试后，系统会拉取第一道题并开始计时。' : '题目可能仍在生成，或当前阶段还没有下一题。可以刷新当前题，或结束面试生成报告。'"
          >
            <el-button v-if="current.status === 'NOT_STARTED'" type="primary" :loading="starting" @click="handleStart">开始面试</el-button>
            <el-button v-else type="primary" @click="fetchCurrent">刷新当前题</el-button>
            <el-button v-if="current.status !== 'NOT_STARTED'" plain :loading="finishing" @click="handleManualFinish">结束面试</el-button>
          </AppState>

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
                <p>{{ answerDisabled ? '当前状态不可提交回答' : '提交后会获得 AI 评分、追问和下一步动作' }}</p>
              </div>
              <StatusTag :status="submitting ? 'AI_EVALUATING' : current.status" />
            </div>
            <el-input
              ref="answerInputRef"
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
              <el-button
                v-if="interviewId"
                plain
                :disabled="!canViewReport"
                :title="reportButtonTip"
                @click="handleViewReport"
              >
                {{ reportButtonText }}
              </el-button>
            </div>
            <el-alert
              v-if="submitting"
              class="state-alert"
              type="info"
              show-icon
              :closable="false"
              title="阶段式 AI 点评进度"
              :description="answerReviewMessage || 'AI 正在评分并生成下一步问题，预计需要 5-20 秒。'"
            />
            <div v-if="submitting && answerReviewEvents.length" class="review-stage-list">
              <article v-for="item in answerReviewEvents" :key="item.key" class="review-stage-item">
                <span>{{ item.eventLabel || item.event }}</span>
                <strong>{{ item.stageLabel || item.message || '-' }}</strong>
                <p>{{ item.message || item.stageLabel || '-' }}</p>
              </article>
            </div>
          </div>
        </template>

        <AppState
          v-else-if="!loading"
          type="empty"
          title="面试会话不可用"
          description="当前链接没有加载到可用面试。请从历史记录重新进入，或新建一场模拟面试。"
        >
          <el-button type="primary" @click="router.push('/interviews/history')">返回面试历史</el-button>
          <el-button @click="router.push('/interviews/create')">新建面试</el-button>
        </AppState>
      </main>

      <aside class="feedback-panel">
        <div class="panel-title">
          <span>实时评估</span>
          <Activity :size="16" />
        </div>

        <div class="score-card">
          <span>当前题评分</span>
          <strong>{{ latestScoreText }}</strong>
          <p>{{ evaluationLevelLabel(lastResult?.evaluation.level) }}</p>
        </div>

        <div class="answer-rubric">
          <div class="panel-title compact">
            <span>答题结构</span>
            <ListChecks :size="16" />
          </div>
          <div class="rubric-list">
            <article v-for="item in answerStructureItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </div>

        <div v-if="followUpReasonText" class="followup-brief">
          <div class="panel-title compact">
            <span>追问链</span>
            <Route :size="16" />
          </div>
          <p>{{ followUpReasonText }}</p>
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
            <AppState
              v-else
              type="empty"
              title="等待你的第一轮回答"
              description="提交回答后，这里会展示 AI 评分、亮点、不足、提升建议、追问和相关知识点。"
            >
              <el-button type="primary" :disabled="answerDisabled" @click="focusAnswerInput">去作答</el-button>
            </AppState>
          </el-tab-pane>

          <el-tab-pane label="简历" name="resume">
            <AppState
              type="empty"
              title="当前房间没有简历快照"
              description="这场面试可能没有绑定简历，或快照只保存在面试详情中。补齐简历和岗位后，后续推荐会更准确。"
            >
              <el-button type="primary" @click="router.push('/resumes')">查看简历与岗位</el-button>
              <el-button v-if="interviewId" @click="router.push(`/interviews/${interviewId}`)">查看面试详情</el-button>
            </AppState>
          </el-tab-pane>

          <el-tab-pane label="笔记" name="notes">
            <div class="pending-note">
              <FilePenLine :size="18" />
              <strong>本轮暂不保存笔记</strong>
              <p>这里先作为面试中的临时提示区，结束后请以问答记录和报告为准。</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </aside>
    </section>

    <footer class="room-statusbar cc-glass">
      <span>会话：{{ interviewId || '-' }}</span>
      <span>状态：{{ interviewStatusLabel(current?.status) }}</span>
      <span>计时：{{ elapsedText }}</span>
      <span>处理状态：{{ submitting ? 'AI 正在点评' : loading ? '题目加载中' : '等待操作' }}</span>
      <span v-if="answerReviewMetaText">点评：{{ answerReviewMetaText }}</span>
      <span>报告：{{ reportStatusText }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Activity, Bot, FilePenLine, History, LayoutDashboard, ListChecks, Rocket, Route, Send, Square, UserRound } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  finishInterviewApi,
  getCurrentInterviewQuestionApi,
  startInterviewApi,
  streamInterviewAnswerReviewApi,
  submitInterviewAnswerApi
} from '@/api/interview'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { NEXT_ACTION } from '@/constants/enums'
import type {
  InterviewAnswerDTO,
  InterviewAnswerResultVO,
  InterviewAnswerReviewSseEvent,
  InterviewCurrentVO
} from '@/types/interview'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
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
const answerInputRef = ref<{ focus?: () => void } | null>(null)
const lastSubmittedAnswer = ref('')
const lastAnswerDuration = ref(0)
const answerStartTime = ref(Date.now())
const answerReviewMessage = ref('')
const answerReviewAnswerId = ref<number | undefined>()
const answerReviewAiCallLogId = ref<number | undefined>()
const answerReviewFollowUpAiCallLogId = ref<number | undefined>()
const answerReviewEvents = ref<Array<{ key: string; event: string; eventLabel?: string; stage?: string; stageLabel?: string; message?: string }>>([])
let slowSubmitTimer: number | undefined
let answerReviewSseHandle: ReturnType<typeof streamInterviewAnswerReviewApi> | null = null
let elapsedTimer: number | undefined
const elapsedSeconds = ref(0)

const answerReviewStageLabels: Record<string, string> = {
  VALIDATE_REQUEST: '检查回答',
  LOAD_INTERVIEW: '读取面试记录',
  SAVE_ANSWER: '保存回答',
  BUILD_PROMPT: '整理点评方向',
  CALL_AI_REVIEW: 'AI 正在点评',
  SAVE_REVIEW: '保存点评',
  GENERATE_FOLLOW_UP: '生成追问',
  SAVE_FOLLOW_UP: '保存追问'
}

const answerReviewEventLabels: Record<string, string> = {
  start: '开始点评',
  progress: '点评进度',
  delta: '生成点评',
  result: '点评完成',
  done: '点评完成',
  error: '点评失败'
}

// SSE 四态徽章
const sseStatusLabel = computed(() => {
  if (submitting.value && answerReviewEvents.value.length > 0) return '正在生成点评'
  if (submitting.value) return 'AI 思考中'
  if (current.value?.status === 'COMPLETED' || current.value?.status === 'REPORT_GENERATING') return '已完成'
  if (current.value?.status === 'NOT_STARTED') return '待开始'
  return '等待操作'
})

const sseStatusBadgeClass = computed(() => {
  if (submitting.value && answerReviewEvents.value.length > 0) return 'cc-badge--streaming'
  if (submitting.value) return 'cc-badge--thinking'
  if (current.value?.status === 'COMPLETED' || current.value?.status === 'REPORT_GENERATING') return 'cc-badge--success'
  if (current.value?.status === 'NOT_STARTED') return 'cc-badge--idle'
  return 'cc-badge--idle'
})

// 答题计时器
const elapsedText = computed(() => {
  const s = elapsedSeconds.value
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const startElapsedTimer = () => {
  stopElapsedTimer()
  elapsedSeconds.value = 0
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

const stopElapsedTimer = () => {
  if (elapsedTimer) {
    window.clearInterval(elapsedTimer)
    elapsedTimer = undefined
  }
}

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

const canViewReport = computed(() =>
  ['COMPLETED', 'REPORT_GENERATING', 'REPORT_DONE', 'GENERATED', 'FINISHED'].includes(String(current.value?.status || '').toUpperCase())
)

const reportButtonText = computed(() => {
  const status = String(current.value?.status || '').toUpperCase()
  if (status === 'REPORT_GENERATING') return '报告生成中'
  return canViewReport.value ? '查看报告' : '完成后查看'
})

const reportButtonTip = computed(() =>
  canViewReport.value ? '进入面试报告页' : '完成面试后系统会生成报告'
)

const reportStatusText = computed(() => {
  const status = String(current.value?.status || '').toUpperCase()
  if (status === 'REPORT_GENERATING') return '正在生成'
  if (canViewReport.value) return '可查看'
  return '完成面试后生成'
})

const interviewStatusLabel = (status?: string | null) => {
  const labels: Record<string, string> = {
    NOT_STARTED: '待开始',
    IN_PROGRESS: '面试中',
    RUNNING: '面试中',
    COMPLETED: '已完成',
    REPORT_GENERATING: '报告生成中',
    REPORT_DONE: '报告已生成',
    GENERATED: '报告已生成',
    FAILED: '异常结束',
    CANCELED: '已取消'
  }
  return labels[String(status || '').toUpperCase()] || '待开始'
}

const evaluationLevelLabel = (level?: string | null) => {
  const labels: Record<string, string> = {
    EXCELLENT: '优秀',
    GOOD: '良好',
    PASS: '基本达标',
    NORMAL: '常规',
    NEEDS_IMPROVEMENT: '需要加强',
    WEAK: '薄弱'
  }
  return labels[String(level || '').toUpperCase()] || '等待评分结果'
}

const outlineStages = computed(() => current.value?.outline || [])

const outlineStageState = (stage: { stageOrder: number; status?: string }) => {
  if (stage.status === 'COMPLETED') return 'completed'
  if (stage.status === 'IN_PROGRESS') return 'active'
  const currentOrder = current.value?.currentStage?.stageOrder
  if (currentOrder && stage.stageOrder < currentOrder) return 'completed'
  if (currentOrder && stage.stageOrder === currentOrder) return 'active'
  return 'pending'
}

const progressItems = computed(() => [
  {
    key: 'stage',
    title: current.value?.currentStage?.stageName || '等待阶段',
    desc: current.value?.currentStage
      ? `阶段序号 ${current.value.currentStage.stageOrder || '-'}，预期 ${current.value.currentStage.expectedQuestionCount || '-'} 题`
      : '当前阶段信息暂未返回',
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
    desc: lastResult.value ? '已返回评分与下一步动作' : '提交回答后展示',
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

const answerStructureItems = computed(() => [
  {
    title: '先定边界',
    desc: current.value?.currentQuestion?.isFollowUp ? '先复述追问点，避免直接跳结论。' : '先说明场景、问题和约束。'
  },
  {
    title: '再讲方案',
    desc: '按原理、落地步骤、关键代码或架构模块展开。'
  },
  {
    title: '补充证据',
    desc: '用指标、监控、故障处理或项目结果证明可信度。'
  }
])

const followUpReasonText = computed(() =>
  lastResult.value?.followUpReason ||
  current.value?.currentQuestion?.followUpReason ||
  (current.value?.currentQuestion?.isFollowUp ? '当前问题是追问，请围绕上一轮回答的薄弱点继续补证据。' : '')
)

const answerReviewMetaText = computed(() => {
  const items = []
  if (answerReviewAnswerId.value) items.push('回答记录已保存')
  if (answerReviewAiCallLogId.value || answerReviewFollowUpAiCallLogId.value) items.push('AI 点评已记录')
  return items.join(' / ')
})

const focusAnswerInput = () => {
  answerInputRef.value?.focus?.()
  document.querySelector('.answer-console')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const fetchCurrent = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    current.value = await getCurrentInterviewQuestionApi(interviewId)
    answerStartTime.value = Date.now()
    if (current.value?.currentQuestion) {
      startElapsedTimer()
    }
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
    startElapsedTimer()
    return
  }

  await fetchCurrent()
}

const startSlowSubmitHint = () => {
  window.clearTimeout(slowSubmitTimer)
  slowSubmitTimer = window.setTimeout(() => {
    if (submitting.value) {
      ElMessage.info('AI 点评还在生成，请稍候，不要重复提交')
    }
  }, 20000)
}

const stopAnswerReviewSse = () => {
  answerReviewSseHandle?.abort()
  answerReviewSseHandle = null
}

const resetAnswerReviewState = () => {
  answerReviewMessage.value = ''
  answerReviewAnswerId.value = undefined
  answerReviewAiCallLogId.value = undefined
  answerReviewFollowUpAiCallLogId.value = undefined
  answerReviewEvents.value = []
}

const normalizeAnswerReviewResult = (
  data: InterviewAnswerReviewSseEvent | undefined,
  payload: InterviewAnswerDTO
): InterviewAnswerResultVO | null => {
  const raw = data?.result && typeof data.result === 'object'
    ? (data.result as Partial<InterviewAnswerResultVO>)
    : {}
  if (!data && !Object.keys(raw).length) return null
  const rawScore: unknown = data?.score ?? raw.score ?? raw.evaluation?.score
  const parsedScore = rawScore === undefined || rawScore === null || rawScore === ''
    ? undefined
    : Number(rawScore)
  const score = Number.isFinite(parsedScore) ? parsedScore : undefined
  const feedback = data?.feedback || raw.comment || raw.evaluation?.comment || ''

  return {
    ...raw,
    interviewId: raw.interviewId || data?.interviewId || interviewId || 0,
    answerMessageId: raw.answerMessageId || data?.answerId || data?.messageId || payload.messageId,
    score,
    comment: raw.comment || feedback,
    evaluation: {
      ...(raw.evaluation || {}),
      score,
      comment: raw.evaluation?.comment || feedback,
      followUpReason: data?.followUpReason || raw.evaluation?.followUpReason,
      knowledgePoints: raw.evaluation?.knowledgePoints
    },
    nextAction: data?.nextAction || raw.nextAction || 'NEXT_QUESTION',
    nextQuestion: data?.nextQuestion || raw.nextQuestion,
    followUpQuestion: data?.followUpQuestion || raw.followUpQuestion || '',
    followUpReason: data?.followUpReason || raw.followUpReason || '',
    followUpValid: raw.followUpValid,
    knowledgePoints: raw.knowledgePoints,
    currentStage: raw.currentStage,
    interviewStatus: raw.interviewStatus || 'IN_PROGRESS',
    reportStatus: raw.reportStatus,
    progress: raw.progress
  }
}

const applyAnswerReviewEvent = (event: string, data?: InterviewAnswerReviewSseEvent) => {
  const stage = data?.stage ? String(data.stage) : ''
  const stageLabel = stage ? answerReviewStageLabels[stage] || '点评进度更新' : ''
  const message = toFriendlyMessage(data?.message, stageLabel || 'AI 正在点评')
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}
  const answerId = data?.answerId || Number(metadata.answerId || 0)
  const aiCallLogId = data?.aiCallLogId || Number(metadata.aiCallLogId || 0)
  const followUpAiCallLogId = data?.followUpAiCallLogId || Number(metadata.followUpAiCallLogId || 0)
  if (answerId) answerReviewAnswerId.value = answerId
  if (aiCallLogId) answerReviewAiCallLogId.value = aiCallLogId
  if (followUpAiCallLogId) answerReviewFollowUpAiCallLogId.value = followUpAiCallLogId
  answerReviewMessage.value = message || stageLabel || answerReviewMessage.value
  answerReviewEvents.value.push({
    key: `${Date.now()}-${answerReviewEvents.value.length}`,
    event,
    eventLabel: answerReviewEventLabels[event] || '点评进度',
    stage,
    stageLabel,
    message
  })
}

const submitAnswerFallback = async (id: number, payload: InterviewAnswerDTO) => {
  const result = await submitInterviewAnswerApi(id, payload)
  await applyAnswerResult(result)
}

const handleSubmit = async () => {
  if (!interviewId || !current.value?.currentQuestion || submitting.value) return
  if (!answerContent.value.trim()) {
    ElMessage.warning('请先填写回答')
    return
  }

  const id = interviewId
  const payload: InterviewAnswerDTO = {
    messageId: current.value.currentQuestion.messageId,
    answerContent: answerContent.value,
    answerDurationSeconds: Math.max(1, Math.round((Date.now() - answerStartTime.value) / 1000)),
    clientSubmitTime: new Date().toISOString()
  }

  submitting.value = true
  lastAnswerDuration.value = payload.answerDurationSeconds || 0
  stopElapsedTimer()
  startSlowSubmitHint()
  stopAnswerReviewSse()
  resetAnswerReviewState()

  let latestResult: InterviewAnswerResultVO | null = null
  let completedByDone = false
  answerReviewSseHandle = streamInterviewAnswerReviewApi(
    id,
    payload,
    {
      onEvent: async (event, data) => {
        applyAnswerReviewEvent(event, data)
        if (event === 'result') {
          latestResult = normalizeAnswerReviewResult(data, payload)
          if (latestResult) {
            lastResult.value = latestResult
          }
        }
        if (event === 'done') {
          completedByDone = true
          if (!latestResult) {
            latestResult = normalizeAnswerReviewResult(data, payload)
          }
          if (latestResult) {
            await applyAnswerResult(latestResult)
          } else {
            await fetchCurrent()
          }
          ElMessage.success('AI 点评完成')
        }
      },
      onError: async (error, hasStarted) => {
        if (!hasStarted) {
          ElMessage.warning('点评流未启动，已切换为同步点评')
          await submitAnswerFallback(id, payload)
          return
        }
        ElMessage.error(getErrorMessage(error, 'AI 点评失败，请刷新当前题状态。'))
      },
      onDone: async () => {
        if (!completedByDone && latestResult) {
          await applyAnswerResult(latestResult)
        }
      }
    }
  )

  try {
    await answerReviewSseHandle.finished.catch(() => undefined)
  } finally {
    window.clearTimeout(slowSubmitTimer)
    answerReviewSseHandle = null
    submitting.value = false
  }
}

const handleFinish = async (_manual: boolean) => {
  if (!interviewId) return
  finishing.value = true
  try {
    const result = await finishInterviewApi(interviewId)
    ElMessage.success(result.message || '正在结束面试并提交报告生成任务')
    const query: Record<string, string> = {}
    if (result.asyncMessageId) query.asyncMessageId = result.asyncMessageId
    if (result.asyncTraceId) query.asyncTraceId = result.asyncTraceId
    if (result.asyncBizType) query.asyncBizType = result.asyncBizType
    if (result.asyncBizId) query.asyncBizId = result.asyncBizId
    if (result.asyncSendStatus) query.asyncSendStatus = result.asyncSendStatus
    await router.push({ path: `/interviews/${interviewId}/report`, query })
  } finally {
    finishing.value = false
  }
}

const handleViewReport = async () => {
  if (!interviewId) return
  if (!canViewReport.value) {
    ElMessage.info('完成面试后系统会生成报告，当前还不能查看。')
    return
  }
  await router.push(`/interviews/${interviewId}/report`)
}

const handleManualFinish = async () => {
  const confirmed = await confirmDangerActionPreview({
    title: '结束面试',
    action: '结束当前模拟面试并提交报告生成',
    target: '当前面试会话',
    impact: '当前面试会话会结束，系统会根据已提交的回答生成面试报告；未填写或未提交的当前回答不会自动补交。',
    rollback: '结束后不能在当前会话继续答题；可从面试历史查看报告，必要时重新创建一场模拟面试。',
    audit: '报告生成任务会记录必要处理线索，可在报告页和任务中心继续查看进度。',
    tips: ['确认当前题目的回答已经提交。', '确认不需要继续获取后续追问题。'],
    confirmButtonText: '结束并生成报告'
  })
  if (!confirmed) return
  await handleFinish(true)
}

onMounted(fetchCurrent)
onBeforeUnmount(() => {
  window.clearTimeout(slowSubmitTimer)
  stopAnswerReviewSse()
  stopElapsedTimer()
})
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
  border-radius: var(--cc-radius-xl);
  overflow: hidden;
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

  &.compact {
    margin-bottom: 10px;
    color: var(--app-text);
    font-size: 14px;
  }
}

.session-card,
.score-card,
.message-card,
.answer-console,
.start-card,
.pending-note,
.feedback-stack section,
.answer-rubric,
.followup-brief {
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

.outline-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
}

.outline-title {
  color: var(--app-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  transition: background 0.15s;

  &.active {
    background: rgba(99, 102, 241, 0.12);

    .outline-order {
      background: var(--cc-primary);
      color: #fff;
    }

    strong {
      color: #f8fafc;
    }
  }

  &.completed {
    opacity: 0.6;

    .outline-order {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }
  }

  &.pending {
    opacity: 0.5;
  }
}

.outline-order {
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.15);
  color: var(--app-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.outline-info {
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 12px;
    color: var(--app-text-muted);
  }

  span {
    font-size: 11px;
    color: var(--app-text-muted);
    opacity: 0.7;
    margin-right: 6px;
  }
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

.review-stage-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.review-stage-item {
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.34);

  span {
    color: var(--cc-ai-cyan);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--app-text);
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }
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

.answer-rubric,
.followup-brief {
  margin-top: 12px;
  padding: 14px;
}

.rubric-list {
  display: grid;
  gap: 8px;

  article {
    padding: 10px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.42);
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  strong {
    font-size: 13px;
  }

  p {
    margin-top: 5px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.55;
  }
}

.followup-brief {
  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
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


@media (max-width: 720px) {
  .page-hero,
  .history-hero,
  .detail-hero,
  .report-top,
  .room-topbar,
  .notification-hero,
  .create-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions,
  .report-actions,
  .topbar-actions,
  .card-actions,
  .filter-bar,
  .notification-toolbar {
    justify-content: flex-start;
  }
}
</style>
