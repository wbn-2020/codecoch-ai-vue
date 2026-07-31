<template>
  <div class="agent-task-page page-shell">
    <section class="task-hero">
      <div>
        <div class="task-eyebrow">
          <ListChecks :size="16" />
          处理进度中心
        </div>
        <h1>把长耗时生成和训练任务整理成可恢复行动</h1>
        <p>集中回看智能教练任务、运行详情和各 AI 能力入口；生成中、失败或稍后继续的任务，先从这里查看进度、失败原因和下一步处理建议。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/agent/today')">
          <CalendarDays :size="16" />
          今日计划
        </el-button>
        <el-button type="primary" :loading="loading" @click="fetchTasks">
          <RefreshCw :size="16" />
          刷新任务
        </el-button>
      </div>
    </section>

    <section class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.desc }}</p>
      </article>
    </section>

    <section class="recovery-panel">
      <div class="recovery-panel__copy">
        <span>长任务恢复入口</span>
        <strong>岗位分析、简历匹配、今日计划、推荐题和面试报告先统一回到这里接续</strong>
        <p>
          系统会尽量保留进度、失败原因和下一步入口；离开原页面后，也可以回到这里继续查看、复制处理线索或回到相关页面处理。
        </p>
      </div>
      <div class="recovery-links">
        <button v-for="item in recoveryLinks" :key="item.path" type="button" class="recovery-link" @click="goRecovery(item.path)">
          <component :is="item.icon" :size="18" />
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.desc }}</small>
          </span>
        </button>
      </div>
    </section>

    <section class="async-task-panel">
      <div class="async-task-panel__head">
        <div>
          <span>处理进度</span>
          <strong>岗位分析、简历解析、匹配报告、今日计划、推荐题和面试报告的处理进度</strong>
          <p>长耗时任务会保留进度、关联页面和必要处理线索，离开原页面后也能继续查看。</p>
        </div>
        <div class="async-task-actions">
          <el-select v-model="asyncQuery.bizType" clearable filterable placeholder="关联功能" @change="handleAsyncSearch">
            <el-option v-for="item in asyncBizTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="asyncQuery.status" clearable placeholder="状态" @change="handleAsyncSearch">
            <el-option v-for="item in asyncStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input
            v-model.trim="asyncDiagnosticKeyword"
            clearable
            placeholder="处理记录 / 处理线索 / 关联记录"
            @clear="handleAsyncDiagnosticClear"
            @keyup.enter="handleAsyncSearch"
          />
          <el-button :loading="asyncLoading" @click="fetchAsyncTasks">
            <RefreshCw :size="16" />
            刷新
          </el-button>
        </div>
        <div v-if="asyncActiveFilterItems.length" class="async-active-filters">
          <span>当前筛选</span>
          <el-tag v-for="item in asyncActiveFilterItems" :key="item.key" type="info" effect="plain">
            {{ item.label }}：{{ item.value }}
          </el-tag>
          <el-button text type="primary" @click="handleAsyncReset">清空</el-button>
        </div>
      </div>

      <AppState v-if="asyncErrorMessage" type="error" title="处理进度加载失败" :description="asyncErrorMessage">
        <el-button type="primary" @click="fetchAsyncTasks">重试</el-button>
      </AppState>

      <div v-else v-loading="asyncLoading" class="async-task-list">
        <AppState
          v-if="!asyncTasks.length && !asyncLoading"
          type="empty"
          title="暂无处理进度"
          description="提交岗位分析、简历解析、匹配报告、今日计划或推荐题生成后，可以在这里查看处理进度。"
        >
          <el-button @click="handleAsyncReset">清空筛选</el-button>
        </AppState>

        <article v-for="task in asyncTasks" :key="task.id" class="async-task-card" :class="`is-${normalizeStatus(task.status).toLowerCase()}`">
          <div>
            <div class="async-task-card__head">
              <span>{{ formatTaskDate(task.createdAt) }}</span>
              <StatusTag :status="task.status || 'PENDING'" :map="asyncStatusMap" />
            </div>
            <h3>{{ getAsyncBizLabel(task.bizType) }}处理记录</h3>
            <p class="task-recovery-hint">{{ asyncTaskRecoveryHint(task) }}</p>
            <div class="task-diagnostics">
              <span>处理记录已保存</span>
              <span v-if="task.messageId">处理进度已提交</span>
              <span v-if="task.traceId">处理线索已记录</span>
              <span>{{ getAsyncBizLabel(task.bizType) }}已关联</span>
              <span v-if="task.retryCount != null">重试 {{ task.retryCount }} / {{ task.maxRetry ?? '-' }}</span>
            </div>
            <p v-if="task.failureReason" class="task-failure">失败原因：{{ toFriendlyMessage(task.failureReason, '任务失败原因尚未透出') }}</p>
          </div>
          <div class="async-task-card__actions">
            <el-button v-if="getAsyncTaskEntry(task)" @click="goAction(getAsyncTaskEntry(task) || '')">回到相关页面</el-button>
            <el-button :loading="isAsyncDetailPending(task.id)" @click="openAsyncTaskDetail(task)">查看详情</el-button>
            <el-button text :disabled="!task.traceId" @click="copyTrace(task.traceId)">复制处理线索</el-button>
          </div>
        </article>
      </div>
    </section>

    <section class="task-panel">
      <div class="filter-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          unlink-panels
          @change="handleSearch"
        />
        <el-select v-model="query.taskType" clearable placeholder="任务类型" @change="handleSearch">
          <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="query.status" clearable placeholder="任务状态" @change="handleSearch">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="query.priority" clearable placeholder="优先级" @change="handleSearch">
          <el-option v-for="item in priorityOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="sourceFilter" clearable placeholder="来源" @change="handleExperienceFilterChange">
          <el-option v-for="item in sourceFilterOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="trustFilter" clearable placeholder="可信度" @change="handleExperienceFilterChange">
          <el-option v-for="item in trustFilterOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button :loading="loading" @click="fetchTasks">
          <Search :size="16" />
          查询
        </el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <AppState v-if="errorMessage" type="error" title="任务列表加载失败" :description="errorMessage">
        <el-button type="primary" @click="fetchTasks">重试</el-button>
      </AppState>

      <div v-else v-loading="loading" class="task-stream">
        <AppState
          v-if="!visibleTasks.length && !loading"
          type="empty"
          :title="taskEmptyTitle"
          :description="taskEmptyDescription"
        >
          <el-button type="primary" @click="router.push('/agent/today')">去生成今日计划</el-button>
          <el-button @click="handleReset">清空筛选</el-button>
          <el-button @click="router.push('/applications')">补投递</el-button>
          <el-button @click="router.push('/interviews/create')">做面试复盘</el-button>
          <el-button @click="router.push('/knowledge')">补知识资料</el-button>
          <el-button @click="router.push('/agent/memory')">确认记忆</el-button>
        </AppState>

        <article v-for="task in visibleTasks" :key="task.id" class="task-card" :class="`is-${normalizeStatus(task.status).toLowerCase()}`">
          <div class="task-card__main">
            <div class="task-card__head">
              <div>
                <span class="task-date">{{ formatTaskDate(task.dueDate || task.createdAt) }}</span>
                <h2>{{ displayTaskTitle(task) }}</h2>
              </div>
              <StatusTag :status="task.status" :map="statusMap" />
            </div>

            <p class="task-desc">{{ displayTaskDescription(task) }}</p>

            <div class="task-meta">
              <span>
                <Layers :size="14" />
                {{ getTaskTypeLabel(task.taskType) }}
              </span>
              <span>
                <Flag :size="14" />
                {{ getPriorityLabel(task.priority) }}
              </span>
              <span>
                <Clock3 :size="14" />
                {{ task.estimatedMinutes ?? 0 }} 分钟
              </span>
              <span v-if="task.targetJobTitle">
                <BriefcaseBusiness :size="14" />
                {{ task.targetJobTitle }}
              </span>
              <span v-if="task.relatedSkillName">
                <BadgeCheck :size="14" />
                {{ task.relatedSkillName }}
              </span>
              <span v-if="getTaskRunId(task)">
                <Activity :size="14" />
                计划记录可查看
              </span>
              <span v-if="task.relatedBizType || task.relatedBizId">
                <Link2 :size="14" />
                {{ taskTraceText(task) }}
              </span>
            </div>

            <div class="task-diagnostics">
              <span v-for="item in taskDiagnosticItems(task)" :key="item">{{ item }}</span>
              <span v-for="item in agentLoopDiagnosticItems(task)" :key="item">{{ item }}</span>
            </div>

            <p v-if="displayTaskReason(task)" class="task-reason">{{ displayTaskReason(task) }}</p>
            <div v-if="task.reviewSummary" class="task-review-summary">
              <span>{{ task.reviewSourceLabel || '复盘记录' }}</span>
              <p>{{ task.reviewSummary }}</p>
              <small v-if="task.reviewNextActions?.length">{{ task.reviewNextActions[0] }}</small>
            </div>
            <p v-if="taskFailureText(task)" class="task-failure">{{ taskFailureText(task) }}</p>
            <p v-if="(task.skipReason && normalizeStatus(task.status) === 'SKIPPED') || isDeferredAgentTask(task)" class="task-skip-reason">{{ taskSkipReasonText(task) }}</p>
            <p v-if="taskFeedbackSummaryText(task)" class="task-feedback-summary">{{ taskFeedbackSummaryText(task) }}</p>
            <p v-if="taskNextPlanImpactText(task)" class="task-plan-impact">{{ taskNextPlanImpactText(task) }}</p>
          </div>

          <aside class="task-card__side">
            <div class="task-progress">
              <span>{{ statusActionHint(task) }}</span>
              <strong>{{ statusMainText(task) }}</strong>
            </div>

            <div class="task-actions">
              <el-button
                v-if="normalizeStatus(task.status) === 'TODO'"
                type="primary"
                :loading="isTaskActionPending(task, 'start')"
                :disabled="isTaskPending(task)"
                @click="handleStartTask(task)"
              >
                开始
              </el-button>
              <el-button
                v-else-if="normalizeStatus(task.status) === 'DOING' && canManuallyCloseTask(task)"
                type="success"
                :disabled="isTaskPending(task)"
                @click="openCompleteDialog(task)"
              >
                完成
              </el-button>
              <el-button
                v-else-if="normalizeStatus(task.status) === 'DOING' && hasAgentTaskActionEntry(task)"
                type="primary"
                :disabled="isTaskPending(task)"
                @click="openTaskPrimaryEntry(task)"
              >
                去处理
              </el-button>
              <el-button
                v-else-if="['SKIPPED', 'DEFERRED'].includes(normalizeStatus(task.status))"
                type="warning"
                :loading="isTaskActionPending(task, 'restore')"
                :disabled="isTaskPending(task)"
                @click="handleRestoreTask(task)"
              >
                恢复
              </el-button>
              <el-button v-else-if="normalizeStatus(task.status) === 'DONE'" disabled>已完成</el-button>
              <el-button
                v-else-if="['PENDING', 'RUNNING'].includes(normalizeStatus(task.status))"
                :disabled="!hasRecoverableEntry(task)"
                @click="openTaskPrimaryEntry(task)"
              >
                查看进度
              </el-button>
              <el-button
                v-else-if="normalizeStatus(task.status) === 'FAILED'"
                type="danger"
                :disabled="!hasRecoverableEntry(task)"
                @click="openTaskPrimaryEntry(task)"
              >
                查看失败
              </el-button>
              <el-button
                v-else-if="normalizeStatus(task.status) === 'SUCCESS'"
                type="primary"
                :disabled="!hasRecoverableEntry(task)"
                @click="openTaskPrimaryEntry(task)"
              >
                查看结果
              </el-button>
              <el-button v-else-if="canManuallyCloseTask(task)" type="success" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">标记完成</el-button>
              <el-button v-else :disabled="!hasRecoverableEntry(task)" @click="openTaskPrimaryEntry(task)">查看任务</el-button>
              <div v-if="isFocusActive(task)" class="focus-session-bar">
                <div>
                  <span>专注训练中</span>
                  <strong>{{ focusSessionLabel }}</strong>
                  <small>完成专注只记录训练事件，不会自动修改任务状态。</small>
                </div>
                <div class="focus-session-actions">
                  <el-button size="small" type="success" plain @click="finishFocusSession(task)">完成专注</el-button>
                  <el-button size="small" text @click="cancelFocusSession(task)">取消</el-button>
                </div>
              </div>
              <el-button
                v-if="canStartFocusSession(task)"
                plain
                :disabled="isFocusStartDisabled(task)"
                @click="startFocusSession(task)"
              >
                专注
              </el-button>

              <el-dropdown trigger="click">
                <el-button class="more-button" :icon="MoreHorizontal" :disabled="isTaskPending(task)">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="hasAgentTaskActionEntry(task)" @click="goAction(buildAgentTaskActionPath(task))">打开任务入口</el-dropdown-item>
                    <el-dropdown-item v-if="getTaskRunId(task)" @click="openRunDetail(task)">查看生成详情</el-dropdown-item>
                    <el-dropdown-item v-if="canManuallyCloseTask(task)" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">标记完成</el-dropdown-item>
                    <el-dropdown-item
                      v-if="canManuallySkipTask(task)"
                      :disabled="isTaskPending(task)"
                      @click="openSkipDialog(task)"
                    >
                      跳过任务
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canDeferTask(task)"
                      :disabled="isTaskPending(task)"
                      @click="openDeferDialog(task)"
                    >
                      推迟到下一轮
                    </el-dropdown-item>
                    <el-dropdown-item v-if="['SKIPPED', 'DEFERRED'].includes(normalizeStatus(task.status))" :disabled="isTaskPending(task)" @click="handleRestoreTask(task)">
                      恢复待办
                    </el-dropdown-item>
                    <el-dropdown-item v-if="task.reason" :disabled="isTaskPending(task)" @click="openCoachAction(task, 'EXPLAIN_RECOMMENDATION')">AI 解释推荐理由</el-dropdown-item>
                    <el-dropdown-item v-if="normalizeStatus(task.status) === 'DONE'" :disabled="isTaskPending(task)" @click="openCoachAction(task, 'REVIEW_COMPLETED_TASK')">AI 复盘本次任务</el-dropdown-item>
                    <el-dropdown-item divided :disabled="isTaskPending(task)" @click="openFeedbackDialog(task)">提交反馈</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </aside>
        </article>
      </div>

      <div v-if="tasks.length || total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[6, 10, 20, 50]"
          @change="fetchTasks"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="actionDialogTitle" width="460px">
      <el-input
        v-model="note"
        type="textarea"
        :rows="4"
        :placeholder="actionDialogPlaceholder"
        maxlength="200"
        show-word-limit
      />
      <p v-if="dialogMode === 'defer'" class="dialog-helper-text">
        当前会使用独立推迟接口并保留推迟时间和原因；下一轮计划解释会把它作为暂缓但可恢复的影响因素。
      </p>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="selectedTask ? isTaskActionPending(selectedTask, dialogMode) : false" @click="submitAction">确认</el-button>
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
          <el-input
            v-model="feedbackForm.comment"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            placeholder="可填写为什么有用、无用，或需要修正哪一段推荐原因。"
          />
        </el-form-item>
      </el-form>
      <p class="dialog-helper-text">{{ feedbackDialogImpactText }}</p>
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

    <el-drawer v-model="asyncDetailVisible" title="处理进度详情" size="520px">
      <div v-loading="asyncDetailLoading" class="async-detail">
        <AppState
          v-if="asyncDetailErrorMessage"
          type="error"
          title="任务详情加载失败"
          :description="asyncDetailErrorMessage"
        >
          <el-button v-if="asyncDetailTask" type="primary" @click="openAsyncTaskDetail(asyncDetailTask)">重新加载</el-button>
        </AppState>

        <template v-else-if="asyncDetailTask">
          <div class="async-detail__summary">
            <span>{{ getAsyncBizLabel(asyncDetailTask.bizType) }}</span>
            <h3>{{ getAsyncBizLabel(asyncDetailTask.bizType) }}处理记录</h3>
            <StatusTag :status="asyncDetailTask.status || 'PENDING'" :map="asyncStatusMap" />
            <p>{{ asyncTaskRecoveryHint(asyncDetailTask) }}</p>
          </div>

          <dl class="async-detail__meta">
            <div v-for="item in asyncDetailMetaItems(asyncDetailTask)" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>

          <div v-if="asyncDetailTask.failureReason" class="async-detail__block is-error">
            <strong>失败原因</strong>
            <p>{{ toFriendlyMessage(asyncDetailTask.failureReason, '任务失败原因尚未透出') }}</p>
          </div>

          <div class="async-detail__actions">
            <el-button v-if="getAsyncTaskEntry(asyncDetailTask)" type="primary" @click="goAction(getAsyncTaskEntry(asyncDetailTask) || '')">
              回到相关页面
            </el-button>
            <el-button :disabled="!asyncDetailTask.traceId" @click="copyTrace(asyncDetailTask.traceId)">复制处理线索</el-button>
          </div>

          <div v-if="asyncDetailBasisItems.length" class="async-detail__block">
            <strong>生成依据摘要</strong>
            <p class="async-detail__note">只展示定位任务所需的摘要；简历正文、岗位描述完整内容和完整输入不会在这里展开。</p>
            <ul class="async-detail__list">
              <li v-for="item in asyncDetailBasisItems" :key="item">{{ item }}</li>
            </ul>
          </div>

          <div v-if="asyncDetailResultItems.length" class="async-detail__block">
            <strong>生成结果摘要</strong>
            <p class="async-detail__note">正式内容请回到相关页面查看；这里保留状态、数量和反馈线索，避免展示不必要的完整生成内容。</p>
            <ul class="async-detail__list">
              <li v-for="item in asyncDetailResultItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Activity,
  Clock3,
  FileSearch,
  Flag,
  Layers,
  Link2,
  ListChecks,
  MoreHorizontal,
  NotebookTabs,
  MessagesSquare,
  RefreshCw,
  Route,
  Search,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  deferAgentTaskApi,
  getAgentTasksApi,
  recordAgentMetricEventApi,
  restoreAgentTaskApi,
  skipAgentTaskApi,
  startAgentTaskApi,
  submitAgentFeedbackApi
} from '@/api/agent'
import { getUserAsyncTaskDetailApi, getUserAsyncTasksApi } from '@/api/task'
import AgentCoachActionDialog from '@/components/agent/AgentCoachActionDialog.vue'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAgentCoachAction } from '@/composables/useAgentCoachAction'
import { buildAgentLoopActions } from '@/features/agent-loop/agentLoopRules'
import type { AgentTaskQueryDTO, AgentTaskVO } from '@/types/agent'
import type { AsyncTaskQueryDTO, AsyncTaskVO } from '@/types/asyncTask'
import {
  agentTaskFeedbackSummary,
  agentTaskDeferReason,
  agentTaskNextPlanImpactText,
  buildAgentTaskActionPath,
  buildAgentTaskFeedbackSummary,
  formatAgentTaskDeferReason,
  hasAgentTaskActionEntry,
  isAgentJobApplicationTask,
  isEvidenceBoundAgentTask,
  isDeferredAgentTask
} from '@/utils/agentTaskAction'
import { getErrorMessage as normalizeErrorMessage, toFriendlyMessage } from '@/utils/error'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'

