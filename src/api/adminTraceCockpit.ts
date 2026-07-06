import type { RouteLocationRaw } from 'vue-router'
import { getAdminAgentRunDetailApi, getAdminAgentRunsApi } from '@/api/adminAgent'
import {
  getAdminTaskByMessageIdApi,
  getAdminTaskDetailApi,
  getAdminTasksByBizApi,
  getAdminTasksByTraceApi
} from '@/api/adminGovernance'
import { getAdminAiLogsApi } from '@/api/aiAdmin'
import type { AdminAgentRunDetailVO } from '@/types/agent'
import type { AsyncTaskVO } from '@/types/adminGovernance'
import type { AiCallLogVO } from '@/types/ai'
import type {
  TraceAssociationConfidence,
  TraceAssociationType,
  TraceCockpitQuery,
  TraceCockpitResult,
  TraceGovernanceSuggestion,
  TraceModuleKey,
  TraceModuleStatus,
  TraceNode,
  TraceNodeStatus,
  TracePreviewItem,
  TraceRawAccessStatus
} from '@/types/adminTraceCockpit'
import { compactQueryParams } from '@/utils/page'

type ModuleResult<T> = {
  module: TraceModuleKey
  moduleName: string
  records: T[]
  error?: unknown
  skipped?: boolean
  skipReason?: string
}

type RawFieldBag = Record<string, unknown>

const isFilled = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== ''

const firstFilled = (...values: unknown[]) => values.find(isFilled)

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const toStringId = (value: unknown) => (isFilled(value) ? String(value) : undefined)

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const toRouteQuery = (params: object) => {
  const query: Record<string, string> = {}
  Object.entries(compactQueryParams(params)).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query[key] = String(value)
  })
  return query
}

export const buildAdminTraceUrl = (params: TraceCockpitQuery): RouteLocationRaw => ({
  path: '/admin/trace-cockpit',
  query: toRouteQuery(params)
})

export const buildAdminAiLogUrl = (params: Pick<TraceCockpitQuery, 'traceId' | 'requestId' | 'businessId'> & { id?: number | string }): RouteLocationRaw => ({
  path: '/admin/ai/logs',
  query: toRouteQuery({
    traceId: params.traceId,
    requestId: params.requestId,
    businessId: params.businessId,
    aiCallLogId: params.id
  })
})

export const buildAdminAgentRunUrl = (params: Pick<TraceCockpitQuery, 'traceId'> & { runId?: number | string; agentRunId?: number | string }): RouteLocationRaw => ({
  path: '/admin/agent/runs',
  query: toRouteQuery({
    traceId: params.traceId,
    runId: params.runId || params.agentRunId
  })
})

export const buildAdminAsyncTaskUrl = (
  params: Pick<TraceCockpitQuery, 'traceId' | 'messageId' | 'bizType' | 'bizId'> & { taskId?: number | string }
): RouteLocationRaw => ({
  path: '/admin/async-tasks',
  query: toRouteQuery({
    traceId: params.traceId,
    messageId: params.messageId,
    bizType: params.bizType,
    bizId: params.bizId,
    taskId: params.taskId
  })
})

export const buildAdminPromptRegressionUrl = (params: {
  promptTemplateId?: number | string
  traceId?: string
}): RouteLocationRaw => ({
  path: '/admin/ai/prompt-regression',
  query: toRouteQuery({
    promptTemplateId: params.promptTemplateId,
    traceId: params.traceId
  })
})

export const buildAdminAiLogLink = buildAdminAiLogUrl
export const buildAdminAgentRunLink = buildAdminAgentRunUrl
export const buildAdminAsyncTaskLink = buildAdminAsyncTaskUrl
export const buildAdminPromptRegressionLink = buildAdminPromptRegressionUrl

