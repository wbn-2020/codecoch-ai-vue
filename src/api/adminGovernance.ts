import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminInterviewReportVO,
  AdminInterviewVO,
  AdminListQuery,
  AdminNotificationVO,
  AiModelConfigDTO,
  AiModelConfigVO,
  AsyncTaskVO,
  LoginLogVO,
  MenuVO,
  NotificationSendDTO,
  OperationLogVO,
  RoleMenuGrantDTO
} from '@/types/adminGovernance'
import { normalizePageResult } from '@/utils/page'

const normalizeId = (item: any) => Number(item.id || item.menuId || item.roleId || item.reportId || item.interviewId || 0)

const normalizeTask = (item: any): AsyncTaskVO => ({
  ...item,
  id: normalizeId(item),
  taskId: item.taskId || item.id,
  taskType: item.taskType || item.type,
  taskName: item.taskName || item.name || item.taskType || item.type,
  status: item.status || item.taskStatus || 'UNKNOWN',
  deadLetter: item.deadLetter ?? item.isDeadLetter ?? item.deadLetterFlag,
  errorMessage: item.errorMessage || item.failReason || item.failureReason,
  createdAt: item.createdAt || item.createTime,
  updatedAt: item.updatedAt || item.updateTime,
  finishedAt: item.finishedAt || item.finishTime
})

const normalizeNotice = (item: any): AdminNotificationVO => ({
  ...item,
  id: normalizeId(item),
  title: item.title || item.noticeTitle || '',
  content: item.content || item.noticeContent || '',
  type: item.type || item.bizType || 'SYSTEM',
  targetType: item.targetType || (item.targetUserId || item.userId ? 'USER' : 'ALL'),
  targetUserId: item.targetUserId || item.userId,
  createdAt: item.createdAt || item.createTime,
  publishedAt: item.publishedAt || item.publishTime
})

const normalizeOperationLog = (item: any): OperationLogVO => ({
  ...item,
  id: normalizeId(item),
  username: item.username || item.operatorName || item.nickName,
  module: item.module || item.businessModule,
  operation: item.operation || item.operationType || item.action,
  requestUri: item.requestUri || item.uri || item.path,
  ip: item.ip || item.ipAddress,
  costTime: item.costTime || item.costMillis || item.duration,
  createdAt: item.createdAt || item.operationTime || item.createTime
})

const normalizeLoginLog = (item: any): LoginLogVO => ({
  ...item,
  id: normalizeId(item),
  username: item.username || item.loginName || item.nickName,
  ip: item.ip || item.ipAddress,
  message: item.message || item.errorMessage || item.reason,
  loginTime: item.loginTime || item.createdAt || item.createTime,
  createdAt: item.createdAt || item.loginTime || item.createTime
})

const normalizeMenu = (item: any): MenuVO => ({
  ...item,
  id: normalizeId(item),
  parentId: item.parentId || item.pid || 0,
  menuName: item.menuName || item.name || item.title || '',
  name: item.name || item.menuName || item.title,
  sortOrder: item.sortOrder ?? item.sort ?? item.orderNum,
  type: item.type || item.menuType || 'MENU',
  children: (item.children || []).map(normalizeMenu)
})

const normalizeAiModel = (item: any): AiModelConfigVO => ({
  ...item,
  id: normalizeId(item),
  provider: item.provider || item.platform || '',
  modelName: item.modelName || item.name || '',
  displayName: item.displayName || item.modelAlias || item.name,
  apiBaseUrl: item.apiBaseUrl || item.baseUrl,
  apiKeyMasked: item.apiKeyMasked || item.maskedApiKey || item.apiKey,
  enabled: item.enabled ?? item.status ?? 1,
  isDefault: item.isDefault ?? item.defaultModel ?? item.defaultFlag ?? 0,
  createdAt: item.createdAt || item.createTime,
  updatedAt: item.updatedAt || item.updateTime
})

const normalizeInterview = (item: any): AdminInterviewVO => ({
  ...item,
  interviewId: item.interviewId || item.id,
  username: item.username || item.userName || item.nickName,
  interviewName: item.interviewName || item.title,
  interviewMode: item.interviewMode || item.mode,
  questionCount: item.questionCount || item.answeredQuestionCount,
  createdAt: item.createdAt || item.createTime,
  startedAt: item.startedAt || item.startTime,
  finishedAt: item.finishedAt || item.endTime
})

const normalizeReport = (item: any): AdminInterviewReportVO => ({
  ...item,
  id: item.id || item.reportId,
  reportId: item.reportId || item.id,
  interviewId: item.interviewId || item.sessionId,
  username: item.username || item.userName || item.nickName,
  interviewName: item.interviewName || item.title,
  reportStatus: item.reportStatus || item.status,
  summary: item.summary || item.reportContent,
  failedReason: item.failedReason || item.failureReason || item.errorMessage,
  generatedAt: item.generatedAt || item.createdAt || item.createTime,
  createdAt: item.createdAt || item.createTime
})

export const getAdminTasksApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/tasks', { params })
    .then((result) => normalizePageResult(result, params, normalizeTask))

export const getAdminTaskDetailApi = (id: number) =>
  request.get<any, any>(`/admin/tasks/${id}`).then(normalizeTask)

export const retryAdminTaskApi = (id: number) => request.post<null, null>(`/admin/tasks/${id}/retry`)

export const retryAdminDeadLetterTaskApi = (id: number) =>
  request.post<null, null>(`/admin/tasks/${id}/dead-letter/retry`)

export const getAdminNotificationsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/notifications', { params })
    .then((result) => normalizePageResult(result, params, normalizeNotice))

export const sendAdminNotificationApi = (data: NotificationSendDTO) =>
  request.post<AdminNotificationVO, AdminNotificationVO>('/admin/notifications', data)

export const broadcastAdminNotificationApi = (data: NotificationSendDTO) =>
  request.post<null, null>('/admin/notifications/broadcast', data)

export const deleteAdminNotificationApi = (id: number) =>
  request.delete<null, null>(`/admin/notifications/${id}`)

export const getAdminOperationLogsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/operation-logs', { params })
    .then((result) => normalizePageResult(result, params, normalizeOperationLog))

export const getAdminLoginLogsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/login-logs', { params })
    .then((result) => normalizePageResult(result, params, normalizeLoginLog))

export const getAdminMenusApi = () => request.get<any[], any[]>('/admin/menus').then((items) => items.map(normalizeMenu))

export const getAdminRoleMenusApi = (roleId: number) =>
  request.get<number[] | MenuVO[], number[] | MenuVO[]>(`/admin/roles/${roleId}/menus`).then((items) =>
    (items || []).map((item: any) => (typeof item === 'number' ? item : normalizeId(item))).filter(Boolean)
  )

export const grantAdminRoleMenusApi = (roleId: number, data: RoleMenuGrantDTO) =>
  request.post<null, null>(`/admin/roles/${roleId}/menus`, data)

export const getAdminAiModelsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/ai/models', { params })
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
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/interviews', { params })
    .then((result) => normalizePageResult(result, params, normalizeInterview))

export const getAdminInterviewDetailApi = (id: number) =>
  request.get<any, any>(`/admin/interviews/${id}`).then(normalizeInterview)

export const getAdminInterviewReportsApi = (params: AdminListQuery) =>
  request
    .get<PageResult<any> | any[], PageResult<any> | any[]>('/admin/interview-reports', { params })
    .then((result) => normalizePageResult(result, params, normalizeReport))

export const getAdminInterviewReportDetailApi = (id: number) =>
  request.get<any, any>(`/admin/interview-reports/${id}`).then(normalizeReport)
