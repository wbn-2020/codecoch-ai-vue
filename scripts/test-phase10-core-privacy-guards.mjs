import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveBackendRoot } from './workspace-paths.mjs'

const frontendRoot = process.cwd()
const backendRoot = resolveBackendRoot(frontendRoot)

const files = {
  aiConvert: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/convert/AiConvert.java'),
  aiConvertTest: path.join(backendRoot, 'codecoachai-ai/src/test/java/com/codecoachai/ai/convert/AiConvertTest.java'),
  adminAiController: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/controller/AdminAiController.java'),
  adminAgentController: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/controller/AdminAgentController.java'),
  adminRawAccessTest: path.join(backendRoot, 'codecoachai-ai/src/test/java/com/codecoachai/ai/controller/AdminRawAccessControllerTest.java'),
  agentServiceTest: path.join(backendRoot, 'codecoachai-ai/src/test/java/com/codecoachai/ai/agent/service/impl/JobCoachAgentServiceImplTest.java'),
  agentService: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/JobCoachAgentServiceImpl.java'),
  agentConvert: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/convert/AgentConvert.java'),
  questionPracticeEvidenceFeign: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/feign/QuestionPracticeEvidenceFeignClient.java'),
  aiPracticeRecordEvidenceVo: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/feign/vo/PracticeRecordEvidenceVO.java'),
  innerPracticeRecordController: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/InnerPracticeRecordController.java'),
  questionPracticeRecordEvidenceVo: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/domain/vo/PracticeRecordAgentEvidenceVO.java'),
  questionAgentNotifier: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/service/impl/AgentBusinessActionNotifier.java'),
  frontendAgentApi: path.join(frontendRoot, 'src/api/agent.ts'),
  frontendAdminAgentApi: path.join(frontendRoot, 'src/api/adminAgent.ts'),
  frontendAiAdminApi: path.join(frontendRoot, 'src/api/aiAdmin.ts'),
  frontendRequest: path.join(frontendRoot, 'src/utils/request.ts'),
  frontendRouteSecurity: path.join(frontendRoot, 'src/utils/routeSecurity.ts'),
  frontendRouterGuards: path.join(frontendRoot, 'src/router/guards.ts'),
  frontendSse: path.join(frontendRoot, 'src/utils/sse.ts'),
  agentTodayView: path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue'),
  agentTaskListView: path.join(frontendRoot, 'src/views/agent/AgentTaskListView.vue'),
  agentRunDetailView: path.join(frontendRoot, 'src/views/agent/AgentRunDetailView.vue'),
  aiCallLogView: path.join(frontendRoot, 'src/views/admin/AiCallLogView.vue'),
  phase2Script: path.join(frontendRoot, 'scripts/test-phase2-ai-truthfulness.mjs'),
  phase4Script: path.join(frontendRoot, 'scripts/test-phase4-agent-review-evidence.mjs'),
  phase5Script: path.join(frontendRoot, 'scripts/test-phase5-ai-review-enhancement.mjs'),
  v4ContractsScript: path.join(frontendRoot, 'scripts/test-v4-contracts.mjs')
}

const content = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file, 'utf8')]))
)

const failures = []
const expect = (condition, category, message) => {
  if (!condition) failures.push({ category, message })
}
const hasAll = (text, needles) => needles.every((needle) => text.includes(needle))
const matchesAll = (text, patterns) => patterns.every((pattern) => pattern.test(text))

expect(hasAll(content.aiConvertTest, [
  'highSensitivityLogDoesNotExposeRawOrPreviewByDefault',
  'rawLogAccessIncludesRawFieldsOnlyWhenExplicitlyRequested',
  'logVoMarksPrimaryProviderResultAsLlm',
  'logVoMarksFallbackRouteAsFallback',
  'logVoMarksMockModelAsMock',
  'assertNull(vo.getRequestPrompt())',
  'assertNull(vo.getResponseContent())',
  'assertFalse(vo.getRawFieldsIncluded())',
  'assertTrue(vo.getRawFieldsAvailable())',
  'assertEquals("admin:ai:log:raw:view", vo.getRawAccessPermission())'
]), 'backend-ai-log', 'AI log tests must keep raw hidden by default and verify LLM/MOCK/FALLBACK source labels')