export const stripTraceRawFields = <T extends RawFieldBag>(value: T): T => {
  const {
    requestPrompt: _requestPrompt,
    responseContent: _responseContent,
    requestBody: _requestBody,
    responseBody: _responseBody,
    rawOutputText: _rawOutputText,
    inputSnapshot: _inputSnapshot,
    inputSnapshotJson: _inputSnapshotJson,
    output: _output,
    outputJson: _outputJson,
    payload: _payload,
    result: _result,
    promptContent: _promptContent,
    ...safe
  } = value
  return safe as T
}

const statusFromValue = (value: unknown, fallback?: boolean | null): TraceNodeStatus => {
  if (fallback) return 'FALLBACK'
  const status = String(value || '').toUpperCase()
  if (['SUCCESS', 'DONE', 'COMPLETED', '1'].includes(status)) return 'SUCCESS'
  if (status.includes('FAIL') || status.includes('ERROR') || status.includes('DEAD')) return 'FAILED'
  if (status.includes('RUN')) return 'RUNNING'
  if (status.includes('PENDING') || status.includes('TODO')) return 'PENDING'
  if (status.includes('SKIP')) return 'SKIPPED'
  return status ? 'UNKNOWN' : 'UNKNOWN'
}

const isFailureStatus = (status: TraceNodeStatus) => status === 'FAILED'

const rawAccess = (params: {
  rawFieldsAvailable?: boolean
  rawFieldsIncluded?: boolean
  rawAccessPermission?: string
  requiredPermission?: string
}): TraceRawAccessStatus => {
  const rawFieldsAvailable = params.rawFieldsAvailable === true
  return {
    state: rawFieldsAvailable ? 'RECORDED_CAN_REQUEST' : 'NOT_RECORDED',
    rawFieldsAvailable,
    rawFieldsIncluded: false,
    rawAccessPermission: params.rawAccessPermission || params.requiredPermission,
    requiredPermission: params.requiredPermission || params.rawAccessPermission
  }
}

const previewRows = (...rows: Array<TracePreviewItem | undefined>) =>
  rows.filter((row): row is TracePreviewItem => Boolean(row && (isFilled(row.value) || isFilled(row.hash) || isFilled(row.length))))

const associationFor = (
  params: TraceCockpitQuery,
  node: {
    traceId?: string
    requestId?: string
    messageId?: string
    bizType?: string
    bizId?: string
    sourceId?: number | string
  },
  fallbackType: TraceAssociationType = 'MODULE_SEED'
): {
  associationType: TraceAssociationType
  associationConfidence: TraceAssociationConfidence
  associationReason: string
} => {
  if (params.traceId && node.traceId && params.traceId === node.traceId) {
    return {
      associationType: 'EXACT_TRACE',
      associationConfidence: 'HIGH',
      associationReason: 'The node carries the same traceId as the query.'
    }
  }
  if (params.requestId && node.requestId && params.requestId === node.requestId) {
    return {
      associationType: 'EXACT_REQUEST',
      associationConfidence: 'HIGH',
      associationReason: 'The node matches the requestId from the query.'
    }
  }
  if (params.agentRunId && node.sourceId && String(params.agentRunId) === String(node.sourceId)) {
    return {
      associationType: 'SAME_AGENT_RUN',
      associationConfidence: 'HIGH',
      associationReason: 'The node matches the requested Agent Run id.'
    }
  }
  if (params.messageId && node.messageId && params.messageId === node.messageId) {
    return {
      associationType: 'SAME_MESSAGE',
      associationConfidence: 'MEDIUM',
      associationReason: 'The node is linked by messageId; treat this as a business association.'
    }
  }
  if (params.bizType && params.bizId && node.bizType === params.bizType && node.bizId === params.bizId) {
    return {
      associationType: 'SAME_BIZ',
      associationConfidence: 'MEDIUM',
      associationReason: 'The node is linked by bizType and bizId, not by a confirmed trace.'
    }
  }
  if (params.businessId) {
    return {
      associationType: 'SAME_BIZ',
      associationConfidence: 'MEDIUM',
      associationReason: 'The node is associated by businessId; confirm in the source module before treating it as a single trace.'
    }
  }
  if (params.startTime || params.endTime || fallbackType === 'TIME_WINDOW') {
    return {
      associationType: 'TIME_WINDOW',
      associationConfidence: 'LOW',
      associationReason: 'The node is associated through the query window and module filters.'
    }
  }
  return {
    associationType: 'MODULE_SEED',
    associationConfidence: 'LOW',
    associationReason: 'The node came from a module-level lookup and is not a confirmed trace edge.'
  }
}

