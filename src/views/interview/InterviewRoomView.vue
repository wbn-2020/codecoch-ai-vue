<template>
  <div class="interview-room">
    <section class="room-topbar">
      <div class="room-identity">
        <div class="eyebrow">
          <el-button class="room-back" text @click="router.push('/interviews/history')">
            <ArrowLeft :size="15" />
            返回
          </el-button>
          <Bot :size="16" />
          AI 面试训练室
        </div>
        <h1>{{ current?.currentQuestion?.isFollowUp ? '追问训练中' : '模拟面试进行中' }}</h1>
      </div>

      <div class="topbar-status">
        <span class="dungeon-chip">⚔ 副本战斗</span>
        <span class="dungeon-chip dungeon-chip--xp">+{{ sessionXp }} XP 本场</span>
        <span class="cc-badge" :class="sseStatusBadgeClass">
          <span class="cc-badge__dot"></span>
          {{ sseStatusLabel }}
        </span>
        <span v-if="loading" class="topbar-chip topbar-chip--live">Loading</span>
        <span v-if="submitting" class="topbar-chip topbar-chip--live">Scoring</span>
        <span v-if="roomError" class="topbar-chip topbar-chip--danger">Error</span>
        <span class="topbar-chip">计时 {{ elapsedText }}</span>
        <span class="topbar-chip">{{ interviewStatusLabel(current?.status) }}</span>
        <el-button class="ghost-action" text @click="fetchCurrent">重新获取当前题</el-button>
        <el-button
          v-if="interviewId"
          class="ghost-action"
          text
          :disabled="!canViewReport"
          :title="reportButtonTip"
          @click="handleViewReport"
        >
          {{ reportButtonText }}
        </el-button>
      </div>
    </section>

    <section class="war-room" v-loading="loading">
      <aside class="progress-panel">
        <div class="panel-title">
          <span>阶段轨道</span>
          <StatusTag :status="current?.status || 'NOT_STARTED'" />
        </div>

        <div class="session-card">
          <strong>{{ current?.currentStage?.stageName || '当前阶段' }}</strong>
          <p>{{ current?.currentQuestion?.stageProgress || 'AI 会按阶段推进题目与追问。' }}</p>
          <div class="mini-meta">
            <span>{{ current?.currentQuestion?.isFollowUp ? '追问链' : '主问题' }}</span>
            <span>{{ reportStatusText }}</span>
          </div>
        </div>

        <div v-if="voiceProductContext?.scenario || scenarioBinding" class="scenario-binding-card">
          <div>
            <span>版本化剧本</span>
            <strong>{{ scenarioBindingTitle }}</strong>
          </div>
          <el-tag :type="scenarioBindingTagType" effect="plain">
            {{ scenarioBindingStatusText }}
          </el-tag>
          <p>{{ scenarioBindingMessage }}</p>
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
          <div class="outline-title">本轮大纲</div>
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
          v-if="!current && !loading && !roomError"
          type="empty"
          title="未找到面试会话"
          description="可能是面试记录无效、会话已结束，或当前账号没有访问这场面试。请从历史记录重新进入。"
        >
          <el-button type="primary" @click="router.push('/interviews/history')">返回面试历史</el-button>
          <el-button @click="fetchCurrent">重新加载</el-button>
        </AppState>

        <AppState
          v-if="!current && !loading && roomError"
          type="error"
          title="面试房间加载失败"
          :description="roomError"
        >
          <el-button type="primary" @click="fetchCurrent">重新加载</el-button>
          <el-button @click="router.push('/interviews/history')">返回面试历史</el-button>
        </AppState>

        <div class="side-actions">
          <el-button plain @click="fetchCurrent">重新获取当前题</el-button>
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

        <div v-if="current && current.status !== 'NOT_STARTED'" class="finish-zone">
          <div>
            <strong>结束本轮训练</strong>
            <p>未提交的当前回答不会自动补交，确认后会进入报告生成。</p>
          </div>
          <el-button type="danger" plain :loading="finishing" @click="handleManualFinish">
            <Square :size="16" />
            结束面试
          </el-button>
        </div>
      </aside>

      <main class="conversation-panel">
        <template v-if="current">
          <div class="conversation-scroll">
            <div class="training-boundary">
              <ShieldCheck :size="16" />
              <span>本房间仅用于模拟训练与复盘，不用于真实面试实时作答。</span>
            </div>

            <section class="ai-presence">
              <div class="ai-orbit" :class="{ 'is-thinking': loading || submitting || starting }">
                <span></span>
                <span></span>
                <Bot :size="30" />
              </div>
              <div class="ai-presence__copy">
                <div class="ai-persona">
                  <span class="ai-persona__dot"></span>
                  {{ INTERVIEWER_PERSONA }}
                  <span v-if="submitting || loading || starting" class="ai-persona__typing">正在思考<i></i><i></i><i></i></span>
                </div>
                <p>{{ roomPresenceLabel }}</p>
                <h2>{{ roomPresenceTitle }}</h2>
                <span>{{ roomPresenceHint }}</span>
                <div class="ai-signal" :class="{ 'is-active': loading || submitting || starting }" aria-hidden="true">
                  <i v-for="item in 18" :key="item"></i>
                </div>
              </div>
            </section>

            <div class="battle-strip">
              <span class="battle-strip__label">⚔ 战斗进度</span>
              <div class="battle-strip__bar"><i :style="{ width: `${battleProgressPercent}%` }"></i></div>
              <span class="battle-strip__text">{{ answeredCount }}/{{ expectedTotalText }} 题</span>
              <span class="battle-strip__xp">+{{ sessionXp }} XP</span>
            </div>

            <div class="cockpit-state-strip">
              <article v-for="item in cockpitStateItems" :key="item.key" :class="item.state">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>

            <el-alert
              v-if="current.status === 'NOT_STARTED'"
              class="state-alert"
              type="info"
              show-icon
              :closable="false"
              title="准备好后开始第一题，系统会记录本轮作答并生成复盘。"
            />

            <el-alert
              v-if="roomError"
              class="state-alert"
              type="error"
              show-icon
              :closable="false"
              :title="roomError"
            />

            <div v-if="current.status === 'NOT_STARTED'" class="start-card">
              <Rocket :size="26" />
              <div>
                <h2>准备进入 AI 面试</h2>
                <p>开始后将获取第一道题，并根据你的回答继续推进面试。</p>
              </div>
              <el-button type="primary" size="large" :loading="starting" @click="handleStart">开始面试</el-button>
            </div>

            <article v-if="current.currentQuestion" class="message-card ai question-card">
              <div class="message-avatar message-avatar--ai">
                <Bot :size="18" />
              </div>
              <div class="message-body">
                <div class="message-head">
                  <span class="question-kicker">
                    AI 面试官
                    <small>{{ currentQuestionMetaText }}</small>
                  </span>
                  <el-tag v-if="current.currentQuestion.isFollowUp" type="warning" effect="dark">追问</el-tag>
                </div>
                <h2>{{ current.currentQuestion.questionTitle || '当前问题' }}</h2>
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
              :title="emptyQuestionTitle"
              :description="emptyQuestionDescription"
            >
              <el-button v-if="current.status === 'NOT_STARTED'" type="primary" :loading="starting" @click="handleStart">开始面试</el-button>
              <el-button v-else-if="current.status === 'COMPLETED'" type="primary" :disabled="!canViewReport" @click="handleViewReport">查看结构化报告</el-button>
              <el-button v-else type="primary" @click="fetchCurrent">重新生成这一题</el-button>
              <el-button v-if="current.status !== 'NOT_STARTED'" plain :loading="finishing" @click="handleManualFinish">结束并生成报告</el-button>
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
          </div>

          <div class="answer-console">
            <div class="console-head">
              <div>
                <span class="console-kicker">回答工作台</span>
                <h2>把思路讲完整</h2>
                <p>{{ answerDisabled ? '当前状态不可提交回答' : '提交后 AI 会分析结构、亮点、不足，并决定是否追问。' }}</p>
              </div>
              <StatusTag :status="submitting ? 'AI_EVALUATING' : current.status" />
            </div>
            <div class="answer-dock-meta">
              <span>{{ answerWordCount }} 字</span>
              <span>{{ answerDurationText }}</span>
              <span>{{ answerDisabled ? '不可提交' : '可提交' }}</span>
            </div>
            <InterviewVoiceLiveConsole
              v-if="interviewId"
              ref="liveVoiceConsoleRef"
              :key="current.currentQuestion?.messageId || 'no-question'"
              :session-id="interviewId"
              :question-key="current.currentQuestion?.messageId || 'no-question'"
              :question-text="current.currentQuestion?.questionContent || ''"
              :disabled="answerDisabled || submitting || compatibilityVoiceRuntimeActive"
              :preflight-ready="voicePreflightReady"
              :persist-recording="persistLiveVoiceRecording"
              @transcript-confirmed="handleLiveTranscriptConfirmed"
              @analysis-updated="handleVoiceDeliveryAnalysisUpdated"
              @runtime-active-changed="handleLiveAsrRuntimeChanged"
            />
            <section class="voice-preview">
              <div class="voice-preview__head">
                <div>
                  <span class="console-kicker">录音文件转写（兼容模式）</span>
                  <strong>{{ voicePreviewTitle }}</strong>
                  <p>{{ voicePreviewHint }}</p>
                </div>
                <span class="voice-preview__state">{{ voicePreviewStateLabel }}</span>
              </div>
              <div class="voice-preview__actions">
                <el-button
                  :disabled="answerDisabled || liveAsrRuntimeActive || !voicePreview.canRecord.value"
                  @click="handleVoiceStart"
                >
                  <Mic :size="16" />
                  开始录音
                </el-button>
                <el-button
                  :disabled="!voicePreview.canStopRecording.value"
                  @click="handleVoiceStop"
                >
                  <MicOff :size="16" />
                  停止
                </el-button>
                <el-button
                  :disabled="answerDisabled || voiceConfirming"
                  @click="handleVoiceFallback"
                >
                  <Keyboard :size="16" />
                  文本降级
                </el-button>
              </div>
              <el-input
                v-if="voicePreview.canEditDraft.value"
                v-model="voicePreview.draftText.value"
                type="textarea"
                :rows="3"
                :disabled="answerDisabled || liveAsrRuntimeActive || voicePreview.isBusy.value || voiceConfirming"
                placeholder="当前没有 ASR 接口。请在这里手动粘贴或编辑转写草稿，确认后才会写入正式回答。"
                @input="handleVoiceDraftInput"
              />
              <div v-if="voicePreview.canEditDraft.value" class="voice-preview__confirm">
                <span>未确认草稿不会提交、评分、入库或进入 Agent。</span>
                <el-button
                  type="primary"
                  plain
                  :loading="voiceConfirming"
                  :disabled="answerDisabled || voiceConfirming || !voicePreview.canConfirmDraft.value"
                  @click="handleVoiceConfirm"
                >
                  <Check :size="16" />
                  确认到文本回答
                </el-button>
              </div>
              <el-alert
                v-if="voicePreview.errorMessage.value"
                class="voice-preview__alert"
                type="warning"
                show-icon
                :closable="false"
                :title="voicePreview.errorMessage.value"
              />
            </section>
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
                :disabled="answerDisabled || voicePreview.isBusy.value || voiceConfirming"
                :loading="submitting"
                @click="handleSubmit"
              >
                <Send :size="16" />
                {{ submitting ? 'AI 正在评分并生成下一步问题' : '提交回答' }}
              </el-button>
              <el-button @click="fetchCurrent">重新获取当前题</el-button>
            </div>
            <el-alert
              v-if="submitting"
              class="state-alert"
              type="info"
              show-icon
              :closable="false"
              title="AI 正在分析你的回答"
              :description="answerReviewMessage || '正在检查回答结构、技术深度与追问方向，预计需要 5-20 秒。'"
            />
            <section
              v-if="submitting && answerReviewStreamingFeedback"
              class="review-stream-preview"
            >
              <span>AI 实时点评</span>
              <p>{{ answerReviewStreamingFeedback }}</p>
            </section>
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
          <span>AI 实时点评</span>
          <Activity :size="16" />
        </div>

        <div class="battle-status-card">
          <div class="battle-status-card__head">
            <span>战况</span>
            <span class="battle-status-card__lv">LV.{{ gameProfile.levelInfo.level }} {{ gameProfile.levelInfo.title }}</span>
          </div>
          <div class="battle-status-card__grid">
            <div>
              <span>本场已拿</span>
              <strong>+{{ sessionXp }} XP</strong>
            </div>
            <div>
              <span>题序</span>
              <strong>{{ answeredCount }}/{{ expectedTotalText }}</strong>
            </div>
            <div>
              <span>连胜</span>
              <strong>🔥 {{ gameProfile.streakDays }} 天</strong>
            </div>
            <div>
              <span>计时</span>
              <strong>{{ elapsedText }}</strong>
            </div>
          </div>
        </div>

        <div class="score-card">
          <span>当前题表现</span>
          <strong>{{ latestScoreText }}</strong>
          <p>{{ latestEvaluationLevelText }}</p>
          <span v-if="lastResult" class="score-card__xp">+18 XP 已入账</span>
        </div>

        <InterviewVoiceDeliveryMetrics :analysis="voiceDeliveryAnalysis" />

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
          <el-tab-pane label="点评" name="evaluation">
            <div v-if="lastResult" class="feedback-stack">
              <el-alert
                v-if="reviewFallbackVisible"
                type="warning"
                show-icon
                :closable="false"
                title="点评内容未完整返回"
                description="当前题已有评分或作答记录，但结构化点评为空；请先按下方兜底建议复盘，也可以重新获取当前题后继续。"
              />
              <section>
                <h3>AI 点评</h3>
                <MarkdownPreview :content="reviewCommentText" />
              </section>
              <section>
                <h3>回答亮点</h3>
                <p>{{ reviewAdvantageText }}</p>
              </section>
              <section>
                <h3>不足之处</h3>
                <p>{{ reviewWeaknessText }}</p>
              </section>
              <section>
                <h3>提升建议</h3>
                <p>{{ reviewSuggestionText }}</p>
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
              description="提交回答后，这里会展示 AI 点评、答题结构、追问方向和下一步动作。"
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

    <footer class="room-statusbar">
      <span>会话：{{ interviewId || '-' }}</span>
      <span>进度：{{ interviewStatusLabel(current?.status) }}</span>
      <span>计时：{{ elapsedText }}</span>
      <span>AI 节奏：{{ submitting ? '正在点评' : loading ? '题目加载中' : '等待作答' }}</span>
      <span v-if="answerReviewMetaText">点评：{{ answerReviewMetaText }}</span>
      <span>报告：{{ reportStatusText }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Activity, ArrowLeft, Bot, Check, FilePenLine, Keyboard, ListChecks, Mic, MicOff, Rocket, Route, Send, ShieldCheck, Square, UserRound } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import {
  confirmInterviewVoiceTranscriptApi,
  createInterviewVoiceSubmissionApi,
  deleteInterviewVoiceAudioApi,
  discardInterviewVoiceSubmissionApi,
  finishInterviewApi,
  getCurrentInterviewQuestionApi,
  startInterviewApi,
  streamInterviewAnswerReviewApi,
  submitInterviewAnswerApi,
  transcribeInterviewVoiceSubmissionApi,
  uploadInterviewVoiceAudioApi
} from '@/api/interview'
import {
  bindInterviewScenarioApi,
  getInterviewScenarioBindingApi
} from '@/api/interviewVoiceProduct'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { NEXT_ACTION } from '@/constants/enums'
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'
import {
  type InterviewVoiceConfirmedMeta,
  type InterviewVoiceRecordedAudio,
  answerContainsConfirmedVoiceText,
  mergeConfirmedVoiceText,
  resolveConfirmedVoiceAnswerSource,
  useInterviewVoicePreview
} from '@/features/interview-voice-preview'
import {
  appendConfirmedVoiceTranscript,
  loadInterviewVoiceProductContext,
  saveInterviewVoiceProductContext
} from '@/features/interview-voice-product'
import type {
  InterviewAnswerDTO,
  InterviewAnswerResultVO,
  InterviewAnswerReviewSseEvent,
  InterviewCurrentVO,
  InterviewVoiceDiscardReason,
  InterviewVoicePreviewState
} from '@/types/interview'
import type {
  InterviewRealtimeVoicePersistenceRequest,
  InterviewRealtimeVoicePersistenceResult,
  InterviewScenarioBindingVO,
  InterviewVoiceDeliveryAnalysisVO,
  InterviewVoiceProductContext
} from '@/types/interviewVoiceProduct'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'
import InterviewVoiceDeliveryMetrics from '@/views/interview/components/InterviewVoiceDeliveryMetrics.vue'
import InterviewVoiceLiveConsole from '@/views/interview/components/InterviewVoiceLiveConsole.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
const interviewId = getRouteNumberParam(route.params.id as string)

