import request from '@/utils/request'
import { compactQueryParams } from '@/utils/page'
import type {
  CareerEvidenceUsageCreateDTO,
  CareerEvidenceUsageQueryDTO,
  CareerEvidenceUsageResultCommandDTO,
  CareerEvidenceUsageResultQueryDTO,
  CareerEvidenceUsageResultVO,
  CareerEvidenceUsageResultWriteDTO,
  CareerEvidenceUsageVO,
  EvidenceAssetOverviewEnvelopeVO,
  EvidenceAssetOverviewQueryDTO,
  EvidenceAssetOverviewVO,
  EvidenceAssetReadinessItemVO,
  EvidenceConfidenceLevel,
  EvidenceCoverageVO,
  EvidenceEnvelopeVO,
  EvidenceSourceRefVO
} from '@/types/evidenceAsset'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const toIdValue = (value: unknown): number | string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

const parseEvidenceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return undefined
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return undefined
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  }
  return undefined
}

export const normalizeEvidenceBoolean = (value: unknown, fallback = false): boolean =>
  parseEvidenceBoolean(value) ?? fallback

export const normalizeOptionalEvidenceBoolean = (value: unknown): boolean | undefined =>
  value === undefined || value === null ? undefined : parseEvidenceBoolean(value)

export const normalizeEvidenceStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item.trim() : String(item ?? '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}

export const normalizeEvidenceConfidence = (value: unknown): EvidenceConfidenceLevel => {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized || 'UNKNOWN'
}

export const normalizeEvidenceSourceRefs = (value: unknown): EvidenceSourceRefVO[] =>
  Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({
        ...item,
        sourceType: typeof item.sourceType === 'string'
          ? item.sourceType.trim() || undefined
          : typeof item.type === 'string'
            ? item.type.trim() || undefined
            : undefined,
        sourceId: toIdValue(item.sourceId),
        sourceVersion: item.sourceVersion as number | string | undefined,
        sourceHash: typeof item.sourceHash === 'string' ? item.sourceHash : undefined,
        summary: typeof item.summary === 'string'
          ? item.summary
          : typeof item.sourceSummary === 'string'
            ? item.sourceSummary
            : undefined,
        stale: normalizeOptionalEvidenceBoolean(item.stale)
      }))
    : []

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const sourceValues = (value: unknown, key: string) =>
  isRecord(value) ? normalizeEvidenceStringArray(value[key]) : []

const normalizeMetadata = (source: UnknownRecord) => ({
  dataCutoffAt: typeof source.dataCutoffAt === 'string' ? source.dataCutoffAt : undefined,
  sourceSetHash: typeof source.sourceSetHash === 'string' ? source.sourceSetHash : undefined,
  coverage: source.coverage as EvidenceCoverageVO | string[] | string | undefined,
  warnings: normalizeEvidenceStringArray(source.warnings),
  unknowns: normalizeEvidenceStringArray(source.unknowns),
  limits: normalizeEvidenceStringArray(source.limits),
  confidenceLevel: normalizeEvidenceConfidence(source.confidenceLevel),
  fallback: normalizeEvidenceBoolean(source.fallback),
  fallbackReason: typeof source.fallbackReason === 'string' ? source.fallbackReason : undefined,
  sources: normalizeEvidenceSourceRefs(source.sources || source.sourceRefs)
})

const extractItems = <T>(source: unknown): T[] => {
  if (Array.isArray(source)) return source as T[]
  if (!isRecord(source)) return []
  if (Array.isArray(source.items)) return source.items as T[]
  if (Array.isArray(source.candidates)) return source.candidates as T[]
  if (Array.isArray(source.records)) return source.records as T[]
  if (Array.isArray(source.list)) return source.list as T[]
  if (isRecord(source.page) && Array.isArray(source.page.records)) return source.page.records as T[]
  if (isRecord(source.page) && Array.isArray(source.page.items)) return source.page.items as T[]
  return []
}

