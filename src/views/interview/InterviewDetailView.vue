<template>
  <div class="interview-detail-page page-shell">
    <section class="detail-hero">
      <div>
        <div class="detail-eyebrow">
          <ClipboardList :size="16" />
          模拟面试详情
        </div>
        <h1>{{ detail?.interviewName || '面试复盘详情' }}</h1>
        <p>按“配置、阶段、问答、报告”回看这轮模拟面试，不再用表格罗列记录，重点放在下一步还能怎么练。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/interviews/history')">
          <History :size="16" />
          面试历史
        </el-button>
        <el-button v-if="detail && !isInterviewDone" @click="router.push(`/interviews/room/${detail.interviewId}`)">
          <MessageSquare :size="16" />
          回到房间
        </el-button>
        <el-button v-if="detail" type="primary" @click="goInterviewReport">
          <FileText :size="16" />
          {{ reportActionText }}
        </el-button>
        <el-button v-if="canOpenReportTaskCenter" plain @click="goReportTaskCenter">
          <Timer :size="16" />
          任务中心
        </el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="面试详情加载失败" :description="errorMessage">
      <el-button type="primary" @click="fetchDetail">重试</el-button>
    </AppState>

    <section v-else v-loading="loading" class="detail-panel">
      <AppState v-if="!loading && !detail" type="empty" title="未找到面试记录" description="该面试不存在，或当前账号没有访问权限。" />

      <template v-else-if="detail">
        <div class="overview-head">
          <div>
            <span>面试记录已保存</span>
            <h2>{{ detail.targetPosition || interviewModeTitle(detail.interviewMode) || '模拟面试' }}</h2>
            <p>{{ statusHint }}</p>
          </div>
          <div class="status-stack">
            <StatusTag :status="detail.status" />
            <StatusTag :status="detail.reportStatus" />
          </div>
        </div>

        <section class="metric-grid">
          <article v-for="metric in metrics" :key="metric.label" class="metric-card">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <p>{{ metric.desc }}</p>
          </article>
        </section>

        <el-alert
          v-if="hasPerQuestionEvaluation && !finalReportGenerated"
          class="detail-alert"
          type="warning"
          show-icon
          :closable="false"
          title="当前展示的是单题即时点评"
          description="问答区分数和点评来自答题后的即时评估，不代表最终面试报告已经生成。"
        />

        <section class="info-grid">
          <article class="info-card">
            <div class="section-head">
              <div>
                <p>面试配置</p>
                <h3>本轮训练参数</h3>
              </div>
              <SlidersHorizontal :size="18" />
            </div>
            <dl>
              <div>
                <dt>面试模式</dt>
                <dd>{{ interviewModeLabel(detail.interviewMode) }}</dd>
              </div>
              <div>
                <dt>目标岗位</dt>
                <dd>{{ detail.targetPosition || '--' }}</dd>
              </div>
              <div>
                <dt>经验年限</dt>
                <dd>{{ experienceLevelLabel(detail.experienceLevel) }}</dd>
              </div>
              <div>
                <dt>行业方向</dt>
                <dd>{{ industryDirectionLabel(detail.industryDirection) }}</dd>
              </div>
              <div>
                <dt>难度</dt>
                <dd>{{ difficultyLabel(detail.difficulty) }}</dd>
              </div>
              <div>
                <dt>面试官风格</dt>
                <dd>{{ interviewerStyleLabel(detail.interviewerStyle) }}</dd>
              </div>
            </dl>
          </article>

          <article class="info-card">
            <div class="section-head">
              <div>
                <p>简历证据</p>
                <h3>简历快照</h3>
              </div>
              <BriefcaseBusiness :size="18" />
            </div>
            <dl v-if="detail.resumeSnapshot">
              <div>
                <dt>简历名称</dt>
                <dd>{{ detail.resumeSnapshot.resumeName || '--' }}</dd>
              </div>
              <div>
                <dt>求职方向</dt>
                <dd>{{ detail.resumeSnapshot.targetPosition || '--' }}</dd>
              </div>
              <div>
                <dt>技能栏</dt>
                <dd>{{ detail.resumeSnapshot.skills || '--' }}</dd>
              </div>
              <div>
                <dt>工作摘要</dt>
                <dd>{{ detail.resumeSnapshot.workSummary || '--' }}</dd>
              </div>
            </dl>
            <AppState v-else type="empty" title="没有简历快照" description="本轮面试仍可按问答记录复盘。" />
          </article>
        </section>

        <section class="stages-panel">
          <div class="section-head">
            <div>
              <p>阶段进度</p>
              <h3>本轮节奏</h3>
            </div>
          </div>

          <div class="stage-grid">
            <AppState v-if="!stages.length" type="empty" title="暂无阶段信息" description="本轮面试暂未形成阶段拆分。" />
            <article v-for="stage in stages" :key="stage.stageId" class="stage-card">
              <div class="stage-head">
                <div>
                  <span>{{ stage.stageType || '阶段' }}</span>
                  <h4>{{ stage.stageName || `阶段 ${stage.stageId}` }}</h4>
                </div>
                <StatusTag :status="stage.status" />
              </div>
              <div class="stage-progress">
                <span>题目进度</span>
                <strong>{{ stage.actualQuestionCount || 0 }} / {{ stage.expectedQuestionCount || 0 }}</strong>
              </div>
              <p>{{ stage.focusPoints || stageScoreHint(stage.stageScore) }}</p>
            </article>
          </div>
        </section>

        <section class="messages-panel">
          <div class="section-head">
            <div>
              <p>问答回看</p>
              <h3>本轮对话</h3>
            </div>
            <el-button text type="primary" @click="router.push(`/interviews/room/${detail.interviewId}`)">返回训练房间</el-button>
          </div>

          <div class="message-list">
            <AppState v-if="!messages.length" type="empty" title="暂无问答记录" description="开始面试并完成答题后，这里会展示问题、回答和 AI 点评。" />
            <article v-for="message in messages" :key="message.messageId" class="message-card">
              <div class="message-head">
                <div>
                  <span>{{ stageNameById(message.stageId) }}</span>
                  <h4>{{ message.isFollowUp ? '追问' : roleLabel(message.role) }}</h4>
                </div>
                <div class="message-badges">
                  <el-tag v-if="message.isFollowUp" size="small" type="warning" effect="plain">追问</el-tag>
                  <el-tag size="small" effect="plain">{{ displayScore(message.score) }}</el-tag>
                </div>
              </div>

              <div class="question-block">
                <span>面试官问题</span>
                <MarkdownPreview :content="message.questionContent || message.content || '暂无问题内容。'" />
              </div>

              <div v-if="message.userAnswer" class="answer-block">
                <span>我的回答</span>
                <p>{{ message.userAnswer }}</p>
              </div>

              <div v-if="message.aiComment || message.followUpReason" class="review-block">
                <p v-if="message.aiComment"><strong>AI 点评：</strong>{{ message.aiComment }}</p>
                <p v-if="message.followUpReason"><strong>追问原因：</strong>{{ message.followUpReason }}</p>
              </div>

              <div v-if="normalizeKnowledgePoints(message.knowledgePoints).length" class="knowledge-tags">
                <span>知识点</span>
                <el-tag
                  v-for="item in normalizeKnowledgePoints(message.knowledgePoints)"
                  :key="item"
                  size="small"
                  effect="plain"
                >
                  {{ item }}
                </el-tag>
              </div>
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
import {
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  History,
  MessageSquare,
  SlidersHorizontal,
  Timer
} from 'lucide-vue-next'

