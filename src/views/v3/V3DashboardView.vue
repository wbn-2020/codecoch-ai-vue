<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><LayoutDashboard :size="16" /> V3 Dashboard</div>
        <h1>V3 求职闭环驾驶舱</h1>
        <p>聚合当前岗位目标、最近匹配、学习进度、推荐题和下一步动作；任一接口缺数据时降级展示。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadDashboard"><RefreshCw :size="16" /> 刷新</el-button>
        <el-button type="primary" @click="router.push('/job-targets')"><Crosshair :size="16" /> 岗位目标</el-button>
      </div>
    </section>

    <section v-if="errors.length" class="content-panel error-strip">
      <el-alert v-for="error in errors" :key="error" type="warning" show-icon :closable="false" :title="error" />
    </section>

    <section class="metric-grid" v-loading="overviewLoading">
      <button v-for="item in metrics" :key="item.label" class="metric-card" type="button" @click="router.push(item.path)">
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </button>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>当前岗位目标</h2><p>来自 GET /dashboard/v3/overview.currentTargetJob。</p></div><el-button text @click="router.push('/job-targets')">管理</el-button></div>
        <AppState v-if="!overview?.currentTargetJob" type="empty" title="暂无当前岗位目标" description="请先创建或设置当前目标岗位。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.currentTargetJob.jobTitle || `岗位 #${overview.currentTargetJob.targetJobId || overview.currentTargetJob.id}` }}</strong>
          <span>{{ overview.currentTargetJob.companyName || '未填写公司' }} · {{ overview.currentTargetJob.jobLevel || '未填写级别' }}</span>
          <el-tag effect="plain">{{ overview.currentTargetJob.parseStatus || 'UNKNOWN' }}</el-tag>
          <el-button type="primary" @click="router.push({ path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId }) })">继续简历匹配</el-button>
        </div>
      </div>

      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>最近匹配报告</h2><p>来自 latestMatch。</p></div><el-button text @click="router.push('/resume-match')">查看</el-button></div>
        <AppState v-if="!overview?.latestMatch" type="empty" title="暂无匹配报告" description="完成简历与岗位匹配后会展示最近结果。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.latestMatch.overallScore ?? '--' }} 分</strong>
          <span>{{ overview.latestMatch.summary || overview.latestMatch.status || '暂无摘要' }}</span>
          <el-button type="primary" @click="router.push({ path: '/skill-profile', query: compactQuery({ matchReportId: latestMatchReportId, targetJobId: overview?.latestMatch?.targetJobId || currentTargetJobId }) })">生成/查看能力画像</el-button>
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel">
        <div class="section-head"><div><h2>能力画像</h2><p>来自 GET /skill-profiles/overview。</p></div><el-button text @click="router.push('/skill-profile')">查看</el-button></div>
        <AppState v-if="skillLoading" type="loading" title="正在读取能力画像" />
        <AppState v-else-if="!skillOverview || skillOverview.empty" type="empty" title="暂无能力画像" description="完成匹配报告后可生成能力画像。" />
        <div v-else class="skill-summary">
          <strong>{{ skillOverview.overallScore ?? '--' }}</strong>
          <span>{{ skillOverview.profileName || '当前能力画像' }}</span>
          <p>{{ skillOverview.summary || '暂无画像摘要。' }}</p>
          <el-progress :percentage="Number(skillOverview.overallScore || 0)" :stroke-width="10" />
        </div>
      </div>

      <div class="content-panel">
        <div class="section-head"><div><h2>学习计划</h2><p>来自 studyProgress/activeStudyPlan。</p></div><el-button text @click="router.push('/study-plans')">查看</el-button></div>
        <div v-if="activeStudyProgress" class="active-plan" @click="router.push(activeStudyPlanRoute)">
          <strong>{{ activeStudyPlanTitle }}</strong>
          <span>{{ activeStudyProgress.doneTaskCount || 0 }}/{{ activeStudyProgress.totalTaskCount || 0 }} · {{ activeStudyProgress.progressPercent || 0 }}%</span>
          <el-progress :percentage="activeStudyProgress.progressPercent || 0" />
        </div>
        <AppState v-else type="empty" title="暂无进行中的学习计划" description="可从能力短板生成学习计划。" />
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>推荐题批次</h2><p>来自 recommendedQuestions。</p></div><el-button text @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">查看</el-button></div>
        <AppState v-if="!overview?.recommendedQuestions" type="empty" title="暂无推荐题批次" description="可从能力短板或学习计划生成推荐题。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.recommendedQuestions.questionCount ?? '--' }} 题</strong>
          <span>{{ overview.recommendedQuestions.sourceType || 'UNKNOWN' }} · {{ overview.recommendedQuestions.status || 'UNKNOWN' }}</span>
          <el-button type="primary" @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">继续刷题</el-button>
        </div>
      </div>

      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>下一步动作</h2><p>来自 nextActions。</p></div></div>
        <div v-if="nextActionItems.length" class="next-action-list">
          <button v-for="action in nextActionItems" :key="action.title" type="button" @click="router.push(action.path)">
            <strong>{{ action.title }}</strong>
            <span>{{ action.desc }}</span>
          </button>
        </div>
        <AppState v-else type="empty" title="暂无下一步动作" description="完成更多 V3 环节后会展示建议动作。" />
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>最近面试报告</h2><p>面试结果回流到学习计划、推荐题和再次面试。</p></div><el-button text @click="router.push('/interviews/history')">面试记录</el-button></div>
        <AppState v-if="!overview?.recentReport && !overview?.recentInterview" type="empty" title="暂无面试报告" description="完成目标岗位面试并生成报告后会展示回流建议。" />
        <div v-else class="loop-summary">
          <strong>{{ overview?.recentReport?.totalScore ?? '--' }} 分</strong>
          <span>{{ overview?.recentInterview?.title || `面试 #${overview?.recentReport?.interviewId || overview?.recentInterview?.interviewId}` }} · {{ overview?.recentReport?.status || overview?.recentInterview?.reportStatus || 'UNKNOWN' }}</span>
          <small v-if="reportInsightText">{{ reportInsightText }}</small>
          <div class="inline-actions">
            <el-button type="primary" @click="router.push(`/interviews/${overview?.recentReport?.interviewId}/report`)" :disabled="!overview?.recentReport?.interviewId">查看报告</el-button>
            <el-button @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">继续练习</el-button>
            <el-button @click="router.push({ path: '/interviews/create', query: interviewRetryQuery })">再次面试</el-button>
          </div>
        </div>
      </div>

      <div class="content-panel">
        <div class="section-head"><div><h2>最近通知</h2><p>来自 GET /notifications。</p></div><el-button text @click="router.push('/notifications')">通知中心</el-button></div>
        <AppState v-if="notificationLoading" type="loading" title="正在读取通知" />
        <div v-else-if="notifications.length" class="notification-list">
          <article v-for="item in notifications" :key="item.id">
            <strong>{{ item.title }}</strong>
            <span>{{ item.content || item.type }} · {{ item.createdAt }}</span>
          </article>
        </div>
        <AppState v-else type="empty" title="暂无通知" description="通知接口未返回记录。" />
      </div>

      <div class="content-panel">
        <div class="section-head"><div><h2>闭环入口</h2><p>按真实数据状态引导下一步。</p></div></div>
        <div class="entry-grid">
          <button v-for="entry in entries" :key="entry.title" type="button" @click="router.push(entry.path)">
            <component :is="entry.icon" :size="18" />
            <strong>{{ entry.title }}</strong>
            <span>{{ entry.desc }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Bell, BookOpenCheck, Crosshair, FileText, GitCompareArrows, LayoutDashboard, ListChecks, Radar, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter, type LocationQueryRaw } from 'vue-router'

