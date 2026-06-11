<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><LayoutDashboard :size="16" /> 求职闭环</div>
        <h1>求职闭环驾驶舱</h1>
        <p>聚合当前岗位目标、最近匹配、学习进度、推荐题和下一步动作。</p>
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

    <section class="content-panel onboarding-panel" v-loading="loading">
      <div class="section-head">
        <div>
          <h2>求职闭环清单</h2>
          <p>按“岗位描述 -> 简历 -> 匹配画像 -> 今日任务”的 4 步完成首轮准备。</p>
        </div>
        <el-tag effect="plain">{{ onboardingProgress.done }}/{{ onboardingProgress.total }} 已完成</el-tag>
      </div>
      <div class="onboarding-track">
        <button
          v-for="step in onboardingSteps"
          :key="step.key"
          class="onboarding-step"
          :class="{ 'is-done': step.done, 'is-current': step.key === nextOnboardingStep?.key }"
          type="button"
          @click="router.push(step.path)"
        >
          <span class="onboarding-step__marker">
            <CheckCircle2 v-if="step.done" :size="16" />
            <span v-else>{{ step.order }}</span>
          </span>
          <strong>{{ step.title }}</strong>
          <span>{{ step.desc }}</span>
        </button>
      </div>
      <div v-if="nextOnboardingStep" class="onboarding-next">
        <span>下一步：{{ nextOnboardingStep.title }}，{{ nextOnboardingStep.desc }}</span>
        <el-button type="primary" @click="router.push(nextOnboardingStep.path)">{{ nextOnboardingStep.cta }}</el-button>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>当前岗位目标</h2><p>优先展示你正在推进的岗位方向。</p></div><el-button text @click="router.push('/job-targets')">管理</el-button></div>
        <AppState v-if="!overview?.currentTargetJob" type="empty" title="暂无当前岗位目标" description="请先创建或设置当前目标岗位。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.currentTargetJob.jobTitle || '岗位目标' }}</strong>
          <span>{{ overview.currentTargetJob.companyName || '未填写公司' }} · {{ overview.currentTargetJob.jobLevel || '未填写级别' }}</span>
          <el-tag effect="plain">{{ formatStatus(overview.currentTargetJob.parseStatus) }}</el-tag>
          <el-button type="primary" @click="router.push({ path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId }) })">继续简历匹配</el-button>
        </div>
      </div>

      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>最近匹配报告</h2><p>只展示已保存的最近一次简历与岗位匹配结果。</p></div><el-button text @click="router.push('/resume-match')">查看</el-button></div>
        <AppState v-if="!overview?.latestMatch" type="empty" title="暂无匹配报告" description="完成简历与岗位匹配后会展示最近结果。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.latestMatch.overallScore ?? '--' }} 分</strong>
          <span>{{ latestMatchSummary }}</span>
          <el-button
            type="primary"
            @click="router.push(latestMatchPrimaryAction.path)"
          >
            {{ latestMatchPrimaryAction.label }}
          </el-button>
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel">
        <div class="section-head"><div><h2>能力画像</h2><p>展示与目标岗位相关的能力概览。</p></div><el-button text @click="router.push('/skill-profile')">查看</el-button></div>
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
        <div class="section-head"><div><h2>学习计划</h2><p>展示正在推进的训练路线和完成进度。</p></div><el-button text @click="router.push('/study-plans')">查看</el-button></div>
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
        <div class="section-head"><div><h2>推荐题批次</h2><p>根据岗位目标、能力短板和最近练习结果生成。</p></div><el-button text @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">查看</el-button></div>
        <AppState v-if="!overview?.recommendedQuestions" type="empty" title="暂无推荐题批次" description="可从能力短板或学习计划生成推荐题。" />
        <div v-else class="loop-summary">
          <strong>{{ overview.recommendedQuestions.questionCount ?? '--' }} 题</strong>
          <span>{{ formatSourceType(overview.recommendedQuestions.sourceType) }} · {{ formatStatus(overview.recommendedQuestions.status) }}</span>
          <el-button type="primary" @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">继续刷题</el-button>
        </div>
      </div>

      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>下一步动作</h2><p>优先给出今天最值得推进的一件事。</p></div></div>
        <div v-if="nextActionItems.length" class="next-action-list">
          <button v-for="action in nextActionItems" :key="action.title" type="button" @click="router.push(action.path)">
            <strong>{{ action.title }}</strong>
            <span>{{ action.desc }}</span>
          </button>
        </div>
        <AppState v-else type="empty" title="暂无下一步动作" description="完成更多求职准备后会展示建议动作。" />
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="content-panel loop-card">
        <div class="section-head"><div><h2>最近面试报告</h2><p>面试结果回流到学习计划、推荐题和再次面试。</p></div><el-button text @click="router.push('/interviews/history')">面试记录</el-button></div>
        <AppState v-if="!overview?.recentReport && !overview?.recentInterview" type="empty" title="暂无面试报告" description="完成目标岗位面试并生成报告后会展示回流建议。" />
        <div v-else class="loop-summary">
          <strong>{{ overview?.recentReport?.totalScore ?? '--' }} 分</strong>
          <span>{{ overview?.recentInterview?.title || '最近一次面试' }} · {{ formatStatus(overview?.recentReport?.status || overview?.recentInterview?.reportStatus) }}</span>
          <small v-if="reportInsightText">{{ reportInsightText }}</small>
          <div class="inline-actions">
            <el-button type="primary" @click="router.push(`/interviews/${overview?.recentReport?.interviewId}/report`)" :disabled="!overview?.recentReport?.interviewId">查看报告</el-button>
            <el-button @click="router.push({ path: '/questions/recommendations', query: recommendationQuery })">继续练习</el-button>
            <el-button @click="router.push({ path: '/interviews/create', query: interviewRetryQuery })">再次面试</el-button>
          </div>
        </div>
      </div>

      <div class="content-panel">
        <div class="section-head"><div><h2>最近通知</h2><p>同步与你的训练和求职进度相关的提醒。</p></div><el-button text @click="router.push('/notifications')">通知中心</el-button></div>
        <AppState v-if="notificationLoading" type="loading" title="正在读取通知" />
        <div v-else-if="notifications.length" class="notification-list">
          <article v-for="item in notifications" :key="item.id">
            <strong>{{ item.title }}</strong>
            <span>{{ notificationText(item) }} · {{ item.createdAt }}</span>
          </article>
        </div>
        <AppState v-else type="empty" title="暂无通知" description="当前没有新的通知。" />
      </div>

      <div class="content-panel">
        <div class="section-head"><div><h2>闭环入口</h2><p>根据当前准备进度推荐下一步。</p></div></div>
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
import { Bell, BookOpenCheck, CheckCircle2, Crosshair, FileText, GitCompareArrows, LayoutDashboard, ListChecks, Radar, RefreshCw } from 'lucide-vue-next'
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
const latestMatchStatus = computed(() => String(overview.value?.latestMatch?.status || '').toUpperCase())
const latestMatchReportId = computed(() => overview.value?.latestMatch?.matchReportId || overview.value?.latestMatch?.reportId)
const latestMatchTrusted = computed(() => {
  const match = overview.value?.latestMatch
  return latestMatchStatus.value === 'SUCCESS' &&
    !match?.fallback &&
    String(match?.trustStatus || '').toUpperCase() === 'VERIFIED' &&
    match?.schemaWarningCount != null &&
    Number(match.schemaWarningCount) === 0
})
const latestSuccessfulMatchReportId = computed(() => latestMatchTrusted.value ? latestMatchReportId.value : undefined)
const latestSuccessfulMatch = computed(() => latestMatchTrusted.value ? overview.value?.latestMatch : null)
const activeStudyProgress = computed(() => overview.value?.studyProgress || overview.value?.activeStudyPlan || null)
const activeStudyPlanTitle = computed(() => {
  const plan = activeStudyProgress.value
  if (!plan) return ''
  return plan.planTitle || '学习计划'
})
const activeStudyPlanRoute = computed(() => ({
  path: '/study-plans',
  query: { planId: String(activeStudyProgress.value?.planId) }
}))
const compactQuery = (query: Record<string, unknown>): LocationQueryRaw => Object.fromEntries(
  Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
) as LocationQueryRaw
const isCompletedStatus = (value?: string) =>
  ['SUCCESS', 'DONE', 'COMPLETED', 'PARSED', 'ANALYZED'].includes(String(value || '').toUpperCase())
