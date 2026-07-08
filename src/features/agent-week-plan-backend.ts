import type {
  AgentActionConfidence,
  AgentPlanActionVO,
  AgentPlanLayerKey,
  AgentPlanLayerVO,
  AgentWeekPlanBackendItemVO,
  AgentWeekPlanBackendVO,
  AgentWeekPlanVO
} from '@/types/agent'
import { normalizeAgentActionSourceType } from './agent-week-plan'

const maxLayerActions = 3

const normalizeCode = (value?: string | null) => String(value || '').trim().toUpperCase()

const textValue = (...values: Array<string | number | null | undefined>) =>
  values.map((value) => String(value ?? '').trim()).find(Boolean) || ''

const layerMap: Record<string, AgentPlanLayerKey> = {
  TODAY: 'today',
  WEEK: 'week',
  NEXT_EXPERIMENT: 'nextExperiment'
}

const layerMeta: Record<AgentPlanLayerKey, { title: string; description: string; fallbackReason: string }> = {
  today: {
    title: '今日行动',
    description: '来自后端持久化周计划的今日可执行项。',
    fallbackReason: '后端周计划暂未返回今日行动，已回退到前端派生计划。'
  },
  week: {
    title: '本周计划',
    description: '来自投递、面试、实验、知识/记忆引用和任务反馈的后端聚合重点。',
    fallbackReason: '后端周计划暂未返回本周行动，已回退到前端派生计划。'
  },
  nextExperiment: {
    title: '下一轮实验',
    description: '来自低样本观察、复盘反馈或下一步验证建议。',
    fallbackReason: '后端周计划暂未返回实验建议，已回退到前端派生计划。'
  }
}

const emptyLayers = () => ({
  today: [] as AgentPlanActionVO[],
  week: [] as AgentPlanActionVO[],
  nextExperiment: [] as AgentPlanActionVO[]
})

const confidenceFromBackend = (
  value?: number | string | null,
  level?: string | null
): AgentActionConfidence => {
  const explicitLevel = normalizeCode(level)
  if (explicitLevel === 'HIGH' || explicitLevel === 'MEDIUM' || explicitLevel === 'LOW' || explicitLevel === 'UNKNOWN') {
    return explicitLevel
  }
  if (typeof value === 'string') {
    const normalized = normalizeCode(value)
    if (normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') return normalized
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return confidenceFromBackend(parsed)
    return 'UNKNOWN'
  }
  if (value == null || Number.isNaN(value)) return 'UNKNOWN'
  const normalized = value > 1 ? value / 100 : value
  if (normalized >= 0.75) return 'HIGH'
  if (normalized >= 0.5) return 'MEDIUM'
  return 'LOW'
}

const safeEvidence = (item: AgentWeekPlanBackendItemVO) => {
  const evidence = Array.isArray(item.evidence)
    ? item.evidence.map((line) => String(line || '').trim()).filter(Boolean)
    : []
  if (item.sampleInsufficient || item.sampleWarning) {
    evidence.unshift(textValue(item.sampleWarning, 'Low-sample evidence; treat as a weak observation.'))
  }
  return evidence.length
    ? evidence.slice(0, 3)
    : [textValue(item.fallbackReason, item.reason, item.relatedBizType, item.actionType, '后端仅返回弱摘要')]
}

const toLayerKey = (item: AgentWeekPlanBackendItemVO): AgentPlanLayerKey =>
  layerMap[normalizeCode(item.layer)] || 'week'

const toAction = (item: AgentWeekPlanBackendItemVO, index: number): AgentPlanActionVO => {
  const sourceType = normalizeAgentActionSourceType(item.relatedBizType || item.actionType || 'AGENT_WEEK_PLAN_ITEM')
  const evidence = safeEvidence(item)
  const fallback = Boolean(item.fallback || normalizeCode(item.trustStatus) === 'FALLBACK')
  const id = item.agentTaskId ?? item.id ?? null

  return {
    key: `week-plan-item-${item.id ?? item.agentTaskId ?? item.sortOrder ?? index}`,
    id,
    title: textValue(item.title, item.relatedBizTitle, item.actionType, `周计划项 ${id ?? index + 1}`),
    description: textValue(item.description, item.fallbackReason),
    status: item.itemStatus,
    priority: item.priority,
    actionPath: item.actionUrl || (item.agentTaskId ? '/agent/tasks' : '/agent/today'),
    dueText: item.dueDate || item.plannedDate,
    estimatedMinutes: null,
    sourceType,
    sourceId: item.relatedBizId ?? item.agentTaskId ?? item.id ?? null,
    sourceTitle: textValue(item.relatedBizTitle, item.relatedBizType, item.actionType, '后端周计划'),
    reason: textValue(item.reason, item.fallbackReason, item.description, evidence[0]),
    evidence,
    confidence: confidenceFromBackend(item.confidence, item.confidenceLevel),
    fallback
  }
}

const makeFallbackAction = (key: AgentPlanLayerKey): AgentPlanActionVO => {
  const meta = layerMeta[key]
  return {
    key: `backend-${key}-fallback`,
    title: meta.title,
    description: meta.fallbackReason,
    status: 'TODO',
    priority: 'LOW',
    actionPath: '/agent/tasks',
    dueText: undefined,
    estimatedMinutes: null,
    sourceType: 'fallback',
    sourceId: null,
    sourceTitle: '后端周计划',
    reason: meta.fallbackReason,
    evidence: [meta.fallbackReason],
    confidence: 'LOW',
    fallback: true
  }
}

const makeLayer = (key: AgentPlanLayerKey, actions: AgentPlanActionVO[]): AgentPlanLayerVO => {
  const meta = layerMeta[key]
  const visibleActions = actions.length ? actions.slice(0, maxLayerActions) : [makeFallbackAction(key)]
  const fallback = !visibleActions.length || visibleActions.every((action) => action.fallback)
  return {
    key,
    title: meta.title,
    description: meta.description,
    actions: visibleActions,
    fallback,
    fallbackReason: fallback ? meta.fallbackReason : undefined
  }
}

export const hasBackendWeekPlanItems = (plan?: AgentWeekPlanBackendVO | null) =>
  Boolean(plan?.items?.some((item) => item?.id != null || item?.agentTaskId != null || item?.title))

export const buildAgentWeekPlanFromBackend = (plan: AgentWeekPlanBackendVO): AgentWeekPlanVO => {
  const layers = emptyLayers()
  const items = (plan.items || [])
    .filter(Boolean)
    .slice()
    .sort((left, right) =>
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
      || String(left.plannedDate || '').localeCompare(String(right.plannedDate || ''))
      || (left.id ?? 0) - (right.id ?? 0)
    )

  items.forEach((item, index) => {
    layers[toLayerKey(item)].push(toAction(item, index))
  })

  return {
    planDate: plan.planDate || plan.weekStartDate,
    targetJobId: plan.targetJobId ?? undefined,
    targetJobTitle: undefined,
    today: makeLayer('today', layers.today),
    week: makeLayer('week', layers.week),
    nextExperiment: makeLayer('nextExperiment', layers.nextExperiment)
  }
}