interface SelectOption {
  label: string
  value: string
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const asyncLoading = ref(false)
const errorMessage = ref('')
const asyncErrorMessage = ref('')
const tasks = ref<AgentTaskVO[]>([])
const asyncTasks = ref<AsyncTaskVO[]>([])
const total = ref(0)
const asyncTotal = ref(0)
const asyncDetailVisible = ref(false)
const asyncDetailLoading = ref(false)
const asyncDetailErrorMessage = ref('')
const asyncDetailTask = ref<AsyncTaskVO>()
const dateRange = ref<[string, string] | ''>('')
const dialogVisible = ref(false)
const dialogMode = ref<'complete' | 'skip' | 'defer'>('complete')
const selectedTask = ref<AgentTaskVO>()
const note = ref('')
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
} = useAgentCoachAction('agent_tasks', '/agent/tasks')

const recoveryLinks: Array<{ label: string; desc: string; path: string; icon: Component }> = [
  { label: '岗位分析', desc: '查看分析进度和失败原因', path: '/job-targets', icon: FileSearch },
  { label: '简历匹配', desc: '回到报告列表继续重试', path: '/resume-match', icon: Target },
  { label: '今日计划', desc: '查看计划运行和任务动作', path: '/agent/today', icon: Route },
  { label: '推荐题', desc: '无画像时也可先练一组', path: '/questions/recommendations', icon: NotebookTabs },
  { label: '面试报告', desc: '从历史面试恢复生成', path: '/interviews/history', icon: MessagesSquare }
]

