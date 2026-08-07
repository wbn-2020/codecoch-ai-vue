<template>
  <div class="agent-page page-shell">
    <section class="agent-hero">
      <div>
        <div class="agent-eyebrow">
          <Sparkles :size="16" />
          <span>今日准备</span>
        </div>
        <h1>先推进一件最重要的事</h1>
        <p>{{ plan?.targetJobTitle ? `围绕「${plan.targetJobTitle}」安排今天的准备节奏。` : '今天只聚焦当前优先任务，其余材料按需查看。' }}</p>
      </div>
      <div class="agent-hero__actions">
        <el-date-picker v-model="queryDate" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="loadPage(true)" />
        <el-dropdown trigger="click">
          <el-button text :icon="MoreHorizontal">更多</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="loading" @click="loadPage(true)">
                <RefreshCw :size="15" />
                刷新计划
              </el-dropdown-item>
              <el-dropdown-item :disabled="generating" @click="openGenerateDialog">
                <WandSparkles :size="15" />
                重新生成
              </el-dropdown-item>
              <el-dropdown-item @click="router.push('/agent/tasks')">查看全部任务</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="今日计划加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage(true)">重新加载</el-button>
    </AppState>

    <section v-else class="today-workspace" v-loading="loading">
      <AppState
        v-if="showPlanDataError"
        type="error"
        :title="planDataErrorTitle"
        :description="planDataErrorDescription"
      >
        <el-button type="primary" :loading="loading" @click="loadPage(true)">重新加载</el-button>
        <el-button @click="goAsyncTaskCenter">查看任务进度</el-button>
      </AppState>

      <AppState
        v-else-if="isPlanEmpty"
        type="empty"
        title="今天还没有计划"
        :description="plan?.emptyMessage || emptyPlanRecoveryDescription"
      >
        <el-button type="primary" :loading="generating" @click="openGenerateDialog">生成今日计划</el-button>
        <el-button @click="router.push('/applications')">补充投递</el-button>
      </AppState>

      <AppState
        v-else-if="isAsyncPlanRunning"
        type="api-pending"
        title="今日计划正在生成"
        description="计划已进入处理队列。可以先离开，稍后在任务中心查看进度。"
      >
        <el-button type="primary" @click="goAsyncTaskCenter">查看任务进度</el-button>
        <el-button :loading="loading" @click="loadPage(true)">刷新</el-button>
      </AppState>

      <template v-else>
        <el-alert
          v-if="planStatusMessage"
          class="plan-status-alert"
          :type="planStatusType"
          show-icon
          :closable="false"
          :title="planStatusTitle"
          :description="planStatusMessage"
        />

        <div v-if="showAsyncTaskEntry" class="plan-async-row">
          <div>
            <strong>生成任务已接收</strong>
            <span>计划结果会自动回到这里，也可以前往任务中心继续查看。</span>
          </div>
          <el-button @click="goAsyncTaskCenter">查看进度</el-button>
        </div>

        <div v-if="planFixAction" class="plan-fix-row">
          <el-button type="primary" @click="router.push(planFixAction.path)">{{ planFixAction.label }}</el-button>
          <el-button :loading="generating" @click="openGenerateDialog">重新生成</el-button>
        </div>

        <el-tabs v-model="todaySection" class="today-tabs">
          <el-tab-pane label="今天" name="today">
            <section class="priority-task-panel" aria-labelledby="priority-task-title">
              <div class="priority-task-panel__head">
                <div>
                  <p class="section-kicker">当前优先任务</p>
                  <h2 id="priority-task-title">{{ priorityTask ? displayTaskTitle(priorityTask) : '今天的任务已完成' }}</h2>
                  <p>{{ priorityTask ? displayTaskDescription(priorityTask) : '没有待推进的任务，可以查看今天的完成记录或生成下一轮计划。' }}</p>
                </div>
                <StatusTag v-if="priorityTask" :status="priorityTask.status" :map="taskStatusMap" />
              </div>

              <template v-if="priorityTask">
                <div class="priority-task-panel__meta">
                  <span>{{ taskTypeLabel(priorityTask.taskType) }}</span>
                  <span>{{ priorityTask.estimatedMinutes ?? 0 }} 分钟</span>
                  <span v-if="priorityTask.relatedSkillName">{{ priorityTask.relatedSkillName }}</span>
                </div>
                <details
                  v-if="displayTaskReason(priorityTask) || priorityTask.reviewSummary || taskTrustLabels(priorityTask).length"
                  class="priority-task-panel__details task-detail"
                >
                  <summary>查看任务依据</summary>
                  <p v-if="displayTaskReason(priorityTask)" class="task-reason">{{ displayTaskReason(priorityTask) }}</p>
                  <div v-if="taskTrustLabels(priorityTask).length" class="trust-tags">
                    <span v-for="label in taskTrustLabels(priorityTask)" :key="label">{{ label }}</span>
                  </div>
                  <AgentTaskEvidence :suggestion="buildAgentTaskSuggestion(priorityTask)" @open="goAction" />
                  <div v-if="priorityTask.reviewSummary" class="task-review-summary">
                    <span>{{ priorityTask.reviewSourceLabel || '复盘记录' }}</span>
                    <p>{{ priorityTask.reviewSummary }}</p>
                    <small v-if="priorityTask.reviewNextActions?.length">{{ priorityTask.reviewNextActions[0] }}</small>
                  </div>
                </details>
                <div class="priority-task-panel__action">
                  <el-button
                    type="primary"
                    size="large"
                    :loading="priorityTaskActionLoading"
                    :disabled="isTaskPending(priorityTask)"
                    @click="handlePriorityTaskAction"
                  >
                    {{ priorityTaskActionLabel }}
                  </el-button>
                  <el-dropdown trigger="click">
                    <el-button text :icon="MoreHorizontal">调整任务</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-if="hasAgentTaskActionEntry(priorityTask)" @click="goAction(buildAgentTaskActionPath(priorityTask, '/agent/today'))">打开任务入口</el-dropdown-item>
                        <el-dropdown-item v-if="canManuallyCompleteTask(priorityTask)" :disabled="isTaskPending(priorityTask)" @click="openCompleteDialog(priorityTask)">标记完成</el-dropdown-item>
                        <el-dropdown-item v-if="canManuallySkipTask(priorityTask)" :disabled="isTaskPending(priorityTask)" @click="openSkipDialog(priorityTask)">跳过任务</el-dropdown-item>
                        <el-dropdown-item v-if="canDeferTask(priorityTask)" :disabled="isTaskPending(priorityTask)" @click="openDeferDialog(priorityTask)">推迟任务</el-dropdown-item>
                        <el-dropdown-item v-if="['SKIPPED', 'DEFERRED'].includes(String(priorityTask.status || '').toUpperCase())" :disabled="isTaskPending(priorityTask)" @click="handleRestoreTask(priorityTask)">恢复待办</el-dropdown-item>
                        <el-dropdown-item v-if="priorityTask.reason" :disabled="isTaskPending(priorityTask)" @click="openCoachAction(priorityTask, 'EXPLAIN_RECOMMENDATION')">查看推荐依据</el-dropdown-item>
                        <el-dropdown-item divided :disabled="isTaskPending(priorityTask)" @click="openFeedbackDialog(priorityTask)">提交反馈</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
              <el-button v-else :loading="generating" @click="openGenerateDialog">生成下一轮计划</el-button>
            </section>

            <section class="today-remaining">
              <div class="section-head">
                <div>
                  <p class="section-kicker">今日剩余任务</p>
                  <h2>{{ remainingTasks.length ? `还有 ${remainingTasks.length} 项` : '今天没有其他任务' }}</h2>
                </div>
                <span>{{ todoCount }} 项待推进 · {{ doneCount }} 项已完成</span>
              </div>

              <el-collapse v-if="remainingTasks.length" v-model="expandedTaskIds" class="remaining-task-list">
                <el-collapse-item v-for="task in remainingTasks" :key="task.id" :name="String(task.id)">
                  <template #title>
                    <div class="remaining-task-list__title">
                      <span>{{ displayTaskTitle(task) }}</span>
                      <small>{{ task.estimatedMinutes ?? 0 }} 分钟</small>
                      <StatusTag :status="task.status" :map="taskStatusMap" />
                    </div>
                  </template>
                  <div class="remaining-task-list__body">
                    <p>{{ displayTaskDescription(task) }}</p>
                    <div class="task-meta">
                      <span>{{ taskTypeLabel(task.taskType) }}</span>
                      <span>{{ priorityLabel(task.priority) }}</span>
                      <span v-if="task.relatedSkillName">{{ task.relatedSkillName }}</span>
                    </div>
                    <details v-if="displayTaskReason(task) || task.reviewSummary || taskTrustLabels(task).length" class="task-detail">
                      <summary>查看任务说明</summary>
                      <p v-if="displayTaskReason(task)" class="task-reason">{{ displayTaskReason(task) }}</p>
                      <div v-if="taskTrustLabels(task).length" class="trust-tags">
                        <span v-for="label in taskTrustLabels(task)" :key="label">{{ label }}</span>
                      </div>
                      <AgentTaskEvidence :suggestion="buildAgentTaskSuggestion(task)" @open="goAction" />
                      <div v-if="task.reviewSummary" class="task-review-summary">
                        <span>{{ task.reviewSourceLabel || '复盘记录' }}</span>
                        <p>{{ task.reviewSummary }}</p>
                        <small v-if="task.reviewNextActions?.length">{{ task.reviewNextActions[0] }}</small>
                      </div>
                    </details>
                    <div v-if="isFocusActive(task)" class="focus-session-bar">
                      <div>
                        <span>专注训练中</span>
                        <strong>{{ focusSessionLabel }}</strong>
                        <small>完成专注不会自动修改任务状态。</small>
                      </div>
                      <div class="focus-session-actions">
                        <el-button size="small" @click="finishFocusSession(task)">完成专注</el-button>
                        <el-button size="small" text @click="cancelFocusSession(task)">取消</el-button>
                      </div>
                    </div>
                    <div class="task-actions">
                      <el-button size="small" :disabled="isTaskPending(task)" @click="handleTaskSecondaryAction(task)">
                        {{ getTaskActionLabel(task) }}
                      </el-button>
                      <el-button v-if="canStartFocusSession(task)" size="small" text :disabled="isFocusStartDisabled(task)" @click="startFocusSession(task)">开始专注</el-button>
                      <el-dropdown trigger="click">
                        <el-button size="small" text :icon="MoreHorizontal">更多</el-button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item v-if="hasAgentTaskActionEntry(task)" @click="goAction(buildAgentTaskActionPath(task, '/agent/today'))">打开任务入口</el-dropdown-item>
                            <el-dropdown-item v-if="canManuallyCompleteTask(task)" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">标记完成</el-dropdown-item>
                            <el-dropdown-item v-if="canManuallySkipTask(task)" :disabled="isTaskPending(task)" @click="openSkipDialog(task)">跳过任务</el-dropdown-item>
                            <el-dropdown-item v-if="canDeferTask(task)" :disabled="isTaskPending(task)" @click="openDeferDialog(task)">推迟任务</el-dropdown-item>
                            <el-dropdown-item v-if="['SKIPPED', 'DEFERRED'].includes(String(task.status || '').toUpperCase())" :disabled="isTaskPending(task)" @click="handleRestoreTask(task)">恢复待办</el-dropdown-item>
                            <el-dropdown-item v-if="task.reason" :disabled="isTaskPending(task)" @click="openCoachAction(task, 'EXPLAIN_RECOMMENDATION')">查看推荐依据</el-dropdown-item>
                            <el-dropdown-item v-if="task.status === 'DONE'" :disabled="isTaskPending(task)" @click="openCoachAction(task, 'REVIEW_COMPLETED_TASK')">查看任务复盘</el-dropdown-item>
                            <el-dropdown-item divided :disabled="isTaskPending(task)" @click="openFeedbackDialog(task)">提交反馈</el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </section>
          </el-tab-pane>

          <el-tab-pane label="本周策略" name="strategy">
            <div class="secondary-panel">
              <PlanChangeStatusBanner
                :change-sets="planChangeSets"
                :loading="loading"
                :unavailable="planChangeStatusUnavailable"
                :can-open-review="appConfig.enableV4GrowthPreview"
                @refresh="loadPage(true)"
                @open-review="router.push('/agent/reviews')"
              />
              <div v-if="agentLoopSnapshotVisible" class="agent-loop-snapshot">
                <div>
                  <span>本周训练节奏</span>
                  <strong>{{ agentLoopKeyActionCount }} 个关键动作</strong>
                  <small>{{ agentLoopNextAdjustment }}</small>
                </div>
                <div class="agent-loop-snapshot__facts">
                  <span>{{ agentLoopWeekSummary.done }} 已完成</span>
                  <span>{{ agentLoopWeekSummary.skipped }} 已暂缓</span>
                  <span>{{ agentLoopWeekSummary.active }} 推进中</span>
                  <span v-if="agentLoopLatestReview">{{ agentLoopReviewConfidence }}</span>
                  <span v-if="agentLoopLatestReview">{{ agentLoopLatestReview.fallback ? '规则兜底' : '复盘证据' }}</span>
                </div>
                <div v-if="agentLoopLatestReview" class="agent-loop-snapshot__review" data-latest-review>
                  <span>最近一次每日复盘</span>
                  <strong>{{ agentLoopLatestReview.reviewDate || '复盘日期待确认' }}</strong>
                  <small>{{ agentLoopLatestReview.summary || agentLoopLatestReview.adjustments?.[0] || '复盘摘要待确认' }}</small>
                </div>
                <el-button
                  v-if="appConfig.enableV4GrowthPreview"
                  text
                  @click="router.push('/agent/reviews')"
                >
                  查看复盘
                </el-button>
              </div>

              <div class="agent-week-plan">
                <div class="agent-week-plan__source-row">
                  <el-tag size="small" :type="useBackendWeekPlan ? 'success' : 'warning'" effect="plain">
                    {{ agentWeekPlanDataSourceLabel }}
                  </el-tag>
                  <el-tag v-if="backendWeekPlanUnavailable" size="small" type="warning" effect="plain">复盘调整状态暂不可用</el-tag>
                </div>
                <article v-for="layer in agentWeekPlanLayers" :key="layer.key" class="agent-week-plan__layer">
                  <div class="agent-week-plan__head">
                    <div>
                      <span>{{ layer.title }}</span>
                      <p>{{ layer.description }}</p>
                    </div>
                    <el-tag v-if="layer.fallback" size="small" type="warning" effect="plain">保守建议</el-tag>
                  </div>
                  <ul class="agent-week-plan__actions">
                    <li v-for="action in layer.actions" :key="action.key">
                      <strong>{{ action.title }}</strong>
                      <p>{{ action.description || action.reason }}</p>
                      <small>{{ agentWeekPlanEvidenceText(action) }}</small>
                      <div
                        v-if="weekPlanChangeOriginLabels(action).length"
                        class="agent-week-plan__source"
                      >
                        <span
                          v-for="label in weekPlanChangeOriginLabels(action)"
                          :key="label"
                          class="agent-week-plan__review-origin"
                        >
                          {{ label }}
                        </span>
                      </div>
                      <div class="agent-week-plan__next">
                        <el-button size="small" @click="goAction(agentWeekPlanActionPath(action) || '/agent/today')">查看下一步</el-button>
                        <el-button size="small" text @click="router.push('/agent/tasks')">任务中心</el-button>
                      </div>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="计划依据" name="basis">
            <div class="secondary-panel">
              <div class="section-head">
                <div>
                  <p class="section-kicker">计划说明</p>
                  <h2>{{ plan?.targetJobTitle || '今日计划' }}</h2>
                  <span>{{ plan?.date || queryDate }}</span>
                </div>
                <el-button v-if="plan?.runId" text @click="router.push(`/agent/runs/${plan.runId}`)">查看生成记录</el-button>
              </div>
              <p class="plan-summary">{{ cleanUserText(plan?.summary, '暂无计划摘要，任务列表会优先展示可执行的训练动作。') }}</p>
              <div v-if="focusSkills.length" class="skill-strip">
                <el-tag v-for="skill in focusSkills" :key="skill.code || skill.name" effect="plain">{{ skill.name || skill.code }}</el-tag>
              </div>
              <AppState
                v-if="partialErrors.length"
                class="agent-diagnostic-state"
                type="disabled"
                title="部分计划数据暂未返回"
                :description="partialErrorDescription"
              >
                <el-button :loading="loading" @click="loadPage(true)">重新加载</el-button>
                <el-button @click="goAsyncTaskCenter">查看任务进度</el-button>
              </AppState>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </section>

    <el-dialog
      v-model="generateDialogVisible"
      title="生成今日计划"
      width="460px"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="!generating"
      :before-close="beforeCloseGenerateDialog"
      @closed="resetGenerateDialog"
    >
      <el-form label-position="top">
        <el-form-item label="日期">
          <el-date-picker v-model="generateForm.date" type="date" value-format="YYYY-MM-DD" :clearable="false" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-select
            v-model="generateForm.targetJobId"
            :loading="targetLoading"
            clearable
            filterable
            placeholder="默认使用当前主目标"
            style="width: 100%"
          >
            <el-option
              v-for="target in targets"
              :key="target.id"
              :label="formatTargetOption(target)"
              :value="target.id"
            />
          </el-select>
          <p class="form-hint">{{ currentTargetHint }}</p>
        </el-form-item>
        <el-form-item label="期望任务数">
          <el-input-number v-model="generateForm.taskCount" :min="1" :max="5" controls-position="right" />
        </el-form-item>
        <el-form-item label="最大总耗时">
          <el-input-number v-model="generateForm.maxTotalMinutes" :min="30" :max="240" :step="30" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="generateForm.forceRegenerate">强制重新生成</el-checkbox>
        </el-form-item>
      </el-form>
      <template v-if="showGenerateDialogFooter" #footer>
        <el-button :disabled="generating" @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" :disabled="generating" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogTitle" width="460px">
      <el-input v-model="taskNote" type="textarea" :rows="4" :placeholder="taskDialogPlaceholder" maxlength="200" show-word-limit />
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="selectedTask ? isTaskActionPending(selectedTask, taskDialogMode) : false" @click="submitTaskAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDialogVisible" title="任务反馈" width="460px">
      <el-form label-position="top">
        <el-form-item label="反馈类型">
          <el-select v-model="feedbackForm.feedbackType" style="width: 100%">
            <el-option v-for="item in feedbackTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="feedbackForm.comment" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="feedbackTask ? isTaskActionPending(feedbackTask, 'feedback') : false" @click="submitFeedback">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="completionReviewVisible" title="完成后复盘" width="520px">
      <div class="completion-review">
        <div>
          <span class="review-kicker">刚完成</span>
          <h3>{{ completionReviewTask ? displayTaskTitle(completionReviewTask) : '训练任务' }}</h3>
          <p>{{ completionReviewTask ? displayTaskDescription(completionReviewTask) : '记录这次训练结果，下一轮计划会更好接住反馈。' }}</p>
        </div>
        <ul>
          <li v-for="item in completionReviewItems" :key="item">{{ item }}</li>
        </ul>
        <p class="review-hint">下一步建议：优先点击「{{ completionReviewNextAction.label }}」继续。</p>
        <p v-if="completionReviewNote" class="review-note">备注：{{ completionReviewNote }}</p>
      </div>
      <template #footer>
        <el-button @click="completionReviewVisible = false">稍后再看</el-button>
        <el-button v-if="completionReviewTask" @click="openFeedbackFromReview">补充反馈</el-button>
        <el-button type="primary" @click="goCompletionNextAction">{{ completionReviewNextAction.label }}</el-button>
      </template>
    </el-dialog>

    <AgentCoachActionDialog
      v-model:visible="coachDialogVisible"
      :loading="coachDialogLoading"
      :canceled="coachDialogCanceled"
      :error-message="coachDialogError"
      :task="coachDialogTask"
      :result="coachActionResult"
      @cancel="cancelCoachAction"
      @next-action="goCoachNextAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { MoreHorizontal, RefreshCw, Sparkles, WandSparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  deferAgentTaskApi,
  generateDailyPlanApi,
  getCurrentAgentWeekPlanApi,
  recordAgentMetricEventApi,
  restoreAgentTaskApi,
  skipAgentTaskApi,
  startAgentTaskApi
} from '@/api/agent'
import { getAgentPlanChangeSetsApi } from '@/api/agentPlanChange'
import { submitAiResultFeedbackApi } from '@/api/aiFeedback'
import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import { getAgentReviewsApi, type AgentReviewVO } from '@/api/v4'
import { appConfig } from '@/config'
import AgentCoachActionDialog from '@/components/agent/AgentCoachActionDialog.vue'
import PlanChangeStatusBanner from '@/components/agent-review/PlanChangeStatusBanner.vue'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AgentTaskEvidence from '@/components/job-readiness/AgentTaskEvidence.vue'
import { useAgentCoachAction } from '@/composables/useAgentCoachAction'
import {
  fetchCachedLatestDailyPlan,
  fetchCachedTodayAgentTasks,
  invalidateUserHomeTrainingCaches
} from '@/composables/useUserHomeDataCache'
import { buildAgentLoopOverview } from '@/features/agent-loop/agentLoopAdapter'
import {
  AGENT_TODAY_PLAN_CHANGE_STATUSES,
  getAgentPlanChangeTypeLabel,
  resolveAgentTaskPlanChangeOrigin,
  resolveAgentWeekPlanChangeOrigin
} from '@/features/agent-plan-change'
import { buildAgentWeekPlan } from '@/features/agent-week-plan'
import { buildAgentWeekPlanFromBackend, hasBackendWeekPlanItems } from '@/features/agent-week-plan-backend'
import type {
  AgentPlanActionVO,
  AgentTaskVO,
  AgentTodayTaskVO,
  AgentWeekPlanBackendItemVO,
  AgentWeekPlanBackendVO,
  DailyPlanVO
} from '@/types/agent'
import type {
  AgentPlanChangePreviewVO,
  AgentPlanChangeTaskOriginFields,
  AgentPlanChangeWeekItemOriginFields
} from '@/types/agentPlanChange'
import type { TargetJobVO } from '@/types/jobTarget'
import type { ExplainableSuggestionVO } from '@/types/suggestion'
import { getSuggestionSourceTypeLabel } from '@/types/suggestion'
import {
  buildAgentTaskActionPath,
  formatAgentTaskDeferReason,
  hasAgentTaskActionEntry,
  isAgentJobApplicationTask,
  isEvidenceBoundAgentTask
} from '@/utils/agentTaskAction'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage as normalizeErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import { buildSafeRedirectTarget, sanitizeLocalActionPath } from '@/utils/routeSecurity'
import { fromAgentTask } from '@/utils/suggestionAdapter'
import { resolveAppRoutePath } from '@/features/route-safety'

