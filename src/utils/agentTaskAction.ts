import type { AgentTaskVO } from '@/types/agent'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'

const TASK_CENTER_PATH = '/agent/tasks'
const PREVIEW_BLOCKED_PATHS = ['/resume-versions']
const DEFERRED_REASON_PREFIX = '推迟：'

const normalizeType = (value?: string | null) => String(value || '').toUpperCase()

export type AgentTaskActionOutcome = 'complete' | 'skip' | 'defer' | 'feedback'

export const AGENT_TASK_ACTION_FLOW = [
  'TODO -> DOING：开始行动，进入处理态',
  'DOING/TODO/EXPIRED -> DONE：完成行动，可补充完成备注',
  'DOING/TODO/EXPIRED -> SKIPPED：跳过行动，必须保留原因',
  'DOING/TODO/EXPIRED -> DEFERRED：推迟行动，保留推迟时间和原因',
  'SKIPPED/DEFERRED -> TODO：恢复待办，重新进入下一轮可执行池',
  '任意任务 -> feedback：提交有用、无用、难度、不相关或原因修正反馈'
] as const

const feedbackTypeLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    HELPFUL: '有用',
    NOT_HELPFUL: '无用',
    TOO_HARD: '太难',
    TOO_EASY: '太简单',
    IRRELEVANT: '不相关',
    REASON_CORRECTION: '原因需修正',
    INACCURATE: '不准确',
    NOT_MY_EXPERIENCE: '不是我的经历',
    HALLUCINATION: '不符合实际'
  }
  return map[normalizeType(value)] || (value ? String(value) : '已反馈')
}