expect(hasAll(content.aiConvert, [
  'includeRawFields',
  'setRawFieldsAvailable',
  'setRawFieldsIncluded',
  'setRawAccessPermission("admin:ai:log:raw:view")',
  'AiResultSourceEnum.MOCK',
  'AiResultSourceEnum.FALLBACK',
  'AiResultSourceEnum.LLM'
]), 'backend-ai-log', 'AI log converter must retain explicit raw gating and result source derivation')

expect(hasAll(content.adminAiController, [
  'private static final String PERM_LOG_RAW_VIEW = "admin:ai:log:raw:view"',
  '@PostMapping({"/admin/ai/call-logs/{id}/raw", "/admin/ai/logs/{id}/raw"})',
  'permissionGuard.require(PERM_LOG_RAW_VIEW)',
  'String lockKey = requireRawAccess("ai-log-raw:" + id, dto)',
  'promptTemplateService.getLogRaw(id)',
  '@GetMapping({"/admin/ai/call-logs/{id}/raw", "/admin/ai/logs/{id}/raw"})',
  'throw new BusinessException(ErrorCode.PARAM_ERROR'
]), 'backend-admin-raw', 'Admin AI raw log access must require POST, permission, confirmation, and reject GET compatibility calls')

expect(hasAll(content.adminAgentController, [
  'permissionGuard.require("admin:agent:run:list")',
  'permissionGuard.require(RAW_ACCESS_PERMISSION)',
  '@PostMapping("/runs/{id}/raw")',
  'String lockKey = requireRawAccess("agent-run-raw:" + id, dto)',
  'applyRawAccess(detail, false)',
  'applyRawAccess(detail, true)',
  'detail.setInputSnapshotJson(null)',
  'detail.setOutputJson(null)',
  'detail.setRawOutputText(null)'
]), 'backend-admin-raw', 'Admin Agent run detail must hide raw fields by default and require explicit raw endpoint access')

expect(hasAll(content.adminRawAccessTest, [
  'getLogRawRejectsMissingIdempotencyBeforeLoadingRawContent',
  'getLogRawRequiresIdempotencyLockBeforeReturningRawContent',
  'getLogRawReleasesIdempotencyLockWhenRawLoadFails',
  'agentRunRawRejectsMissingIdempotencyBeforeLoadingRawContent',
  'agentRunRawUsesIdempotencyLockBeforeReturningRawContent',
  'verify(promptTemplateService, never()).getLogRaw(any())',
  'verify(v4AdminPermissionGuard).require("admin:ai:log:raw:view")'
]), 'backend-admin-raw', 'Admin raw access controller tests must prevent loading raw content before confirmation and lock acquisition')

expect(hasAll(content.agentServiceTest, [
  'completeTaskScopesUpdateByUserDeletedAndAllowedStatus',
  'completeBusinessActionRejectsQuestionPracticeWithoutPracticeRecordEvidence',
  'completeBusinessActionRejectsPracticeRecordFromDifferentTargetJob',
  'completeBusinessActionCompletesMatchingQuestionPracticeTaskOnce',
  'completeTaskCreatesRuleReviewAndReturnsSafeSummary',
  'completeTaskAiReviewSuccessMarksSourceAsLlmAndStoresCallLog',
  'completeTaskAiReviewFailureKeepsRuleSummaryAndMarksFallback',
  'getRunDetailReturnsUserSafeDetailWithoutRawPayloadAccessors',
  'assertFalse(review.getReviewJson().contains("inputSnapshotJson"))',
  'assertFalse(review.getReviewJson().contains("rawOutputText"))',
  'assertFalse(accessors.contains("getInputSnapshotJson"))',
  'assertFalse(accessors.contains("getOutputJson"))',
  'assertFalse(accessors.contains("getRawOutputText"))',
  'verify(agentTaskMapper, never()).selectList(any())',
  'dto.setEvidenceBizType("PRACTICE_RECORD")',
  'dto.setEvidenceBizId(7001L)',
  'when(questionPracticeEvidenceFeignClient.getPracticeRecordEvidence(USER_ID, 7001L))',
  'practiceEvidence(7001L, USER_ID, "TARGET_JOB", 501L)',
  'practiceEvidence(7001L, USER_ID, "TARGET_JOB", 999L)'
]), 'backend-agent', 'Agent tests must cover ownership-scoped completion, evidence-gated business completion, review source, fallback, and user-safe run detail')

