import type {
  AgentActionConfidence,
  AgentActionSourceType,
  AgentPlanActionVO,
  AgentPlanLayerKey,
  AgentPlanLayerVO,
  AgentTaskVO,
  AgentWeekPlanVO,
  DailyPlanVO
} from '@/types/agent'
import { getSuggestionSourceTypeLabel } from '@/types/suggestion'
import { buildAgentTaskActionPath } from '@/utils/agentTaskAction'
import type { AgentLoopOverview } from './agent-loop/types'

const maxLayerActions = 3

const normalizeCode = (value?: string | null) => String(value || '').trim().toUpperCase()

const textValue = (...values: Array<string | number | null | undefined>) =>
  values.map((value) => String(value ?? '').trim()).find(Boolean) || ''

const uniqueTexts = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))

const closedStatuses = new Set(['DONE', 'SKIPPED', 'EXPIRED', 'CANCELED', 'CANCELLED'])

const sourceTypeMap: Array<[RegExp, AgentActionSourceType]> = [
  [/APPLICATION_PACKAGE|DELIVERY_PACKAGE|PACKAGE/, 'applicationPackage'],
  [/JOB_APPLICATION|APPLICATION_FOLLOW_UP|APPLICATION_EVENT|APPLICATION/, 'application'],
  [/INTERVIEW_REPORT|REPORT_REVIEW|INTERVIEW/, 'interviewReport'],
  [/JOB_EXPERIMENT_REVIEW|EXPERIMENT_REVIEW|JOB_EXPERIMENT|EXPERIMENT/, 'experimentReview'],
  [/KNOWLEDGE_GAP|SKILL_GAP|SKILL_PROFILE|QUESTION|WRONG_QUESTION|KNOWLEDGE_REVIEW/, 'knowledgeGap'],
  [/AGENT_MEMORY|MEMORY_PREFERENCE|USER_PREFERENCE|PREFERENCE/, 'memoryPreference'],
  [/AGENT_RUN/, 'agentRun'],
  [/AGENT_TASK|JOB_COACH_AGENT_TASK/, 'agentTask']
]

export const normalizeAgentActionSourceType = (value?: string | null): AgentActionSourceType => {
  const normalized = normalizeCode(value)
  if (!normalized) return 'fallback'
  return sourceTypeMap.find(([pattern]) => pattern.test(normalized))?.[1] || normalized
}

const taskEvidence = (task: AgentTaskVO): string[] => {
  const evidenceSources = Array.isArray(task.evidenceSources) ? task.evidenceSources : []
  return uniqueTexts([
    task.evidenceSummary,
    task.reason,
    task.reviewSummary,
    ...evidenceSources.map((source) =>
      textValue(source.evidenceSummary, source.sourceSummary, source.summary, source.sourceTitle, source.title, source.sourceLabel)
    )
  ]).slice(0, 3)
}

const taskSourceTitle = (task: AgentTaskVO, canonicalType: AgentActionSourceType) => {
  const firstEvidence = task.evidenceSources?.find(Boolean)
  return textValue(
    task.sourceTitle,
    firstEvidence?.sourceTitle,
    firstEvidence?.title,
    firstEvidence?.sourceLabel,
    task.relatedSkillName,
    task.targetJobTitle,
    getSuggestionSourceTypeLabel(String(task.sourceType || task.relatedBizType || task.taskType || canonicalType))
  )
}

const taskConfidence = (task: AgentTaskVO): AgentActionConfidence => {
  const confidence = String(task.confidence ?? task.qualityGate?.suggestionStrength ?? '').toUpperCase()
  if (confidence === 'STRONG' || confidence === 'NORMAL') return 'HIGH'
  if (confidence === 'WEAK' || confidence === 'LOW_SAMPLE') return 'LOW'
  if (confidence === 'HIGH' || confidence === 'MEDIUM' || confidence === 'LOW') return confidence
  const trustStatus = normalizeCode(task.trustStatus)
  if (task.fallback || trustStatus === 'FALLBACK') return 'LOW'
  if (trustStatus === 'VERIFIED') return 'HIGH'
  if (trustStatus === 'PARTIAL') return 'MEDIUM'
  return 'UNKNOWN'
}

const sourceReason = (task: AgentTaskVO, evidence: string[]) =>
  textValue(task.reason, task.reviewNote, evidence[0], task.description, '旧接口未返回明确推荐原因，已按任务上下文降级展示。')

const taskRank = (task: AgentTaskVO) => {
  const status = normalizeCode(task.status)
  const priority = normalizeCode(task.priority)
  const statusRank = status === 'DOING' ? 0 : status === 'TODO' ? 5 : 20
  const priorityRank = priority === 'HIGH' ? 0 : priority === 'MEDIUM' ? 5 : 10
  return statusRank + priorityRank
}

