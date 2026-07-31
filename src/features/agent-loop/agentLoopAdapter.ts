import type { AgentReviewVO } from '@/api/v4'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import { buildAgentLoopActions, selectKeyAgentActions } from './agentLoopRules'
import type { AgentLoopOverview, AgentReviewSections } from './types'

const normalizeStatus = (value?: string | null) => String(value || '').toUpperCase()

const asList = (items?: string[] | null) => Array.isArray(items) ? items.filter(Boolean) : []

const reviewTotal = (review?: AgentReviewVO | null): number =>
  Number(review?.doneCount || 0) + Number(review?.skippedCount || 0) + Number(review?.todoCount || 0)

export const buildReviewSections = (review?: AgentReviewVO | null): AgentReviewSections => {
  if (!review) {
    return {
      facts: ['尚未生成今日复盘记录。'],
      limits: ['在生成复盘前，计划调整只能依据今天已记录的任务状态。'],
      drifts: ['缺少复盘记录，暂不判断计划是否发生偏移。'],
      adjustments: ['先完成或暂缓至少一项任务，再生成今日复盘。'],
      nextActions: ['打开今日计划并记录任务结果。']
    }
  }

  const done = Number(review.doneCount || 0)
  const skipped = Number(review.skippedCount || 0)
  const todo = Number(review.todoCount || 0)
  const total = reviewTotal(review)
  const completionRate = review.completionRate == null ? undefined : Number(review.completionRate)
  const summary = review.summary?.trim()
  const nextActions = asList(review.nextActions)
  const providedFacts = asList(review.facts)
  const providedLimits = asList(review.limits)
  const providedDrifts = asList(review.driftReasons)
  const providedAdjustments = asList(review.adjustments)

  return {
    facts: providedFacts.length ? providedFacts : [
      `已完成 ${done} 项，已暂缓 ${skipped} 项，待处理 ${todo} 项。`,
      ...(completionRate == null ? [] : [`完成率 ${completionRate}%。`]),
      ...(summary ? [summary] : [])
    ],
    limits: providedLimits.length ? providedLimits : total < 3 || done < 2
      ? ['任务样本仍较少，当前结论仅作为弱调整信号。']
      : ['复盘只基于已记录的任务状态，不能直接证明外部求职结果。'],
    drifts: providedDrifts.length ? providedDrifts : skipped > done
      ? ['暂缓任务多于完成任务，下一轮计划应避免重复安排过于宽泛的任务。']
      : todo > 0
        ? ['部分计划动作尚未闭环，下一轮计划应保留或拆分未完成工作。']
        : ['从当前任务统计中未发现明显计划偏移。'],
    adjustments: providedAdjustments.length ? providedAdjustments : nextActions.length
      ? nextActions
      : summary
        ? [summary]
        : ['依据已完成和已暂缓的任务事实，保持下一轮计划更小、更可验证。'],
    nextActions: nextActions.length ? nextActions : ['生成下一轮计划前，先复盘今天的任务结果。']
  }
}

const latestReview = (reviews?: AgentReviewVO[] | null): AgentReviewVO | undefined =>
  (reviews || [])
    .filter(Boolean)
    .slice()
    .sort((left, right) => {
      const leftDate = new Date(left.reviewDate || left.createdAt || '').getTime()
      const rightDate = new Date(right.reviewDate || right.createdAt || '').getTime()
      return (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0)
    })[0]

const mergeTasks = (plan?: DailyPlanVO | null, todayTasks?: AgentTaskVO[] | null, historyTasks?: AgentTaskVO[] | null): AgentTaskVO[] => {
  const map = new Map<number, AgentTaskVO>()
  ;[...(plan?.tasks || []), ...(todayTasks || []), ...(historyTasks || [])].forEach((task) => {
    if (task?.id != null && !map.has(task.id)) map.set(task.id, task)
  })
  return Array.from(map.values())
}

const weekSummary = (tasks: AgentTaskVO[]) => ({
  total: tasks.length,
  done: tasks.filter((task) => normalizeStatus(task.status) === 'DONE').length,
  skipped: tasks.filter((task) => normalizeStatus(task.status) === 'SKIPPED').length,
  active: tasks.filter((task) => ['TODO', 'DOING'].includes(normalizeStatus(task.status))).length,
  estimatedMinutes: tasks.reduce((sum, task) => sum + (Number(task.estimatedMinutes ?? task.estimatedEffortMinutes) || 0), 0)
})

export const buildAgentLoopOverview = (input: {
  plan?: DailyPlanVO | null
  todayTasks?: AgentTaskVO[] | null
  historyTasks?: AgentTaskVO[] | null
  reviews?: AgentReviewVO[] | null
}): AgentLoopOverview => {
  const tasks = mergeTasks(input.plan, input.todayTasks, input.historyTasks)
  const allActions = buildAgentLoopActions(tasks, { historyTasks: input.historyTasks || tasks })
  const keyActions = selectKeyAgentActions(input.todayTasks?.length ? input.todayTasks : tasks, {
    limit: 3,
    historyTasks: input.historyTasks || tasks
  })
  const review = latestReview(input.reviews)
  const reviewSections = buildReviewSections(review)
  const nextAdjustmentSummary = reviewSections.adjustments[0] || reviewSections.nextActions[0] || 'Keep the next plan tied to recorded task facts.'

  return {
    plan: input.plan || undefined,
    keyActions,
    allActions,
    latestReview: review,
    reviewSections,
    nextAdjustmentSummary,
    weekSummary: weekSummary(tasks),
    fallbackEntries: [
      { label: '今日计划', path: '/agent/today', reason: '复盘入口不可用时，先根据今日任务状态继续推进。' },
      { label: '任务历史', path: '/agent/tasks', reason: '查看已完成、已暂缓和已恢复的任务事实。' },
      { label: '每日复盘', path: '/agent/reviews', reason: '成长模块开放后，可查看结构化每日复盘。' }
    ]
  }
}