// ---- 副本战斗（游戏化增量，不改变面试逻辑） ----
/** AI 面试官人格 */
const INTERVIEWER_PERSONA = '面试官 · 岚'
/** 本场已拿 XP（会话内累计，仅展示） */
const sessionXp = ref(0)
const grantedAnswerIds = new Set<number>()
let interviewCompleteGranted = false

const answeredCount = ref(0)
const loading = ref(false)
const starting = ref(false)
const submitting = ref(false)
const finishing = ref(false)
const current = ref<InterviewCurrentVO | null>(null)
const roomError = ref('')
const lastResult = ref<InterviewAnswerResultVO | null>(null)
const answerContent = ref('')
const answerInputRef = ref<{ focus?: () => void } | null>(null)
const liveVoiceConsoleRef = ref<{
  cancelActiveAsr: () => Promise<void>
  resetRealtimeVoice: () => Promise<void>
} | null>(null)
const liveAsrRuntimeActive = ref(false)
const lastSubmittedAnswer = ref('')
const lastAnswerDuration = ref(0)
const answerStartTime = ref(Date.now())
const answerReviewMessage = ref('')
const answerReviewAnswerId = ref<number | undefined>()
const answerReviewAiCallLogId = ref<number | undefined>()
const answerReviewFollowUpAiCallLogId = ref<number | undefined>()
const answerReviewStreamingFeedback = ref('')
const answerReviewEvents = ref<Array<{ key: string; event: string; eventLabel?: string; stage?: string; stageLabel?: string; message?: string }>>([])
let slowSubmitTimer: number | undefined
let answerReviewSseHandle: ReturnType<typeof streamInterviewAnswerReviewApi> | null = null
let elapsedTimer: number | undefined
const elapsedSeconds = ref(0)
const confirmedVoiceMeta = ref<InterviewVoiceConfirmedMeta | null>(null)
const confirmedVoiceText = ref('')
const voiceConfirming = ref(false)
const uploadedVoiceFileId = ref<number | null>(null)
const voiceProductContext = ref<InterviewVoiceProductContext | null>(
  interviewId ? loadInterviewVoiceProductContext(interviewId) : null
)
const scenarioBinding = ref<InterviewScenarioBindingVO | null>(
  voiceProductContext.value?.scenarioBinding || null
)
const voiceDeliveryAnalysis = ref<InterviewVoiceDeliveryAnalysisVO | null>(null)
let voiceRequestController: AbortController | null = null
let voiceOperationVersion = 0
let activeVoiceSubmissionId: number | null = null

