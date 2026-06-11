import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import { compactQueryParams, normalizePageResult } from '@/utils/page'
import { buildSseUrl, streamSse, type StreamSseHandle } from '@/utils/sse'
import { toFriendlyMessage } from '@/utils/error'

export interface AgentReviewVO {
  id: number
  targetJobId?: number
  reviewDate?: string
  summary?: string
  doneCount?: number
  skippedCount?: number
  todoCount?: number
  completionRate?: number
  readinessScore?: number
  nextActions?: string[]
  agentRunId?: number
  createdAt?: string
}

export interface GrowthOverviewVO {
  readinessScore?: number
  taskCompletionRate?: number
  agentSuccessRate?: number
  totalReviewCount?: number
  totalMemoryCount?: number
  topSkills?: Array<{ name: string; value: number }>
}

export interface SkillGrowthSnapshotVO {
  id: number
  snapshotDate?: string
  skillCode?: string
  skillName?: string
  score?: number
  taskCount?: number
  doneCount?: number
}

export interface ReadinessScoreRecordVO {
  id: number
  targetJobId?: number
  scoreDate?: string
  score?: number
  taskCompletionRate?: number
  agentSuccessRate?: number
}

export interface AgentMemoryVO {
  id: number
  memoryType?: string
  content?: string
  sourceType?: string
  sourceId?: number
  confidence?: number
  enabled?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeVersionVO {
  id: number
  resumeId?: number
  versionNo?: number
  versionName?: string
  sourceType?: string
  sourceId?: number
  currentFlag?: number
  snapshot?: Record<string, unknown>
  createdAt?: string
}

export interface ResumeVersionCopyDTO {
  versionName?: string
}

export interface ResumeVersionDiffVO {
  resumeId?: number
  versionId?: number
  sourceVersionId?: number
  targetVersionId?: number
  sourceLabel?: string
  targetLabel?: string
  fields?: Array<{
    field: string
    currentValue?: unknown
    versionValue?: unknown
    sourceValue?: unknown
    targetValue?: unknown
    changed?: boolean
  }>
}

export interface ResumeApplyAiSuggestionDTO {
  optimizeRecordId?: number
  suggestionType?: string
  status?: string
  note?: string
}

export interface ResumeSuggestionAdoptionVO extends ResumeApplyAiSuggestionDTO {
  id: number
  resumeId?: number
  resumeVersionId?: number
  createdAt?: string
  updatedAt?: string
}

export interface JobApplicationVO {
  id: number
  targetJobId?: number
  resumeVersionId?: number
  companyName?: string
  jobTitle?: string
  source?: string
  status?: string
  appliedAt?: string
  nextFollowUpAt?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export interface JobApplicationEventVO {
  id: number
  applicationId?: number
  eventType?: string
  eventTime?: string
  summary?: string
  review?: Record<string, unknown>
  reviewJson?: string
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeDocumentVO {
  id: number
  title?: string
  documentType?: string
  status?: string
  normalizationVersion?: string
  chunkCount?: number
  duplicateChunkCount?: number
  nearDuplicateChunkCount?: number
  nearDuplicateThreshold?: number
  duplicateDocumentId?: number
  duplicateDocument?: boolean
  content?: string
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeDocumentOptionVO {
  id: number
  title?: string
  documentType?: string
  status?: string
}

export interface KnowledgeDocumentVersionVO {
  id: number
  documentId?: number
  versionNo?: number
  title?: string
  documentType?: string
  content?: string
  contentHash?: string
  normalizationVersion?: string
  chunkCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeDocumentCreateDTO {
  title: string
  documentType?: string
  content: string
}

export interface KnowledgeChunkVO {
  id: number
  documentId?: number
  chunkIndex?: number
  content?: string
  chunkHash?: string
  normalizationVersion?: string
  sourceRef?: string
  embeddingModel?: string
  embeddingDimension?: number
  indexedAt?: string
  indexStatus?: string
  lastError?: string
  duplicateInDocument?: boolean
  cleanupCandidate?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeStatsVO {
  documentCount?: number
  chunkCount?: number
  duplicateChunkCount?: number
  vectorEnabled?: boolean
  embeddingEnabled?: boolean
  semanticEnabled?: boolean
  embeddingDisabledReason?: string
  retrievalMode?: string
  chunkStrategy?: string
  documentTypeCounts?: Record<string, number>
  indexStatusCounts?: Record<string, number>
  embeddingModelCounts?: Record<string, number>
  duplicateTypeCounts?: Record<string, number>
  duplicateDocumentHotspots?: KnowledgeDuplicateDocumentHotspotVO[]
}

export interface KnowledgeDuplicateDocumentHotspotVO {
  documentId?: number
  title?: string
  documentType?: string
  duplicateChunkCount?: number
  chunkCount?: number
  duplicateRatio?: number
}

export interface KnowledgeConfigVO {
  vectorEnabled?: boolean
  embeddingEnabled?: boolean
  semanticEnabled?: boolean
  embeddingDisabledReason?: string
  vectorCollection?: string
  retrievalMode?: string
  normalizationVersion?: string
  chunkStrategy?: string
  chunkSize?: number
  chunkOverlap?: number
  minChunkSize?: number
  nearDuplicateThreshold?: number
  askMinScore?: number
  uploadMaxBytes?: number
  uploadMaxTextChars?: number
  uploadExtensions?: string[]
  exactDedupScope?: string
  nearDuplicateAction?: string
}

export interface KnowledgeSearchResultVO {
  documentId?: number
  chunkId?: number
  chunkIndex?: number
  title?: string
  documentType?: string
  snippet?: string
  highlightedSnippet?: string
  matchedTerms?: string[]
  sourceRef?: string
  chunkHash?: string
  embeddingModel?: string
  embeddingDimension?: number
  indexedAt?: string
  indexStatus?: string
  score?: number
  matchType?: string
}

export interface KnowledgeSearchTraceVO {
  query?: string
  expandedTerms?: string[]
  limit?: number
  recallLimit?: number
  minScore?: number
  documentId?: number
  documentType?: string
  vectorEnabled?: boolean
  retrievalMode?: string
  vectorCandidateCount?: number
  keywordCandidateCount?: number
  mergedCandidateCount?: number
  filteredCandidateCount?: number
  finalCandidateCount?: number
  vectorCandidates?: KnowledgeSearchResultVO[]
  keywordCandidates?: KnowledgeSearchResultVO[]
  mergedCandidates?: KnowledgeSearchResultVO[]
  finalResults?: KnowledgeSearchResultVO[]
  warnings?: string[]
  generatedAt?: string
}

export interface KnowledgeDuplicateReviewItemVO {
  documentId?: number
  chunkId?: number
  title?: string
  documentType?: string
  chunkIndex?: number
  sourceRef?: string
  snippet?: string
  topScore?: number
  matches?: KnowledgeSearchResultVO[]
}

export interface KnowledgeDuplicateReviewVO {
  vectorEnabled?: boolean
  threshold?: number
  scannedChunkCount?: number
  candidateCount?: number
  limit?: number
  items?: KnowledgeDuplicateReviewItemVO[]
  generatedAt?: string
}

export interface KnowledgeExactDuplicateGroupVO {
  chunkHash?: string
  duplicateCount?: number
  chunks?: KnowledgeChunkVO[]
}

export interface KnowledgeDuplicateCleanupVO {
  dryRun?: boolean
  duplicateGroupCount?: number
  deleteCandidateCount?: number
  deletedCount?: number
  deletedChunkIds?: number[]
  generatedAt?: string
}

export interface KnowledgeAskVO {
  question?: string
  answer?: string
  references?: KnowledgeSearchResultVO[]
  referenceCount?: number
  topReferenceScore?: number
  insufficientReferences?: boolean
  answerGrounded?: boolean
  citationValid?: boolean
  citationWarning?: string
  citedReferenceNumbers?: number[]
  invalidReferenceNumbers?: number[]
  unsupportedSentences?: string[]
  minReferenceScore?: number
  aiCallLogId?: number
  generatedAt?: string
}

export interface KnowledgeVectorRebuildVO {
  vectorEnabled?: boolean
  embeddingEnabled?: boolean
  semanticEnabled?: boolean
  embeddingDisabledReason?: string
  documentCount?: number
  chunkCount?: number
  vectorUpdated?: number
  vectorDeleted?: number
  duplicateChunkCount?: number
  failedDocuments?: number[]
  errors?: string[]
  jobId?: number
  vectorJobId?: number
  vectorJobType?: string
  vectorScopeType?: string
  vectorScopeId?: string
  vectorJobStatus?: string
}

export interface KnowledgeEvaluationSampleDTO {
  caseId?: string
  query?: string
  expectedDocumentId?: number
  expectedDocumentTitle?: string
  expectedDocumentType?: string
  retrievalDocumentId?: number
  retrievalDocumentType?: string
  expectNoAnswer?: boolean
  note?: string
}

export interface KnowledgeEvaluationDTO {
  samples?: KnowledgeEvaluationSampleDTO[]
  limit?: number
  minScore?: number
}

export interface KnowledgeEvaluationItemVO {
  caseId?: string
  query?: string
  expectedDocumentId?: number
  expectedDocumentTitle?: string
  expectedDocumentType?: string
  retrievalDocumentId?: number
  retrievalDocumentType?: string
  expectNoAnswer?: boolean
  passed?: boolean
  topDocumentId?: number
  topTitle?: string
  topDocumentType?: string
  topScore?: number
  referenceCount?: number
  citationValid?: boolean
  answerGrounded?: boolean
  answerExcerpt?: string
  citationWarning?: string
  failureReason?: string
  note?: string
  references?: KnowledgeSearchResultVO[]
}

export interface KnowledgeEvaluationVO {
  sampleCount?: number
  evaluatedCount?: number
  passedCount?: number
  failedCount?: number
  passRate?: number
  limit?: number
  minScore?: number
  items?: KnowledgeEvaluationItemVO[]

}
export interface KnowledgeEvalCaseQueryDTO {
  keyword?: string
  expectedDocumentId?: number
  expectedDocumentType?: string
  expectNoAnswer?: boolean
  enabled?: number
  pageNo?: number
  pageSize?: number
}

export interface KnowledgeEvalCaseSaveDTO {
  id?: number
  caseId?: string
  query?: string
  expectedDocumentId?: number
  expectedDocumentTitle?: string
  expectedDocumentType?: string
  retrievalDocumentId?: number
  retrievalDocumentType?: string
  expectNoAnswer?: boolean
  note?: string
  enabled?: number
}

export interface KnowledgeEvalRunRequestDTO {
  caseIds?: number[]
  onlyEnabled?: boolean
  caseLimit?: number
  limit?: number
  minScore?: number
}

export interface KnowledgeEvalCaseVO {
  id: number
  caseId?: string
  query?: string
  expectedDocumentId?: number
  expectedDocumentTitle?: string
  expectedDocumentType?: string
  retrievalDocumentId?: number
  retrievalDocumentType?: string
  expectNoAnswer?: boolean
  note?: string
  enabled?: number
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeEvalRunResultVO {
  id?: number
  evalCaseId?: number
  caseId?: string
  query?: string
  expectedDocumentId?: number
  expectedDocumentTitle?: string
  expectedDocumentType?: string
  retrievalDocumentId?: number
  retrievalDocumentType?: string
  expectNoAnswer?: boolean
  passed?: boolean
  topDocumentId?: number
  topTitle?: string
  topDocumentType?: string
  topScore?: number
  referenceCount?: number
  citationValid?: boolean
  answerGrounded?: boolean
  answerExcerpt?: string
  citationWarning?: string
  failureReason?: string
  note?: string
  references?: KnowledgeSearchResultVO[]
  createdAt?: string
}

export interface KnowledgeEvalRunVO {
  id: number
  runNo?: string
  status?: string
  sampleCount?: number
  evaluatedCount?: number
  passedCount?: number
  failedCount?: number
  passRate?: number
  limit?: number
  minScore?: number
  startedAt?: string
  finishedAt?: string
  errorMessage?: string
  results?: KnowledgeEvalRunResultVO[]
  createdAt?: string
  updatedAt?: string
}

export const generateAgentReviewApi = (data?: { targetJobId?: number; date?: string }) =>
  request.post<AgentReviewVO, AgentReviewVO>('/agent/job-coach/review', data || {})

export const getAgentReviewsApi = (params?: { targetJobId?: number }) =>
  request.get<AgentReviewVO[], AgentReviewVO[]>('/agent/reviews', { params: compactQueryParams(params) }).then((data) => data || [])

export const getGrowthOverviewApi = () =>
  request.get<GrowthOverviewVO, GrowthOverviewVO>('/agent/growth/profile/overview')

export const getGrowthProfileOverviewApi = getGrowthOverviewApi

export const getGrowthSkillsTrendApi = (params?: { days?: number }) =>
  request
    .get<SkillGrowthSnapshotVO[], SkillGrowthSnapshotVO[]>('/agent/growth/skills/trend', { params: compactQueryParams(params) })
    .then((data) => data || [])

export const getGrowthReadinessTrendApi = (params?: { days?: number }) =>
  request
    .get<ReadinessScoreRecordVO[], ReadinessScoreRecordVO[]>('/agent/growth/readiness/trend', { params: compactQueryParams(params) })
    .then((data) => data || [])

export const getAgentMemoriesApi = (params?: { pageNo?: number; pageSize?: number; memoryType?: string; enabled?: number }) =>
  request
    .get<PageResult<AgentMemoryVO> | AgentMemoryVO[], PageResult<AgentMemoryVO> | AgentMemoryVO[]>('/agent/memories', { params: compactQueryParams(params) })
    .then((result) => normalizePageResult(result, params))

export const createAgentMemoryApi = (data: Partial<AgentMemoryVO>) =>
  request.post<AgentMemoryVO, AgentMemoryVO>('/agent/memories', data)

export const enableAgentMemoryApi = (id: number) => request.post<AgentMemoryVO, AgentMemoryVO>(`/agent/memories/${id}/enable`)
export const disableAgentMemoryApi = (id: number) => request.post<AgentMemoryVO, AgentMemoryVO>(`/agent/memories/${id}/disable`)
export const deleteAgentMemoryApi = (id: number) => request.delete<void, void>(`/agent/memories/${id}`)

export const createResumeVersionApi = (resumeId: number, data?: { versionName?: string; sourceType?: string; sourceId?: number }) =>
  request.post<ResumeVersionVO, ResumeVersionVO>(`/resumes/${resumeId}/versions`, data || {})

export const getResumeVersionsApi = (resumeId: number) =>
  request.get<ResumeVersionVO[], ResumeVersionVO[]>(`/resumes/${resumeId}/versions`).then((data) => data || [])

export const copyResumeVersionApi = (resumeId: number, versionId: number, data?: ResumeVersionCopyDTO) =>
  request.post<ResumeVersionVO, ResumeVersionVO>(`/resumes/${resumeId}/versions/${versionId}/copy`, data || {})

export const getResumeVersionDetailApi = (versionId: number) =>
  request.get<ResumeVersionVO, ResumeVersionVO>(`/resume-versions/${versionId}`)

export const getResumeVersionDiffApi = (resumeId: number, versionId: number) =>
  request.get<ResumeVersionDiffVO, ResumeVersionDiffVO>(`/resumes/${resumeId}/versions/${versionId}/diff`)

export const getResumeVersionsPairDiffApi = (sourceVersionId: number, targetVersionId: number) =>
  request.get<ResumeVersionDiffVO, ResumeVersionDiffVO>(`/resume-versions/${sourceVersionId}/diff/${targetVersionId}`)

export const rollbackResumeVersionApi = (resumeId: number, versionId: number) =>
  request.post<ResumeVersionVO, ResumeVersionVO>(`/resumes/${resumeId}/versions/${versionId}/rollback`)

export const applyResumeVersionSuggestionApi = (versionId: number, data?: ResumeApplyAiSuggestionDTO) =>
  request.post<ResumeSuggestionAdoptionVO, ResumeSuggestionAdoptionVO>(`/resume-versions/${versionId}/apply-ai-suggestion`, data || {})

export const getApplicationsApi = (params?: { status?: string }) =>
  request.get<JobApplicationVO[], JobApplicationVO[]>('/applications', { params: compactQueryParams(params) }).then((data) => data || [])

export const createApplicationApi = (data: Partial<JobApplicationVO>) =>
  request.post<JobApplicationVO, JobApplicationVO>('/applications', data)

export const updateApplicationApi = (id: number, data: Partial<JobApplicationVO>) =>
  request.put<JobApplicationVO, JobApplicationVO>(`/applications/${id}`, data)

export const getApplicationEventsApi = (id: number) =>
  request.get<JobApplicationEventVO[], JobApplicationEventVO[]>(`/applications/${id}/events`).then((data) => data || [])

export const createApplicationEventApi = (id: number, data: Partial<JobApplicationEventVO>) =>
  request.post<JobApplicationEventVO, JobApplicationEventVO>(`/applications/${id}/events`, data)

export const createKnowledgeDocumentApi = (data: KnowledgeDocumentCreateDTO) =>
  request.post<KnowledgeDocumentVO, KnowledgeDocumentVO>('/agent/knowledge/documents', data)

export const updateKnowledgeDocumentApi = (id: number, data: KnowledgeDocumentCreateDTO) =>
  request.put<KnowledgeDocumentVO, KnowledgeDocumentVO>(`/agent/knowledge/documents/${id}`, data)

export const uploadKnowledgeDocumentApi = (file: File, documentType?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  if (documentType) formData.append('documentType', documentType)
  return request.post<KnowledgeDocumentVO, KnowledgeDocumentVO>('/agent/knowledge/documents/upload', formData)
}

export const getKnowledgeDocumentsApi = (params?: { pageNo?: number; pageSize?: number; title?: string; documentType?: string; status?: string }) =>
  request
    .get<PageResult<KnowledgeDocumentVO> | KnowledgeDocumentVO[], PageResult<KnowledgeDocumentVO> | KnowledgeDocumentVO[]>('/agent/knowledge/documents', { params: compactQueryParams(params) })
    .then((result) => normalizePageResult(result, params))

export const getKnowledgeDocumentTypesApi = () =>
  request.get<string[], string[]>('/agent/knowledge/documents/types').then((data) => data || [])

export const getKnowledgeDocumentOptionsApi = () =>
  request.get<KnowledgeDocumentOptionVO[], KnowledgeDocumentOptionVO[]>('/agent/knowledge/documents/options').then((data) => data || [])

export const getKnowledgeStatsApi = () =>
  request.get<KnowledgeStatsVO, KnowledgeStatsVO>('/agent/knowledge/stats')

export const getKnowledgeConfigApi = () =>
  request.get<KnowledgeConfigVO, KnowledgeConfigVO>('/agent/knowledge/config')

export const getKnowledgeDocumentDetailApi = (id: number) =>
  request.get<KnowledgeDocumentVO, KnowledgeDocumentVO>(`/agent/knowledge/documents/${id}`)

export const getKnowledgeDocumentVersionsApi = (id: number) =>
  request
    .get<KnowledgeDocumentVersionVO[], KnowledgeDocumentVersionVO[]>(`/agent/knowledge/documents/${id}/versions`)
    .then((data) => data || [])

export const restoreKnowledgeDocumentVersionApi = (id: number, versionId: number) =>
  request.post<KnowledgeDocumentVO, KnowledgeDocumentVO>(`/agent/knowledge/documents/${id}/versions/${versionId}/restore`)

export const getKnowledgeDocumentChunksApi = (id: number) =>
  request.get<KnowledgeChunkVO[], KnowledgeChunkVO[]>(`/agent/knowledge/documents/${id}/chunks`).then((data) => data || [])

export const getKnowledgeChunkApi = (chunkId: number) =>
  request.get<KnowledgeChunkVO, KnowledgeChunkVO>(`/agent/knowledge/chunks/${chunkId}`)

export const getKnowledgeSimilarChunksApi = (chunkId: number, limit?: number) =>
  request
    .get<KnowledgeSearchResultVO[], KnowledgeSearchResultVO[]>(`/agent/knowledge/chunks/${chunkId}/similar`, { params: compactQueryParams({ limit }) })
    .then((data) => data || [])

export const getKnowledgeDuplicateReviewApi = (params?: { limit?: number; threshold?: number }) =>
  request.get<KnowledgeDuplicateReviewVO, KnowledgeDuplicateReviewVO>('/agent/knowledge/duplicates/review', { params: compactQueryParams(params) })

export const getKnowledgeExactDuplicatesApi = (params?: { limit?: number; documentId?: number; documentType?: string }) =>
  request
    .get<KnowledgeExactDuplicateGroupVO[], KnowledgeExactDuplicateGroupVO[]>('/agent/knowledge/duplicates/exact', { params: compactQueryParams(params) })
    .then((data) => data || [])

export const cleanupKnowledgeExactDuplicatesApi = (params?: { dryRun?: boolean; limit?: number; documentId?: number; documentType?: string }) =>
  request.post<KnowledgeDuplicateCleanupVO, KnowledgeDuplicateCleanupVO>('/agent/knowledge/duplicates/exact/cleanup', undefined, {
    params: compactQueryParams(params)
  })

export const deleteKnowledgeDocumentApi = (id: number) =>
  request.delete<null, null>(`/agent/knowledge/documents/${id}`)

export const deleteKnowledgeChunkApi = (chunkId: number) =>
  request.delete<null, null>(`/agent/knowledge/chunks/${chunkId}`)

export const rebuildKnowledgeVectorsApi = (documentId?: number) =>
  request.post<KnowledgeVectorRebuildVO, KnowledgeVectorRebuildVO>('/agent/knowledge/vectors/rebuild', undefined, {
    params: documentId ? { documentId } : undefined
  })

export const retryFailedKnowledgeVectorsApi = (limit?: number) =>
  request.post<KnowledgeVectorRebuildVO, KnowledgeVectorRebuildVO>('/agent/knowledge/vectors/retry-failed', undefined, {
    params: limit ? { limit } : undefined
  })

export const searchKnowledgeApi = (params: { keyword: string; limit?: number; minScore?: number; documentId?: number; documentType?: string }) =>
  request
    .get<KnowledgeSearchResultVO[], KnowledgeSearchResultVO[]>('/agent/knowledge/search', { params: compactQueryParams(params) })
    .then((data) => data || [])

export const traceKnowledgeSearchApi = (params: { keyword: string; limit?: number; minScore?: number; documentId?: number; documentType?: string }) =>
  request.get<KnowledgeSearchTraceVO, KnowledgeSearchTraceVO>('/agent/knowledge/search/trace', { params: compactQueryParams(params) })

export const askKnowledgeApi = (data: { question: string; limit?: number; minScore?: number; documentId?: number; documentType?: string }) =>
  request.post<KnowledgeAskVO, KnowledgeAskVO>('/agent/knowledge/ask', data)

export interface KnowledgeAskStreamHandlers {
  onReferences?: (references: KnowledgeSearchResultVO[]) => void
  onToken?: (delta: string) => void
  onCitation?: (result: Partial<KnowledgeAskVO>) => void
  onDone?: (aiCallLogId?: number) => void
  onError?: (message: string) => void
}

/**
 * 流式问答。事件序列：references → token（多帧）→ citation → done；失败走 error。
 * 同步接口 askKnowledgeApi 作为降级。
 */
export const askKnowledgeStreamApi = (
  data: { question: string; limit?: number; minScore?: number; documentId?: number; documentType?: string },
  handlers: KnowledgeAskStreamHandlers
): StreamSseHandle => {
  return streamSse({
    url: buildSseUrl('/agent/knowledge/ask/stream', {}),
    method: 'POST',
    body: data,
    handlers: {
      onEvent: (event, payload) => {
        if (!payload) return
        switch (event) {
          case 'references':
            handlers.onReferences?.((payload.references as KnowledgeSearchResultVO[]) || [])
            break
          case 'token':
            if (typeof payload.delta === 'string') handlers.onToken?.(payload.delta)
            break
          case 'citation':
            handlers.onCitation?.(payload as Partial<KnowledgeAskVO>)
            break
          case 'done':
            handlers.onDone?.(payload.aiCallLogId as number | undefined)
            break
          case 'error':
            handlers.onError?.(toFriendlyMessage(payload.message, '\u77e5\u8bc6\u5e93\u95ee\u7b54\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'))
            break
          default:
            break
        }
      },
      onError: (error) => handlers.onError?.(toFriendlyMessage(error.message, '\u77e5\u8bc6\u5e93\u95ee\u7b54\u8fde\u63a5\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'))
    }
  })
}

export const evaluateKnowledgeApi = (data: KnowledgeEvaluationDTO) =>
  request.post<KnowledgeEvaluationVO, KnowledgeEvaluationVO>('/agent/knowledge/evaluate', data)

export const getKnowledgeEvalCasesApi = (params?: KnowledgeEvalCaseQueryDTO) =>
  request
    .get<PageResult<KnowledgeEvalCaseVO>, PageResult<KnowledgeEvalCaseVO>>('/agent/knowledge/eval/cases', { params: compactQueryParams(params) })
    .then((result) => normalizePageResult(result, params))

export const saveKnowledgeEvalCaseApi = (data: KnowledgeEvalCaseSaveDTO) =>
  request.post<KnowledgeEvalCaseVO, KnowledgeEvalCaseVO>('/agent/knowledge/eval/cases', data)

export const deleteKnowledgeEvalCaseApi = (id: number) =>
  request.delete<null, null>(`/agent/knowledge/eval/cases/${id}`)

export const runKnowledgeEvalApi = (data?: KnowledgeEvalRunRequestDTO) =>
  request.post<KnowledgeEvalRunVO, KnowledgeEvalRunVO>('/agent/knowledge/eval/runs', data || {})

export const getKnowledgeEvalRunsApi = (params?: { pageNo?: number; pageSize?: number }) =>
  request
    .get<PageResult<KnowledgeEvalRunVO>, PageResult<KnowledgeEvalRunVO>>('/agent/knowledge/eval/runs', { params: compactQueryParams(params) })
    .then((result) => normalizePageResult(result, params))

export const getKnowledgeEvalRunApi = (id: number) =>
  request.get<KnowledgeEvalRunVO, KnowledgeEvalRunVO>(`/agent/knowledge/eval/runs/${id}`)
