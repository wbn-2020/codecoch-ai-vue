import { appConfig } from '@/config'
import type { AgentTaskVO, AgentTodayTaskVO, DailyPlanVO } from '@/types/agent'
import type { UserDashboardOverviewVO, V3DashboardOverviewVO } from '@/types/dashboard'
import type { SkillProfileOverviewVO } from '@/types/skillProfile'

import type {
  ActionResolverOptions,
  AgentTaskEvidence,
  NextAction,
  ReadinessResult,
  ReadinessRoute,
  ReadinessSource,
  ReadinessStep,
  ReadinessStepKey
} from './types'

const completedStatuses = new Set(['SUCCESS', 'DONE', 'COMPLETED', 'FINISHED', 'GENERATED', 'PARSED', 'ANALYZED'])

const v4PreviewPaths = [
  '/knowledge',
  '/applications',
  '/resume-versions',
  '/agent/memory',
  '/agent/reviews',
  '/growth/profile',
  '/growth/skills',
  '/growth/readiness'
]

const v4PreviewMatchers = [
  /^\/resumes\/[^/]+\/versions(?:\/.*)?$/
]

const defaultKnownPaths = [
  '/dashboard',
  '/dashboard/v3',
  '/profile',
  '/notifications',
  '/job-targets',
  '/resumes',
  '/resume-match',
  '/skill-profile',
  '/agent/today',
  '/agent/tasks',
  '/agent/runs',
  '/questions',
  '/questions/practice',
  '/questions/wrong-records',
  '/questions/favorites',
  '/questions/recommendations',
  '/study-plans',
  '/study-plans/from-gap',
  '/interviews',
  '/interviews/create',
  '/interviews/history',
  '/daily-tasks',
  '/analytics/personal',
  ...v4PreviewPaths
]

const fallbackActionPath = '/agent/today'

const isCompletedStatus = (value?: string) => completedStatuses.has(String(value || '').toUpperCase())

const compactQuery = (query: Record<string, string | number | undefined>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== '')) as Record<
    string,
    string | number
  >

const hasAgentTasks = (tasks?: AgentTodayTaskVO | null) => Boolean(tasks?.tasks?.length || tasks?.total)

const isKnownPath = (path: string, knownPaths: string[]) =>
  knownPaths.some((knownPath) => path === knownPath || path.startsWith(`${knownPath}/`))