const query = reactive<AgentTaskQueryDTO>({
  pageNum: 1,
  pageSize: 6,
  startDate: '',
  endDate: '',
  taskType: '',
  status: '',
  priority: ''
})

const asyncQuery = reactive<AsyncTaskQueryDTO>({
  pageNum: 1,
  pageSize: 6,
  bizType: '',
  status: '',
  bizId: '',
  messageId: '',
  traceId: '',
  keyword: ''
})
const asyncDiagnosticKeyword = ref('')
const sourceFilter = ref('')
const trustFilter = ref('')

const taskTypeOptions: SelectOption[] = [
  { label: '今日计划', value: 'DAILY_PLAN' },
  { label: '岗位分析', value: 'JD_PARSE' },
  { label: '简历匹配', value: 'RESUME_MATCH' },
  { label: '推荐题生成', value: 'QUESTION_RECOMMENDATION' },
  { label: '面试报告', value: 'INTERVIEW_REPORT' },
  { label: '投递跟进', value: 'APPLICATION_FOLLOW_UP' },
  { label: '刷题练习', value: 'QUESTION_PRACTICE' },
  { label: '错题复习', value: 'WRONG_QUESTION_REVIEW' },
  { label: '模拟面试', value: 'INTERVIEW' },
  { label: '简历优化', value: 'RESUME_OPTIMIZE' },
  { label: '学习任务', value: 'STUDY_TASK' },
  { label: '报告复盘', value: 'REPORT_REVIEW' },
  { label: '技能复习', value: 'SKILL_REVIEW' },
  { label: '知识复盘', value: 'KNOWLEDGE_REVIEW' }
]

const statusOptions: SelectOption[] = [
  { label: '排队中', value: 'PENDING' },
  { label: '生成中', value: 'RUNNING' },
  { label: '待完成', value: 'TODO' },
  { label: '进行中', value: 'DOING' },
  { label: '生成成功', value: 'SUCCESS' },
  { label: '生成失败', value: 'FAILED' },
  { label: '已完成', value: 'DONE' },
  { label: '已推迟', value: 'DEFERRED' },
  { label: '已跳过', value: 'SKIPPED' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已取消', value: 'CANCELED' }
]

const asyncBizTypeOptions: SelectOption[] = [
  { label: '岗位分析', value: 'job-target.parse' },
  { label: '简历解析', value: 'resume.parse' },
  { label: '简历匹配', value: 'resume-job-match.analyze' },
  { label: '今日计划生成', value: 'agent.daily-plan.generate' },
  { label: '题目生成', value: 'question.generate' },
  { label: '推荐题生成', value: 'question.ai-generate' },
  { label: '推荐题异步生成', value: 'question-recommendation.generate' },
  { label: '面试报告', value: 'interview.report' },
  { label: '学习计划生成', value: 'study-plan.generate' }
]

const asyncStatusOptions: SelectOption[] = [
  { label: '排队中', value: 'PENDING' },
  { label: '执行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '死信', value: 'DEAD' }
]

const priorityOptions: SelectOption[] = [
  { label: '高优先级', value: 'HIGH' },
  { label: '中优先级', value: 'MEDIUM' },
  { label: '低优先级', value: 'LOW' }
]

const sourceFilterOptions: SelectOption[] = [
  { label: '投递/求职进度', value: 'APPLICATION' },
  { label: '面试反馈', value: 'INTERVIEW' },
  { label: '题库/错题', value: 'QUESTION' },
  { label: '简历/匹配', value: 'RESUME' },
  { label: '知识资料', value: 'KNOWLEDGE' },
  { label: '长期记忆', value: 'MEMORY' },
  { label: '智能教练', value: 'AGENT' }
]

const trustFilterOptions: SelectOption[] = [
  { label: '高可信/已记录', value: 'TRUSTED' },
  { label: '部分待确认', value: 'PARTIAL' },
  { label: '保守建议', value: 'FALLBACK' },
  { label: '待确认', value: 'UNKNOWN' }
]

const statusMap = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))
const asyncStatusMap = Object.fromEntries(asyncStatusOptions.map((item) => [item.value, item.label]))
const asyncBizTypeMap = Object.fromEntries(asyncBizTypeOptions.map((item) => [item.value, item.label]))
const priorityMap: Record<string, string> = { HIGH: '高优先级', MEDIUM: '中优先级', LOW: '低优先级' }
const feedbackTypeOptions: SelectOption[] = [
  { label: '有帮助', value: 'HELPFUL' },
  { label: '没有帮助', value: 'NOT_HELPFUL' },
  { label: '原因需修正', value: 'REASON_CORRECTION' },
  { label: '内容不准确', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '内容不符合实际', value: 'HALLUCINATION' },
  { label: '太难', value: 'TOO_HARD' },
  { label: '太简单', value: 'TOO_EASY' },
  { label: '不相关', value: 'IRRELEVANT' }
]

type TaskAction = 'start' | 'complete' | 'skip' | 'defer' | 'restore' | 'feedback'
type FocusMetricCode = 'focus_session_started' | 'focus_session_finished' | 'focus_session_canceled'
interface FocusSessionState {
  taskId: number
  sessionId: string
  startedAt: string
}

const pendingTaskActions = ref<Set<string>>(new Set())
const pendingAsyncDetailIds = ref<Set<number>>(new Set())
const focusSession = ref<FocusSessionState | null>(null)

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

const setAsyncDetailPending = (id: number, pending: boolean) => {
  const next = new Set(pendingAsyncDetailIds.value)
  if (pending) {
    next.add(id)
  } else {
    next.delete(id)
  }
  pendingAsyncDetailIds.value = next
}

const isAsyncDetailPending = (id: number) => pendingAsyncDetailIds.value.has(id)

