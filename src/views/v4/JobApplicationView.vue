<template>
  <div class="page-shell v4-application-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">我的求职</div>
        <h1>投递工作台</h1>
        <p>处理今天的推进事项，集中查看每一条投递的下一步。</p>
      </div>
      <div class="v4-actions">
        <el-button :icon="RefreshCw" circle :loading="loading" title="刷新投递记录" @click="load" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增投递</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="求职进度加载失败" :description="errorMessage">
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <template v-else>
      <el-alert
        v-if="statsWarning"
        class="stats-warning"
        type="warning"
        show-icon
        :closable="false"
        :title="statsWarning"
      />
      <el-alert
        v-if="listContextNotice"
        class="query-alert"
        type="info"
        show-icon
        :closable="false"
        :title="listContextNotice"
      />
      <el-alert
        v-if="deepLinkMissing"
        class="query-alert"
        type="warning"
        show-icon
        :closable="false"
        title="没有找到深链指定的投递记录，已保留当前列表，你可以新增记录或清空筛选后查看。"
      />
      <nav class="application-view-tabs" aria-label="投递工作台视图">
        <button
          type="button"
          :class="{ 'is-active': activeApplicationView === 'today' }"
          @click="activeApplicationView = 'today'"
        >
          今日推进
        </button>
        <button
          type="button"
          :class="{ 'is-active': activeApplicationView === 'records' }"
          @click="activeApplicationView = 'records'"
        >
          全部记录
          <span>{{ rawApplications.length }}</span>
        </button>
      </nav>

      <section v-if="activeApplicationView === 'today'" class="application-workbench" v-loading="statsLoading">
        <div class="today-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">今日推进</p>
              <h2>先完成最需要处理的投递</h2>
            </div>
            <el-button link type="primary" @click="applyFollowUpFilter('due-today')">查看今日跟进</el-button>
          </div>
          <div v-if="todayFocusApplications.length" class="today-list">
            <article v-for="item in todayFocusApplications" :key="item.id" class="today-row">
              <div class="today-row__main">
                <div class="today-row__title">
                  <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
                  <el-tag :type="tagType(followUpState(item).tone)" size="small" effect="plain">
                    {{ followUpState(item).label }}
                  </el-tag>
                </div>
                <p>{{ followUpDescription(item) }}</p>
              </div>
              <div class="today-row__actions">
                <el-button v-if="applicationWorkspaceEnabled" link type="primary" @click="goWorkspace(item)">
                  工作区
                </el-button>
                <el-button link type="primary" @click="handleTodayAction(item)">{{ todayActionLabel(item) }}</el-button>
              </div>
            </article>
          </div>
          <div v-else class="today-empty">
            <CheckCircle2 :size="18" />
            <span>今天没有待处理的跟进事项。</span>
          </div>
        </div>

        <div class="application-side-rail">
          <aside class="calendar-entry" aria-label="日历与近期安排">
            <div class="calendar-entry__head">
              <div class="calendar-entry__icon"><CalendarDays :size="18" /></div>
              <div>
                <p class="section-kicker">日历与近期安排</p>
                <h2>查看完整时间表</h2>
              </div>
            </div>
            <div v-if="upcomingScheduleApplications.length" class="schedule-list">
              <button
                v-for="item in upcomingScheduleApplications"
                :key="item.id"
                class="schedule-row"
                type="button"
                @click="openScheduledApplication(item)"
              >
                <span>{{ item.nextFollowUpAt || '待定' }}</span>
                <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
              </button>
            </div>
            <p v-else class="muted">近期没有已安排的跟进。</p>
            <el-button class="calendar-entry__action" :icon="ArrowUpRight" @click="goCareerCalendar">
              打开求职日历
            </el-button>
          </aside>

          <aside class="campaign-entry" aria-label="求职周期">
            <div class="campaign-entry__head">
              <div class="campaign-entry__icon"><FolderKanban :size="18" /></div>
              <div>
                <p class="section-kicker">求职周期</p>
                <h2>集中管理一次求职尝试</h2>
              </div>
            </div>
            <p>把相关投递、面试和复盘收进同一个周期，平时只处理当前机会。</p>
            <el-button class="campaign-entry__action" :icon="ArrowUpRight" @click="campaignManagementVisible = true">
              管理求职周期
            </el-button>
          </aside>
        </div>
      </section>

      <template v-else>
      <section class="funnel-section" aria-label="投递状态漏斗">
        <div class="funnel-section__head">
          <div>
            <p class="section-kicker">投递状态</p>
            <h2>按阶段查看进度</h2>
          </div>
          <div class="funnel-overview">
            <span>推进中 <strong>{{ statsNumber(applicationStats?.activeCount) }}</strong></span>
            <span>逾期 <strong class="is-risk">{{ statsNumber(applicationStats?.overdueFollowUpCount) }}</strong></span>
            <span>今日 <strong>{{ statsNumber(applicationStats?.dueTodayFollowUpCount) }}</strong></span>
          </div>
        </div>
        <div class="status-funnel">
          <button
            v-for="item in funnelItems"
            :key="item.key"
            class="funnel-item"
            :class="{ 'is-active': isFunnelItemActive(item) }"
            type="button"
            :title="item.actionHint"
            @click="applyFunnelStage(item)"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
      </section>

      <section class="records-section">
        <div class="records-toolbar">
          <div>
            <p class="section-kicker">投递记录</p>
            <h2>{{ applications.length }} 条记录</h2>
          </div>
          <div class="records-filters">
            <el-select v-model="status" clearable placeholder="全部状态" @change="applyStatusFilter">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="followUpFilter" clearable placeholder="跟进筛选" @change="applyFollowUpFilter">
              <el-option v-for="item in followUpFilterOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button v-if="hasListFilter" :icon="RotateCcw" circle title="清空筛选" @click="clearStatusFilter" />
          </div>
        </div>
        <p v-if="listContextNotice" class="list-context">{{ listContextNotice }}</p>

        <div class="v4-list" v-loading="loading">
          <article v-for="item in applications" :key="item.id" class="v4-row" :class="{ 'is-highlighted': item.id === highlightedApplicationId }">
            <div class="v4-row-head">
              <div class="v4-row__main">
                <div class="record-title">
                  <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
                  <el-tag>{{ statusLabel(item.status) }}</el-tag>
                  <template v-for="followUp in [followUpTag(item)]" :key="`${item.id}-follow-up`">
                    <el-tag v-if="followUp" :type="followUp.type" size="small" effect="plain">{{ followUp.label }}</el-tag>
                  </template>
                </div>
                <p class="muted">
                  {{ sourceLabel(item.source) }} · 投递 {{ item.appliedAt || '--' }} · 下次跟进 {{ item.nextFollowUpAt || '--' }}
                </p>
                <p class="muted row-meta">
                  <span>{{ resumeVersionLabel(item) }}</span>
                  <span v-if="item.matchReportId">匹配报告 #{{ item.matchReportId }}</span>
                  <span>{{ latestEventText(item) }}</span>
                </p>
                <div class="quality-tags">
                  <el-tag
                    v-for="tag in dataQualityTags(item)"
                    :key="`${item.id}-${tag.key}`"
                    :type="tagType(tag.tone)"
                    size="small"
                    effect="plain"
                    :title="tag.description"
                  >
                    {{ tag.label }}
                  </el-tag>
                </div>
                <p class="follow-up-note" :class="`follow-up-note--${followUpState(item).key}`">
                  {{ followUpDescription(item) }}
                </p>
                <p v-if="item.note" class="muted record-note">{{ item.note }}</p>
              </div>
              <div class="record-actions">
                <el-button v-if="applicationWorkspaceEnabled" link type="primary" @click="goWorkspace(item)">
                  工作区
                </el-button>
                <el-dropdown trigger="click" @command="(command: string) => handleRecordAction(item, command)">
                  <el-button :icon="MoreHorizontal" circle title="更多投递操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="draft">跟进助手</el-dropdown-item>
                      <el-dropdown-item command="interview">文本面试</el-dropdown-item>
                      <el-dropdown-item command="events">事件记录</el-dropdown-item>
                      <el-dropdown-item command="edit">编辑投递</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </article>
          <AppState
            v-if="!applications.length && !loading"
            type="empty"
            :title="applicationEmptyTitle"
            :description="applicationEmptyDescription"
          >
            <div class="empty-actions">
              <el-button v-if="hasListFilter" @click="clearStatusFilter">清空筛选</el-button>
              <el-button type="primary" :icon="Plus" @click="openCreate">新增第一条投递</el-button>
            </div>
          </AppState>
        </div>
      </section>
      </template>
    </template>

    <el-dialog v-model="dialogVisible" title="求职进度" width="620px">
      <el-form ref="applicationFormRef" :model="form" :rules="applicationFormRules" label-position="top">
        <el-form-item label="公司" prop="companyName">
          <el-input v-model.trim="form.companyName" />
        </el-form-item>
        <el-form-item label="岗位名称" prop="jobTitle">
          <el-input v-model.trim="form.jobTitle" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="form.source" allow-create clearable filterable placeholder="选择或输入来源" style="width: 100%">
            <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联简历">
          <el-select
            v-model="form.resumeId"
            clearable
            filterable
            :loading="resumeLoading"
            placeholder="选择简历"
            style="width: 100%"
            @change="handleResumeChange"
          >
            <el-option
              v-for="item in resumeOptions"
              :key="item.id"
              :label="resumeOptionLabel(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联简历版本">
          <el-select
            v-model="form.resumeVersionId"
            clearable
            filterable
            :disabled="!form.resumeId"
            :loading="resumeVersionLoading"
            placeholder="选择简历版本"
            style="width: 100%"
          >
            <el-option
              v-for="item in resumeVersionOptions"
              :key="item.id"
              :label="resumeVersionOptionLabel(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下次跟进时间">
          <el-date-picker v-model="form.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="campaignManagementVisible"
      class="campaign-management-drawer"
      title="求职周期管理"
      size="min(760px, 100vw)"
      destroy-on-close
    >
      <CareerCampaignPanel v-if="campaignManagementVisible" />
    </el-drawer>

    <el-drawer v-model="eventsVisible" :title="eventsDrawerTitle" size="560px">
      <div class="drawer-actions">
        <el-button type="primary" @click="openEventCreate()">新增事件</el-button>
        <el-button @click="openSelectedDraft('follow-up')">跟进信草稿</el-button>
        <el-button @click="openSelectedDraft('thank-you')">感谢信草稿</el-button>
        <el-button @click="openSelectedDraft('rejection-review')">拒信复盘</el-button>
        <el-button @click="openSelectedDraft('no-response-review')">无反馈复盘</el-button>
        <el-button @click="openSelectedDraft('interview-feedback-review')">面试后复盘</el-button>
        <el-button :loading="eventsLoading" @click="loadEvents">刷新</el-button>
      </div>
      <el-alert
        class="outbound-boundary-alert"
        type="warning"
        show-icon
        :closable="false"
        title="跟进助手只生成草稿和事件记录，不会自动发送；请你确认内容后自行发送。"
      />
      <div class="event-list" v-loading="eventsLoading">
        <article v-for="item in events" :key="item.id" class="event-row">
          <div class="event-row__head">
            <strong>{{ eventTypeLabel(item.eventType) }}</strong>
            <span>{{ item.eventTime || '--' }}</span>
          </div>
          <p>{{ item.summary || '--' }}</p>
          <div v-if="isApplicationEventReviewSupported(item.eventType)" class="event-row__actions">
            <el-button
              link
              type="primary"
              :loading="isReviewGenerating(item)"
              :disabled="isReviewGenerating(item)"
              @click="openEventReviewDialog(item, Boolean(structuredReview(item)))"
            >
              {{ structuredReview(item) ? '重新生成' : '生成 AI 复盘' }}
            </el-button>
          </div>
          <ApplicationEventReviewPanel
            :review="structuredReview(item)"
            :legacy-text="structuredReview(item) ? '' : formatApplicationReview(item)"
          />
        </article>
        <AppState
          v-if="eventsError && !eventsLoading"
          type="error"
          title="求职事件加载失败"
          :description="eventsError"
        >
          <div class="empty-actions">
            <el-button type="primary" :loading="eventsLoading" @click="loadEvents">重新加载</el-button>
          </div>
        </AppState>
        <AppState
          v-else-if="!events.length && !eventsLoading"
          type="empty"
          title="当前进度还没有事件"
          description="可以记录一次跟进、面试安排、复盘或录用通知/拒信，后续回看会更清楚。"
        >
          <div class="empty-actions">
            <el-button type="primary" @click="openEventCreate()">新增事件</el-button>
          </div>
        </AppState>
      </div>
    </el-drawer>

    <el-dialog v-model="eventDialogVisible" title="新增求职事件" width="560px">
      <el-form ref="eventFormRef" :model="eventForm" :rules="eventFormRules" label-position="top">
        <el-form-item label="事件类型" prop="eventType">
          <el-select v-model="eventForm.eventType" allow-create filterable placeholder="选择或输入事件类型" style="width: 100%">
            <el-option v-for="item in eventTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="eventStatusImpactText"
          class="event-impact-alert"
          type="info"
          show-icon
          :closable="false"
          :title="eventStatusImpactText"
        />
        <el-form-item label="事件时间" prop="eventTime">
          <el-date-picker v-model="eventForm.eventTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="关键摘要" prop="summary">
          <el-input v-model.trim="eventForm.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
        <ApplicationEventReviewFields
          v-if="eventReviewScenario"
          :observed-facts-text="eventReviewForm.observedFactsText"
          :external-feedback="eventReviewForm.externalFeedback"
          :self-reflection="eventReviewForm.selfReflection"
          :seed="eventReviewSeed"
          @update:observed-facts-text="eventReviewForm.observedFactsText = $event"
          @update:external-feedback="eventReviewForm.externalFeedback = $event"
          @update:self-reflection="eventReviewForm.selfReflection = $event"
        />
        <el-form-item v-else label="复盘要点">
          <el-input
            v-model="eventForm.reviewJson"
            type="textarea"
            :rows="4"
            placeholder="例如：二面反馈偏重项目复盘，下一步补充缓存和消息队列案例。"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button :loading="saving" @click="createEvent(false)">保存事件</el-button>
        <el-button
          v-if="eventReviewScenario"
          type="primary"
          :loading="saving"
          data-testid="save-and-generate-application-review"
          @click="createEvent(true)"
        >
          保存并生成 AI 复盘
        </el-button>
      </template>
    </el-dialog>

    <ApplicationEventReviewDialog
      :visible="reviewDialogVisible"
      :force="reviewDialogForce"
      :saving="reviewSaving"
      :observed-facts-text="reviewDialogForm.observedFactsText"
      :external-feedback="reviewDialogForm.externalFeedback"
      :self-reflection="reviewDialogForm.selfReflection"
      :seed="reviewDialogSeed"
      @update:visible="reviewDialogVisible = $event"
      @update:observed-facts-text="reviewDialogForm.observedFactsText = $event"
      @update:external-feedback="reviewDialogForm.externalFeedback = $event"
      @update:self-reflection="reviewDialogForm.selfReflection = $event"
      @generate="generateEventReview"
    />

    <el-dialog v-model="draftDialogVisible" :title="selectedDraft?.title || '跟进助手'" width="680px">
      <template v-if="selectedDraft">
        <el-alert
          class="outbound-boundary-alert"
          type="warning"
          show-icon
          :closable="false"
          :title="selectedDraft.boundaryNotice"
        />
        <el-form label-position="top">
          <el-form-item label="草稿内容">
            <el-input :model-value="selectedDraft.draftBody" type="textarea" :rows="8" readonly />
          </el-form-item>
          <el-form-item label="将保存到事件的摘要">
            <el-input :model-value="selectedDraft.summary" type="textarea" :rows="2" readonly />
          </el-form-item>
          <el-form-item label="复盘字段与实验输入">
            <el-input :model-value="selectedDraftReviewText" type="textarea" :rows="6" readonly />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="draftDialogVisible = false">关闭</el-button>
        <el-button :disabled="!selectedDraft" @click="copySelectedDraft">复制草稿</el-button>
        <el-button type="primary" :disabled="!selectedDraft" @click="saveSelectedDraftAsEvent">保存为事件记录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowUpRight, CalendarDays, CheckCircle2, FolderKanban, MoreHorizontal, Plus, RefreshCw, RotateCcw } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createApplicationApi,
  createApplicationEventApi,
  getApplicationEventsApi,
  getApplicationStatsApi,
  getApplicationsApi,
  getResumeVersionsApi,
  updateApplicationApi,
  type JobApplicationEventVO,
  type JobApplicationStatsVO,
  type JobApplicationVO,
  type ResumeVersionVO
} from '@/api/v4'
import { generateApplicationEventAiReviewApi } from '@/api/careerGrowth'
import { getResumesApi } from '@/api/resume'
import AppState from '@/components/common/AppState.vue'
import { appConfig } from '@/config'
import ApplicationEventReviewDialog from '@/views/application/components/ApplicationEventReviewDialog.vue'
import ApplicationEventReviewFields from '@/views/application/components/ApplicationEventReviewFields.vue'
import ApplicationEventReviewPanel from '@/views/application/components/ApplicationEventReviewPanel.vue'
import CareerCampaignPanel from '@/views/application/components/CareerCampaignPanel.vue'
import {
  applicationFollowUpFilterOptions,
  applicationStatusOptions,
  buildApplicationEventReviewGenerateRequest,
  buildApplicationEventReviewSeed,
  buildApplicationOutboundDraft,
  buildApplicationFunnelStages,
  buildBackendLatestApplicationEvent,
  canApplyApplicationEventStatusChange,
  createApplicationEventReviewSingleFlight,
  filterApplicationsByFollowUp,
  formatApplicationResumeVersionLabel,
  getApplicationDataQualityTags,
  getApplicationEventMeta,
  getApplicationEventLegacyReview,
  getApplicationEventReviewScenario,
  getApplicationEventStructuredReview,
  getApplicationFollowUpState,
  getApplicationStageMeta,
  getApplicationStatusFromEventType,
  isApplicationActiveStatus,
  isApplicationEventReviewGenerating,
  isApplicationEventReviewSupported,
  parseApplicationListQuery,
  saveApplicationEventWithOptionalReview,
  shouldShowApplicationForFunnelStage,
  type ApplicationDataQualityTag,
  type ApplicationDeepLinkFollowUpFilter,
  type ApplicationDraftKind,
  type ApplicationEventReviewSeed,
  type ApplicationEventStructuredReview,
  type ApplicationFunnelStage,
  type ApplicationOutboundDraft
} from '@/features/applications'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'
import { formatLocalDateTime } from '@/utils/format'
import type { ResumeVO } from '@/types/resume'