export const normalizeEvidenceEnvelope = <T>(
  value: unknown,
  normalizeItem: (item: T) => T = (item) => item
): EvidenceEnvelopeVO<T> => {
  const source = isRecord(value) ? value : {}
  const items = extractItems<T>(value).map(normalizeItem)
  const itemRecords = items.filter(isRecord)
  const itemMetadata = itemRecords.map((item) => normalizeMetadata(item as UnknownRecord))
  const itemWarnings = itemRecords.flatMap((item) => sourceValues(item, 'warnings'))
  const itemUnknowns = itemRecords.flatMap((item) => [
    ...sourceValues(item, 'unknowns'),
    ...sourceValues(item, 'unknownsFromCoverage')
  ])
  const itemLimits = itemRecords.flatMap((item) => [
    ...sourceValues(item, 'limits'),
    ...sourceValues(item, 'limitsFromCoverage')
  ])
  const itemSources = itemMetadata.flatMap((item) => item.sources)
  const firstItem = itemMetadata[0]
  const page = isRecord(source.page) ? source.page : undefined
  const total = toNumber(source.total ?? page?.total)
  const pageNo = toNumber(source.pageNo ?? page?.pageNo)
  const pageSize = toNumber(source.pageSize ?? page?.pageSize)
  const fallbackReason = typeof source.fallbackReason === 'string'
    ? source.fallbackReason
    : itemMetadata.map((item) => item.fallbackReason).find(Boolean)
  return {
    ...normalizeMetadata(source),
    items,
    total: Array.isArray(value) ? items.length : total,
    pageNo,
    pageSize,
    dataCutoffAt: typeof source.dataCutoffAt === 'string'
      ? source.dataCutoffAt
      : firstItem?.dataCutoffAt,
    sourceSetHash: typeof source.sourceSetHash === 'string'
      ? source.sourceSetHash
      : firstItem?.sourceSetHash,
    coverage: (source.coverage as EvidenceCoverageVO | string[] | string | undefined) ?? firstItem?.coverage,
    warnings: uniqueStrings([
      ...normalizeEvidenceStringArray(source.warnings),
      ...itemWarnings
    ]),
    unknowns: uniqueStrings([
      ...normalizeEvidenceStringArray(source.unknowns),
      ...itemUnknowns
    ]),
    limits: uniqueStrings([
      ...normalizeEvidenceStringArray(source.limits),
      ...itemLimits
    ]),
    confidenceLevel: normalizeEvidenceConfidence(
      source.confidenceLevel ?? itemMetadata.map((item) => item.confidenceLevel).find(Boolean)
    ),
    fallback: normalizeEvidenceBoolean(source.fallback) || itemMetadata.some((item) => item.fallback),
    fallbackReason,
    sources: normalizeEvidenceSourceRefs(source.sources || source.sourceRefs).concat(itemSources)
  }
}

export const normalizeEvidenceUsage = (value: unknown): CareerEvidenceUsageVO => {
  const source = isRecord(value) ? value : {}
  const sources = normalizeEvidenceSourceRefs(source.sourceRefs || source.sources)
  return {
    ...source,
    id: toNumber(source.id),
    userId: toNumber(source.userId),
    campaignId: toNumber(source.campaignId),
    applicationId: toNumber(source.applicationId),
    targetJobId: toNumber(source.targetJobId),
    assetType: typeof source.assetType === 'string' && source.assetType.trim()
      ? source.assetType.trim() as CareerEvidenceUsageVO['assetType']
      : undefined,
    assetId: toIdValue(source.assetId),
    packageSnapshotId: toIdValue(source.packageSnapshotId),
    hypothesisId: toNumber(source.hypothesisId),
    variantId: toNumber(source.variantId),
    assignmentId: toNumber(source.assignmentId),
    resultCount: toNumber(source.resultCount),
    stale: normalizeOptionalEvidenceBoolean(source.stale),
    sourceRefs: sources,
    sources,
    dataCutoffAt: typeof source.dataCutoffAt === 'string' ? source.dataCutoffAt : undefined,
    sourceSetHash: typeof source.sourceSetHash === 'string' ? source.sourceSetHash : undefined,
    coverage: source.coverage as EvidenceCoverageVO | string[] | string | undefined,
    warnings: normalizeEvidenceStringArray(source.warnings),
    unknowns: normalizeEvidenceStringArray(source.unknowns),
    limits: normalizeEvidenceStringArray(source.limits),
    confidenceLevel: normalizeEvidenceConfidence(source.confidenceLevel),
    fallback: normalizeOptionalEvidenceBoolean(source.fallback),
    fallbackReason: typeof source.fallbackReason === 'string' ? source.fallbackReason : undefined
  }
}