const router = useRouter()
const route = useRoute()
const today = formatLocalDate()

type AgentTaskWithPlanChangeOrigin = AgentTaskVO & AgentPlanChangeTaskOriginFields
type AgentWeekPlanItemWithReviewOrigin =
  AgentWeekPlanBackendItemVO & AgentPlanChangeWeekItemOriginFields

const loading = ref(false)
const generating = ref(false)
const generateSubmitting = ref(false)
const generateSubmitted = ref(false)
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const queryDate = ref(today)
const loadedPageKey = ref('')
const plan = ref<DailyPlanVO>()
const todayTasks = ref<AgentTodayTaskVO>()
const backendWeekPlan = ref<AgentWeekPlanBackendVO | null>(null)
const backendWeekPlanUnavailable = ref(false)
const agentReviews = ref<AgentReviewVO[]>([])
const planChangeSets = ref<AgentPlanChangePreviewVO[]>([])
const planChangeStatusUnavailable = ref(false)
const currentTargetJobId = ref<number | undefined>()
const targets = ref<TargetJobVO[]>([])
const currentTarget = ref<TargetJobVO | null>(null)
const targetLoading = ref(false)
const targetLoadError = ref('')
const targetScopeResolved = ref(false)
const targetScopeUnavailable = ref(false)
const todaySection = ref<'today' | 'strategy' | 'basis'>('today')
const expandedTaskIds = ref<string[]>([])
const generateDialogVisible = ref(false)
const taskDialogVisible = ref(false)
const taskDialogMode = ref<'complete' | 'skip' | 'defer'>('complete')
const selectedTask = ref<AgentTaskVO>()
const taskNote = ref('')
const feedbackDialogVisible = ref(false)
const feedbackTask = ref<AgentTaskVO>()
const feedbackForm = reactive({
  feedbackType: 'HELPFUL',
  comment: ''
})
const completionReviewVisible = ref(false)
const completionReviewTask = ref<AgentTaskVO>()
const completionReviewNote = ref('')
const {
  coachDialogVisible,
  coachDialogLoading,
  coachDialogError,
  coachDialogCanceled,
  coachDialogTask,
  coachActionResult,
  coachNextActionPath,
  openCoachAction,
  cancelCoachAction,
  trackCoachNextAction
} = useAgentCoachAction('agent_today', '/agent/today')

