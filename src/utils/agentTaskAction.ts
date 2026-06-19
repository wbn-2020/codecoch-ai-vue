import type { AgentTaskVO } from '@/types/agent'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'

const TASK_CENTER_PATH = '/agent/tasks'

const normalizeType = (value?: string | null) => String(value || '').toUpperCase()

const EVIDENCE_BOUND_TASK_TYPES = new Set([
  'QUESTION_PRACTICE',
  'INTERVIEW',
  'APPLICATION_FOLLOW_UP',
  'RESUME_OPTIMIZE'
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

const isQuestionTask = (task?: AgentTaskVO | null) => {
  const type = normalizeType(task?.taskType)
  return type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')
}

const isInterviewTask = (task?: AgentTaskVO | null) => {
  const type = normalizeType(task?.taskType)
  return type.includes('INTERVIEW') || type.includes('REPORT')
}

const isResumeTask = (task?: AgentTaskVO | null) => normalizeType(task?.taskType).includes('RESUME')

const isStudyTask = (task?: AgentTaskVO | null) => normalizeType(task?.taskType).includes('STUDY')

const routeAllowedForTask = (task: AgentTaskVO, value: string) => {
  const [path = ''] = value.split('?')
  if (!path || path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/register')) return false
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
    path = actionUrl && path !== TASK_CENTER_PATH ? path : '/applications'
  } else if (isQuestionTask(task)) {
    path = '/questions/practice'
    if (!params.get('mode')) params.set('mode', 'category')
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
