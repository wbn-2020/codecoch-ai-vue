import type { RouteLocationRaw } from 'vue-router'
import type { PageQuery } from '@/types/api'

export type TraceLookupType =
  | 'auto'
  | 'traceId'
  | 'requestId'
  | 'businessId'
  | 'biz'
  | 'userTime'
  | 'agentRunId'
  | 'asyncTaskId'
  | 'messageId'

export interface TraceCockpitQuery extends PageQuery {
  keyword?: string
  lookupType?: TraceLookupType
  traceId?: string
  requestId?: string
  businessId?: string
  bizType?: string
  bizId?: string
  userId?: number
  agentRunId?: number
  asyncTaskId?: number
  messageId?: string
  scene?: string
  startTime?: string
  endTime?: string
  strictTraceOnly?: boolean
}

export type TraceModuleKey = 'AI_CALL' | 'AGENT_RUN' | 'ASYNC_TASK'
export type TraceModuleStatusCode = 'LOADED' | 'EMPTY' | 'FAILED' | 'SKIPPED'

export interface TraceModuleStatus {
  module: TraceModuleKey
  moduleName: string
  status: TraceModuleStatusCode
  count?: number | null
  message?: string
  errorMessage?: string
}

export type TraceNodeType = 'AI_CALL' | 'AGENT_RUN' | 'AGENT_TASK' | 'ASYNC_TASK'
export type TraceNodeStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'FALLBACK' | 'RUNNING' | 'PENDING' | 'SKIPPED' | 'UNKNOWN' | 'SENSITIVE'
export type TraceAssociationType = 'EXACT_TRACE' | 'EXACT_REQUEST' | 'SAME_AGENT_RUN' | 'SAME_MESSAGE' | 'SAME_BIZ' | 'TIME_WINDOW' | 'MODULE_SEED'
export type TraceAssociationConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type TraceRawAccessState = 'NOT_RECORDED' | 'RECORDED_NO_PERMISSION' | 'RECORDED_CAN_REQUEST' | 'LOADING' | 'FAILED' | 'SHOWN_TEMPORARILY' | 'UNKNOWN'

export interface TraceRawAccessStatus {
  state: TraceRawAccessState
  rawFieldsAvailable: boolean
  rawFieldsIncluded: boolean
  rawAccessPermission?: string
  requiredPermission?: string
}

export interface TracePreviewItem {
  label: string
  value?: string
  hash?: string
  length?: number
}

export interface TraceNode {
  id: string
  nodeType: TraceNodeType
  title: string
  status: TraceNodeStatus
  sourceModule: TraceModuleKey | 'AGENT_TASK'
  sourceId?: string | number
  traceId?: string
  requestId?: string
  businessId?: string
  bizType?: string
  bizId?: string
  messageId?: string
  userId?: number
  occurredAt?: string
  preview?: string
  contentHash?: string
  contentLength?: number
  previews: TracePreviewItem[]
  rawAccess: TraceRawAccessStatus
  associationType: TraceAssociationType
  associationConfidence: TraceAssociationConfidence
  associationReason: string
  links: Array<{ label: string; to: RouteLocationRaw }>
  meta: Record<string, string | number | boolean | null | undefined>
}

export interface TraceTimeline {
  nodes: TraceNode[]
  unplacedNodes: TraceNode[]
}

export interface TraceOverview {
  queryId: string
  resolvedLookupType: TraceLookupType
  primaryTraceId?: string
  traceIds: string[]
  sampleCount: number
  firstSeenAt?: string
  lastSeenAt?: string
  aiCallCount?: number | null
  agentRunCount?: number | null
  asyncTaskCount?: number | null
  failedCount?: number | null
  fallbackCount?: number | null
  totalTokens?: number | null
  maxElapsedMs?: number | null
  rawFieldsAvailable: boolean
  rawFieldsIncluded: false
  rawAccessPermission?: string
  healthStatus: TraceNodeStatus
  partialResult: boolean
  moduleStatuses: TraceModuleStatus[]
}

export type TraceRiskLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH'
export type TraceRiskType = 'AI_FAILURE' | 'FALLBACK' | 'HIGH_LATENCY' | 'HIGH_TOKEN' | 'ASYNC_TASK_FAILURE' | 'AGENT_FAILURE' | 'RAW_AVAILABLE' | 'PARTIAL_RESULT' | 'WEAK_ASSOCIATION'

export interface TraceRisk {
  id: string
  type: TraceRiskType
  level: TraceRiskLevel
  title: string
  description: string
  nodeId?: string
  link?: RouteLocationRaw
}

export type TraceGovernanceActionType = 'VIEW_AI_LOG' | 'CREATE_PROMPT_REGRESSION_CANDIDATE' | 'CHECK_MODEL_ROUTE' | 'VIEW_AGENT_RUN' | 'VIEW_ASYNC_TASK' | 'VIEW_RETRY_PREVIEW' | 'REVIEW_RAW_PERMISSION'

export interface TraceGovernanceSuggestion {
  id: string
  actionType: TraceGovernanceActionType
  title: string
  reason: string
  riskLevel: TraceRiskLevel
  nodeId?: string
  targetType?: TraceNodeType | 'PROMPT_REGRESSION'
  targetId?: string | number
  link?: RouteLocationRaw
  executableInCockpit: false
  requiredPermission?: string
}

export interface TraceCockpitResult {
  overview: TraceOverview
  moduleStatuses: TraceModuleStatus[]
  timeline: TraceTimeline
  nodes: TraceNode[]
  risks: TraceRisk[]
  suggestions: TraceGovernanceSuggestion[]
}

export type TraceCockpitOverview = TraceOverview
