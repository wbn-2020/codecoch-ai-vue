import request from '@/utils/request'
import {
  normalizeCareerAssignment,
  normalizeCareerAttribution,
  normalizeCareerCalendarEvent,
  normalizeCareerCohort,
  normalizeCareerHypothesis,
  normalizeCareerImportPreview,
  normalizeCareerImportResult,
  normalizeCareerVariant
} from '@/features/career-growth'
import type {
  ApplicationEventReviewGenerateRequest,
  ApplicationEventStructuredReview
} from '@/features/applications'
import type {
  CareerCalendarEventSave,
  CareerCalendarEventVO,
  CareerCsvMapping,
  CareerDuplicatePolicy,
  CareerExperimentAssignmentCreate,
  CareerExperimentAssignmentVO,
  CareerExperimentAttributionVO,
  CareerExperimentCohortCreate,
  CareerExperimentCohortVO,
  CareerExperimentHypothesisCreate,
  CareerExperimentHypothesisVO,
  CareerExperimentVariantCreate,
  CareerExperimentVariantVO,
  CareerImportPreviewVO,
  CareerImportResultVO
} from '@/types/careerGrowth'

export interface CareerCalendarEventPreparationMeta {
  preparationStatus?: 'READY' | 'FALLBACK' | 'FAILED' | string
  preparationStale?: boolean
  preparationAiCallLogId?: number
  preparationGeneratedAt?: string
  preparationSourceHash?: string
}

export type CareerCalendarEventWithPreparationVO =
  CareerCalendarEventVO & CareerCalendarEventPreparationMeta

export type CareerInterviewPreparationTimeBudget = 30 | 60 | 120

export interface CareerInterviewPreparationGenerateRequest {
  timeBudgetMinutes: CareerInterviewPreparationTimeBudget
  force?: boolean
}

export interface CareerInterviewPreparationVO {
  calendarEventId: number
  applicationId?: number
  timeBudgetMinutes: CareerInterviewPreparationTimeBudget
  summary?: string
  facts: string[]
  limits: string[]
  focusAreas: string[]
  projectStories: string[]
  practiceQuestions: string[]
  checklist: string[]
  schedule: string[]
  nextActions: string[]
  evidenceSources: string[]
  confidenceLevel?: string
  fallback: boolean
  aiCallLogId?: number
  sourceHash?: string
  status?: string
  generatedAt?: string
}

export const careerInterviewPreparationBudgets: CareerInterviewPreparationTimeBudget[] = [30, 60, 120]

const careerInterviewPreparationEventTypes = new Set([
  'INTERVIEW',
  'INTERVIEW_SCHEDULED',
  'PHONE_SCREEN',
  'TECHNICAL_INTERVIEW',
  'HR_INTERVIEW',
  'FINAL_INTERVIEW'
])

const optionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const optionalString = (value: unknown) => {
  const text = value == null ? '' : String(value).trim()
  return text || undefined
}

const optionalBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
}

const stringList = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => optionalString(item))
    .filter((item): item is string => Boolean(item))

const normalizePreparationBudget = (value: unknown): CareerInterviewPreparationTimeBudget => {
  const parsed = Number(value)
  if (parsed === 30 || parsed === 120) return parsed
  return 60
}

const normalizeCareerInterviewPreparation = (
  value: CareerInterviewPreparationVO
): CareerInterviewPreparationVO => ({
  calendarEventId: Number(value.calendarEventId || 0),
  applicationId: optionalNumber(value.applicationId),
  timeBudgetMinutes: normalizePreparationBudget(value.timeBudgetMinutes),
  summary: optionalString(value.summary),
  facts: stringList(value.facts),
  limits: stringList(value.limits),
  focusAreas: stringList(value.focusAreas),
  projectStories: stringList(value.projectStories),
  practiceQuestions: stringList(value.practiceQuestions),
  checklist: stringList(value.checklist),
  schedule: stringList(value.schedule),
  nextActions: stringList(value.nextActions),
  evidenceSources: stringList(value.evidenceSources),
  confidenceLevel: optionalString(value.confidenceLevel),
  fallback: value.fallback === true,
  aiCallLogId: optionalNumber(value.aiCallLogId),
  sourceHash: optionalString(value.sourceHash),
  status: optionalString(value.status),
  generatedAt: optionalString(value.generatedAt)
})