const formatStatus = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    SUCCESS: '已完成',
    DONE: '已完成',
    COMPLETED: '已完成',
    FINISHED: '已完成',
    GENERATED: '已生成',
    PARSED: '已解析',
    ANALYZED: '已分析',
    PROCESSING: '处理中',
    RUNNING: '进行中',
    IN_PROGRESS: '进行中',
    PENDING: '待处理',
    NOT_STARTED: '未开始',
    FAILED: '失败',
    ERROR: '失败'
  }
  return map[value] || (value ? '状态待确认' : '暂未返回状态')
}
const formatSourceType = (sourceType?: string) => {
  const value = String(sourceType || '').toUpperCase()
  const map: Record<string, string> = {
    MATCH_REPORT: '匹配报告',
    SKILL_PROFILE: '能力画像',
    STUDY_PLAN: '学习计划',
    INTERVIEW_REPORT: '面试报告',
    MANUAL: '手动生成'
  }
  return map[value] || '来源待确认'
}
const latestMatchSummary = computed(() => {
  const match = overview.value?.latestMatch
  if (!match) return '暂无摘要'
  if (latestMatchStatus.value === 'SUCCESS') {
    if (latestMatchTrusted.value) return match.summary || '匹配报告已生成，可用于后续训练。'
    return match.evidenceSummary || match.summary || '匹配报告已生成，建议先进入详情确认重点后再继续训练。'
  }
  if (latestMatchStatus.value === 'FAILED') return match.summary || '上次匹配失败，请先进入详情重新生成后再继续训练。'
  return match.summary || `${formatStatus(match.status)}，完成后会补充到训练建议里。`
})
const latestMatchPrimaryAction = computed(() => {
  const match = overview.value?.latestMatch
  if (latestMatchTrusted.value) {
    return {
      label: '生成/查看能力画像',
      path: {
        path: '/skill-profile',
        query: compactQuery({
          matchReportId: latestSuccessfulMatchReportId.value,
          targetJobId: latestSuccessfulMatch.value?.targetJobId || currentTargetJobId.value
        })
      }
    }
  }
  if (match?.reportId || match?.matchReportId) {
    return {
      label: latestMatchStatus.value === 'FAILED' ? '查看失败并重新生成' : '查看生成进度',
      path: `/resume-match/${match.reportId || match.matchReportId}`
    }
  }
  return {
    label: '生成匹配报告',
    path: { path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId.value }) }
  }
})
const recommendationQuery = computed(() => compactQuery({
  batchId: overview.value?.recommendedQuestions?.batchId,
  studyPlanId: activeStudyProgress.value?.planId,
  matchReportId: overview.value?.recommendedQuestions?.matchReportId || (activeStudyProgress.value?.planId ? undefined : latestSuccessfulMatchReportId.value),
  skillProfileId: overview.value?.recommendedQuestions?.skillProfileId || skillOverview.value?.profileId,
  sourceType: overview.value?.recommendedQuestions?.sourceType,
  sourceId: overview.value?.recommendedQuestions?.sourceId,
  targetJobId: currentTargetJobId.value
}))
const interviewRetryQuery = computed(() => compactQuery({
  source: 'v3',
  targetJobId: currentTargetJobId.value,
  matchReportId: latestSuccessfulMatchReportId.value,
  resumeId: latestSuccessfulMatch.value?.resumeId,
  fromInterviewId: overview.value?.recentReport?.interviewId || overview.value?.recentInterview?.interviewId,
  fromReportId: overview.value?.recentReport?.reportId
}))
const normalizeActionPath = (path: string) => {
  if (!path.startsWith('/interviews/create')) return path
  const hasQuery = path.includes('?')
  const params = new URLSearchParams(hasQuery ? path.slice(path.indexOf('?') + 1) : '')
  if (!params.get('source')) params.set('source', 'v3')
  if (currentTargetJobId.value && !params.get('targetJobId')) params.set('targetJobId', String(currentTargetJobId.value))
  if (latestSuccessfulMatchReportId.value && !params.get('matchReportId')) params.set('matchReportId', String(latestSuccessfulMatchReportId.value))
  if (latestSuccessfulMatch.value?.resumeId && !params.get('resumeId')) params.set('resumeId', String(latestSuccessfulMatch.value.resumeId))
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
      return { title: item, desc: '继续完成求职闭环', path: '/dashboard/v3' }
    }
    const action = item as V3DashboardNextActionVO
    return {
      title: action.title || actionTypeLabel(action.actionType || action.type, index),
      desc: action.desc || action.description || '继续完成求职闭环',
      path: normalizeActionPath(action.path || action.actionUrl || action.targetPath || '/dashboard/v3')
    }
  })
}
const actionTypeLabel = (type: string | undefined, index: number) => {
  const value = String(type || '').toUpperCase()
  const map: Record<string, string> = {
    RESUME: '完善简历',
    JOB_TARGET: '补充目标岗位',
    MATCH_REPORT: '生成匹配报告',
    SKILL_PROFILE: '生成能力画像',
    STUDY_PLAN: '生成学习计划',
    QUESTION_PRACTICE: '开始刷题训练',
    INTERVIEW: '安排模拟面试',
    AGENT_PLAN: '生成今日计划'
  }
  return map[value] || `下一步 ${index + 1}`
}
const notificationText = (item: NotificationVO) => {
  if (item.content) return item.content
  const value = String(item.type || '').toUpperCase()
  const map: Record<string, string> = {
    SYSTEM: '系统提醒',
    INTERVIEW: '面试提醒',
    QUESTION: '题库提醒',
    RESUME: '简历提醒',
    AGENT: 'AI 教练提醒',
    TASK: '任务提醒',
    AI: 'AI 任务提醒'
  }
  return map[value] || '训练进度提醒'
}
const metrics = computed(() => [
  { label: '简历', value: overview.value?.resumeCount ?? 0, hint: '进入匹配输入', path: '/resumes', icon: FileText },
  { label: '面试', value: overview.value?.interviewCount ?? 0, hint: '模拟面试记录', path: '/interviews/history', icon: Bell },
  { label: '学习计划', value: overview.value?.studyPlanCount ?? 0, hint: `${overview.value?.todayCompletedTaskCount ?? 0}/${overview.value?.todayTaskCount ?? 0} 今日任务`, path: '/study-plans', icon: BookOpenCheck },
  { label: '能力分', value: skillOverview.value?.overallScore ?? '--', hint: `${skillOverview.value?.gapCount ?? 0} 个短板`, path: '/skill-profile', icon: Radar }
])
const onboardingSteps = computed(() => [
  {
    key: 'target',
    order: 1,
    title: '确定岗位描述',
    desc: overview.value?.currentTargetJob?.jobTitle
      ? `当前目标：${overview.value.currentTargetJob.jobTitle}，岗位描述${formatStatus(overview.value.currentTargetJob.parseStatus)}`
      : '先确定本轮投递方向，并补充岗位要求',
    cta: currentTargetJobId.value ? '查看岗位分析' : '去维护岗位',
    done: Boolean(
      currentTargetJobId.value
        && (!overview.value?.currentTargetJob?.parseStatus || isCompletedStatus(overview.value.currentTargetJob.parseStatus))
    ),
    path: currentTargetJobId.value ? `/job-targets/${currentTargetJobId.value}/analysis` : '/job-targets'
  },
  {
    key: 'resume',
    order: 2,
    title: '补充简历证据',
    desc: overview.value?.resumeCount ? `已有 ${overview.value.resumeCount} 份简历可用于匹配` : '上传或创建一份可用于匹配的简历',
    cta: '去简历中心',
    done: Boolean(overview.value?.resumeCount),
    path: '/resumes'
  },
  {
    key: 'profile',
    order: 3,
    title: '生成匹配画像',
    desc: latestSuccessfulMatchReportId.value
      ? (skillOverview.value?.summary || '可信匹配已就绪，可继续生成能力画像')
      : (latestMatchSummary.value || '把简历和当前岗位做一次可信匹配'),
    cta: latestSuccessfulMatchReportId.value ? '去能力画像' : '去匹配',
    done: Boolean(latestSuccessfulMatchReportId.value && skillOverview.value && !skillOverview.value.empty),
    path: latestSuccessfulMatchReportId.value
      ? { path: '/skill-profile', query: compactQuery({ targetJobId: currentTargetJobId.value, matchReportId: latestSuccessfulMatchReportId.value }) }
      : { path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId.value }) }
  },
  {
    key: 'today',
    order: 4,
    title: '生成今日计划',
    desc: (overview.value?.todayTaskCount || 0) > 0 ? `今日 ${overview.value?.todayCompletedTaskCount || 0}/${overview.value?.todayTaskCount || 0} 已完成` : '让智能教练给出今天最该推进的动作',
    cta: '去今日任务',
    done: Boolean((overview.value?.todayTaskCount || 0) > 0 || activeStudyProgress.value),
    path: '/agent/today'
  }
])
const onboardingProgress = computed(() => ({
  done: onboardingSteps.value.filter((item) => item.done).length,
  total: onboardingSteps.value.length
}))
const nextOnboardingStep = computed(() => onboardingSteps.value.find((item) => !item.done))
const nextActionItems = computed(() => normalizeNextActions(overview.value?.nextActions))
const reportInsightText = computed(() => {
  const weakPoints = overview.value?.recentReport?.weakPoints || []
  const suggestions = overview.value?.recentReport?.suggestions || []
  return [...weakPoints.slice(0, 2), ...suggestions.slice(0, 1)].filter(Boolean).join(' · ')
})
const entries = computed(() => [
  { title: '岗位目标', desc: '维护当前主目标和岗位描述', path: '/job-targets', icon: Crosshair },
  { title: '简历匹配', desc: '生成匹配报告', path: { path: '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId.value }) }, icon: GitCompareArrows },
  { title: '能力画像', desc: latestSuccessfulMatchReportId.value ? '查看短板和动作' : '需先完成可信匹配', path: { path: latestSuccessfulMatchReportId.value ? '/skill-profile' : '/resume-match', query: compactQuery({ targetJobId: currentTargetJobId.value, matchReportId: latestSuccessfulMatchReportId.value }) }, icon: Radar },
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
    overviewError.value = getErrorMessage(error, '工作台概览暂时不可用，已保留常用入口。')
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
    skillError.value = getErrorMessage(error, '能力画像概览暂时不可用。')
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
    notificationError.value = getErrorMessage(error, '通知暂时不可用。')
  } finally {
    notificationLoading.value = false
  }
}

const loadDashboard = () => Promise.allSettled([loadOverview(), loadSkill(), loadNotifications()])

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
.onboarding-panel { display: grid; gap: 16px; }
.onboarding-track { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.onboarding-step { display: grid; gap: 8px; align-content: start; min-height: 132px; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.22); color: var(--app-text); text-align: left; cursor: pointer; }
.onboarding-step:hover, .onboarding-step.is-current { border-color: rgba(59, 130, 246, 0.42); background: rgba(59, 130, 246, 0.1); }
.onboarding-step.is-done { border-color: rgba(34, 197, 94, 0.34); background: rgba(34, 197, 94, 0.08); }
.onboarding-step__marker { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(148, 163, 184, 0.16); color: var(--app-text); font-size: 12px; font-weight: 800; }
.onboarding-step.is-done .onboarding-step__marker { background: rgba(34, 197, 94, 0.18); color: #22c55e; }
.onboarding-step strong { font-size: 14px; }
.onboarding-step > span:last-child { color: var(--app-text-muted); font-size: 12px; line-height: 1.5; }
.onboarding-next { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); color: var(--app-text); }
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
@media (max-width: 1200px) { .onboarding-track { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) { .page-hero { flex-direction: column; } .dashboard-grid, .metric-grid, .onboarding-track { grid-template-columns: 1fr; } .hero-actions, .section-head { flex-wrap: wrap; } }


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
