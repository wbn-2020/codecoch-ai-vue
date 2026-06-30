<template>
  <div class="page-shell v4-application-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 求职进度</div>
        <h1>投递工作台</h1>
        <p>把投递记录、跟进提醒、关联简历版本和面试入口收敛到一个可执行的求职工作台。</p>
      </div>
      <div class="v4-actions">
        <el-select v-model="status" clearable placeholder="全部状态" style="width: 180px" @change="handleStatusChange">
          <el-option v-for="item in statuses" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
        <el-select v-model="followUpFilter" style="width: 180px" @change="syncFollowUpQuery">
          <el-option v-for="item in followUpFilters" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="openCreate">新增进度</el-button>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="求职进度加载失败" :description="errorMessage">
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <template v-else>
      <section class="workbench-overview" v-loading="statsLoading">
        <button
          v-for="item in overview.stageCards"
          :key="item.key"
          class="overview-card"
          type="button"
          :class="`overview-card--${item.tone}`"
          @click="applyStageCard(item.key)"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.description }}</small>
        </button>
      </section>

      <section class="follow-up-panel">
        <div class="follow-up-panel__head">
          <div>
            <p class="section-kicker">Follow Up</p>
            <h2>今日待跟进</h2>
            <span v-if="statsError" class="panel-warning">{{ statsError }}</span>
          </div>
          <div class="follow-up-counts">
            <el-tag type="danger" effect="plain">逾期 {{ overview.stats.overdueFollowUpCount }}</el-tag>
            <el-tag type="warning" effect="plain">今日 {{ overview.stats.dueTodayFollowUpCount }}</el-tag>
            <el-tag type="info" effect="plain">未设置 {{ overview.stats.noFollowUpCount }}</el-tag>
          </div>
        </div>

        <div v-if="dueFollowUps.length" class="due-list">
          <article v-for="item in dueFollowUps" :key="item.id" class="due-item">
            <div>
              <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
              <span>{{ getFollowUpState(item).description }}</span>
            </div>
            <el-button type="primary" link @click="openFollowUpCreate(item)">记录跟进</el-button>
          </article>
        </div>
        <el-empty v-else description="今天暂无必须处理的跟进项" />
      </section>

      <section class="content-card">
        <div class="content-card__body v4-list" v-loading="loading">
          <div class="list-head">
            <div>
              <p class="section-kicker">Applications</p>
              <h2>投递记录</h2>
              <span v-if="latestEventsError" class="panel-warning">{{ latestEventsError }}</span>
            </div>
            <span>{{ filteredApplications.length }} / {{ applications.length }} 条</span>
          </div>

          <article v-for="item in filteredApplications" :key="item.id" class="v4-row">
            <div class="v4-row-head">
              <div class="application-title">
                <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
                <div class="row-tags">
                  <el-tag :type="tagType(getStageMeta(item).tone)" effect="plain">{{ getStageMeta(item).label }}</el-tag>
                  <el-tag :type="tagType(getFollowUpState(item).tone)" effect="light">
                    {{ getFollowUpState(item).label }}
                  </el-tag>
                </div>
              </div>
              <div class="row-actions">
                <el-button link type="primary" @click="openEvents(item)">事件</el-button>
                <el-button link type="primary" @click="openFollowUpCreate(item)">加跟进</el-button>
                <el-dropdown trigger="click" @command="handleResultEventCommand(item, $event)">
                  <el-button link type="primary">记结果</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-for="type in resultEventTypes" :key="type" :command="type">
                        {{ eventTypeLabel(type) }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button link type="primary" @click="goInterview(item)">去面试</el-button>
                <el-button link type="primary" @click="goResumeVersion(item)">去版本</el-button>
                <el-button link type="primary" @click="openEdit(item)">编辑</el-button>
              </div>
            </div>

            <div class="application-meta">
              <span>{{ item.source || 'CUSTOM' }}</span>
              <span>投递 {{ displayDate(item.appliedAt) }}</span>
              <span>下次跟进 {{ displayDate(item.nextFollowUpAt) }}</span>
              <span>{{ getResumeVersionLabel(item) }}</span>
            </div>
            <p class="stage-desc">{{ getStageMeta(item).description }}</p>
            <div v-if="getLatestEvent(item)" class="latest-event">
              <el-tag :type="tagType(getLatestEvent(item)?.meta.tone || 'info')" effect="plain">
                最近 {{ getLatestEvent(item)?.meta.label }}
              </el-tag>
              <span>{{ getLatestEvent(item)?.timeText }}</span>
              <strong>{{ getLatestEvent(item)?.summaryText }}</strong>
            </div>
            <p v-else-if="latestEventLoading" class="muted latest-event-placeholder">最近事件加载中...</p>
            <p v-if="item.note" class="muted">{{ item.note }}</p>
          </article>
          <el-empty v-if="!filteredApplications.length && !loading" description="暂无匹配的求职进度记录" />
        </div>
      </section>
    </template>

    <el-dialog v-model="dialogVisible" title="求职进度" width="620px">
      <el-form label-position="top">
        <el-form-item label="公司">
          <el-input v-model.trim="form.companyName" />
        </el-form-item>
        <el-form-item label="岗位名称">
          <el-input v-model.trim="form.jobTitle" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statuses" :key="item" :label="statusLabel(item)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model.trim="form.source" placeholder="BOSS / LinkedIn / Referral / CUSTOM" />
        </el-form-item>
        <el-form-item label="目标岗位 ID">
          <el-input-number v-model="form.targetJobId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="匹配报告 ID">
          <el-input-number v-model="form.matchReportId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="简历版本 ID">
          <el-input-number v-model="form.resumeVersionId" :min="1" controls-position="right" />
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

    <el-drawer v-model="eventsVisible" title="求职事件" size="560px">
      <div class="drawer-actions">
        <el-button type="primary" @click="openEventCreate">新增事件</el-button>
        <el-button :loading="eventsLoading" @click="loadEvents">刷新</el-button>
      </div>
      <el-alert
        v-if="eventsError"
        class="event-alert"
        type="error"
        :closable="false"
        show-icon
        :title="eventsError"
      />
      <div class="event-timeline" v-loading="eventsLoading">
        <article v-for="item in eventTimeline" :key="item.id" class="event-row" :class="`event-row--${item.meta.tone}`">
          <span class="event-dot"></span>
          <div class="event-row__body">
            <div class="event-row__head">
              <div>
                <el-tag :type="tagType(item.meta.tone)" effect="plain">{{ item.meta.label }}</el-tag>
                <strong>{{ item.summaryText }}</strong>
              </div>
              <span>{{ item.timeText }}</span>
            </div>
            <p>{{ item.meta.description }}</p>
            <pre v-if="item.reviewJson || item.review">{{ item.reviewJson || JSON.stringify(item.review, null, 2) }}</pre>
          </div>
        </article>
        <el-empty v-if="!eventTimeline.length && !eventsLoading" description="当前进度暂无事件" />
      </div>
    </el-drawer>

    <el-dialog v-model="eventDialogVisible" title="新增求职事件" width="560px">
      <el-form label-position="top">
        <el-form-item label="事件类型">
          <el-select v-model="eventForm.eventType" style="width: 100%">
            <el-option v-for="item in eventTypes" :key="item" :label="eventTypeLabel(item)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件时间">
          <el-date-picker v-model="eventForm.eventTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="eventForm.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item v-if="eventForm.eventType === 'FOLLOW_UP'" label="下一次跟进时间">
          <el-date-picker
            v-model="followUpNextAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="记录本次跟进后，安排下一次提醒"
          />
        </el-form-item>
        <el-form-item label="结构化记录 JSON">
          <el-input v-model="eventForm.reviewJson" type="textarea" :rows="4" placeholder='{"score":80}' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createEvent">保存事件</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import {
  createApplicationApi,
  createApplicationEventApi,
  getApplicationEventsApi,
  getApplicationsApi,
  getApplicationStatsApi,
  getResumeVersionDetailApi,
  updateApplicationApi,
  type JobApplicationEventVO,
  type JobApplicationStatsVO,
  type JobApplicationVO,
  type ResumeVersionVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import {
  buildApplicationEventTimeline,
  buildBackendLatestApplicationEvent,
  buildApplicationInterviewRoute,
  buildApplicationResumeVersionRoute,
  buildApplicationWorkbenchOverview,
  filterApplicationsByFollowUp,
  formatApplicationResumeVersionLabel,
  getApplicationEventMeta,
  getApplicationFollowUpState,
  getApplicationStageMeta,
  getDueFollowUpApplications,
  hasBackendLatestEventSummary,
  hasBackendResumeVersionSummary,
  isApplicationActiveStatus,
  type ApplicationFollowUpFilter,
  type ApplicationStageKey,
  type ApplicationTimelineEvent,
  type ApplicationWorkbenchContext
} from '@/features/applications'
import { toFriendlyMessage } from '@/utils/error'
import { formatDateTime, formatLocalDateTime } from '@/utils/format'

const statuses = ['SAVED', 'PREPARING', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'CLOSED']
const eventTypes = ['NOTE', 'FOLLOW_UP', 'INTERVIEW', 'OFFER', 'REJECTED', 'CLOSED']
const resultEventTypes = ['INTERVIEW', 'OFFER', 'REJECTED', 'CLOSED']
const latestEventPreviewLimit = 12
const followUpFilters: Array<{ label: string; value: ApplicationFollowUpFilter }> = [
  { label: '全部跟进', value: 'all' },
  { label: '已逾期', value: 'overdue' },
  { label: '今日待跟进', value: 'due-today' },
  { label: '未来跟进', value: 'upcoming' },
  { label: '未设置跟进', value: 'missing' }
]

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const statsLoading = ref(false)
const latestEventLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const statsError = ref('')
const latestEventsError = ref('')
const status = ref('')
const followUpFilter = ref<ApplicationFollowUpFilter>('all')
const stageFilter = ref<'all' | 'active'>('all')
const dialogVisible = ref(false)
const editingId = ref<number>()
const applications = ref<JobApplicationVO[]>([])
const stats = ref<JobApplicationStatsVO | null>(null)
const resumeVersions = ref<Record<number, ResumeVersionVO | null>>({})
const eventsVisible = ref(false)
const eventsLoading = ref(false)
const eventsError = ref('')
const eventDialogVisible = ref(false)
const selectedApplication = ref<JobApplicationVO>()
const events = ref<JobApplicationEventVO[]>([])
const latestEventsByApplicationId = ref<Record<number, ApplicationTimelineEvent | undefined>>({})
const routeActionHandled = ref(false)

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
const followUpNextAt = ref('')

const overview = computed(() => buildApplicationWorkbenchOverview(stats.value))
const eventTimeline = computed(() => buildApplicationEventTimeline(events.value))
const filteredApplications = computed(() => {
  const followUpItems = filterApplicationsByFollowUp(applications.value, followUpFilter.value)
  if (stageFilter.value === 'active') {
    return followUpItems.filter((item) => isApplicationActiveStatus(item.status))
  }
  return followUpItems
})
const dueFollowUps = computed(() => getDueFollowUpApplications(applications.value).slice(0, 5))

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '接口请求失败，请稍后重试。')
  }
  return '接口请求失败，请稍后重试。'
}

