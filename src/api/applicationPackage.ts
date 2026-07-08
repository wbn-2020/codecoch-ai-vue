import request from '@/utils/request'
import { compactQueryParams, normalizePageResult } from '@/utils/page'
import type { PageResult } from '@/types/api'
import type {
  ApplicationPackageActionExecuteDTO,
  ApplicationPackageActionExecuteVO,
  ApplicationPackageCreateDTO,
  ApplicationPackageCreateApplicationDTO,
  ApplicationPackageInterviewContextVO,
  ApplicationPackageListParams,
  ApplicationPackageMatchResultVO,
  ApplicationPackagePreviewParams,
  ApplicationPackageRecommendedResumeVO,
  JobApplicationPackageListItemVO,
  JobApplicationPackageVO
} from '@/types/applicationPackage'
import type { JobApplicationVO } from '@/api/v4'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const toUpperText = (value: unknown) => String(value || '').trim().toUpperCase()

const normalizeActionType = (actionType: unknown) => {
  const normalized = toUpperText(actionType)
  if (normalized === 'CREATE_APPLICATION') return 'CREATE_APPLICATION_RECORD'
  if (normalized === 'SET_FOLLOW_UP_PLAN') return 'SET_FOLLOW_UP'
  return normalized || undefined
}

const normalizeActionExecutePayload = (data?: ApplicationPackageActionExecuteDTO) => {
  if (!data) return {}
  const {
    source,
    note,
    status,
    appliedAt,
    nextFollowUpAt,
    payload,
    ...legacyContext
  } = data as ApplicationPackageActionExecuteDTO & Record<string, unknown>
  const normalizedPayload = {
    ...(isRecord(payload) ? payload : {}),
    ...legacyContext
  }
  return {
    source,
    note,
    status,
    appliedAt,
    nextFollowUpAt,
    payload: normalizedPayload
  }
}

export const normalizeApplicationPackageActionExecute = (
  source: ApplicationPackageActionExecuteVO
): ApplicationPackageActionExecuteVO => {
  const payload = isRecord(source.payload) ? source.payload : {}
  const application = isRecord(payload.application) ? payload.application : undefined
  const packageDetail = isRecord(source.packageDetail)
    ? normalizeApplicationPackage(source.packageDetail as unknown as JobApplicationPackageVO)
    : source.package
  const relatedBizId = Number(source.relatedBizId)
  const payloadApplicationId = Number(application?.id)
  const applicationId = source.applicationId
    ?? (source.relatedBizType === 'JOB_APPLICATION' && Number.isFinite(relatedBizId) ? relatedBizId : undefined)
    ?? (Number.isFinite(payloadApplicationId) ? payloadApplicationId : undefined)
  return {
    ...source,
    applicationPackageId: source.applicationPackageId ?? (source.packageId == null ? undefined : String(source.packageId)),
    applicationId,
    actionPath: source.actionPath || source.actionUrl,
    targetPath: source.targetPath || source.actionUrl,
    package: packageDetail,
    packageDetail
  }
}

const deriveChecklistStatus = (item: Record<string, unknown>) => {
  const backendStatus = toUpperText(item.status)
  if (backendStatus) {
    return {
      status: backendStatus,
      statusSource: 'BACKEND' as const
    }
  }

  if (item.passed === true) {
    return {
      status: 'PASS',
      statusSource: 'DERIVED_FROM_PASSED_SEVERITY' as const
    }
  }

  const severity = toUpperText(item.severity)
  if (['BLOCKER', 'BLOCKED', 'HIGH', 'CRITICAL'].includes(severity)) {
    return {
      status: 'BLOCKED',
      statusSource: 'DERIVED_FROM_PASSED_SEVERITY' as const
    }
  }
  if (['INFO', 'LOW'].includes(severity)) {
    return {
      status: 'PENDING',
      statusSource: 'DERIVED_FROM_PASSED_SEVERITY' as const
    }
  }

  return {
    status: 'WARN',
    statusSource: 'DERIVED_FROM_PASSED_SEVERITY' as const
  }
}