const normalizeCareerCalendarEventWithPreparation = (
  value: CareerCalendarEventWithPreparationVO
): CareerCalendarEventWithPreparationVO => ({
  ...normalizeCareerCalendarEvent(value),
  preparationStatus: optionalString(value.preparationStatus),
  preparationStale: optionalBoolean(value.preparationStale),
  preparationAiCallLogId: optionalNumber(value.preparationAiCallLogId),
  preparationGeneratedAt: optionalString(value.preparationGeneratedAt),
  preparationSourceHash: optionalString(value.preparationSourceHash)
})

export const isCareerInterviewPreparationEventType = (eventType?: string | null) =>
  careerInterviewPreparationEventTypes.has(String(eventType || '').trim().toUpperCase())

export const createCareerHypothesisApi = (data: CareerExperimentHypothesisCreate) =>
  request
    .post<CareerExperimentHypothesisVO, CareerExperimentHypothesisVO>('/job-experiments-v2/hypotheses', data)
    .then(normalizeCareerHypothesis)

export const getCareerHypothesisApi = (hypothesisId: number) =>
  request
    .get<CareerExperimentHypothesisVO, CareerExperimentHypothesisVO>(`/job-experiments-v2/hypotheses/${hypothesisId}`)
    .then(normalizeCareerHypothesis)

export const getCareerHypothesesApi = (params?: {
  status?: string
  keyword?: string
  legacyExperimentId?: number
  limit?: number
}) =>
  request
    .get<CareerExperimentHypothesisVO[], CareerExperimentHypothesisVO[]>('/job-experiments-v2/hypotheses', {
      params
    })
    .then((items) => (items || []).map(normalizeCareerHypothesis))

export const getCareerHypothesisByLegacyExperimentApi = async (legacyExperimentId: number) => {
  const items = await getCareerHypothesesApi({ legacyExperimentId, limit: 1 })
  return items[0]
}

export const addCareerVariantApi = (hypothesisId: number, data: CareerExperimentVariantCreate) =>
  request
    .post<CareerExperimentVariantVO, CareerExperimentVariantVO>(
      `/job-experiments-v2/hypotheses/${hypothesisId}/variants`,
      data
    )
    .then(normalizeCareerVariant)

export const assignCareerApplicationApi = (
  hypothesisId: number,
  data: CareerExperimentAssignmentCreate
) =>
  request
    .post<CareerExperimentAssignmentVO, CareerExperimentAssignmentVO>(
      `/job-experiments-v2/hypotheses/${hypothesisId}/assignments`,
      data
    )
    .then(normalizeCareerAssignment)

export const getCareerAssignmentsApi = (hypothesisId: number) =>
  request
    .get<CareerExperimentAssignmentVO[], CareerExperimentAssignmentVO[]>(
      `/job-experiments-v2/hypotheses/${hypothesisId}/assignments`
    )
    .then((items) => (items || []).map(normalizeCareerAssignment))

export const createCareerCohortApi = (
  hypothesisId: number,
  data: CareerExperimentCohortCreate
) =>
  request
    .post<CareerExperimentCohortVO, CareerExperimentCohortVO>(
      `/job-experiments-v2/hypotheses/${hypothesisId}/cohorts`,
      data
    )
    .then(normalizeCareerCohort)

export const getCareerCohortsApi = (hypothesisId: number) =>
  request
    .get<CareerExperimentCohortVO[], CareerExperimentCohortVO[]>(
      `/job-experiments-v2/hypotheses/${hypothesisId}/cohorts`
    )
    .then((items) => (items || []).map(normalizeCareerCohort))

export const calculateCareerAttributionApi = (cohortId: number, asOf?: string) =>
  request
    .post<CareerExperimentAttributionVO, CareerExperimentAttributionVO>(
      `/job-experiments-v2/cohorts/${cohortId}/attribution`,
      undefined,
      { params: asOf ? { asOf } : undefined }
    )
    .then(normalizeCareerAttribution)

export const getLatestCareerAttributionApi = (cohortId: number) =>
  request
    .get<CareerExperimentAttributionVO, CareerExperimentAttributionVO>(
      `/job-experiments-v2/cohorts/${cohortId}/attributions/latest`
    )
    .then(normalizeCareerAttribution)

export const getCareerAttributionsApi = (cohortId: number, limit = 20) =>
  request
    .get<CareerExperimentAttributionVO[], CareerExperimentAttributionVO[]>(
      `/job-experiments-v2/cohorts/${cohortId}/attributions`,
      { params: { limit } }
    )
    .then((items) => (items || []).map(normalizeCareerAttribution))