const generateForm = reactive({
  targetJobId: undefined as number | undefined,
  date: today,
  maxTotalMinutes: 120,
  taskCount: 3,
  forceRegenerate: false
})

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  DEFERRED: '已推迟',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const taskTypeMap: Record<string, string> = {
  QUESTION_PRACTICE: '刷题练习',
  WRONG_QUESTION_REVIEW: '错题复习',
  INTERVIEW: '模拟面试',
  RESUME_OPTIMIZE: '简历优化',
  STUDY_TASK: '学习任务',
  REPORT_REVIEW: '报告复盘',
  SKILL_REVIEW: '技能复习',
  KNOWLEDGE_REVIEW: '知识复盘',
  APPLICATION_FOLLOW_UP: '投递跟进'
}

const taskTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  if (!type) return '未分类'
  return taskTypeMap[type] || '专项训练'
}

const priorityMap: Record<string, string> = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
}

const priorityLabel = (value?: string | null) => {
  const priority = String(value || '').toUpperCase()
  if (!priority) return '无优先级'
  return priorityMap[priority] || '普通优先级'
}

const feedbackTypeOptions = [
  { label: '有帮助', value: 'HELPFUL' },
  { label: '没有帮助', value: 'NOT_HELPFUL' },
  { label: '内容不准确', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '内容不符合实际', value: 'HALLUCINATION' },
  { label: '太难', value: 'TOO_HARD' },
  { label: '太简单', value: 'TOO_EASY' },
  { label: '不相关', value: 'IRRELEVANT' }
]

const emptyPlanRecoveryDescription = [
  '当前还没有可执行动作。',
  '可以先补一条投递记录、做一次模拟面试复盘、补充知识资料，或确认长期记忆后再生成计划。'
].join('')

const dataSourceLabels = {
  plan: '今日计划',
  tasks: '今日任务',
  reviews: '每日复盘'
} as const

const sourceFailed = (label: string) => partialErrors.value.includes(label)

type TaskAction = 'start' | 'complete' | 'skip' | 'defer' | 'restore' | 'feedback'
type FocusMetricCode = 'focus_session_started' | 'focus_session_finished' | 'focus_session_canceled'
interface FocusSessionState {
  taskId: number
  sessionId: string
  startedAt: string
}

const pendingTaskActions = ref<Set<string>>(new Set())
const focusSession = ref<FocusSessionState | null>(null)

const taskDialogTitle = computed(() => {
  if (taskDialogMode.value === 'complete') return '完成任务'
  if (taskDialogMode.value === 'defer') return '推迟任务'
  return '跳过任务'
})

const taskDialogPlaceholder = computed(() => {
  if (taskDialogMode.value === 'complete') return '可填写完成备注'
  if (taskDialogMode.value === 'defer') return '请填写推迟原因'
  return '请填写跳过原因'
})

const taskActionKey = (task: AgentTaskVO, action: TaskAction) => `${task.id}:${action}`
const isTaskActionPending = (task: AgentTaskVO, action: TaskAction) => pendingTaskActions.value.has(taskActionKey(task, action))
const isTaskPending = (task: AgentTaskVO) => Array.from(pendingTaskActions.value).some((key) => key.startsWith(`${task.id}:`))

const setTaskActionPending = (task: AgentTaskVO, action: TaskAction, pending: boolean) => {
  const next = new Set(pendingTaskActions.value)
  const key = taskActionKey(task, action)
  if (pending) {
    next.add(key)
  } else {
    next.delete(key)
  }
  pendingTaskActions.value = next
}

const withTaskPending = async (task: AgentTaskVO, action: TaskAction, handler: () => Promise<void>) => {
  if (isTaskActionPending(task, action)) return
  setTaskActionPending(task, action, true)
  try {
    await handler()
  } finally {
    setTaskActionPending(task, action, false)
  }
}