const voicePreview = useInterviewVoicePreview({
  onConfirmedText: (text, meta) => {
    const previousConfirmedText = confirmedVoiceText.value
    confirmedVoiceMeta.value = meta || null
    confirmedVoiceText.value = text
    answerContent.value = mergeConfirmedVoiceText(answerContent.value, previousConfirmedText, text)
    focusAnswerInput()
  },
  onRecordedAudio: (audio) => handleVoiceRecordedAudio(audio)
})

const compatibilityVoiceRuntimeActive = computed(() => voicePreview.isBusy.value)

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
  return '等待作答'
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
    WAITING_ANSWER: '等待作答',
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

const answerWordCount = computed(() => answerContent.value.trim().length)

const voicePreflightReady = computed(() =>
  route.query.voicePreflight === 'ready'
  || Boolean(voiceProductContext.value?.voicePreflightReady)
)

const scenarioBindingStatus = computed<'BOUND' | 'PENDING' | 'NONE'>(() => {
  if (scenarioBinding.value) return 'BOUND'
  return voiceProductContext.value?.scenarioBindingStatus || 'PENDING'
})

const scenarioBindingTitle = computed(() => {
  const scenario = voiceProductContext.value?.scenario
  if (scenario) return `${scenario.scenarioName} v${scenario.versionNo}`
  if (scenarioBinding.value) return `剧本版本 #${scenarioBinding.value.scenarioVersionId}`
  return '剧本绑定待确认'
})

const scenarioBindingStatusText = computed(() => ({
  BOUND: '已锁定',
  PENDING: '待绑定',
  NONE: '未选择'
})[scenarioBindingStatus.value])

const scenarioBindingTagType = computed<'success' | 'warning' | 'info'>(() => {
  if (scenarioBindingStatus.value === 'BOUND') return 'success'
  if (scenarioBindingStatus.value === 'PENDING') return 'warning'
  return 'info'
})

const scenarioBindingMessage = computed(() => {
  if (scenarioBinding.value) {
    return `服务端已锁定剧本版本 #${scenarioBinding.value.scenarioVersionId} 与量表版本 #${scenarioBinding.value.rubricVersionId}。`
  }
  return voiceProductContext.value?.bindingMessage
    || '当前只保留了本地选择上下文，尚未得到服务端绑定确认。'
})

const voicePreviewStateLabels: Record<InterviewVoicePreviewState, string> = {
  opening: '正在打开麦克风',
  stopping: '正在结束录音',
  idle: '待录音',
  recording: '录音中',
  recorded: '已录音',
  uploading: '上传中',
  transcribing: '转写中',
  draft: '草稿待确认',
  confirmed: '已确认',
  submitted: '已随文本提交',
  fallback_text: '文本降级'
}

const voicePreviewStateLabel = computed(() => voicePreviewStateLabels[voicePreview.state.value])

const voicePreviewTitle = computed(() => {
  if (voicePreview.state.value === 'opening') return '正在请求麦克风权限'
  if (voicePreview.state.value === 'stopping') return '正在完成本次录音'
  if (voicePreview.state.value === 'recording') return '正在本地录音'
  if (voicePreview.state.value === 'uploading') return '正在上传录音'
  if (voicePreview.state.value === 'transcribing') return '正在请求 ASR 转写'
  if (voicePreview.state.value === 'confirmed') return '已写入正式回答'
  if (voicePreview.state.value === 'submitted') return '已复用文本提交流程'
  if (voicePreview.state.value === 'fallback_text') return '已切换到文本降级'
  if (voicePreview.state.value === 'draft' || voicePreview.state.value === 'recorded') return '请确认转写草稿'
  return '可选的本地语音预览'
})

const voicePreviewHint = computed(() => {
  if (voicePreview.state.value === 'recording') return '音频只保存在当前页面内存中，不会默认长期保存。'
  if (voicePreview.state.value === 'uploading') return '录音会以 INTERVIEW_VOICE 文件类型上传，未确认转写不会进入评分。'
  if (voicePreview.state.value === 'transcribing') return 'ASR 不可用时会明确降级，不会伪造转写成功。'
  if (voicePreview.state.value === 'recorded') return '录音已捕获，正在准备上传或等待手动降级。'
  if (voicePreview.state.value === 'draft') return '确认前草稿不会进入评分、知识库、长期记忆或 Agent。'
  if (voicePreview.state.value === 'confirmed') return '已确认语音片段必须完整保留，可在它前后继续补充文字。'
  if (voicePreview.state.value === 'submitted') return '本轮语音预览已结束，后续问题可重新录音。'
  if (voicePreview.state.value === 'fallback_text') return '可以直接粘贴或编辑转写草稿，再确认到正式回答。'
  return '仅做录音状态和手动转写草稿预览，不做语音评分、情绪识别、回放或表达诊断。'
})

const currentQuestionMetaText = computed(() => {
  const stageName = current.value?.currentStage?.stageName || '当前阶段'
  const progress = current.value?.currentQuestion?.stageProgress
  return [stageName, progress].filter(Boolean).join(' / ')
})

const cockpitStateItems = computed(() => {
  const score = lastResult.value?.evaluation.score ?? lastResult.value?.score
  const status = String(current.value?.status || '').toUpperCase()
  const reportReady = ['COMPLETED', 'REPORT_GENERATING', 'REPORT_DONE', 'GENERATED', 'FINISHED'].includes(status)
  return [
    {
      key: 'loading',
      label: 'Loading',
      value: loading.value ? '同步题目中' : roomError.value ? '加载失败' : '稳定',
      state: roomError.value ? 'danger' : loading.value ? 'active' : 'idle'
    },
    {
      key: 'scoring',
      label: 'Scoring',
      value: submitting.value ? (answerReviewMessage.value || 'AI 评分中') : score === undefined || score === null ? '待评分' : `${score} 分`,
      state: submitting.value ? 'active' : score === undefined || score === null ? 'idle' : 'done'
    },
    {
      key: 'session',
      label: 'Session',
      value: interviewStatusLabel(current.value?.status),
      state: status === 'FAILED' ? 'danger' : reportReady ? 'done' : 'idle'
    }
  ]
})

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