export const normalizeEvidenceUsageResult = (
  value: unknown
): CareerEvidenceUsageResultVO => {
  const source = isRecord(value) ? value : {}
  const inlineSource = typeof source.sourceType === 'string' && source.sourceType.trim()
    ? [{
        sourceType: source.sourceType.trim(),
        sourceId: toIdValue(source.sourceId),
        sourceVersion: source.sourceVersion as number | string | undefined,
        sourceHash: typeof source.sourceHash === 'string' ? source.sourceHash : undefined
      }]
    : []
  const sources = normalizeEvidenceSourceRefs(source.sourceRefs || source.sources)
  const unknowns = uniqueStrings([
    ...normalizeEvidenceStringArray(source.unknowns),
    ...normalizeEvidenceStringArray(source.unknownsFromCoverage)
  ])
  const limits = uniqueStrings([
    ...normalizeEvidenceStringArray(source.limits),
    ...normalizeEvidenceStringArray(source.limitsFromCoverage)
  ])
  return {
    ...source,
    id: toNumber(source.id),
    usageId: toNumber(source.usageId ?? (isRecord(source.usage) ? source.usage.id : undefined)),
    applicationId: toNumber(source.applicationId),
    eventType: typeof source.eventType === 'string' ? source.eventType.trim() || undefined : undefined,
    eventId: toNumber(source.eventId),
    currentSnapshotId: toNumber(source.currentSnapshotId),
    snapshotVersion: toNumber(source.snapshotVersion),
    lockVersion: toNumber(source.lockVersion),
    knownFacts: normalizeEvidenceStringArray(source.knownFacts),
    unknowns,
    limits,
    unknownsFromCoverage: normalizeEvidenceStringArray(source.unknownsFromCoverage),
    limitsFromCoverage: normalizeEvidenceStringArray(source.limitsFromCoverage),
    sourceRefs: sources.length ? sources : inlineSource,
    sources: sources.length ? sources : inlineSource,
    usage: source.usage ? normalizeEvidenceUsage(source.usage) : undefined,
    dataCutoffAt: typeof source.dataCutoffAt === 'string' ? source.dataCutoffAt : undefined,
    sourceSetHash: typeof source.sourceSetHash === 'string' ? source.sourceSetHash : undefined,
    coverage: source.coverage as EvidenceCoverageVO | string[] | string | undefined,
    warnings: normalizeEvidenceStringArray(source.warnings),
    confidenceLevel: normalizeEvidenceConfidence(source.confidenceLevel),
    fallback: normalizeOptionalEvidenceBoolean(source.fallback),
    fallbackReason: typeof source.fallbackReason === 'string' ? source.fallbackReason : undefined,
    stale: normalizeOptionalEvidenceBoolean(source.stale)
  }
}