export const generateApplicationEventAiReviewApi = (
  applicationId: number,
  eventId: number,
  data: ApplicationEventReviewGenerateRequest
) =>
  request.post<ApplicationEventStructuredReview, ApplicationEventStructuredReview>(
    `/applications/${applicationId}/events/${eventId}/ai-review`,
    data
  )

export const getCareerCalendarEventsApi = (params?: { from?: string; to?: string }) =>
  request
    .get<CareerCalendarEventWithPreparationVO[], CareerCalendarEventWithPreparationVO[]>(
      '/career-calendar/events',
      { params }
    )
    .then((items) => (items || []).map(normalizeCareerCalendarEventWithPreparation))

export const createCareerCalendarEventApi = (data: CareerCalendarEventSave) =>
  request
    .post<CareerCalendarEventVO, CareerCalendarEventVO>('/career-calendar/events', data)
    .then(normalizeCareerCalendarEvent)

export const updateCareerCalendarEventApi = (eventId: number, data: CareerCalendarEventSave) =>
  request
    .put<CareerCalendarEventVO, CareerCalendarEventVO>(`/career-calendar/events/${eventId}`, data)
    .then(normalizeCareerCalendarEvent)

export const deleteCareerCalendarEventApi = (eventId: number) =>
  request.delete<void, void>(`/career-calendar/events/${eventId}`)

export const getCareerInterviewPreparationApi = (eventId: number) =>
  request
    .get<CareerInterviewPreparationVO | null, CareerInterviewPreparationVO | null>(
      `/career-calendar/events/${eventId}/preparation`
    )
    .then((value) => value ? normalizeCareerInterviewPreparation(value) : null)

export const generateCareerInterviewPreparationApi = (
  eventId: number,
  data: CareerInterviewPreparationGenerateRequest
) =>
  request
    .post<CareerInterviewPreparationVO, CareerInterviewPreparationVO>(
      `/career-calendar/events/${eventId}/preparation`,
      data
    )
    .then(normalizeCareerInterviewPreparation)

export const exportCareerCalendarCsvApi = (params?: { from?: string; to?: string }) =>
  request.get<Blob, Blob>('/career-calendar/export.csv', { params, responseType: 'blob' })

export const exportCareerCalendarIcsApi = (
  timezone: string,
  params?: { from?: string; to?: string }
) =>
  request.get<Blob, Blob>('/career-calendar/export.ics', {
    params: { ...params, timezone },
    responseType: 'blob'
  })

const fileForm = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return form
}

const csvMappingParam = (mapping?: CareerCsvMapping) =>
  mapping && Object.keys(mapping).length ? JSON.stringify(mapping) : undefined

export const previewCareerCsvImportApi = (
  file: File,
  timezone: string,
  mapping?: CareerCsvMapping
) =>
  request
    .post<CareerImportPreviewVO, CareerImportPreviewVO>('/career-imports/csv/preview', fileForm(file), {
      params: { timezone, mapping: csvMappingParam(mapping) }
    })
    .then(normalizeCareerImportPreview)

export const importCareerCsvApi = (
  file: File,
  timezone: string,
  duplicatePolicy: CareerDuplicatePolicy,
  mapping?: CareerCsvMapping
) =>
  request
    .post<CareerImportResultVO, CareerImportResultVO>('/career-imports/csv', fileForm(file), {
      params: { timezone, duplicatePolicy, mapping: csvMappingParam(mapping) }
    })
    .then(normalizeCareerImportResult)

export const previewCareerIcsImportApi = (file: File, timezone: string) =>
  request
    .post<CareerImportPreviewVO, CareerImportPreviewVO>('/career-imports/ics/preview', fileForm(file), {
      params: { timezone }
    })
    .then(normalizeCareerImportPreview)

export const importCareerIcsApi = (file: File, timezone: string) =>
  request
    .post<CareerImportResultVO, CareerImportResultVO>('/career-imports/ics', fileForm(file), {
      params: { timezone }
    })
    .then(normalizeCareerImportResult)

export const downloadCareerImportErrorsApi = (batchId: number) =>
  request.get<Blob, Blob>(`/career-imports/${batchId}/errors.csv`, {
    responseType: 'blob'
  })