import { getV3DashboardOverviewApi } from '@/api/dashboard'
import { getNotificationsApi, type NotificationVO } from '@/api/notification'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import type { V3DashboardNextActionVO, V3DashboardOverviewVO } from '@/types/dashboard'
import type { SkillProfileOverviewVO } from '@/types/skillProfile'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const overviewLoading = ref(false)
const skillLoading = ref(false)
const notificationLoading = ref(false)
const overviewError = ref('')
const skillError = ref('')
const notificationError = ref('')
const overview = ref<V3DashboardOverviewVO | null>(null)
const skillOverview = ref<SkillProfileOverviewVO | null>(null)
const notifications = ref<NotificationVO[]>([])

const loading = computed(() => overviewLoading.value || skillLoading.value || notificationLoading.value)
const errors = computed(() => [overviewError.value, skillError.value, notificationError.value].filter(Boolean))
const currentTargetJobId = computed(() => overview.value?.currentTargetJob?.targetJobId || overview.value?.currentTargetJob?.id)
const latestMatchReportId = computed(() => overview.value?.latestMatch?.matchReportId || overview.value?.latestMatch?.reportId)
const activeStudyProgress = computed(() => overview.value?.studyProgress || overview.value?.activeStudyPlan || null)
const activeStudyPlanTitle = computed(() => {
  const plan = activeStudyProgress.value
  if (!plan) return ''
  return plan.planTitle || `学习计划 #${plan.planId}`
})
const activeStudyPlanRoute = computed(() => ({
  path: '/study-plans',
  query: { planId: String(activeStudyProgress.value?.planId) }
}))
const compactQuery = (query: Record<string, unknown>): LocationQueryRaw => Object.fromEntries(
  Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
) as LocationQueryRaw
const recommendationQuery = computed(() => compactQuery({
  batchId: overview.value?.recommendedQuestions?.batchId,
  studyPlanId: activeStudyProgress.value?.planId,
  matchReportId: overview.value?.recommendedQuestions?.matchReportId || (activeStudyProgress.value?.planId ? undefined : latestMatchReportId.value),
  skillProfileId: overview.value?.recommendedQuestions?.skillProfileId || skillOverview.value?.profileId,
  sourceType: overview.value?.recommendedQuestions?.sourceType,
  sourceId: overview.value?.recommendedQuestions?.sourceId,
  targetJobId: currentTargetJobId.value
}))
const interviewRetryQuery = computed(() => compactQuery({
  source: 'v3',
  targetJobId: currentTargetJobId.value,
  matchReportId: latestMatchReportId.value,
  resumeId: overview.value?.latestMatch?.resumeId,
  fromInterviewId: overview.value?.recentReport?.interviewId || overview.value?.recentInterview?.interviewId,
  fromReportId: overview.value?.recentReport?.reportId
}))
const normalizeActionPath = (path: string) => {
  if (!path.startsWith('/interviews/create')) return path
  const hasQuery = path.includes('?')
  const params = new URLSearchParams(hasQuery ? path.slice(path.indexOf('?') + 1) : '')
  if (!params.get('source')) params.set('source', 'v3')
  if (currentTargetJobId.value && !params.get('targetJobId')) params.set('targetJobId', String(currentTargetJobId.value))
  if (latestMatchReportId.value && !params.get('matchReportId')) params.set('matchReportId', String(latestMatchReportId.value))
  if (overview.value?.latestMatch?.resumeId && !params.get('resumeId')) params.set('resumeId', String(overview.value.latestMatch.resumeId))
  return `/interviews/create?${params.toString()}`
}
const normalizeNextActions = (value: V3DashboardOverviewVO['nextActions']) => {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n').filter(Boolean)
      : []
  return rawItems.map((item, index) => {
    if (typeof item === 'string') {
      return { title: item, desc: '继续完成 V3 求职闭环', path: '/dashboard/v3' }
    }
    const action = item as V3DashboardNextActionVO
    return {
      title: action.title || action.actionType || action.type || `下一步 ${index + 1}`,
      desc: action.desc || action.description || '继续完成 V3 求职闭环',
      path: normalizeActionPath(action.path || action.actionUrl || action.targetPath || '/dashboard/v3')
    }
  })
}
const metrics = computed(() => [
  { label: '简历', value: overview.value?.resumeCount ?? 0, hint: '进入匹配输入', path: '/resumes', icon: FileText },
  { label: '面试', value: overview.value?.interviewCount ?? 0, hint: '模拟面试记录', path: '/interviews/history', icon: Bell },
  { label: '学习计划', value: overview.value?.studyPlanCount ?? 0, hint: `${overview.value?.todayCompletedTaskCount ?? 0}/${overview.value?.todayTaskCount ?? 0} 今日任务`, path: '/study-plans', icon: BookOpenCheck },
  { label: '能力分', value: skillOverview.value?.overallScore ?? '--', hint: `${skillOverview.value?.gapCount ?? 0} 个短板`, path: '/skill-profile', icon: Radar }
])
const nextActionItems = computed(() => normalizeNextActions(overview.value?.nextActions))
const reportInsightText = computed(() => {
  const weakPoints = overview.value?.recentReport?.weakPoints || []
  const suggestions = overview.value?.recentReport?.suggestions || []
  return [...weakPoints.slice(0, 2), ...suggestions.slice(0, 1)].filter(Boolean).join(' · ')
})
const entries = computed(() => [
  { title: '岗位目标', desc: '维护当前主目标和 JD', path: '/job-targets', icon: Crosshair },
  { title: '简历匹配', desc: '生成匹配报告', path: { path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId.value }) }, icon: GitCompareArrows },
  { title: '能力画像', desc: '查看短板和动作', path: { path: '/skill-profile', query: compactQuery({ targetJobId: currentTargetJobId.value, matchReportId: latestMatchReportId.value }) }, icon: Radar },
  { title: '推荐题目', desc: '按短板练习', path: { path: '/questions/recommendations', query: recommendationQuery.value }, icon: ListChecks },
  { title: '模拟面试', desc: '按岗位目标创建面试', path: { path: '/interviews/create', query: interviewRetryQuery.value }, icon: Bell }
])