const route = useRoute()
const router = useRouter()
const applicationWorkspaceEnabled = computed(() => appConfig.enableV7CampaignWorkspace)

const statusOptions = applicationStatusOptions
const followUpFilterOptions = applicationFollowUpFilterOptions

const sourceOptions = [
  { label: 'BOSS 直聘', value: 'BOSS' },
  { label: 'LinkedIn', value: 'LinkedIn' },
  { label: '内推', value: 'Referral' },
  { label: '官网投递', value: 'OFFICIAL_SITE' },
  { label: '自定义来源', value: 'CUSTOM' }
]

const eventTypeOptions = [
  { label: '已投递', value: 'APPLIED' },
  { label: '跟进事项', value: 'FOLLOW_UP' },
  { label: '跟进信草稿', value: 'OUTBOUND_FOLLOW_UP_DRAFT' },
  { label: '感谢信草稿', value: 'THANK_YOU_DRAFT' },
  { label: '面试安排', value: 'INTERVIEW' },
  { label: '录用通知', value: 'OFFER' },
  { label: '普通记录', value: 'NOTE' },
  { label: '复盘记录', value: 'REVIEW' },
  { label: '拒信记录', value: 'REJECTION' },
  { label: '拒信复盘', value: 'REJECTION_REVIEW' },
  { label: '无反馈复盘', value: 'NO_RESPONSE_REVIEW' },
  { label: '面试反馈复盘', value: 'INTERVIEW_FEEDBACK_REVIEW' },
  { label: '关闭记录', value: 'CLOSED' }
]

