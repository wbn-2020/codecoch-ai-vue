import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(frontendRoot, '..')
const backendRoot = existsSync(path.join(workspaceRoot, 'codecoch-ai-java'))
  ? path.join(workspaceRoot, 'codecoch-ai-java')
  : path.join(workspaceRoot, 'CodeCoachAI-java')

const read = (file) => readFile(file, 'utf8')
const frontendApiFile = path.join(frontendRoot, 'src/api/v4.ts')
const routeFile = path.join(frontendRoot, 'src/router/routes.ts')
const sidebarFile = path.join(frontendRoot, 'src/components/layout/UserSidebar.vue')
const adminSidebarFile = path.join(frontendRoot, 'src/components/layout/AdminSidebar.vue')
const jobCoachHomePageFile = path.join(frontendRoot, 'src/views/user/JobCoachHomeView.vue')
const resumeVersionPageFile = path.join(frontendRoot, 'src/views/v4/ResumeVersionView.vue')
const resumeMatchPageFile = path.join(frontendRoot, 'src/views/v3/ResumeMatchView.vue')
const resumeMatchDetailPageFile = path.join(frontendRoot, 'src/views/v3/ResumeMatchDetailView.vue')
const jobApplicationPageFile = path.join(frontendRoot, 'src/views/v4/JobApplicationView.vue')
const resumeJobMatchApiFile = path.join(frontendRoot, 'src/api/resumeJobMatch.ts')
const resumeJobMatchTypesFile = path.join(frontendRoot, 'src/types/resumeJobMatch.ts')
const knowledgePageFile = path.join(frontendRoot, 'src/views/v4/KnowledgeBaseView.vue')
const sseUtilFile = path.join(frontendRoot, 'src/utils/sse.ts')
const analyticsApiFile = path.join(frontendRoot, 'src/api/analytics.ts')
const questionApiFile = path.join(frontendRoot, 'src/api/question.ts')
const questionCategoryApiFile = path.join(frontendRoot, 'src/api/questionCategory.ts')
const questionTagApiFile = path.join(frontendRoot, 'src/api/questionTag.ts')
const questionGroupApiFile = path.join(frontendRoot, 'src/api/questionGroup.ts')
const userApiFile = path.join(frontendRoot, 'src/api/user.ts')
const userTypesFile = path.join(frontendRoot, 'src/types/user.ts')
const adminGovernanceTypesFile = path.join(frontendRoot, 'src/types/adminGovernance.ts')
const adminGovernanceApiFile = path.join(frontendRoot, 'src/api/adminGovernance.ts')
const aiAdminApiFile = path.join(frontendRoot, 'src/api/aiAdmin.ts')
const adminAgentApiFile = path.join(frontendRoot, 'src/api/adminAgent.ts')
const systemApiFile = path.join(frontendRoot, 'src/api/system.ts')
const userLayoutFile = path.join(frontendRoot, 'src/layouts/UserLayout.vue')
const routerGuardsFile = path.join(frontendRoot, 'src/router/guards.ts')
const adminAccessFile = path.join(frontendRoot, 'src/router/adminAccess.ts')
const adminOpsPageFile = path.join(frontendRoot, 'src/views/admin/AdminOpsOverviewView.vue')
const adminAsyncTaskPageFile = path.join(frontendRoot, 'src/views/admin/AsyncTaskView.vue')
const adminAiCallLogPageFile = path.join(frontendRoot, 'src/views/admin/AiCallLogView.vue')
const adminAgentRunPageFile = path.join(frontendRoot, 'src/views/admin/AdminAgentRunView.vue')
const adminSystemConfigPageFile = path.join(frontendRoot, 'src/views/admin/SystemConfigView.vue')
const adminMenuPermissionPageFile = path.join(frontendRoot, 'src/views/admin/MenuPermissionView.vue')
const adminAnalyticsJobsPageFile = path.join(frontendRoot, 'src/views/admin/AdminAnalyticsJobsView.vue')
const adminAnalyticsMetricsPageFile = path.join(frontendRoot, 'src/views/admin/AdminAnalyticsMetricsView.vue')
const adminAiOpsAnalyticsPageFile = path.join(frontendRoot, 'src/views/admin/AdminAiOpsAnalyticsView.vue')
const adminPromptRegressionPageFile = path.join(frontendRoot, 'src/views/admin/AdminPromptRegressionView.vue')
const adminPromptTemplatePageFile = path.join(frontendRoot, 'src/views/admin/PromptTemplateView.vue')
const adminQuestionPageFile = path.join(frontendRoot, 'src/views/admin/QuestionManageView.vue')
const adminQuestionCategoryPageFile = path.join(frontendRoot, 'src/views/admin/QuestionCategoryManageView.vue')
const adminQuestionTagPageFile = path.join(frontendRoot, 'src/views/admin/QuestionTagManageView.vue')
const adminQuestionGroupPageFile = path.join(frontendRoot, 'src/views/admin/QuestionGroupManageView.vue')
const adminQuestionRelationPageFile = path.join(frontendRoot, 'src/views/admin/QuestionRelationManageView.vue')
const adminAiModelConfigPageFile = path.join(frontendRoot, 'src/views/admin/AiModelConfigView.vue')
const adminUserManagePageFile = path.join(frontendRoot, 'src/views/admin/UserManageView.vue')
const adminRoleManagePageFile = path.join(frontendRoot, 'src/views/admin/RoleManageView.vue')
const adminNotificationManagePageFile = path.join(frontendRoot, 'src/views/admin/NotificationManageView.vue')
const industryTemplateApiFile = path.join(frontendRoot, 'src/api/industryTemplate.ts')
const adminIndustryTemplatePageFile = path.join(frontendRoot, 'src/views/admin/IndustryTemplateManageView.vue')
const announcementApiFile = path.join(frontendRoot, 'src/api/announcement.ts')
const adminAnnouncementPageFile = path.join(frontendRoot, 'src/views/admin/AnnouncementManageView.vue')
const adminFilePageFile = path.join(frontendRoot, 'src/views/admin/AdminFileManageView.vue')
const fileTypesFile = path.join(frontendRoot, 'src/types/file.ts')
const agentTodayPageFile = path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue')
const agentTaskListPageFile = path.join(frontendRoot, 'src/views/agent/AgentTaskListView.vue')
const agentApiFile = path.join(frontendRoot, 'src/api/agent.ts')
const agentTypesFile = path.join(frontendRoot, 'src/types/agent.ts')
const resumeInnerApplicationControllerFile = path.join(backendRoot, 'codecoachai-resume/src/main/java/com/codecoachai/resume/controller/InnerJobApplicationController.java')
const aiResumeAgentContextFeignFile = path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/feign/ResumeAgentContextFeignClient.java')
const aiAgentTaskTypeEnumFile = path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/domain/enums/AgentTaskTypeEnum.java')
const aiAgentPromptBuilderFile = path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/AgentPromptBuilderImpl.java')

const backendFiles = {
  growth: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/controller/AgentGrowthController.java'),
  knowledge: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/controller/AgentKnowledgeController.java'),
  knowledgeSse: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/controller/AgentKnowledgeSseController.java'),
  resumeCareer: path.join(backendRoot, 'codecoachai-resume/src/main/java/com/codecoachai/resume/controller/V4ResumeCareerController.java'),
  adminAnnouncement: path.join(backendRoot, 'codecoachai-system/src/main/java/com/codecoachai/system/controller/AdminAnnouncementController.java'),
  adminQuestion: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/AdminQuestionController.java'),
  adminQuestionImport: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/AdminQuestionImportController.java'),
  adminQuestionMetadata: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/AdminQuestionMetadataController.java'),
  adminQuestionReview: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/AdminQuestionReviewController.java'),
  adminQuestionDuplicate: path.join(backendRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/controller/AdminQuestionDuplicateReviewController.java'),
  adminAi: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/controller/AdminAiController.java'),
  adminSearch: path.join(backendRoot, 'codecoachai-search/src/main/java/com/codecoachai/search/controller/AdminSearchController.java'),
  adminFile: path.join(backendRoot, 'codecoachai-file/src/main/java/com/codecoachai/file/controller/AdminFileController.java'),
  adminFileDownloadDto: path.join(backendRoot, 'codecoachai-file/src/main/java/com/codecoachai/file/domain/dto/AdminFileDownloadAccessDTO.java'),
  systemConfig: path.join(backendRoot, 'codecoachai-system/src/main/java/com/codecoachai/system/controller/SystemConfigController.java'),
  adminMenu: path.join(backendRoot, 'codecoachai-system/src/main/java/com/codecoachai/system/controller/AdminMenuController.java')
}

const [
  frontendApi,
  routes,
  sidebar,
  adminSidebar,
  jobCoachHomePage,
  resumeVersionPage,
  resumeMatchPage,
  resumeMatchDetailPage,
  knowledgePage,
  sseUtil,
  analyticsApi,
  questionApi,
  questionCategoryApi,
  questionTagApi,
  questionGroupApi,
  userApi,
  userTypes,
  adminGovernanceTypes,
  adminGovernanceApi,
  aiAdminApi,
  adminAgentApi,
  systemApi,
  userLayout,
  routerGuards,
  adminAccess,
  adminOpsPage,
  adminAsyncTaskPage,
  adminAiCallLogPage,
  adminAgentRunPage,
  adminSystemConfigPage,
  adminMenuPermissionPage,
  adminAnalyticsJobsPage,
  adminAnalyticsMetricsPage,
  adminAiOpsAnalyticsPage,
  adminPromptRegressionPage,
  adminPromptTemplatePage,
  adminQuestionPage,
  adminQuestionCategoryPage,
  adminQuestionTagPage,
  adminQuestionGroupPage,
  adminQuestionRelationPage,
  adminAiModelConfigPage,
  adminUserManagePage,
  adminRoleManagePage,
  adminNotificationManagePage,
  industryTemplateApi,
  adminIndustryTemplatePage,
  announcementApi,
  adminAnnouncementPage,
  adminFilePage,
  fileTypes,
  agentTodayPage,
  agentTaskListPage,
  agentApi,
  agentTypes,
  resumeInnerApplicationController,
  aiResumeAgentContextFeign,
  aiAgentTaskTypeEnum,
  aiAgentPromptBuilder,
  growthController,
  knowledgeController,
  knowledgeSseController,
  resumeCareerController,
  adminAnnouncementController,
  adminQuestionController,
  adminQuestionImportController,
  adminQuestionMetadataController,
  adminQuestionReviewController,
  adminQuestionDuplicateController,
  adminAiController,
  adminSearchController,
  adminFileController,
  adminFileDownloadDto,
  systemConfigController,
  adminMenuController
] = await Promise.all([
  read(frontendApiFile),
  read(routeFile),
  read(sidebarFile),
  read(adminSidebarFile),
  read(jobCoachHomePageFile),
  read(resumeVersionPageFile),
  read(resumeMatchPageFile),
  read(resumeMatchDetailPageFile),
  read(knowledgePageFile),
  read(sseUtilFile),
  read(analyticsApiFile),
  read(questionApiFile),
  read(questionCategoryApiFile),
  read(questionTagApiFile),
  read(questionGroupApiFile),
  read(userApiFile),
  read(userTypesFile),
  read(adminGovernanceTypesFile),
  read(adminGovernanceApiFile),
  read(aiAdminApiFile),
  read(adminAgentApiFile),
  read(systemApiFile),
  read(userLayoutFile),
  read(routerGuardsFile),
  read(adminAccessFile),
  read(adminOpsPageFile),
  read(adminAsyncTaskPageFile),
  read(adminAiCallLogPageFile),
  read(adminAgentRunPageFile),
  read(adminSystemConfigPageFile),
  read(adminMenuPermissionPageFile),
  read(adminAnalyticsJobsPageFile),
  read(adminAnalyticsMetricsPageFile),
  read(adminAiOpsAnalyticsPageFile),
  read(adminPromptRegressionPageFile),
  read(adminPromptTemplatePageFile),
  read(adminQuestionPageFile),
  read(adminQuestionCategoryPageFile),
  read(adminQuestionTagPageFile),
  read(adminQuestionGroupPageFile),
  read(adminQuestionRelationPageFile),
  read(adminAiModelConfigPageFile),
  read(adminUserManagePageFile),
  read(adminRoleManagePageFile),
  read(adminNotificationManagePageFile),
  read(industryTemplateApiFile),
  read(adminIndustryTemplatePageFile),
  read(announcementApiFile),
  read(adminAnnouncementPageFile),
  read(adminFilePageFile),
  read(fileTypesFile),
  read(agentTodayPageFile),
  read(agentTaskListPageFile),
  read(agentApiFile),
  read(agentTypesFile),
  read(resumeInnerApplicationControllerFile),
  read(aiResumeAgentContextFeignFile),
  read(aiAgentTaskTypeEnumFile),
  read(aiAgentPromptBuilderFile),
  read(backendFiles.growth),
  read(backendFiles.knowledge),
  read(backendFiles.knowledgeSse),
  read(backendFiles.resumeCareer),
  read(backendFiles.adminAnnouncement),
  read(backendFiles.adminQuestion),
  read(backendFiles.adminQuestionImport),
  read(backendFiles.adminQuestionMetadata),
  read(backendFiles.adminQuestionReview),
  read(backendFiles.adminQuestionDuplicate),
  read(backendFiles.adminAi),
  read(backendFiles.adminSearch),
  read(backendFiles.adminFile),
  read(backendFiles.adminFileDownloadDto),
  read(backendFiles.systemConfig),
  read(backendFiles.adminMenu)
])

const checks = []

const resumeJobMatchApi = await read(resumeJobMatchApiFile)
const resumeJobMatchTypes = await read(resumeJobMatchTypesFile)
const backendResumeJobMatchCreateDto = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/domain/dto/ResumeJobMatchCreateDTO.java'
))
const backendResumeJobMatchReportEntity = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/domain/entity/ResumeJobMatchReport.java'
))
const backendResumeJobMatchService = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/service/impl/ResumeJobMatchServiceImpl.java'
))
const backendResumeCareerService = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/service/impl/V4ResumeCareerServiceImpl.java'
))
const backendJobApplicationDto = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/domain/dto/JobApplicationSaveDTO.java'
))
const backendJobApplicationEntity = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/main/java/com/codecoachai/resume/domain/entity/JobApplication.java'
))
const backendResumeCareerTest = await read(path.join(
  backendRoot,
  'codecoachai-resume/src/test/java/com/codecoachai/resume/service/impl/V4ResumeCareerServiceImplTest.java'
))
const agentTaskActionUtil = await read(path.join(frontendRoot, 'src/utils/agentTaskAction.ts'))
const jobApplicationPage = await read(jobApplicationPageFile)

