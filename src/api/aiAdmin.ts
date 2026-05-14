import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AiCallLogQueryDTO,
  AiCallLogVO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVO
} from '@/types/ai'
import { normalizePageResult } from '@/utils/page'

type BackendAiCallLogVO = Omit<AiCallLogVO, 'status'> & {
  status: string | number
  scene?: AiCallLogVO['callType']
  costMillis?: number
  requestBody?: string
  responseBody?: string
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

const normalizeAiCallLog = (log: BackendAiCallLogVO): AiCallLogVO => ({
  ...log,
  scene: log.scene || log.callType || '',
  callType: log.callType || log.scene || '',
  status: log.status === 1 ? 'SUCCESS' : log.status === 0 ? 'FAILED' : String(log.status),
  latencyMs: log.latencyMs ?? log.elapsedMs ?? log.costMillis,
  elapsedMs: log.elapsedMs ?? log.latencyMs ?? log.costMillis,
  requestPrompt: log.requestPrompt ?? log.promptContent ?? log.requestBody,
  requestParams: log.requestParams ?? log.requestBody ?? log.requestPrompt,
  promptContent: log.promptContent ?? log.requestPrompt,
  responseContent: log.responseContent ?? log.responseBody,
  failReason: log.failReason ?? log.errorMessage,
  errorMessage: log.errorMessage ?? log.failReason
})

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

const normalizePromptPage = (
  result: PageResult<BackendPromptTemplateVO>
): PageResult<PromptTemplateVO> => normalizePageResult(result, undefined, normalizePromptTemplate)

const toBackendPromptDTO = (data: PromptTemplateDTO) => ({
  scene: data.scene,
  name: data.name,
  content: data.content,
  status: data.status
})

export const getAdminAiPromptsApi = (params: PromptTemplateQueryDTO) => {
  return request
    .get<PageResult<BackendPromptTemplateVO>, PageResult<BackendPromptTemplateVO>>(
      '/admin/ai/prompts',
      { params }
    )
    .then(normalizePromptPage)
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
      toBackendPromptDTO(data)
    )
    .then(normalizePromptTemplate)
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
      params: requestParams
    }
  )
  return normalizeAiLogPage(result)
}

export const getAdminAiLogDetailApi = async (id: number) => {
  const result = await request.get<BackendAiCallLogVO, BackendAiCallLogVO>(`/admin/ai/logs/${id}`)
  return normalizeAiCallLog(result)
}