const activeTasks = computed(() => tasks.value.filter((task) => ['PENDING', 'RUNNING', 'TODO', 'DOING'].includes(normalizeStatus(task.status))))
const estimatedMinutes = computed(() => tasks.value.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0))
const highPriorityTasks = computed(() => tasks.value.filter((task) => normalizeStatus(task.priority) === 'HIGH'))
const recoverableTasks = computed(() => tasks.value.filter((task) => task.actionUrl || getTaskRunId(task) || task.relatedBizId))
const activeAsyncTasks = computed(() => asyncTasks.value.filter((task) => ['PENDING', 'RUNNING'].includes(normalizeStatus(task.status))))
const recoverableAsyncTasks = computed(() => asyncTasks.value.filter((task) => getAsyncTaskEntry(task) || task.traceId || task.messageId))
const hasTaskExperienceFilter = computed(() => Boolean(sourceFilter.value || trustFilter.value))
const taskSourceBucket = (task: AgentTaskVO) => {
  const value = [task.sourceType, task.relatedBizType, task.taskType, task.actionUrl].filter(Boolean).join(' ').toUpperCase()
  if (value.includes('APPLICATION') || value.includes('JOB_APPLICATION')) return 'APPLICATION'
  if (value.includes('INTERVIEW') || value.includes('REPORT')) return 'INTERVIEW'
  if (value.includes('QUESTION') || value.includes('WRONG')) return 'QUESTION'
  if (value.includes('RESUME') || value.includes('MATCH')) return 'RESUME'
  if (value.includes('KNOWLEDGE')) return 'KNOWLEDGE'
  if (value.includes('MEMORY')) return 'MEMORY'
  return 'AGENT'
}
const taskTrustBucket = (task: AgentTaskVO) => {
  const status = String(task.trustStatus || '').toUpperCase()
  const confidence = String(task.confidence || '').toUpperCase()
  if (task.fallback || status === 'FALLBACK') return 'FALLBACK'
  if (status === 'VERIFIED' || confidence === 'HIGH') return 'TRUSTED'
  if (status === 'PARTIAL' || confidence === 'MEDIUM') return 'PARTIAL'
  return 'UNKNOWN'
}
const visibleTasks = computed(() =>
  tasks.value.filter((task) =>
    (!sourceFilter.value || taskSourceBucket(task) === sourceFilter.value) &&
    (!trustFilter.value || taskTrustBucket(task) === trustFilter.value)
  )
)
const taskEmptyTitle = computed(() => hasTaskExperienceFilter.value ? '当前来源/可信度下暂无任务' : '暂无训练任务')
const taskEmptyDescription = computed(() =>
  hasTaskExperienceFilter.value
    ? '当前页没有符合来源或可信度筛选的任务。可以清空筛选，或先补投递、面试复盘、知识资料和长期记忆，让下一轮计划有更多依据。'
    : '当前筛选条件下没有处理记录。可以回到今日计划生成新的准备任务，或先补投递、面试复盘、知识资料和长期记忆。'
)
const agentLoopActionsByTaskId = computed(() => {
  const map = new Map<number, ReturnType<typeof buildAgentLoopActions>[number]>()
  buildAgentLoopActions(tasks.value, { historyTasks: tasks.value }).forEach((action) => {
    map.set(action.taskId, action)
  })
  return map
})
const asyncActiveFilterItems = computed(() => {
  const items: Array<{ key: string; label: string; value: string }> = []
  if (asyncQuery.bizType) items.push({ key: 'bizType', label: '关联功能', value: getAsyncBizLabel(asyncQuery.bizType) })
  if (asyncQuery.status) items.push({ key: 'status', label: '状态', value: asyncStatusMap[asyncQuery.status] || asyncQuery.status })
  if (asyncQuery.messageId) items.push({ key: 'messageId', label: '处理凭证', value: asyncQuery.messageId })
  if (asyncQuery.traceId) items.push({ key: 'traceId', label: '处理线索', value: asyncQuery.traceId })
  if (asyncQuery.bizId) items.push({ key: 'bizId', label: '关联记录', value: asyncQuery.bizId })
  if (asyncQuery.keyword) items.push({ key: 'keyword', label: '关键词', value: asyncQuery.keyword })
  return items
})

const metrics = computed(() => [
  {
    label: '当前结果',
    value: (hasTaskExperienceFilter.value ? visibleTasks.value.length : (total.value || tasks.value.length)) + (asyncTotal.value || asyncTasks.value.length),
    desc: hasTaskExperienceFilter.value ? '已按来源/可信度筛选当前页任务' : '训练任务和处理进度合计'
  },
  { label: '待推进', value: activeTasks.value.length + activeAsyncTasks.value.length, desc: '排队中、生成中或待执行的任务' },
  { label: '可恢复', value: recoverableTasks.value.length + recoverableAsyncTasks.value.length, desc: '带入口或反馈码的任务' },
  { label: '预计耗时', value: `${estimatedMinutes.value}m`, desc: highPriorityTasks.value.length ? `${highPriorityTasks.value.length} 个高优先级任务` : '本页任务耗时合计' }
])

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
      label: isAgentJobApplicationTask(task) ? '查看投递进度' : '继续当前任务',
      path: buildAgentTaskActionPath(task)
    }
  }
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) return { label: '继续专项练习', path: '/questions/practice' }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return { label: '查看面试历史', path: '/interviews/history' }
  if (type.includes('RESUME')) return { label: '查看简历匹配', path: '/resume-match' }
  return { label: '继续任务中心', path: '/agent/tasks' }
})

watch(dateRange, (value) => {
  query.startDate = Array.isArray(value) ? value[0] : ''
  query.endDate = Array.isArray(value) ? value[1] : ''
})

const normalizeStatus = (value?: string | null) => String(value || '').toUpperCase()

const getErrorMessage = (error: unknown) => {
  return normalizeErrorMessage(error, '请求失败，请稍后重试。')
}