const normalizeModuleStatus = <T>(result: ModuleResult<T>): TraceModuleStatus => ({
  module: result.module,
  moduleName: result.moduleName,
  status: result.error ? 'FAILED' : result.skipped ? 'SKIPPED' : result.records.length ? 'LOADED' : 'EMPTY',
  count: result.error ? null : result.skipped ? null : result.records.length,
  message: result.skipReason,
  errorMessage: result.error ? String((result.error as Error)?.message || result.error) : undefined
})

const aiNode = (input: AiCallLogVO, params: TraceCockpitQuery): TraceNode => {
  const item = stripTraceRawFields(input as unknown as RawFieldBag) as unknown as AiCallLogVO
  const traceId = toStringId(firstFilled(item.traceId, item.traceIdShort, item.shortTraceId))
  const status = statusFromValue(item.status, item.fallback)
  const sourceId = item.id
  const association = associationFor(params, {
    traceId,
    requestId: item.requestId,
    sourceId
  })
  return {
    id: `ai-${sourceId}`,
    nodeType: 'AI_CALL',
    title: item.scene || item.callType || `AI call ${sourceId}`,
    status,
    sourceModule: 'AI_CALL',
    sourceId,
    traceId,
    requestId: item.requestId,
    businessId: item.businessId,
    userId: item.userId,
    occurredAt: item.createdAt,
    preview: item.summary || item.callSummary || item.errorMessage || item.failReason || item.maskedPreview || item.responsePreview || item.requestPreview,
    contentHash: item.responseContentHash || item.requestPromptHash || item.requestBodyHash,
    contentLength: undefined,
    previews: previewRows(
      { label: 'request preview', value: item.requestPreview || item.requestPromptPreview || item.requestBodyPreview, hash: item.requestPromptHash || item.requestBodyHash },
      { label: 'response preview', value: item.responsePreview || item.responseContentPreview || item.responseBodyPreview, hash: item.responseContentHash || item.responseBodyHash },
      { label: 'input variables preview', value: item.inputVariablesPreview, hash: item.inputVariablesHash }
    ),
    rawAccess: rawAccess({
      rawFieldsAvailable: item.rawFieldsAvailable,
      rawFieldsIncluded: item.rawFieldsIncluded,
      rawAccessPermission: item.rawAccessPermission,
      requiredPermission: 'admin:ai:log:raw:view'
    }),
    ...association,
    links: [
      { label: 'AI log', to: buildAdminAiLogUrl({ traceId, requestId: item.requestId, businessId: item.businessId, id: sourceId }) },
      ...(item.promptTemplateId ? [{ label: 'Prompt regression', to: buildAdminPromptRegressionUrl({ promptTemplateId: item.promptTemplateId, traceId }) }] : [])
    ],
    meta: {
      scene: item.scene || item.callType,
      provider: item.provider,
      modelName: item.modelName,
      resultSource: item.resultSource,
      fallback: item.fallback,
      elapsedMs: item.elapsedMs || item.latencyMs || item.costTimeMs,
      totalTokens: item.totalTokens,
      promptTemplateId: item.promptTemplateId,
      promptTemplateVersionId: item.promptTemplateVersionId
    }
  }
}