const roomPresenceLabel = computed(() => {
  if (!current.value) return '等待进入房间'
  if (starting.value) return '正在拉取第一题'
  if (submitting.value) return 'AI 面试官正在听你作答'
  if (loading.value) return 'AI 正在整理下一题'
  if (current.value.status === 'COMPLETED') return '本轮面试已完成'
  if (current.value.currentQuestion?.isFollowUp) return '追问进行中'
  return '模拟面试进行中'
})

const roomPresenceTitle = computed(() => {
  if (!current.value) return '从面试历史重新进入，或新建一场训练。'
  if (current.value.status === 'NOT_STARTED') return '准备好后，AI 会从第一题开始推进。'
  if (current.value.status === 'COMPLETED') return '可以生成报告，复盘刚才的回答。'
  if (!current.value.currentQuestion) return '暂时没有新题，先复盘上一轮回答。'
  return current.value.currentQuestion.isFollowUp ? '把刚才没讲透的地方补完整。' : '按结论、原理、项目实践和取舍展开。'
})

const roomPresenceHint = computed(() => {
  if (submitting.value) return answerReviewMessage.value || '正在检查回答结构、技术深度与追问方向。'
  if (current.value?.status === 'COMPLETED') return '报告会把短板转成题库训练和能力图谱行动。'
  if (!current.value?.currentQuestion && current.value?.status !== 'NOT_STARTED') return '可重新生成这一题，也可以结束本轮生成报告。'
  return current.value?.currentQuestion?.stageProgress || '本轮会保留完整问答记录，结束后用于复盘。'
})

const emptyQuestionTitle = computed(() => {
  if (current.value?.status === 'NOT_STARTED') return '等待开始面试'
  if (current.value?.status === 'COMPLETED') return '本轮问题已完成'
  return loading.value ? 'AI 正在整理下一题' : '暂时没有新题'
})

const emptyQuestionDescription = computed(() => {
  if (current.value?.status === 'NOT_STARTED') return '点击开始面试后，系统会拉取第一道题并开始计时。'
  if (current.value?.status === 'COMPLETED') return '可以查看结构化报告，也可以从历史页再来一轮模拟面试。'
  return '题目可能仍在生成，或当前阶段已结束。你可以重新生成这一题，复盘刚才的回答，或结束并生成报告。'
})

const latestScoreText = computed(() => {
  const score = lastResult.value?.evaluation.score ?? lastResult.value?.score
  return score === undefined || score === null ? '--' : `${score}`
})

const hasReviewText = (value?: string | null) => Boolean(value && value.trim())

const latestEvaluationLevelText = computed(() => {
  if (!lastResult.value) return '等待评分结果'
  const level = lastResult.value.evaluation.level
  if (level) return evaluationLevelLabel(level)
  return latestScoreText.value !== '--' ? '已评分，点评待补' : '等待评分结果'
})

// ---- 副本战斗：XP 挂钩与战斗进度 ----
/** 每次 AI 评分返回（按 answerMessageId 去重）→ +18 XP 即时奖励 */
watch(lastResult, (result) => {
  const answerMessageId = result?.answerMessageId
  if (!answerMessageId || grantedAnswerIds.has(answerMessageId)) return
  grantedAnswerIds.add(answerMessageId)
  answeredCount.value = grantedAnswerIds.size
  gameProfile.grantXp('practice_correct')
  sessionXp.value += 18
})

/** 面试完成（一次性）→ 通关 +200 XP 并续连胜 */
watch(
  () => current.value?.status,
  (status) => {
    if (status !== 'COMPLETED' || interviewCompleteGranted) return
    interviewCompleteGranted = true
    gameProfile.completeMission()
    gameProfile.grantXp('interview_complete')
    sessionXp.value += 200
  }
)

/** 预计题量：大纲预期题数合计，退化为当前阶段预期 */
const expectedTotalText = computed(() => {
  const fromOutline = outlineStages.value.reduce((sum, stage) => sum + (Number(stage.expectedQuestionCount) || 0), 0)
  if (fromOutline > 0) return `${fromOutline}`
  const fromStage = Number(current.value?.currentStage?.expectedQuestionCount)
  if (fromStage > 0) return `${fromStage}`
  return '多'
})

const battleProgressPercent = computed(() => {
  const total = Number(expectedTotalText.value)
  if (!Number.isFinite(total) || total <= 0) return Math.min(100, answeredCount.value * 15)
  return Math.min(100, Math.round((answeredCount.value / total) * 100))
})

const reviewFallbackVisible = computed(() => {
  const result = lastResult.value
  if (!result) return false
  return ![
    result.evaluation.comment,
    result.comment,
    result.evaluation.advantage,
    result.evaluation.weakness,
    result.evaluation.suggestion
  ].some(hasReviewText)
})

const reviewCommentText = computed(() => {
  const result = lastResult.value
  if (!result) return ''
  if (hasReviewText(result.evaluation.comment)) return result.evaluation.comment
  if (hasReviewText(result.comment)) return result.comment || ''
  const scoreText = latestScoreText.value !== '--' ? `当前题已返回 ${latestScoreText.value} 分，` : ''
  return `${scoreText}结构化点评暂未返回。请先按“结论是否明确、方案是否可落地、项目证据是否可信、风险取舍是否讲清”四项复盘。`
})

const reviewAdvantageText = computed(() => {
  const value = lastResult.value?.evaluation.advantage
  if (hasReviewText(value)) return value || ''
  return lastSubmittedAnswer.value.length >= 80
    ? '已完成较完整作答，可以继续保留其中清晰的结论和项目描述。'
    : '已提交回答，但表达较短；下一轮先补一句结论和一个项目场景。'
})

const reviewWeaknessText = computed(() => {
  const value = lastResult.value?.evaluation.weakness
  if (hasReviewText(value)) return value || ''
  return '结构化不足项暂未返回。请重点检查是否缺少业务背景、关键步骤、异常处理、量化指标或风险取舍。'
})

