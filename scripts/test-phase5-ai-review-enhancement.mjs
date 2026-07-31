import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveBackendRoot } from './workspace-paths.mjs'

const frontendRoot = process.cwd()
const javaRoot = resolveBackendRoot(frontendRoot)

const serviceFile = path.join(
  javaRoot,
  'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/JobCoachAgentServiceImpl.java'
)
const testFile = path.join(
  javaRoot,
  'codecoachai-ai/src/test/java/com/codecoachai/ai/agent/service/impl/JobCoachAgentServiceImplTest.java'
)
const agentTypesFile = path.join(frontendRoot, 'src/types/agent.ts')
const agentTodayFile = path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue')
const agentTaskListFile = path.join(frontendRoot, 'src/views/agent/AgentTaskListView.vue')
const agentRunDetailFile = path.join(frontendRoot, 'src/views/agent/AgentRunDetailView.vue')

const [
  service,
  tests,
  agentTypes,
  agentToday,
  agentTaskList,
  agentRunDetail
] = await Promise.all([
  readFile(serviceFile, 'utf8'),
  readFile(testFile, 'utf8'),
  readFile(agentTypesFile, 'utf8'),
  readFile(agentTodayFile, 'utf8'),
  readFile(agentTaskListFile, 'utf8'),
  readFile(agentRunDetailFile, 'utf8')
])

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(service.includes('private static final String REVIEW_PROMPT_SCENE = "agent.task.review"'), 'Agent review AI prompt scene must be stable')
expect(service.includes('private static final String REVIEW_PROMPT_VERSION = "agent-task-review-v1"'), 'Agent review AI prompt version must be stable')
expect(service.includes('ctx.setResponseFormat("JSON")'), 'Agent review AI call must request JSON output')
expect(service.includes('ctx.setRequestBody(toJson(taskReviewRequestSnapshot(task, note)))'), 'Agent review AI call must log a bounded request snapshot')
expect(service.includes('aiCallLogService.callAndLog(ctx)'), 'Agent review AI enhancement must use AiCallLogService.callAndLog')
expect(service.includes('!AiResultSourceEnum.LLM.name().equals(result.getResultSource())'), 'Agent review must only accept true LLM results as AI summaries')
expect(service.includes('review.setAiCallLogId(result.getAiCallLogId())'), 'Agent review must store AI call log id on LLM success')
expect(service.includes('rewriteReviewMetadata(review, AiResultSourceEnum.LLM.name(), null, REVIEW_PROMPT_VERSION)'), 'Agent review must mark successful AI summaries as LLM')
expect(service.includes('rewriteReviewMetadata(review, AiResultSourceEnum.FALLBACK.name(), ex.getClass().getSimpleName(), REVIEW_PROMPT_VERSION)'), 'Agent review must mark AI failures as FALLBACK with failure reason')
expect(service.includes('Do not include raw prompts, private resume text, secrets, phone, email, or hidden input snapshots.'), 'Agent review prompt must include privacy guardrails')

expect(tests.includes('completeTaskAiReviewSuccessMarksSourceAsLlmAndStoresCallLog'), 'Backend test must cover LLM success source and call log linkage')
expect(tests.includes('completeTaskAiReviewFailureKeepsRuleSummaryAndMarksFallback'), 'Backend test must cover AI failure fallback behavior')
expect(tests.includes('aiResult.setResultSource("LLM")'), 'Backend LLM test must use an explicit LLM source')
expect(tests.includes('when(aiCallLogService.callAndLog(any())).thenThrow'), 'Backend fallback test must simulate AI call failure')

expect(agentTypes.includes("reviewSource?: 'RULE' | 'LLM' | 'FALLBACK' | string | null"), 'Frontend AgentTaskVO must type review source values')
expect(agentTypes.includes('reviewSourceLabel?: string | null'), 'Frontend AgentTaskVO must expose review source label')
expect(agentToday.includes('task.reviewSourceLabel'), 'Agent Today must render review source label')
expect(agentTaskList.includes('task.reviewSourceLabel'), 'Agent Task List must render review source label')
expect(agentRunDetail.includes('task.reviewSourceLabel'), 'Agent Run Detail must render review source label')

if (failures.length) {
  console.error(`Phase 5 AI review enhancement checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Phase 5 AI review enhancement checks passed.')