const normalizeFollowUpFilter = (value: unknown): ApplicationFollowUpFilter => {
  const text = String(value || 'all')
  return followUpFilters.some((item) => item.value === text) ? (text as ApplicationFollowUpFilter) : 'all'
}

const statusLabel = (value?: string) => getApplicationStageMeta(value).label
const getStageMeta = (item: JobApplicationVO) => getApplicationStageMeta(item.status)
const getFollowUpState = (item: JobApplicationVO) => getApplicationFollowUpState(item.nextFollowUpAt)
const displayDate = (value?: string) => (value ? formatDateTime(value) : '--')

const getDefaultNextFollowUpAt = () => {
  const next = new Date()
  next.setDate(next.getDate() + 7)
  next.setHours(9, 0, 0, 0)
  return formatLocalDateTime(next)
}

const tagType = (tone: string) => {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  if (tone === 'primary') return 'primary'
  return 'info'
}

const eventTypeLabel = (value?: string) => getApplicationEventMeta(value).label

const getLatestEvent = (item: JobApplicationVO) =>
  buildBackendLatestApplicationEvent(item) || latestEventsByApplicationId.value[item.id]

const getApplicationContext = (item: JobApplicationVO): ApplicationWorkbenchContext => {
  const version = item.resumeVersionId ? resumeVersions.value[item.resumeVersionId] : undefined
  return {
    applicationId: item.id,
    targetJobId: item.targetJobId,
    resumeId: item.resumeId ?? version?.resumeId,
    resumeVersionId: item.resumeVersionId,
    matchReportId: item.matchReportId,
    source: 'application',
    nextFollowUpAt: item.nextFollowUpAt
  }
}

