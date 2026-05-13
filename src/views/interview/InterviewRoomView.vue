<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">面试房间</h1>
        <p class="page-subtitle">根据 interview-service 返回的 nextAction 推进追问、下一题、下一阶段和结束流程。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/interviews/history')">历史记录</el-button>
        <el-button type="danger" plain :loading="finishing" @click="handleManualFinish">结束面试</el-button>
      </div>
    </div>

    <section class="content-card" v-loading="loading">
      <div class="content-card__body" v-if="current">
        <div class="room-status">
          <StatusTag :status="current.status" />
          <span v-if="current.currentStage">
            当前阶段：{{ current.currentStage.stageName }}（{{ current.currentStage.stageOrder }}）
          </span>
        </div>

        <el-alert
          v-if="current.status === 'NOT_STARTED'"
          class="state-alert"
          type="info"
          show-icon
          :closable="false"
          title="面试尚未开始，点击开始后会获取第一道题。"
        />

        <div v-if="current.status === 'NOT_STARTED'" class="start-row">
          <el-button type="primary" size="large" :loading="starting" @click="handleStart">
            开始面试
          </el-button>
        </div>

        <div v-if="current.currentQuestion" class="question-panel">
          <div class="question-panel__head">
            <h2>{{ current.currentQuestion.questionTitle || '当前问题' }}</h2>
            <el-tag v-if="current.currentQuestion.isFollowUp" type="warning" effect="plain">追问</el-tag>
          </div>
          <MarkdownPreview :content="current.currentQuestion.questionContent" />
        </div>

        <el-empty
          v-else
          :description="current.status === 'NOT_STARTED' ? '点击开始面试后获取第一道题' : '暂无当前问题，请刷新或稍后重试'"
        />

        <div class="answer-panel">
          <h2>我的回答</h2>
          <el-input
            v-model="answerContent"
            type="textarea"
            :rows="8"
            :disabled="answerDisabled"
            placeholder="请输入你的回答，提交后由 interview-service 完成评分和下一步决策"
          />
          <div class="answer-actions">
            <el-button
              type="primary"
              :disabled="answerDisabled"
              :loading="submitting"
              @click="handleSubmit"
            >
              提交回答
            </el-button>
            <el-button @click="fetchCurrent">刷新当前题</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="未找到面试会话" />
    </section>

    <section v-if="lastResult" class="content-card">
      <div class="content-card__body result-panel">
        <div class="result-panel__head">
          <h2>AI 评分与下一步</h2>
          <StatusTag :status="lastResult.nextAction" />
        </div>
        <div class="score-line">
          <span class="score">{{ lastResult.evaluation.score ?? 0 }}</span>
          <span>分 · {{ lastResult.evaluation.level || '未分级' }}</span>
        </div>
        <MarkdownPreview :content="lastResult.evaluation.comment" />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="亮点">{{ lastResult.evaluation.advantage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="问题">{{ lastResult.evaluation.weakness || '-' }}</el-descriptions-item>
          <el-descriptions-item label="建议">{{ lastResult.evaluation.suggestion || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-alert class="next-alert" :type="nextActionAlertType" :closable="false" show-icon :title="nextActionText" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
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
const answerStartTime = ref(Date.now())

const nextActionText = computed(() => {
  switch (lastResult.value?.nextAction) {
    case NEXT_ACTION.FOLLOW_UP:
      return '系统已生成追问，请继续作答。'
    case NEXT_ACTION.NEXT_QUESTION:
      return '已进入下一题，请继续作答。'
    case NEXT_ACTION.NEXT_STAGE:
      return '当前阶段已完成，系统已切换到下一阶段。'
    case NEXT_ACTION.FINISH:
      return '面试已满足结束条件，正在结束面试并生成报告。'
    default:
      return '等待下一步动作。'
  }
})

const nextActionAlertType = computed(() => {
  if (lastResult.value?.nextAction === NEXT_ACTION.FINISH) return 'success'
  if (lastResult.value?.nextAction === NEXT_ACTION.FOLLOW_UP) return 'warning'
  return 'info'
})

const answerDisabled = computed(() => !current.value?.currentQuestion || current.value.status === 'COMPLETED')

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
  answerContent.value = ''

  if (result.nextAction === NEXT_ACTION.FINISH) {
    await handleFinish(false)
    return
  }

  if (result.nextQuestion) {
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

const handleSubmit = async () => {
  if (!interviewId || !current.value?.currentQuestion) return
  if (!answerContent.value.trim()) {
    ElMessage.warning('请先填写回答')
    return
  }

  submitting.value = true
  try {
    const result = await submitInterviewAnswerApi(interviewId, {
      messageId: current.value.currentQuestion.messageId,
      answerContent: answerContent.value,
      answerDurationSeconds: Math.max(1, Math.round((Date.now() - answerStartTime.value) / 1000)),
      clientSubmitTime: new Date().toISOString()
    })
    await applyAnswerResult(result)
  } finally {
    submitting.value = false
  }
}

const handleFinish = async (manual: boolean) => {
  if (!interviewId) return
  finishing.value = true
  try {
    const result = await finishInterviewApi(interviewId)
    ElMessage.success(result.message || '面试已结束，正在进入报告页')
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
</script>

<style scoped lang="scss">
.header-actions,
.answer-actions,
.start-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.state-alert {
  margin-bottom: 14px;
}

.start-row {
  margin-bottom: 18px;
}

.room-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  color: var(--app-text-muted);
}

.question-panel,
.answer-panel {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }
}

.question-panel__head,
.result-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.score-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.score {
  color: var(--app-primary);
  font-size: 34px;
  font-weight: 800;
}

.next-alert {
  margin-top: 16px;
}
</style>