export const normalizeEvidenceOverview = (value: unknown): EvidenceAssetOverviewEnvelopeVO => {
  const source = isRecord(value) ? value : {}
  const overviewSource = isRecord(source.overview) ? source.overview : source
  const readiness = extractItems<EvidenceAssetReadinessItemVO>(
    source.readiness || overviewSource.readiness || source.items
  ).map((item) => {
    const readinessItem = isRecord(item) ? item : {}
    return {
      ...readinessItem,
      assetType: typeof readinessItem.assetType === 'string' && readinessItem.assetType.trim()
        ? readinessItem.assetType.trim() as EvidenceAssetReadinessItemVO['assetType']
        : undefined,
      totalCount: toNumber(readinessItem.totalCount),
      versionedCount: toNumber(readinessItem.versionedCount),
      usedCount: toNumber(readinessItem.usedCount),
      resultCount: toNumber(readinessItem.resultCount),
      staleCount: toNumber(readinessItem.staleCount)
    }
  })
  const overview: EvidenceAssetOverviewVO = {
    assetCount: toNumber(overviewSource.assetCount ?? overviewSource.totalAssetCount),
    versionedAssetCount: toNumber(overviewSource.versionedAssetCount),
    usageCount: toNumber(overviewSource.usageCount),
    outcomeSampleCount: toNumber(overviewSource.outcomeSampleCount ?? overviewSource.resultCount),
    pendingCandidateCount: toNumber(overviewSource.pendingCandidateCount),
    readiness
  }
  return {
    ...normalizeEvidenceEnvelope<EvidenceAssetReadinessItemVO>({
      ...source,
      items: readiness
    }),
    overview
  }
}

export const getEvidenceAssetsOverviewApi = (params?: EvidenceAssetOverviewQueryDTO) =>
  request
    .get<unknown, unknown>('/evidence-assets/overview', { params: compactQueryParams(params) })
    .then(normalizeEvidenceOverview)

export const getEvidenceAssetUsagesApi = (params?: CareerEvidenceUsageQueryDTO) =>
  request
    .get<unknown, unknown>('/evidence-assets/usages', { params: compactQueryParams(params) })
    .then((value) => normalizeEvidenceEnvelope<CareerEvidenceUsageVO>(value, normalizeEvidenceUsage))

export const getEvidenceAssetResultsApi = (params?: CareerEvidenceUsageResultQueryDTO) =>
  request
    .get<unknown, unknown>('/evidence-assets/results', { params: compactQueryParams(params) })
    .then((value) => normalizeEvidenceEnvelope<CareerEvidenceUsageResultVO>(value, normalizeEvidenceUsageResult))

const usageCreatePayload = (data: CareerEvidenceUsageCreateDTO): CareerEvidenceUsageCreateDTO => ({
  assetType: data.assetType,
  assetId: data.assetId,
  assetVersion: data.assetVersion,
  ...(data.packageSnapshotId !== undefined ? { packageSnapshotId: data.packageSnapshotId } : {}),
  usageScene: data.usageScene,
  ...(data.usedAt !== undefined ? { usedAt: data.usedAt } : {}),
  ...(data.hypothesisId !== undefined ? { hypothesisId: data.hypothesisId } : {}),
  ...(data.variantId !== undefined ? { variantId: data.variantId } : {}),
  ...(data.assignmentId !== undefined ? { assignmentId: data.assignmentId } : {}),
  idempotencyKey: data.idempotencyKey
})

const resultWritePayload = (
  data: CareerEvidenceUsageResultWriteDTO
): CareerEvidenceUsageResultWriteDTO => ({
  eventType: data.eventType,
  eventId: data.eventId,
  outcomeCode: data.outcomeCode,
  ...(data.knownFacts !== undefined ? { knownFacts: data.knownFacts } : {}),
  ...(data.externalFeedbackText !== undefined
    ? { externalFeedbackText: data.externalFeedbackText }
    : {}),
  ...(data.userInterpretationText !== undefined
    ? { userInterpretationText: data.userInterpretationText }
    : {}),
  ...(data.unknowns !== undefined ? { unknowns: data.unknowns } : {}),
  ...(data.limits !== undefined ? { limits: data.limits } : {}),
  ...(data.occurredAt !== undefined ? { occurredAt: data.occurredAt } : {}),
  idempotencyKey: data.idempotencyKey
})