const reviewSuggestionText = computed(() => {
  const value = lastResult.value?.evaluation.suggestion
  if (hasReviewText(value)) return value || ''
  return '建议下一轮按“先结论 -> 讲方案 -> 补项目证据 -> 说风险取舍”的顺序回答；如果题目涉及系统设计，再补监控、回滚和容量边界。'
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

const handleLiveTranscriptConfirmed = (
  text: string,
  evidence?: InterviewRealtimeVoicePersistenceResult
) => {
  if (evidence?.voiceSubmissionId && evidence.transcriptId) {
    const previousConfirmedText = confirmedVoiceText.value
    confirmedVoiceMeta.value = evidence
    confirmedVoiceText.value = text
    answerContent.value = mergeConfirmedVoiceText(
      answerContent.value,
      previousConfirmedText,
      text
    )
  } else {
    answerContent.value = appendConfirmedVoiceTranscript(answerContent.value, text)
  }
  focusAnswerInput()
  ElMessage.success('实时字幕草稿已写入文本回答，请提交前再次检查。')
}

const handleLiveAsrRuntimeChanged = (active: boolean) => {
  liveAsrRuntimeActive.value = active
}

const handleVoiceDeliveryAnalysisUpdated = (analysis: InterviewVoiceDeliveryAnalysisVO) => {
  voiceDeliveryAnalysis.value = analysis
}

const persistVoiceProductContext = (
  bindingStatus: 'BOUND' | 'PENDING' | 'NONE',
  binding?: InterviewScenarioBindingVO,
  bindingMessage?: string
) => {
  if (!interviewId) return
  const previous = voiceProductContext.value
  const next: InterviewVoiceProductContext = {
    sessionId: interviewId,
    voicePreflightReady: voicePreflightReady.value,
    scenario: previous?.scenario,
    scenarioBindingStatus: bindingStatus,
    scenarioBinding: binding,
    bindingMessage: bindingMessage || previous?.bindingMessage,
    savedAt: new Date().toISOString()
  }
  voiceProductContext.value = next
  saveInterviewVoiceProductContext(next)
}

const loadScenarioBinding = async () => {
  if (!interviewId) return
  try {
    const binding = await getInterviewScenarioBindingApi(interviewId, { silentError: true })
    scenarioBinding.value = binding
    persistVoiceProductContext(
      'BOUND',
      binding,
      `服务端已锁定剧本版本 #${binding.scenarioVersionId} 与量表版本 #${binding.rubricVersionId}。`
    )
    return
  } catch {
    // A missing binding is expected for ordinary interviews.
  }

  const routeScenarioVersionId = Number(route.query.scenarioVersionId || 0)
  const pendingScenarioVersionId =
    voiceProductContext.value?.scenario?.scenarioVersionId
    || (Number.isFinite(routeScenarioVersionId) ? routeScenarioVersionId : 0)
  const shouldRetryBinding =
    pendingScenarioVersionId > 0
    && (
      voiceProductContext.value?.scenarioBindingStatus === 'PENDING'
      || route.query.scenarioBinding === 'pending'
    )

  if (!shouldRetryBinding) return

  try {
    const binding = await bindInterviewScenarioApi(interviewId, {
      scenarioVersionId: pendingScenarioVersionId,
      bindingSource: 'USER_SELECTED'
    }, {
      silentError: true
    })
    scenarioBinding.value = binding
    persistVoiceProductContext(
      'BOUND',
      binding,
      `服务端已锁定剧本版本 #${binding.scenarioVersionId} 与量表版本 #${binding.rubricVersionId}。`
    )
    ElMessage.success('剧本与评分量表已在面试房间完成绑定。')
  } catch (error) {
    persistVoiceProductContext(
      'PENDING',
      undefined,
      getErrorMessage(
        error,
        '剧本仍未得到服务端绑定确认；本轮不会把本地选择显示为已绑定。'
      )
    )
  }
}

const resetConfirmedVoiceAnswer = () => {
  confirmedVoiceMeta.value = null
  confirmedVoiceText.value = ''
}

const isVoiceRequestCanceled = (error: unknown) => {
  const candidate = error as { code?: string; name?: string }
  return candidate?.code === 'ERR_CANCELED'
    || candidate?.name === 'CanceledError'
    || candidate?.name === 'AbortError'
}

const isCurrentVoiceOperation = (version: number, controller: AbortController) => {
  return version === voiceOperationVersion
    && voiceRequestController === controller
    && !controller.signal.aborted
}

const cancelVoiceLifecycle = async (reason: InterviewVoiceDiscardReason) => {
  voiceOperationVersion += 1
  const controller = voiceRequestController
  voiceRequestController = null
  controller?.abort()

  const submissionId =
    voicePreview.submission.value?.voiceSubmissionId
    || activeVoiceSubmissionId
    || confirmedVoiceMeta.value?.voiceSubmissionId
  const fileId = uploadedVoiceFileId.value
  voiceConfirming.value = false
  activeVoiceSubmissionId = null
  uploadedVoiceFileId.value = null
  await voicePreview.cancel()
  resetConfirmedVoiceAnswer()

  try {
    if (interviewId && submissionId) {
      await discardInterviewVoiceSubmissionApi(interviewId, submissionId, reason, { silentError: true })
      return
    }
    if (fileId) {
      await deleteInterviewVoiceAudioApi(fileId, { silentError: true })
    }
  } catch {
    // Backend lifecycle records deletion failures once a submission exists.
  }
}

const resetRealtimeVoice = async () => {
  await liveVoiceConsoleRef.value?.resetRealtimeVoice()
  liveAsrRuntimeActive.value = false
}

const cleanupVoiceResources = async (reason: InterviewVoiceDiscardReason) => {
  await Promise.all([
    resetRealtimeVoice(),
    cancelVoiceLifecycle(reason)
  ])
}

const getVoiceAudioExtension = (mimeType: string) => {
  const value = mimeType.toLowerCase()
  if (value.includes('ogg')) return 'ogg'
  if (value.includes('wav')) return 'wav'
  if (value.includes('mpeg') || value.includes('mp3')) return 'mp3'
  if (value.includes('mp4') || value.includes('m4a')) return 'm4a'
  return 'webm'
}

const buildVoiceAudioFile = (audio: InterviewVoiceRecordedAudio) => {
  const mimeType = audio.mimeType || audio.blob.type || 'audio/webm'
  const extension = getVoiceAudioExtension(mimeType)
  return new File([audio.blob], `interview-voice-${Date.now()}.${extension}`, { type: mimeType })
}

const handleVoiceRecordedAudio = async (audio: InterviewVoiceRecordedAudio) => {
  if (!interviewId || !current.value?.currentQuestion) {
    voicePreview.setError('upload_failed', 'No active interview question. Please refresh and retry.')
    return
  }

  const question = current.value.currentQuestion
  const controller = new AbortController()
  const operationVersion = ++voiceOperationVersion
  voiceRequestController?.abort()
  voiceRequestController = controller
  try {
    voicePreview.setUploading()
    const uploaded = await uploadInterviewVoiceAudioApi(buildVoiceAudioFile(audio), {
      signal: controller.signal,
      silentError: true
    })
    uploadedVoiceFileId.value = uploaded.fileId
    if (!isCurrentVoiceOperation(operationVersion, controller)) return
    voicePreview.setTranscribing()
    const submission = await createInterviewVoiceSubmissionApi(interviewId, {
      fileId: uploaded.fileId,
      questionMessageId: question.messageId,
      questionId: question.questionId,
      audioDurationMs: audio.durationMs,
      mimeType: audio.mimeType || audio.blob.type,
      traceId: `interview-voice-${interviewId}-${question.messageId}-${Date.now()}`
    }, {
      signal: controller.signal,
      silentError: true
    })
    if (!isCurrentVoiceOperation(operationVersion, controller)) return
    activeVoiceSubmissionId = submission.voiceSubmissionId
    uploadedVoiceFileId.value = null
    voicePreview.setTranscribing(submission)
    const transcribed = await transcribeInterviewVoiceSubmissionApi(
      interviewId,
      submission.voiceSubmissionId,
      {
        signal: controller.signal,
        silentError: true
      }
    )
    if (!isCurrentVoiceOperation(operationVersion, controller)) return
    voicePreview.applySubmission(transcribed)
    if (transcribed.transcript?.draftText) {
      voicePreview.applyTranscriptDraft(transcribed.transcript)
      return
    }
    voicePreview.applyTranscriptionFallback(
      transcribed.transcript?.fallbackReason || transcribed.fallbackReason || '当前 ASR 不可用，请手动编辑转写草稿。',
      transcribed
    )
  } catch (error) {
    if (isVoiceRequestCanceled(error) || !isCurrentVoiceOperation(operationVersion, controller)) return
    voicePreview.setError('upload_failed', getErrorMessage(error, '语音上传或转写失败，请使用文本回答。'))
  } finally {
    if (voiceRequestController === controller) {
      voiceRequestController = null
    }
  }
}

const persistLiveVoiceRecording = async (
  request: InterviewRealtimeVoicePersistenceRequest
): Promise<InterviewRealtimeVoicePersistenceResult> => {
  if (!interviewId || !current.value?.currentQuestion) {
    throw new Error('No active interview question. Please refresh and retry.')
  }

  await cancelVoiceLifecycle('REPLACED')
  const question = current.value.currentQuestion
  const controller = new AbortController()
  const operationVersion = ++voiceOperationVersion
  voiceRequestController?.abort()
  voiceRequestController = controller
  try {
    const audio: InterviewVoiceRecordedAudio = {
      blob: request.blob,
      mimeType: request.mimeType,
      durationMs: request.durationMs
    }
    const uploaded = await uploadInterviewVoiceAudioApi(buildVoiceAudioFile(audio), {
      signal: controller.signal,
      silentError: true
    })
    uploadedVoiceFileId.value = uploaded.fileId
    if (!isCurrentVoiceOperation(operationVersion, controller)) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const submission = await createInterviewVoiceSubmissionApi(interviewId, {
      fileId: uploaded.fileId,
      questionMessageId: question.messageId,
      questionId: question.questionId,
      audioDurationMs: request.durationMs,
      mimeType: request.mimeType || request.blob.type,
      traceId: `interview-live-voice-${interviewId}-${question.messageId}-${Date.now()}`
    }, {
      signal: controller.signal,
      silentError: true
    })
    if (!isCurrentVoiceOperation(operationVersion, controller)) {
      throw new DOMException('Aborted', 'AbortError')
    }
    activeVoiceSubmissionId = submission.voiceSubmissionId
    uploadedVoiceFileId.value = null

    const transcribed = await transcribeInterviewVoiceSubmissionApi(
      interviewId,
      submission.voiceSubmissionId,
      {
        signal: controller.signal,
        silentError: true
      }
    )
    if (!isCurrentVoiceOperation(operationVersion, controller)) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const transcript = transcribed.transcript
    if (!transcript?.transcriptId) {
      throw new Error('Voice transcription did not persist a transcript row for confirmation.')
    }

    const confirmed = await confirmInterviewVoiceTranscriptApi(
      interviewId,
      transcript.transcriptId,
      {
        confirmedText: request.confirmedText,
        lowConfidenceAcknowledged: Boolean(transcript.lowConfidence)
      },
      {
        signal: controller.signal,
        silentError: true
      }
    )
    if (!isCurrentVoiceOperation(operationVersion, controller)) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const evidence: InterviewRealtimeVoicePersistenceResult = {
      voiceSubmissionId: confirmed.voiceSubmissionId,
      transcriptId: confirmed.transcriptId,
      transcriptConfidence: confirmed.confidence,
      answerSource: confirmed.fallback ? 'MANUAL_TRANSCRIPT' : 'VOICE_TRANSCRIPT',
      lowConfidence: confirmed.lowConfidence,
      fallback: confirmed.fallback,
      traceId: confirmed.traceId
    }
    confirmedVoiceMeta.value = evidence
    return evidence
  } finally {
    if (voiceRequestController === controller) {
      voiceRequestController = null
    }
  }
}

const handleVoiceStart = async () => {
  await resetRealtimeVoice()
  await cancelVoiceLifecycle('REPLACED')
  await voicePreview.startRecording()
}

const handleVoiceStop = () => {
  voicePreview.stopRecording()
}

const handleVoiceFallback = async () => {
  await cancelVoiceLifecycle('MODE_SWITCH')
  voicePreview.useTextFallback()
}

const handleVoiceDraftInput = (value: string) => {
  voicePreview.updateDraft(value)
}

const handleVoiceConfirm = async () => {
  if (!interviewId || voiceConfirming.value) return
  const text = voicePreview.draftText.value.trim()
  if (!text) return

  const currentTranscript = voicePreview.transcript.value
  let meta: InterviewVoiceConfirmedMeta | undefined
  const controller = new AbortController()
  const operationVersion = ++voiceOperationVersion
  voiceRequestController?.abort()
  voiceRequestController = controller
  try {
    voiceConfirming.value = true
    if (currentTranscript?.transcriptId) {
      const confirmed = await confirmInterviewVoiceTranscriptApi(interviewId, currentTranscript.transcriptId, {
        confirmedText: text,
        lowConfidenceAcknowledged: Boolean(currentTranscript.lowConfidence)
      }, {
        signal: controller.signal,
        silentError: true
      })
      if (!isCurrentVoiceOperation(operationVersion, controller)) return
      voicePreview.applyTranscriptDraft(confirmed)
      meta = {
        voiceSubmissionId: confirmed.voiceSubmissionId,
        transcriptId: confirmed.transcriptId,
        transcriptConfidence: confirmed.confidence,
        answerSource: confirmed.fallback ? 'MANUAL_TRANSCRIPT' : 'VOICE_TRANSCRIPT',
        lowConfidence: confirmed.lowConfidence,
        fallback: confirmed.fallback,
        traceId: confirmed.traceId
      }
    } else {
      meta = {
        answerSource: 'MANUAL_TRANSCRIPT',
        fallback: true
      }
    }
    if (voicePreview.confirmDraft(meta)) {
      ElMessage.success('Voice transcript confirmed. Please review the answer before submitting.')
    }
  } catch (error) {
    if (isVoiceRequestCanceled(error) || !isCurrentVoiceOperation(operationVersion, controller)) return
    ElMessage.error(getErrorMessage(error, 'Voice transcript confirmation failed.'))
  } finally {
    if (voiceRequestController === controller) {
      voiceRequestController = null
      voiceConfirming.value = false
    }
  }
}

const fetchCurrent = async () => {
  if (!interviewId) return
  loading.value = true
  roomError.value = ''
  try {
    const previousMessageId = current.value?.currentQuestion?.messageId
    const nextCurrent = await getCurrentInterviewQuestionApi(interviewId)
    const nextMessageId = nextCurrent?.currentQuestion?.messageId
    if (previousMessageId && nextMessageId !== previousMessageId) {
      await cleanupVoiceResources('QUESTION_CHANGED')
    }
    current.value = nextCurrent
    answerStartTime.value = Date.now()
    if (current.value?.currentQuestion) {
      startElapsedTimer()
    }
  } catch (error) {
    current.value = null
    roomError.value = getErrorMessage(error, '面试房间暂时无法加载，请稍后重试。')
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
      ElMessage.warning('面试已开始，但暂未获取到题目，请稍后重新获取当前题。')
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
  voicePreview.markSubmitted()
  activeVoiceSubmissionId = null
  uploadedVoiceFileId.value = null
  resetConfirmedVoiceAnswer()

  if (result.nextAction === NEXT_ACTION.FINISH) {
    await handleFinish(false)
    return
  }

  if (result.nextAction === NEXT_ACTION.FOLLOW_UP && result.nextQuestion) {
    await cleanupVoiceResources('QUESTION_CHANGED')
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
  answerReviewStreamingFeedback.value = ''
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

const isAnswerReviewTokenEvent = (event: string, data?: InterviewAnswerReviewSseEvent) => {
  return (event === 'delta' || event === 'token') && Boolean(data?.content || data?.message)
}

const applyAnswerReviewEvent = (event: string, data?: InterviewAnswerReviewSseEvent) => {
  if (isAnswerReviewTokenEvent(event, data)) {
    answerReviewStreamingFeedback.value += String(data?.content || data?.message || '')
    answerReviewMessage.value = 'AI 正在生成点评'
    return
  }
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

  if (voicePreview.isBusy.value || voiceConfirming.value) {
    ElMessage.warning('语音上传或转写仍在进行，请等待完成后再提交。')
    return
  }

  if (voicePreview.hasPendingUnconfirmedTranscript.value) {
    ElMessage.warning('Please confirm or clear the voice transcript draft before submitting.')
    return
  }

  if (
    confirmedVoiceMeta.value?.transcriptId
    && confirmedVoiceText.value
    && !answerContainsConfirmedVoiceText(answerContent.value, confirmedVoiceText.value)
  ) {
    ElMessage.warning('请保留完整的已确认语音片段；可以在它前后继续补充文字。')
    return
  }

  await resetRealtimeVoice()

  const voicePayload =
    confirmedVoiceMeta.value?.transcriptId
      ? {
          voiceSubmissionId: confirmedVoiceMeta.value.voiceSubmissionId,
          transcriptId: confirmedVoiceMeta.value.transcriptId,
          transcriptConfidence: confirmedVoiceMeta.value.transcriptConfidence,
          answerSource: resolveConfirmedVoiceAnswerSource(
            confirmedVoiceMeta.value,
            answerContent.value,
            confirmedVoiceText.value
          )
        }
      : {}

  const id = interviewId
  const payload: InterviewAnswerDTO = {
    messageId: current.value.currentQuestion.messageId,
    questionId: current.value.currentQuestion.questionId,
    answerContent: answerContent.value,
    answerDurationSeconds: Math.max(1, Math.round((Date.now() - answerStartTime.value) / 1000)),
    clientSubmitTime: new Date().toISOString(),
    ...voicePayload
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
        if (latestResult) {
          await applyAnswerResult(latestResult)
          ElMessage.warning(getErrorMessage(error, '点评连接提前中断，已保留并应用已返回的点评结果。'))
          return
        }
        await fetchCurrent()
        ElMessage.warning(getErrorMessage(error, '点评连接提前中断，已同步当前题状态。'))
      },
      onDone: async () => {
        if (!completedByDone && latestResult) {
          await applyAnswerResult(latestResult)
        } else if (!completedByDone) {
          await fetchCurrent()
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
  await cleanupVoiceResources('USER_CANCELLED')
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

onMounted(() => {
  gameProfile.hydrate(authStore.userInfo?.id)
  void fetchCurrent()
  void loadScenarioBinding()
})
onBeforeRouteLeave(async () => {
  await cleanupVoiceResources('PAGE_UNLOAD')
})
onBeforeUnmount(() => {
  window.clearTimeout(slowSubmitTimer)
  stopAnswerReviewSse()
  stopElapsedTimer()
  void cleanupVoiceResources('PAGE_UNLOAD')
})
</script>

<style scoped lang="scss">
.interview-room {
  height: 100vh;
  min-height: 720px;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 0;
  background: var(--user-bg);
  color: #e5edf8;
}

.room-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(16px);
}

.room-identity {
  min-width: 0;

  h1 {
    margin: 3px 0 0;
    color: #f8fafc;
    font-size: 18px;
    line-height: 1.25;
  }
}

.topbar-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.cc-badge {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.76);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.cc-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
}

.cc-badge--thinking,
.cc-badge--streaming {
  border-color: rgba(34, 211, 238, 0.34);
  color: #a5f3fc;

  .cc-badge__dot {
    background: #22d3ee;
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.85);
  }
}

.cc-badge--streaming .cc-badge__dot {
  animation: dotBlink 1s ease-in-out infinite;
}

.cc-badge--success {
  border-color: rgba(34, 197, 94, 0.32);
  color: #bbf7d0;

  .cc-badge__dot {
    background: #22c55e;
  }
}

@keyframes dotBlink {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

.eyebrow,
.answer-actions,
.tag-row,
.side-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.eyebrow {
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

.room-back {
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.62);
}

.topbar-chip {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #cbd5e1;
  font-size: 12px;
  white-space: nowrap;
}

.topbar-chip--live {
  border-color: rgba(34, 211, 238, 0.34);
  background: rgba(8, 145, 178, 0.18);
  color: #a5f3fc;
}

.topbar-chip--danger {
  border-color: rgba(248, 113, 113, 0.36);
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
}

.ghost-action {
  color: #cbd5e1;
}

.war-room {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: minmax(208px, 248px) minmax(0, 1fr) minmax(260px, 308px);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--user-bg-panel);
  overflow: hidden;
  box-shadow: none;
}

.progress-panel,
.conversation-panel,
.feedback-panel {
  min-width: 0;
  min-height: 0;
  padding: 14px;
}

.progress-panel,
.feedback-panel {
  overflow-y: auto;
  background: rgba(2, 6, 23, 0.38);
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  border-right: 1px solid rgba(148, 163, 184, 0.16);
  border-left: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.2);
}

.conversation-scroll {
  flex: 1 1 42%;
  min-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
  scroll-padding-bottom: 260px;
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
  color: #f8fafc;
  font-weight: 700;

  &.compact {
    margin-bottom: 10px;
    color: #e2e8f0;
    font-size: 14px;
  }
}

.training-boundary,
.session-card,
.scenario-binding-card,
.score-card,
.message-card,
.question-card,
.answer-console,
.start-card,
.pending-note,
.feedback-stack section,
.answer-rubric,
.followup-brief {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.66);
}

.training-boundary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 12px;
  color: #c7d2fe;
  font-size: 13px;
  line-height: 1.5;
}

.ai-presence {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 8px;
  background: var(--user-surface-tint);
  box-shadow: none;

  p,
  h2,
  span {
    margin: 0;
    overflow-wrap: anywhere;
  }

  p {
    color: #67e8f9;
    font-size: 12px;
    font-weight: 700;
  }

  h2 {
    margin-top: 6px;
    color: #f8fafc;
    font-size: 20px;
    line-height: 1.35;
  }

  span {
    display: block;
    margin-top: 8px;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.6;
  }
}

.ai-presence__copy {
  min-width: 0;
}

.ai-orbit {
  position: relative;
  display: inline-flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #cffafe;
  background: rgba(14, 116, 144, 0.28);

  span {
    position: absolute;
    inset: 7px;
    border: 1px solid rgba(103, 232, 249, 0.3);
    border-radius: 50%;
  }

  span:nth-child(2) {
    inset: 16px;
    border-color: rgba(45, 212, 191, 0.3);
  }

  &.is-thinking span {
    animation: aiPulse 1.8s ease-in-out infinite;
  }

  &.is-thinking span:nth-child(2) {
    animation-delay: 0.35s;
  }
}

.ai-signal {
  display: grid;
  width: min(100%, 420px);
  grid-template-columns: repeat(18, 1fr);
  align-items: end;
  gap: 3px;
  height: 26px;
  margin-top: 12px;

  i {
    display: block;
    min-width: 2px;
    height: 8px;
    border-radius: 999px;
    background: var(--user-primary);
    opacity: 0.45;
    transform-origin: bottom;
  }

  @for $i from 1 through 18 {
    i:nth-child(#{$i}) {
      height: #{6 + (($i * 7) % 18)}px;
    }
  }

  &.is-active i {
    animation: waveBeat 1.1s ease-in-out infinite;
  }

  @for $i from 1 through 18 {
    &.is-active i:nth-child(#{$i}) {
      animation-delay: #{($i - 1) * 0.045}s;
    }
  }
}

@keyframes waveBeat {
  0%,
  100% {
    transform: scaleY(0.55);
    opacity: 0.38;
  }

  50% {
    transform: scaleY(1.18);
    opacity: 0.95;
  }
}

.cockpit-state-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;

  article {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 12px;
    background: rgba(2, 6, 23, 0.42);

    span,
    strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    strong {
      margin-top: 5px;
      color: #e2e8f0;
      font-size: 13px;
    }

    &.active {
      border-color: rgba(34, 211, 238, 0.32);
      background: rgba(8, 145, 178, 0.12);

      strong {
        color: #a5f3fc;
      }
    }

    &.done {
      border-color: rgba(34, 197, 94, 0.28);

      strong {
        color: #bbf7d0;
      }
    }

    &.danger {
      border-color: rgba(248, 113, 113, 0.34);
      background: rgba(127, 29, 29, 0.16);

      strong {
        color: #fecaca;
      }
    }
  }
}

@keyframes aiPulse {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.58;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.session-card {
  padding: 16px;

  strong {
    color: #f8fafc;
  }

  p {
    margin: 8px 0 14px;
    color: #94a3b8;
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
    background: rgba(20, 184, 166, 0.12);
    color: #99f6e4;
    font-size: 12px;
  }
}

.scenario-binding-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  margin-top: 10px;
  padding: 12px;
  border-color: rgba(34, 211, 238, 0.22);
  background: rgba(8, 47, 73, 0.28);

  span,
  strong {
    display: block;
  }

  span {
    color: #67e8f9;
    font-size: 11px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    color: #f8fafc;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  p {
    grid-column: 1 / -1;
    margin: 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.5;
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
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.outline-title {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
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
    background: rgba(20, 184, 166, 0.12);

    .outline-order {
      background: #14b8a6;
      color: #042f2e;
    }

    strong {
      color: #f8fafc;
    }
  }

  &.completed {
    opacity: 0.6;

    .outline-order {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
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
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
}

.outline-info {
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 12px;
    color: #cbd5e1;
  }

  span {
    font-size: 11px;
    color: #94a3b8;
    opacity: 0.7;
    margin-right: 6px;
  }
}

.progress-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.58);

  strong {
    display: block;
    color: #e2e8f0;
    font-size: 13px;
  }

  p {
    margin: 5px 0 0;
    color: #94a3b8;
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
    background: #22d3ee;
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.7);
  }

  &.done .dot {
    background: #22c55e;
  }
}