const focusSkills = computed(() => plan.value?.focusSkills || [])
const taskList = computed(() => todayTasks.value?.tasks?.length ? todayTasks.value.tasks : plan.value?.tasks || [])
const priorityTask = computed(() => {
  const openTasks = taskList.value.filter(isOpenTaskStatus)
  return openTasks.find((task) => String(task.priority || '').toUpperCase() === 'HIGH') ||
    openTasks[0] ||
    taskList.value.find((task) => !taskClosedStatuses.includes(String(task.status || '').toUpperCase())) ||
    null
})
const remainingTasks = computed(() =>
  taskList.value.filter((task) => !priorityTask.value || task.id !== priorityTask.value.id)
)
const focusSessionLabel = computed(() => {
  if (!focusSession.value) return ''
  const startedAt = new Date(focusSession.value.startedAt)
  if (Number.isNaN(startedAt.getTime())) return '刚刚开始'
  return `${startedAt.getHours().toString().padStart(2, '0')}:${startedAt.getMinutes().toString().padStart(2, '0')} 开始`
})
const partialErrorDescription = computed(() =>
  `以下数据暂未返回：${partialErrors.value.join('、')}。页面会继续保留已成功加载的内容；如果你刚完成任务或刚生成计划，请重新加载或到任务中心继续查看。`
)
const hasAsyncReceipt = computed(() => Boolean(plan.value?.asyncMessageId || plan.value?.asyncTraceId || plan.value?.asyncBizType))
const hasRegenerationImpact = computed(() => Boolean(plan.value?.runId || taskList.value.length || hasAsyncReceipt.value))
const planStatus = computed(() => String(plan.value?.status || '').toUpperCase())
const isAsyncPlanRunning = computed(() => planStatus.value === 'RUNNING' && !taskList.value.length)
const showAsyncTaskEntry = computed(() => hasAsyncReceipt.value || isAsyncPlanRunning.value)
const hasPlanDataError = computed(() => sourceFailed(dataSourceLabels.plan) || sourceFailed(dataSourceLabels.tasks))
const showPlanDataError = computed(() => !loading.value && !taskList.value.length && hasPlanDataError.value)
const planDataErrorTitle = computed(() => {
  if (sourceFailed(dataSourceLabels.plan) && sourceFailed(dataSourceLabels.tasks)) return '今日计划和任务加载失败'
  if (sourceFailed(dataSourceLabels.plan)) return '今日计划加载失败'
  return '今日任务加载失败'
})
const planDataErrorDescription = computed(() => {
  if (sourceFailed(dataSourceLabels.plan) && sourceFailed(dataSourceLabels.tasks)) {
    return '计划摘要和任务列表都暂未返回。你可以重新加载，或到任务中心继续查看生成进度。'
  }
  if (sourceFailed(dataSourceLabels.plan)) {
    return '计划摘要暂未返回，但任务列表可能已经生成。请重新加载；如果刚提交生成任务，可以到任务中心继续查看。'
  }
  return '任务列表暂未返回，当前不能判断今天是否真的没有训练任务。请重新加载，或到任务中心查看最近任务。'
})
const isPlanEmpty = computed(() => !loading.value && !hasPlanDataError.value && !taskList.value.length && !isAsyncPlanRunning.value && (plan.value?.empty || !plan.value?.runId))
const showGenerateDialogFooter = computed(() => generateDialogVisible.value && !generateSubmitting.value && !generateSubmitted.value)
const taskListEmptyType = computed(() => sourceFailed(dataSourceLabels.tasks) ? 'error' : 'empty')
const taskListEmptyTitle = computed(() => sourceFailed(dataSourceLabels.tasks) ? '任务列表加载失败' : '当前日期暂无任务')
const taskListEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.tasks)
    ? '任务列表暂未返回，本次不能判断是否真的没有待办。请重新加载，或到任务中心继续查看今天的任务。'
    : emptyPlanRecoveryDescription
)
const agentTodayPagePath = computed(() => buildSafeRedirectTarget(route.path, route.query, '/agent/today'))
const doneCount = computed(() => taskList.value.filter((task) => task.status === 'DONE').length)
const todoCount = computed(() => taskList.value.filter((task) => task.status === 'TODO' || task.status === 'DOING').length)
const estimatedMinutes = computed(() => taskList.value.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0))
const agentLoopOverview = computed(() => buildAgentLoopOverview({
  plan: plan.value,
  todayTasks: taskList.value,
  historyTasks: taskList.value,
  reviews: agentReviews.value
}))
const agentLoopWeekSummary = computed(() => agentLoopOverview.value.weekSummary)
const agentLoopKeyActionCount = computed(() => agentLoopOverview.value.keyActions.length)
const agentLoopNextAdjustment = computed(() => agentLoopOverview.value.nextAdjustmentSummary)
const agentLoopLatestReview = computed(() => agentLoopOverview.value.latestReview)
const agentLoopReviewConfidence = computed(() => {
  const confidence = String(agentLoopLatestReview.value?.confidenceLevel || '').toUpperCase()
  return {
    HIGH: '高置信度',
    MEDIUM: '中等置信度',
    LOW: '低置信度',
    INSUFFICIENT: '证据不足'
  }[confidence] || '置信度待确认'
})
const agentLoopSnapshotVisible = computed(() => Boolean(taskList.value.length || plan.value || agentLoopLatestReview.value))
const useBackendWeekPlan = computed(() => hasBackendWeekPlanItems(backendWeekPlan.value))
const agentWeekPlan = computed(() =>
  useBackendWeekPlan.value && backendWeekPlan.value
    ? buildAgentWeekPlanFromBackend(backendWeekPlan.value)
    : buildAgentWeekPlan({
        plan: plan.value,
        todayTasks: taskList.value,
        historyTasks: taskList.value,
        loopOverview: agentLoopOverview.value
      })
)
const agentWeekPlanDataSourceLabel = computed(() => {
  if (!useBackendWeekPlan.value) return '前端降级计划'
  const version = backendWeekPlan.value?.snapshotVersion ? ` v${backendWeekPlan.value.snapshotVersion}` : ''
  return `后端持久化周计划${version}`
})
const agentWeekPlanLayers = computed(() => [
  agentWeekPlan.value.today,
  agentWeekPlan.value.week,
  agentWeekPlan.value.nextExperiment
])

const agentWeekPlanSourceLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    application: '投递',
    applicationPackage: '投递包',
    interviewReport: '面试报告',
    experimentReview: '实验复盘',
    knowledgeGap: '知识缺口',
    memoryPreference: '长期偏好',
    agentTask: 'Agent 任务',
    agentRun: 'Agent 运行',
    dailyPlan: '每日计划',
    fallback: '降级来源'
  }
  return labels[String(value || '')] || sourceTypeLabel(value)
}

const agentWeekPlanEvidenceText = (action: AgentPlanActionVO) =>
  action.evidence.length ? `证据：${action.evidence.slice(0, 2).join(' / ')}` : '证据：暂无明确证据摘要'
const agentWeekPlanConfidenceLabel = (value?: string | number | null) => {
  const confidence = String(value || '').toUpperCase()
  if (confidence === 'HIGH') return '高可信'
  if (confidence === 'MEDIUM') return '中可信'
  if (confidence === 'LOW') return '低可信'
  if (confidence === 'UNKNOWN') return '待确认'
  if (!confidence) return '待确认'
  return `可信度：${value}`
}
const planChangeReviewRefs = computed(() =>
  agentReviews.value.map((review) => ({
    id: review.id,
    reviewDate: review.reviewDate
  }))
)
const planChangeOriginLabels = (
  origin: ReturnType<typeof resolveAgentTaskPlanChangeOrigin>
) => {
  if (!origin) return []
  const labels = [
    origin.reviewDate ? `来自 ${origin.reviewDate} 每日复盘` : '来自每日复盘',
    '用户已确认',
    `变更类型：${getAgentPlanChangeTypeLabel(origin.changeType)}`
  ]
  return labels
}
const taskPlanChangeOriginLabels = (task: AgentTaskVO) =>
  planChangeOriginLabels(resolveAgentTaskPlanChangeOrigin(
    task as AgentTaskWithPlanChangeOrigin,
    planChangeSets.value,
    planChangeReviewRefs.value
  ))
const backendWeekPlanItemForAction = (action?: AgentPlanActionVO | null) => {
  if (!action || action.id == null) return null
  const actionId = Number(action.id)
  if (!Number.isFinite(actionId)) return null
  return (backendWeekPlan.value?.items || []).find((item) =>
    Number(item.agentTaskId) === actionId
    || (item.agentTaskId == null && Number(item.id) === actionId)
  ) as AgentWeekPlanItemWithReviewOrigin | undefined
}
const weekPlanChangeOriginLabels = (action?: AgentPlanActionVO | null): string[] => {
  const item = backendWeekPlanItemForAction(action)
  if (!item) return []
  const origin = resolveAgentWeekPlanChangeOrigin(
    item,
    planChangeSets.value,
    planChangeReviewRefs.value
  )
  return origin ? planChangeOriginLabels(origin) : []
}
const agentWeekPlanFallbackPath = (action: AgentPlanActionVO) => {
  const sourceType = String(action.sourceType || '').toLowerCase()
  if (sourceType.includes('application')) return '/applications'
  if (sourceType.includes('interview')) return '/interviews/history'
  if (sourceType.includes('knowledge')) return '/knowledge'
  if (sourceType.includes('memory')) return '/agent/memory'
  if (sourceType.includes('daily') || sourceType.includes('agent')) return '/agent/tasks'
  return '/agent/today'
}
const agentWeekPlanActionPath = (action: AgentPlanActionVO) =>
  sanitizeLocalActionPath(action.actionPath || agentWeekPlanFallbackPath(action), '')
const taskClosedStatuses = ['DONE', 'SKIPPED', 'DEFERRED']
const canManuallyCompleteTask = (task: AgentTaskVO) =>
  !isEvidenceBoundAgentTask(task) && !taskClosedStatuses.includes(String(task.status || '').toUpperCase())
const canManuallySkipTask = (task: AgentTaskVO) =>
  ['TODO', 'DOING', 'EXPIRED'].includes(String(task.status || '').toUpperCase())