const loading = ref(false)
const statsLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const statsWarning = ref('')
const resumeLoading = ref(false)
const resumeVersionLoading = ref(false)
const status = ref('')
const followUpFilter = ref<ApplicationDeepLinkFollowUpFilter | ''>('')
const funnelStageFilter = ref<ApplicationFunnelStage['key'] | ''>('')
const highlightedApplicationId = ref<number>()
const pendingOpenEvents = ref(false)
const pendingEventDraft = ref<Partial<JobApplicationEventVO>>()
const deepLinkMissing = ref(false)
const suppressNextRouteQuery = ref(false)
const dialogVisible = ref(false)
const campaignManagementVisible = ref(false)
const activeApplicationView = ref<'today' | 'records'>('today')
const editingId = ref<number>()
const rawApplications = ref<JobApplicationVO[]>([])
const resumeOptions = ref<ResumeVO[]>([])
const resumeVersionOptions = ref<ResumeVersionVO[]>([])
const applicationStats = ref<JobApplicationStatsVO>()
const eventsVisible = ref(false)
const eventsLoading = ref(false)
const eventDialogVisible = ref(false)
const reviewDialogVisible = ref(false)
const reviewDialogForce = ref(false)
const reviewSaving = ref(false)
const reviewDialogEvent = ref<JobApplicationEventVO>()
const reviewGeneratingEventIds = ref<Set<number>>(new Set())
const draftDialogVisible = ref(false)
const selectedApplication = ref<JobApplicationVO>()
const selectedDraft = ref<ApplicationOutboundDraft>()
const events = ref<JobApplicationEventVO[]>([])
const eventsError = ref('')
const applicationFormRef = ref<FormInstance>()
const eventFormRef = ref<FormInstance>()

const form = reactive<Partial<JobApplicationVO>>({
  status: 'SAVED',
  jobTitle: '',
  companyName: '',
  source: 'CUSTOM',
  note: ''
})

