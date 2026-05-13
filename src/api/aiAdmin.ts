import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AiCallLogQueryDTO,
  AiCallLogVO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVO
} from '@/types/ai'

type BackendAiCallLogVO = Omit<AiCallLogVO, 'status'> & {
  status: string | number
  scene?: AiCallLogVO['callType']
  costMillis?: number
  requestBody?: string
  responseBody?: string
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
  callType: log.callType || log.scene || '',
  status: log.status === 1 ? 'SUCCESS' : log.status === 0 ? 'FAILED' : String(log.status),
  latencyMs: log.latencyMs ?? log.costMillis,
  requestParams: log.requestParams ?? log.requestBody,
  responseContent: log.responseContent ?? log.responseBody
})

const normalizeAiLogPage = (result: PageResult<BackendAiCallLogVO>): PageResult<AiCallLogVO> => ({
  ...result,
  records: (result.records || []).map(normalizeAiCallLog)
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
): PageResult<PromptTemplateVO> => ({
  ...result,
  records: (result.records || []).map(normalizePromptTemplate)
})

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

export const getAdminAiLogsApi = async (params: AiCallLogQueryDTO) => {
  const result = await request.get<PageResult<BackendAiCallLogVO>, PageResult<BackendAiCallLogVO>>(
    '/admin/ai/logs',
    {
      params
    }
  )
  return normalizeAiLogPage(result)
}

export const getAdminAiLogDetailApi = async (id: number) => {
  const result = await request.get<BackendAiCallLogVO, BackendAiCallLogVO>(`/admin/ai/logs/${id}`)
  return normalizeAiCallLog(result)
}