const agentNode = (input: AdminAgentRunDetailVO, params: TraceCockpitQuery): TraceNode => {
  const item = stripTraceRawFields(input as unknown as RawFieldBag) as unknown as AdminAgentRunDetailVO
  const sourceId = item.id
  const association = associationFor(params, {
    traceId: item.traceId,
    sourceId
  })
  return {
    id: `agent-${sourceId}`,
    nodeType: 'AGENT_RUN',
    title: item.agentType || `Agent Run ${sourceId}`,
    status: statusFromValue(item.status, item.fallback),
    sourceModule: 'AGENT_RUN',
    sourceId,
    traceId: item.traceId,
    userId: item.userId,
    occurredAt: item.startedAt || item.createdAt,
    preview: item.summary || item.errorMessage || item.resultSourceLabel || undefined,
    contentHash: undefined,
    contentLength: undefined,
    previews: previewRows({ label: 'run summary', value: item.summary || item.resultSourceLabel || undefined }),
    rawAccess: rawAccess({
      rawFieldsAvailable: item.rawAvailable,
      rawFieldsIncluded: false,
      rawAccessPermission: item.rawAccessPermission,
      requiredPermission: 'admin:ai:log:raw:view'
    }),
    ...association,
    links: [{ label: 'Agent Run', to: buildAdminAgentRunUrl({ traceId: item.traceId, runId: sourceId }) }],
    meta: {
      agentType: item.agentType,
      triggerType: item.triggerType,
      resultSource: item.resultSource,
      fallback: item.fallback,
      durationMs: item.durationMs,
      promptVersionId: item.promptVersionId,
      aiCallLogId: item.aiCallLogId,
      taskCount: item.tasks?.length
    }
  }
}

const taskNode = (input: AsyncTaskVO, params: TraceCockpitQuery): TraceNode => {
  const item = stripTraceRawFields(input as unknown as RawFieldBag) as unknown as AsyncTaskVO
  const sourceId = item.id
  const messageId = item.messageId || item.taskId
  const association = associationFor(
    params,
    {
      traceId: item.traceId,
      messageId,
      bizType: item.bizType,
      bizId: item.bizId,
      sourceId
    },
    messageId ? 'SAME_MESSAGE' : 'SAME_BIZ'
  )
  return {
    id: `task-${sourceId}`,
    nodeType: 'ASYNC_TASK',
    title: item.taskName || item.taskType || `Async task ${sourceId}`,
    status: statusFromValue(item.status),
    sourceModule: 'ASYNC_TASK',
    sourceId,
    traceId: item.traceId,
    messageId,
    bizType: item.bizType,
    bizId: item.bizId,
    userId: item.userId,
    occurredAt: item.createdAt || item.updatedAt,
    preview: item.errorMessage || item.resultPreview || item.payloadPreview,
    contentHash: item.resultHash || item.payloadHash,
    contentLength: undefined,
    previews: previewRows(
      { label: 'task preview', value: item.payloadPreview, hash: item.payloadHash },
      { label: 'result preview', value: item.resultPreview, hash: item.resultHash }
    ),
    rawAccess: rawAccess({
      rawFieldsAvailable: item.rawFieldsAvailable,
      rawFieldsIncluded: false,
      requiredPermission: 'Task center preview only in MVP-A'
    }),
    ...association,
    links: [
      {
        label: 'Async task',
        to: buildAdminAsyncTaskUrl({
          traceId: item.traceId,
          messageId,
          bizType: item.bizType,
          bizId: item.bizId,
          taskId: sourceId
        })
      }
    ],
    meta: {
      taskType: item.taskType,
      status: item.status,
      retryCount: item.retryCount,
      maxRetryCount: item.maxRetryCount,
      deadLetter: Boolean(item.deadLetter)
    }
  }
}

const sortNodes = (nodes: TraceNode[]) =>
  [...nodes].sort((left, right) => {
    const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : Number.MAX_SAFE_INTEGER
    const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : Number.MAX_SAFE_INTEGER
    if (leftTime !== rightTime) return leftTime - rightTime
    return left.id.localeCompare(right.id)
  })

