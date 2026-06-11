import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ActivatePromptTemplateVersionDTO,
  AiCallLogQueryDTO,
  AiCallLogVO,
  AiLogRawAccessDTO,
  CreatePromptTemplateVersionDTO,
  DisablePromptTemplateVersionDTO,
  PromptCallLogQueryDTO,
  PromptTemplateDTO,
  PromptTemplateDetailVO,
  PromptTemplateQueryDTO,
  PromptVersionRollbackDTO,
  PromptTemplateVersionQuery,
  PromptTemplateVersionVO,
  TestPromptTemplateVersionDTO,
  TestPromptTemplateVersionVO,
  PromptTemplateVO
} from '@/types/ai'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

type BackendAiCallLogVO = Omit<AiCallLogVO, 'status'> & {
  status: string | number
  scene?: AiCallLogVO['callType']
  costMillis?: number
  costTimeMs?: number
  duration?: number
  requestBody?: string
  responseBody?: string
  requestSummary?: string
  promptSummary?: string
  responseSummary?: string
  requestPreviewMasked?: string
  responsePreviewMasked?: string
  promptPreviewMasked?: string
  shortTraceId?: string
  failReason?: string
}

type BackendPromptTemplateVO = Partial<PromptTemplateVO> & {
  scene?: string
  name?: string
  content?: string
  promptContent?: string
  variableDesc?: string
  updateTime?: string
  createTime?: string
}

type BackendPromptTemplateDetailVO = BackendPromptTemplateVO & {
  activeVersion?: PromptTemplateVersionVO
}

const normalizeAiCallLog = (log: BackendAiCallLogVO): AiCallLogVO => {
  const rawFieldsIncluded = log.rawFieldsIncluded === true
  return {
    ...log,
    scene: log.scene || log.callType || '',
    callType: log.callType || log.scene || '',
    status: log.status === 1 ? 'SUCCESS' : log.status === 0 ? 'FAILED' : String(log.status),
    traceId: log.traceId,
    traceIdShort: log.traceIdShort ?? log.shortTraceId ?? log.traceId,
    shortTraceId: log.shortTraceId ?? log.traceIdShort ?? log.traceId,
    latencyMs: log.latencyMs ?? log.elapsedMs ?? log.costTimeMs ?? log.duration ?? log.costMillis,
    elapsedMs: log.elapsedMs ?? log.latencyMs ?? log.costTimeMs ?? log.duration ?? log.costMillis,
    costTimeMs: log.costTimeMs ?? log.duration ?? log.elapsedMs ?? log.latencyMs ?? log.costMillis,
    duration: log.duration ?? log.costTimeMs ?? log.elapsedMs ?? log.latencyMs ?? log.costMillis,
    requestPrompt: rawFieldsIncluded ? log.requestPrompt ?? log.promptContent ?? log.requestBody : undefined,
    requestParams: rawFieldsIncluded ? log.requestParams ?? log.requestBody ?? log.requestPrompt : undefined,
    requestPromptPreview: log.requestPromptPreview ?? log.requestPreview ?? log.promptPreview ?? log.requestSummary,
    requestBody: rawFieldsIncluded ? log.requestBody ?? log.requestParams : undefined,
    requestBodyPreview: log.requestBodyPreview ?? log.requestPreview ?? log.requestSummary,
    promptContent: rawFieldsIncluded ? log.promptContent ?? log.requestPrompt : undefined,
    responseContent: rawFieldsIncluded ? log.responseContent ?? log.responseBody : undefined,
    responseContentPreview: log.responseContentPreview ?? log.responsePreview ?? log.responseSummary,
    responseBody: rawFieldsIncluded ? log.responseBody ?? log.responseContent : undefined,
    responseBodyPreview: log.responseBodyPreview ?? log.responsePreview ?? log.responseSummary,
    requestPreview: log.requestPreview ?? log.requestPromptPreview ?? log.requestBodyPreview ?? log.requestPreviewMasked ?? log.requestSummary,
    promptPreview: log.promptPreview ?? log.requestPromptPreview ?? log.promptPreviewMasked ?? log.promptSummary ?? log.requestPreview,
    responsePreview: log.responsePreview ?? log.responseContentPreview ?? log.responseBodyPreview ?? log.responsePreviewMasked ?? log.responseSummary,
    maskedPreview: log.maskedPreview ?? log.requestPreviewMasked ?? log.promptPreviewMasked ?? log.responsePreviewMasked,
    summary: log.summary ?? log.callSummary ?? log.requestSummary ?? log.promptSummary ?? log.responseSummary,
    callSummary: log.callSummary ?? log.summary ?? log.requestSummary ?? log.promptSummary ?? log.responseSummary,
    failReason: log.failReason ?? log.errorMessage,
    errorMessage: log.errorMessage ?? log.failReason,
    rawFieldsIncluded
  }
}

