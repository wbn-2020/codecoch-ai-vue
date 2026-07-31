import request from '@/utils/request'
import { compactQueryParams } from '@/utils/page'
import {
  normalizeEvidenceBoolean,
  normalizeEvidenceConfidence,
  normalizeEvidenceEnvelope,
  normalizeOptionalEvidenceBoolean,
  normalizeEvidenceSourceRefs,
  normalizeEvidenceStringArray
} from '@/api/evidenceAsset'
import type {
  EvidenceLearningCandidateEnvelopeVO,
  EvidenceLearningCandidateQueryDTO,
  EvidenceLearningCandidateVO,
  EvidenceLearningDecisionDTO,
  EvidenceLearningDecisionCode
} from '@/types/evidenceLearning'

const decisionCodes: EvidenceLearningDecisionCode[] = ['KEEP', 'EDIT', 'CONTINUE', 'REJECT']

export const normalizeEvidenceLearningCandidate = (value: unknown): EvidenceLearningCandidateVO => {
  const item = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const rawId = item.id ?? item.candidateId
  const rawCandidateId = item.candidateId ?? item.id
  const id = rawId === undefined || rawId === null || rawId === '' ? undefined : Number(rawId)
  const candidateId = rawCandidateId === undefined || rawCandidateId === null || rawCandidateId === ''
    ? undefined
    : Number(rawCandidateId)
  const rawDecisions = item.availableDecisions ?? item.decisionOptions
  const availableDecisions = Array.isArray(rawDecisions)
    ? rawDecisions
      .map((decision) => String(decision).toUpperCase())
      .filter((decision): decision is EvidenceLearningDecisionCode =>
        decisionCodes.includes(decision as EvidenceLearningDecisionCode)
      )
    : []
  const status = typeof item.status === 'string' ? item.status.trim().toUpperCase() : undefined
  const requiresUserConfirmation = normalizeOptionalEvidenceBoolean(item.requiresUserConfirmation)
  const explicitConfirmed = normalizeOptionalEvidenceBoolean(item.confirmed)
  const confirmed = explicitConfirmed ??
    (['CONFIRMED', 'CONFIRMED_BY_USER'].includes(status || '') ? true : undefined)
  const semanticKey = typeof item.semanticKey === 'string'
    ? item.semanticKey
    : typeof item.candidateKey === 'string'
      ? item.candidateKey
      : undefined
  const editDeepLink = typeof item.editPath === 'string'
    ? item.editPath
    : typeof item.editDeepLink === 'string'
      ? item.editDeepLink
      : undefined
  return {
    ...item,
    id: id !== undefined && Number.isFinite(id) ? id : undefined,
    candidateId: candidateId !== undefined && Number.isFinite(candidateId) ? candidateId : undefined,
    userId: item.userId === undefined || item.userId === null ? undefined : Number(item.userId),
    candidateKey: typeof item.candidateKey === 'string' ? item.candidateKey : semanticKey,
    semanticKey,
    status,
    limits: normalizeEvidenceStringArray(item.limits),
    unknowns: normalizeEvidenceStringArray(item.unknowns),
    warnings: normalizeEvidenceStringArray(item.warnings),
    sourceRefs: normalizeEvidenceSourceRefs(item.sourceRefs || item.sources),
    sources: normalizeEvidenceSourceRefs(item.sources || item.sourceRefs),
    dataCutoffAt: typeof item.dataCutoffAt === 'string' ? item.dataCutoffAt : undefined,
    sourceSetHash: typeof item.sourceSetHash === 'string' ? item.sourceSetHash : undefined,
    coverage: item.coverage as EvidenceLearningCandidateVO['coverage'],
    confidenceLevel: normalizeEvidenceConfidence(item.confidenceLevel),
    fallback: normalizeEvidenceBoolean(item.fallback),
    stale: normalizeOptionalEvidenceBoolean(item.stale),
    confirmed,
    requiresUserConfirmation,
    memoryEnabled: normalizeOptionalEvidenceBoolean(item.memoryEnabled),
    editPath: editDeepLink,
    editDeepLink,
    availableDecisions
  }
}

export const getEvidenceLearningCandidatesApi = (
  params?: EvidenceLearningCandidateQueryDTO
): Promise<EvidenceLearningCandidateEnvelopeVO> =>
  request
    .get<unknown, unknown>('/evidence-assets/candidates', {
      params: compactQueryParams(params)
    })
    .then((value) => normalizeEvidenceEnvelope<EvidenceLearningCandidateVO>(
      value,
      normalizeEvidenceLearningCandidate
    ))

export const getEvidenceLearningCandidateApi = (candidateId: number) =>
  request
    .get<EvidenceLearningCandidateVO, EvidenceLearningCandidateVO>(
      `/agent/evidence-learning/candidates/${candidateId}`
    )
    .then(normalizeEvidenceLearningCandidate)

export const decideEvidenceLearningCandidateApi = (
  candidateId: number,
  data: EvidenceLearningDecisionDTO
) =>
  request
    .post<EvidenceLearningCandidateVO, EvidenceLearningCandidateVO>(
      `/agent/evidence-learning/candidates/${candidateId}/decisions`,
      {
        decisionCode: data.decisionCode,
        ...(data.editedContent !== undefined ? { editedContent: data.editedContent } : {}),
        idempotencyKey: data.idempotencyKey
      }
    )
    .then(normalizeEvidenceLearningCandidate)