const eventForm = reactive<Partial<JobApplicationEventVO>>({
  eventType: 'NOTE',
  eventTime: '',
  summary: '',
  reviewJson: ''
})

const eventReviewForm = reactive({
  observedFactsText: '',
  externalFeedback: '',
  selfReflection: ''
})

const reviewDialogForm = reactive({
  observedFactsText: '',
  externalFeedback: '',
  selfReflection: ''
})

const reviewSingleFlight = createApplicationEventReviewSingleFlight()

const applicationFormRules: FormRules<Partial<JobApplicationVO>> = {
  companyName: [{ required: true, whitespace: true, message: '请填写公司名称。', trigger: 'blur' }],
  jobTitle: [{ required: true, whitespace: true, message: '请填写岗位名称。', trigger: 'blur' }],
  status: [{ required: true, message: '请选择投递状态。', trigger: 'change' }]
}

const eventFormRules: FormRules<Partial<JobApplicationEventVO>> = {
  eventType: [{ required: true, whitespace: true, message: '请选择或填写事件类型。', trigger: 'change' }],
  eventTime: [{ required: true, message: '请选择事件时间。', trigger: 'change' }],
  summary: [{ required: true, whitespace: true, message: '请填写关键摘要。', trigger: 'blur' }]
}

const validateForm = async (formRef: FormInstance | undefined, fallbackMessage: string) => {
  if (!formRef) return true
  try {
    return await formRef.validate()
  } catch {
    ElMessage.warning(fallbackMessage)
    return false
  }
}

const hasListFilter = computed(() => Boolean(status.value || followUpFilter.value || funnelStageFilter.value))
const applicationEmptyTitle = computed(() => hasListFilter.value ? '当前筛选没有进度' : '还没有求职进度')
const applicationEmptyDescription = computed(() =>
  hasListFilter.value
    ? '当前筛选条件下没有记录，清空筛选后可以查看全部投递进度。'
    : '先记录一条公司、岗位、来源和下次跟进时间，例如 BOSS、LinkedIn、内推或官网投递。'
)
const statusLabel = (value?: string) => getApplicationStageMeta(value).label || (value ? '状态待确认' : '--')
const sourceLabel = (value?: string) => sourceOptions.find((item) => item.value === value)?.label || (value ? '自定义来源' : '来源待填写')
const eventTypeLabel = (value?: string) => getApplicationEventMeta(value).label || (value ? '记录事项' : '--')
const resumeOptionLabel = (item: ResumeVO) =>
  item.resumeName || item.title || item.targetPosition || `简历 #${item.id}`
const resumeVersionOptionLabel = (item: ResumeVersionVO) => {
  const name = item.versionName || `版本 ${item.versionNo || item.id}`
  return item.currentFlag === 1 ? `${name}（当前）` : name
}

const statsNumber = (value?: number) => value ?? 0
const applications = computed(() => {
  let rows = [...rawApplications.value]
  if (status.value) {
    rows = rows.filter((item) => item.status === status.value)
  }
  if (followUpFilter.value) {
    rows = filterApplicationsByFollowUp(rows, followUpFilter.value)
  }
  if (funnelStageFilter.value) {
    rows = rows.filter((item) => shouldShowApplicationForFunnelStage(item, funnelStageFilter.value))
  }

  if (highlightedApplicationId.value && !rows.some((item) => item.id === highlightedApplicationId.value)) {
    const target = rawApplications.value.find((item) => item.id === highlightedApplicationId.value)
    if (target) return [target, ...rows]
  }

  return rows
})
const funnelItems = computed(() => buildApplicationFunnelStages(rawApplications.value, applicationStats.value))
const focusPriority = (item: JobApplicationVO) => {
  const state = followUpState(item)
  if (state.key === 'overdue') return 0
  if (state.key === 'due-today') return 1
  if (state.key === 'missing') return 2
  return 3
}
const byNextFollowUp = (left: JobApplicationVO, right: JobApplicationVO) => {
  const leftTime = left.nextFollowUpAt || '9999-12-31 23:59:59'
  const rightTime = right.nextFollowUpAt || '9999-12-31 23:59:59'
  return leftTime.localeCompare(rightTime)
}
const todayFocusApplications = computed(() =>
  rawApplications.value
    .filter((item) => isApplicationActiveStatus(item.status))
    .sort((left, right) => focusPriority(left) - focusPriority(right) || byNextFollowUp(left, right))
    .slice(0, 3)
)
const upcomingScheduleApplications = computed(() =>
  rawApplications.value
    .filter((item) => isApplicationActiveStatus(item.status) && Boolean(item.nextFollowUpAt))
    .sort(byNextFollowUp)
    .slice(0, 3)
)
const listContextNotice = computed(() => {
  const parts: string[] = []
  if (status.value) parts.push(`状态：${statusLabel(status.value)}`)
  if (followUpFilter.value) {
    parts.push(`跟进：${followUpFilterOptions.find((item) => item.value === followUpFilter.value)?.label || followUpFilter.value}`)
  }
  if (funnelStageFilter.value) {
    parts.push(`漏斗：${funnelItems.value.find((item) => item.key === funnelStageFilter.value)?.label || funnelStageFilter.value}`)
  }
  if (highlightedApplicationId.value) parts.push(`定位投递 #${highlightedApplicationId.value}`)
  return parts.length ? `当前列表筛选：${parts.join(' / ')}` : ''
})
const eventsDrawerTitle = computed(() => {
  const item = selectedApplication.value
  if (!item) return '求职事件'
  return `求职事件：${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'}`
})
const selectedDraftReviewText = computed(() => {
  if (!selectedDraft.value) return ''
  return [
    selectedDraft.value.reviewJson,
    '',
    `实验输入：${selectedDraft.value.experimentInput.join('；')}`
  ].join('\n')
})
const eventReviewScenario = computed(() => getApplicationEventReviewScenario(eventForm.eventType))
const eventReviewSeed = computed<ApplicationEventReviewSeed | undefined>(() => {
  const scenario = eventReviewScenario.value
  return scenario && selectedApplication.value
    ? buildApplicationEventReviewSeed(selectedApplication.value, scenario)
    : undefined
})
const reviewDialogSeed = computed<ApplicationEventReviewSeed | undefined>(() => {
  const scenario = getApplicationEventReviewScenario(reviewDialogEvent.value?.eventType)
  return scenario && selectedApplication.value
    ? buildApplicationEventReviewSeed(selectedApplication.value, scenario)
    : undefined
})

type FollowUpTag = {
  label: string
  type: 'danger' | 'warning' | 'success' | 'info'
}

const tagType = (tone?: ApplicationDataQualityTag['tone'] | 'primary'): 'danger' | 'warning' | 'success' | 'info' =>
  tone === 'danger' || tone === 'warning' || tone === 'success' ? tone : 'info'

const followUpTag = (item: JobApplicationVO): FollowUpTag | null => {
  if (!isApplicationActiveStatus(item.status)) return null
  const followUp = getApplicationFollowUpState(item.nextFollowUpAt)
  return { label: followUp.label, type: tagType(followUp.tone) }
}