const taskExtraText = (task: AgentTaskVO, key: string) => {
  const value = (task as AgentTaskVO & Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

export const formatAgentTaskDeferReason = (reason: string) => {
  const trimmed = reason.trim()
  return trimmed.startsWith(DEFERRED_REASON_PREFIX) ? trimmed.replace(DEFERRED_REASON_PREFIX, '').trim() : trimmed
}

export const isDeferredAgentTask = (task?: AgentTaskVO | null) => {
  if (!task) return false
  const reason = task.skipReason || taskExtraText(task, 'deferReason')
  const status = normalizeType(task?.status)
  return status === 'DEFERRED' || (status === 'SKIPPED' && Boolean(reason?.trim().startsWith(DEFERRED_REASON_PREFIX)))
}

export const agentTaskDeferReason = (task?: AgentTaskVO | null) => {
  if (!task) return ''
  const explicit = taskExtraText(task, 'deferReason')
  if (explicit) return formatAgentTaskDeferReason(explicit)
  const legacyReason = task.skipReason?.trim()
  return legacyReason?.startsWith(DEFERRED_REASON_PREFIX)
    ? legacyReason.replace(DEFERRED_REASON_PREFIX, '').trim()
    : ''
}

export const buildAgentTaskFeedbackSummary = (params: {
  outcome: AgentTaskActionOutcome
  feedbackType?: string | null
  reason?: string | null
}) => {
  const reason = params.reason?.trim()
  if (params.outcome === 'complete') return reason ? `完成备注：${reason}` : '用户已完成该行动。'
  if (params.outcome === 'skip') return reason ? `跳过原因：${reason}` : '用户跳过了该行动。'
  if (params.outcome === 'defer') return reason ? `推迟原因：${reason}` : '用户将该行动推迟到后续计划。'
  const label = feedbackTypeLabel(params.feedbackType)
  return reason ? `反馈：${label}；补充说明：${reason}` : `反馈：${label}`
}

export const agentTaskFeedbackSummary = (task?: AgentTaskVO | null) => {
  if (!task) return ''
  const explicit = taskExtraText(task, 'feedbackSummary') || taskExtraText(task, 'actionFeedbackSummary')
  if (explicit) return explicit
  const feedbackType = taskExtraText(task, 'lastFeedbackType') || taskExtraText(task, 'feedbackType')
  const feedbackComment = taskExtraText(task, 'feedbackComment') || taskExtraText(task, 'comment')
  if (feedbackType || feedbackComment) {
    return buildAgentTaskFeedbackSummary({
      outcome: 'feedback',
      feedbackType,
      reason: feedbackComment
    })
  }
  if (isDeferredAgentTask(task)) {
    return buildAgentTaskFeedbackSummary({
      outcome: 'defer',
      reason: agentTaskDeferReason(task)
    })
  }
  return ''
}

export const agentTaskNextPlanImpactText = (task?: AgentTaskVO | null) => {
  if (!task) return ''
  const summary = agentTaskFeedbackSummary(task)
  if (isDeferredAgentTask(task)) {
    return summary
      ? `下一轮计划参考：${summary}；后续解释会把它视为“暂缓但可恢复”的行动信号。`
      : '下一轮计划参考：该行动已推迟，后续解释会把它视为暂缓但可恢复的行动信号。'
  }
  if (summary) {
    return `下一轮计划参考：${summary}；后续推荐会参考这条反馈调整排序、拆分或降级。`
  }
  return ''
}

const EVIDENCE_BOUND_TASK_TYPES = new Set([
  'QUESTION_PRACTICE',
  'INTERVIEW',
  'APPLICATION_FOLLOW_UP',
  'RESUME_OPTIMIZE'
])

const REVIEW_ACTION_URL_TASK_TYPES = new Set([
  'SKILL_REVIEW',
  'KNOWLEDGE_REVIEW'
])

export const isEvidenceBoundAgentTask = (task?: AgentTaskVO | null) =>
  EVIDENCE_BOUND_TASK_TYPES.has(normalizeType(task?.taskType))

const getTaskRunId = (task: AgentTaskVO) => task.agentRunId ?? task.runId ?? null

const skillFromText = (value?: string | null) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const taskTitle = (task: AgentTaskVO) =>
  task.title || task.relatedSkillName || task.targetJobTitle || `Task ${task.id}`

export const isAgentJobApplicationTask = (task?: AgentTaskVO | null) => {
  const type = normalizeType(task?.taskType)
  const bizType = normalizeType(task?.relatedBizType)
  return type === 'APPLICATION_FOLLOW_UP' || bizType === 'JOB_APPLICATION'
}

const isReviewActionUrlTask = (task?: AgentTaskVO | null) =>
  REVIEW_ACTION_URL_TASK_TYPES.has(normalizeType(task?.taskType))

const isQuestionTask = (task?: AgentTaskVO | null) => {
  const type = normalizeType(task?.taskType)
  return type.includes('QUESTION')
}

const isInterviewTask = (task?: AgentTaskVO | null) => {
  const type = normalizeType(task?.taskType)
  return type.includes('INTERVIEW') || type.includes('REPORT')
}

const isResumeTask = (task?: AgentTaskVO | null) => normalizeType(task?.taskType).includes('RESUME')

const isStudyTask = (task?: AgentTaskVO | null) => normalizeType(task?.taskType).includes('STUDY')

const isPreviewBlockedPath = (path: string) =>
  PREVIEW_BLOCKED_PATHS.some((item) => path === item || path.startsWith(`${item}/`))

const routeAllowedForTask = (task: AgentTaskVO, value: string) => {
  const [path = ''] = value.split('?')
  if (!path || path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/register') || isPreviewBlockedPath(path)) return false
  if (isReviewActionUrlTask(task)) return path !== TASK_CENTER_PATH
  if (isAgentJobApplicationTask(task)) return path === TASK_CENTER_PATH || path.startsWith('/applications')
  if (isQuestionTask(task)) return path === TASK_CENTER_PATH || path.startsWith('/questions')
  if (isInterviewTask(task)) return path === TASK_CENTER_PATH || path.startsWith('/interviews')
  if (isResumeTask(task)) {
    return path === TASK_CENTER_PATH ||
      path.startsWith('/resumes') ||
      path.startsWith('/resume-match') ||
      path.startsWith('/resume-job-match')
  }
  if (isStudyTask(task)) return path === TASK_CENTER_PATH || path.startsWith('/study-plans') || path.startsWith('/daily-tasks')
  return path !== TASK_CENTER_PATH
}

export const validAgentTaskActionUrl = (task?: AgentTaskVO | null) => {
  if (!task?.actionUrl) return ''
  const safePath = sanitizeLocalActionPath(task.actionUrl, '')
  return safePath && routeAllowedForTask(task, safePath) ? safePath : ''
}

export const hasAgentTaskActionEntry = (task?: AgentTaskVO | null) =>
  Boolean(task && (validAgentTaskActionUrl(task) || isAgentJobApplicationTask(task) || isQuestionTask(task) ||
    isInterviewTask(task) || isResumeTask(task) || isStudyTask(task)))

const appendTaskContext = (params: URLSearchParams, task: AgentTaskVO) => {
  const runId = getTaskRunId(task)
  const sourceType = task.sourceType || task.relatedBizType || task.taskType || 'JOB_COACH_AGENT_TASK'
  const sourceId = task.sourceId || task.relatedBizId || task.id
  const skill = task.relatedSkillName || skillFromText(task.title) || task.targetJobTitle || ''

  params.set('taskId', String(task.id))
  if (runId) params.set('runId', String(runId))
  if (task.targetJobId) params.set('targetJobId', String(task.targetJobId))
  if (sourceType) params.set('sourceType', String(sourceType).toUpperCase())
  if (sourceId) params.set('sourceId', String(sourceId))
  if (task.trustStatus) params.set('trustStatus', String(task.trustStatus).toUpperCase())
  if (task.fallback != null) params.set('fallback', String(Boolean(task.fallback)))
  if (skill) {
    params.set('skillName', skill)
    params.set('keyword', skill)
    params.set('topic', taskTitle(task))
  }
}

export const buildAgentTaskActionPath = (task?: AgentTaskVO | null, fallback = TASK_CENTER_PATH) => {
  if (!task) return fallback
  const actionUrl = validAgentTaskActionUrl(task)
  const [rawPath, rawQuery = ''] = actionUrl.split('?')
  let path = rawPath || fallback
  const params = new URLSearchParams(rawQuery)

  if (isAgentJobApplicationTask(task)) {
    path = actionUrl ? path : fallback
  } else if (isQuestionTask(task)) {
    path = actionUrl && path !== TASK_CENTER_PATH ? path : '/questions/practice'
    if (path === '/questions/practice' && !params.get('mode')) params.set('mode', 'category')
  } else if (isInterviewTask(task)) {
    path = actionUrl && path !== TASK_CENTER_PATH ? path : '/interviews/create'
  } else if (isResumeTask(task)) {
    path = actionUrl && path !== TASK_CENTER_PATH ? path : '/resumes'
  } else if (isStudyTask(task)) {
    path = actionUrl && path !== TASK_CENTER_PATH ? path : '/study-plans'
  }

  appendTaskContext(params, task)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}
