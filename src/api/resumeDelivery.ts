import request from '@/utils/request'
import type {
  ResumeArtifactPackageCreateDTO,
  ResumeArtifactVO,
  ResumeAtsTemplateVO,
  ResumeClaimAuditVO,
  ResumeExportCreateDTO,
  ResumeExportVO,
  ResumeSuggestionCreateDTO,
  ResumeSuggestionBatchAcceptDTO,
  ResumeSuggestionDecisionDTO,
  ResumeSuggestionVO
} from '@/types/resumeDelivery'

export const getResumeSuggestionsApi = (params?: { resumeId?: number; status?: string }) =>
  request.get<ResumeSuggestionVO[], ResumeSuggestionVO[]>('/resume-suggestions', { params })

export const createResumeSuggestionApi = (data: ResumeSuggestionCreateDTO) =>
  request.post<ResumeSuggestionVO, ResumeSuggestionVO>('/resume-suggestions', data)

export const decideResumeSuggestionApi = (id: number, data: ResumeSuggestionDecisionDTO) =>
  request.post<ResumeSuggestionVO, ResumeSuggestionVO>(`/resume-suggestions/${id}/decisions`, data)

export const batchAcceptResumeSuggestionsApi = (data: ResumeSuggestionBatchAcceptDTO) =>
  request.post<ResumeSuggestionVO[], ResumeSuggestionVO[]>('/resume-suggestions/batch-accept', data)

export const getResumeClaimAuditsApi = (resumeId?: number) =>
  request.get<ResumeClaimAuditVO[], ResumeClaimAuditVO[]>('/resume-claim-audits', {
    params: resumeId ? { resumeId } : undefined
  })

export const createResumeClaimAuditApi = (resumeVersionId: number) =>
  request.post<ResumeClaimAuditVO, ResumeClaimAuditVO>('/resume-claim-audits', { resumeVersionId })

export const getResumeAtsTemplatesApi = () =>
  request.get<ResumeAtsTemplateVO[], ResumeAtsTemplateVO[]>('/resume-ats-templates')

export const createResumeExportApi = (data: ResumeExportCreateDTO) =>
  request.post<ResumeExportVO, ResumeExportVO>('/resume-exports', data)

export const createApplicationPackageArtifactApi = (data: ResumeArtifactPackageCreateDTO) =>
  request.post<ResumeArtifactVO, ResumeArtifactVO>('/resume-artifacts/application-packages', data)

export const getResumeArtifactsApi = (resumeVersionId?: number) =>
  request.get<ResumeArtifactVO[], ResumeArtifactVO[]>('/resume-artifacts', {
    params: resumeVersionId ? { resumeVersionId } : undefined
  })

export const getResumeArtifactApi = (id: number) =>
  request.get<ResumeArtifactVO, ResumeArtifactVO>(`/resume-artifacts/${id}`)

export const downloadResumeArtifactApi = (id: number) =>
  request.get<Blob, Blob>(`/resume-artifacts/${id}/download`, {
    responseType: 'blob'
  })
