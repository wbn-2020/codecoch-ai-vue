import type {
  CareerAttributionOutcomeType,
  CareerAttributionPresentation,
  CareerCalendarEventVO,
  CareerExperimentAssignmentVO,
  CareerExperimentAttributionVO,
  CareerExperimentCohortVO,
  CareerExperimentHypothesisVO,
  CareerExperimentVariantAttributionVO,
  CareerExperimentVariantVO,
  CareerImportPreviewVO,
  CareerImportResultVO,
  CareerImportRowVO
} from '@/types/careerGrowth'

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : value == null ? fallback : String(value)

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const asBoolean = (value: unknown) =>
  value === true || value === 1 || String(value).toLowerCase() === 'true'

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const asStringArray = (value: unknown): string[] =>
  asArray(value).map((item) => asString(item).trim()).filter(Boolean)

const normalizeAttributionOutcomeType = (
  value: unknown
): CareerAttributionOutcomeType | undefined => {
  const normalized = asString(value).trim().toUpperCase()
  if (normalized === 'POSITIVE_RESPONSE') return 'POSITIVE_RESPONSE'
  if (normalized === 'INTERVIEW') return 'INTERVIEW'
  if (normalized === 'OFFER') return 'OFFER'
  return undefined
}

const normalizePrimaryMetric = (value: unknown): CareerAttributionOutcomeType => {
  const raw = asString(value).trim()
  if (!raw) return 'INTERVIEW'
  const normalized = normalizeAttributionOutcomeType(raw)
  if (normalized) return normalized
  throw new Error(`Unsupported career attribution outcome type: ${raw.toUpperCase()}`)
}

export const normalizeCareerVariant = (value: unknown): CareerExperimentVariantVO => {
  const item = asRecord(value)
  return {
    id: asNumber(item.id),
    variantCode: asString(item.variantCode),
    name: asString(item.name),
    description: asString(item.description) || undefined,
    treatment: asRecord(item.treatment),
    allocationWeight: asNumber(item.allocationWeight, 1),
    control: asBoolean(item.control)
  }
}

export const normalizeCareerCohort = (value: unknown): CareerExperimentCohortVO => {
  const item = asRecord(value)
  return {
    id: asNumber(item.id),
    hypothesisId: asNumber(item.hypothesisId),
    name: asString(item.name),
    jobFamily: asString(item.jobFamily) || undefined,
    channel: asString(item.channel) || undefined,
    windowStart: asString(item.windowStart),
    windowEnd: asString(item.windowEnd),
    outcomeType: normalizeAttributionOutcomeType(item.outcomeType),
    minSamplePerVariant: item.minSamplePerVariant == null ? undefined : asNumber(item.minSamplePerVariant)
  }
}

export const normalizeCareerHypothesis = (value: unknown): CareerExperimentHypothesisVO => {
  const item = asRecord(value)
  return {
    id: asNumber(item.id),
    legacyExperimentId: item.legacyExperimentId == null ? undefined : asNumber(item.legacyExperimentId),
    name: asString(item.name),
    statement: asString(item.statement),
    primaryMetric: normalizePrimaryMetric(item.primaryMetric),
    status: asString(item.status) || undefined,
    attributionWindowDays: asNumber(item.attributionWindowDays, 14),
    minSamplePerVariant: asNumber(item.minSamplePerVariant, 10),
    variants: asArray(item.variants).map(normalizeCareerVariant),
    cohorts: asArray(item.cohorts).map(normalizeCareerCohort),
    createdAt: asString(item.createdAt) || undefined,
    updatedAt: asString(item.updatedAt) || undefined
  }
}

export const normalizeCareerAssignment = (value: unknown): CareerExperimentAssignmentVO => {
  const item = asRecord(value)
  return {
    id: asNumber(item.id),
    hypothesisId: asNumber(item.hypothesisId),
    variantId: asNumber(item.variantId),
    variantCode: asString(item.variantCode) || undefined,
    applicationId: asNumber(item.applicationId),
    assignmentKey: asString(item.assignmentKey) || undefined,
    assignmentMethod: asString(item.assignmentMethod) || undefined,
    assignedAt: asString(item.assignedAt) || undefined,
    jobFamily: asString(item.jobFamily) || undefined,
    channel: asString(item.channel) || undefined,
    timeBucket: asString(item.timeBucket) || undefined
  }
}