.side-actions {
  margin-top: 16px;
}

.finish-zone {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.24);
  border-radius: 14px;
  background: rgba(127, 29, 29, 0.14);

  strong {
    color: #fecaca;
    font-size: 13px;
  }

  p {
    margin: 6px 0 0;
    color: #fca5a5;
    font-size: 12px;
    line-height: 1.55;
  }
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
    color: #f8fafc;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #94a3b8;
  }
}

.question-card {
  align-items: flex-start;
  margin-bottom: 10px;
  padding: 16px;
  background: var(--user-surface-tint);
  box-shadow: none;

  h2 {
    margin: 6px 0 12px;
    color: #f8fafc;
    font-size: 22px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
}

.question-kicker,
.console-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;

  small {
    max-width: 52vw;
    overflow: hidden;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.message-card {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;

  &.ai {
    background: var(--user-primary-soft);
  }

  &.user {
    background: rgba(20, 184, 166, 0.08);
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
  background: rgba(20, 184, 166, 0.16);
  color: #99f6e4;
}

.message-avatar--ai {
  background: rgba(8, 145, 178, 0.2);
  color: #a5f3fc;
  box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.18);
}

.message-body {
  min-width: 0;
  flex: 1;
}

.message-head {
  margin-bottom: 10px;

  span {
    color: #94a3b8;
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
  color: #cbd5e1;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.answer-console {
  position: sticky;
  bottom: 0;
  z-index: 2;
  flex: 1 1 58%;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  border-radius: 14px;
  background: var(--user-surface-raised);
  box-shadow: none;
}

.console-head {
  align-items: flex-start;
  margin-bottom: 8px;

  h2 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: #94a3b8;
    font-size: 13px;
  }
}

.answer-dock-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;

  span {
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.46);
    color: #94a3b8;
    font-size: 11px;
  }
}