export const normalizeApplicationPackage = (source: JobApplicationPackageVO): JobApplicationPackageVO => {
  if (!isRecord(source)) return source

  const rawRecommendedResume = isRecord(source.recommendedResume)
    ? source.recommendedResume as ApplicationPackageRecommendedResumeVO
    : undefined
  const recommendedResume = rawRecommendedResume
    ? {
        ...rawRecommendedResume,
        resumeVersionNo: rawRecommendedResume.resumeVersionNo ?? rawRecommendedResume.versionNo,
        resumeVersionName: rawRecommendedResume.resumeVersionName ?? rawRecommendedResume.versionName
      }
    : source.recommendedResume
  const matchSummary = isRecord(source.matchSummary) ? source.matchSummary as ApplicationPackageMatchResultVO : undefined
  const matchResult = isRecord(source.matchResult) ? source.matchResult as ApplicationPackageMatchResultVO : matchSummary
  const trace = isRecord(source.trace) ? source.trace : undefined
  const preparation = isRecord(source.interviewPreparation)
    ? source.interviewPreparation as ApplicationPackageInterviewContextVO
    : undefined
  const createParams = isRecord(preparation?.createParams) ? preparation.createParams : {}

  return {
    ...source,
    recommendedResumeVersionId: source.recommendedResumeVersionId ?? recommendedResume?.resumeVersionId,
    fallback: source.fallback ?? Boolean(trace?.fallback || trace?.mock),
    degraded: source.degraded ?? Boolean(trace?.degraded),
    job: source.job || {
      targetJobId: source.targetJobId,
      jdAnalysisId: source.jdAnalysisId,
      companyName: source.companyName,
      jobTitle: source.jobTitle
    },
    recommendedResume,
    matchSummary: matchSummary || matchResult,
    matchResult,
    checklist: (source.checklist || []).map((item) => {
      const normalized = deriveChecklistStatus(item as Record<string, unknown>)
      return {
        ...item,
        ...normalized,
        title: item.title || item.label,
        description: item.description || item.reason,
        actionType: normalizeActionType(item.actionType),
        actionPath: item.actionPath || item.actionUrl
      }
    }),
    actions: (source.actions || []).map((action) => ({
      ...action,
      actionType: normalizeActionType(action.actionType)
    })),
    interviewContext: source.interviewContext || {
      targetJobId: Number(createParams.targetJobId) || source.targetJobId,
      resumeVersionId: Number(createParams.resumeVersionId) || source.recommendedResumeVersionId,
      matchReportId: Number(createParams.matchReportId) || source.matchReportId,
      projectEvidenceIds: Array.isArray(createParams.projectEvidenceIds)
        ? createParams.projectEvidenceIds as number[]
        : source.projectEvidenceIds || []
    }
  }
}

export const previewApplicationPackageApi = async (params: ApplicationPackagePreviewParams) =>
  normalizeApplicationPackage(await request.get<JobApplicationPackageVO, JobApplicationPackageVO>('/application-packages/preview', {
    params: compactQueryParams(params)
  }))

export const createApplicationPackageApi = async (data: ApplicationPackageCreateDTO) =>
  normalizeApplicationPackage(await request.post<JobApplicationPackageVO, JobApplicationPackageVO>('/application-packages', data))

export const getApplicationPackageApi = async (id: string | number) =>
  normalizeApplicationPackage(await request.get<JobApplicationPackageVO, JobApplicationPackageVO>(`/application-packages/${encodeURIComponent(String(id))}`))

export const getApplicationPackagesApi = (params?: ApplicationPackageListParams) =>
  request
    .get<PageResult<JobApplicationPackageListItemVO>, PageResult<JobApplicationPackageListItemVO>>('/application-packages', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params))

export const refreshApplicationPackageApi = async (id: string | number) =>
  normalizeApplicationPackage(await request.post<JobApplicationPackageVO, JobApplicationPackageVO>(`/application-packages/${encodeURIComponent(String(id))}/refresh`))

export const executeApplicationPackageActionApi = (id: string | number, actionCode: string, data?: ApplicationPackageActionExecuteDTO) =>
  request.post<ApplicationPackageActionExecuteVO, ApplicationPackageActionExecuteVO>(
    `/application-packages/${encodeURIComponent(String(id))}/actions/${encodeURIComponent(actionCode)}/execute`,
    normalizeActionExecutePayload(data)
  ).then(normalizeApplicationPackageActionExecute)

export const createApplicationFromPackageApi = (data?: ApplicationPackageCreateApplicationDTO) =>
  request.post<JobApplicationVO, JobApplicationVO>('/application-packages/preview/create-application', data || {})