const loadModule = async <T>(module: TraceModuleKey, moduleName: string, loader: () => Promise<T[]>): Promise<ModuleResult<T>> => {
  try {
    return { module, moduleName, records: await loader() }
  } catch (error) {
    return { module, moduleName, records: [], error }
  }
}

const loadAiLogs = async (params: TraceCockpitQuery) => {
  if (!hasSearchSeed(params)) return []
  const page = await getAdminAiLogsApi({
    pageNo: 1,
    pageSize: 20,
    traceId: params.traceId,
    requestId: params.requestId,
    businessId: params.businessId,
    userId: params.userId,
    scene: params.scene || '',
    startTime: params.startTime,
    endTime: params.endTime
  })
  return page.records || []
}

const loadAgentRuns = async (params: TraceCockpitQuery) => {
  if (params.agentRunId) return asArray(await getAdminAgentRunDetailApi(Number(params.agentRunId)))
  if (!params.traceId && !params.userId) return []
  const page = await getAdminAgentRunsApi({
    pageNo: 1,
    pageSize: 20,
    traceId: params.traceId,
    userId: params.userId,
    startTime: params.startTime,
    endTime: params.endTime
  })
  return page.records || []
}

const loadAsyncTasks = async (params: TraceCockpitQuery) => {
  if (params.asyncTaskId) return asArray(await getAdminTaskDetailApi(Number(params.asyncTaskId)))
  if (params.messageId) return asArray(await getAdminTaskByMessageIdApi(params.messageId))
  if (params.traceId) return getAdminTasksByTraceApi({ traceId: params.traceId, limit: 20 })
  if (params.bizType && params.bizId) {
    return getAdminTasksByBizApi({
      bizType: params.bizType,
      bizId: params.bizId,
      userId: params.userId,
      limit: 20
    })
  }
  return []
}

const hasSearchSeed = (params: TraceCockpitQuery) =>
  Boolean(
    params.traceId ||
    params.requestId ||
    params.businessId ||
    params.bizId ||
    params.userId ||
    params.agentRunId ||
    params.asyncTaskId ||
    params.messageId ||
    params.scene ||
    params.startTime ||
    params.endTime
  )

const collectTraceIds = (nodes: TraceNode[]) =>
  Array.from(new Set(nodes.map((node) => node.traceId).filter(Boolean) as string[]))

const buildModuleStatuses = (results: Array<ModuleResult<unknown>>) => results.map(normalizeModuleStatus)