const normalizeVariantAttribution = (value: unknown): CareerExperimentVariantAttributionVO => {
  const item = asRecord(value)
  const optionalRate = (key: string) => item[key] == null ? undefined : asNumber(item[key])
  return {
    variantId: asNumber(item.variantId),
    variantCode: asString(item.variantCode) || undefined,
    control: asBoolean(item.control),
    assignedCount: asNumber(item.assignedCount),
    matureCount: asNumber(item.matureCount),
    commonStrataSampleCount: asNumber(item.commonStrataSampleCount),
    outcomeCount: asNumber(item.outcomeCount),
    rawRate: optionalRate('rawRate'),
    adjustedRate: optionalRate('adjustedRate'),
    adjustedLiftVsControl: optionalRate('adjustedLiftVsControl')
  }
}

export const normalizeCareerAttribution = (value: unknown): CareerExperimentAttributionVO => {
  const item = asRecord(value)
  return {
    snapshotId: item.snapshotId == null ? undefined : asNumber(item.snapshotId),
    hypothesisId: asNumber(item.hypothesisId),
    cohortId: asNumber(item.cohortId),
    asOf: asString(item.asOf) || undefined,
    method: asString(item.method) || undefined,
    comparable: asBoolean(item.comparable ?? item.comparableFlag),
    eligibleSampleCount: asNumber(item.eligibleSampleCount),
    immatureSampleCount: asNumber(item.immatureSampleCount),
    excludedMissingStrataCount: asNumber(item.excludedMissingStrataCount),
    commonStrataCount: asNumber(item.commonStrataCount),
    incomparableReasons: asStringArray(item.incomparableReasons),
    limitations: asStringArray(item.limitations),
    variants: asArray(item.variants).map(normalizeVariantAttribution)
  }
}

export const buildAttributionPresentation = (
  attribution?: CareerExperimentAttributionVO | null
): CareerAttributionPresentation => {
  if (!attribution) {
    return {
      level: 'INCOMPARABLE',
      title: '暂无归因快照',
      summary: '选择一个 cohort 后可计算归因；已生成的最近快照会在刷新后自动恢复。结果仅用于观察关联，不作为单因素因果证明。',
      facts: [],
      cautions: ['归因结果受样本量、分层一致性和归因窗口影响，请结合投递事实复核。']
    }
  }

  const facts = [
    `成熟可用样本 ${attribution.eligibleSampleCount} 条`,
    `未成熟样本 ${attribution.immatureSampleCount} 条`,
    `共同分层 ${attribution.commonStrataCount} 个`
  ]
  const cautions = [...attribution.incomparableReasons, ...attribution.limitations]

  if (!attribution.comparable) {
    return {
      level: 'INCOMPARABLE',
      title: '当前不可比较',
      summary: '样本或分层条件尚不足，不能判断某个变体更优。',
      facts,
      cautions: cautions.length ? cautions : ['后端未返回具体原因，请补充成熟样本后重试。']
    }
  }

  const hasAdjustedLift = attribution.variants.some((item) => item.adjustedLiftVsControl != null)
  return {
    level: hasAdjustedLift ? 'WEAK_OBSERVATION' : 'FACT',
    title: hasAdjustedLift ? '可形成弱观察' : '仅展示事实',
    summary: hasAdjustedLift
      ? '校正率和相对对照组变化可作为下一轮实验线索，但仍不代表因果关系。'
      : '当前仅能核对样本和结果事实，尚无可展示的校正提升。',
    facts,
    cautions: cautions.length ? cautions : ['结果是关联性分析，不作为单因素因果证明。']
  }
}

export const normalizeCareerCalendarEvent = (value: unknown): CareerCalendarEventVO => {
  const item = asRecord(value)
  return {
    id: asNumber(item.id),
    applicationId: item.applicationId == null ? undefined : asNumber(item.applicationId),
    title: asString(item.title),
    eventType: asString(item.eventType, 'FOLLOW_UP'),
    startsAt: asString(item.startsAt),
    endsAt: asString(item.endsAt),
    startsAtUtc: asString(item.startsAtUtc) || undefined,
    endsAtUtc: asString(item.endsAtUtc) || undefined,
    timezone: asString(item.timezone),
    allDay: asBoolean(item.allDay),
    location: asString(item.location) || undefined,
    description: asString(item.description) || undefined,
    status: asString(item.status, 'CONFIRMED'),
    sourceType: asString(item.sourceType) || undefined,
    sourceRef: asString(item.sourceRef) || undefined,
    externalUid: asString(item.externalUid) || undefined,
    importBatchId: item.importBatchId == null ? undefined : asNumber(item.importBatchId),
    createdAt: asString(item.createdAt) || undefined,
    updatedAt: asString(item.updatedAt) || undefined
  }
}

