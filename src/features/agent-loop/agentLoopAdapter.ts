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
      facts: ['No daily review has been recorded yet.'],
      limits: ['Current plan adjustments can only use today task state until a review exists.'],
      drifts: ['No plan drift can be inferred without a review record.'],
      adjustments: ['Complete or skip at least one task, then generate a daily review.'],
      nextActions: ['Open today plan and record task outcomes.']
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
      `Done ${done}, skipped ${skipped}, remaining ${todo}.`,
      ...(completionRate == null ? [] : [`Completion rate ${completionRate}%.`]),
      ...(summary ? [summary] : [])
    ],
    limits: providedLimits.length ? providedLimits : total < 3 || done < 2
      ? ['Task sample is still small; keep conclusions as weak adjustment signals.']
      : ['Review is based on recorded task state and does not prove external job-search outcomes.'],
    drifts: providedDrifts.length ? providedDrifts : skipped > done
      ? ['Skipped actions are outpacing completed actions; the next plan should avoid repeating the same broad task.']
      : todo > 0
        ? ['Some planned actions were not closed; the next plan should preserve or split unfinished work.']
        : ['No obvious drift is visible from the available task counts.'],
    adjustments: providedAdjustments.length ? providedAdjustments : nextActions.length
      ? nextActions
      : summary
        ? [summary]
        : ['Use completed and skipped task facts to keep the next plan smaller and evidence-bound.'],
    nextActions: nextActions.length ? nextActions : ['Review today task outcomes before generating the next plan.']
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
      { label: 'Today plan', path: '/agent/today', reason: 'Use today task state when review routing is unavailable.' },
      { label: 'Task history', path: '/agent/tasks', reason: 'Inspect completed, skipped, and restored task facts.' },
      { label: 'Daily reviews', path: '/agent/reviews', reason: 'Open structured daily review when the V4 growth route is enabled.' }
    ]
  }
}
