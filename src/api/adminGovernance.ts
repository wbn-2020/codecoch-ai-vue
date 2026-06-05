import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminInterviewReportVO,
  AdminInterviewVO,
  AdminLogSummaryVO,
  AdminListQuery,
  AdminNotificationVO,
  AdminTaskImpactPreviewVO,
  AiModelConfigDTO,
  AiModelConfigVO,
  AsyncTaskVO,
  LoginLogVO,
  MenuVO,
  NotificationSendDTO,
  OperationLogVO,
  RoleMenuGrantDTO,
  SlowSqlLogVO
} from '@/types/adminGovernance'
import { formatDateTime } from '@/utils/format'
import { normalizePageResult } from '@/utils/page'

const normalizeId = (item: any) => Number(item.id || item.menuId || item.roleId || item.reportId || item.interviewId || 0)

const pick = <T = any>(item: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const cleanParams = (params: Record<string, any>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))

const withCommonParams = (params: AdminListQuery) => cleanParams({
  pageNo: params.pageNo,
  pageSize: params.pageSize,
  keyword: params.keyword,
  status: params.status,
  type: params.type,
  userId: params.userId,
  username: params.username,
  module: params.module,
  action: params.action,
  traceId: params.traceId,
  loginType: params.loginType,
  startTime: params.startTime,
  endTime: params.endTime
})

const normalizeTask = (item: any): AsyncTaskVO => ({
  ...item,
  id: normalizeId(item),
  taskId: pick(item, 'taskId', 'messageId', 'message_id', 'id'),
  taskType: pick(item, 'taskType', 'type', 'bizType', 'biz_type'),
  taskName: pick(item, 'taskName', 'name', 'taskType', 'type', 'bizType', 'biz_type'),
  status: pick(item, 'status', 'taskStatus', 'task_status') || 'UNKNOWN',
  deadLetter: item.deadLetter ?? item.isDeadLetter ?? item.deadLetterFlag ?? item.dead_letter,
  errorMessage: pick(item, 'errorMessage', 'failReason', 'failureReason', 'failure_reason'),
  payloadPreview: pick(item, 'payloadPreview', 'payload_preview'),
  payloadHash: pick(item, 'payloadHash', 'payload_hash'),
  resultPreview: pick(item, 'resultPreview', 'result_preview'),
  resultHash: pick(item, 'resultHash', 'result_hash'),
  rawFieldsAvailable: pick(item, 'rawFieldsAvailable', 'raw_fields_available'),
  createdAt: pick(item, 'createdAt', 'createTime', 'created_at'),
  updatedAt: pick(item, 'updatedAt', 'updateTime', 'updated_at'),
  finishedAt: pick(item, 'finishedAt', 'finishTime', 'completedAt', 'completed_at')
})

const normalizeNotice = (item: any): AdminNotificationVO => ({
  ...item,
  id: normalizeId(item),
  title: pick(item, 'title', 'noticeTitle') || '',
  content: pick(item, 'content', 'noticeContent') || '',
  type: pick(item, 'type', 'bizType', 'biz_type') || 'SYSTEM',
  targetType: pick(item, 'targetType', 'target_type') || (pick(item, 'targetUserId', 'target_user_id', 'userId', 'user_id') ? 'USER' : 'ALL'),
  targetUserId: pick(item, 'targetUserId', 'target_user_id', 'userId', 'user_id'),
  createdAt: formatDateTime(pick(item, 'createdAt', 'createTime', 'created_at')),
  publishedAt: formatDateTime(pick(item, 'publishedAt', 'publishTime', 'published_at'))
})

const normalizeOperationLog = (item: any): OperationLogVO => ({
  ...item,
  id: normalizeId(item),
  username: pick(item, 'username', 'operatorName', 'operator_name', 'nickName', 'nick_name'),
  module: pick(item, 'module', 'businessModule', 'business_module'),
  menuName: pick(item, 'menuName', 'menu_name', 'menu', 'menuTitle', 'menu_title'),
  operation: pick(item, 'operation', 'operationType', 'operation_type', 'action'),
  action: pick(item, 'action', 'operation', 'operationType', 'operation_type'),
  traceId: pick(item, 'traceId', 'trace_id'),
  requestUri: pick(item, 'requestUri', 'request_uri', 'uri', 'path'),
  requestArgs: pick(item, 'requestArgs', 'request_args'),
  requestArgsPreview: pick(item, 'requestArgsPreview', 'request_args_preview', 'requestArgs', 'request_args'),
  requestArgsHash: pick(item, 'requestArgsHash', 'request_args_hash'),
  response: pick(item, 'response'),
  responsePreview: pick(item, 'responsePreview', 'response_preview', 'response'),
  responseHash: pick(item, 'responseHash', 'response_hash'),
  rawAvailable: Boolean(pick(item, 'rawAvailable', 'raw_available')),
  ip: pick(item, 'ip', 'ipAddress', 'ip_address'),
  userAgentSummary: pick(item, 'userAgentSummary', 'user_agent_summary'),
  costTime: pick(item, 'costTime', 'costMillis', 'costMs', 'cost_ms', 'duration'),
  errorMessage: pick(item, 'errorMessage', 'errorMsg', 'error_msg'),
  createdAt: pick(item, 'createdAt', 'operationTime', 'createTime', 'created_at')
})

