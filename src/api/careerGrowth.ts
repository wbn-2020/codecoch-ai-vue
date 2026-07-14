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

export const getCareerCalendarEventsApi = (params?: { from?: string; to?: string }) =>
  request
    .get<CareerCalendarEventVO[], CareerCalendarEventVO[]>('/career-calendar/events', { params })
    .then((items) => (items || []).map(normalizeCareerCalendarEvent))

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