const buildSuggestions = (nodes: TraceNode[]): TraceGovernanceSuggestion[] => {
  const suggestions: TraceGovernanceSuggestion[] = []
  const failedNode = nodes.find((node) => isFailureStatus(node.status))
  if (failedNode) {
    suggestions.push({
      id: 'view-failed-source',
      actionType: failedNode.nodeType === 'ASYNC_TASK' ? 'VIEW_ASYNC_TASK' : failedNode.nodeType === 'AGENT_RUN' ? 'VIEW_AGENT_RUN' : 'VIEW_AI_LOG',
      title: 'Inspect failed source record',
      reason: 'A failed node is present. Open the source page to inspect existing diagnostics before taking action.',
      riskLevel: 'MEDIUM',
      nodeId: failedNode.id,
      targetType: failedNode.nodeType,
      targetId: failedNode.sourceId,
      link: failedNode.links[0]?.to,
      executableInCockpit: false
    })
  }

  const fallbackNode = nodes.find((node) => node.status === 'FALLBACK' || node.meta.fallback === true)
  if (fallbackNode) {
    suggestions.push({
      id: 'check-fallback-route',
      actionType: 'CHECK_MODEL_ROUTE',
      title: 'Check model route and fallback context',
      reason: 'Fallback appeared in this sample. Treat it as a clue and inspect the source module rather than changing routes here.',
      riskLevel: 'LOW',
      nodeId: fallbackNode.id,
      targetType: fallbackNode.nodeType,
      targetId: fallbackNode.sourceId,
      link: fallbackNode.links[0]?.to,
      executableInCockpit: false
    })
  }

  const promptNode = nodes.find((node) => node.meta.promptTemplateId)
  if (promptNode) {
    suggestions.push({
      id: 'prompt-regression-candidate',
      actionType: 'CREATE_PROMPT_REGRESSION_CANDIDATE',
      title: 'Open Prompt regression with template context',
      reason: 'The trace has prompt template context. MVP-A only opens the existing regression page; it does not create or run a case.',
      riskLevel: 'INFO',
      nodeId: promptNode.id,
      targetType: 'PROMPT_REGRESSION',
      targetId: promptNode.meta.promptTemplateId as number,
      link: buildAdminPromptRegressionUrl({
        promptTemplateId: promptNode.meta.promptTemplateId as number,
        traceId: promptNode.traceId
      }),
      executableInCockpit: false
    })
  }

  const rawNode = nodes.find((node) => node.rawAccess.rawFieldsAvailable)
  if (rawNode) {
    suggestions.push({
      id: 'review-sensitive-access',
      actionType: 'REVIEW_RAW_PERMISSION',
      title: 'Review sensitive access boundary',
      reason: 'Sensitive source material is recorded for at least one node. TraceCockpit only shows availability and permission hints.',
      riskLevel: 'INFO',
      nodeId: rawNode.id,
      targetType: rawNode.nodeType,
      targetId: rawNode.sourceId,
      link: rawNode.links[0]?.to,
      executableInCockpit: false,
      requiredPermission: rawNode.rawAccess.requiredPermission || rawNode.rawAccess.rawAccessPermission
    })
  }

  return suggestions
}

const buildRisks = (nodes: TraceNode[], moduleStatuses: TraceModuleStatus[]) => {
  const risks = []
  if (moduleStatuses.some((item) => item.status === 'FAILED')) {
    risks.push({
      id: 'partial-result',
      type: 'PARTIAL_RESULT' as const,
      level: 'MEDIUM' as const,
      title: 'Partial result',
      description: 'At least one source module failed. Counts from that module are displayed as unavailable, not zero.'
    })
  }
  nodes.filter((node) => node.associationConfidence === 'LOW').forEach((node) => {
    risks.push({
      id: `weak-${node.id}`,
      type: 'WEAK_ASSOCIATION' as const,
      level: 'LOW' as const,
      title: 'Weak association',
      description: node.associationReason,
      nodeId: node.id,
      link: node.links[0]?.to
    })
  })
  return risks
}

const buildOverview = (params: TraceCockpitQuery, nodes: TraceNode[], moduleStatuses: TraceModuleStatus[]) => {
  const traceIds = collectTraceIds(nodes)
  const timestamps = nodes.map((node) => node.occurredAt).filter(Boolean) as string[]
  const partialResult = moduleStatuses.some((item) => item.status === 'FAILED')
  const failedCount = nodes.filter((node) => isFailureStatus(node.status)).length
  return {
    queryId: String(firstFilled(params.traceId, params.requestId, params.businessId, params.messageId, params.keyword) || ''),
    resolvedLookupType: params.lookupType || 'auto',
    primaryTraceId: traceIds[0],
    traceIds,
    sampleCount: nodes.length,
    firstSeenAt: timestamps[0],
    lastSeenAt: timestamps[timestamps.length - 1],
    aiCallCount: moduleStatuses.find((item) => item.module === 'AI_CALL')?.count,
    agentRunCount: moduleStatuses.find((item) => item.module === 'AGENT_RUN')?.count,
    asyncTaskCount: moduleStatuses.find((item) => item.module === 'ASYNC_TASK')?.count,
    failedCount,
    fallbackCount: nodes.filter((node) => node.status === 'FALLBACK' || node.meta.fallback === true).length,
    totalTokens: nodes.reduce((sum, node) => sum + Number(node.meta.totalTokens || 0), 0) || null,
    maxElapsedMs: nodes.reduce((max, node) => Math.max(max, Number(node.meta.elapsedMs || node.meta.durationMs || 0)), 0) || null,
    rawFieldsAvailable: nodes.some((node) => node.rawAccess.rawFieldsAvailable),
    rawFieldsIncluded: false as const,
    rawAccessPermission: nodes.find((node) => node.rawAccess.rawAccessPermission)?.rawAccess.rawAccessPermission,
    healthStatus: partialResult ? 'PARTIAL' as const : failedCount ? 'FAILED' as const : nodes.length ? 'SUCCESS' as const : 'UNKNOWN' as const,
    partialResult,
    moduleStatuses
  }
}