const normalizeImportRow = (value: unknown): CareerImportRowVO => {
  const item = asRecord(value)
  return {
    rowNumber: asNumber(item.rowNumber),
    disposition: asString(item.disposition) || undefined,
    errorCode: asString(item.errorCode) || undefined,
    errorMessage: asString(item.errorMessage) || undefined,
    applicationId: item.applicationId == null ? undefined : asNumber(item.applicationId),
    calendarEventId: item.calendarEventId == null ? undefined : asNumber(item.calendarEventId),
    raw: Object.fromEntries(
      Object.entries(asRecord(item.raw)).map(([key, entry]) => [key, asString(entry)])
    ),
    duplicateCandidates: asArray(item.duplicateCandidates).map((entry) => {
      const candidate = asRecord(entry)
      return {
        applicationId: asNumber(candidate.applicationId),
        companyName: asString(candidate.companyName) || undefined,
        jobTitle: asString(candidate.jobTitle) || undefined,
        appliedAt: asString(candidate.appliedAt) || undefined,
        reason: asString(candidate.reason) || undefined
      }
    })
  }
}

export const normalizeCareerImportPreview = (value: unknown): CareerImportPreviewVO => {
  const item = asRecord(value)
  return {
    format: asString(item.format),
    timezone: asString(item.timezone),
    headers: asStringArray(item.headers),
    suggestedMapping: Object.fromEntries(
      Object.entries(asRecord(item.suggestedMapping))
        .map(([field, header]) => [field, asString(header)])
        .filter(([, header]) => Boolean(header))
    ),
    supportedFields: asStringArray(item.supportedFields),
    totalCount: asNumber(item.totalCount),
    validCount: asNumber(item.validCount),
    errorCount: asNumber(item.errorCount),
    duplicateCount: asNumber(item.duplicateCount),
    rows: asArray(item.rows).map(normalizeImportRow)
  }
}

export const normalizeCareerImportResult = (value: unknown): CareerImportResultVO => {
  const item = asRecord(value)
  return {
    batchId: item.batchId == null ? undefined : asNumber(item.batchId),
    format: asString(item.format),
    status: asString(item.status) || undefined,
    totalCount: asNumber(item.totalCount),
    successCount: asNumber(item.successCount),
    errorCount: asNumber(item.errorCount),
    duplicateCount: asNumber(item.duplicateCount),
    rows: asArray(item.rows).map(normalizeImportRow)
  }
}

export const isCalendarEventOverdue = (event: CareerCalendarEventVO, now = new Date()) => {
  if (String(event.status).toUpperCase() === 'CANCELLED') return false
  if (!['FOLLOW_UP', 'INTERVIEW', 'THANK_YOU', 'OFFER_DEADLINE', 'REVIEW'].includes(String(event.eventType).toUpperCase())) {
    return false
  }
  const endsAt = new Date(event.endsAtUtc || event.endsAt)
  return Number.isFinite(endsAt.getTime()) && endsAt.getTime() < now.getTime()
}

const HYPOTHESIS_MAP_KEY = 'codecoachai:career-experiment-v2-map'

const readHypothesisMap = (): Record<string, number> => {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(HYPOTHESIS_MAP_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, number>
      : {}
  } catch {
    return {}
  }
}

export const saveExperimentHypothesisLink = (legacyExperimentId: number, hypothesisId: number) => {
  if (typeof localStorage === 'undefined' || !legacyExperimentId || !hypothesisId) return
  try {
    const links = readHypothesisMap()
    links[String(legacyExperimentId)] = hypothesisId
    localStorage.setItem(HYPOTHESIS_MAP_KEY, JSON.stringify(links))
  } catch {
    // The route query remains available even when browser storage is unavailable.
  }
}

export const resolveRouteHypothesisId = (routeValue?: unknown) => {
  const routeId = asNumber(Array.isArray(routeValue) ? routeValue[0] : routeValue)
  return routeId > 0 ? routeId : undefined
}

export const resolveStoredExperimentHypothesisId = (legacyExperimentId: number) =>
  readHypothesisMap()[String(legacyExperimentId)]

export const resolveExperimentHypothesisId = (
  legacyExperimentId: number,
  routeValue?: unknown
) => {
  return resolveRouteHypothesisId(routeValue) || resolveStoredExperimentHypothesisId(legacyExperimentId)
}