import { getInterviewDetailApi } from '@/api/interview'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {
  difficultyOptions,
  experienceLevelOptions,
  industryDirectionOptions,
  interviewerStyleOptions,
  interviewModeOptions
} from '@/constants/enums'
import type { InterviewDetailVO, InterviewMessageVO, InterviewStageVO } from '@/types/interview'
import { getErrorMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const errorMessage = ref('')
const detail = ref<InterviewDetailVO | null>(null)

const reportStatus = computed(() => String(detail.value?.reportStatus || '').toUpperCase())
const finalReportGenerated = computed(() => reportStatus.value === 'GENERATED')
const isReportGenerating = computed(() =>
  ['REPORT_GENERATING', 'GENERATING', 'PROCESSING', 'PENDING', 'RUNNING'].includes(reportStatus.value)
)
const isReportFailed = computed(() => ['FAILED', 'ERROR', 'REPORT_FAILED'].includes(reportStatus.value))
const canOpenReportTaskCenter = computed(() => Boolean(detail.value && (isReportGenerating.value || isReportFailed.value)))
const reportActionText = computed(() => {
  if (isReportGenerating.value) return '查看生成进度'
  if (isReportFailed.value) return '查看失败原因'
  if (finalReportGenerated.value) return '查看报告'
  if (isInterviewDone.value) return '生成报告'
  return '查看报告'
})
const hasPerQuestionEvaluation = computed(() =>
  messages.value.some((message) => message.score !== undefined || Boolean(message.aiComment))
)
const isInterviewDone = computed(() => ['COMPLETED', 'CANCELED', 'FAILED'].includes(String(detail.value?.status || '').toUpperCase()))
const stages = computed(() => detail.value?.stages || [])
const messages = computed(() => detail.value?.messages || [])
const answeredMessages = computed(() => messages.value.filter((message) => Boolean(message.userAnswer)))
const followUpMessages = computed(() => messages.value.filter((message) => message.isFollowUp))
const averageScore = computed(() => {
  const scores = messages.value
    .map((message) => Number(message.score))
    .filter((score) => Number.isFinite(score) && score > 0)
  if (!scores.length) return '-'
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})

const statusHint = computed(() => {
  const status = String(detail.value?.status || '').toUpperCase()
  if (isReportGenerating.value) return '面试已结束，报告正在生成；可进入报告页或任务中心继续查看进度。'
  if (isReportFailed.value) return '报告生成失败，可以进入报告页查看原因并重新提交，也可以到任务中心追踪记录。'
  if (status === 'COMPLETED') return '本轮面试已完成，可以查看报告或回看问答记录。'
  if (status === 'FAILED') return '本轮面试异常结束，建议查看房间或重新创建面试。'
  return '这轮面试还可以继续推进，建议先回到房间完成答题。'
})

const goInterviewReport = () => {
  if (!detail.value) return
  router.push(`/interviews/${detail.value.interviewId}/report`)
}

const goReportTaskCenter = () => {
  if (!detail.value) return
  router.push({
    path: '/agent/tasks',
    query: {
      bizType: 'interview.report',
      bizId: String(detail.value.interviewId)
    }
  })
}

const metrics = computed(() => [
  { label: '阶段数', value: stages.value.length, desc: '本轮面试配置的阶段数量' },
  { label: '已答问题', value: answeredMessages.value.length, desc: '已有用户回答的题目' },
  { label: '追问次数', value: followUpMessages.value.length, desc: 'AI 根据回答继续深挖的问题' },
  { label: '即时均分', value: averageScore.value, desc: finalReportGenerated.value ? '最终报告已生成' : '仅统计单题即时评分' }
])

const normalizeKnowledgePoints = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return value
    .split(/[,;\n、，；]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const stageNameById = (stageId?: number) => {
  return stages.value.find((stage) => stage.stageId === stageId)?.stageName || '未分配阶段'
}

const optionLabel = (options: Array<{ label: string; value: string | number }>, value?: string) => {
  if (!value) return '--'
  return options.find((item) => String(item.value) === value)?.label || '选项待确认'
}

const interviewModeLabel = (value?: string) => optionLabel(interviewModeOptions, value)
const interviewModeTitle = (value?: string) => value ? optionLabel(interviewModeOptions, value) : ''
const experienceLevelLabel = (value?: string) => optionLabel(experienceLevelOptions, value)
const industryDirectionLabel = (value?: string) => optionLabel(industryDirectionOptions, value)
const difficultyLabel = (value?: string) => optionLabel(difficultyOptions, value)
const interviewerStyleLabel = (value?: string) => optionLabel(interviewerStyleOptions, value)

const roleLabel = (role?: string) => {
  const normalized = String(role || '').toUpperCase()
  if (normalized.includes('ASSISTANT') || normalized.includes('INTERVIEWER')) return '面试官'
  if (normalized.includes('USER') || normalized.includes('CANDIDATE')) return '候选人'
  return role || '问答'
}

const displayScore = (score?: number) => {
  const value = Number(score)
  return Number.isFinite(value) ? `${Math.round(value)} 分` : '未评分'
}

const stageScoreHint = (score?: number) => {
  const value = Number(score)
  if (Number.isFinite(value) && value > 0) return `阶段即时得分 ${Math.round(value)} 分。`
  return '暂无阶段得分，可结合下方问答记录复盘。'
}

const fetchDetail = async () => {
  if (!interviewId) {
    errorMessage.value = '面试链接不完整，请从面试历史重新进入'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    detail.value = await getInterviewDetailApi(interviewId)
  } catch (error) {
    detail.value = null
    errorMessage.value = getErrorMessage(error, '面试详情加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.interview-detail-page {
  display: grid;
  gap: 22px;
}

.detail-hero {
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

.detail-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.detail-hero h1 {
  margin: 0;
  color: var(--app-text, #111827);
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 0;
}

.detail-hero p {
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

.detail-panel {
  min-height: 360px;
  padding: 22px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: var(--app-surface, #ffffff);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
}

.overview-head,
.section-head,
.stage-head,
.message-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.overview-head span,
.section-head p,
.stage-head span,
.message-head span {
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
}

.overview-head h2,
.section-head h3,
.stage-head h4,
.message-head h4 {
  margin: 6px 0 0;
  color: var(--app-text, #111827);
  letter-spacing: 0;
}

.overview-head h2 {
  font-size: 24px;
  line-height: 1.25;
}

.overview-head p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.status-stack {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.metric-card,
.info-card,
.stages-panel,
.messages-panel,
.stage-card,
.message-card {
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: #ffffff;
}

.metric-card {
  padding: 18px;
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

.detail-alert,
.info-grid,
.stages-panel,
.messages-panel {
  margin-top: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.info-card,
.stages-panel,
.messages-panel {
  padding: 20px;
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

.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.stage-card {
  padding: 16px;
  background: #f8fafc;
}

.stage-progress {
  margin-top: 16px;
}

.stage-progress span {
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.stage-progress strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text, #111827);
  font-size: 22px;
}

.stage-card p {
  margin: 12px 0 0;
  color: #475569;
  line-height: 1.65;
}

.message-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.message-card {
  padding: 18px;
  background: #ffffff;
}

.message-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.question-block,
.answer-block,
.review-block {
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.question-block > span,
.answer-block > span,
.knowledge-tags > span {
  display: block;
  margin-bottom: 8px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.answer-block p,
.review-block p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.review-block {
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: #eff6ff;
}

.review-block p + p {
  margin-top: 8px;
}

.knowledge-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.knowledge-tags > span {
  margin-bottom: 0;
}

@media (max-width: 1100px) {
  .metric-grid,
  .info-grid,
  .stage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .detail-hero,
  .overview-head,
  .stage-head,
  .message-head {
    flex-direction: column;
  }

  .detail-hero {
    padding: 22px;
  }

  .detail-hero h1 {
    font-size: 24px;
  }

  .hero-actions,
  .hero-actions :deep(.el-button) {
    width: 100%;
  }

  .detail-panel {
    padding: 16px;
  }

  .metric-grid,
  .info-grid,
  .stage-grid {
    grid-template-columns: 1fr;
  }

  .status-stack,
  .message-badges {
    justify-content: flex-start;
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
