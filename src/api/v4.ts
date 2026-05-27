import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import { normalizePageResult } from '@/utils/page'

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
  chunkCount?: number
  duplicateChunkCount?: number
  duplicateDocumentId?: number
  duplicateDocument?: boolean
  content?: string
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
  sourceRef?: string
  duplicateInDocument?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeStatsVO {
  documentCount?: number
  chunkCount?: number
  duplicateChunkCount?: number
  vectorEnabled?: boolean
  retrievalMode?: string
  chunkStrategy?: string
}

export interface KnowledgeSearchResultVO {
  documentId?: number
  chunkId?: number
  title?: string
  documentType?: string
  snippet?: string
  highlightedSnippet?: string
  matchedTerms?: string[]
  sourceRef?: string
  score?: number
  matchType?: string
}

export interface KnowledgeAskVO {
  question?: string
  answer?: string
  references?: KnowledgeSearchResultVO[]
  aiCallLogId?: number
  generatedAt?: string
}

export interface KnowledgeVectorRebuildVO {
  vectorEnabled?: boolean
  documentCount?: number
  chunkCount?: number
  vectorUpdated?: number
  duplicateChunkCount?: number
  failedDocuments?: number[]
  errors?: string[]
}

export const generateAgentReviewApi = (data?: { targetJobId?: number; date?: string }) =>
  request.post<AgentReviewVO, AgentReviewVO>('/agent/job-coach/review', data || {})

export const getAgentReviewsApi = (params?: { targetJobId?: number }) =>
  request.get<AgentReviewVO[], AgentReviewVO[]>('/agent/reviews', { params }).then((data) => data || [])

export const getGrowthOverviewApi = () =>
  request.get<GrowthOverviewVO, GrowthOverviewVO>('/agent/growth/profile/overview')

export const getGrowthProfileOverviewApi = getGrowthOverviewApi

export const getGrowthSkillsTrendApi = (params?: { days?: number }) =>
  request
    .get<SkillGrowthSnapshotVO[], SkillGrowthSnapshotVO[]>('/agent/growth/skills/trend', { params })
    .then((data) => data || [])

export const getGrowthReadinessTrendApi = (params?: { days?: number }) =>
  request
    .get<ReadinessScoreRecordVO[], ReadinessScoreRecordVO[]>('/agent/growth/readiness/trend', { params })
    .then((data) => data || [])

export const getAgentMemoriesApi = (params?: { pageNo?: number; pageSize?: number; memoryType?: string; enabled?: number }) =>
  request
    .get<PageResult<AgentMemoryVO> | AgentMemoryVO[], PageResult<AgentMemoryVO> | AgentMemoryVO[]>('/agent/memories', { params })
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
  request.get<JobApplicationVO[], JobApplicationVO[]>('/applications', { params }).then((data) => data || [])

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

export const uploadKnowledgeDocumentApi = (file: File, documentType?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  if (documentType) formData.append('documentType', documentType)
  return request.post<KnowledgeDocumentVO, KnowledgeDocumentVO>('/agent/knowledge/documents/upload', formData)
}

export const getKnowledgeDocumentsApi = (params?: { pageNo?: number; pageSize?: number }) =>
  request
    .get<PageResult<KnowledgeDocumentVO> | KnowledgeDocumentVO[], PageResult<KnowledgeDocumentVO> | KnowledgeDocumentVO[]>('/agent/knowledge/documents', { params })
    .then((result) => normalizePageResult(result, params))

export const getKnowledgeStatsApi = () =>
  request.get<KnowledgeStatsVO, KnowledgeStatsVO>('/agent/knowledge/stats')

export const getKnowledgeDocumentDetailApi = (id: number) =>
  request.get<KnowledgeDocumentVO, KnowledgeDocumentVO>(`/agent/knowledge/documents/${id}`)

export const getKnowledgeDocumentChunksApi = (id: number) =>
  request.get<KnowledgeChunkVO[], KnowledgeChunkVO[]>(`/agent/knowledge/documents/${id}/chunks`).then((data) => data || [])

export const deleteKnowledgeDocumentApi = (id: number) =>
  request.delete<null, null>(`/agent/knowledge/documents/${id}`)

export const rebuildKnowledgeVectorsApi = (documentId?: number) =>
  request.post<KnowledgeVectorRebuildVO, KnowledgeVectorRebuildVO>('/agent/knowledge/vectors/rebuild', undefined, {
    params: documentId ? { documentId } : undefined
  })

export const searchKnowledgeApi = (params: { keyword: string; limit?: number }) =>
  request
    .get<KnowledgeSearchResultVO[], KnowledgeSearchResultVO[]>('/agent/knowledge/search', { params })
    .then((data) => data || [])

export const askKnowledgeApi = (data: { question: string; limit?: number }) =>
  request.post<KnowledgeAskVO, KnowledgeAskVO>('/agent/knowledge/ask', data)