const record = (area, name, passed, evidence) => {
  checks.push({ area, name, status: passed ? 'covered' : 'missing', evidence })
}

const contains = (text, needle) => text.includes(needle)
const containsAll = (text, needles) => needles.every((needle) => contains(text, needle))

const sliceFrom = (text, marker, length = 1000) => {
  const start = text.indexOf(marker)
  return start === -1 ? '' : text.slice(start, start + length)
}

const recordContainsAll = (area, name, text, needles, evidence) => {
  const missingNeedles = needles.filter((needle) => !contains(text, needle))
  record(
    area,
    name,
    missingNeedles.length === 0,
    missingNeedles.length
      ? `${evidence}; missing ${missingNeedles.join(' | ')}`
      : evidence
  )
}

const applicationFollowUpContractChecks = [
  [
    'resume-inner-application-controller',
    resumeInnerApplicationController,
    [
      '@RequestMapping("/inner/applications")',
      '@GetMapping("/users/{userId}/agent-context")',
      'listAgentApplicationContextForUser(',
      'userId, targetJobId'
    ],
    'Resume inner controller exposes application agent context for user and optional target job'
  ],
  [
    'ai-resume-agent-context-feign',
    aiResumeAgentContextFeign,
    [
      '@GetMapping("/inner/applications/users/{userId}/agent-context")',
      'listAgentApplications(',
      '@RequestParam(value = "targetJobId", required = false)'
    ],
    'AI Feign client consumes resume application agent context with optional targetJobId'
  ],
  [
    'ai-agent-task-type-enum',
    aiAgentTaskTypeEnum,
    ['APPLICATION_FOLLOW_UP'],
    'Backend agent task enum includes application follow-up task type'
  ],
  [
    'ai-agent-prompt-type-whitelist',
    aiAgentPromptBuilder,
    ['APPLICATION_FOLLOW_UP'],
    'Agent prompt builder type whitelist includes application follow-up task type'
  ],
  [
    'frontend-agent-task-types',
    agentTypes,
    ['APPLICATION_FOLLOW_UP'],
    'Frontend agent task type union includes application follow-up'
  ],
  [
    'frontend-agent-today-application-follow-up',
    agentTodayPage,
    [
      'APPLICATION_FOLLOW_UP',
      '投递跟进',
      'JOB_APPLICATION',
      'hasAgentTaskActionEntry',
      'buildAgentTaskActionPath'
    ],
    'Agent today page delegates application follow-up routing to shared task action helper'
  ],
  [
    'frontend-agent-task-action-helper-application-follow-up',
    agentTaskActionUtil,
    [
      'isAgentJobApplicationTask',
      'APPLICATION_FOLLOW_UP',
      'JOB_APPLICATION',
      "'/applications'",
      'validAgentTaskActionUrl',
      'buildAgentTaskActionPath'
    ],
    'Shared Agent task action helper routes application follow-up tasks to applications'
  ]
]

for (const [name, text, needles, evidence] of applicationFollowUpContractChecks) {
  recordContainsAll('application-follow-up-contract', name, text, needles, evidence)
}

const evidenceBoundAgentTaskChecks = [
  [
    'agent-task-action-evidence-bound-helper',
    agentTaskActionUtil,
    [
      'export const isEvidenceBoundAgentTask',
      'QUESTION_PRACTICE',
      'INTERVIEW',
      'APPLICATION_FOLLOW_UP',
      'RESUME_OPTIMIZE'
    ],
    'Shared Agent task action helper must identify task types that backend only completes through verified business evidence'
  ],
  [
    'agent-today-evidence-bound-manual-complete-guard',
    agentTodayPage,
    [
      'isEvidenceBoundAgentTask',
      'canManuallyCompleteTask',
      '!isEvidenceBoundAgentTask(task)',
      'canManuallyCompleteTask(task)',
      'buildAgentTaskActionPath(task, \'/agent/today\')'
    ],
    'Agent today page must hide and guard manual completion for evidence-bound tasks and route users to the real business action'
  ],
  [
    'agent-task-list-evidence-bound-manual-complete-guard',
    agentTaskListPage,
    [
      'isEvidenceBoundAgentTask',
      'canManuallyCloseTask',
      '!isEvidenceBoundAgentTask(task)',
      'canManuallyCloseTask(task)',
      'buildAgentTaskActionPath(task)'
    ],
    'Agent task list page must hide and guard manual completion for evidence-bound tasks and route users to the real business action'
  ]
]

for (const [name, text, needles, evidence] of evidenceBoundAgentTaskChecks) {
  recordContainsAll('agent-evidence-bound-task-action', name, text, needles, evidence)
}

const agentQueryContractChecks = [
  [
    'frontend-agent-task-query-adapter',
    agentApi,
    [
      'const toAgentTaskQueryParams',
      'pageNo: params?.pageNo ?? params?.pageNum',
      'startDate: params?.startDate',
      'endDate: params?.endDate',
      'params: compactQueryParams(toAgentTaskQueryParams(params))'
    ],
    'User Agent task API wrapper must translate Vue pagination/date-range fields into backend-supported query names'
  ],
  [
    'frontend-admin-agent-run-query-adapter',
    adminAgentApi,
    [
      'const toAdminAgentRunQueryParams',
      'pageNo: params?.pageNo ?? params?.pageNum',
      'startDate: normalizeDateParam(params?.startDate ?? params?.startTime)',
      'endDate: normalizeDateParam(params?.endDate ?? params?.endTime)',
      'triggerType: params?.triggerType',
      'params: compactQueryParams(toAdminAgentRunQueryParams(params))'
    ],
    'Admin Agent run API wrapper must adapt pageNum/time range/triggerType to the backend query contract'
  ],
  [
    'frontend-admin-agent-task-query-adapter',
    adminAgentApi,
    [
      'const toAdminAgentTaskQueryParams',
      'pageNo: params?.pageNo ?? params?.pageNum',
      'startDate: params?.startDate',
      'endDate: params?.endDate',
      'params: compactQueryParams(toAdminAgentTaskQueryParams(params))'
    ],
    'Admin Agent task API wrapper must adapt pageNum/date-range fields to the backend query contract'
  ]
]

for (const [name, text, needles, evidence] of agentQueryContractChecks) {
  recordContainsAll('agent-query-contract', name, text, needles, evidence)
}