const getResumeVersionLabel = (item: JobApplicationVO) => {
  if (!item.resumeVersionId) return formatApplicationResumeVersionLabel(null)
  if (hasBackendResumeVersionSummary(item)) {
    return formatApplicationResumeVersionLabel({
      resumeVersionId: item.resumeVersionId,
      versionNo: item.resumeVersionNo,
      versionName: item.resumeVersionName,
      currentFlag: item.resumeVersionCurrentFlag
    })
  }
  const version = resumeVersions.value[item.resumeVersionId]
  return formatApplicationResumeVersionLabel({
    resumeVersionId: item.resumeVersionId,
    versionNo: version?.versionNo,
    versionName: version?.versionName,
    currentFlag: version?.currentFlag
  })
}

const loadResumeVersions = async (items: JobApplicationVO[]) => {
  const ids = [...new Set(items
    .filter((item) => !hasBackendResumeVersionSummary(item))
    .map((item) => item.resumeVersionId)
    .filter((id): id is number => Boolean(id)))]
    .filter((id) => !(id in resumeVersions.value))
  if (!ids.length) return
  const results = await Promise.allSettled(ids.map((id) => getResumeVersionDetailApi(id)))
  const next = { ...resumeVersions.value }
  results.forEach((result, index) => {
    next[ids[index]] = result.status === 'fulfilled' ? result.value : null
  })
  resumeVersions.value = next
}