const dataQualityTags = (item: JobApplicationVO) => getApplicationDataQualityTags(item)
const followUpState = (item: JobApplicationVO) => getApplicationFollowUpState(item.nextFollowUpAt)
const followUpDescription = (item: JobApplicationVO) => {
  if (!isApplicationActiveStatus(item.status)) return '该记录已结束，不进入今日跟进候选。'
  const state = followUpState(item)
  if (state.key === 'overdue' && state.overdueByDays) {
    return `${state.description}，已超过 ${state.overdueByDays} 天。`
  }
  if (state.key === 'upcoming' && state.dueInDays) {
    return `${state.description}，距离跟进约 ${state.dueInDays} 天。`
  }
  return state.description
}
const resumeVersionLabel = (item: JobApplicationVO) => formatApplicationResumeVersionLabel(item)
const goInterviewCreate = (item: JobApplicationVO) => {
  router.push({
    path: '/interviews/create',
    query: {
      source: 'application',
      applicationId: item.id,
      targetJobId: item.targetJobId,
      resumeId: item.resumeId,
      resumeVersionId: item.resumeVersionId,
      matchReportId: item.matchReportId
    }
  })
}

const goWorkspace = (item: JobApplicationVO) => {
  if (!applicationWorkspaceEnabled.value) {
    ElMessage.info('投递工作区当前未开放，请先使用本页跟进助手或事件记录。')
    return
  }
  void router.push(`/applications/${encodeURIComponent(String(item.id))}`)
}
const openScheduledApplication = (item: JobApplicationVO) => {
  if (applicationWorkspaceEnabled.value) {
    goWorkspace(item)
    return
  }
  goCareerCalendar()
}
const goCareerCalendar = () => {
  void router.push('/career-calendar')
}
const todayActionLabel = (item: JobApplicationVO) =>
  followUpState(item).key === 'missing' ? '补充时间' : '起草跟进'
const handleTodayAction = (item: JobApplicationVO) => {
  if (followUpState(item).key === 'missing') {
    openEdit(item)
    return
  }
  void openDraftAssistant(item, 'follow-up')
}
const latestEventText = (item: JobApplicationVO) => {
  const latestEvent = buildBackendLatestApplicationEvent(item)
  if (!latestEvent) return '最新事件：暂无事件记录'
  return `最新事件：${latestEvent.meta.label} · ${latestEvent.timeText} · ${latestEvent.summaryText}`
}

const eventStatusImpact = computed(() => getApplicationStatusFromEventType(eventForm.eventType))
const eventStatusImpactText = computed(() => {
  const nextStatus = eventStatusImpact.value
  if (!nextStatus) return ''
  const currentStatus = selectedApplication.value?.status
  if (canApplyApplicationEventStatusChange(currentStatus, nextStatus)) {
    return `保存后会同步主状态为：${statusLabel(nextStatus)}`
  }
  return `该事件会进入时间线；当前主状态为 ${statusLabel(currentStatus)}，不会被回退为 ${statusLabel(nextStatus)}。`
})
const eventStatusImpactTip = computed(() =>
  eventStatusImpactText.value || '当前事件类型不会自动改动主状态，只会写入事件时间线。'
)

const reviewFieldLabels: Record<string, string> = {
  source: '来源',
  draftOnly: '仅草稿',
  generatedAt: '生成时间',
  companyName: '公司',
  jobTitle: '岗位',
  latestEvent: '最新事件',
  scenario: '场景',
  score: '评分',
  facts: '事实',
  assumptions: '假设',
  followUpState: '跟进状态',
  nextExperimentInputs: '下一轮实验输入',
  nextStep: '下一步',
  nextSteps: '下一步',
  action: '行动',
  actionItems: '行动项',
  summary: '复盘',
  strengths: '亮点',
  weakness: '短板',
  risks: '风险提醒',
  improvement: '改进点',
  note: '备注',
  result: '结果'
}

const stringifyReviewValue = (value: unknown): string => {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) {
    return value.map((item) => stringifyReviewValue(item)).filter(Boolean).join('；')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = stringifyReviewValue(item)
        return text ? `${reviewFieldLabels[key] || key}：${text}` : ''
      })
      .filter(Boolean)
      .join('；')
  }
  return String(value)
}

const parseReviewValue = (item: JobApplicationEventVO): Record<string, unknown> | string | null => {
  return getApplicationEventLegacyReview(item)
}

const formatApplicationReview = (item: JobApplicationEventVO) => {
  const review = parseReviewValue(item)
  if (!review) return ''
  if (typeof review === 'string') return review

  return Object.entries(review)
    .map(([key, value]) => {
      const text = stringifyReviewValue(value)
      return text ? `${reviewFieldLabels[key] || key}：${text}` : ''
    })
    .filter(Boolean)
    .join('；')
}

const structuredReview = (item: JobApplicationEventVO) =>
  getApplicationEventStructuredReview(item)

const isReviewGenerating = (item: JobApplicationEventVO) =>
  reviewGeneratingEventIds.value.has(item.id) ||
  isApplicationEventReviewGenerating(structuredReview(item))

const applicationTargetText = () => {
  const company = form.companyName?.trim() || '未填写公司'
  const job = form.jobTitle?.trim() || '未填写岗位'
  const nextFollowUp = form.nextFollowUpAt ? `；下次跟进：${form.nextFollowUpAt}` : ''
  return `${company} · ${job}；状态：${statusLabel(form.status)}；来源：${sourceLabel(form.source)}${nextFollowUp}`
}

const selectedApplicationText = () => {
  const item = selectedApplication.value
  if (!item) return '未选择求职进度'
  return `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'}；当前状态：${statusLabel(item.status)}`
}

const previewApplicationSave = () =>
  confirmDangerActionPreview({
    title: editingId.value ? '更新求职进度预览' : '新增求职进度预览',
    action: editingId.value ? '更新一条求职进度' : '新增一条求职进度',
    target: applicationTargetText(),
    impact:
      '会写入求职进度列表，并可能被后续今日行动、求职复盘、成长画像和训练建议引用；状态、来源和跟进时间会影响下一步提醒。',
    rollback: '保存后不会自动恢复旧状态；如公司、岗位、状态或跟进时间填错，需要再次编辑该进度修正。',
    audit: '可按求职进度记录、更新时间和关联事件追踪本次变更。',
    tips: [
      '确认公司、岗位和状态不是临时占位。',
      '确认下次跟进时间会作为后续行动建议参考。',
      form.resumeVersionId ? '已关联简历版本。' : '未关联简历版本时，后续复盘可能缺少投递简历快照。'
    ],
    confirmButtonText: '确认保存'
  })

const previewApplicationEventSave = () =>
  confirmDangerActionPreview({
    title: '新增求职事件预览',
    action: '新增一条求职事件',
    target: `${selectedApplicationText()}；事件：${eventTypeLabel(eventForm.eventType)}；时间：${eventForm.eventTime || '未填写'}`,
    impact:
      '会写入当前求职进度的事件时间线，并可能被后续面试复盘、跟进提醒、今日行动和求职状态判断引用；草稿类事件不会触发任何自动外发。',
    rollback: '当前页面不会自动撤回已保存事件；如记录不准确，需要新增修正事件或在后续治理入口处理。',
    audit: '可按求职进度、事件时间和事件类型追踪本次记录。',
    tips: [
      '确认事件类型与真实进展一致，例如面试、跟进、录用通知或拒信。',
      eventStatusImpactTip.value,
      '如保存的是跟进信或感谢信草稿，请先确认内容，再由你自行复制到外部渠道发送。',
      eventForm.summary?.trim() ? '摘要会作为后续复盘参考，请避免填写敏感联系方式或无关私密内容。' : '建议补充一句摘要，方便后续回看。',
      eventReviewScenario.value
        ? 'AI 复盘会在事件保存成功后单独生成；生成失败不会回滚已经保存的事件。'
        : eventForm.reviewJson?.trim()
          ? '复盘要点会影响后续行动建议，请确认内容准确。'
          : '未填写复盘要点时，后续建议主要依赖事件类型和摘要。'
    ],
    confirmButtonText: '确认保存事件'
  })

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const loadApplications = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    rawApplications.value = await getApplicationsApi()
  } catch (error) {
    rawApplications.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  statsLoading.value = true
  statsWarning.value = ''
  try {
    applicationStats.value = await getApplicationStatsApi()
  } catch (error) {
    applicationStats.value = undefined
    statsWarning.value = getErrorMessage(error)
  } finally {
    statsLoading.value = false
  }
}