expect(hasAll(content.agentService, [
  'REVIEW_PROMPT_VERSION',
  'TASK_TYPE_QUESTION_PRACTICE',
  'EVIDENCE_TYPE_PRACTICE_RECORD',
  'validateBusinessActionEvidence(dto)',
  'QUESTION_PRACTICE completion requires PRACTICE_RECORD evidence',
  'questionPracticeEvidenceFeignClient.getPracticeRecordEvidence(dto.getUserId(), dto.getEvidenceBizId())',
  'practice record evidence does not belong to user',
  'practice record evidence does not match target job',
  'AiResultSourceEnum.LLM.name()',
  'AiResultSourceEnum.FALLBACK.name()',
  'taskReviewRequestSnapshot',
  'Do not include raw prompts, private resume text, secrets, phone, email, or hidden input snapshots.'
]), 'backend-agent', 'Agent review implementation must retain bounded AI request snapshots and privacy guardrails')

expect(hasAll(content.questionPracticeEvidenceFeign, [
  '@FeignClient(name = "codecoachai-question", contextId = "questionPracticeEvidenceFeignClient")',
  '@GetMapping("/inner/practice-records/users/{userId}/{recordId}/agent-evidence")',
  'Result<PracticeRecordEvidenceVO> getPracticeRecordEvidence'
]), 'backend-agent-evidence', 'AI module must call question service through an internal practice-record evidence Feign client')

expect(hasAll(content.aiPracticeRecordEvidenceVo, [
  'private Long id',
  'private Long userId',
  'private Long questionId',
  'private String sourceType',
  'private Long sourceId',
  'private String reviewStatus'
]), 'backend-agent-evidence', 'AI practice evidence VO must carry user and source binding fields')

expect(hasAll(content.innerPracticeRecordController, [
  '@RequestMapping("/inner/practice-records")',
  '@GetMapping("/users/{userId}/{recordId}/agent-evidence")',
  '.eq(PracticeRecord::getId, recordId)',
  '.eq(PracticeRecord::getUserId, userId)',
  '.eq(PracticeRecord::getDeleted, CommonConstants.NO)',
  'practice record evidence not found',
  'vo.setSourceType(record.getSourceType())',
  'vo.setSourceId(record.getSourceId())'
]), 'backend-agent-evidence', 'Question service must expose internal practice-record evidence scoped by user and deleted flag')

expect(hasAll(content.questionPracticeRecordEvidenceVo, [
  'private Long id',
  'private Long userId',
  'private Long questionId',
  'private String sourceType',
  'private Long sourceId',
  'private String reviewStatus'
]), 'backend-agent-evidence', 'Question practice evidence VO must carry source binding fields')

expect(hasAll(content.questionAgentNotifier, [
  'event.setTaskType("QUESTION_PRACTICE")',
  'event.setRelatedBizType("TARGET_JOB")',
  'event.setEvidenceBizType("PRACTICE_RECORD")',
  'event.setEvidenceBizId(evidenceBizId)',
  'agentBusinessActionFeignClient.completeBusinessAction(event)'
]), 'backend-agent-evidence', 'Question practice notifier must send practice-record evidence when completing Agent tasks')

expect(hasAll(content.agentConvert, [
  'RAW_ACCESS_PERMISSION',
  'vo.setRawAvailable(true)',
  'vo.setRawAccessPermission(RAW_ACCESS_PERMISSION)',
  'vo.setFallback("FALLBACK".equals(trustStatus))'
]), 'backend-agent', 'Agent conversion must retain raw availability metadata and fallback flags')

expect(hasAll(content.frontendAgentApi, [
  'inputSnapshotJson',
  'rawOutputText',
  'rawAccessPermission',
  '...safeRun',
  'void inputSnapshotJson',
  'void outputJson',
  'void rawOutputText',
  'tasks: (safeRun.tasks || []).map(normalizeTask)'
]), 'frontend-user-api', 'User Agent run API wrapper must strip raw diagnostics before returning run detail to normal pages')