export const getTraceCockpitResultApi = async (params: TraceCockpitQuery): Promise<TraceCockpitResult> => {
  const normalizedParams = normalizeTraceQuery(params)
  const settled = await Promise.allSettled([
    loadModule('AI_CALL', 'AI logs', () => loadAiLogs(normalizedParams)),
    loadModule('AGENT_RUN', 'Agent runs', () => loadAgentRuns(normalizedParams)),
    loadModule('ASYNC_TASK', 'Async tasks', () => loadAsyncTasks(normalizedParams))
  ])

  const results = settled.map((item, index): ModuleResult<unknown> => {
    if (item.status === 'fulfilled') return item.value
    const fallbackModules: Array<Pick<ModuleResult<unknown>, 'module' | 'moduleName'>> = [
      { module: 'AI_CALL', moduleName: 'AI logs' },
      { module: 'AGENT_RUN', moduleName: 'Agent runs' },
      { module: 'ASYNC_TASK', moduleName: 'Async tasks' }
    ]
    return { ...fallbackModules[index], records: [], error: item.reason }
  })

  const ai = results[0] as ModuleResult<AiCallLogVO>
  const agent = results[1] as ModuleResult<AdminAgentRunDetailVO>
  const task = results[2] as ModuleResult<AsyncTaskVO>
  const moduleStatuses = buildModuleStatuses(results)
  const nodes = sortNodes([
    ...ai.records.map((record) => aiNode(record, normalizedParams)),
    ...agent.records.map((record) => agentNode(record, normalizedParams)),
    ...task.records.map((record) => taskNode(record, normalizedParams))
  ])
  const suggestions = buildSuggestions(nodes)
  const risks = buildRisks(nodes, moduleStatuses)

  return {
    overview: buildOverview(normalizedParams, nodes, moduleStatuses),
    moduleStatuses,
    timeline: {
      nodes,
      unplacedNodes: []
    },
    nodes,
    risks,
    suggestions
  }
}

export const getAdminTraceCockpitApi = getTraceCockpitResultApi

export const normalizeTraceQuery = (params: TraceCockpitQuery): TraceCockpitQuery => {
  const keyword = params.keyword?.trim()
  const lookupType = params.lookupType || 'auto'
  const next: TraceCockpitQuery = {
    ...params,
    lookupType,
    keyword: keyword || undefined,
    userId: toNumber(params.userId),
    agentRunId: toNumber(params.agentRunId),
    asyncTaskId: toNumber(params.asyncTaskId)
  }

  if (!keyword || lookupType === 'auto') return compactQueryParams(next) as TraceCockpitQuery
  if (lookupType === 'traceId') next.traceId ||= keyword
  if (lookupType === 'requestId') next.requestId ||= keyword
  if (lookupType === 'businessId') next.businessId ||= keyword
  if (lookupType === 'biz') next.bizId ||= keyword
  if (lookupType === 'agentRunId') next.agentRunId ||= toNumber(keyword)
  if (lookupType === 'asyncTaskId') next.asyncTaskId ||= toNumber(keyword)
  if (lookupType === 'messageId') next.messageId ||= keyword
  if (lookupType === 'userTime') next.userId ||= toNumber(keyword)
  return compactQueryParams(next) as TraceCockpitQuery
}