const normalizeLoginLog = (item: any): LoginLogVO => ({
  ...item,
  id: normalizeId(item),
  username: pick(item, 'username', 'loginName', 'login_name', 'nickName', 'nick_name'),
  ip: pick(item, 'ipMasked', 'ip_masked', 'maskedIp', 'masked_ip', 'ip', 'ipAddress', 'ip_address'),
  ipMasked: pick(item, 'ipMasked', 'ip_masked', 'maskedIp', 'masked_ip', 'ip', 'ipAddress', 'ip_address'),
  maskedIp: pick(item, 'maskedIp', 'masked_ip', 'ipMasked', 'ip_masked', 'ip', 'ipAddress', 'ip_address'),
  traceId: pick(item, 'traceIdShort', 'traceId', 'shortTraceId', 'trace_id'),
  traceIdShort: pick(item, 'traceIdShort', 'shortTraceId', 'traceId', 'trace_id'),
  shortTraceId: pick(item, 'shortTraceId', 'traceIdShort', 'traceId', 'trace_id'),
  loginType: pick(item, 'loginType', 'login_type'),
  location: pick(item, 'location', 'region', 'address'),
  userAgent: pick(item, 'userAgentSummary', 'userAgentMasked', 'maskedUserAgent', 'userAgent', 'user_agent', 'clientInfo', 'client_info'),
  userAgentMasked: pick(item, 'userAgentMasked', 'user_agent_masked', 'maskedUserAgent', 'masked_user_agent', 'clientInfoMasked', 'client_info_masked'),
  maskedUserAgent: pick(item, 'maskedUserAgent', 'masked_user_agent', 'userAgentMasked', 'user_agent_masked', 'clientInfoMasked', 'client_info_masked'),
  userAgentSummary: pick(item, 'userAgentSummary', 'user_agent_summary', 'summary', 'loginSummary', 'login_summary'),
  status: pick(item, 'status', 'loginStatus', 'login_status'),
  message: pick(item, 'message', 'errorMessage', 'failReason', 'fail_reason', 'failureReason', 'failure_reason', 'reason'),
  summary: pick(item, 'summary', 'loginSummary', 'login_summary', 'riskSummary', 'risk_summary'),
  loginSummary: pick(item, 'loginSummary', 'login_summary', 'summary', 'riskSummary', 'risk_summary'),
  preview: pick(item, 'preview', 'loginPreview', 'login_preview'),
  maskedPreview: pick(item, 'maskedPreview', 'masked_preview', 'safePreview', 'safe_preview', 'loginPreview', 'login_preview'),
  loginTime: pick(item, 'loginTime', 'login_time', 'createdAt', 'createTime', 'created_at'),
  createdAt: pick(item, 'createdAt', 'loginTime', 'login_time', 'createTime', 'created_at')
})

const normalizeSlowSqlLog = (item: any): SlowSqlLogVO => ({
  ...item,
  id: normalizeId(item),
  mapperId: pick(item, 'mapperId', 'mapper_id'),
  sqlCommandType: pick(item, 'sqlCommandType', 'sql_command_type'),
  sqlText: pick(item, 'sqlTextPreview', 'sql_text_preview', 'sqlText', 'sql_text'),
  sqlTextPreview: pick(item, 'sqlTextPreview', 'sql_text_preview', 'sqlText', 'sql_text'),
  sqlTextHash: pick(item, 'sqlTextHash', 'sql_text_hash'),
  parameterSummary: pick(item, 'parameterSummary', 'parameter_summary'),
  parameterSummaryHash: pick(item, 'parameterSummaryHash', 'parameter_summary_hash'),
  rawAvailable: Boolean(pick(item, 'rawAvailable', 'raw_available')),
  databaseName: pick(item, 'databaseName', 'database_name'),
  costMs: pick(item, 'costMs', 'cost_ms', 'costTime', 'duration'),
  thresholdMs: pick(item, 'thresholdMs', 'threshold_ms'),
  resultSize: pick(item, 'resultSize', 'result_size'),
  createdAt: pick(item, 'createdAt', 'createTime', 'created_at')
})