const contractChecks = [
  ['POST', '/agent/job-coach/review', 'generateAgentReviewApi', growthController, '@PostMapping("/job-coach/review")'],
  ['GET', '/agent/reviews', 'getAgentReviewsApi', growthController, '@GetMapping("/reviews")'],
  ['GET', '/agent/growth/profile/overview', 'getGrowthOverviewApi', growthController, '@GetMapping("/growth/profile/overview")'],
  ['GET', '/agent/growth/skills/trend', 'getGrowthSkillsTrendApi', growthController, '@GetMapping("/growth/skills/trend")'],
  ['GET', '/agent/growth/readiness/trend', 'getGrowthReadinessTrendApi', growthController, '@GetMapping("/growth/readiness/trend")'],
  ['GET', '/agent/memories', 'getAgentMemoriesApi', growthController, '@GetMapping("/memories")'],
  ['POST', '/agent/memories', 'createAgentMemoryApi', growthController, '@PostMapping("/memories")'],
  ['POST', '/agent/memories/${id}/enable', 'enableAgentMemoryApi', growthController, '@PostMapping("/memories/{id}/enable")'],
  ['POST', '/agent/memories/${id}/disable', 'disableAgentMemoryApi', growthController, '@PostMapping("/memories/{id}/disable")'],
  ['DELETE', '/agent/memories/${id}', 'deleteAgentMemoryApi', growthController, '@DeleteMapping("/memories/{id}")'],
  ['POST', '/resumes/${resumeId}/versions', 'createResumeVersionApi', resumeCareerController, '@PostMapping("/resumes/{resumeId}/versions")'],
  ['GET', '/resumes/${resumeId}/versions', 'getResumeVersionsApi', resumeCareerController, '@GetMapping("/resumes/{resumeId}/versions")'],
  ['POST', '/resumes/${resumeId}/versions/${versionId}/copy', 'copyResumeVersionApi', resumeCareerController, '@PostMapping("/resumes/{resumeId}/versions/{versionId}/copy")'],
  ['GET', '/resume-versions/${versionId}', 'getResumeVersionDetailApi', resumeCareerController, '@GetMapping("/resume-versions/{versionId}")'],
  ['GET', '/resumes/${resumeId}/versions/${versionId}/diff', 'getResumeVersionDiffApi', resumeCareerController, '@GetMapping("/resumes/{resumeId}/versions/{versionId}/diff")'],
  ['GET', '/resume-versions/${sourceVersionId}/diff/${targetVersionId}', 'getResumeVersionsPairDiffApi', resumeCareerController, '@GetMapping("/resume-versions/{sourceVersionId}/diff/{targetVersionId}")'],
  ['POST', '/resumes/${resumeId}/versions/${versionId}/rollback', 'rollbackResumeVersionApi', resumeCareerController, '@PostMapping("/resumes/{resumeId}/versions/{versionId}/rollback")'],
  ['POST', '/resume-versions/${versionId}/apply-ai-suggestion', 'applyResumeVersionSuggestionApi', resumeCareerController, '@PostMapping("/resume-versions/{versionId}/apply-ai-suggestion")'],
  ['GET', '/applications', 'getApplicationsApi', resumeCareerController, '@GetMapping("/applications")'],
  ['POST', '/applications', 'createApplicationApi', resumeCareerController, '@PostMapping("/applications")'],
  ['PUT', '/applications/${id}', 'updateApplicationApi', resumeCareerController, '@PutMapping("/applications/{id}")'],
  ['GET', '/applications/${id}/events', 'getApplicationEventsApi', resumeCareerController, '@GetMapping("/applications/{id}/events")'],
  ['POST', '/applications/${id}/events', 'createApplicationEventApi', resumeCareerController, '@PostMapping("/applications/{id}/events")'],
  ['POST', '/agent/knowledge/documents', 'createKnowledgeDocumentApi', knowledgeController, '@PostMapping("/documents")'],
  ['PUT', '/agent/knowledge/documents/${id}', 'updateKnowledgeDocumentApi', knowledgeController, '@PutMapping("/documents/{id}")'],
  ['POST', '/agent/knowledge/documents/upload', 'uploadKnowledgeDocumentApi', knowledgeController, '@PostMapping(value = "/documents/upload"'],
  ['GET', '/agent/knowledge/documents', 'getKnowledgeDocumentsApi', knowledgeController, '@GetMapping("/documents")'],
  ['GET', '/agent/knowledge/documents/types', 'getKnowledgeDocumentTypesApi', knowledgeController, '@GetMapping("/documents/types")'],
  ['GET', '/agent/knowledge/documents/options', 'getKnowledgeDocumentOptionsApi', knowledgeController, '@GetMapping("/documents/options")'],
  ['GET', '/agent/knowledge/stats', 'getKnowledgeStatsApi', knowledgeController, '@GetMapping("/stats")'],
  ['GET', '/agent/knowledge/config', 'getKnowledgeConfigApi', knowledgeController, '@GetMapping("/config")'],
  ['GET', '/agent/knowledge/documents/${id}', 'getKnowledgeDocumentDetailApi', knowledgeController, '@GetMapping("/documents/{id}")'],
  ['GET', '/agent/knowledge/documents/${id}/versions', 'getKnowledgeDocumentVersionsApi', knowledgeController, '@GetMapping("/documents/{id}/versions")'],
  ['POST', '/agent/knowledge/documents/${id}/versions/${versionId}/restore', 'restoreKnowledgeDocumentVersionApi', knowledgeController, '@PostMapping("/documents/{id}/versions/{versionId}/restore")'],
  ['GET', '/agent/knowledge/documents/${id}/chunks', 'getKnowledgeDocumentChunksApi', knowledgeController, '@GetMapping("/documents/{id}/chunks")'],
  ['GET', '/agent/knowledge/chunks/${chunkId}', 'getKnowledgeChunkApi', knowledgeController, '@GetMapping("/chunks/{chunkId}")'],
  ['GET', '/agent/knowledge/chunks/${chunkId}/similar', 'getKnowledgeSimilarChunksApi', knowledgeController, '@GetMapping("/chunks/{chunkId}/similar")'],
  ['GET', '/agent/knowledge/duplicates/review', 'getKnowledgeDuplicateReviewApi', knowledgeController, '@GetMapping("/duplicates/review")'],
  ['GET', '/agent/knowledge/duplicates/exact', 'getKnowledgeExactDuplicatesApi', knowledgeController, '@GetMapping("/duplicates/exact")'],
  ['POST', '/agent/knowledge/duplicates/exact/cleanup', 'cleanupKnowledgeExactDuplicatesApi', knowledgeController, '@PostMapping("/duplicates/exact/cleanup")'],
  ['DELETE', '/agent/knowledge/documents/${id}', 'deleteKnowledgeDocumentApi', knowledgeController, '@DeleteMapping("/documents/{id}")'],
  ['DELETE', '/agent/knowledge/chunks/${chunkId}', 'deleteKnowledgeChunkApi', knowledgeController, '@DeleteMapping("/chunks/{chunkId}")'],
  ['POST', '/agent/knowledge/vectors/rebuild', 'rebuildKnowledgeVectorsApi', knowledgeController, '@PostMapping("/vectors/rebuild")'],
  ['POST', '/agent/knowledge/vectors/retry-failed', 'retryFailedKnowledgeVectorsApi', knowledgeController, '@PostMapping("/vectors/retry-failed")'],
  ['GET', '/agent/knowledge/search', 'searchKnowledgeApi', knowledgeController, '@GetMapping("/search")'],
  ['GET', '/agent/knowledge/search/trace', 'traceKnowledgeSearchApi', knowledgeController, '@GetMapping("/search/trace")'],
  ['POST', '/agent/knowledge/ask', 'askKnowledgeApi', knowledgeController, '@PostMapping("/ask")'],
  ['POST', '/agent/knowledge/evaluate', 'evaluateKnowledgeApi', knowledgeController, '@PostMapping("/evaluate")'],
  ['GET', '/agent/knowledge/eval/cases', 'getKnowledgeEvalCasesApi', knowledgeController, '@GetMapping("/eval/cases")'],
  ['POST', '/agent/knowledge/eval/cases', 'saveKnowledgeEvalCaseApi', knowledgeController, '@PostMapping("/eval/cases")'],
  ['DELETE', '/agent/knowledge/eval/cases/${id}', 'deleteKnowledgeEvalCaseApi', knowledgeController, '@DeleteMapping("/eval/cases/{id}")'],
  ['POST', '/agent/knowledge/eval/runs', 'runKnowledgeEvalApi', knowledgeController, '@PostMapping("/eval/runs")'],
  ['GET', '/agent/knowledge/eval/runs', 'getKnowledgeEvalRunsApi', knowledgeController, '@GetMapping("/eval/runs")'],
  ['GET', '/agent/knowledge/eval/runs/${id}', 'getKnowledgeEvalRunApi', knowledgeController, '@GetMapping("/eval/runs/{id}")'],
  ['POST', '/agent/knowledge/ask/stream', 'askKnowledgeStreamApi', knowledgeSseController, '@PostMapping(value = "/ask/stream"']
]

for (const [method, pathPattern, apiName, backendText, backendMapping] of contractChecks) {
  const frontendPassed = contains(frontendApi, apiName) && contains(frontendApi, pathPattern)
  const backendPassed = contains(backendText, backendMapping)
  record('api-contract', `${method} ${pathPattern}`, frontendPassed && backendPassed, `${apiName} <-> ${backendMapping}`)
}

const routeChecks = [
  ['agent/reviews', 'AgentReviewView.vue'],
  ['growth/profile', 'GrowthProfileView.vue'],
  ['growth/skills', 'GrowthProfileView.vue'],
  ['growth/readiness', 'GrowthProfileView.vue'],
  ['agent/memory', 'AgentMemoryView.vue'],
  ['knowledge', 'KnowledgeBaseView.vue'],
  ['resume-versions', 'ResumeVersionView.vue'],
  ['applications', 'JobApplicationView.vue'],
  ['resumes/:id/versions', 'ResumeVersionView.vue']
]

for (const [routePath, component] of routeChecks) {
  record('route', routePath, contains(routes, `path: '${routePath}'`) && contains(routes, component), component)
}

const previewRoutePaths = ['resume-versions', 'applications', 'resumes/:id/versions']
for (const routePath of previewRoutePaths) {
  const line = routes.split(/\r?\n/).find((item) => item.includes(`path: '${routePath}'`)) || ''
  record(
    'route-preview',
    routePath,
    Boolean(line) && line.includes('previewOnly: true'),
    line.trim()
  )
}

recordContainsAll(
  'resume-match-loop',
  'match-detail-preview-cta-gated-by-v4-flag',
  resumeMatchDetailPage,
  [
    'canAccessResumeVersionPreview',
    'canAccessApplicationPreview',
    ":disabled=\"!canAccessResumeVersionPreview || !report.resumeId\"",
    ":disabled=\"!isSuccessReport || !canAccessResumeVersionPreview || !report.resumeId\"",
    ":disabled=\"!isSuccessReport || !canAccessApplicationPreview || !report.targetJobId\""
  ],
  'Resume match detail gates resume-version and application CTAs behind the V4 preview flag instead of exposing dead-end links'
)

const previewSidebarPaths = ['/agent/reviews', '/growth/profile', '/agent/memory', '/knowledge', '/resume-versions', '/applications']
for (const routePath of previewSidebarPaths) {
  const line = sidebar.split(/\r?\n/).find((item) => item.includes(`path: '${routePath}'`)) || ''
  record(
    'sidebar-preview',
    routePath,
    Boolean(line) && (line.includes('previewOnly: true') || line.includes("featureFlag: 'v4Preview'")),
    line.trim()
  )
}

recordContainsAll(
  'user-first-day-loop',
  'jobcoach-home-first-day-actions',
  jobCoachHomePage,
  [
    'first-day-actions',
    'firstDayActions',
    '/resumes',
    '/job-targets/create',
    '/agent/today',
    '/questions/practice',
    "actionType: hasTodayPlanSignal.value ? undefined : 'generate-plan'",
    'runFirstDayAction'
  ],
  'Dashboard exposes resume, target job, plan generation, and starter training actions'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-page-routes-to-match',
  resumeVersionPage,
  [
    'goResumeMatch',
    "path: '/resume-match'",
    "source: 'resume-version'",
    'resumeVersionId'
  ],
  'Resume version page can carry the selected resume/version source into resume-job matching'
)

recordContainsAll(
  'resume-match-loop',
  'match-pages-link-back-to-resume-versions',
  `${resumeMatchPage}\n${resumeMatchDetailPage}`,
  [
    'isVersionEntry',
    'versionEntryDescription',
    'goSelectedResumeVersions',
    'goReportResumeVersions',
    "`/resumes/${report.value.resumeId}/versions`"
  ],
  'Resume match and match detail pages expose the resume-version return path'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-id-reaches-match-create-contract',
  `${resumeJobMatchTypes}\n${resumeJobMatchApi}\n${backendResumeJobMatchCreateDto}\n${backendResumeJobMatchReportEntity}`,
  [
    'resumeVersionId?: number',
    'resumeVersionId: data.resumeVersionId == null ?',
    'private Long resumeVersionId'
  ],
  'Resume-job-match create API and backend report entity carry optional resumeVersionId'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-match-page-submits-version-id',
  resumeMatchPage,
  [
    'resumeVersionId: versionSourceId.value',
    '本次匹配会绑定该版本快照',
    'matchReportRouteQuery',
    'resumeVersionLabel'
  ],
  'Resume match page submits selected resumeVersionId and preserves it when routing to report detail'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-match-detail-displays-version-source',
  resumeMatchDetailPage,
  [
    'reportResumeVersionLabel',
    'trustPanelDescription',
    '简历版本',
    'resumeVersionId'
  ],
  'Resume match detail page displays the version source returned by the backend report'
)

recordContainsAll(
  'resume-match-loop',
  'backend-match-report-reuse-is-version-scoped',
  backendResumeJobMatchService,
  [
    'latestSuccessfulReport(dto.getResumeId(), dto.getTargetJobId(), userId',
    'ResumeJobMatchReport::getResumeVersionId',
    'getOwnedResumeVersion',
    'resumeSnapshotJson(context)',
    'snapshotSource", "RESUME_VERSION"'
  ],
  'Backend report reuse and AI input snapshot are scoped to resumeVersionId when provided'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-snapshot-includes-project-evidence',
  `${backendResumeCareerService}\n${backendResumeJobMatchService}`,
  [
    'ResumeProjectMapper',
    'projectsForSnapshot',
    'projectSnapshotSource", "RESUME_VERSION"',
    'projectSnapshotSource", "CURRENT_RESUME_PROJECTS"',
    'resumeVersionSnapshotHasProjects'
  ],
  'Resume versions persist project evidence, and matching falls back to current projects only for old snapshots'
)