const normalizeAiLogPage = (result: PageResult<BackendAiCallLogVO>): PageResult<AiCallLogVO> => ({
  ...normalizePageResult(result, undefined, normalizeAiCallLog)
})

const normalizePromptTemplate = (prompt: BackendPromptTemplateVO): PromptTemplateVO => ({
  id: Number(prompt.id || 0),
  promptName: prompt.promptName || prompt.name || '',
  templateCode: prompt.templateCode || prompt.promptType || prompt.scene || '',
  promptType: prompt.promptType || prompt.scene || prompt.templateCode || '',
  templateContent: prompt.templateContent || prompt.content || prompt.promptContent || '',
  systemPrompt: prompt.systemPrompt || '',
  userPromptTemplate: prompt.userPromptTemplate || '',
  variables: prompt.variables || prompt.variableDesc || '',
  version: prompt.version || 'V1',
  status: prompt.status ?? 1,
  description: prompt.description || '',
  createdAt: prompt.createdAt || prompt.createTime,
  updatedAt: prompt.updatedAt || prompt.updateTime
})

const normalizePromptTemplateDetail = (prompt: BackendPromptTemplateDetailVO): PromptTemplateDetailVO => ({
  ...normalizePromptTemplate(prompt),
  activeVersion: prompt.activeVersion
})

const normalizePromptPage = (
  result: PageResult<BackendPromptTemplateVO> | BackendPromptTemplateVO[],
  params?: PromptTemplateQueryDTO
): PageResult<PromptTemplateVO> => normalizePageResult(result, params, normalizePromptTemplate)

const toBackendPromptDTO = (data: PromptTemplateDTO, includeContent = true) => ({
  scene: data.scene,
  name: data.name,
  description: data.description,
  ...(includeContent ? { content: data.content } : {}),
  status: data.status
})

export const getAdminAiPromptsApi = (params: PromptTemplateQueryDTO) => {
  return request
    .get<
      PageResult<BackendPromptTemplateVO> | BackendPromptTemplateVO[],
      PageResult<BackendPromptTemplateVO> | BackendPromptTemplateVO[]
    >(
      '/admin/ai/prompts',
      { params: compactQueryParams(params) }
    )
    .then((result) => normalizePromptPage(result, params))
}

export const createAdminAiPromptApi = (data: PromptTemplateDTO) => {
  return request
    .post<BackendPromptTemplateVO, BackendPromptTemplateVO>(
      '/admin/ai/prompts',
      toBackendPromptDTO(data)
    )
    .then(normalizePromptTemplate)
}

export const updateAdminAiPromptApi = (id: number, data: PromptTemplateDTO) => {
  return request
    .put<BackendPromptTemplateVO, BackendPromptTemplateVO>(
      `/admin/ai/prompts/${id}`,
      toBackendPromptDTO(data, false)
    )
    .then(normalizePromptTemplate)
}

export const getPromptTemplateDetailApi = (id: number) => {
  return request
    .get<BackendPromptTemplateDetailVO, BackendPromptTemplateDetailVO>(`/admin/ai/prompt-templates/${id}`)
    .then(normalizePromptTemplateDetail)
}