const normalizeMenu = (item: any): MenuVO => ({
  ...item,
  id: normalizeId(item),
  parentId: pick(item, 'parentId', 'parent_id', 'pid') || 0,
  menuName: pick(item, 'menuName', 'menu_name', 'name', 'title') || '',
  name: pick(item, 'name', 'menuName', 'menu_name', 'title'),
  permission: pick(item, 'permission', 'permissionCode', 'permission_code'),
  sortOrder: pick(item, 'sortOrder', 'sort_order', 'sort', 'orderNum', 'order_num'),
  type: pick(item, 'type', 'menuType', 'menu_type') || 'MENU',
  children: (item.children || []).map(normalizeMenu)
})

const normalizeAiModel = (item: any): AiModelConfigVO => ({
  ...item,
  id: normalizeId(item),
  provider: pick(item, 'provider', 'platform') || '',
  modelCode: pick(item, 'modelCode', 'model_code'),
  modelName: pick(item, 'modelCode', 'model_code', 'modelName', 'model_name', 'name') || '',
  displayName: pick(item, 'displayName', 'display_name', 'modelAlias', 'model_alias', 'modelName', 'model_name', 'name'),
  apiBaseUrl: pick(item, 'apiBaseUrl', 'api_base_url', 'baseUrl', 'base_url'),
  apiKeyMasked: pick(item, 'apiKeyMasked', 'api_key_masked', 'maskedApiKey', 'masked_api_key', 'apiKey', 'api_key'),
  enabled: item.enabled ?? item.status ?? 1,
  isDefault: item.isDefault ?? item.is_default ?? item.defaultModel ?? item.default_model ?? item.defaultFlag ?? 0,
  temperature: pick(item, 'temperature'),
  maxTokens: pick(item, 'maxTokens', 'max_tokens'),
  description: pick(item, 'description', 'remark'),
  createdAt: pick(item, 'createdAt', 'createTime', 'created_at'),
  updatedAt: pick(item, 'updatedAt', 'updateTime', 'updated_at')
})

const normalizeInterview = (item: any): AdminInterviewVO => ({
  ...item,
  interviewId: pick(item, 'interviewId', 'interview_id', 'id') || 0,
  userId: pick(item, 'userId', 'user_id'),
  username: pick(item, 'username', 'userName', 'user_name', 'nickName', 'nick_name'),
  interviewName: pick(item, 'interviewName', 'interview_name', 'title'),
  interviewMode: pick(item, 'interviewMode', 'interview_mode', 'mode'),
  targetPosition: pick(item, 'targetPosition', 'target_position'),
  reportStatus: pick(item, 'reportStatus', 'report_status'),
  totalScore: pick(item, 'totalScore', 'total_score'),
  questionCount: pick(item, 'questionCount', 'question_count', 'answeredQuestionCount', 'answered_question_count'),
  createdAt: pick(item, 'createdAt', 'createTime', 'created_at', 'updatedAt', 'updated_at'),
  startedAt: pick(item, 'startedAt', 'startTime', 'start_time'),
  finishedAt: pick(item, 'finishedAt', 'endTime', 'end_time')
})

const normalizeReport = (item: any): AdminInterviewReportVO => ({
  ...item,
  id: pick(item, 'id', 'reportId', 'report_id'),
  reportId: pick(item, 'reportId', 'report_id', 'id'),
  interviewId: pick(item, 'interviewId', 'interview_id', 'sessionId', 'session_id') || 0,
  userId: pick(item, 'userId', 'user_id'),
  username: pick(item, 'username', 'userName', 'user_name', 'nickName', 'nick_name'),
  interviewName: pick(item, 'interviewName', 'interview_name', 'interviewTitle', 'interview_title', 'title'),
  reportStatus: pick(item, 'reportStatus', 'report_status', 'status'),
  totalScore: pick(item, 'totalScore', 'total_score'),
  summary: pick(item, 'summary', 'reportContent', 'report_content'),
  failedReason: pick(item, 'failedReason', 'failureReason', 'failure_reason', 'errorMessage', 'error_message'),
  generatedAt: pick(item, 'generatedAt', 'generated_at', 'createdAt', 'createTime', 'created_at'),
  createdAt: pick(item, 'createdAt', 'createTime', 'created_at')
})

export const getAdminTasksApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/tasks', {
      params: cleanParams({ ...withCommonParams(params), bizType: params.type })
    })
    .then((result) => normalizePageResult(result, params, normalizeTask))