expect(hasAll(content.frontendAiAdminApi, [
  'const rawFieldsIncluded = allowRaw && log.rawFieldsIncluded === true',
  'requestPrompt: rawFieldsIncluded ?',
  'requestBody: rawFieldsIncluded ?',
  'promptContent: rawFieldsIncluded ?',
  'responseContent: rawFieldsIncluded ?',
  'responseBody: rawFieldsIncluded ?',
  'getAdminAiLogDetailApi',
  'return normalizeAiCallLog(result)',
  'getAdminAiLogRawApi',
  'return normalizeAiCallLog(result, true)'
]), 'frontend-admin-api', 'Admin AI API wrapper must expose raw fields only through explicit raw access calls')

expect(hasAll(content.aiCallLogView, [
  'resultSourceTagType(row)',
  'resultSourceLabel(detail)',
  'normalizedResultSource',
  "if (source === 'MOCK') return '模拟数据'",
  "if (source === 'FALLBACK') return '降级兜底'",
  "return '真实模型'",
  ':disabled="isAdminMobileReadonly || !canViewRawLog || !detail.rawFieldsAvailable"',
  'confirmSensitiveAccess: true',
  'dryRun: false',
  'idempotencyKey: createOperationIdempotencyKey(`ai-log-raw-${detail.value.id}`)',
  'row.maskedPreview'
]), 'frontend-admin-api', 'AI call log page must keep source labels, masked previews, and permission-gated raw access')

expect(hasAll(content.frontendAdminAgentApi, [
  'getAdminAgentRunDetailApi',
  'getAdminAgentRunRawApi',
  'request.post<AdminAgentRunDetailVO, AdminAgentRunDetailVO>(`/admin/agent/runs/${id}/raw`, data)',
  "rawAccessPermission: run.rawAccessPermission || 'admin:ai:log:raw:view'"
]), 'frontend-admin-api', 'Admin Agent API wrapper must keep raw access on an explicit POST endpoint with permission metadata')

expect(hasAll(content.frontendRequest, [
  "import { buildSafeRedirectFromLocation, sanitizeDiagnosticUrl } from '@/utils/routeSecurity'",
  "import { redactSensitiveText } from '@/utils/sensitiveText'",
  'silentError?: boolean',
  '_retry?: boolean',
  'localBlocked?: boolean',
  'DEMO_READ_ONLY_ALLOW_METHODS',
  'DEMO_READ_ONLY_WRITE_WHITELIST',
  'ADMIN_MOBILE_READ_ONLY_WRITE_WHITELIST',
  'error.localBlocked = true',
  'url: sanitizeDiagnosticUrl(config?.url)',
  'message: redactSensitiveText(toFriendlyMessage(payload.message',
  'config._retry = true',
  'config.headers.Authorization = `Bearer ${token}`',
  'if (!silentError)'
]), 'frontend-request', 'Request wrapper must retain diagnostic URL sanitization, sensitive message redaction, auth retry, silent errors, and local read-only blocks')

expect(hasAll(content.frontendRouteSecurity, [
  'safeRouteQueryKeys',
  'sensitiveRedirectQueryKeys',
  'sensitiveRedirectQueryFragments',
  'isSensitiveRedirectQueryKey',
  'buildSafeRouteQuery',
  'buildSafeRedirectTarget',
  'sanitizeLocalRedirectPath',
  'sanitizeLocalActionPath'
]), 'frontend-route', 'Route security utility must retain allowlist and sensitive query filtering helpers')

expect(matchesAll(content.frontendRouteSecurity, [
  /'prompt'/,
  /'rawoutput'/,
  /'rawprompt'/,
  /'rawresponse'/,
  /'token'/,
  /'jobdescription'/,
  /'resumecontent'/,
  /value\.length <= 128/,
  /\^\[\\w:\.-\]\+\$/
]), 'frontend-route', 'Route security utility must block sensitive query names and constrain forwarded query values')