.answer-actions {
  justify-content: flex-end;
  margin-top: 14px;
}

.voice-preview {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 12px;
  background: rgba(8, 47, 73, 0.22);
}

.voice-preview__head,
.voice-preview__confirm {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.voice-preview__head {
  strong {
    display: block;
    margin-top: 4px;
    color: #f8fafc;
    font-size: 14px;
  }

  p {
    margin: 5px 0 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.55;
  }
}

.voice-preview__state {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 999px;
  color: #a5f3fc;
  font-size: 12px;
  white-space: nowrap;
}

.voice-preview__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.voice-preview__confirm {
  align-items: center;

  span {
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.5;
  }
}

.voice-preview__alert {
  margin: 0;
}

:deep(.answer-console .el-textarea__inner) {
  min-height: 144px !important;
  max-height: 28vh;
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(2, 6, 23, 0.72);
  color: #e5edf8;
  line-height: 1.7;
  box-shadow: none;
  resize: vertical;
}

:deep(.answer-console .el-textarea__inner::placeholder) {
  color: #64748b;
}

.review-stage-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.review-stream-preview {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.08);

  span {
    color: #67e8f9;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: #e2e8f0;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}

.review-stage-item {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.46);

  span {
    color: #67e8f9;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: #f8fafc;
  }

  p {
    margin: 6px 0 0;
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.5;
  }
}

.score-card {
  padding: 18px;
  background: var(--user-success-soft);

  span,
  p {
    color: #94a3b8;
  }

  strong {
    display: block;
    margin: 8px 0;
    color: #f8fafc;
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
    background: rgba(2, 6, 23, 0.42);
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  strong {
    color: #e2e8f0;
    font-size: 13px;
  }

  p {
    margin-top: 5px;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.55;
  }
}

.followup-brief {
  p {
    margin: 0;
    color: #94a3b8;
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
      color: #f8fafc;
      font-size: 14px;
    }

    p {
      margin: 0;
      color: #cbd5e1;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
  }
}

.muted {
  color: #94a3b8;
}

.pending-note {
  padding: 16px;
  color: #94a3b8;

  svg {
    color: #67e8f9;
  }

  strong {
    display: block;
    margin: 10px 0 6px;
    color: #f8fafc;
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
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.46);
  color: #94a3b8;
  font-size: 12px;

  span {
    padding-right: 12px;
    border-right: 1px solid rgba(148, 163, 184, 0.2);

    &:last-child {
      border-right: 0;
    }
  }
}

@media (max-width: 960px) {
  .war-room {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  }

  .feedback-panel {
    grid-column: 1 / -1;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
  }

  .conversation-panel {
    border-right: 0;
  }
}

@media (max-width: 860px) {
  .interview-room {
    height: auto;
    min-height: 100dvh;
  }

  .room-topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar-status {
    justify-content: flex-start;
  }

  .war-room {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .progress-panel {
    order: 3;
  }

  .conversation-panel {
    order: 1;
  }

  .feedback-panel {
    order: 2;
  }

  .conversation-panel {
    border: 0;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  }

  .progress-panel,
  .feedback-panel,
  .conversation-scroll {
    overflow: visible;
  }

  .answer-console {
    position: static;
    overflow: visible;
    box-shadow: none;
  }

  :deep(.answer-console .el-textarea__inner) {
    max-height: none;
  }
}


@media (max-width: 720px) {
  .topbar-status,
  .answer-actions,
  .side-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .interview-room {
    padding: 8px;
    border-radius: 0;
  }

  .room-topbar,
  .progress-panel,
  .conversation-panel,
  .feedback-panel,
  .room-statusbar {
    padding: 14px;
  }

  .topbar-status,
  .answer-actions,
  .side-actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .topbar-chip,
  .topbar-status :deep(.el-button),
  .answer-actions :deep(.el-button),
  .side-actions :deep(.el-button),
  .finish-zone :deep(.el-button) {
    width: 100%;
    justify-content: center;
  }

  .question-card,
  .answer-console,
  .message-card,
  .start-card {
    padding: 14px;
  }

  .question-card h2 {
    font-size: 20px;
  }

  .ai-presence {
    grid-template-columns: 1fr;
    padding: 14px;

    h2 {
      font-size: 18px;
    }
  }

  .ai-orbit {
    width: 58px;
    height: 58px;
  }

  .answer-console {
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .cockpit-state-strip {
    grid-template-columns: 1fr;
  }

  .question-kicker small {
    max-width: 100%;
    white-space: normal;
  }

  .message-card,
  .start-card {
    align-items: flex-start;
  }

  .message-avatar {
    flex-basis: 32px;
    width: 32px;
    height: 32px;
  }

  .console-head,
  .message-head,
  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .tag-row {
    align-items: flex-start;
  }

  .room-statusbar {
    gap: 8px;

    span {
      width: 100%;
      padding-right: 0;
      border-right: 0;
    }
  }
}

// ---- 副本战斗（游戏化增量样式，暗色霓虹） ----
.dungeon-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(124, 92, 252, 0.16);
  color: #b3a1ff;
  border: 1px solid rgba(124, 92, 252, 0.35);
  white-space: nowrap;
}

.dungeon-chip--xp {
  background: rgba(247, 144, 9, 0.14);
  color: #f7b955;
  border-color: rgba(247, 144, 9, 0.35);
}

.ai-persona {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  font-size: 11.5px;
  font-weight: 800;
  color: #9be8c0;
}

.ai-persona__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2fd27d;
  box-shadow: 0 0 8px rgba(47, 210, 125, 0.9);
}

.ai-persona__typing {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  color: rgba(203, 213, 225, 0.75);
  font-weight: 600;

  i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    animation: dungeonTyping 1.2s ease-in-out infinite;
  }

  i:nth-child(2) {
    animation-delay: 0.15s;
  }

  i:nth-child(3) {
    animation-delay: 0.3s;
  }
}

.battle-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.5);
}