export const getAdminTaskDetailApi = (id: number) =>
  request.get<any, any>(`/admin/tasks/${id}`).then(normalizeTask)

export const getAdminTaskRetryPreviewApi = (id: number) =>
  request.get<AdminTaskImpactPreviewVO, AdminTaskImpactPreviewVO>(`/admin/tasks/${id}/retry-preview`)

export const retryAdminTaskApi = (id: number, note: string) =>
  request.post<null, null>(`/admin/tasks/${id}/retry`, { note })

export const getAdminDeadLetterRetryPreviewApi = (id: number) =>
  request.get<AdminTaskImpactPreviewVO, AdminTaskImpactPreviewVO>(`/admin/tasks/${id}/dead-letter/retry-preview`)

export const retryAdminDeadLetterTaskApi = (id: number, note: string) =>
  request.post<null, null>(`/admin/tasks/${id}/dead-letter/retry`, { note })

export const getAdminNotificationsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/notifications', {
      params: cleanParams({ ...withCommonParams(params), readStatus: params.status })
    })
    .then((result) => normalizePageResult(result, params, normalizeNotice))

export const sendAdminNotificationApi = (data: NotificationSendDTO) =>
  request.post<AdminNotificationVO, AdminNotificationVO>('/admin/notifications', data)

export const broadcastAdminNotificationApi = (data: NotificationSendDTO) =>
  request.post<null, null>('/admin/notifications/broadcast', data)

export const deleteAdminNotificationApi = (id: number) =>
  request.delete<null, null>(`/admin/notifications/${id}`)

export const getAdminOperationLogsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/operation-logs', { params: withCommonParams(params) })
    .then((result) => normalizePageResult(result, params, normalizeOperationLog))

export const getAdminLogSummaryApi = () =>
  request.get<AdminLogSummaryVO, AdminLogSummaryVO>('/admin/logs/summary')

export const getAdminLoginLogsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/login-logs', {
      params: cleanParams({ ...withCommonParams(params), loginStatus: params.status })
    })
    .then((result) => normalizePageResult(result, params, normalizeLoginLog))

export const getAdminSlowSqlLogsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/logs/slow-sql', {
      params: cleanParams({
        ...withCommonParams(params),
        mapperId: params.mapperId,
        sqlCommandType: params.sqlCommandType,
        minCostMs: params.minCostMs
      })
    })
    .then((result) => normalizePageResult(result, params, normalizeSlowSqlLog))

export const getAdminMenusApi = () => request.get<any[], any[]>('/admin/menus').then((items) => items.map(normalizeMenu))

export const getAdminRoleMenusApi = (roleId: number) =>
  request.get<number[] | MenuVO[], number[] | MenuVO[]>(`/admin/roles/${roleId}/menus`).then((items) =>
    (items || []).map((item: any) => (typeof item === 'number' ? item : normalizeId(item))).filter(Boolean)
  )

export const grantAdminRoleMenusApi = (roleId: number, data: RoleMenuGrantDTO) =>
  request.post<null, null>(`/admin/roles/${roleId}/menus`, data)

export const getAdminAiModelsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/ai/models', {
      params: cleanParams({ ...withCommonParams(params), enabled: params.status })
    })
    .then((result) => normalizePageResult(result, params, normalizeAiModel))

export const createAdminAiModelApi = (data: AiModelConfigDTO) =>
  request.post<AiModelConfigVO, AiModelConfigVO>('/admin/ai/models', data)

export const updateAdminAiModelApi = (id: number, data: AiModelConfigDTO) =>
  request.put<AiModelConfigVO, AiModelConfigVO>(`/admin/ai/models/${id}`, data)

export const updateAdminAiModelStatusApi = (id: number, status: number) =>
  request.put<null, null>(`/admin/ai/models/${id}/status`, { status })

export const setDefaultAdminAiModelApi = (id: number) =>
  request.put<null, null>(`/admin/ai/models/${id}/default`)

export const deleteAdminAiModelApi = (id: number) => request.delete<null, null>(`/admin/ai/models/${id}`)

export const getAdminInterviewsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/interviews', { params: withCommonParams(params) })
    .then((result) => normalizePageResult(result, params, normalizeInterview))

export const getAdminInterviewDetailApi = (id: number) =>
  request.get<any, any>(`/admin/interviews/${id}`).then(normalizeInterview)

export const getAdminInterviewReportsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/interview-reports', { params: withCommonParams(params) })
    .then((result) => normalizePageResult(result, params, normalizeReport))

export const getAdminInterviewReportDetailApi = (id: number) =>
  request.get<any, any>(`/admin/interview-reports/${id}`).then(normalizeReport)