const skillFromText = (value?: string) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const displayTaskTitle = (row: AgentTaskVO) => {
  const skill = row.relatedSkillName || skillFromText(row.title) || row.targetJobTitle || '目标技能'
  const map: Record<string, string> = {
    QUESTION_PRACTICE: `${skill} 面试题练习`,
    WRONG_QUESTION_REVIEW: `${skill} 错题复习`,
    INTERVIEW: row.targetJobTitle ? `${row.targetJobTitle} 模拟面试` : '目标岗位模拟面试',
    RESUME_OPTIMIZE: `${skill} 项目经历优化`,
    DAILY_PLAN: '今日计划生成',
    JD_PARSE: '岗位分析任务',
    RESUME_MATCH: '简历匹配报告',
    QUESTION_RECOMMENDATION: '推荐题生成',
    INTERVIEW_REPORT: '面试报告生成',
    APPLICATION_FOLLOW_UP: '投递跟进',
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 表达素材复盘`
  }
  return row.title || map[row.taskType || ''] || '今日训练任务'
}

const displayTaskDescription = (row: AgentTaskVO) => {
  if (row.description) return row.description
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚说明目标技能和业务影响。',
    DAILY_PLAN: '生成今天最该推进的 3 个准备动作，失败后可从今日计划重试。',
    JD_PARSE: '分析岗位职责、技能要求和面试重点，失败后回到岗位目标页继续处理。',
    RESUME_MATCH: '对比简历和岗位描述的匹配度，失败后回到匹配详情查看原因并重新生成。',
    QUESTION_RECOMMENDATION: '基于画像、匹配报告或通用练习策略生成练习题。',
    INTERVIEW_REPORT: '生成面试复盘、薄弱点和后续学习建议。',
    APPLICATION_FOLLOW_UP: '查看投递进度，补充沟通记录，并安排下一次跟进。',
    STUDY_TASK: '完成学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '从项目经历、训练记录或面试工具中提取可复用表达。'
  }
  return map[row.taskType || ''] || '暂无描述'
}

const displayTaskReason = (row: AgentTaskVO) => {
  if (row.reason) return row.reason
  if (row.relatedSkillName) return `智能教练将该任务关联到「${row.relatedSkillName}」，建议优先补齐这块表达。`
  return ''
}

const getTaskTypeLabel = (value?: string) =>
  taskTypeOptions.find((item) => item.value === value)?.label || (value ? '专项训练' : '未分类')
const getPriorityLabel = (value?: string) => priorityMap[value || ''] || (value ? '普通优先级' : '无优先级')
const getAsyncBizLabel = (value?: string | null) => asyncBizTypeMap[value || ''] || '处理进度'

const getTaskRunId = (task: AgentTaskVO) => task.agentRunId ?? task.runId ?? null
const getTaskPlanDate = (task?: AgentTaskVO) =>
  task?.activationHandoffs?.find((item) => item?.planDate)?.planDate
  || task?.dueDate
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
    sourcePage: 'agent_tasks'
  }, { silentError: true }).catch(() => undefined)
}

const focusSessionLabel = computed(() => {
  if (!focusSession.value) return ''
  const startedAt = new Date(focusSession.value.startedAt)
  if (Number.isNaN(startedAt.getTime())) return '已开始'
  return `${startedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 开始`
})

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
    sourcePage: 'agent_tasks',
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

const sourceTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  const map: Record<string, string> = {
    TARGET_JOB: '目标岗位',
    RESUME_JOB_MATCH: '匹配报告',
    RESUME_MATCH: '匹配报告',
    QUESTION_RECOMMENDATION: '推荐题',
    QUESTION_PRACTICE: '题库练习',
    WRONG_QUESTION_REVIEW: '错题复习',
    INTERVIEW: '模拟面试',
    INTERVIEW_REPORT: '面试报告',
    RESUME_OPTIMIZE: '项目经历',
    TRAINING_MATERIAL: '训练素材',
    KNOWLEDGE_REVIEW: '知识资料',
    KNOWLEDGE_GAP: '知识缺口',
    MEMORY_PREFERENCE: '长期记忆',
    AGENT_MEMORY: '长期记忆',
    APPLICATION_FOLLOW_UP: '投递跟进',
    JOB_APPLICATION: '投递进度',
    JOB_COACH_AGENT_TASK: '智能教练'
  }
  return map[type] || '智能教练'
}

const trustStatusLabel = (value?: string | null, fallback?: boolean | null) => {
  const status = String(value || '').toUpperCase()
  if (fallback || status === 'FALLBACK') return '推荐依据不足'
  if (status === 'VERIFIED') return '来源已记录'
  if (status === 'PARTIAL') return '部分来源待确认'
  if (status === 'CANDIDATE') return '候选记忆待确认'
  if (status === 'STALE') return '来源可能过期'
  if (status === 'DISABLED') return '来源已停用'
  return '来源待确认'
}

const confidenceLabel = (value?: string | number | null) => {
  const confidence = String(value ?? '').toUpperCase()
  if (!confidence) return ''
  if (confidence === 'HIGH') return '可信度：高'
  if (confidence === 'MEDIUM') return '可信度：中'
  if (confidence === 'LOW') return '可信度：低'
  if (confidence === 'UNKNOWN') return '可信度待确认'
  if (typeof value === 'number') return `可信度：${Math.round(value * 100)}%`
  return `可信度：${value}`
}

const taskTraceText = (task: AgentTaskVO) => {
  const type = sourceTypeLabel(task.relatedBizType || task.taskType)
  return task.relatedBizId ? `${type}已关联` : type
}

const taskDiagnosticItems = (task: AgentTaskVO) => {
  const items = ['训练记录已保存']
  items.push(`来源：${sourceTypeLabel(task.sourceType || task.relatedBizType || task.taskType)}`)
  items.push(trustStatusLabel(task.trustStatus, task.fallback))
  const confidence = confidenceLabel(task.confidence)
  if (confidence) {
    items.push(confidence)
  }
  if (task.evidenceSummary) {
    items.push(task.evidenceSummary)
  }
  if (task.sourceId) {
    items.push('训练来源已记录')
  }
  const runId = getTaskRunId(task)
  if (runId) {
    items.push('计划生成详情可查看')
    items.push(task.traceId ? '处理线索已记录' : '处理线索可在详情中查看')
  } else {
    items.push('暂未关联计划生成详情')
  }
  if (task.relatedBizType || task.relatedBizId) {
    items.push(taskTraceText(task))
  } else if (!task.actionUrl && !runId) {
    items.push('暂无可继续定位的处理线索')
  }
  if (task.actionUrl) {
    items.push('可从原页面继续')
  }
  return items
}

const agentLoopDiagnosticItems = (task: AgentTaskVO) => {
  const action = agentLoopActionsByTaskId.value.get(task.id)
  if (!action) return []
  const strengthLabel: Record<string, string> = {
    strong: '强动作',
    medium: '中动作',
    weak: '弱动作'
  }
  const items: string[] = [`闭环强度：${strengthLabel[String(action.planStrength)] || action.planStrength}`]
  if (!action.canPromoteToKeyAction) {
    items.push('暂不进入关键动作')
  }
  if (action.repeatedSkipCount >= 2) {
    items.push('多次暂缓：下一轮建议拆小或降级')
  }
  if (action.degradationReasons.length) {
    items.push(`降级原因：${action.degradationReasons.slice(0, 2).join('、')}`)
  }
  return items
}

const taskFailureText = (task: AgentTaskVO) => {
  const status = normalizeStatus(task.status)
  if (status !== 'FAILED' && !task.errorMessage && !task.errorCode) return ''
  const reason = task.errorMessage || '任务失败原因尚未透出'
  return task.errorCode ? `失败原因：${reason}（${task.errorCode}）` : `失败原因：${reason}`
}

const taskSkipReasonText = (task: AgentTaskVO) => {
  if (isDeferredAgentTask(task)) return `推迟原因：${agentTaskDeferReason(task)}`
  if (!task.skipReason) return ''
  return `跳过原因：${task.skipReason}`
}

const taskFeedbackSummaryText = (task: AgentTaskVO) => agentTaskFeedbackSummary(task)
const taskNextPlanImpactText = (task: AgentTaskVO) => agentTaskNextPlanImpactText(task)

const patchLocalTask = (taskId: number, patch: Partial<AgentTaskVO> & Record<string, unknown>) => {
  tasks.value = tasks.value.map((task) => task.id === taskId ? ({ ...task, ...patch } as AgentTaskVO) : task)
}

const formatTaskDate = (value?: string | null) => {
  if (!value) return '时间未定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: value.includes(':') ? '2-digit' : undefined,
    minute: value.includes(':') ? '2-digit' : undefined
  }).format(date)
}

const statusActionHint = (task: AgentTaskVO) => {
  const map: Record<string, string> = {
    PENDING: '等待执行',
    RUNNING: '正在生成',
    TODO: '建议下一步',
    DOING: '正在推进',
    SUCCESS: '生成完成',
    FAILED: '需要处理',
    DONE: '复盘状态',
    SKIPPED: '已暂缓',
    EXPIRED: '需要确认',
    CANCELED: '已取消'
  }
  if (isDeferredAgentTask(task)) return '已推迟'
  return map[normalizeStatus(task.status)] || '任务状态'
}

const statusMainText = (task: AgentTaskVO) => {
  const status = normalizeStatus(task.status)
  if (status === 'PENDING') return '可稍后查看'
  if (status === 'RUNNING') return '可离开等待'
  if (status === 'TODO') return '可以开始'
  if (status === 'DOING') return '完成后标记'
  if (status === 'SUCCESS') return '可查看结果'
  if (status === 'FAILED') return '查看失败原因'
  if (status === 'DONE') return task.completedAt ? '已完成' : '已收尾'
  if (status === 'DEFERRED') return '下一轮可恢复'
  if (status === 'SKIPPED') return isDeferredAgentTask(task) ? '下一轮可恢复' : '可恢复'
  if (status === 'EXPIRED') return '已过期'
  if (status === 'CANCELED') return '已取消'
  return statusMap[status] || '待处理'
}

const goRecovery = async (path: string) => {
  await router.push(path)
}

const hasRecoverableEntry = (task: AgentTaskVO) => Boolean(hasAgentTaskActionEntry(task) || getTaskRunId(task))
const canManuallyCloseTask = (task: AgentTaskVO) =>
  ['TODO', 'DOING', 'EXPIRED'].includes(normalizeStatus(task.status)) && !isEvidenceBoundAgentTask(task)
const canManuallySkipTask = (task: AgentTaskVO) => ['TODO', 'DOING', 'EXPIRED'].includes(normalizeStatus(task.status))
const canDeferTask = (task: AgentTaskVO) => canManuallySkipTask(task)
const canStartFocusSession = (task: AgentTaskVO) => ['TODO', 'DOING'].includes(normalizeStatus(task.status))
const isFocusActive = (task: AgentTaskVO) => focusSession.value?.taskId === task.id
const isFocusStartDisabled = (task: AgentTaskVO) => Boolean(focusSession.value && !isFocusActive(task)) || isTaskPending(task)

const actionDialogTitle = computed(() => {
  if (dialogMode.value === 'complete') return '完成任务'
  if (dialogMode.value === 'defer') return '推迟任务'
  return '跳过任务'
})

const actionDialogPlaceholder = computed(() => {
  if (dialogMode.value === 'complete') return '可填写完成备注'
  if (dialogMode.value === 'defer') return '请填写推迟原因，例如：今天先处理面试复盘，明天再做这项'
  return '请填写跳过原因'
})

const feedbackDialogImpactText = computed(() => {
  const summary = buildAgentTaskFeedbackSummary({
    outcome: 'feedback',
    feedbackType: feedbackForm.feedbackType,
    reason: feedbackForm.comment
  })
  return `下一轮计划参考：${summary}。`
})

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

const openTaskPrimaryEntry = async (task: AgentTaskVO) => {
  if (hasAgentTaskActionEntry(task)) {
    await goAction(buildAgentTaskActionPath(task))
    return
  }
  await openRunDetail(task)
}

const openRunDetail = async (task: AgentTaskVO) => {
  const runId = getTaskRunId(task)
  if (runId) {
    await router.push(`/agent/runs/${runId}`)
  }
}

const goAction = async (url: string) => {
  if (!url) return
  const safePath = sanitizeLocalActionPath(url)
  if (!safePath) {
    ElMessage.warning('任务链接暂不支持跳转到站外地址')
    return
  }
  await router.push(safePath)
}

const getAsyncTaskEntry = (task: AsyncTaskVO) => {
  const bizType = String(task.bizType || '')
  const bizId = task.bizId
  if (bizType === 'job-target.parse' && bizId) return `/job-targets/${bizId}/analysis`
  if (bizType === 'resume.parse') return '/resumes/manage'
  if (bizType === 'resume-job-match.analyze' && bizId) return `/resume-match/${bizId}`
  if (bizType === 'agent.daily-plan.generate') return bizId ? `/agent/runs/${bizId}` : '/agent/today'
  if (['question.ai-generate', 'question.generate', 'question-recommendation.generate'].includes(bizType)) return '/questions/recommendations'
  if (bizType === 'interview.report' && bizId) return `/interviews/${bizId}/report`
  if (bizType === 'study-plan.generate' && bizId) return `/study-plans?planId=${bizId}`
  return ''
}

const asyncTaskRecoveryHint = (task: AsyncTaskVO) => {
  const status = normalizeStatus(task.status)
  const entry = getAsyncTaskEntry(task)
  if (status === 'PENDING') return '任务正在排队，可以离开页面；稍后回到这里或原页面继续查看。'
  if (status === 'RUNNING') return '任务正在执行，可以离开页面；系统会保留处理记录和相关入口。'
  if (status === 'SUCCESS') return entry ? '任务已完成，可以回到相关页面查看生成结果。' : '任务已完成，可回到对应功能查看结果。'
  if (['FAILED', 'ERROR', 'DEAD', 'DEAD_LETTER'].includes(status)) {
    return entry ? '任务失败，请先查看失败原因；可以回到相关页面重试，仍失败时复制处理线索反馈。' : '任务失败，请复制处理线索反馈。'
  }
  return task.traceId || task.messageId ? '可通过处理记录继续定位。' : '等待任务状态更新。'
}

const asyncDetailMetaItems = (task: AsyncTaskVO) => {
  const items = [
    { label: '处理记录', value: '已保存' },
    { label: '关联功能', value: getAsyncBizLabel(task.bizType) },
    { label: '关联记录', value: task.bizId ? '已绑定' : '-' },
    { label: '处理凭证', value: task.messageId ? '已提交' : '-' },
    { label: '处理线索', value: task.traceId || '-' },
    { label: '执行次数', value: task.retryCount != null ? `${task.retryCount} / ${task.maxRetry ?? '-'}` : '-' },
    { label: '开始时间', value: formatTaskDate(task.startedAt) },
    { label: '完成时间', value: formatTaskDate(task.completedAt) },
    { label: '创建时间', value: formatTaskDate(task.createdAt) },
    { label: '更新时间', value: formatTaskDate(task.updatedAt) }
  ]
  return items.filter((item) => item.value !== '时间未定' || ['开始时间', '完成时间'].includes(item.label))
}

type AsyncDetailPurpose = 'basis' | 'result'

const asyncPayloadKeyLabels: Record<string, string> = {
  title: '标题',
  summary: '摘要',
  content: '正文摘要',
  message: '说明',
  reason: '原因',
  failureReason: '失败原因',
  status: '状态',
  statusText: '状态说明',
  error: '错误',
  errors: '错误明细',
  warning: '提醒',
  warnings: '提醒',
  taskType: '任务类型',
  bizType: '关联功能',
  bizId: '关联记录',
  userId: '用户',
  resumeId: '简历',
  resumeName: '简历名称',
  jobTargetId: '岗位目标',
  targetJobTitle: '目标岗位',
  jobTitle: '岗位',
  matchReportId: '匹配报告',
  reportId: '报告',
  interviewId: '面试',
  questionId: '题目',
  batchId: '批次',
  traceId: '处理线索',
  messageId: '处理凭证',
  actionUrl: '相关入口',
  prompt: '生成提示摘要',
  requestPrompt: '生成提示摘要',
  requestBody: '提交摘要',
  requestParams: '提交参数摘要',
  rawResult: '结果摘要',
  rawResultJson: '结果摘要',
  rawOutputText: '结果摘要',
  forceRefresh: '重新生成',
  tasks: '任务',
  items: '条目',
  result: '生成结果',
  payload: '提交摘要',
  score: '得分',
  suggestions: '建议',
  nextActions: '下一步',
  generatedCount: '生成数量',
  successCount: '成功数量',
  failureCount: '失败数量',
  totalCount: '总数',
  count: '数量',
  progress: '进度'
}

const asyncPreferredKeys: Record<AsyncDetailPurpose, string[]> = {
  basis: [
    'bizType',
    'bizId',
    'messageId',
    'traceId',
    'status',
    'resumeName',
    'targetJobTitle',
    'jobTitle',
    'matchReportId',
    'reportId',
    'interviewId',
    'batchId',
    'forceRefresh',
    'count'
  ],
  result: [
    'status',
    'statusText',
    'message',
    'summary',
    'reason',
    'failureReason',
    'generatedCount',
    'successCount',
    'failureCount',
    'totalCount',
    'count',
    'score',
    'tasks',
    'items',
    'suggestions',
    'nextActions',
    'reportId',
    'batchId',
    'messageId',
    'traceId'
  ]
}

const asyncSensitiveKeyPattern =
  /(prompt|request|raw|body|token|secret|password|authorization|apiKey|accessKey|phone|mobile|email|idCard|address|resume.*(text|content|raw)|jd.*(text|content|raw)|jobDescription|answer|questionContent|file(Content|Url|Path)?)/i

const asyncHiddenFieldText: Record<AsyncDetailPurpose, string> = {
  basis: '详细依据已安全保存；如需反馈，请复制处理线索。',
  result: '完整生成内容已安全保存；请回到相关页面查看正式内容。'
}

const isAsyncPayloadRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const asyncPayloadKeyLabel = (key: string) =>
  asyncPayloadKeyLabels[key] || '补充信息'

const isAsyncSensitiveKey = (key: string) => asyncSensitiveKeyPattern.test(key)

const redactAsyncText = (value: string) =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱已隐藏]')
    .replace(/\b1[3-9]\d{9}\b/g, '[联系方式已隐藏]')
    .replace(/\b\d{15}(?:\d{2}[0-9Xx])?\b/g, '[证件号已隐藏]')

const trimAsyncText = (value: string, max = 120) => {
  const friendly = redactAsyncText(toFriendlyMessage(value, value)).replace(/\s+/g, ' ').trim()
  if (!friendly) return ''
  return friendly.length > max ? `${friendly.slice(0, max)}...` : friendly
}

const formatPrimitiveAsyncValue = (key: string, value: unknown, purpose: AsyncDetailPurpose) => {
  if (value === null || value === undefined || value === '') return ''
  if (isAsyncSensitiveKey(key)) return `${asyncPayloadKeyLabel(key)}：${asyncHiddenFieldText[purpose]}`
  if (typeof value === 'string') {
    const text = trimAsyncText(value)
    if (!text) return ''
    if (text.length > 80 && purpose === 'basis') return `${asyncPayloadKeyLabel(key)}：已记录摘要，可用处理线索继续反馈。`
    return `${asyncPayloadKeyLabel(key)}：${text}`
  }
  if (typeof value === 'number') return `${asyncPayloadKeyLabel(key)}：${value}`
  if (typeof value === 'boolean') return `${asyncPayloadKeyLabel(key)}：${value ? '是' : '否'}`
  return ''
}

const pickAsyncItemTitle = (value: unknown) => {
  if (typeof value === 'string') return trimAsyncText(value, 40)
  if (!isAsyncPayloadRecord(value)) return ''
  const candidate = value.title || value.name || value.summary || value.message || value.reason || value.taskTitle || value.questionTitle
  return typeof candidate === 'string' && !asyncSensitiveKeyPattern.test(candidate) ? trimAsyncText(candidate, 40) : ''
}

const formatAsyncCollectionValue = (key: string, value: unknown[], purpose: AsyncDetailPurpose) => {
  if (!value.length) return ''
  if (isAsyncSensitiveKey(key)) return `${asyncPayloadKeyLabel(key)}：${asyncHiddenFieldText[purpose]}`
  const titles = value.map(pickAsyncItemTitle).filter(Boolean).slice(0, 3)
  const suffix = titles.length ? `（${titles.join('、')}${value.length > titles.length ? ' 等' : ''}）` : ''
  return `${asyncPayloadKeyLabel(key)}：共 ${value.length} 项${suffix}`
}

const formatAsyncNestedValue = (key: string, value: Record<string, unknown>, purpose: AsyncDetailPurpose) => {
  if (isAsyncSensitiveKey(key)) return `${asyncPayloadKeyLabel(key)}：${asyncHiddenFieldText[purpose]}`
  const visibleKeys = Object.keys(value).filter((itemKey) => !isAsyncSensitiveKey(itemKey)).slice(0, 4)
  if (!visibleKeys.length) return `${asyncPayloadKeyLabel(key)}：已记录，详细内容请回到相关页面查看。`
  return `${asyncPayloadKeyLabel(key)}：包含 ${visibleKeys.map(asyncPayloadKeyLabel).join('、')}${Object.keys(value).length > visibleKeys.length ? ' 等' : ''}`
}

const formatAsyncDetailItem = (key: string, value: unknown, purpose: AsyncDetailPurpose) => {
  if (Array.isArray(value)) {
    return formatAsyncCollectionValue(key, value, purpose)
  }
  if (isAsyncPayloadRecord(value)) {
    return formatAsyncNestedValue(key, value, purpose)
  }
  return formatPrimitiveAsyncValue(key, value, purpose)
}

const collectAsyncDetailItems = (value: unknown, purpose: AsyncDetailPurpose) => {
  if (Array.isArray(value)) {
    return [formatAsyncCollectionValue(purpose === 'basis' ? 'payload' : 'result', value, purpose)].filter(Boolean)
  }
  if (isAsyncPayloadRecord(value)) {
    const usedKeys = new Set<string>()
    const items: string[] = []
    const pushItem = (key: string, item: unknown) => {
      if (usedKeys.has(key)) return
      usedKeys.add(key)
      const formatted = formatAsyncDetailItem(key, item, purpose)
      if (formatted) items.push(formatted)
    }
    asyncPreferredKeys[purpose].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) pushItem(key, value[key])
    })
    Object.entries(value).forEach(([key, item]) => {
      if (items.length >= 8) return
      if (isAsyncSensitiveKey(key)) return
      pushItem(key, item)
    })
    return items
  }
  const primitive = formatPrimitiveAsyncValue(purpose === 'basis' ? 'payload' : 'result', value, purpose)
  return primitive ? [primitive] : []
}

const fallbackAsyncDetailItems = (trimmed: string, purpose: AsyncDetailPurpose) => {
  const text = trimAsyncText(trimmed, 160)
  if (!text) return []
  if (purpose === 'basis') return [`生成依据：${asyncHiddenFieldText.basis}`]
  if (trimmed.length > 240 || asyncSensitiveKeyPattern.test(trimmed)) {
    return [`生成结果：${asyncHiddenFieldText.result}`]
  }
  return [`生成结果：${text}`]
}

const formatAsyncDetailItems = (value: string | null | undefined, purpose: AsyncDetailPurpose): string[] => {
  if (!value) return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const items = collectAsyncDetailItems(JSON.parse(trimmed), purpose).slice(0, 8)
    if (items.length) return items
  } catch {
    return fallbackAsyncDetailItems(trimmed, purpose)
  }
  return [purpose === 'basis' ? asyncHiddenFieldText.basis : asyncHiddenFieldText.result]
}

const asyncDetailBasisItems = computed(() => {
  const task = asyncDetailTask.value
  if (task?.payloadPreview) return [task.payloadPreview]
  return formatAsyncDetailItems(task?.payload, 'basis')
})
const asyncDetailResultItems = computed(() => {
  const task = asyncDetailTask.value
  if (task?.resultPreview) return [task.resultPreview]
  return formatAsyncDetailItems(task?.result, 'result')
})

const openAsyncTaskDetail = async (task: AsyncTaskVO) => {
  asyncDetailVisible.value = true
  asyncDetailTask.value = task
  asyncDetailErrorMessage.value = ''
  asyncDetailLoading.value = true
  setAsyncDetailPending(task.id, true)
  try {
    asyncDetailTask.value = await getUserAsyncTaskDetailApi(task.id)
  } catch (error) {
    asyncDetailErrorMessage.value = getErrorMessage(error)
  } finally {
    asyncDetailLoading.value = false
    setAsyncDetailPending(task.id, false)
  }
}

const copyTrace = async (traceId?: string | null) => {
  if (!traceId) return
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(traceId)
    ElMessage.success('处理线索已复制')
  } catch {
    ElMessage.warning('当前浏览器不支持自动复制，请手动复制处理线索')
  }
}

const fetchTasks = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAgentTasksApi(query)
    tasks.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    tasks.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const fetchAsyncTasks = async () => {
  asyncLoading.value = true
  asyncErrorMessage.value = ''
  try {
    const result = await getUserAsyncTasksApi(asyncQuery)
    asyncTasks.value = result.records || []
    asyncTotal.value = result.total || 0
  } catch (error) {
    asyncTasks.value = []
    asyncTotal.value = 0
    asyncErrorMessage.value = getErrorMessage(error)
  } finally {
    asyncLoading.value = false
  }
}

const handleSearch = () => {
  query.pageNum = 1
  fetchTasks()
}

const handleExperienceFilterChange = () => {
  query.pageNum = 1
}

const handleReset = () => {
  dateRange.value = ''
  sourceFilter.value = ''
  trustFilter.value = ''
  Object.assign(query, {
    pageNum: 1,
    pageSize: 6,
    startDate: '',
    endDate: '',
    taskType: '',
    status: '',
    priority: ''
  })
  fetchTasks()
}

const handleAsyncSearch = () => {
  applyAsyncDiagnosticKeyword()
  asyncQuery.pageNum = 1
  fetchAsyncTasks()
}

const handleAsyncReset = () => {
  Object.assign(asyncQuery, {
    pageNum: 1,
    pageSize: 6,
    bizType: '',
    status: '',
    bizId: '',
    messageId: '',
    traceId: '',
    keyword: ''
  })
  asyncDiagnosticKeyword.value = ''
  fetchAsyncTasks()
}

const applyAsyncDiagnosticKeyword = () => {
  const value = asyncDiagnosticKeyword.value.trim()
  asyncQuery.bizId = ''
  asyncQuery.messageId = ''
  asyncQuery.traceId = ''
  asyncQuery.keyword = ''
  if (!value) return
  if (/^trace[-_:]/i.test(value)) {
    asyncQuery.traceId = value.replace(/^trace[-_:]\s*/i, '')
    return
  }
  if (/^msg[-_:]/i.test(value) || /message/i.test(value)) {
    asyncQuery.messageId = value.replace(/^(msg|message)[-_:]\s*/i, '')
    return
  }
  if (/^biz[-_:]/i.test(value)) {
    asyncQuery.bizId = value.replace(/^biz[-_:]\s*/i, '')
    return
  }
  if (/^\d+$/.test(value)) {
    asyncQuery.bizId = value
    return
  }
  asyncQuery.keyword = value
}

const handleAsyncDiagnosticClear = () => {
  asyncQuery.bizId = ''
  asyncQuery.messageId = ''
  asyncQuery.traceId = ''
  asyncQuery.keyword = ''
  handleAsyncSearch()
}

const openCompleteDialog = (task: AgentTaskVO) => {
  if (!canManuallyCloseTask(task)) {
    if (hasAgentTaskActionEntry(task)) {
      ElMessage.info('该任务需要完成对应业务动作后自动核验')
      void goAction(buildAgentTaskActionPath(task))
      return
    }
    ElMessage.warning('该任务暂不支持手动标记完成')
    return
  }
  selectedTask.value = task
  dialogMode.value = 'complete'
  note.value = ''
  dialogVisible.value = true
}

const openSkipDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  dialogMode.value = 'skip'
  note.value = ''
  dialogVisible.value = true
}

const openDeferDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  dialogMode.value = 'defer'
  note.value = ''
  dialogVisible.value = true
}

const submitAction = async () => {
  const task = selectedTask.value
  if (!task) return
  if ((dialogMode.value === 'skip' || dialogMode.value === 'defer') && !note.value.trim()) {
    ElMessage.warning(dialogMode.value === 'defer' ? '请填写推迟原因' : '请填写跳过原因')
    return
  }
  await withTaskPending(task, dialogMode.value, async () => {
    if (dialogMode.value === 'complete') {
      const completedTask = await completeAgentTaskApi(task.id, { note: note.value || undefined })
      ElMessage.success('任务已完成')
      completionReviewTask.value = completedTask || task
      completionReviewNote.value = completedTask?.reviewNote || note.value.trim()
      completionReviewVisible.value = true
    } else if (dialogMode.value === 'defer') {
      const deferReason = formatAgentTaskDeferReason(note.value)
      await deferAgentTaskApi(task.id, {
        deferAt: new Date().toISOString(),
        deferReason,
        feedbackSummary: buildAgentTaskFeedbackSummary({
          outcome: 'defer',
          reason: note.value
        })
      })
      ElMessage.success('任务已推迟，将作为下一轮计划参考')
    } else {
      await skipAgentTaskApi(task.id, { skipReason: note.value.trim() })
      ElMessage.success('任务已跳过')
    }
    dialogVisible.value = false
    await fetchTasks()
  })
}

const handleStartTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'start', async () => {
    const startedTask = await startAgentTaskApi(task.id)
    ElMessage.success('任务已开始')
    await fetchTasks()
    await goAction(buildAgentTaskActionPath(startedTask || task))
  })
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'restore', async () => {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('任务已恢复')
    await fetchTasks()
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
    const comment = feedbackForm.comment.trim()
    const feedbackSummary = buildAgentTaskFeedbackSummary({
      outcome: 'feedback',
      feedbackType: feedbackForm.feedbackType,
      reason: comment
    })
    await submitAgentFeedbackApi({
      agentTaskId: task.id,
      agentRunId: getTaskRunId(task) ?? undefined,
      feedbackType: feedbackForm.feedbackType,
      comment: comment || undefined
    })
    patchLocalTask(task.id, {
      feedbackSummary,
      lastFeedbackType: feedbackForm.feedbackType,
      feedbackComment: comment || null
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

const goCompletionNextAction = async () => {
  const targetPath = completionReviewNextAction.value.path
  trackCompletionReviewCtaClick(targetPath)
  completionReviewVisible.value = false
  await goAction(targetPath)
}

const goCoachNextAction = async () => {
  trackCoachNextAction()
  coachDialogVisible.value = false
  await goAction(coachNextActionPath.value)
}

const firstRouteQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const applyRouteAsyncDiagnosticQuery = () => {
  const routeBizType = firstRouteQueryString(route.query.bizType || route.query.type)
  const routeBizId = firstRouteQueryString(route.query.bizId)
  const routeMessageId = firstRouteQueryString(route.query.messageId)
  const routeTraceId = firstRouteQueryString(route.query.traceId)
  const routeStatus = firstRouteQueryString(route.query.status)
  const routeKeyword = firstRouteQueryString(route.query.keyword)
  if (!routeBizType && !routeBizId && !routeMessageId && !routeTraceId && !routeStatus && !routeKeyword) return false

  asyncQuery.pageNum = 1
  asyncQuery.bizType = ''
  asyncQuery.status = ''
  asyncQuery.bizId = ''
  asyncQuery.messageId = ''
  asyncQuery.traceId = ''
  asyncQuery.keyword = ''
  if (routeBizType) asyncQuery.bizType = routeBizType
  if (routeStatus) asyncQuery.status = routeStatus.toUpperCase()
  if (routeBizId) asyncQuery.bizId = routeBizId
  if (routeMessageId) asyncQuery.messageId = routeMessageId
  if (routeTraceId) asyncQuery.traceId = routeTraceId
  if (routeKeyword) asyncQuery.keyword = routeKeyword
  asyncDiagnosticKeyword.value = routeMessageId
    ? `message:${routeMessageId}`
    : routeTraceId
      ? `trace:${routeTraceId}`
      : routeBizId || routeKeyword
  return true
}

watch(
  () => [route.query.bizType, route.query.type, route.query.bizId, route.query.messageId, route.query.traceId, route.query.status, route.query.keyword],
  () => {
    if (applyRouteAsyncDiagnosticQuery()) {
      void fetchAsyncTasks()
    }
  }
)

onMounted(() => {
  applyRouteAsyncDiagnosticQuery()
  void fetchTasks()
  void fetchAsyncTasks()
})
</script>

<style scoped lang="scss">
.agent-task-page {
  display: grid;
  gap: 14px;
}

.task-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.task-eyebrow,
.task-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-eyebrow {
  margin-bottom: 10px;
  color: var(--user-primary);
  font-size: 13px;
  font-weight: 700;
}

.task-hero h1 {
  margin: 0;
  color: var(--user-text);
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0;
}

.task-hero p {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--user-text-muted);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.metric-card {
  min-height: 88px;
  padding: 12px 14px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;

  &:last-child {
    border-right: 0;
  }
}

.metric-card span {
  color: var(--user-text-muted);
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin-top: 8px;
  color: var(--user-text);
  font-size: 24px;
  line-height: 1.1;
}

.metric-card p {
  margin: 8px 0 0;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.recovery-panel {
  display: grid;
  grid-template-columns: minmax(260px, 0.92fr) minmax(0, 1.4fr);
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.recovery-panel__copy {
  padding: 6px 4px;
}

.recovery-panel__copy span {
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}

.recovery-panel__copy strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text, #111827);
  font-size: 18px;
  line-height: 1.45;
}

.recovery-panel__copy p {
  margin: 10px 0 0;
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.7;
}

.recovery-links {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.recovery-link {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.recovery-link:hover {
  border-color: var(--user-primary-border);
  background: var(--user-primary-soft);
}

.recovery-link strong,
.recovery-link small {
  display: block;
}

.recovery-link strong {
  color: var(--app-text, #111827);
  font-size: 13px;
  line-height: 1.35;
}

.recovery-link small {
  margin-top: 4px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.45;
}

.async-task-panel {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
  overflow: hidden;
}

.async-task-panel__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.7fr);
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--user-border);
  background: var(--user-surface-muted);

  span {
    color: var(--user-primary);
    font-size: 13px;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--app-text, #111827);
    font-size: 18px;
    line-height: 1.4;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted, #64748b);
    font-size: 13px;
    line-height: 1.65;
  }
}

.async-task-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.75fr) minmax(180px, 1.1fr) auto;
  gap: 10px;
  align-items: center;
}

.async-active-filters {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-top: 4px;

  > span {
    color: var(--app-text-muted, #64748b);
    font-size: 12px;
    font-weight: 600;
  }

  :deep(.el-tag) {
    max-width: 100%;
  }

  :deep(.el-tag__content) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.async-task-list {
  min-height: 160px;
  padding: 16px 18px 18px;
}

.async-task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-left: 4px solid #94a3b8;
  border-radius: 8px;
  background: var(--user-surface);

  & + & {
    margin-top: 12px;
  }

  &.is-running,
  &.is-pending {
    border-left-color: #2563eb;
  }

  &.is-success {
    border-left-color: #16a34a;
  }

  &.is-failed,
  &.is-dead {
    border-left-color: #ef4444;
  }

  h3 {
    margin: 8px 0 0;
    color: var(--app-text, #111827);
    font-size: 16px;
    line-height: 1.35;
  }
}

.async-task-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  > span {
    color: var(--app-text-muted, #64748b);
    font-size: 12px;
    font-weight: 600;
  }
}

.async-task-card__actions {
  display: grid;
  min-width: 128px;
  gap: 8px;
}

.task-recovery-hint {
  margin: 8px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.task-panel {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
  overflow: hidden;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(230px, 1.1fr) repeat(5, minmax(128px, 0.6fr)) auto auto;
  gap: 10px;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--user-border);
  background: var(--user-surface-muted);
}

.filter-bar :deep(.el-date-editor),
.filter-bar :deep(.el-select) {
  width: 100%;
}

.task-stream {
  min-height: 260px;
  padding: 18px;
}

.task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 20px;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-left: 4px solid #94a3b8;
  border-radius: 8px;
  background: var(--user-surface);
}

.task-card + .task-card {
  margin-top: 14px;
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

.task-card.is-expired {
  border-left-color: #ef4444;
}

.task-card__main {
  min-width: 0;
}

.task-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.task-date {
  display: block;
  margin-bottom: 6px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
  font-weight: 600;
}

.task-card h2 {
  margin: 0;
  color: var(--user-text);
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0;
}

.task-desc {
  margin: 10px 0 0;
  color: var(--user-text-muted);
  line-height: 1.7;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.task-meta span {
  min-width: 0;
  max-width: 100%;
  padding: 5px 9px;
  border: 1px solid var(--user-border);
  border-radius: 999px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.3;
}

.task-diagnostics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.task-diagnostics span {
  min-width: 0;
  max-width: 100%;
  padding: 4px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.task-review-summary {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);
  color: var(--user-primary);
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

.task-reason,
.task-skip-reason,
.task-feedback-summary,
.task-plan-impact,
.task-failure {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.task-skip-reason {
  border: 1px solid rgba(245, 158, 11, 0.22);
  background: var(--user-warning-soft);
}

.task-feedback-summary {
  border: 1px solid var(--user-primary-border);
  background: var(--user-primary-soft);
  color: var(--user-primary);
}

.task-plan-impact {
  border: 1px solid rgba(20, 184, 166, 0.2);
  background: var(--user-success-soft);
  color: var(--user-success);
}

.task-failure {
  border: 1px solid rgba(239, 68, 68, 0.22);
  background: var(--user-danger-soft);
  color: var(--user-danger);
}

.dialog-helper-text {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.task-card__side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding-left: 18px;
  border-left: 1px solid var(--user-border);
}

.task-progress span {
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.task-progress strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text, #111827);
  font-size: 20px;
}

.task-actions {
  display: grid;
  gap: 8px;
}

.task-actions :deep(.el-button) {
  width: 100%;
  margin-left: 0;
}

.focus-session-bar {
  display: grid;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--user-success-border);
  border-radius: 8px;
  background: var(--user-success-soft);
}

.focus-session-bar div:first-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.focus-session-bar span {
  color: var(--user-success);
  font-size: 12px;
  font-weight: 800;
}

.focus-session-bar strong {
  color: var(--user-text);
  font-size: 14px;
  line-height: 1.35;
}

.focus-session-bar small {
  color: var(--user-text-muted);
  line-height: 1.5;
}

.focus-session-actions {
  display: grid;
  gap: 8px;
}

.more-button {
  color: #475569;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px 18px;
}

.completion-review {
  display: grid;
  gap: 14px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    margin-top: 4px;
    color: var(--user-text);
    font-size: 20px;
    line-height: 1.4;
  }

  p {
    color: var(--user-text-muted);
    line-height: 1.7;
  }

  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding: 10px 12px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-primary-soft);
    color: var(--user-text-secondary);
    line-height: 1.55;
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

.async-detail {
  min-height: 260px;
}

.async-detail__summary {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);

  > span {
    color: var(--user-primary);
    font-size: 13px;
    font-weight: 800;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: #0f172a;
    font-size: 20px;
    line-height: 1.35;
  }

  p {
    color: #475569;
    line-height: 1.7;
  }
}

.async-detail__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 0;

  div {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
  }

  dt {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  dd {
    margin: 5px 0 0;
    color: var(--user-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}

.async-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.async-detail__block {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  strong {
    display: block;
    color: var(--user-text);
    font-size: 13px;
  }

  p {
    margin: 8px 0 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }

  .async-detail__note {
    font-size: 12px;
  }

  .async-detail__list {
    display: grid;
    gap: 8px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }

  .async-detail__list li {
    padding: 9px 10px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  &.is-error {
    border-color: rgba(239, 68, 68, 0.22);
    background: var(--user-danger-soft);

    strong,
    p {
      color: var(--user-danger);
    }
  }
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recovery-panel,
  .recovery-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .async-task-panel__head,
  .async-task-actions {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .task-hero {
    flex-direction: column;
    padding: 22px;
  }

  .task-hero h1 {
    font-size: 24px;
  }

  .hero-actions,
  .hero-actions :deep(.el-button) {
    width: 100%;
  }

  .metric-grid,
  .recovery-panel,
  .recovery-links,
  .async-task-card,
  .filter-bar,
  .task-card {
    grid-template-columns: 1fr;
  }

  .async-task-card__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .async-detail__meta {
    grid-template-columns: 1fr;
  }

  .task-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-card__side {
    padding-left: 0;
    padding-top: 16px;
    border-left: 0;
    border-top: 1px solid var(--user-border);
  }

  .pagination-wrap {
    justify-content: center;
    overflow-x: auto;
  }
}
</style>