const getPathWithoutQuery = (path: string) => path.split(/[?#]/)[0] || path

const isV4PreviewPath = (path: string) =>
  v4PreviewPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ||
  v4PreviewMatchers.some((matcher) => matcher.test(path))

const withQuery = (path: string, query: Record<string, string | number | undefined>): ReadinessRoute => {
  const compacted = compactQuery(query)
  return Object.keys(compacted).length ? { path, query: compacted } : path
}

const getFirstPendingStep = (steps: ReadinessStep[]) => steps.find((step) => !step.done)

const buildStep = (
  key: ReadinessStepKey,
  order: number,
  title: string,
  description: string,
  done: boolean,
  path: ReadinessRoute,
  actionLabel: string,
  reason: string
): ReadinessStep => ({
  key,
  order,
  title,
  description,
  status: done ? 'done' : 'blocked',
  done,
  path,
  actionLabel,
  reason
})

const markCurrentStep = (steps: ReadinessStep[]) => {
  const current = getFirstPendingStep(steps)
  if (current) {
    current.status = 'current'
  }
  return steps
}

const getResumeMatchPath = (matchReportId?: number): ReadinessRoute =>
  matchReportId ? `/resume-match/${matchReportId}` : '/resume-match'

const getTaskTypeActionLabel = (taskType?: string) => {
  const normalized = String(taskType || '').toUpperCase()
  const labels: Record<string, string> = {
    QUESTION_PRACTICE: '去刷题练习',
    WRONG_QUESTION_REVIEW: '去复习错题',
    INTERVIEW: '去创建面试',
    RESUME_OPTIMIZE: '去优化简历',
    STUDY_TASK: '去学习计划',
    REPORT_REVIEW: '去查看报告',
    SKILL_REVIEW: '去查看能力画像'
  }
  return labels[normalized] || '去执行任务'
}

const getTaskSourceLabel = (task: AgentTaskVO) => {
  const bizType = String(task.relatedBizType || '').toUpperCase()
  if (bizType.includes('TARGET_JOB') || task.targetJobId) return '来自目标岗位'
  if (bizType.includes('SKILL')) return '来自能力画像'
  if (bizType.includes('MATCH') || bizType.includes('REPORT')) return '来自匹配报告'
  if (bizType.includes('RESUME')) return '来自简历分析'
  if (bizType.includes('QUESTION')) return '来自题目训练'
  if (bizType.includes('STUDY')) return '来自学习计划'
  return '来自今日 Agent 计划'
}

const getTaskBizLabel = (task: AgentTaskVO) => {
  if (task.relatedBizType && task.relatedBizId) return `${task.relatedBizType} #${task.relatedBizId}`
  if (task.relatedBizType) return task.relatedBizType
  if (task.targetJobTitle) return task.targetJobTitle
  if (task.targetJobId) return `目标岗位 #${task.targetJobId}`
  return '未绑定具体对象'
}

export const resolveSafeActionPath = (
  path?: string,
  options: ActionResolverOptions = appConfig
): { path: string; unavailableReason?: string } => {
  const knownPaths = options.knownPaths || defaultKnownPaths

  if (!path || !path.startsWith('/')) {
    return {
      path: fallbackActionPath,
      unavailableReason: '任务入口暂不可用，已回到今日任务。'
    }
  }

  const routePath = getPathWithoutQuery(path)

  if (routePath === '/tools') {
    return {
      path: options.enableV4Preview ? '/knowledge' : fallbackActionPath,
      unavailableReason: '原任务入口尚未开放，已切换为可用入口。'
    }
  }

  if (!options.enableV4Preview && isV4PreviewPath(routePath)) {
    return {
      path: fallbackActionPath,
      unavailableReason: '该能力处于预览开关后，当前已回到今日任务。'
    }
  }

  if (!isKnownPath(routePath, knownPaths)) {
    return {
      path: fallbackActionPath,
      unavailableReason: '任务入口不存在，已回到今日任务。'
    }
  }

  return { path }
}

export const buildReadinessResult = (params: {
  sourceHint?: ReadinessSource
  userOverview?: UserDashboardOverviewVO | null
  v3Overview?: V3DashboardOverviewVO | null
  skillOverview?: SkillProfileOverviewVO | null
  dailyPlan?: DailyPlanVO | null
  todayTasks?: AgentTodayTaskVO | null
}): ReadinessResult => {
  const overview = params.v3Overview || params.userOverview || null
  const hasFullContext = Boolean(params.v3Overview)
  const hasExecutionContext = !hasFullContext && Boolean(params.dailyPlan || params.todayTasks)
  const source: ReadinessSource = params.sourceHint || (hasFullContext ? 'full' : hasExecutionContext ? 'agent-execution' : 'dashboard-partial')

  const currentTargetJob = params.v3Overview?.currentTargetJob || null
  const currentTargetJobId = currentTargetJob?.targetJobId || currentTargetJob?.id
  const latestMatch = params.v3Overview?.latestMatch || null
  const latestMatchReportId = latestMatch?.matchReportId || latestMatch?.reportId
  const resumeCount = overview?.resumeCount || 0
  const todayTaskCount = overview?.todayTaskCount || params.todayTasks?.total || params.dailyPlan?.tasks?.length || 0

  const hasTarget = Boolean(currentTargetJobId)
  const hasJdAnalysis = Boolean(hasTarget && isCompletedStatus(currentTargetJob?.parseStatus))
  const hasResume = resumeCount > 0
  const hasMatch = Boolean(latestMatchReportId)
  const hasSkillProfile = Boolean(params.skillOverview && !params.skillOverview.empty)
  const hasPlan = Boolean(params.dailyPlan?.runId || hasAgentTasks(params.todayTasks) || todayTaskCount > 0)

  if (source === 'agent-execution') {
    const hasRunnablePlan = Boolean(hasPlan)
    const nextAction: NextAction = {
      title: hasRunnablePlan ? '继续执行今日任务' : '生成今日任务',
      description: hasRunnablePlan
        ? '今日任务已经可执行，优先完成未结束的动作。'
        : '当前还没有可执行任务，可以先生成今日任务。',
      reason: '当前页面只有执行上下文，完整求职准备进度请回到工作台查看。',
      path: fallbackActionPath,
      label: hasRunnablePlan ? '进入今日任务' : '查看今日任务',
      tone: hasRunnablePlan ? 'primary' : 'warning'
    }

    return {
      source,
      sourceNotice: '完整求职准备进度请回到工作台查看；这里按今日任务执行状态降级展示。',
      steps: [],
      doneCount: 0,
      totalCount: 0,
      completionPercent: 0,
      nextAction
    }
  }

  const steps = markCurrentStep([
    buildStep(
      'target-job',
      1,
      '确定目标岗位',
      '选择或创建一个正在准备的目标岗位。',
      hasTarget,
      currentTargetJobId ? `/job-targets/${currentTargetJobId}/edit` : '/job-targets',
      hasTarget ? '查看岗位' : '选择岗位',
      hasTarget ? '已找到当前目标岗位。' : '缺少目标岗位，后续匹配和训练无法聚焦。'
    ),
    buildStep(
      'jd-analysis',
      2,
      '完成 JD 分析',
      '解析岗位要求，提取技能、经验和面试重点。',
      hasJdAnalysis,
      hasTarget ? `/job-targets/${currentTargetJobId}/analysis` : '/job-targets',
      hasJdAnalysis ? '查看分析' : '分析 JD',
      hasJdAnalysis ? '目标岗位已完成解析。' : '需要先完成岗位 JD 分析。'
    ),
    buildStep(
      'resume',
      3,
      '准备简历',
      '上传或维护一份可用于匹配的简历。',
      hasResume,
      '/resumes',
      hasResume ? '查看简历' : '上传简历',
      hasResume ? `已有 ${resumeCount} 份简历。` : '缺少简历，无法生成匹配报告。'
    ),
    buildStep(
      'match-report',
      4,
      '生成匹配报告',
      '对照目标岗位评估简历匹配度。',
      hasMatch,
      getResumeMatchPath(latestMatchReportId),
      hasMatch ? '查看匹配' : '生成匹配',
      hasMatch ? '已找到最近一次岗位匹配报告。' : '需要目标岗位和简历后生成匹配报告。'
    ),
    buildStep(
      'skill-profile',
      5,
      '生成能力画像',
      '从匹配报告中沉淀技能短板和训练重点。',
      hasSkillProfile,
      withQuery('/skill-profile', { targetJobId: currentTargetJobId }),
      hasSkillProfile ? '查看画像' : '生成画像',
      hasSkillProfile ? '能力画像已可用于推荐任务。' : '缺少能力画像，Agent 推荐依据会不完整。'
    ),
    buildStep(
      'agent-plan',
      6,
      '执行今日计划',
      '把岗位差距转成今天可以完成的训练任务。',
      hasPlan,
      fallbackActionPath,
      hasPlan ? '进入任务' : '生成任务',
      hasPlan ? '今日任务已经生成。' : '还没有今日 Agent 任务。'
    )
  ])

  const doneCount = steps.filter((step) => step.done).length
  const totalCount = steps.length
  const completionPercent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0
  const currentStep = getFirstPendingStep(steps)
  let nextAction: NextAction

  if (source === 'dashboard-partial') {
    nextAction = {
      title: '查看求职驾驶舱',
      description: '补齐目标岗位、匹配报告和能力画像上下文后，再生成完整准备进度。',
      reason: '当前只有工作台概要数据，无法判断岗位和匹配链路是否已经完成。',
      path: '/dashboard/v3',
      label: '查看完整进度',
      tone: 'info'
    }
  } else if (currentStep) {
    nextAction = {
      title: currentStep.title,
      description: currentStep.description,
      reason: currentStep.reason,
      path: currentStep.path,
      label: currentStep.actionLabel,
      tone: 'primary'
    }
  } else {
    nextAction = {
      title: '继续今日任务',
      description: '求职准备链路已经闭环，接下来优先完成今日训练。',
      reason: '目标岗位、匹配、能力画像和今日任务均已就绪。',
      path: fallbackActionPath,
      label: '进入今日任务',
      tone: 'success'
    }
  }

  return {
    source,
    sourceNotice:
      source === 'dashboard-partial' ? '缺少岗位和匹配上下文，已按工作台概要数据展示降级进度。' : undefined,
    steps,
    doneCount,
    totalCount,
    completionPercent,
    nextAction
  }
}

export const describeAgentTaskEvidence = (
  task: AgentTaskVO,
  options: ActionResolverOptions = appConfig
): AgentTaskEvidence => {
  const resolved = resolveSafeActionPath(task.actionUrl, options)

  return {
    sourceLabel: getTaskSourceLabel(task),
    skillLabel: task.relatedSkillName || task.relatedSkillCode || '未绑定具体技能',
    bizLabel: getTaskBizLabel(task),
    reason: task.reason || task.description || 'Agent 根据当前求职准备上下文生成了这项任务。',
    safePath: resolved.path,
    actionLabel: getTaskTypeActionLabel(task.taskType),
    unavailableReason: resolved.unavailableReason
  }
}