const updateLatestEventCache = (applicationId: number, rawEvents: JobApplicationEventVO[]) => {
  latestEventsByApplicationId.value = {
    ...latestEventsByApplicationId.value,
    [applicationId]: buildApplicationEventTimeline(rawEvents)[0]
  }
}

const loadLatestEvents = async (items: JobApplicationVO[]) => {
  const candidates = items
    .filter((item) => item.id && !hasBackendLatestEventSummary(item) && !(item.id in latestEventsByApplicationId.value))
    .slice(0, latestEventPreviewLimit)
  if (!candidates.length) return

  latestEventLoading.value = true
  latestEventsError.value = ''
  const results = await Promise.allSettled(candidates.map((item) => getApplicationEventsApi(item.id)))
  const next = { ...latestEventsByApplicationId.value }
  let failedCount = 0
  results.forEach((result, index) => {
    const applicationId = candidates[index].id
    if (result.status === 'fulfilled') {
      next[applicationId] = buildApplicationEventTimeline(result.value)[0]
    } else {
      failedCount += 1
      next[applicationId] = undefined
    }
  })
  latestEventsByApplicationId.value = next
  if (failedCount) {
    latestEventsError.value = `${failedCount} 条投递的最近事件暂时不可用`
  }
  latestEventLoading.value = false
}

const loadStats = async () => {
  statsLoading.value = true
  statsError.value = ''
  try {
    stats.value = await getApplicationStatsApi()
  } catch (error) {
    stats.value = null
    statsError.value = getErrorMessage(error)
  } finally {
    statsLoading.value = false
  }
}

const handleRouteAction = () => {
  if (routeActionHandled.value) return
  if (route.query.action !== 'create-event') return
  const applicationId = Number(route.query.applicationId)
  const item = applications.value.find((entry) => entry.id === applicationId)
  if (!item) return
  routeActionHandled.value = true
  openFollowUpCreate(item, {
    eventType: String(route.query.eventType || 'FOLLOW_UP'),
    eventTime: String(route.query.eventTime || '') || undefined
  })
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const items = await getApplicationsApi({ status: status.value || undefined })
    applications.value = items
    latestEventsByApplicationId.value = {}
    await loadResumeVersions(items)
    void loadLatestEvents(items)
    handleRouteAction()
  } catch (error) {
    applications.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
  void loadStats()
}

const handleStatusChange = () => {
  stageFilter.value = 'all'
  void load()
}

const openCreate = () => {
  editingId.value = undefined
  Object.assign(form, {
    status: 'SAVED',
    jobTitle: '',
    companyName: '',
    source: 'CUSTOM',
    note: '',
    targetJobId: undefined,
    matchReportId: undefined,
    resumeVersionId: undefined,
    nextFollowUpAt: ''
  })
  dialogVisible.value = true
}