recordContainsAll(
  'resume-match-loop',
  'match-report-can-create-application-tracker-entry',
  `${frontendApi}\n${resumeMatchDetailPage}\n${jobApplicationPage}\n${backendResumeCareerService}\n${backendJobApplicationDto}\n${backendJobApplicationEntity}`,
  [
    'matchReportId?: number',
    'createApplicationFromReport',
    "source: 'RESUME_JOB_MATCH'",
    'ownedMatchReport',
    'findApplicationByMatchReport',
    '匹配报告 #'
  ],
  'Match report detail can create a job application entry linked back to the report'
)

recordContainsAll(
  'resume-match-loop',
  'match-report-application-create-is-idempotent',
  `${resumeMatchDetailPage}\n${backendResumeCareerService}\n${backendResumeCareerTest}`,
  [
    'existingApplicationForReport',
    'getApplicationsApi',
    'ensureMatchReportNotLinkedToAnotherApplication',
    'createApplicationFromMatchReportReturnsExistingApplication',
    'updateApplicationRejectsMatchReportAlreadyLinkedToAnotherApplication'
  ],
  'Creating an application from the same match report is idempotent and update cannot steal another linked report'
)

recordContainsAll(
  'resume-match-loop',
  'application-event-status-flow-is-synchronized',
  `${jobApplicationPage}\n${backendResumeCareerService}\n${backendResumeCareerTest}`,
  [
    "{ label: '已投递', value: 'APPLIED' }",
    'eventStatusImpactText',
    'await load()',
    'selectedApplication.value = refreshed',
    'shouldTransitionApplicationStatus',
    'applicationStatusRank',
    'createApplicationEventSyncsForwardStatus',
    'createApplicationEventDoesNotRegressTerminalStatus'
  ],
  'Application events expose APPLIED, sync the main list after save, and backend guards forward-only status transitions'
)

recordContainsAll(
  'resume-match-loop',
  'match-detail-polling-recovers-after-silent-error',
  resumeMatchDetailPage,
  [
    'reportPollRetryCount',
    'nextReportPollDelay',
    'scheduleReportPoll(nextReportPollDelay())',
    '报告生成进度暂时中断，正在继续重试'
  ],
  'Match detail polling retries after transient silent failures while report generation is still in progress'
)

recordContainsAll(
  'resume-match-loop',
  'resume-version-entry-locks-resume-selection',
  resumeMatchPage,
  [
    'isVersionResumeLocked',
    'versionResumeMismatch',
    ':disabled="isVersionResumeLocked"',
    '当前简历版本入口已绑定原简历'
  ],
  'Resume-version entry prevents mixing a route resumeVersionId with another selected resumeId'
)

recordContainsAll(
  'resume-version-governance',
  'apply-ai-suggestion-discloses-resume-overwrite',
  resumeVersionPage,
  [
    '应用版本并记录采纳',
    '该操作会改写当前简历正文',
    '当前简历正文会被该版本快照覆盖',
    '确认应用并记录'
  ],
  'Resume version AI suggestion action must disclose that it applies the snapshot to the current resume'
)

record(
  'resume-version-governance',
  'apply-ai-suggestion-removes-non-mutating-copy',
  !contains(resumeVersionPage, '该操作不会直接改写简历正文'),
  'Do not describe applyAiSuggestion as record-only because backend applies the snapshot'
)

recordContainsAll(
  'resume-match-loop',
  'match-detail-save-report-suggestions-as-version',
  resumeMatchDetailPage,
  [
    '保存报告建议为版本',
    'saveReportAsResumeVersion',
    'createResumeVersionApi',
    "sourceType: 'RESUME_JOB_MATCH'",
    "`/resumes/${report.value.resumeId}/versions`"
  ],
  'Resume match detail can persist report suggestions as a resume version snapshot'
)

const safetyChecks = [
  ['sse-post-body', frontendApi, "method: 'POST'", 'Knowledge ask SSE uses POST'],
  ['sse-auth-header', sseUtil, 'Authorization: `Bearer ${token}`', 'SSE forwards bearer token'],
  ['sse-json-body', sseUtil, 'JSON.stringify(body)', 'SSE forwards request body'],
  ['delete-document-confirm', knowledgePage, "reason: 'user knowledge delete document'", 'Document delete sends confirmation context'],
  ['delete-chunk-confirm', knowledgePage, "reason: 'user knowledge delete chunk'", 'Chunk delete sends confirmation context'],
  ['duplicate-cleanup-confirm', knowledgePage, "reason: 'user knowledge cleanup exact duplicate chunks'", 'Duplicate cleanup sends confirmation context'],
  ['vector-rebuild-confirm', knowledgePage, "reason: documentId ? 'user knowledge manual rebuild document vector'", 'Vector rebuild sends confirmation context'],
  ['vector-retry-confirm', knowledgePage, "reason: 'user knowledge manual retry failed vectors'", 'Vector retry sends confirmation context'],
  ['operation-idempotency', knowledgePage, 'createOperationIdempotencyKey', 'Dangerous knowledge actions use idempotency keys']
]

for (const [name, text, needle, evidence] of safetyChecks) {
  record('interaction-safety', name, contains(text, needle), evidence)
}

const adminApiSafetyChecks = [
  ['question-vector-rebuild-api', questionApi, "request.post<QuestionEmbeddingRebuildResult, QuestionEmbeddingRebuildResult>(\n    '/admin/questions/embedding/rebuild'", 'Admin question vector rebuild API wrapper'],
  ['question-vector-retry-api', questionApi, "request.post<QuestionEmbeddingRebuildResult, QuestionEmbeddingRebuildResult>(\n    '/admin/questions/embedding/retry-failed'", 'Admin question vector retry API wrapper'],
  ['knowledge-vector-rebuild-api', analyticsApi, "'/admin/analytics/vector-store/knowledge/rebuild'", 'Admin knowledge vector rebuild API wrapper'],
  ['knowledge-vector-retry-api', analyticsApi, "'/admin/analytics/vector-store/knowledge/retry-failed'", 'Admin knowledge vector retry API wrapper'],
  ['vector-delete-outbox-retry-api', analyticsApi, "'/admin/analytics/vector-store/delete-outbox/retry'", 'Admin vector delete outbox retry API wrapper'],
  ['analytics-daily-plan-run-api', analyticsApi, "'/admin/analytics/jobs/agent-daily-plan/run'", 'Admin analytics daily plan run API wrapper'],
  ['analytics-job-rerun-api', analyticsApi, "`/admin/analytics/jobs/${id}/rerun`", 'Admin analytics job rerun API wrapper'],
  ['prompt-regression-run-api', analyticsApi, "`/admin/agent/prompt-regression/cases/${data?.caseId}/run`", 'Admin prompt regression run API wrapper'],
  ['async-task-retry-api', adminGovernanceApi, "`/admin/tasks/${id}/retry`, data", 'Admin async task retry forwards confirmation payload'],
  ['async-dead-letter-retry-api', adminGovernanceApi, "`/admin/tasks/${id}/dead-letter/retry`, data", 'Admin dead-letter retry forwards confirmation payload'],
  ['ai-log-raw-api', aiAdminApi, "`/admin/ai/logs/${id}/raw`, data", 'AI call log raw access forwards sensitive access payload'],
  ['agent-run-raw-api', adminAgentApi, "`/admin/agent/runs/${id}/raw`, data", 'Agent run raw access forwards sensitive access payload'],
  ['prompt-template-raw-api', aiAdminApi, "`/admin/ai/prompt-templates/${id}/raw`, data", 'Prompt template raw access forwards sensitive access payload'],
  ['prompt-version-raw-api', aiAdminApi, "`/admin/ai/prompt-template-versions/${versionId}/raw`", 'Prompt version raw access forwards sensitive access payload']
]

for (const [name, text, needle, evidence] of adminApiSafetyChecks) {
  record('admin-danger-api', name, contains(text, needle), evidence)
}