const loadOverview = async () => {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    overview.value = await getV3DashboardOverviewApi()
  } catch (error) {
    overview.value = null
    overviewError.value = getErrorMessage(error, '工作台概览接口不可用，已降级展示入口。')
  } finally {
    overviewLoading.value = false
  }
}

const loadSkill = async () => {
  skillLoading.value = true
  skillError.value = ''
  try {
    skillOverview.value = await getSkillProfileOverviewApi()
  } catch (error) {
    skillOverview.value = null
    skillError.value = getErrorMessage(error, '能力画像概览接口不可用。')
  } finally {
    skillLoading.value = false
  }
}

const loadNotifications = async () => {
  notificationLoading.value = true
  notificationError.value = ''
  try {
    const page = await getNotificationsApi({ pageNo: 1, pageSize: 5 })
    notifications.value = page.records || []
  } catch (error) {
    notifications.value = []
    notificationError.value = getErrorMessage(error, '通知接口不可用。')
  } finally {
    notificationLoading.value = false
  }
}

const loadDashboard = () => Promise.all([loadOverview(), loadSkill(), loadNotifications()])

onMounted(loadDashboard)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel, .metric-card { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions, .section-head { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.error-strip { display: grid; gap: 10px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 14px; }
.metric-card { padding: 16px; color: var(--app-text); text-align: left; cursor: pointer; }
.metric-card span, .metric-card small { display: block; margin-top: 8px; color: var(--app-text-muted); }
.metric-card strong { display: block; margin-top: 8px; font-size: 28px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.section-head { justify-content: space-between; margin-bottom: 16px; }
.skill-summary strong { font-size: 42px; }
.skill-summary span, .active-plan span { display: block; margin: 8px 0; color: var(--app-text-muted); }
.active-plan { cursor: pointer; }
.notification-list, .next-action-list, .loop-summary { display: grid; gap: 12px; }
.loop-summary strong { font-size: 24px; }
.loop-summary span, .loop-summary small { color: var(--app-text-muted); line-height: 1.5; }
.inline-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.notification-list article, .entry-grid button, .next-action-list button { padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); }
.notification-list article { display: block; }
.next-action-list button { color: var(--app-text); text-align: left; cursor: pointer; }
.next-action-list strong, .next-action-list span { display: block; }
.next-action-list span { margin-top: 6px; color: var(--app-text-muted); }
.notification-list span { display: block; margin-top: 6px; color: var(--app-text-muted); }
.entry-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.entry-grid button { color: var(--app-text); text-align: left; cursor: pointer; }
.entry-grid strong, .entry-grid span { display: block; margin-top: 8px; }
.entry-grid span { color: var(--app-text-muted); line-height: 1.5; }
@media (max-width: 900px) { .page-hero, .dashboard-grid, .metric-grid { grid-template-columns: 1fr; flex-direction: column; } .hero-actions, .section-head { flex-wrap: wrap; } }
</style>
