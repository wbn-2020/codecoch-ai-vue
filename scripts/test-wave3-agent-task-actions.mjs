import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const frontendRoot = process.cwd()

const loadCommonJsModule = async (relativePath, mocks = {}) => {
  const filename = path.join(frontendRoot, relativePath)
  const source = await readFile(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    throw new Error(`Unexpected require from ${relativePath}: ${id}`)
  }
  new Function('exports', 'require', 'module', compiled)(module.exports, localRequire, module)
  return module.exports
}

const routeSecurity = await loadCommonJsModule('src/utils/routeSecurity.ts')
const agentTaskAction = await loadCommonJsModule('src/utils/agentTaskAction.ts', {
  '@/utils/routeSecurity': routeSecurity
})

const {
  buildAgentTaskActionPath,
  hasAgentTaskActionEntry,
  isEvidenceBoundAgentTask,
  validAgentTaskActionUrl
} = agentTaskAction

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}
const pathPart = (value) => String(value || '').split('?')[0]
const paramsOf = (value) => new URLSearchParams(String(value || '').split('?')[1] || '')

const baseTask = {
  id: 9001,
  status: 'DOING',
  agentRunId: 3001,
  targetJobId: 2001,
  relatedSkillName: 'Redis',
  title: 'Review Redis concepts'
}

const skillReviewTask = {
  ...baseTask,
  taskType: 'SKILL_REVIEW',
  actionUrl: '/study-plans?tab=skills'
}
const skillReviewPath = buildAgentTaskActionPath(skillReviewTask)

expect(hasAgentTaskActionEntry(skillReviewTask), 'SKILL_REVIEW tasks should expose an action entry')
expect(validAgentTaskActionUrl(skillReviewTask) === '/study-plans?tab=skills', 'SKILL_REVIEW should trust a safe backend allowlisted actionUrl')
expect(pathPart(skillReviewPath) === '/study-plans', 'SKILL_REVIEW should preserve the backend actionUrl path instead of rewriting to question practice')
expect(paramsOf(skillReviewPath).get('tab') === 'skills', 'SKILL_REVIEW should preserve backend actionUrl query parameters')

const knowledgeReviewTask = {
  ...baseTask,
  id: 9002,
  taskType: 'KNOWLEDGE_REVIEW',
  actionUrl: '/daily-tasks?tab=knowledge'
}
const knowledgeReviewPath = buildAgentTaskActionPath(knowledgeReviewTask)

expect(hasAgentTaskActionEntry(knowledgeReviewTask), 'KNOWLEDGE_REVIEW tasks should expose an action entry')
expect(validAgentTaskActionUrl(knowledgeReviewTask) === '/daily-tasks?tab=knowledge', 'KNOWLEDGE_REVIEW should trust a safe backend allowlisted actionUrl')
expect(pathPart(knowledgeReviewPath) === '/daily-tasks', 'KNOWLEDGE_REVIEW should preserve the backend actionUrl path instead of rewriting to question practice')
expect(paramsOf(knowledgeReviewPath).get('tab') === 'knowledge', 'KNOWLEDGE_REVIEW should preserve backend actionUrl query parameters')

const unsafeSkillReviewTask = {
  ...baseTask,
  id: 9003,
  taskType: 'SKILL_REVIEW',
  actionUrl: 'https://evil.example/tasks'
}

expect(validAgentTaskActionUrl(unsafeSkillReviewTask) === '', 'Unsafe external actionUrl values must still be rejected')
expect(pathPart(buildAgentTaskActionPath(unsafeSkillReviewTask)) === '/agent/tasks', 'SKILL_REVIEW without a safe actionUrl should fall back to task center')

const evidenceBoundTypes = ['QUESTION_PRACTICE', 'INTERVIEW', 'APPLICATION_FOLLOW_UP', 'RESUME_OPTIMIZE']
for (const taskType of evidenceBoundTypes) {
  expect(isEvidenceBoundAgentTask({ ...baseTask, taskType }), `${taskType} should remain evidence-bound`)
}
expect(!isEvidenceBoundAgentTask(skillReviewTask), 'SKILL_REVIEW is not a backend evidence-bound completion type')

const questionTask = {
  ...baseTask,
  id: 9004,
  taskType: 'QUESTION_PRACTICE'
}
const questionPath = buildAgentTaskActionPath(questionTask)
expect(pathPart(questionPath) === '/questions/practice', 'QUESTION_PRACTICE should keep the question-practice fallback')
expect(paramsOf(questionPath).get('mode') === 'category', 'QUESTION_PRACTICE fallback should keep category mode')

const questionActionUrlTask = {
  ...baseTask,
  id: 9005,
  taskType: 'QUESTION_PRACTICE',
  actionUrl: '/questions/recommendations?source=skill'
}
const questionActionUrlPath = buildAgentTaskActionPath(questionActionUrlTask)
expect(validAgentTaskActionUrl(questionActionUrlTask) === '/questions/recommendations?source=skill', 'QUESTION_PRACTICE should trust a safe question actionUrl')
expect(pathPart(questionActionUrlPath) === '/questions/recommendations', 'QUESTION_PRACTICE should preserve a safe backend actionUrl path instead of forcing /questions/practice')
expect(paramsOf(questionActionUrlPath).get('source') === 'skill', 'QUESTION_PRACTICE should preserve backend actionUrl query parameters')
expect(paramsOf(questionActionUrlPath).get('mode') === null, 'QUESTION_PRACTICE should not append fallback mode when a safe actionUrl already exists')

const questionPreviewTask = {
  ...baseTask,
  id: 9006,
  taskType: 'QUESTION_PRACTICE',
  actionUrl: '/applications?tab=active'
}
expect(validAgentTaskActionUrl(questionPreviewTask) === '', 'QUESTION_PRACTICE should reject preview-only or cross-domain actionUrl values outside question routes')
expect(pathPart(buildAgentTaskActionPath(questionPreviewTask)) === '/questions/practice', 'QUESTION_PRACTICE should fall back to /questions/practice when backend actionUrl points outside allowlisted question routes')

const questionUnknownTask = {
  ...baseTask,
  id: 9007,
  taskType: 'QUESTION_PRACTICE',
  actionUrl: '/unknown-path'
}
expect(validAgentTaskActionUrl(questionUnknownTask) === '', 'QUESTION_PRACTICE should reject unknown local actionUrl values outside the allowlisted question routes')
expect(pathPart(buildAgentTaskActionPath(questionUnknownTask)) === '/questions/practice', 'QUESTION_PRACTICE should keep the safe fallback when backend actionUrl is unknown')

const agentToday = await readFile(path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue'), 'utf8')
const agentTaskList = await readFile(path.join(frontendRoot, 'src/views/agent/AgentTaskListView.vue'), 'utf8')

expect(
  agentToday.includes('!isEvidenceBoundAgentTask(task)') && agentToday.includes('canManuallyCompleteTask(task)'),
  'AgentTodayView should continue hiding manual completion for evidence-bound tasks'
)
expect(
  agentTaskList.includes('!isEvidenceBoundAgentTask(task)') && agentTaskList.includes('canManuallyCloseTask(task)'),
  'AgentTaskListView should continue hiding manual completion for evidence-bound tasks'
)

if (failures.length) {
  console.error(`Wave 3 Agent task action checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Wave 3 Agent task action checks passed.')