const openEdit = (item: JobApplicationVO) => {
  editingId.value = item.id
  Object.assign(form, item)
  dialogVisible.value = true
}

const save = async () => {
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
  eventsVisible.value = true
  await loadEvents()
}

const loadEvents = async () => {
  if (!selectedApplication.value) return
  eventsLoading.value = true
  eventsError.value = ''
  try {
    const result = await getApplicationEventsApi(selectedApplication.value.id)
    events.value = result
    updateLatestEventCache(selectedApplication.value.id, result)
  } catch (error) {
    events.value = []
    eventsError.value = getErrorMessage(error)
    ElMessage.error(getErrorMessage(error))
  } finally {
    eventsLoading.value = false
  }
}

const openEventCreate = () => {
  Object.assign(eventForm, {
    eventType: 'NOTE',
    eventTime: formatLocalDateTime(),
    summary: '',
    reviewJson: ''
  })
  followUpNextAt.value = ''
  eventDialogVisible.value = true
}

const openFollowUpCreate = (item: JobApplicationVO, preset?: Partial<JobApplicationEventVO>) => {
  selectedApplication.value = item
  Object.assign(eventForm, {
    eventType: preset?.eventType || 'FOLLOW_UP',
    eventTime: preset?.eventTime || formatLocalDateTime(),
    summary: preset?.summary || `跟进 ${item.companyName || '目标公司'} · ${item.jobTitle || '目标岗位'}`,
    reviewJson: ''
  })
  followUpNextAt.value = getDefaultNextFollowUpAt()
  eventDialogVisible.value = true
}

const openResultEventCreate = (item: JobApplicationVO, eventType: string) => {
  const meta = getApplicationEventMeta(eventType)
  selectedApplication.value = item
  Object.assign(eventForm, {
    eventType,
    eventTime: formatLocalDateTime(),
    summary: `${meta.label}：${item.companyName || '目标公司'} · ${item.jobTitle || '目标岗位'}`,
    reviewJson: ''
  })
  followUpNextAt.value = ''
  eventDialogVisible.value = true
}

const handleResultEventCommand = (item: JobApplicationVO, command: unknown) => {
  openResultEventCreate(item, String(command || 'NOTE'))
}

