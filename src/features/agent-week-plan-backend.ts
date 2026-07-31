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

const taskTypeLabels: Record<string, string> = {
  QUESTION_PRACTICE: '刷题练习',
  WRONG_QUESTION_REVIEW: '错题复习',
  INTERVIEW: '模拟面试',
  RESUME_OPTIMIZE: '简历优化',
  STUDY_TASK: '学习任务',
  REPORT_REVIEW: '报告复盘',
  SKILL_REVIEW: '技能复习',
  KNOWLEDGE_REVIEW: '知识复盘',
  APPLICATION_FOLLOW_UP: '投递跟进'
}

const sourceLabels: Record<string, string> = {
  TARGET_JOB: '目标岗位',
  JOB_TARGET: '目标岗位',
  JD_ANALYSIS: '岗位要求分析',
  INTERVIEW_REPORT: '面试报告',
  RESUME_MATCH: '简历匹配',
  AGENT_TASK: '智能任务',
  AGENT_RUN: '计划记录'
}

const technicalTextMap: Record<string, string> = {
  'Derived from TARGET_JOB status and safe source metadata.': '依据已关联的目标岗位和已记录信息生成。',
  'Derived from TARGET_JOB signal.': '依据已关联的目标岗位信号生成。',
  'Low-sample evidence; treat as a weak observation.': '样本较少，仅作为弱观察依据。'
}

const auditEvidenceKeys = new Set([
  'TASK',
  'RUN',
  'TRACE',
  'TITLEHASH',
  'TITLE_HASH',
  'AGENTTASKID',
  'AGENT_TASK_ID',
  'AGENTRUNID',
  'AGENT_RUN_ID',
  'RESULTSOURCE',
  'RESULT_SOURCE'
])

const userFacingText = (value?: string | null, fallback = '') => {
  const text = String(value || '').trim()
  if (!text) return fallback
  if (technicalTextMap[text]) return technicalTextMap[text]
  return sourceLabels[normalizeCode(text)] || text
}

const userFacingEvidence = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match = raw.match(/^([a-z][a-z0-9_]*?)\s*=\s*(.+)$/i)
  if (match) {
    const key = normalizeCode(match[1])
    const data = String(match[2] || '').trim()
    if (auditEvidenceKeys.has(key)) return ''
    if (key === 'SOURCE') {
      return sourceLabels[normalizeCode(data)] || '已关联的业务来源。'
    }
  }
  return userFacingText(raw)
}

const userFacingTitle = (item: AgentWeekPlanBackendItemVO, index: number) => {
  const raw = textValue(item.title, item.relatedBizTitle)
  if (/^agent task #\d+(?:\s+[A-Z_]+)?$/i.test(raw)) {
    return `${taskTypeLabels[normalizeCode(item.actionType)] || '今日'}任务`
  }
  return userFacingText(raw, taskTypeLabels[normalizeCode(item.actionType)] || `周计划项 ${item.id ?? index + 1}`)
}

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
    ? item.evidence.map((line) => userFacingEvidence(String(line || ''))).filter(Boolean)
    : []
  if (item.sampleInsufficient || item.sampleWarning) {
    evidence.unshift(userFacingText(item.sampleWarning, '样本较少，仅作为弱观察依据。'))
  }
  return evidence.length
    ? evidence.slice(0, 3)
    : [userFacingText(
      textValue(item.fallbackReason, item.reason, item.relatedBizType, item.actionType),
      '后端仅返回弱摘要'
    )]
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
    title: userFacingTitle(item, index),
    description: userFacingText(textValue(item.description, item.fallbackReason)),
    status: item.itemStatus,
    priority: item.priority,
    actionPath: item.actionUrl || (item.agentTaskId ? '/agent/tasks' : '/agent/today'),
    dueText: item.dueDate || item.plannedDate,
    estimatedMinutes: null,
    sourceType,
    sourceId: item.relatedBizId ?? item.agentTaskId ?? item.id ?? null,
    sourceTitle: userFacingText(
      textValue(item.relatedBizTitle, item.relatedBizType, item.actionType),
      '后端周计划'
    ),
    reason: userFacingText(textValue(item.reason, item.fallbackReason, item.description, evidence[0])),
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
  const weekStart = String(plan.weekStartDate || plan.planDate || '').slice(0, 10)
  const weekEnd = String(plan.weekEndDate || '').slice(0, 10)
  const items = (plan.items || [])
    .filter(Boolean)
    .filter((item) => {
      const plannedDate = String(item.plannedDate || item.dueDate || '').slice(0, 10)
      return !plannedDate || !weekStart || !weekEnd || (plannedDate >= weekStart && plannedDate <= weekEnd)
    })
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