const load = async () => {
  await Promise.allSettled([loadApplications(), loadStats()])
}

const loadResumeOptions = async () => {
  if (resumeOptions.value.length || resumeLoading.value) return
  resumeLoading.value = true
  try {
    const page = await getResumesApi({ pageNo: 1, pageSize: 100 })
    resumeOptions.value = page.records
  } catch (error) {
    resumeOptions.value = []
    ElMessage.warning(getErrorMessage(error))
  } finally {
    resumeLoading.value = false
  }
}

const loadResumeVersionOptions = async (resumeId?: number) => {
  resumeVersionOptions.value = []
  if (!resumeId) return
  resumeVersionLoading.value = true
  try {
    resumeVersionOptions.value = await getResumeVersionsApi(resumeId)
  } catch (error) {
    ElMessage.warning(getErrorMessage(error))
  } finally {
    resumeVersionLoading.value = false
  }
}

const prepareResumeSelection = async (resumeId?: number) => {
  await loadResumeOptions()
  await loadResumeVersionOptions(resumeId)
}

const handleResumeChange = async (resumeId?: number) => {
  form.resumeVersionId = undefined
  await loadResumeVersionOptions(resumeId)
}

const replaceListQuery = (suppressRouteApply = false) => {
  const query: Record<string, string> = {}
  if (status.value) query.status = status.value
  if (followUpFilter.value) query.followUp = followUpFilter.value
  suppressNextRouteQuery.value = suppressRouteApply
  void router
    .replace({ path: route.path, query })
    .catch(() => undefined)
    .finally(() => {
      if (suppressRouteApply) globalThis.setTimeout(() => { suppressNextRouteQuery.value = false }, 0)
    })
}

const applyStatusFilter = (value?: string) => {
  status.value = value || ''
  funnelStageFilter.value = ''
  highlightedApplicationId.value = undefined
  pendingOpenEvents.value = false
  pendingEventDraft.value = undefined
  deepLinkMissing.value = false
  replaceListQuery()
}

const applyFollowUpFilter = (value?: ApplicationDeepLinkFollowUpFilter | '') => {
  activeApplicationView.value = 'records'
  followUpFilter.value = value || ''
  funnelStageFilter.value = ''
  highlightedApplicationId.value = undefined
  pendingOpenEvents.value = false
  pendingEventDraft.value = undefined
  deepLinkMissing.value = false
  replaceListQuery()
}

const applyFunnelStage = (item: ApplicationFunnelStage) => {
  activeApplicationView.value = 'records'
  followUpFilter.value = ''
  highlightedApplicationId.value = undefined
  pendingOpenEvents.value = false
  pendingEventDraft.value = undefined
  deepLinkMissing.value = false
  if (item.sourceStatuses.length === 1 && item.key !== 'RESULT') {
    status.value = item.sourceStatuses[0]
    funnelStageFilter.value = ''
  } else {
    status.value = ''
    funnelStageFilter.value = item.key
  }
  replaceListQuery(Boolean(funnelStageFilter.value))
}

const isFunnelItemActive = (item: ApplicationFunnelStage) => {
  if (funnelStageFilter.value) return funnelStageFilter.value === item.key
  return item.sourceStatuses.length === 1 && status.value === item.sourceStatuses[0]
}

const clearStatusFilter = () => {
  status.value = ''
  followUpFilter.value = ''
  funnelStageFilter.value = ''
  highlightedApplicationId.value = undefined
  pendingOpenEvents.value = false
  pendingEventDraft.value = undefined
  deepLinkMissing.value = false
  replaceListQuery()
}

const applyRouteQuery = () => {
  const queryState = parseApplicationListQuery(route.query as Record<string, unknown>)
  activeApplicationView.value = queryState.status || queryState.followUp || queryState.applicationId ? 'records' : 'today'
  status.value = queryState.status || ''
  followUpFilter.value = queryState.followUp || ''
  funnelStageFilter.value = ''
  highlightedApplicationId.value = queryState.applicationId
  pendingOpenEvents.value = Boolean(queryState.applicationId && queryState.openEvents)
  pendingEventDraft.value = queryState.action === 'create-event'
    ? {
        eventType: queryState.eventType || 'FOLLOW_UP',
        eventTime: queryState.eventTime || ''
      }
    : undefined
  deepLinkMissing.value = false
}

const resolveDeepLink = async () => {
  const applicationId = highlightedApplicationId.value
  if (!applicationId) {
    deepLinkMissing.value = false
    return
  }
  const target = rawApplications.value.find((item) => item.id === applicationId)
  deepLinkMissing.value = !target && !loading.value
  if (target && pendingOpenEvents.value) {
    const draft = pendingEventDraft.value
    pendingOpenEvents.value = false
    pendingEventDraft.value = undefined
    await nextTick()
    await openEvents(target)
    if (draft) {
      openEventCreate(draft)
    }
  }
}

const openCreate = () => {
  editingId.value = undefined
  Object.assign(form, {
    id: undefined,
    campaignId: undefined,
    targetJobId: undefined,
    matchReportId: undefined,
    lockVersion: undefined,
    status: 'SAVED',
    jobTitle: '',
    companyName: '',
    source: 'CUSTOM',
    note: '',
    resumeId: undefined,
    resumeVersionId: undefined,
    appliedAt: undefined,
    nextFollowUpAt: ''
  })
  dialogVisible.value = true
  void prepareResumeSelection()
  void nextTick(() => applicationFormRef.value?.clearValidate())
}

const openEdit = (item: JobApplicationVO) => {
  editingId.value = item.id
  Object.assign(form, item)
  dialogVisible.value = true
  void prepareResumeSelection(item.resumeId)
  void nextTick(() => applicationFormRef.value?.clearValidate())
}

const save = async () => {
  if (saving.value) return
  const valid = await validateForm(applicationFormRef.value, '请先补齐公司、岗位和状态。')
  if (!valid) return
  const confirmed = await previewApplicationSave()
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateApplicationApi(editingId.value, form)
    } else {
      await createApplicationApi(form)
    }
    dialogVisible.value = false
    ElMessage.success('已保存')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

const openEvents = async (item: JobApplicationVO) => {
  selectedApplication.value = item
  events.value = []
  eventsError.value = ''
  eventsVisible.value = true
  await loadEvents()
}

const loadEvents = async () => {
  if (!selectedApplication.value) return
  eventsLoading.value = true
  eventsError.value = ''
  try {
    events.value = await getApplicationEventsApi(selectedApplication.value.id)
  } catch (error) {
    events.value = []
    eventsError.value = getErrorMessage(error)
  } finally {
    eventsLoading.value = false
  }
}