const createEvent = async () => {
  if (!selectedApplication.value) return
  saving.value = true
  try {
    await createApplicationEventApi(selectedApplication.value.id, {
      eventType: eventForm.eventType,
      eventTime: eventForm.eventTime,
      summary: eventForm.summary,
      reviewJson: eventForm.reviewJson || undefined
    })
    if (eventForm.eventType === 'FOLLOW_UP' && followUpNextAt.value) {
      try {
        await updateApplicationApi(selectedApplication.value.id, {
          nextFollowUpAt: followUpNextAt.value
        })
      } catch {
        eventDialogVisible.value = false
        ElMessage.warning('事件已保存，但下次跟进时间更新失败，请稍后在编辑里补充。')
        await Promise.all([loadEvents(), load()]).catch(() => undefined)
        return
      }
    }
    eventDialogVisible.value = false
    ElMessage.success('事件已保存')
    await Promise.all([loadEvents(), load()])
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

const goRoute = (target: RouteLocationRaw) => {
  router.push(target)
}

const goInterview = (item: JobApplicationVO) => {
  goRoute(buildApplicationInterviewRoute(getApplicationContext(item)) as RouteLocationRaw)
}

const goResumeVersion = (item: JobApplicationVO) => {
  goRoute(buildApplicationResumeVersionRoute(getApplicationContext(item)) as RouteLocationRaw)
}

const applyStageCard = (key: ApplicationStageKey) => {
  stageFilter.value = 'all'
  const followUpStageMap: Partial<Record<ApplicationStageKey, ApplicationFollowUpFilter>> = {
    'follow-up-overdue': 'overdue',
    'follow-up-due-today': 'due-today',
    'follow-up-missing': 'missing'
  }
  const nextFollowUpFilter = followUpStageMap[key]
  if (nextFollowUpFilter) {
    followUpFilter.value = nextFollowUpFilter
    status.value = ''
    void load()
    syncFollowUpQuery()
    return
  }
  if (key === 'active') stageFilter.value = 'active'
  if (key === 'total' || key === 'active' || key === 'interviewing' || key === 'offer' || key === 'rejected' || key === 'closed') {
    const nextStatus: Record<string, string> = {
      interviewing: 'INTERVIEWING',
      offer: 'OFFER',
      rejected: 'REJECTED',
      closed: 'CLOSED'
    }
    status.value = nextStatus[key] || ''
    void load()
  }
  syncFollowUpQuery()
}

const syncFollowUpQuery = () => {
  const query = { ...route.query }
  if (followUpFilter.value === 'all') {
    delete query.followUp
  } else {
    query.followUp = followUpFilter.value
  }
  router.replace({ query })
}

watch(
  () => route.query.followUp,
  (value) => {
    followUpFilter.value = normalizeFollowUpFilter(value)
  },
  { immediate: true }
)

onMounted(load)
</script>

<style scoped lang="scss">
.v4-application-page {
  gap: 18px;
}

.v4-page-header,
.v4-row-head,
.v4-actions,
.drawer-actions,
.event-row__head,
.row-tags,
.row-actions,
.follow-up-panel__head,
.follow-up-counts,
.latest-event {
  display: flex;
  gap: 16px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1,
.follow-up-panel h2,
.list-head h2 {
  margin: 8px 0 0;
}

.v4-page-header h1 {
  font-size: 28px;
}

.v4-page-header p,
.muted,
.event-row p,
.event-row span,
.stage-desc,
.application-meta,
.due-item span,
.overview-card small,
.list-head span,
.panel-warning,
.latest-event {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow,
.section-kicker {
  margin: 0;
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.v4-actions,
.drawer-actions,
.row-actions,
.row-tags,
.follow-up-counts {
  flex-wrap: wrap;
  align-items: center;
}

.workbench-overview {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.overview-card {
  display: grid;
  gap: 8px;
  min-height: 128px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.overview-card strong {
  font-size: 30px;
}

.overview-card--success {
  border-color: rgba(34, 197, 94, 0.28);
}

.overview-card--warning {
  border-color: rgba(251, 191, 36, 0.32);
}

.overview-card--danger {
  border-color: rgba(248, 113, 113, 0.32);
}

.follow-up-panel,
.content-card {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
}

.follow-up-panel {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.follow-up-panel__head,
.v4-row-head,
.event-row__head,
.list-head {
  align-items: flex-start;
  justify-content: space-between;
}

.due-list,
.v4-list,
.event-timeline {
  display: grid;
  gap: 12px;
}

.due-item,
.v4-row,
.event-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
}

.due-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.due-item strong,
.due-item span,
.application-title strong,
.application-meta span {
  overflow-wrap: anywhere;
}

.list-head {
  display: flex;
  gap: 12px;
}

.application-title {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.application-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 12px;
  font-size: 13px;
}

.stage-desc,
.event-row p {
  margin: 8px 0 0;
}

.latest-event {
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 10px;
  font-size: 13px;
}

.latest-event strong {
  color: var(--app-text);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.latest-event-placeholder {
  margin-top: 10px;
  font-size: 13px;
}

.event-alert {
  margin-bottom: 12px;
}

.event-timeline {
  position: relative;
  padding-left: 18px;
}

.event-timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 7px;
  width: 1px;
  background: rgba(148, 163, 184, 0.22);
  content: '';
}

.event-row {
  position: relative;
}

.event-dot {
  position: absolute;
  top: 20px;
  left: -20px;
  width: 11px;
  height: 11px;
  border: 2px solid rgba(96, 165, 250, 0.84);
  border-radius: 999px;
  background: #020617;
}

.event-row--success .event-dot {
  border-color: rgba(34, 197, 94, 0.88);
}

.event-row--warning .event-dot {
  border-color: rgba(251, 191, 36, 0.88);
}

.event-row--danger .event-dot {
  border-color: rgba(248, 113, 113, 0.88);
}

.event-row__body {
  min-width: 0;
}

.event-row__head > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.event-row__head strong {
  overflow-wrap: anywhere;
}

.drawer-actions {
  margin-bottom: 16px;
}

.event-row pre {
  overflow: auto;
  max-height: 180px;
  margin: 10px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: #020617;
  color: #dbeafe;
  white-space: pre-wrap;
}

@media (max-width: 1200px) {
  .workbench-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .v4-page-header,
  .v4-row-head,
  .event-row__head,
  .follow-up-panel__head,
  .due-item,
  .list-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .workbench-overview {
    grid-template-columns: 1fr;
  }
}
</style>