export const toAgentPlanAction = (
  task: AgentTaskVO,
  options: { keyPrefix?: string; fallbackPath?: string } = {}
): AgentPlanActionVO => {
  const sourceType = normalizeAgentActionSourceType(task.sourceType || task.relatedBizType || task.taskType)
  const evidence = taskEvidence(task)
  const fallback = Boolean(task.fallback || normalizeCode(task.trustStatus) === 'FALLBACK' || !evidence.length)
  const sourceTitle = taskSourceTitle(task, sourceType)
  const reason = sourceReason(task, evidence)

  return {
    key: `${options.keyPrefix || 'task'}-${task.id}`,
    id: task.id,
    title: textValue(task.title, task.relatedSkillName, task.targetJobTitle, `Agent 任务 #${task.id}`),
    description: textValue(task.description, task.reviewSummary),
    status: task.status,
    priority: task.priority,
    actionPath: buildAgentTaskActionPath(task, options.fallbackPath || '/agent/today'),
    dueText: task.dueDate,
    estimatedMinutes: task.estimatedMinutes ?? task.estimatedEffortMinutes ?? null,
    sourceType,
    sourceId: task.sourceId ?? task.relatedBizId ?? task.id,
    sourceTitle,
    reason,
    evidence: evidence.length ? evidence : ['暂无明确证据摘要，仅保留为弱提醒。'],
    confidence: taskConfidence(task),
    fallback
  }
}

const makeFallbackAction = (
  layer: AgentPlanLayerKey,
  title: string,
  reason: string,
  actionPath = '/agent/today'
): AgentPlanActionVO => ({
  key: `${layer}-fallback`,
  title,
  description: reason,
  status: 'TODO',
  priority: 'LOW',
  actionPath,
  sourceType: 'fallback',
  sourceId: null,
  sourceTitle: '前端降级计划',
  reason,
  evidence: [reason],
  confidence: 'LOW',
  fallback: true
})

const makeLayer = (
  key: AgentPlanLayerKey,
  title: string,
  description: string,
  actions: AgentPlanActionVO[],
  fallbackReason: string
): AgentPlanLayerVO => {
  const fallback = !actions.length || actions.every((action) => action.fallback)
  return {
    key,
    title,
    description,
    actions: actions.length ? actions.slice(0, maxLayerActions) : [makeFallbackAction(key, title, fallbackReason)],
    fallback,
    fallbackReason: fallback ? fallbackReason : undefined
  }
}

const openTasks = (tasks: AgentTaskVO[] = []) =>
  tasks
    .filter((task) => task?.id != null && !closedStatuses.has(normalizeCode(task.status)))
    .slice()
    .sort((left, right) => taskRank(left) - taskRank(right) || left.id - right.id)

const uniqueTasks = (...groups: Array<AgentTaskVO[] | null | undefined>) => {
  const map = new Map<number, AgentTaskVO>()
  groups.flat().forEach((task) => {
    if (task?.id != null && !map.has(task.id)) map.set(task.id, task)
  })
  return Array.from(map.values())
}

const experimentTasks = (tasks: AgentTaskVO[]) =>
  tasks.filter((task) => {
    const text = [
      task.sourceType,
      task.relatedBizType,
      task.taskType,
      task.actionUrl,
      task.reviewSource,
      task.reviewSourceLabel,
      task.title
    ].join(' ')
    return /EXPERIMENT|REVIEW|复盘|实验/i.test(text)
  })

export const buildAgentWeekPlan = (input: {
  plan?: DailyPlanVO | null
  todayTasks?: AgentTaskVO[] | null
  historyTasks?: AgentTaskVO[] | null
  loopOverview?: AgentLoopOverview | null
}): AgentWeekPlanVO => {
  const tasks = uniqueTasks(input.todayTasks, input.plan?.tasks, input.historyTasks)
  const todayActions = openTasks(input.todayTasks?.length ? input.todayTasks : input.plan?.tasks || tasks)
    .map((task) => toAgentPlanAction(task, { keyPrefix: 'today' }))

  const loopTasks = input.loopOverview?.keyActions?.length
    ? input.loopOverview.keyActions.map((action) => action.task)
    : openTasks(tasks)
  const weekActions = loopTasks.map((task) => toAgentPlanAction(task, { keyPrefix: 'week', fallbackPath: '/agent/tasks' }))

  const nextExperimentCandidates = experimentTasks(tasks)
  const nextExperimentActions = nextExperimentCandidates.length
    ? nextExperimentCandidates.map((task) => toAgentPlanAction(task, { keyPrefix: 'next-experiment', fallbackPath: '/agent/tasks' }))
    : [makeFallbackAction(
        'nextExperiment',
        '复盘本周行动后再生成下一轮实验',
        input.loopOverview?.nextAdjustmentSummary || '缺少实验复盘或行动反馈时，仅展示下一轮实验的弱提醒。',
        '/agent/reviews'
      )]

  return {
    planDate: input.plan?.planDate || input.plan?.date,
    targetJobId: input.plan?.targetJobId,
    targetJobTitle: input.plan?.targetJobTitle,
    today: makeLayer(
      'today',
      '今日行动',
      '来自今日 Agent 任务和当日计划的可执行项。',
      todayActions,
      '今日任务和计划都缺少可执行项，可先生成或刷新今日计划。'
    ),
    week: makeLayer(
      'week',
      '本周计划',
      '来自 Agent loop、任务反馈和上下文聚合的本周重点。',
      weekActions,
      '暂未拿到本周历史任务或复盘，只能使用今日任务作为本周弱计划。'
    ),
    nextExperiment: makeLayer(
      'nextExperiment',
      '下一轮实验',
      '来自实验复盘、面试反馈或任务结果的下一轮尝试。',
      nextExperimentActions,
      '缺少实验复盘数据时，不强行生成调度，只保留复盘入口。'
    )
  }
}