expect(hasAll(content.frontendRouterGuards, [
  "import { buildSafeRedirectTarget, sanitizeLocalRedirectPath } from '@/utils/routeSecurity'",
  'const safeRedirectTarget = (to: RouteLocationNormalized) => buildSafeRedirectTarget(to.path, to.query)',
  'const safeRedirectPath = (value: unknown) => sanitizeLocalRedirectPath(value)',
  'redirect: safeRedirectTarget(to)',
  'return safeRedirectPath(to.query.redirect) || resolveAuthenticatedEntryPath(authStore)'
]), 'frontend-route', 'Router guards must use sanitized redirects for login, auth-unavailable, and feature-unavailable flows')

expect(hasAll(content.agentTodayView, [
  'taskTrustLabels(task)',
  'sourceTypeLabel',
  'trustStatusLabel',
  '推荐依据不足',
  '来源：',
  'task.evidenceSummary',
  'const reason = cleanUserText(task.reason'
]), 'frontend-agent-page', 'Agent Today must keep source, evidence, recommendation, and fallback trust labels visible')

expect(hasAll(content.agentTaskListView, [
  'sourceTypeLabel',
  'trustStatusLabel',
  '推荐依据不足',
  '来源：',
  'task.evidenceSummary',
  'asyncSensitiveKeyPattern',
  'asyncHiddenFieldText',
  'fallbackAsyncDetailItems',
  'payloadPreview',
  'resultPreview'
]), 'frontend-agent-page', 'Agent Task List must keep source/fallback labels and hide sensitive async diagnostic payload fields')

expect(hasAll(content.agentRunDetailView, [
  'task.reviewSummary',
  'task.reviewNextActions?.length',
  'task.reviewSourceLabel',
  'promptTypeLabel(detail.promptType)'
]), 'frontend-agent-page', 'Agent Run Detail must keep safe review summary and prompt type metadata without raw diagnostics')

expect(hasAll(content.frontendSse, [
  'const controller = new AbortController()',
  'signal.addEventListener(\'abort\', abort, { once: true })',
  'Authorization: `Bearer ${session.token}`',
  'const requestBody = body === undefined ? undefined : JSON.stringify(body)',
  'const event = eventFromData === \'chunk\' ? \'delta\' : eventFromData',
  'getDedupeKey(parsed)',
  'await refreshAccessToken()',
  'if (controller.signal.aborted || !ensureAuthSessionCurrent()) return null',
  'if (!receivedDone)',
  'handlers?.onError?.(error instanceof Error ? error : new Error(String(error)), hasStarted)',
  'signal?.removeEventListener(\'abort\', abort)'
]), 'frontend-sse', 'SSE utility must preserve auth token forwarding, refresh retry, abort cleanup, and interrupted-stream error handling')

expect(hasAll(content.phase2Script, [
  'fallback?: boolean',
  'resultSourceTagType(row)',
  "label: '来源'"
]), 'phase-regression', 'Phase 2 truthfulness script must keep checking source/fallback rendering')

expect(hasAll(content.phase4Script, [
  'inputSnapshotJson',
  'rawOutputText',
  '...safeRun'
]), 'phase-regression', 'Phase 4 review evidence script must keep checking user-safe run detail stripping')

expect(hasAll(content.phase5Script, [
  'completeTaskAiReviewSuccessMarksSourceAsLlmAndStoresCallLog',
  'completeTaskAiReviewFailureKeepsRuleSummaryAndMarksFallback',
  'reviewSourceLabel'
]), 'phase-regression', 'Phase 5 AI review script must keep checking LLM/fallback review source visibility')

expect(hasAll(content.v4ContractsScript, [
  'sse-auth-header',
  'sse-json-body',
  'ai-log-raw-api',
  'agent-run-raw-api',
  'admin-sensitive-raw-access'
]), 'phase-regression', 'V4 contracts must keep route/API/SSE and raw access checks in the main frontend contract suite')

if (failures.length) {
  console.error(`Phase 10 core privacy guard checks failed: ${failures.length}`)
  const grouped = new Map()
  for (const failure of failures) {
    if (!grouped.has(failure.category)) grouped.set(failure.category, [])
    grouped.get(failure.category).push(failure.message)
  }
  for (const [category, messages] of grouped.entries()) {
    console.error(`\n[${category}]`)
    for (const message of messages) console.error(`- ${message}`)
  }
  process.exit(1)
}

console.log('Phase 10 core privacy guard checks passed.')