const openEventCreate = (draft?: Partial<JobApplicationEventVO>) => {
  const reviewScenario = getApplicationEventReviewScenario(draft?.eventType)
  const reviewSeed = reviewScenario && selectedApplication.value
    ? buildApplicationEventReviewSeed(selectedApplication.value, reviewScenario)
    : undefined
  Object.assign(eventForm, {
    eventType: draft?.eventType || 'NOTE',
    eventTime: draft?.eventTime || formatLocalDateTime(),
    summary: draft?.summary || '',
    reviewJson: draft?.reviewJson || ''
  })
  Object.assign(eventReviewForm, {
    observedFactsText: draft?.reviewJson && reviewSeed
      ? reviewSeed.observedFacts.join('\n')
      : '',
    externalFeedback: '',
    selfReflection: ''
  })
  eventDialogVisible.value = true
  void nextTick(() => eventFormRef.value?.clearValidate())
}

const openDraftAssistant = (item: JobApplicationVO, kind: ApplicationDraftKind) => {
  selectedApplication.value = item
  selectedDraft.value = buildApplicationOutboundDraft(item, kind)
  draftDialogVisible.value = true
}

const handleRecordAction = (item: JobApplicationVO, command: string) => {
  if (command === 'draft') {
    openDraftAssistant(item, 'follow-up')
    return
  }
  if (command === 'interview') {
    goInterviewCreate(item)
    return
  }
  if (command === 'events') {
    void openEvents(item)
    return
  }
  if (command === 'edit') {
    openEdit(item)
  }
}

const openSelectedDraft = (kind: ApplicationDraftKind) => {
  if (!selectedApplication.value) {
    ElMessage.warning('请先选择一条投递进度。')
    return
  }
  selectedDraft.value = buildApplicationOutboundDraft(selectedApplication.value, kind)
  draftDialogVisible.value = true
}

const copySelectedDraft = async () => {
  if (!selectedDraft.value) return
  try {
    await navigator.clipboard.writeText(selectedDraft.value.draftBody)
    ElMessage.success('草稿已复制，请确认和修改后自行发送。')
  } catch {
    ElMessage.warning('复制失败，请手动选中草稿内容复制。')
  }
}

const saveSelectedDraftAsEvent = () => {
  if (!selectedDraft.value) return
  openEventCreate({
    eventType: selectedDraft.value.eventType,
    eventTime: formatLocalDateTime(),
    summary: selectedDraft.value.summary,
    reviewJson: selectedDraft.value.reviewJson
  })
  draftDialogVisible.value = false
}

const setReviewGenerating = (eventId: number, generating: boolean) => {
  const next = new Set(reviewGeneratingEventIds.value)
  if (generating) {
    next.add(eventId)
  } else {
    next.delete(eventId)
  }
  reviewGeneratingEventIds.value = next
}

const requestApplicationEventReview = async (
  applicationId: number,
  event: JobApplicationEventVO,
  input: {
    observedFactsText: string
    externalFeedback: string
    selfReflection: string
  },
  force: boolean
) => {
  const request = buildApplicationEventReviewGenerateRequest(
    {
      observedFacts: input.observedFactsText,
      externalFeedback: input.externalFeedback,
      selfReflection: input.selfReflection
    },
    { force }
  )
  const key = `${applicationId}:${event.id}`
  setReviewGenerating(event.id, true)
  try {
    return await reviewSingleFlight.run(
      key,
      () => generateApplicationEventAiReviewApi(applicationId, event.id, request)
    )
  } finally {
    setReviewGenerating(event.id, false)
  }
}

const reviewGeneratedMessage = (
  review?: ApplicationEventStructuredReview,
  eventSaved = false
) => {
  const prefix = eventSaved ? '事件已保存，' : ''
  return review?.generation.fallback
    ? `${prefix}规则降级复盘已生成。`
    : `${prefix}AI 复盘已生成。`
}

const openEventReviewDialog = (item: JobApplicationEventVO, force: boolean) => {
  if (isReviewGenerating(item)) return
  const review = structuredReview(item)
  const keepPendingInput = !review && reviewDialogEvent.value?.id === item.id
  reviewDialogEvent.value = item
  reviewDialogForce.value = force
  if (!keepPendingInput) {
    Object.assign(reviewDialogForm, {
      observedFactsText: review?.userInput.observedFacts.map((fact) => fact.content).join('\n') || '',
      externalFeedback: review?.userInput.externalFeedback?.content || '',
      selfReflection: review?.userInput.selfReflection || ''
    })
  }
  reviewDialogVisible.value = true
}

const generateEventReview = async () => {
  const applicationId = selectedApplication.value?.id
  const event = reviewDialogEvent.value
  if (!applicationId || !event || reviewSaving.value) return
  reviewSaving.value = true
  try {
    const review = await requestApplicationEventReview(
      applicationId,
      event,
      reviewDialogForm,
      reviewDialogForce.value
    )
    reviewDialogVisible.value = false
    ElMessage.success(reviewGeneratedMessage(review))
    await loadEvents()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    reviewSaving.value = false
  }
}