export const getPromptTemplateVersionsApi = (templateId: number, params?: PromptTemplateVersionQuery) => {
  return request
    .get<PageResult<PromptTemplateVersionVO>, PageResult<PromptTemplateVersionVO>>(
      `/admin/ai/prompt-templates/${templateId}/versions`,
      { params: compactQueryParams(params) }
    )
    .then((result) => normalizePageResult(result, params))
}

export const createPromptTemplateVersionApi = (templateId: number, data: CreatePromptTemplateVersionDTO) => {
  return request.post<PromptTemplateVersionVO, PromptTemplateVersionVO>(
    `/admin/ai/prompt-templates/${templateId}/versions`,
    data
  )
}

export const activatePromptTemplateVersionApi = (
  versionId: number,
  data?: ActivatePromptTemplateVersionDTO
) => {
  return request.post<PromptTemplateVersionVO, PromptTemplateVersionVO>(
    `/admin/ai/prompt-template-versions/${versionId}/activate`,
    data
  )
}

export const disablePromptTemplateVersionApi = (
  versionId: number,
  data?: DisablePromptTemplateVersionDTO
) => {
  return request.post<null, null>(`/admin/ai/prompt-template-versions/${versionId}/disable`, data)
}

export const rollbackPromptTemplateVersionApi = (
  versionId: number,
  data?: PromptVersionRollbackDTO
) => {
  return request.post<PromptTemplateVersionVO, PromptTemplateVersionVO>(
    `/admin/ai/prompt-template-versions/${versionId}/rollback`,
    data
  )
}

export const testPromptTemplateVersionApi = (versionId: number, data?: TestPromptTemplateVersionDTO) => {
  return request.post<TestPromptTemplateVersionVO, TestPromptTemplateVersionVO>(
    `/admin/ai/prompt-template-versions/${versionId}/test`,
    data
  )
}

export const deleteAdminAiPromptApi = (id: number) => {
  return request.delete<null, null>(`/admin/ai/prompts/${id}`)
}

export const updateAdminAiPromptStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/ai/prompts/${id}/status`, { status })
}

export const getAdminAiLogsApi = async (params: AiCallLogQueryDTO) => {
  const { callType: _callType, ...restParams } = params
  const requestParams = {
    ...restParams,
    scene: params.scene || params.callType || undefined
  }
  const result = await request.get<PageResult<BackendAiCallLogVO>, PageResult<BackendAiCallLogVO>>(
    '/admin/ai/logs',
    {
      params: compactQueryParams(requestParams)
    }
  )
  return normalizeAiLogPage(result)
}

export const getPromptTemplateCallLogsApi = async (
  templateId: number,
  params?: PromptCallLogQueryDTO
) => {
  const result = await request.get<PageResult<BackendAiCallLogVO>, PageResult<BackendAiCallLogVO>>(
    `/admin/ai/prompt-templates/${templateId}/call-logs`,
    { params: compactQueryParams(params) }
  )
  return normalizeAiLogPage(result)
}

export const getPromptTemplateVersionCallLogsApi = async (
  versionId: number,
  params?: PromptCallLogQueryDTO
) => {
  const result = await request.get<PageResult<BackendAiCallLogVO>, PageResult<BackendAiCallLogVO>>(
    `/admin/ai/prompt-template-versions/${versionId}/call-logs`,
    { params: compactQueryParams(params) }
  )
  return normalizeAiLogPage(result)
}

export const getAdminAiLogDetailApi = async (id: number) => {
  const result = await request.get<BackendAiCallLogVO, BackendAiCallLogVO>(`/admin/ai/logs/${id}`)
  return normalizeAiCallLog(result)
}

export const getAdminAiLogRawApi = async (id: number, data: AiLogRawAccessDTO) => {
  const result = await request.post<BackendAiCallLogVO, BackendAiCallLogVO>(`/admin/ai/logs/${id}/raw`, data)
  return normalizeAiCallLog(result)
}