.battle-strip__label {
  flex: none;
  font-size: 11.5px;
  font-weight: 800;
  color: #f7b955;
}

.battle-strip__bar {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #17b26a, #a3e635);
    box-shadow: 0 0 10px rgba(163, 230, 53, 0.45);
    transition: width 0.3s ease;
  }
}

.battle-strip__text {
  flex: none;
  font-size: 11.5px;
  font-weight: 800;
  color: #cbd5e1;
}

.battle-strip__xp {
  flex: none;
  font-size: 11.5px;
  font-weight: 800;
  color: #f7b955;
}

.battle-status-card {
  padding: 13px 15px;
  border-radius: 14px;
  border: 1px solid rgba(124, 92, 252, 0.3);
  background: linear-gradient(150deg, rgba(124, 92, 252, 0.14), rgba(2, 6, 23, 0.5));
}

.battle-status-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
  color: #e5edf8;
}

.battle-status-card__lv {
  font-size: 10.5px;
  color: #b3a1ff;
}

.battle-status-card__grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;

  > div {
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(148, 163, 184, 0.08);

    span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: rgba(203, 213, 225, 0.6);
    }

    strong {
      display: block;
      margin-top: 2px;
      font-size: 12.5px;
      color: #f8fafc;
    }
  }
}

.score-card__xp {
  display: inline-flex;
  margin-top: 7px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  background: rgba(247, 144, 9, 0.16);
  color: #f7b955;
  border: 1px solid rgba(247, 144, 9, 0.35);
}

@keyframes dungeonTyping {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