const createEvent = async (generateReview: boolean) => {
  if (!selectedApplication.value) return
  if (saving.value) return
  const valid = await validateForm(eventFormRef.value, '请先补齐事件类型、事件时间和关键摘要。')
  if (!valid) return
  const confirmed = await previewApplicationEventSave()
  if (!confirmed) return
  const applicationId = selectedApplication.value.id
  const previousApplication = selectedApplication.value
  const nextStatus = eventStatusImpact.value
  const shouldSyncStatus = canApplyApplicationEventStatusChange(previousApplication.status, nextStatus)
  saving.value = true
  try {
    const result = await saveApplicationEventWithOptionalReview({
      saveEvent: () => createApplicationEventApi(applicationId, {
        eventType: eventForm.eventType,
        eventTime: eventForm.eventTime,
        summary: eventForm.summary,
        reviewJson: eventForm.reviewJson || undefined
      }),
      generateReview: generateReview
        ? (savedEvent) => requestApplicationEventReview(
            applicationId,
            savedEvent,
            eventReviewForm,
            false
          )
        : undefined
    })
    eventDialogVisible.value = false
    if (result.reviewError) {
      reviewDialogEvent.value = result.event
      reviewDialogForce.value = false
      Object.assign(reviewDialogForm, eventReviewForm)
      ElMessage.warning('事件已保存，AI 复盘暂未生成，可在事件卡片中重试。')
    } else if (result.review) {
      ElMessage.success(reviewGeneratedMessage(result.review, true))
    } else {
      ElMessage.success('事件已保存')
    }
    await load()
    const refreshed = rawApplications.value.find((item) => item.id === applicationId)
    if (refreshed) {
      selectedApplication.value = refreshed
    } else {
      selectedApplication.value = {
        ...previousApplication,
        ...(shouldSyncStatus && nextStatus ? { status: nextStatus } : {})
      }
      if (status.value && shouldSyncStatus) {
        ElMessage.info('主状态已同步，当前筛选条件下该进度已从列表移出。')
      }
    }
    await loadEvents()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

watch(
  () => route.query,
  async () => {
    if (suppressNextRouteQuery.value) {
      suppressNextRouteQuery.value = false
      return
    }
    applyRouteQuery()
    await resolveDeepLink()
  },
  { deep: true }
)

onMounted(async () => {
  applyRouteQuery()
  await load()
  await resolveDeepLink()
})
</script>

<style scoped lang="scss">
.v4-application-page {
  display: grid;
  gap: 16px;
}

.v4-page-header,
.v4-actions,
.panel-heading,
.calendar-entry__head,
.funnel-section__head,
.records-toolbar,
.records-filters,
.v4-row-head,
.record-title,
.record-actions,
.today-row,
.today-row__title,
.today-row__actions,
.drawer-actions,
.event-row__head {
  display: flex;
  gap: 12px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--app-border);
}

.v4-page-header h1,
.panel-heading h2,
.calendar-entry h2,
.funnel-section h2,
.records-toolbar h2 {
  margin: 0;
}

.v4-page-header h1 {
  margin-top: 6px;
  font-size: 26px;
}

.v4-page-header p,
.muted,
.event-row p,
.event-row span {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow,
.section-kicker {
  margin: 0;
  color: var(--arena-grn-d, var(--app-primary-hover));
  font-size: 13px;
  font-weight: 700;
}

.v4-actions,
.records-filters,
.record-actions,
.drawer-actions {
  flex-wrap: wrap;
  align-items: center;
}

.stats-warning,
.query-alert,
.outbound-boundary-alert {
  border-radius: 8px;
}

.application-view-tabs {
  display: flex;
  width: fit-content;
  max-width: 100%;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.application-view-tabs button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.application-view-tabs button.is-active {
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
  color: var(--arena-grn-d, var(--app-primary-hover));
}

.application-view-tabs span {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  place-items: center;
  border-radius: 999px;
  background: var(--app-surface-muted);
  color: inherit;
  font-size: 11px;
}

.application-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  gap: 16px;
  align-items: start;
  min-width: 0;
}

.application-side-rail {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
}

.today-panel,
.calendar-entry,
.campaign-entry {
  min-width: 0;
  border: 1.5px solid var(--app-border);
  border-radius: var(--arena-radius-card, var(--app-radius));
  background: var(--app-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.today-panel {
  padding: 16px;
}

.panel-heading,
.funnel-section__head,
.records-toolbar {
  align-items: flex-start;
  justify-content: space-between;
}

.panel-heading h2,
.calendar-entry h2,
.funnel-section h2,
.records-toolbar h2 {
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.35;
}

.today-list {
  display: grid;
  margin-top: 14px;
  border-top: 1px solid var(--app-border);
}

.today-row {
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}

.today-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.today-row__main {
  min-width: 0;
}

.today-row__title {
  flex-wrap: wrap;
  align-items: center;
}

.today-row__title strong,
.record-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-row p {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.today-row__actions {
  flex: 0 0 auto;
}

.today-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 104px;
  color: var(--arena-grn-d, var(--app-primary-hover));
}

.calendar-entry {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.calendar-entry__head {
  align-items: flex-start;
}

.calendar-entry__icon,
.campaign-entry__icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #b9e7cd;
  border-radius: 12px;
  color: var(--arena-grn-d, var(--app-primary-hover));
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
}

.schedule-list {
  display: grid;
  gap: 4px;
  margin: 16px 0;
}

.schedule-row {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  color: var(--app-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  background: transparent;
}

.schedule-row:hover {
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
}

.schedule-row span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.schedule-row strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-entry > .muted {
  margin: 16px 0;
  font-size: 13px;
}

.calendar-entry__action {
  align-self: flex-start;
  margin-top: auto;
}

.campaign-entry {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.campaign-entry__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.campaign-entry h2 {
  margin: 4px 0 0;
  font-size: 18px;
  line-height: 1.35;
}

.campaign-entry__icon {
  border-color: rgba(124, 92, 252, 0.24);
  color: var(--arena-vio, #7c5cfc);
  background: var(--arena-vio-soft, rgba(124, 92, 252, 0.12));
}

.campaign-entry > p {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.campaign-entry__action {
  align-self: flex-start;
}

.campaign-management-drawer :deep(.el-drawer__body) {
  padding-top: 0;
}

.campaign-management-drawer :deep(.campaign-panel) {
  margin: 0;
}

.funnel-section {
  min-width: 0;
  padding: 2px 0;
}

.funnel-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.funnel-overview strong {
  margin-left: 4px;
  color: var(--app-text);
}

.funnel-overview .is-risk {
  color: var(--arena-red, #e5484d);
}

.status-funnel {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  min-width: 0;
  margin-top: 12px;
  overflow-x: auto;
  border: 1.5px solid var(--app-border);
  border-radius: var(--arena-radius-card, var(--app-radius));
  background: var(--app-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.funnel-item {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-right: 1px solid var(--app-border);
  color: var(--app-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  background: var(--app-surface);
}

.funnel-item:last-child {
  border-right: 0;
}

.funnel-item span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.funnel-item strong {
  font-size: 18px;
}

.funnel-item:hover,
.funnel-item.is-active {
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
}

.funnel-item.is-active span,
.funnel-item.is-active strong {
  color: var(--arena-grn-d, var(--app-primary-hover));
}

@media (max-width: 900px) {
  .status-funnel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: hidden;
  }

  .funnel-item {
    min-height: 54px;
    border-right: 1px solid var(--app-border);
    border-bottom: 1px solid var(--app-border);
  }

  .funnel-item:nth-child(2n) {
    border-right: 0;
  }

  .funnel-item:nth-last-child(-n + 2) {
    border-bottom: 0;
  }
}

@media (max-width: 560px) {
  .status-funnel {
    grid-template-columns: 1fr;
  }

  .funnel-item,
  .funnel-item:nth-child(2n),
  .funnel-item:nth-last-child(-n + 2) {
    min-height: 48px;
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .funnel-item:last-child {
    border-bottom: 0;
  }
}

.records-section {
  min-width: 0;
  padding-top: 8px;
  border-top: 1px solid var(--app-border);
}

.records-filters :deep(.el-select) {
  width: 160px;
}

.list-context {
  margin: 12px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.v4-list,
.event-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.v4-row,
.event-row {
  padding: 14px;
  border: 1.5px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.v4-row.is-highlighted {
  border-color: var(--arena-grn, var(--app-primary));
  box-shadow: 0 0 0 3px var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
}

.v4-row-head,
.event-row__head {
  align-items: flex-start;
  justify-content: space-between;
}

.v4-row__main {
  min-width: 0;
}

.record-title {
  flex-wrap: wrap;
  align-items: center;
}

.record-actions {
  justify-content: flex-end;
  max-width: 160px;
}

.row-meta,
.quality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row-meta {
  margin: 6px 0 0;
  font-size: 13px;
}

.quality-tags {
  margin: 8px 0;
}

.follow-up-note {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.follow-up-note--overdue {
  color: var(--arena-red, #e5484d);
}

.follow-up-note--due-today {
  color: var(--arena-amber, #f79009);
}

.follow-up-note--upcoming {
  color: var(--arena-grn-d, var(--app-primary-hover));
}

.record-note {
  margin: 8px 0 0;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.drawer-actions {
  margin-bottom: 16px;
}

.event-impact-alert {
  margin: -4px 0 16px;
}

.event-row p {
  margin: 8px 0 0;
}

.event-row__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

@media (max-width: 900px) {
  .v4-application-page,
  .v4-application-page > * {
    min-width: 0;
  }

  .application-workbench {
    grid-template-columns: 1fr;
  }

  .v4-page-header,
  .v4-row-head,
  .event-row__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .record-actions {
    justify-content: flex-start;
    max-width: none;
  }
}

@media (max-width: 640px) {
  .v4-page-header,
  .records-toolbar,
  .panel-heading,
  .funnel-section__head,
  .today-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .records-filters {
    width: 100%;
  }

  .records-filters :deep(.el-select) {
    width: 100%;
    flex: 1 1 140px;
  }

  .today-row__actions {
    width: 100%;
  }
}
</style>