const adminTaskApiForwardingChecks = [
  [
    'async-task-retry-confirmation-payload',
    adminGovernanceApi,
    'export const retryAdminTaskApi',
    500,
    [
      'data: AdminTaskActionPayload',
      '`/admin/tasks/${id}/retry`, data'
    ],
    'Async task retry API wrapper forwards note, confirm, dryRun, reason, and idempotencyKey'
  ],
  [
    'async-dead-letter-retry-confirmation-payload',
    adminGovernanceApi,
    'export const retryAdminDeadLetterTaskApi',
    500,
    [
      'data: AdminTaskActionPayload',
      '`/admin/tasks/${id}/dead-letter/retry`, data'
    ],
    'Dead-letter retry API wrapper forwards note, confirm, dryRun, reason, and idempotencyKey'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminTaskApiForwardingChecks) {
  recordContainsAll('admin-danger-api', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminSensitiveRawAccessChecks = [
  [
    'ai-call-log-raw-access',
    adminAiCallLogPage,
    'const loadRawDetail = async',
    2800,
    [
      'confirmDangerActionPreview({',
      'getAdminAiLogRawApi(detail.value.id, {',
      'confirmSensitiveAccess: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`ai-log-raw-${detail.value.id}`)'
    ],
    'AI call log raw access requires preview, explicit sensitive confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'agent-run-raw-access',
    adminAgentRunPage,
    'const loadRunRawDetail = async',
    2800,
    [
      'confirmDangerActionPreview({',
      'getAdminAgentRunRawApi(detail.value.id, {',
      'confirmSensitiveAccess: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`agent-run-raw-${detail.value.id}`)'
    ],
    'Agent run raw access requires preview, explicit sensitive confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'prompt-version-raw-access',
    adminPromptTemplatePage,
    'const loadVersionRaw = async',
    2200,
    [
      'getPromptTemplateVersionRawApi(row.id, {',
      'confirmSensitiveAccess: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`prompt-template-version-raw-${row.id}`)'
    ],
    'Prompt version raw access requires explicit sensitive confirmation, dry-run opt-out, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminSensitiveRawAccessChecks) {
  recordContainsAll('admin-sensitive-raw-access', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminSystemGovernanceChecks = [
  [
    'system-config-api-create-update-dry-run',
    systemApi,
    'type BackendSystemConfigSaveDTO',
    2400,
    [
      'dryRun?: boolean',
      'dryRun: confirmation.dryRun',
      'const toBackendUpdateConfigPayload',
      'dryRun: confirmation.dryRun'
    ],
    'System config API forwards dryRun in create/update confirmation payloads'
  ],
  [
    'system-config-save-page-dry-run',
    adminSystemConfigPage,
    'const handleSave = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'const updatePayload: Parameters<typeof updateSystemConfigApi>[1] = {',
      'updateSystemConfigApi(editingConfigId.value, updatePayload)',
      'createSystemConfigApi({',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey'
    ],
    'System config create/update requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'system-config-delete-page-dry-run',
    adminSystemConfigPage,
    'const handleDelete = async',
    1200,
    [
      'confirmDangerActionPreview({',
      'deleteSystemConfigApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`system-config-delete-${row.id}`)'
    ],
    'System config delete requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'role-menu-grant-page-dry-run',
    adminMenuPermissionPage,
    'const handleSave = async',
    1800,
    [
      'confirmDangerActionPreview({',
      'grantAdminRoleMenusApi(roleId, {',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`role-menu-grant-${roleId}`)'
    ],
    'Role menu grant requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'menu-controller-dry-run-and-release',
    adminMenuController,
    'private <T> Result<T> runConfirmedOperation',
    1300,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Result<Void> runConfirmedVoidOperation'
    ],
    'AdminMenuController menu and role-menu writes release idempotency locks when mapper execution fails after confirmation'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminSystemGovernanceChecks) {
  recordContainsAll('admin-system-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const promptTemplateContractChecks = [
  [
    'prompt-template-metadata-api-omits-content',
    aiAdminApi,
    'export const updateAdminAiPromptMetadataApi',
    300,
    [
      '`/admin/ai/prompts/${id}`',
      'toBackendPromptDTO(data, false)'
    ],
    'Prompt template metadata update API routes through toBackendPromptDTO(data, false) so metadata saves do not send正文 content'
  ],
  [
    'prompt-template-editing-content-locked-to-versioning',
    adminPromptTemplatePage,
    '<el-form-item label="模板内容" prop="content">',
    1200,
    [
      ':readonly="Boolean(editingId)"',
      "editingId ? '提示词内容请通过版本管理新增版本修改' : '请输入模板内容'",
      '提示词正文不能在这里直接保存，请通过版本管理新增版本修改。本次保存只更新模板名称和描述。',
      '@click="openEditingVersionDrawer"'
    ],
    'Prompt template edit form keeps正文 read-only during metadata edits and points正文 changes to 版本管理'
  ],
  [
    'prompt-template-metadata-save-payload-stays-metadata-only',
    adminPromptTemplatePage,
    'const handleSave = async',
    2600,
    [
      '提示词正文如需修改，请点击“去版本管理”新增版本。',
      'const payload: PromptTemplateDTO = editingId.value',
      'name: form.name',
      'scene: form.scene',
      'status: form.status',
      'description: form.description',
      'await updateAdminAiPromptMetadataApi(editingId.value, payload)'
    ],
    'Prompt template metadata save only submits metadata fields and keeps正文 edits on the version-management flow'
  ]
]

for (const [name, text, marker, length, needles, evidence] of promptTemplateContractChecks) {
  recordContainsAll('prompt-template-contract', name, sliceFrom(text, marker, length), needles, evidence)
}

const systemConfigContractChecks = [
  [
    'system-config-update-api-id-and-key-paths',
    systemApi,
    'export const updateSystemConfigByIdApi',
    1000,
    [
      'export const updateSystemConfigByIdApi',
      '`/admin/configs/${id}`',
      'export const updateSystemConfigByKeyApi',
      '`/admin/configs/keys/${encodeURIComponent(configKey)}`',
      'export const updateSystemConfigApi',
      ') => updateSystemConfigByIdApi(id, data)'
    ],
    'System config front-end keeps both id and key update paths while the default update helper still resolves to id writes'
  ],
  [
    'system-config-controller-id-and-key-routes',
    systemConfigController,
    '@PutMapping("/admin/configs/{id}")',
    1500,
    [
      '@PutMapping("/admin/configs/{id}")',
      'public Result<SystemConfigVO> updateConfigById(@PathVariable Long id, @RequestBody SystemConfigSaveDTO dto)',
      '() -> systemConfigService.updateConfigById(id, dto)',
      '@PutMapping({"/admin/configs/keys/{configKey}", "/admin/configs/key/{configKey}"})',
      'public Result<SystemConfigVO> updateConfigByKey(@PathVariable String configKey, @RequestBody SystemConfigSaveDTO dto)',
      '() -> systemConfigService.updateConfigByKey(configKey, dto)'
    ],
    'SystemConfigController exposes matching id/key update mappings for the current front-end contract'
  ],
  [
    'system-config-page-result-normalization',
    systemApi,
    'const normalizeConfigPage',
    900,
    [
      'const normalizeConfigPage',
      'records: Array.isArray(result.records) ? result.records.map(normalizeSystemConfig) : []',
      'export const getSystemConfigsApi = async',
      'params: compactQueryParams(params)',
      'return normalizeConfigPage(result)'
    ],
    'System config list contract still normalizes real paged records before page consumers read them'
  ]
]

for (const [name, text, marker, length, needles, evidence] of systemConfigContractChecks) {
  recordContainsAll('system-config-contract', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminEntryContractChecks = [
  [
    'user-layout-admin-entry-verifies-admin-session',
    userLayout,
    'const goAdmin = async',
    500,
    [
      'await authStore.verifyAdminSession()',
      "await router.push('/auth-unavailable')",
      'const path = resolveAdminEntryPath(authStore)',
      "await router.push(path || '/403')"
    ],
    'User-side admin entry verifies admin session before routing into admin pages'
  ],
  [
    'router-guard-admin-route-session-gate',
    routerGuards,
    'if (isAdminRoute) {',
    900,
    [
      'await authStore.verifyAdminSession()',
      "path: '/login'",
      "path: '/auth-unavailable'"
    ],
    'Admin route guard verifies admin session and falls back to login or auth-unavailable when the session check fails'
  ],
  [
    'router-guard-auth-entry-uses-current-authenticated-helper',
    routerGuards,
    'if (isPublic) {',
    1400,
    [
      'if (isAuthPage && authStore.isLoggedIn)',
      'await authStore.verifyToken()',
      'return safeRedirectPath(to.query.redirect) || resolveAuthenticatedEntryPath(authStore)'
    ],
    'Logged-in users hitting auth/public entries are redirected by resolveAuthenticatedEntryPath instead of a legacy hard-coded helper name'
  ],
  [
    'admin-access-current-entry-helper-naming',
    adminAccess,
    'export const resolveAdminEntryPath',
    500,
    [
      'export const resolveAdminEntryPath',
      'return firstAccessibleAdminPath(authStore)',
      'export const resolveAuthenticatedEntryPath',
      "resolveAdminEntryPath(authStore) || '/dashboard'"
    ],
    'Admin access helpers use current resolveAdminEntryPath / resolveAuthenticatedEntryPath naming and fall back to /dashboard'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminEntryContractChecks) {
  recordContainsAll('admin-entry-contract', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminAiModelGovernanceChecks = [
  [
    'ai-model-api-confirmation-payload',
    adminGovernanceApi,
    'export const createAdminAiModelApi',
    1000,
    [
      'AdminOperationConfirmPayload',
      "request.post<AiModelConfigVO, AiModelConfigVO>('/admin/ai/models', data)",
      'request.put<AiModelConfigVO, AiModelConfigVO>(`/admin/ai/models/${id}`, data)',
      'request.put<AiModelConfigVO, AiModelConfigVO>(`/admin/ai/models/${id}/status`, { status, ...data })',
      'request.put<AiModelConfigVO, AiModelConfigVO>(`/admin/ai/models/${id}/default`, data)',
      'request.delete<null, null>(`/admin/ai/models/${id}`, { data })'
    ],
    'AI model governance API forwards confirmation payloads and types status/default responses as sanitized model configs'
  ],
  [
    'ai-model-permission-labels',
    adminAiModelConfigPage,
    'admin-row-actions__risk',
    1800,
    [
      "v-permission=\"'admin:ai:model:publish'\"",
      "v-if=\"canManageModelPublish\"",
      "v-if=\"canManageModelWrite\""
    ],
    'AI model page separates write/delete operations from publish operations in visible controls'
  ],
  [
    'ai-model-save-page-dry-run',
    adminAiModelConfigPage,
    'const handleSave = async',
    4200,
    [
      'confirmDangerActionPreview({',
      'const confirmedPayload = {',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(',
      'updateAdminAiModelApi(editingId.value, confirmedPayload)',
      'createAdminAiModelApi(confirmedPayload)'
    ],
    'AI model create/update requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'ai-model-status-page-dry-run',
    adminAiModelConfigPage,
    'const handleStatus = async',
    1800,
    [
      'confirmDangerActionPreview({',
      'updateAdminAiModelStatusApi(row.id, status, {',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`ai-model-status-${row.id}`)'
    ],
    'AI model status update requires preview, confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'ai-model-default-page-dry-run',
    adminAiModelConfigPage,
    'const handleDefault = async',
    1600,
    [
      'confirmDangerActionPreview({',
      'setDefaultAdminAiModelApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`ai-model-default-${row.id}`)'
    ],
    'AI model default switch requires preview, confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'ai-model-delete-page-dry-run',
    adminAiModelConfigPage,
    'const handleDelete = async',
    1600,
    [
      'confirmDangerActionPreview({',
      'deleteAdminAiModelApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`ai-model-delete-${row.id}`)'
    ],
    'AI model delete requires preview, confirmation, dry-run opt-out, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminAiModelGovernanceChecks) {
  recordContainsAll('admin-ai-model-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminAccountGovernanceChecks = [
  [
    'user-role-type-dry-run-contract',
    userTypes,
    'export interface RoleSaveDTO',
    1200,
    [
      'dryRun?: boolean',
      'export interface UserStatusUpdateDTO',
      'dryRun?: boolean',
      'export interface AdminOperationConfirmDTO',
      'dryRun?: boolean',
      'export interface AdminUserAssignRolesDTO extends AdminOperationConfirmDTO'
    ],
    'User and role admin DTOs include dryRun across save, status, generic confirmation, and role assignment payloads'
  ],
  [
    'user-api-reset-assign-role-contract',
    userApi,
    'export const resetAdminUserPasswordApi',
    1000,
    [
      'AdminOperationConfirmDTO',
      'request.post<string, string>(`/admin/users/${id}/reset-password`, data)',
      'export const getAdminUserRolesApi',
      'export const assignAdminUserRolesApi',
      'AdminUserAssignRolesDTO',
      'request.post<null, null>(`/admin/users/${id}/assign-roles`, data)'
    ],
    'User admin API exposes reset-password, get-user-roles, and assign-roles wrappers with confirmation payloads'
  ],
  [
    'user-status-page-dry-run',
    adminUserManagePage,
    'updateAdminUserStatusApi(row.id, {',
    700,
    [
      'status: nextStatus',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-user-status-${row.id}`)'
    ],
    'User status updates require confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'user-reset-password-page-dry-run',
    adminUserManagePage,
    'const handleResetPassword = async',
    1800,
    [
      'confirmDangerActionPreview({',
      'resetAdminUserPasswordApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-user-reset-password-${row.id}`)',
      'resetPasswordDialogVisible.value = true'
    ],
    'User password reset is previewed, confirmed, dry-run opt-out, idempotent, and surfaced through a one-time result dialog'
  ],
  [
    'user-assign-roles-page-dialog-contract',
    adminUserManagePage,
    'const loadRoleAssignOptions = async () => {',
    1400,
    [
      'getAdminRolesApi()',
      'getAdminUserRolesApi(roleAssignTarget.value.id)',
      'availableRoles.value = roles',
      'originalRoleIds.value = userRoles.map((role) => role.roleId).filter(Boolean)',
      'selectedRoleIds.value = [...originalRoleIds.value]'
    ],
    'User role assignment dialog loads all roles plus the current user role set before submitting full replacement'
  ],
  [
    'user-assign-roles-page-dry-run',
    adminUserManagePage,
    'const handleAssignRoles = async () => {',
    2400,
    [
      'confirmDangerActionPreview({',
      'assignAdminUserRolesApi(target.id, {',
      'roleIds: selectedRoleIds.value',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-user-assign-roles-${target.id}`)'
    ],
    'User role assignment submits role IDs with confirmation, dry-run opt-out, reason, idempotency, and role-assign permission'
  ],
  [
    'user-sensitive-actions-permissions',
    adminUserManagePage,
    'v-permission="\'admin:role:assign\'"',
    1200,
    [
      'v-permission="\'admin:role:assign\'"',
      'openAssignRoles(row)',
      'v-permission="\'admin:user:password:reset\'"',
      'handleResetPassword(row)',
      'withMobileReadonlyDisabled'
    ],
    'Sensitive user actions are visible but permission-gated with role assignment and password reset authorities'
  ],
  [
    'user-assign-roles-non-empty-guard',
    adminUserManagePage,
    'const handleAssignRoles = async () => {',
    700,
    [
      '!selectedRoleIds.value.length',
      '至少选择一个角色',
      'return'
    ],
    'User role assignment blocks empty role submissions before hitting the backend NotEmpty contract'
  ],
  [
    'role-save-page-dry-run',
    adminRoleManagePage,
    'const payload: RoleSaveDTO = {',
    800,
    [
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-role-save-${editingRoleId.value || form.roleCode}`)'
    ],
    'Role create/update requires confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'role-status-page-dry-run',
    adminRoleManagePage,
    'updateAdminRoleStatusApi(row.roleId, {',
    700,
    [
      'status: nextStatus',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-role-status-${row.roleId}`)'
    ],
    'Role status update requires confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'role-delete-page-dry-run',
    adminRoleManagePage,
    'deleteAdminRoleApi(row.roleId, {',
    700,
    [
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(`admin-role-delete-${row.roleId}`)'
    ],
    'Role delete requires confirmation, dry-run opt-out, reason, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminAccountGovernanceChecks) {
  recordContainsAll('admin-account-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminNotificationGovernanceChecks = [
  [
    'notification-type-dry-run-contract',
    adminGovernanceTypes,
    'export interface NotificationSendDTO',
    500,
    [
      'confirm?: boolean',
      'dryRun?: boolean',
      'reason?: string',
      'idempotencyKey?: string'
    ],
    'Notification send DTO includes dryRun alongside confirmation, reason, and idempotency key'
  ],
  [
    'notification-api-broadcast-dry-run-forwarding',
    adminGovernanceApi,
    'export const broadcastAdminNotificationApi',
    500,
    [
      'request.post<null, null>(\'/admin/notifications/broadcast\'',
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Notification broadcast API forwards dryRun to the backend confirmation guard'
  ],
  [
    'notification-send-page-dry-run',
    adminNotificationManagePage,
    'const handleSend = async () => {',
    2600,
    [
      'confirmDangerActionPreview({',
      'broadcastAdminNotificationApi({',
      'sendAdminNotificationApi({',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(\'admin-notice-broadcast\')',
      'createOperationIdempotencyKey(`admin-notice-send-${form.targetUserId}`)'
    ],
    'Notification send and broadcast page actions require preview, confirmation, dry-run opt-out, and idempotency keys'
  ],
  [
    'notification-delete-page-dry-run',
    adminNotificationManagePage,
    'deleteAdminNotificationApi(row.id, {',
    600,
    [
      'confirm: true',
      'dryRun: false',
      'reason: `admin notification delete confirmed id=${row.id}`',
      'createOperationIdempotencyKey(`admin-notice-delete-${row.id}`)'
    ],
    'Notification delete page action requires confirmation, dry-run opt-out, reason, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminNotificationGovernanceChecks) {
  recordContainsAll('admin-notification-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminIndustryTemplateGovernanceChecks = [
  [
    'industry-template-api-confirmation-payload',
    industryTemplateApi,
    'import request',
    2600,
    [
      "import type { AdminOperationConfirmPayload } from '@/types/adminGovernance'",
      'CreateIndustryTemplateDTO & AdminOperationConfirmPayload',
      'UpdateIndustryTemplateDTO & AdminOperationConfirmPayload',
      'enableAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload)',
      'disableAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload)',
      'deleteAdminIndustryTemplateApi = (id: number, data: AdminOperationConfirmPayload)',
      'request.delete<null, null>(`/admin/industry-templates/${id}`, { data })'
    ],
    'Industry template admin API forwards the shared confirmation payload including dryRun'
  ],
  [
    'industry-template-save-page-dry-run',
    adminIndustryTemplatePage,
    'const handleSave = async () => {',
    2600,
    [
      'confirmDangerActionPreview({',
      'const confirmedPayload = {',
      'confirm: true',
      'dryRun: false',
      'reason: editingId.value',
      'createOperationIdempotencyKey(',
      'updateAdminIndustryTemplateApi(editingId.value, confirmedPayload)',
      'createAdminIndustryTemplateApi(confirmedPayload)'
    ],
    'Industry template create/update page action requires preview, confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'industry-template-toggle-page-dry-run',
    adminIndustryTemplatePage,
    'const handleToggle = async',
    2300,
    [
      'confirmDangerActionPreview({',
      'const confirmation = {',
      'confirm: true',
      'dryRun: false',
      "reason: `Admin confirmed industry template ${nextEnabled === 1 ? 'enable' : 'disable'}",
      'createOperationIdempotencyKey(`industry-template-toggle-${row.industryTemplateId}`)',
      'disableAdminIndustryTemplateApi(row.industryTemplateId, confirmation)',
      'enableAdminIndustryTemplateApi(row.industryTemplateId, confirmation)'
    ],
    'Industry template enable/disable action requires preview, confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'industry-template-delete-page-dry-run',
    adminIndustryTemplatePage,
    'const handleDelete = async',
    1700,
    [
      'confirmDangerActionPreview({',
      'deleteAdminIndustryTemplateApi(row.industryTemplateId, {',
      'confirm: true',
      'dryRun: false',
      "reason: 'Admin confirmed industry template delete from template management page.'",
      'createOperationIdempotencyKey(`industry-template-delete-${row.industryTemplateId}`)'
    ],
    'Industry template delete action requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminIndustryTemplateGovernanceChecks) {
  recordContainsAll('admin-industry-template-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminAnnouncementGovernanceChecks = [
  [
    'announcement-backend-dry-run-guard',
    adminAnnouncementController,
    'private <T> Result<T> runConfirmedOperation',
    1100,
    [
      'Boolean dryRun',
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)'
    ],
    'Announcement backend write operations use the 5-argument confirmation guard and release idempotency locks on failure'
  ],
  [
    'announcement-backend-dto-dry-run',
    adminAnnouncementController,
    'public static class AnnouncementSaveDTO',
    800,
    [
      'private Boolean confirm',
      'private Boolean dryRun',
      'private String reason',
      'private String idempotencyKey',
      'public static class AdminOperationConfirmDTO'
    ],
    'Announcement save and action DTOs expose dryRun alongside confirmation, reason, and idempotency key'
  ],
  [
    'announcement-api-confirmation-payload',
    announcementApi,
    'import request',
    2600,
    [
      "import type { AdminOperationConfirmPayload } from '@/types/adminGovernance'",
      'AnnouncementSaveDTO & AdminOperationConfirmPayload',
      'publishAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload)',
      'offlineAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload)',
      'deleteAdminAnnouncementApi = (id: number, data: AdminOperationConfirmPayload)',
      'request.delete<null, null>(`/admin/announcements/${id}`, { data })'
    ],
    'Announcement admin API forwards the shared confirmation payload including dryRun'
  ],
  [
    'announcement-route',
    routes,
    'AnnouncementManageView.vue',
    700,
    [
      'AnnouncementManageView.vue',
      "requiredPermissions: ['admin:announcement:list']"
    ],
    'Announcement admin page is reachable from a protected admin route'
  ],
  [
    'announcement-sidebar',
    adminSidebar,
    '/admin/announcements',
    400,
    [
      '/admin/announcements',
      "permissions: ['admin:announcement:list']"
    ],
    'Announcement admin page is reachable from the admin sidebar permissions'
  ],
  [
    'announcement-save-page-dry-run',
    adminAnnouncementPage,
    'const handleSave = async',
    3200,
    [
      'confirmDangerActionPreview({',
      'confirm: true',
      'dryRun: false',
      'createOperationIdempotencyKey(',
      'updateAdminAnnouncementApi(editingId.value, payload)',
      'createAdminAnnouncementApi(payload)'
    ],
    'Announcement create/update page action requires preview, confirmation, dry-run opt-out, and idempotency key'
  ],
  [
    'announcement-publish-page-dry-run',
    adminAnnouncementPage,
    'const handlePublish = async',
    2100,
    [
      'confirmDangerActionPreview({',
      'publishAdminAnnouncementApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      "reason: 'Admin confirmed announcement publish from announcement management page.'",
      'createOperationIdempotencyKey(`announcement-publish-${row.id}`)'
    ],
    'Announcement publish action requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'announcement-offline-page-dry-run',
    adminAnnouncementPage,
    'const handleOffline = async',
    2100,
    [
      'confirmDangerActionPreview({',
      'offlineAdminAnnouncementApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      "reason: 'Admin confirmed announcement offline from announcement management page.'",
      'createOperationIdempotencyKey(`announcement-offline-${row.id}`)'
    ],
    'Announcement offline action requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'announcement-delete-page-dry-run',
    adminAnnouncementPage,
    'const handleDelete = async',
    2100,
    [
      'confirmDangerActionPreview({',
      'deleteAdminAnnouncementApi(row.id, {',
      'confirm: true',
      'dryRun: false',
      "reason: 'Admin confirmed announcement delete from announcement management page.'",
      'createOperationIdempotencyKey(`announcement-delete-${row.id}`)'
    ],
    'Announcement delete action requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminAnnouncementGovernanceChecks) {
  recordContainsAll('admin-announcement-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminQuestionApiForwardingChecks = [
  [
    'question-create-api-confirmation-payload',
    questionApi,
    'export const createAdminQuestionApi',
    1200,
    [
      "'/admin/questions', payload",
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Question create API forwards confirmation, dry-run, reason, and idempotency fields'
  ],
  [
    'question-update-api-confirmation-payload',
    questionApi,
    'export const updateAdminQuestionApi',
    1200,
    [
      '`/admin/questions/${id}`, payload',
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Question update API forwards confirmation, dry-run, reason, and idempotency fields'
  ],
  [
    'question-status-api-confirmation-payload',
    questionApi,
    'export const updateAdminQuestionStatusApi',
    500,
    [
      'request.put<null, null>(`/admin/questions/${id}/status`, { status, ...data })'
    ],
    'Question status API forwards the admin confirmation payload'
  ],
  [
    'question-delete-api-confirmation-payload',
    questionApi,
    'export const deleteAdminQuestionApi',
    400,
    [
      'request.delete<null, null>(`/admin/questions/${id}`, { data })'
    ],
    'Question delete API forwards the admin confirmation payload'
  ],
  [
    'question-import-api-confirmation-form-data',
    questionApi,
    'export const importAdminQuestionsApi',
    800,
    [
      "formData.append('confirm', String(Boolean(confirmation.confirm)))",
      "formData.append('dryRun', String(Boolean(confirmation.dryRun)))",
      "formData.append('reason', confirmation.reason || '')",
      "formData.append('idempotencyKey', confirmation.idempotencyKey || '')"
    ],
    'Question import API forwards confirmation, dry-run, reason, and idempotency fields in multipart form data'
  ],
  [
    'question-ai-generate-submit-api',
    questionApi,
    'export const submitAiQuestionGenerateApi',
    400,
    [
      "'/admin/ai/questions/generate/submit'",
      'data'
    ],
    'AI question generation submit API forwards the confirmed payload'
  ],
  [
    'question-ai-generate-sse-api-confirmation-query',
    questionApi,
    'const toAiQuestionGenerateSseQuery',
    1800,
    [
      'confirm: params.confirm != null ? String(params.confirm)',
      'dryRun: params.dryRun != null ? String(params.dryRun)',
      'reason: params.reason ||',
      'idempotencyKey: params.idempotencyKey ||',
      "'/ai/sse/admin/questions/generate'"
    ],
    'Legacy SSE AI question generation fallback forwards confirmation, dry-run, reason, and idempotency fields'
  ],
  [
    'question-review-api-confirmation-payloads',
    questionApi,
    'export const approveQuestionReviewApi',
    1400,
    [
      '`/admin/question-reviews/${id}/approve`',
      '`/admin/question-reviews/${id}/reject`',
      '`/admin/question-reviews/${id}/cancel`',
      "'/admin/question-reviews/batch-approve'",
      "'/admin/question-reviews/batch-reject'",
      'data'
    ],
    'Question review APIs keep caller-provided confirmation payloads'
  ],
  [
    'question-duplicate-api-confirmation-payloads',
    questionApi,
    'export const checkQuestionDuplicateApi',
    9000,
    [
      "'/admin/questions/check-duplicate'",
      "'/admin/question-duplicate-reviews/evaluate'",
      "'/admin/question-duplicate-reviews/eval/cases'",
      "'/admin/question-duplicate-reviews/eval/runs'",
      "'/admin/question-duplicate-reviews/eval/runs/threshold-sweep'",
      '`/admin/question-duplicate-reviews/${id}/merge`',
      '`/admin/question-duplicate-reviews/${id}/ignore`',
      "'/admin/question-duplicate-reviews/batch-merge'",
      "'/admin/question-duplicate-reviews/batch-ignore'",
      'data'
    ],
    'Question duplicate governance APIs keep caller-provided confirmation payloads'
  ],
  [
    'question-export-api',
    questionApi,
    'export const exportAdminQuestionsApi',
    500,
    [
      "'/admin/questions/export/excel'",
      'AdminQuestionQueryDTO & AdminOperationConfirmPayload',
      "responseType: 'blob'"
    ],
    'Question export API is explicitly tracked as a data egress endpoint'
  ],
  [
    'question-import-template-api',
    questionApi,
    'export const downloadQuestionImportTemplate',
    400,
    [
      "'/admin/questions/template'",
      "responseType: 'blob'"
    ],
    'Question import template download stays separate from guarded data export endpoint'
  ],
  [
    'question-category-api-dry-run',
    questionCategoryApi,
    'const toBackendCategoryDTO',
    500,
    [
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Question category API forwards dryRun with the admin confirmation payload'
  ],
  [
    'question-tag-api-dry-run',
    questionTagApi,
    'const toBackendTagDTO',
    500,
    [
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Question tag API forwards dryRun with the admin confirmation payload'
  ],
  [
    'question-group-api-dry-run',
    questionGroupApi,
    'const toBackendGroupDTO',
    500,
    [
      'confirm: data.confirm',
      'dryRun: data.dryRun',
      'reason: data.reason',
      'idempotencyKey: data.idempotencyKey'
    ],
    'Question group API forwards dryRun with the admin confirmation payload'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminQuestionApiForwardingChecks) {
  recordContainsAll('admin-question-api', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminQuestionBackendGovernanceChecks = [
  [
    'question-controller-dry-run-and-release',
    adminQuestionController,
    'private <T> Result<T> runConfirmedOperation',
    900,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Boolean dryRun'
    ],
    'AdminQuestionController uses dryRun-aware confirmation and releases idempotency lock on runtime failure'
  ],
  [
    'question-import-controller-dry-run-and-release',
    adminQuestionImportController,
    'public Result<ImportResult> importQuestions',
    12000,
    [
      '@RequestParam(required = false, defaultValue = "false") Boolean dryRun',
      'confirm, dryRun, reason, idempotencyKey',
      'operationConfirmationGuard.release(lockKey)',
      'return operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)'
    ],
    'AdminQuestionImportController forwards dryRun and releases confirmation locks on import/export failures'
  ],
  [
    'question-metadata-controller-dry-run-and-release',
    adminQuestionMetadataController,
    'private <T> Result<T> runConfirmedOperation',
    900,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Boolean dryRun'
    ],
    'AdminQuestionMetadataController uses dryRun-aware confirmation and releases idempotency lock on runtime failure'
  ],
  [
    'question-review-controller-dry-run-and-release',
    adminQuestionReviewController,
    'private <T> Result<T> runConfirmedOperation',
    900,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Boolean dryRun'
    ],
    'AdminQuestionReviewController uses dryRun-aware confirmation and releases idempotency lock on runtime failure'
  ],
  [
    'question-duplicate-controller-dry-run-and-release',
    adminQuestionDuplicateController,
    'private <T> Result<T> runConfirmedOperation',
    900,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Boolean dryRun'
    ],
    'AdminQuestionDuplicateReviewController uses dryRun-aware confirmation and releases idempotency lock on runtime failure'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminQuestionBackendGovernanceChecks) {
  recordContainsAll('admin-question-backend-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminLegacyGovernanceChecks = [
  [
    'prompt-controller-dry-run-and-release',
    adminAiController,
    'private <T> Result<T> runConfirmedOperation',
    1300,
    [
      'operationConfirmationGuard.requireConfirmed(',
      'operationConfirmationGuard.release(lockKey)',
      'private Result<Void> runConfirmedVoidOperation'
    ],
    'AdminAiController prompt mutations and real AI prompt tests release idempotency locks when service execution fails after confirmation'
  ],
  [
    'search-rebuild-dry-run-and-release',
    adminSearchController,
    'public Result<String> rebuildIndex',
    7000,
    [
      'String lockKey = requireConfirmedRebuild("index:"',
      'String lockKey = requireConfirmedRebuild("all"',
      'operationConfirmationGuard.release(lockKey)',
      'private String requireConfirmedRebuild',
      'confirm, dryRun, reason, idempotencyKey'
    ],
    'AdminSearchController index rebuild operations use dryRun-aware confirmation and release idempotency locks on IOException or runtime failure'
  ],
  [
    'search-sensitive-query-confirmation',
    adminSearchController,
    'public Result<PageResult<JsonNode>> searchResumes',
    12000,
    [
      '@RequestParam(required = false) Boolean confirm',
      '@RequestParam(required = false, defaultValue = "true") Boolean dryRun',
      'String lockKey = requireConfirmedSensitiveSearch("resume"',
      'String lockKey = requireConfirmedSensitiveSearch("interview"',
      'operationConfirmationGuard.release(lockKey)',
      'operationConfirmationGuard.requireConfirmed("search-sensitive:"'
    ],
    'Admin resume/interview search data egress requires confirm, dryRun=false, reason, idempotencyKey, and releases locks on ES failure'
  ],
  [
    'admin-file-download-common-confirmation',
    adminFileController,
    'public class AdminFileController',
    2600,
    [
      'AdminOperationConfirmationGuard operationConfirmationGuard',
      'String lockKey = acquireDownloadAccess(id, dto)',
      'operationConfirmationGuard.release(lockKey)',
      'operationConfirmationGuard.requireConfirmed("admin-file-download:"'
    ],
    'Admin file downloads use the shared high-risk operation confirmation guard and release locks when download fails'
  ],
  [
    'admin-file-download-dto-common-contract',
    adminFileDownloadDto,
    'public class AdminFileDownloadAccessDTO',
    900,
    [
      'private Boolean confirm',
      'private Boolean dryRun',
      'private String reason',
      'private String idempotencyKey',
      'public String effectiveReason()'
    ],
    'Admin file download DTO exposes confirm, dryRun, reason, and idempotencyKey while preserving accessReason compatibility'
  ],
  [
    'system-config-controller-release-lock',
    systemConfigController,
    'private <T> Result<T> runConfirmedOperation',
    1300,
    [
      'operationConfirmationGuard.requireConfirmed(operation, confirm, dryRun, reason, idempotencyKey)',
      'operationConfirmationGuard.release(lockKey)',
      'private Result<Void> runConfirmedVoidOperation'
    ],
    'System config dangerous writes release idempotency locks when service execution fails after confirmation'
  ],
  [
    'admin-file-page-common-confirmation-payload',
    adminFilePage,
    'downloadAdminFileApi(row.id',
    700,
    [
      'confirmSensitiveAccess: true',
      'confirm: true',
      'dryRun: false',
      'reason: accessReason',
      'idempotencyKey: createOperationIdempotencyKey(`admin-file-download-${row.id}`)'
    ],
    'Admin file download UI sends the shared confirmation payload before data egress'
  ],
  [
    'admin-file-type-common-confirmation-payload',
    fileTypes,
    'export interface AdminFileDownloadAccessDTO',
    400,
    [
      'confirm: boolean',
      'dryRun: boolean',
      'reason: string',
      'idempotencyKey: string'
    ],
    'Frontend admin file download type includes the shared confirmation payload'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminLegacyGovernanceChecks) {
  recordContainsAll('admin-legacy-governance', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminDangerOperationChecks = [
  [
    'admin-ops-question-vector-rebuild',
    adminOpsPage,
    'const handleRebuildQuestionVectors = async',
    2600,
    [
      'confirmVectorAction({',
      'rebuildQuestionEmbeddingApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ops manual rebuild question embeddings'",
      "createVectorMaintenanceIdempotencyKey('admin-ops-question-rebuild')"
    ],
    'Admin ops question vector rebuild requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ops-question-vector-retry',
    adminOpsPage,
    'const handleRetryQuestionVectors = async',
    2600,
    [
      'confirmVectorAction({',
      'retryFailedQuestionEmbeddingApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ops manual retry failed question embeddings'",
      "createVectorMaintenanceIdempotencyKey('admin-ops-question-retry')"
    ],
    'Admin ops question vector retry requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ops-knowledge-vector-rebuild',
    adminOpsPage,
    'const handleRebuildKnowledgeVectors = async',
    2600,
    [
      'confirmVectorAction({',
      'rebuildAdminKnowledgeVectorsApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ops manual rebuild knowledge vectors'",
      "createVectorMaintenanceIdempotencyKey('admin-ops-knowledge-rebuild')"
    ],
    'Admin ops knowledge vector rebuild requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ops-knowledge-vector-retry',
    adminOpsPage,
    'const handleRetryKnowledgeVectors = async',
    2600,
    [
      'confirmVectorAction({',
      'retryAdminKnowledgeVectorsApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ops manual retry failed knowledge vectors'",
      "createVectorMaintenanceIdempotencyKey('admin-ops-knowledge-retry')"
    ],
    'Admin ops knowledge vector retry requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ops-vector-delete-outbox-retry',
    adminOpsPage,
    'const handleRetryVectorDeletes = async',
    2800,
    [
      'confirmVectorAction({',
      'retryAdminVectorDeletesApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ops manual retry vector delete outbox'",
      "createVectorMaintenanceIdempotencyKey('admin-ops-delete-retry')"
    ],
    'Admin ops vector delete outbox retry requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-analytics-daily-plan-run',
    adminAnalyticsJobsPage,
    'const runDailyPlan = async',
    2500,
    [
      'confirmDangerActionPreview({',
      'runAdminAnalyticsDailyPlanApi({',
      'confirm: true',
      'dryRun: false',
      'reason:',
      "createOperationIdempotencyKey('analytics-daily-plan')"
    ],
    'Admin analytics daily plan run requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-analytics-job-rerun',
    adminAnalyticsJobsPage,
    'const rerun = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'rerunAdminAnalyticsJobApi(id, {',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`analytics-rerun-${id}`)'
    ],
    'Admin analytics job rerun requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-analytics-metric-save',
    adminAnalyticsMetricsPage,
    'const saveMetric = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'const confirmedPayload: AdminAnalyticsMetricSaveDTO = {',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(operation)',
      'updateAdminAnalyticsMetricApi(metricForm.id, confirmedPayload)',
      'createAdminAnalyticsMetricApi(confirmedPayload)'
    ],
    'Admin analytics metric create/update requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ai-ops-daily-plan-run',
    adminAiOpsAnalyticsPage,
    'const runDailyPlan = async',
    2500,
    [
      'confirmDangerActionPreview({',
      'runAdminAnalyticsDailyPlanApi({',
      'confirm: true',
      'dryRun: false',
      'reason:',
      "createOperationIdempotencyKey('ai-ops-daily-plan')"
    ],
    'Admin AI ops daily plan run requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-ai-ops-job-rerun',
    adminAiOpsAnalyticsPage,
    'const rerunJob = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'rerunAdminAnalyticsJobApi(id, {',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`ai-ops-rerun-${id}`)'
    ],
    'Admin AI ops job rerun requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-prompt-regression-run',
    adminPromptRegressionPage,
    'const runRegression = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'runPromptRegressionApi({',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`prompt-regression-${runForm.caseId}`)'
    ],
    'Admin prompt regression run requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-async-task-retry',
    adminAsyncTaskPage,
    'const handleRetry = async',
    3200,
    [
      'getAdminTaskRetryPreviewApi(row.id)',
      'confirmDangerActionPreview({',
      "retryAdminTaskApi(row.id, buildTaskActionPayload('admin-task-retry', row, note))",
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`${operation}-${row.id}`)'
    ],
    'Admin async task retry requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ],
  [
    'admin-async-dead-letter-retry',
    adminAsyncTaskPage,
    'const handleDeadRetry = async',
    3000,
    [
      'getAdminDeadLetterRetryPreviewApi(row.id)',
      'confirmDangerActionPreview({',
      "retryAdminDeadLetterTaskApi(row.id, buildTaskActionPayload('admin-dead-letter-retry', row, note))",
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(`${operation}-${row.id}`)'
    ],
    'Admin dead-letter retry requires preview, confirmation, dry-run opt-out, reason, and idempotency key'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminDangerOperationChecks) {
  recordContainsAll('admin-danger-operation', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminPromptSensitiveOperationChecks = [
  [
    'admin-prompt-regression-reveal-json',
    adminPromptRegressionPage,
    'const revealJsonDetail = async',
    1400,
    [
      'confirmDangerActionPreview({',
      'jsonDialogContent.value = jsonDialogRawContent.value',
      'maskJsonContent'
    ],
    'Prompt regression full JSON reveal requires confirmation and defaults to masked content'
  ],
  [
    'admin-prompt-regression-save-case',
    adminPromptRegressionPage,
    'const saveCase = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'createPromptRegressionCaseApi(payload)',
      'updatePromptRegressionCaseApi(caseForm.id, payload)',
      'confirm: true',
      'dryRun: false',
      'reason:',
      'createOperationIdempotencyKey(operationKey)'
    ],
    'Prompt regression case save requires confirmation payload before mutating test cases'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminPromptSensitiveOperationChecks) {
  recordContainsAll('admin-prompt-sensitive-operation', name, sliceFrom(text, marker, length), needles, evidence)
}

const adminQuestionOperationChecks = [
  [
    'question-save-create-update',
    adminQuestionPage,
    'const handleSave = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'updateAdminQuestionApi(editingId.value, {',
      'createAdminQuestionApi({',
      'confirm: true',
      'reason:',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question create/update requires front-end confirmation and admin confirmation payload'
  ],
  [
    'question-status-change',
    adminQuestionPage,
    'const handleStatus = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'updateAdminQuestionStatusApi(row.id, nextStatus, {',
      'confirm: true',
      'reason:',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question enable/disable requires front-end confirmation and admin confirmation payload'
  ],
  [
    'question-delete',
    adminQuestionPage,
    'const handleDelete = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'deleteAdminQuestionApi(row.id, {',
      'confirm: true',
      'reason:',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question delete requires front-end confirmation and admin confirmation payload'
  ],
  [
    'question-ai-generate-submit',
    adminQuestionPage,
    'const handleGenerateReviews = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'const confirmedPayload: AiQuestionGenerateRequestDTO = {',
      'confirm: true',
      'dryRun: false',
      "reason: 'admin ai question generation confirmed'",
      "createOperationIdempotencyKey('admin-ai-question-generate')",
      'submitAiQuestionGenerateApi(confirmedPayload)'
    ],
    'AI question generation requires preview and submits a confirmed idempotent payload'
  ],
  [
    'question-ai-generate-sse-fallback',
    adminQuestionPage,
    'const handleGenerateReviews = async',
    2200,
    [
      'confirmedPayload',
      'confirm: true',
      'dryRun: false',
      "createOperationIdempotencyKey('admin-ai-question-generate')",
      'runLegacyGenerateFallback(confirmedPayload)'
    ],
    'Legacy SSE fallback reuses the already confirmed AI question generation payload'
  ],
  [
    'question-review-approve',
    adminQuestionPage,
    'const handleApproveReview = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'approveQuestionReviewApi(id, {',
      'confirm: true',
      'reason:',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question review approve requires confirmation payload'
  ],
  [
    'question-review-reject',
    adminQuestionPage,
    'const handleRejectReview = async',
    2400,
    [
      'confirmDangerActionPreview({',
      'rejectQuestionReviewApi(id, {',
      'rejectReason: value.trim()',
      'confirm: true',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question review reject requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-review-cancel',
    adminQuestionPage,
    'const handleCancelReview = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'cancelQuestionReviewApi(id, {',
      'rejectReason: value.trim()',
      'confirm: true',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question review cancel requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-review-edit-approve',
    adminQuestionPage,
    'const handleApproveReviewWithEdit = async',
    2800,
    [
      'confirmDangerActionPreview({',
      'approveQuestionReviewApi(reviewDetail.value.id, {',
      'confirm: true',
      'reason:',
      'idempotencyKey: createOperationIdempotencyKey'
    ],
    'Question review edit-approve requires confirmation payload'
  ],
  [
    'question-review-batch-approve',
    adminQuestionPage,
    'const handleBatchApproveReviews = async',
    2800,
    [
      'confirmDangerActionPreview({',
      'batchApproveQuestionReviewsApi({',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('question-review-batch-approve')"
    ],
    'Question review batch approve requires confirmation payload'
  ],
  [
    'question-review-batch-reject',
    adminQuestionPage,
    'const handleBatchRejectReviews = async',
    2800,
    [
      'confirmDangerActionPreview({',
      'batchRejectQuestionReviewsApi({',
      'rejectReason: value.trim()',
      'confirm: true',
      "createOperationIdempotencyKey('question-review-batch-reject')"
    ],
    'Question review batch reject requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-duplicate-check',
    adminQuestionPage,
    'const handleCheckDuplicates = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'checkQuestionDuplicateApi({',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('question-duplicate-check')"
    ],
    'Question duplicate check requires confirmation payload'
  ],
  [
    'question-duplicate-evaluate',
    adminQuestionPage,
    'const handleEvaluateDuplicates = async',
    2400,
    [
      'confirmDuplicateEvalAction({',
      'evaluateQuestionDuplicateApi({',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('question-duplicate-evaluate')"
    ],
    'Question duplicate immediate evaluation requires confirmation payload'
  ],
  [
    'question-duplicate-eval-case-save',
    adminQuestionPage,
    'const saveCurrentDuplicateEvalCases = async',
    2600,
    [
      'confirmDuplicateEvalAction({',
      'saveQuestionDuplicateEvalCaseApi({',
      'confirm: true',
      'reason:',
      'createOperationIdempotencyKey(`question-duplicate-eval-case-save-${sample.caseId || saved}`)'
    ],
    'Question duplicate evaluation case save requires confirmation payload'
  ],
  [
    'question-duplicate-eval-run',
    adminQuestionPage,
    'const runDuplicateEvalCases = async',
    2200,
    [
      'confirmDuplicateEvalAction({',
      'runQuestionDuplicateEvalApi({',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('question-duplicate-eval-run')"
    ],
    'Question duplicate eval run requires confirmation payload'
  ],
  [
    'question-duplicate-threshold-sweep',
    adminQuestionPage,
    'const sweepDuplicateThresholds = async',
    2400,
    [
      'confirmDuplicateEvalAction({',
      'sweepQuestionDuplicateThresholdApi({',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('question-duplicate-threshold-sweep')"
    ],
    'Question duplicate threshold sweep requires confirmation payload'
  ],
  [
    'question-duplicate-eval-case-delete',
    adminQuestionPage,
    'const deleteDuplicateEvalCase = async',
    2200,
    [
      'confirmDangerActionPreview({',
      'deleteQuestionDuplicateEvalCaseApi(id, {',
      'confirm: true',
      'reason:',
      'createOperationIdempotencyKey(`question-duplicate-eval-case-delete-${id}`)'
    ],
    'Question duplicate eval case delete requires confirmation payload'
  ],
  [
    'question-embedding-rebuild',
    adminQuestionPage,
    'const handleRebuildEmbedding = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'rebuildQuestionEmbeddingApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'question admin manual rebuild embeddings'",
      "createEmbeddingMaintenanceIdempotencyKey('question-admin-rebuild')"
    ],
    'Question embedding rebuild requires preview, confirmation, dry-run opt-out, reason, and idempotency'
  ],
  [
    'question-embedding-retry',
    adminQuestionPage,
    'const handleRetryFailedEmbedding = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'retryFailedQuestionEmbeddingApi({',
      'confirm: true',
      'dryRun: false',
      "reason: 'question admin manual retry failed embeddings'",
      "createEmbeddingMaintenanceIdempotencyKey('question-admin-retry')"
    ],
    'Question embedding retry requires preview, confirmation, dry-run opt-out, reason, and idempotency'
  ],
  [
    'question-duplicate-merge',
    adminQuestionPage,
    'const handleMergeDuplicate = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'mergeQuestionDuplicateReviewApi(id, {',
      'reason,',
      'confirm: true',
      'createOperationIdempotencyKey(`question-duplicate-merge-${id}`)'
    ],
    'Question duplicate merge requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-duplicate-ignore',
    adminQuestionPage,
    'const handleIgnoreDuplicate = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'ignoreQuestionDuplicateReviewApi(id, {',
      'ignoredReason: value.trim()',
      'confirm: true',
      'createOperationIdempotencyKey(`question-duplicate-ignore-${id}`)'
    ],
    'Question duplicate ignore requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-duplicate-batch-merge',
    adminQuestionPage,
    'const handleBatchMergeDuplicates = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'batchMergeQuestionDuplicateReviewApi({',
      'reason,',
      'confirm: true',
      "createOperationIdempotencyKey('question-duplicate-batch-merge')"
    ],
    'Question duplicate batch merge requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-duplicate-batch-ignore',
    adminQuestionPage,
    'const handleBatchIgnoreDuplicates = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'batchIgnoreQuestionDuplicateReviewApi({',
      'ignoredReason: reason',
      'confirm: true',
      "createOperationIdempotencyKey('question-duplicate-batch-ignore')"
    ],
    'Question duplicate batch ignore requires prompt reason, confirmation, and idempotency'
  ],
  [
    'question-import',
    adminQuestionPage,
    'const handleImport = async',
    3000,
    [
      'confirmDangerActionPreview({',
      'importAdminQuestionsApi(importFile.value, {',
      'confirm: true',
      'reason:',
      "createOperationIdempotencyKey('admin-question-import')"
    ],
    'Question import requires preview and admin confirmation payload'
  ],
  [
    'question-export',
    adminQuestionPage,
    'const handleExport = async',
    2600,
    [
      'confirmDangerActionPreview({',
      'canExportQuestion.value',
      'exportAdminQuestionsApi({',
      'confirm: true',
      'dryRun: false',
      'reason:',
      "createOperationIdempotencyKey('admin-question-export')"
    ],
    'Question export is guarded by permission, front-end confirmation, and backend confirmation payload before data egress'
  ]
]

for (const [name, text, marker, length, needles, evidence] of adminQuestionOperationChecks) {
  recordContainsAll('admin-question-operation', name, sliceFrom(text, marker, length), needles, evidence)
}

const recordConfirmDryRunPairs = (name, text, evidence) => {
  const missingDryRunPairs = text.match(/confirm:\s*true,\r?\n(?!\s*dryRun:\s*false,)/g) || []
  record('admin-question-operation', name, missingDryRunPairs.length === 0, evidence)
}

recordConfirmDryRunPairs(
  'question-page-all-confirm-payloads-dry-run',
  adminQuestionPage,
  'Every confirmed question-management payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'question-category-page-all-confirm-payloads-dry-run',
  adminQuestionCategoryPage,
  'Every confirmed question-category payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'question-tag-page-all-confirm-payloads-dry-run',
  adminQuestionTagPage,
  'Every confirmed question-tag payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'question-group-page-all-confirm-payloads-dry-run',
  adminQuestionGroupPage,
  'Every confirmed question-group payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'question-relation-page-all-confirm-payloads-dry-run',
  adminQuestionRelationPage,
  'Every confirmed question-relation payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'prompt-template-page-all-confirm-payloads-dry-run',
  adminPromptTemplatePage,
  'Every confirmed prompt-template payload must explicitly include dryRun: false'
)
recordConfirmDryRunPairs(
  'knowledge-base-page-all-confirm-payloads-dry-run',
  knowledgePage,
  'Every confirmed knowledge-base payload must explicitly include dryRun: false'
)

const missing = checks.filter((item) => item.status !== 'covered')

if (missing.length) {
  console.error(`V4 contract checks failed: ${missing.length} missing check(s).`)
  for (const item of missing) {
    console.error(`[${item.area}] ${item.name} :: ${item.evidence}`)
  }
  process.exit(1)
}

const counts = checks.reduce((result, item) => {
  result[item.area] = (result[item.area] || 0) + 1
  return result
}, {})

console.log(`V4 contract checks passed: ${checks.length} checks.`)
for (const [area, count] of Object.entries(counts)) {
  console.log(`- ${area}: ${count}`)
}