const canDeferTask = (task: AgentTaskVO) => canManuallySkipTask(task)
const isOpenTaskStatus = (task: AgentTaskVO) => ['DOING', 'TODO'].includes(String(task.status || '').toUpperCase())
const getTaskActionLabel = (task: AgentTaskVO) => {
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') return '开始任务'
  if (status === 'DOING' && isEvidenceBoundAgentTask(task) && hasAgentTaskActionEntry(task)) return '去处理'
  if (status === 'DOING') return '标记完成'
  if (['SKIPPED', 'DEFERRED'].includes(status)) return '恢复待办'
  if (status === 'DONE') return hasAgentTaskActionEntry(task) ? '查看任务' : '已完成'
  return hasAgentTaskActionEntry(task) ? '查看任务' : '标记完成'
}
const priorityTaskActionLabel = computed(() =>
  priorityTask.value ? getTaskActionLabel(priorityTask.value) : '生成下一轮计划'
)
const priorityTaskActionLoading = computed(() => {
  const task = priorityTask.value
  if (!task) return generating.value
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') return isTaskActionPending(task, 'start')
  if (['SKIPPED', 'DEFERRED'].includes(status)) return isTaskActionPending(task, 'restore')
  if (status === 'DOING' && !isEvidenceBoundAgentTask(task)) return isTaskActionPending(task, 'complete')
  return false
})
const planStatusType = computed(() => (planStatus.value === 'FAILED' ? 'error' : planStatus.value === 'RUNNING' ? 'warning' : 'info'))
const planStatusTitle = computed(() => {
  if (planStatus.value === 'RUNNING') return '计划生成中'
  if (planStatus.value === 'FAILED') return '计划生成失败'
  return '计划状态'
})
const planStatusMessage = computed(() => {
  if (planStatus.value === 'RUNNING') {
    return '计划正在生成，可以离开页面；系统会避免重复提交同一天同岗位的生成请求，也可以到任务中心查看进度。'
  }
  if (planStatus.value === 'FAILED') {
    return plan.value?.failureSuggestion ||
      toFriendlyMessage(plan.value?.errorMessage || plan.value?.errorCode, '计划生成失败，请检查目标岗位、简历和能力画像后重试。')
  }
  return ''
})
const planFixAction = computed(() => {
  const action = String(plan.value?.failureAction || '').toUpperCase()
  if (action === 'FIX_TARGET_JOB') {
    return { label: plan.value?.failureActionLabel || '去创建目标岗位', path: '/job-targets' }
  }
  if (action === 'FIX_RESUME') {
    return { label: plan.value?.failureActionLabel || '去完善简历', path: '/resumes' }
  }
  if (action === 'FIX_SKILL_PROFILE') {
    return { label: plan.value?.failureActionLabel || '去生成能力画像', path: '/skill-profile' }
  }
  const value = `${plan.value?.errorCode || ''} ${plan.value?.errorMessage || ''}`.toUpperCase()
  if (value.includes('TARGET_JOB')) {
    return { label: '去创建目标岗位', path: '/job-targets' }
  }
  if (value.includes('RESUME')) {
    return { label: '去完善简历', path: '/resumes' }
  }
  if (value.includes('SKILL_PROFILE')) {
    return { label: '去生成能力画像', path: '/skill-profile' }
  }
  return null
})
const currentTargetHint = computed(() => {
  if (targetLoading.value) return '正在读取岗位目标列表...'
  if (targetLoadError.value) return targetLoadError.value
  if (currentTarget.value) return `不选择时使用当前主目标：${formatTargetOption(currentTarget.value)}`
  if (!targets.value.length) return '还没有岗位目标，系统会尝试使用默认主目标；也可以先去岗位目标页创建。'
  return '不选择时使用当前主目标。'
})
const completionReviewItems = computed(() => {
  const task = completionReviewTask.value
  if (task?.reviewNextActions?.length) {
    return task.reviewNextActions
  }
  const type = String(task?.taskType || '').toUpperCase()
  const skill = task?.relatedSkillName || task?.targetJobTitle || '当前方向'
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) {
    return [
      `回到「${skill}」专项练习，再完成 1 组同方向题目，巩固刚完成的内容。`,
      '把刚才仍不稳定的知识点补进错题或笔记，避免下一轮回答再次卡住。',
      '如果还缺项目语境，先补场景、指标和取舍，再继续下一题。'
    ]
  }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) {
    return [
      `先查看这次「${skill}」里最低分的 1 个点，确认下一轮优先修哪一项。`,
      '把缺少细节支撑的项目经历补成可直接回答的表达，再继续后续训练。',
      '继续做一轮相关题目或下一次模拟面试，验证刚才的调整是否生效。'
    ]
  }
  if (type.includes('RESUME')) {
    return [
      `先检查这次补充的「${skill}」证据，确认它能直接支撑目标岗位要求。`,
      '把仍缺数字、业务场景或职责边界的内容补完整，再进入下一步。',
      '回到简历匹配再跑一轮，确认今天这项修改是否真正提升匹配度。'
    ]
  }
  return [
    '先确认这次任务已经沉淀出可复用的结论、素材或表达。',
    '把仍不确定、无法举例或暂时落不到项目里的点补进反馈里。',
    '继续处理下一项今日任务，保持今天的训练闭环。'
  ]
})
const completionReviewNextAction = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  if (task && hasAgentTaskActionEntry(task)) {
    return {
      label: isAgentJobApplicationTask(task) ? '查看求职进度' : '继续当前任务',
      path: buildAgentTaskActionPath(task, '/agent/today')
    }
  }
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) return { label: '继续专项练习', path: '/questions/practice' }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return { label: '查看面试历史', path: '/interviews/history' }
  if (type.includes('RESUME')) return { label: '查看简历匹配', path: '/resume-match' }
  return { label: '继续今日任务', path: '/agent/today' }
})

const getErrorMessage = (error: unknown) => {
  return normalizeErrorMessage(error, '请求失败，请稍后重试。')
}

const buildAsyncTaskCenterPath = (dailyPlan?: DailyPlanVO) => {
  const query = new URLSearchParams()
  query.set('bizType', dailyPlan?.asyncBizType || 'agent.daily-plan.generate')
  const bizId = dailyPlan?.asyncBizId || (dailyPlan?.runId == null ? '' : String(dailyPlan.runId))
  if (bizId) query.set('bizId', bizId)
  if (dailyPlan?.asyncMessageId) query.set('messageId', dailyPlan.asyncMessageId)
  if (dailyPlan?.asyncTraceId) query.set('traceId', dailyPlan.asyncTraceId)
  return `/agent/tasks?${query.toString()}`
}

const skillFromText = (value?: string) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const cleanUserText = (value?: string | null, fallback = '') => {
  const text = toFriendlyMessage(value || '', '').trim()
  if (!text) return fallback
  if (/^(Calling DeepSeek|Task completed)$/i.test(text)) return fallback
  return text
}