const resultCommandPayload = (
  data: CareerEvidenceUsageResultCommandDTO
): CareerEvidenceUsageResultCommandDTO => ({
  expectedLockVersion: data.expectedLockVersion,
  ...(data.outcomeCode !== undefined ? { outcomeCode: data.outcomeCode } : {}),
  ...(data.knownFacts !== undefined ? { knownFacts: data.knownFacts } : {}),
  ...(data.externalFeedbackText !== undefined
    ? { externalFeedbackText: data.externalFeedbackText }
    : {}),
  ...(data.userInterpretationText !== undefined
    ? { userInterpretationText: data.userInterpretationText }
    : {}),
  ...(data.unknowns !== undefined ? { unknowns: data.unknowns } : {}),
  ...(data.limits !== undefined ? { limits: data.limits } : {}),
  ...(data.occurredAt !== undefined ? { occurredAt: data.occurredAt } : {}),
  ...(data.reason !== undefined ? { reason: data.reason } : {}),
  idempotencyKey: data.idempotencyKey
})

export const createEvidenceUsageApi = (applicationId: number, data: CareerEvidenceUsageCreateDTO) =>
  request
    .post<CareerEvidenceUsageVO, CareerEvidenceUsageVO>(
      `/applications/${applicationId}/evidence-usages`,
      usageCreatePayload(data)
    )
    .then(normalizeEvidenceUsage)

export const getApplicationEvidenceUsagesApi = (
  applicationId: number,
  params?: CareerEvidenceUsageQueryDTO
) =>
  request
    .get<unknown, unknown>(`/applications/${applicationId}/evidence-usages`, {
      params: compactQueryParams(params)
    })
    .then((value) => normalizeEvidenceEnvelope<CareerEvidenceUsageVO>(value, normalizeEvidenceUsage))

export const getEvidenceUsageDetailApi = (usageId: number) =>
  request
    .get<CareerEvidenceUsageVO, CareerEvidenceUsageVO>(`/evidence-usages/${usageId}`)
    .then(normalizeEvidenceUsage)

export const createEvidenceUsageResultApi = (
  usageId: number,
  data: CareerEvidenceUsageResultWriteDTO
) =>
  request
    .post<CareerEvidenceUsageResultVO, CareerEvidenceUsageResultVO>(
      `/evidence-usages/${usageId}/results`,
      resultWritePayload(data)
    )
    .then(normalizeEvidenceUsageResult)

export const getEvidenceUsageResultsApi = (usageId: number) =>
  request
    .get<unknown, unknown>(`/evidence-usages/${usageId}/results`)
    .then((value) => normalizeEvidenceEnvelope<CareerEvidenceUsageResultVO>(value, normalizeEvidenceUsageResult))

export const confirmEvidenceUsageResultApi = (
  resultId: number,
  data: CareerEvidenceUsageResultCommandDTO
) =>
  request
    .post<CareerEvidenceUsageResultVO, CareerEvidenceUsageResultVO>(
      `/evidence-usage-results/${resultId}/confirm`,
      resultCommandPayload(data)
    )
    .then(normalizeEvidenceUsageResult)

export const correctEvidenceUsageResultApi = (
  resultId: number,
  data: CareerEvidenceUsageResultCommandDTO
) =>
  request
    .post<CareerEvidenceUsageResultVO, CareerEvidenceUsageResultVO>(
      `/evidence-usage-results/${resultId}/correct`,
      resultCommandPayload(data)
    )
    .then(normalizeEvidenceUsageResult)

export const voidEvidenceUsageResultApi = (
  resultId: number,
  data: CareerEvidenceUsageResultCommandDTO
) =>
  request
    .post<CareerEvidenceUsageResultVO, CareerEvidenceUsageResultVO>(
      `/evidence-usage-results/${resultId}/void`,
      resultCommandPayload(data)
    )
    .then(normalizeEvidenceUsageResult)