const displayTaskTitle = (task: AgentTaskVO) => {
  const skill = task.relatedSkillName || skillFromText(task.title) || task.targetJobTitle || '目标技能'
  const map: Record<string, string> = {
    QUESTION_PRACTICE: `${skill} 面试题练习`,
    WRONG_QUESTION_REVIEW: `${skill} 错题复习`,
    INTERVIEW: '目标岗位模拟面试',
    RESUME_OPTIMIZE: `${skill} 项目经历优化`,
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 表达素材复盘`
  }
  return map[task.taskType || ''] || cleanUserText(task.title, `训练任务 ${task.id}`)
}

const displayTaskDescription = (task: AgentTaskVO) => {
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚说明目标技能和业务影响。',
    STUDY_TASK: '完成学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '从项目经历、训练记录或面试工具中提取可复用表达。'
  }
  return map[task.taskType || ''] || cleanUserText(task.description, '暂无任务描述')
}

const displayTaskReason = (task: AgentTaskVO) => cleanUserText(task.reason, '')

const getTaskRunId = (task: AgentTaskVO) => task.agentRunId ?? task.runId ?? null
const getTaskPlanDate = (task?: AgentTaskVO) =>
  task?.activationHandoffs?.find((item) => item?.planDate)?.planDate
  || task?.dueDate
  || plan.value?.planDate
  || plan.value?.date
  || queryDate.value
  || undefined

const trackCompletionReviewCtaClick = (targetPath: string) => {
  const task = completionReviewTask.value
  if (!task?.id || !targetPath) return
  void recordAgentMetricEventApi({
    eventCode: 'feedback_cta_clicked',
    taskId: task.id,
    runId: getTaskRunId(task) ?? undefined,
    planDate: getTaskPlanDate(task),
    targetPath,
    sourcePage: 'agent_today'
  }, { silentError: true }).catch(() => undefined)
}

const focusDurationMinutes = () => {
  if (!focusSession.value) return 0
  const started = new Date(focusSession.value.startedAt).getTime()
  if (!Number.isFinite(started)) return 0
  return Math.max(0, Math.round((Date.now() - started) / 60000))
}

const trackFocusSessionMetric = (eventCode: FocusMetricCode, task: AgentTaskVO, extra: Record<string, unknown> = {}) => {
  if (!task?.id) return
  void recordAgentMetricEventApi({
    eventCode,
    taskId: task.id,
    runId: getTaskRunId(task) ?? undefined,
    planDate: getTaskPlanDate(task),
    targetJobId: task.targetJobId,
    sourcePage: 'agent_today',
    bizType: 'agent_task_focus',
    bizId: String(task.id),
    metadata: {
      sessionId: focusSession.value?.sessionId,
      taskType: task.taskType,
      taskStatus: task.status,
      relatedSkillName: task.relatedSkillName,
      estimatedMinutes: task.estimatedMinutes,
      ...extra
    }
  }, { silentError: true }).catch(() => undefined)
}

const canStartFocusSession = (task: AgentTaskVO) => !taskClosedStatuses.includes(String(task.status || '').toUpperCase())
const isFocusActive = (task: AgentTaskVO) => focusSession.value?.taskId === task.id
const isFocusStartDisabled = (task: AgentTaskVO) => Boolean(focusSession.value && !isFocusActive(task)) || isTaskPending(task)

const startFocusSession = (task: AgentTaskVO) => {
  if (focusSession.value) {
    if (isFocusActive(task)) {
      ElMessage.info('这项任务已经在专注训练中')
    } else {
      ElMessage.warning('请先完成或取消当前专注训练')
    }
    return
  }
  focusSession.value = {
    taskId: task.id,
    sessionId: `focus-${task.id}-${Date.now()}`,
    startedAt: new Date().toISOString()
  }
  trackFocusSessionMetric('focus_session_started', task)
  ElMessage.success('专注训练已开始，任务状态不会自动改变')
}

const finishFocusSession = (task: AgentTaskVO) => {
  if (!isFocusActive(task)) return
  trackFocusSessionMetric('focus_session_finished', task, {
    durationMinutes: focusDurationMinutes()
  })
  focusSession.value = null
  ElMessage.success('专注训练已记录；如需完成任务，请再手动点击完成')
}

const cancelFocusSession = (task: AgentTaskVO) => {
  if (!isFocusActive(task)) return
  trackFocusSessionMetric('focus_session_canceled', task, {
    durationMinutes: focusDurationMinutes()
  })
  focusSession.value = null
}

const sourceTypeLabel = (value?: string | null) => getSuggestionSourceTypeLabel(value)

const trustStatusLabel = (value?: string | null, fallback?: boolean | null) => {
  const status = String(value || '').toUpperCase()
  if (fallback || status === 'FALLBACK') return '推荐依据不足'
  if (status === 'VERIFIED') return '来源已记录'
  if (status === 'PARTIAL') return '部分来源待确认'
  return '来源待确认'
}

const taskEvidenceLabels = (task: AgentTaskVO) => {
  const type = String(task.taskType || '').toUpperCase()
  const bizType = String(task.relatedBizType || '').toUpperCase()
  const actionUrl = String(task.actionUrl || '').toLowerCase()
  const labels = new Set<string>()

  if (bizType.includes('MATCH') || actionUrl.includes('resume-match')) labels.add('来自匹配报告')
  if (bizType.includes('RESUME') || type.includes('RESUME') || actionUrl.includes('resume')) labels.add('来自项目经历')
  if (bizType.includes('JOB') || task.targetJobTitle || actionUrl.includes('job-target')) labels.add('来自目标岗位描述')
  if (bizType.includes('APPLICATION') || type.includes('APPLICATION') || actionUrl.includes('applications')) labels.add('来自求职进度')
  if (bizType.includes('QUESTION') || type.includes('QUESTION') || actionUrl.includes('question')) labels.add('来自题库/错题')
  if (bizType.includes('INTERVIEW') || type.includes('INTERVIEW') || type.includes('REPORT') || actionUrl.includes('interview')) {
    labels.add('来自面试反馈')
  }
  if (task.relatedSkillName) labels.add(`聚焦：${task.relatedSkillName}`)

  return Array.from(labels)
}

const taskTrustLabels = (task: AgentTaskVO) => {
  const labels = [`来源：${sourceTypeLabel(task.sourceType || task.relatedBizType || task.taskType)}`]
  if (task.evidenceSummary) {
    labels.push(task.evidenceSummary)
  } else {
    labels.push(...taskEvidenceLabels(task))
    const reason = cleanUserText(task.reason, '')
    labels.push(reason ? '推荐理由已返回' : '推荐依据不足')
  }
  labels.push(trustStatusLabel(task.trustStatus, task.fallback))
  const runId = getTaskRunId(task)
  labels.push(runId ? '计划生成详情可查看' : '状态可追踪')
  return Array.from(new Set(labels))
}

const buildAgentTaskSuggestion = (task: AgentTaskVO): ExplainableSuggestionVO => {
  const actionUrl = sanitizeLocalActionPath(buildAgentTaskActionPath(task, '/agent/today'), '')
  const suggestion = fromAgentTask({
    ...task,
    title: displayTaskTitle(task),
    description: displayTaskDescription(task),
    reason: displayTaskReason(task) || task.evidenceSummary || task.reviewSummary || task.description,
    actionUrl
  })

  return {
    ...suggestion,
    pagePath: agentTodayPagePath.value,
    fallbackReason: suggestion.fallback
      ? '推荐依据不足，已使用降级任务建议。'
      : undefined
  }
}

const formatTargetOption = (target: TargetJobVO) => {
  const title = target.jobTitle || '当前目标岗位'
  const company = target.companyName || '未填写公司'
  const current = target.currentFlag === 1 ? ' · 当前' : ''
  return `${title} · ${company}${current}`
}

const loadJobTargets = async () => {
  if (targetLoading.value) return
  targetLoading.value = true
  targetLoadError.value = ''
  targetScopeResolved.value = false
  targetScopeUnavailable.value = false
  try {
    const [listResult, currentResult] = await Promise.allSettled([
      getJobTargetsApi({ pageNo: 1, pageSize: 50 }),
      getCurrentJobTargetApi()
    ])

    if (listResult.status === 'fulfilled') {
      targets.value = listResult.value || []
    } else {
      targets.value = []
      targetLoadError.value = getErrorMessage(listResult.reason) || '岗位目标列表暂时加载失败，不选择时仍会按当前主目标生成。'
    }

    if (currentResult.status === 'fulfilled') {
      currentTarget.value = currentResult.value
        || targets.value.find((item) => item.currentFlag === 1)
        || null
    } else {
      currentTarget.value = targets.value.find((item) => item.currentFlag === 1) || null
      targetLoadError.value = currentTarget.value
        ? '当前主目标读取失败，已先使用岗位列表中的主目标标记。'
        : (getErrorMessage(currentResult.reason) || '当前主目标暂时无法读取；可以手动选择岗位后生成计划。')
    }
    const resolvedTargetId = currentTarget.value?.id
    if (currentTargetJobId.value == null && typeof resolvedTargetId === 'number' && resolvedTargetId > 0) {
      currentTargetJobId.value = resolvedTargetId
    }
    targetScopeUnavailable.value = !currentTarget.value
      && (listResult.status === 'rejected' || currentResult.status === 'rejected')
  } catch (error) {
    targets.value = []
    currentTarget.value = null
    targetLoadError.value = getErrorMessage(error) || '岗位目标列表暂时加载失败，不选择时仍会按当前主目标生成。'
    targetScopeUnavailable.value = true
  } finally {
    targetLoading.value = false
    targetScopeResolved.value = true
  }
}

const shouldForceRefresh = (force?: unknown) => force === true

const currentPageKey = () => `${queryDate.value}:${currentTargetJobId.value || ''}`

const firstRejectedReason = (...results: PromiseSettledResult<unknown>[]) =>
  results.find((item): item is PromiseRejectedResult => item.status === 'rejected')?.reason

const invalidateCurrentTrainingCaches = () => {
  invalidateUserHomeTrainingCaches(queryDate.value, currentTargetJobId.value)
}

const loadPage = async (force?: unknown) => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  const pageKey = currentPageKey()
  const samePage = loadedPageKey.value === pageKey
  const reviewRequest = !targetScopeResolved.value || targetScopeUnavailable.value
    ? Promise.resolve([] as AgentReviewVO[])
    : getAgentReviewsApi({ targetJobId: currentTargetJobId.value })
  try {
    const [
      planResult,
      taskResult,
      weekPlanResult,
      reviewResult,
      planChangeResult
    ] = await Promise.allSettled([
      fetchCachedLatestDailyPlan(queryDate.value, shouldForceRefresh(force), currentTargetJobId.value),
      fetchCachedTodayAgentTasks(queryDate.value, shouldForceRefresh(force), currentTargetJobId.value),
      getCurrentAgentWeekPlanApi({
        date: queryDate.value,
        targetJobId: currentTargetJobId.value
      }, { silentError: true }),
      reviewRequest,
      getAgentPlanChangeSetsApi({
        targetDate: queryDate.value,
        status: AGENT_TODAY_PLAN_CHANGE_STATUSES
      }, { silentError: true })
    ])
    if (planResult.status === 'fulfilled') {
      plan.value = planResult.value
    } else if (!samePage) {
      plan.value = undefined
    }
    if (taskResult.status === 'fulfilled') {
      todayTasks.value = taskResult.value
    } else if (!samePage) {
      todayTasks.value = undefined
    }
    backendWeekPlan.value = weekPlanResult.status === 'fulfilled' ? weekPlanResult.value : null
    backendWeekPlanUnavailable.value = weekPlanResult.status === 'rejected'
    if (reviewResult.status === 'fulfilled') {
      agentReviews.value = reviewResult.value || []
    } else if (!samePage) {
      agentReviews.value = []
    }
    if (planChangeResult.status === 'fulfilled') {
      planChangeSets.value = planChangeResult.value || []
    } else if (!samePage) {
      planChangeSets.value = []
    }
    planChangeStatusUnavailable.value = planChangeResult.status === 'rejected'
    const failed = [
      planResult.status === 'rejected' ? dataSourceLabels.plan : '',
      taskResult.status === 'rejected' ? dataSourceLabels.tasks : '',
      reviewResult.status === 'rejected' ? dataSourceLabels.reviews : ''
    ].filter(Boolean)
    if (planResult.status === 'rejected' && taskResult.status === 'rejected' && !samePage) {
      errorMessage.value = getErrorMessage(firstRejectedReason(planResult, taskResult))
      return
    }
    partialErrors.value = failed
    if (!failed.length || planResult.status === 'fulfilled' || taskResult.status === 'fulfilled') {
      loadedPageKey.value = pageKey
    }
  } catch (error) {
    if (!samePage) {
      plan.value = undefined
      todayTasks.value = undefined
      agentReviews.value = []
      planChangeSets.value = []
    }
    backendWeekPlan.value = null
    backendWeekPlanUnavailable.value = true
    planChangeStatusUnavailable.value = true
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openGenerateDialog = () => {
  generateSubmitted.value = false
  generateForm.date = queryDate.value
  generateForm.targetJobId = currentTargetJobId.value
  generateDialogVisible.value = true
  if (!targets.value.length) {
    void loadJobTargets()
  }
}

const resetGenerateDialog = () => {
  generateSubmitting.value = false
  generateSubmitted.value = false
  generateForm.date = queryDate.value
  generateForm.targetJobId = currentTargetJobId.value
  generateForm.maxTotalMinutes = 120
  generateForm.taskCount = 3
  generateForm.forceRegenerate = false
}

const closeGenerateDialogAfterSubmit = () => {
  generateSubmitted.value = true
  generateDialogVisible.value = false
}

const beforeCloseGenerateDialog = (done: () => void) => {
  if (generating.value) {
    ElMessage.info('今日计划正在生成，请等待任务提交完成。')
    return
  }
  done()
}

const handleGenerate = async () => {
  if (generating.value) return
  if (generateForm.forceRegenerate && hasRegenerationImpact.value) {
    const confirmed = await confirmDangerActionPreview({
      title: '重新生成今日计划',
      action: '强制重新生成今天的训练计划',
      target: `${generateForm.date} 的今日计划`,
      impact: '会重新提交当天计划生成，当前任务视图会刷新；已记录的任务完成、跳过和反馈会保留，但新计划可能调整任务优先级和入口。',
      rollback: '可回到任务中心查看已有任务状态；如新计划不合适，可以按旧任务记录继续执行或再次生成。',
      audit: '生成详情会保留必要处理线索，便于在任务中心继续查看。',
      tips: ['确认已完成或跳过的任务反馈已经提交。', '确认目标岗位和项目经历是当前要使用的版本。'],
      confirmButtonText: '确认重新生成'
    })
    if (!confirmed) {
      return
    }
  }
  generating.value = true
  generateSubmitting.value = true
  errorMessage.value = ''
  try {
    const idempotencyKey = createOperationIdempotencyKey(`agent-daily-plan-${generateForm.date}-${generateForm.targetJobId || 'default'}`)
    plan.value = await generateDailyPlanApi({
      ...generateForm,
      targetJobId: generateForm.targetJobId || undefined,
      requestId: idempotencyKey,
      idempotencyKey
    })
    currentTargetJobId.value = generateForm.targetJobId || undefined
    queryDate.value = generateForm.date
    closeGenerateDialogAfterSubmit()
    if (showAsyncTaskEntry.value) {
      ElMessage.success(plan.value?.asyncMessageId ? '今日计划已提交，可在任务中心查看进度。' : '今日计划已提交生成')
    } else {
      ElMessage.success('今日计划已生成')
    }
    invalidateCurrentTrainingCaches()
    if (!showAsyncTaskEntry.value) {
      await loadPage(true)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    generateSubmitting.value = false
  } finally {
    generating.value = false
  }
}

const openCompleteDialog = (task: AgentTaskVO) => {
  if (!canManuallyCompleteTask(task)) {
    if (hasAgentTaskActionEntry(task)) {
      ElMessage.info('该任务需要完成对应业务动作后自动核验')
      goAction(buildAgentTaskActionPath(task, '/agent/today'))
      return
    }
    ElMessage.warning('该任务暂不支持手动标记完成')
    return
  }
  selectedTask.value = task
  taskDialogMode.value = 'complete'
  taskNote.value = ''
  taskDialogVisible.value = true
}

const openSkipDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  taskDialogMode.value = 'skip'
  taskNote.value = ''
  taskDialogVisible.value = true
}

const openDeferDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  taskDialogMode.value = 'defer'
  taskNote.value = ''
  taskDialogVisible.value = true
}

const submitTaskAction = async () => {
  const task = selectedTask.value
  if (!task) return
  if ((taskDialogMode.value === 'skip' || taskDialogMode.value === 'defer') && !taskNote.value.trim()) {
    ElMessage.warning(taskDialogMode.value === 'defer' ? '请填写推迟原因' : '请填写跳过原因')
    return
  }
  await withTaskPending(task, taskDialogMode.value, async () => {
    if (taskDialogMode.value === 'complete') {
      const completedTask = await completeAgentTaskApi(task.id, { note: taskNote.value || undefined })
      ElMessage.success('任务已完成')
      completionReviewTask.value = completedTask || task
      completionReviewNote.value = completedTask?.reviewNote || taskNote.value.trim()
      completionReviewVisible.value = true
    } else if (taskDialogMode.value === 'defer') {
      await deferAgentTaskApi(task.id, {
        deferAt: new Date().toISOString(),
        deferReason: formatAgentTaskDeferReason(taskNote.value)
      })
      ElMessage.success('任务已推迟')
    } else {
      await skipAgentTaskApi(task.id, { skipReason: taskNote.value.trim() })
      ElMessage.success('任务已跳过')
    }
    taskDialogVisible.value = false
    invalidateCurrentTrainingCaches()
    await loadPage(true)
  })
}

const handleStartTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'start', async () => {
    const startedTask = await startAgentTaskApi(task.id)
    ElMessage.success('任务已开始')
    invalidateCurrentTrainingCaches()
    goAction(buildAgentTaskActionPath(startedTask || task, '/agent/today'))
  })
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'restore', async () => {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('任务已恢复')
    invalidateCurrentTrainingCaches()
    await loadPage(true)
  })
}

const openFeedbackDialog = (task: AgentTaskVO) => {
  feedbackTask.value = task
  Object.assign(feedbackForm, {
    feedbackType: 'HELPFUL',
    comment: ''
  })
  feedbackDialogVisible.value = true
}

const submitFeedback = async () => {
  const task = feedbackTask.value
  if (!task) return
  await withTaskPending(task, 'feedback', async () => {
    await submitAiResultFeedbackApi({
      scene: 'AGENT_TASK_RECOMMENDATION',
      bizType: 'AGENT_TASK',
      bizId: task.id,
      aiCallLogId: task.aiCallLogId ?? undefined,
      feedbackType: feedbackForm.feedbackType,
      comment: feedbackForm.comment || undefined,
      pagePath: agentTodayPagePath.value
    })
    feedbackDialogVisible.value = false
    ElMessage.success('反馈已提交')
  })
}

const openFeedbackFromReview = () => {
  if (!completionReviewTask.value) return
  completionReviewVisible.value = false
  openFeedbackDialog(completionReviewTask.value)
}

const handleTaskSecondaryAction = async (task: AgentTaskVO) => {
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') {
    await handleStartTask(task)
    return
  }
  if (status === 'DOING') {
    if (isEvidenceBoundAgentTask(task) && hasAgentTaskActionEntry(task)) {
      goAction(buildAgentTaskActionPath(task, '/agent/today'))
      return
    }
    openCompleteDialog(task)
    return
  }
  if (['SKIPPED', 'DEFERRED'].includes(status)) {
    await handleRestoreTask(task)
    return
  }
  if (hasAgentTaskActionEntry(task)) {
    goAction(buildAgentTaskActionPath(task, '/agent/today'))
    return
  }
  router.push('/agent/tasks')
}

const handlePriorityTaskAction = async () => {
  if (!priorityTask.value) {
    openGenerateDialog()
    return
  }
  await handleTaskSecondaryAction(priorityTask.value)
}

const goCompletionNextAction = () => {
  const targetPath = completionReviewNextAction.value.path
  trackCompletionReviewCtaClick(targetPath)
  completionReviewVisible.value = false
  goAction(targetPath)
}

const goCoachNextAction = () => {
  trackCoachNextAction()
  coachDialogVisible.value = false
  goAction(coachNextActionPath.value)
}

const goAsyncTaskCenter = () => {
  router.push(buildAsyncTaskCenterPath(plan.value))
}

const goAction = (actionUrl: string) => {
  const safePath = sanitizeLocalActionPath(actionUrl)
  if (!safePath) {
    ElMessage.warning('任务链接暂不支持跳转到站外地址')
    return
  }
  const resolved = resolveAppRoutePath(safePath, { fallbackPath: '/agent/today' })
  if (resolved.unavailableReason) ElMessage.info(resolved.unavailableReason)
  router.push(resolved.path)
}

onMounted(() => {
  void loadJobTargets().then(() => loadPage(false))
})
</script>

<style scoped lang="scss">
.agent-page {
  display: grid;
  gap: 18px;
  color: var(--user-text);
}

.agent-hero,
.section-head,
.task-title-row,
.agent-hero__actions {
  display: flex;
  gap: 16px;
}

.agent-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 18px 20px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.agent-eyebrow,
.agent-hero__actions,
.task-meta,
.trust-tags,
.task-actions,
.skill-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.agent-eyebrow {
  color: var(--user-primary);
  font-size: 13px;
  font-weight: 700;
}

.task-review-summary {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);
  color: #1e3a8a;
}

.task-review-summary span {
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.task-review-summary p,
.task-review-summary small {
  display: block;
  margin: 4px 0 0;
  line-height: 1.55;
}

.focus-session-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: var(--user-success-soft);
}

.focus-session-bar div:first-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.focus-session-bar span {
  color: #15803d;
  font-size: 12px;
  font-weight: 800;
}

.focus-session-bar strong {
  color: #14532d;
  font-size: 14px;
}

.focus-session-bar small {
  color: var(--user-text-muted);
  line-height: 1.5;
}

.focus-session-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.agent-hero h1,
.section-head h2,
.agent-task-card h3 {
  margin: 0;
}

.agent-hero h1 {
  margin-top: 10px;
  color: var(--user-text);
  font-size: 26px;
  line-height: 1.18;
  letter-spacing: 0;
}

.agent-hero p,
.section-head span,
.plan-summary,
.agent-task-card p {
  color: var(--user-text-muted);
  line-height: 1.7;
}

.agent-hero p {
  max-width: 720px;
}

.agent-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.mobile-task-rail {
  display: none;
}

.agent-diagnostic-state {
  border-color: #fde68a;
  background: var(--user-warning-soft);
  box-shadow: none;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.agent-metric,
.agent-task-card {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.agent-metric {
  display: grid;
  gap: 7px;
  min-height: 88px;
  padding: 12px 14px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;

  &:last-child {
    border-right: 0;
  }
}

.agent-metric span,
.section-kicker {
  color: var(--user-text-muted);
  font-size: 13px;
}

.agent-metric strong {
  display: block;
  color: var(--user-text);
  font-size: 24px;
  line-height: 1.1;
}

.agent-metric small {
  margin-top: auto;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.agent-plan-card {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.content-card__body {
  padding: 16px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  color: var(--user-primary);
  font-weight: 800;
}

.plan-panel {
  min-height: 220px;
}

.plan-status-alert {
  margin-bottom: 16px;
}

.plan-async-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);
}

.plan-fix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.plan-async-row div {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: #1e3a8a;
    font-size: 14px;
  }

  span {
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }
}

.plan-summary {
  margin: 18px 0 0;
  padding: 14px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.skill-strip {
  margin-top: 14px;
}

.agent-loop-snapshot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.agent-loop-snapshot span,
.agent-loop-snapshot small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.agent-loop-snapshot strong {
  display: block;
  margin: 4px 0;
  color: var(--app-text);
  font-size: 16px;
}

.agent-loop-snapshot__review {
  display: block;
  margin-top: 4px;
}

.agent-loop-snapshot__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.agent-loop-snapshot__facts span {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--user-border);
  color: var(--user-text-secondary);
}

.agent-week-plan {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.agent-week-plan__source-row {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.agent-week-plan__layer {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.agent-week-plan__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.agent-week-plan__head span {
  color: var(--user-text);
  font-weight: 800;
}

.agent-week-plan__head p,
.agent-week-plan__actions p,
.agent-week-plan__actions small {
  margin: 4px 0 0;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.agent-week-plan__actions {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-week-plan__actions li {
  min-width: 0;
  padding-top: 10px;
  border-top: 1px solid var(--user-border);
}

.agent-week-plan__action-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.agent-week-plan__action-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.agent-week-plan__action-title strong {
  color: var(--user-text);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}

.agent-week-plan__source {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.agent-week-plan__source span {
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 12px;
  word-break: break-word;
}

.agent-week-plan__source span.agent-week-plan__review-origin {
  background: var(--user-success-soft);
  color: var(--user-success);
  font-weight: 700;
}

.agent-week-plan__next {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.task-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.agent-task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  padding: 16px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    border-color: var(--user-primary-border);
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
  }
}

.task-title-row {
  align-items: flex-start;
  justify-content: space-between;
}

.agent-task-card h3 {
  color: var(--user-text);
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
}

.task-meta span {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--user-border);
  color: var(--user-text-muted);
  font-size: 12px;
}

.trust-tags {
  margin-top: 10px;

  span {
    padding: 3px 8px;
    border: 1px solid var(--user-primary-border);
    border-radius: 999px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
  }
}

.task-plan-change-origin {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
}

.task-plan-change-origin > span {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--user-success-soft);
  color: var(--user-success);
  font-size: 12px;
  font-weight: 800;
}

.task-plan-change-origin small {
  color: var(--user-text-muted);
  font-size: 12px;
}

.task-reason {
  margin-bottom: 0;
  padding: 10px 12px;
  border-left: 3px solid var(--user-primary);
  border-radius: 6px;
  background: var(--user-primary-soft);
}

.task-actions {
  align-content: flex-start;
  justify-content: flex-end;
}

.task-more-button {
  padding-inline: 6px;
}

.form-hint {
  margin: 6px 0 0;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.completion-review {
  display: grid;
  gap: 14px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    margin-top: 6px;
    color: var(--user-text);
    font-size: 18px;
    line-height: 1.45;
  }

  p,
  li {
    color: var(--user-text-muted);
    line-height: 1.7;
  }

  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 18px;
  }
}

.review-kicker {
  color: var(--user-primary);
  font-size: 13px;
  font-weight: 800;
}

.review-hint {
  font-weight: 600;
}

.review-note {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--user-surface-muted);
}

@media (max-width: 900px) {
  .agent-hero,
  .section-head,
  .agent-loop-snapshot,
  .agent-week-plan,
  .agent-task-card {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .agent-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .agent-page {
    gap: 12px;
  }

  .agent-hero {
    padding: 18px;
  }

  .agent-hero h1 {
    font-size: 25px;
  }

  .agent-hero p {
    display: none;
  }

  .agent-hero__actions,
  .agent-hero__actions :deep(.el-button),
  .agent-hero__actions :deep(.el-date-editor) {
    width: 100%;
  }

  .mobile-task-rail {
    position: sticky;
    top: 10px;
    z-index: 6;
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-surface-raised);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
  }

  .mobile-task-rail__main {
    display: grid;
    gap: 3px;
    min-width: 0;

    span {
      color: var(--user-primary);
      font-size: 12px;
      font-weight: 800;
    }

    strong {
      overflow: hidden;
      color: var(--user-text);
      font-size: 15px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      color: var(--user-text-muted);
      font-size: 12px;
      line-height: 1.4;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mobile-task-rail__actions {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 8px;

    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
      padding-inline: 8px;
    }
  }

  .agent-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-metric {
    min-height: 112px;
  }

  .content-card__body,
  .agent-task-card {
    padding: 14px;
  }
}

.agent-page {
  gap: 16px;
}

.agent-hero {
  padding: 20px;
  border-color: var(--arena-border, var(--user-border));
  background: var(--arena-surface, var(--user-surface));
}

.agent-hero h1 {
  font-size: 24px;
}

.today-workspace {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--arena-border, var(--user-border));
  border-radius: 8px;
  background: var(--arena-surface, var(--user-surface));
}

.today-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.today-tabs :deep(.el-tabs__nav-wrap::after) {
  background: var(--arena-border, var(--user-border));
}

.today-tabs :deep(.el-tabs__item) {
  height: 36px;
  color: var(--arena-text-muted, var(--user-text-muted));
}

.today-tabs :deep(.el-tabs__item.is-active) {
  color: var(--arena-primary, var(--user-primary));
  font-weight: 700;
}

.today-tabs :deep(.el-tabs__active-bar) {
  background: var(--arena-primary, var(--user-primary));
}

.priority-task-panel,
.today-remaining,
.secondary-panel {
  min-width: 0;
}

.priority-task-panel {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--arena-primary-border, var(--user-primary-border));
  border-radius: 8px;
  background: var(--arena-primary-soft, var(--user-primary-soft));
}

.priority-task-panel__head,
.priority-task-panel__action,
.section-head,
.plan-async-row,
.focus-session-bar,
.agent-loop-snapshot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.priority-task-panel__head > div,
.section-head > div,
.plan-async-row > div,
.agent-loop-snapshot > div {
  min-width: 0;
}

.priority-task-panel h2,
.section-head h2 {
  margin: 0;
  color: var(--arena-text, var(--user-text));
  font-size: 20px;
  line-height: 1.4;
}

.priority-task-panel__head p:not(.section-kicker),
.section-head > span {
  margin: 7px 0 0;
  color: var(--arena-text-muted, var(--user-text-muted));
  font-size: 14px;
  line-height: 1.65;
}

.priority-task-panel__meta,
.task-meta,
.trust-tags,
.skill-strip,
.agent-loop-snapshot__facts,
.task-actions,
.focus-session-actions,
.agent-week-plan__next {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.priority-task-panel__meta span,
.task-meta span,
.trust-tags span,
.agent-loop-snapshot__facts span {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--arena-surface-muted, var(--user-surface-muted));
  color: var(--arena-text-secondary, var(--user-text-secondary));
  font-size: 12px;
  line-height: 1.35;
}

.priority-task-panel__action {
  align-items: center;
}

.today-remaining {
  margin-top: 28px;
}

.section-head {
  align-items: flex-end;
  margin-bottom: 12px;
}

.section-kicker {
  margin: 0 0 5px;
  color: var(--arena-primary, var(--user-primary));
  font-size: 12px;
  font-weight: 800;
}

.remaining-task-list {
  border-top: 1px solid var(--arena-border, var(--user-border));
}

.remaining-task-list :deep(.el-collapse-item__header),
.remaining-task-list :deep(.el-collapse-item__wrap) {
  height: auto;
  min-height: 58px;
  border-color: var(--arena-border, var(--user-border));
  background: transparent;
}

.remaining-task-list :deep(.el-collapse-item__content) {
  padding-bottom: 18px;
}

.remaining-task-list__title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  width: calc(100% - 24px);
  gap: 10px;
}

.remaining-task-list__title > span {
  overflow: hidden;
  color: var(--arena-text, var(--user-text));
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remaining-task-list__title small,
.remaining-task-list__body > p,
.task-detail summary,
.task-detail > p,
.task-review-summary p,
.task-review-summary small,
.focus-session-bar small {
  color: var(--arena-text-muted, var(--user-text-muted));
  font-size: 13px;
  line-height: 1.65;
}

.remaining-task-list__body {
  display: grid;
  gap: 12px;
}

.remaining-task-list__body > p {
  margin: 0;
}

.task-detail {
  padding: 12px;
  border: 1px solid var(--arena-border, var(--user-border));
  border-radius: 8px;
  background: var(--arena-surface-muted, var(--user-surface-muted));
}

.task-detail summary {
  color: var(--arena-text-secondary, var(--user-text-secondary));
  font-weight: 700;
  cursor: pointer;
}

.task-reason,
.task-review-summary,
.focus-session-bar {
  border: 1px solid var(--arena-border, var(--user-border));
  border-radius: 8px;
  background: var(--arena-surface, var(--user-surface));
}

.task-reason {
  margin: 12px 0 0;
  padding: 10px 12px;
  color: var(--arena-text-secondary, var(--user-text-secondary));
  line-height: 1.65;
}

.task-review-summary {
  margin-top: 12px;
  color: var(--arena-text-secondary, var(--user-text-secondary));
}

.task-review-summary span,
.focus-session-bar span,
.focus-session-bar strong {
  color: var(--arena-text, var(--user-text));
}

.focus-session-bar {
  margin-top: 0;
  padding: 12px;
}

.secondary-panel {
  display: grid;
  gap: 18px;
}

.agent-loop-snapshot {
  padding: 16px;
  border: 1px solid var(--arena-border, var(--user-border));
  border-radius: 8px;
  background: var(--arena-surface-muted, var(--user-surface-muted));
}

.agent-loop-snapshot strong {
  color: var(--arena-text, var(--user-text));
}

.agent-week-plan {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.agent-week-plan__layer {
  background: var(--arena-surface, var(--user-surface));
}

.agent-week-plan__actions li {
  display: grid;
  gap: 6px;
}

.agent-week-plan__actions li strong {
  color: var(--arena-text, var(--user-text));
}

.agent-week-plan__actions li p,
.agent-week-plan__actions li small {
  color: var(--arena-text-muted, var(--user-text-muted));
}

.plan-summary {
  border-color: var(--arena-border, var(--user-border));
  background: var(--arena-surface-muted, var(--user-surface-muted));
}

.agent-diagnostic-state {
  margin-top: 4px;
  border-color: var(--arena-warning-border, var(--user-border));
  background: var(--arena-warning-soft, var(--user-surface-muted));
}

@media (max-width: 760px) {
  .today-workspace {
    padding: 16px;
  }

  .priority-task-panel,
  .priority-task-panel__head,
  .priority-task-panel__action,
  .section-head,
  .plan-async-row,
  .agent-loop-snapshot {
    flex-direction: column;
  }

  .priority-task-panel__action :deep(.el-button--large) {
    width: 100%;
  }

  .remaining-task-list__title {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .remaining-task-list__title :deep(.el-tag) {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .agent-week-plan {
    grid-template-columns: 1fr;
  }
}
</style>
