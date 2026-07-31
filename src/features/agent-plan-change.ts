import type {
  AgentPlanChangeConfirmVO,
  AgentPlanChangeItemVO,
  AgentPlanChangePreviewVO,
  AgentPlanChangeRequestIdentity,
  AgentPlanChangeStatus,
  AgentPlanChangeTaskOriginFields,
  AgentPlanChangeWeekItemOriginFields,
  AgentReviewPlanDecisionSummaryVO,
  AgentReviewPlanFields,
  AgentReviewPlanSuggestionListVO,
  AgentReviewPlanSuggestionVO
} from '@/types/agentPlanChange'
import { formatLocalDate } from '@/utils/format'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

export type AgentPlanChangeGroupKey = 'ADD' | 'REMOVE' | 'RESCHEDULE' | 'PRIORITY' | 'OTHER'

export interface AgentPlanChangeItemGroup {
  key: AgentPlanChangeGroupKey
  title: string
  description: string
  items: AgentPlanChangeItemVO[]
}

export interface AgentPlanChangeStatusPresentation {
  label: string
  type: 'success' | 'warning' | 'danger' | 'info'
}

export interface AgentPlanChangeResolvedOrigin {
  reviewId?: number
  reviewDate?: string
  changeType?: string
  changeSetId?: number
  itemId?: number
}

interface AgentReviewPlanSeed extends AgentReviewPlanFields {
  id: number
  reviewDate?: string
}

interface AgentReviewDateRef {
  id: number
  reviewDate?: string
}

const normalizeCode = (value?: string | null) => String(value || '').trim().toUpperCase()

const planChangeGroups: Array<Omit<AgentPlanChangeItemGroup, 'items'>> = [
  {
    key: 'ADD',
    title: '新增',
    description: '新增任务或把未完成任务保留到目标日期。'
  },
  {
    key: 'REMOVE',
    title: '移除',
    description: '仅从计划中移出仍处于开放状态的任务。'
  },
  {
    key: 'RESCHEDULE',
    title: '延后',
    description: '保留原任务历史，并在目标日期创建承接任务。'
  },
  {
    key: 'PRIORITY',
    title: '优先级',
    description: '只调整开放任务的优先级。'
  }
]

const changeTypeLabels: Record<string, string> = {
  ADD_TASK: '新增任务',
  CARRY_OVER_TASK: '保留到下一日',
  REMOVE_OPEN_TASK: '移出计划',
  RESCHEDULE_TASK: '延后任务',
  CHANGE_PRIORITY: '调整优先级'
}

const warningLabels: Record<string, string> = {
  LOW_CONFIDENCE_REVIEW: '来源证据较弱，需人工复核',
  LOW_CONFIDENCE_SINGLE_CHANGE: '弱调整仅允许一项实际变更',
  ALL_JOB_SCOPE: '本次变更影响全部目标岗位范围',
  NET_TIME_OVER_60: '计划净新增时间超过 60 分钟',
  HIGH_PRIORITY_REMOVAL: '本次变更会移出高优先级任务',
  DEADLINE_RESCHEDULE: '本次变更会延后有明确时限的任务'
}

const confidenceLabels: Record<string, string> = {
  HIGH: '高置信度',
  MEDIUM: '中等置信度',
  LOW: '低置信度',
  INSUFFICIENT: '证据不足'
}

const statusPresentations: Record<string, AgentPlanChangeStatusPresentation> = {
  PREVIEW_READY: { label: '差异预览待确认', type: 'info' },
  STALE: { label: '计划已变化，需要重新预览', type: 'warning' },
  CANCELLED: { label: '预览已取消', type: 'info' },
  CONFIRMED_WAITING_PLAN: { label: '已确认，等待计划生成', type: 'warning' },
  APPLYING: { label: '正在确认写入计划', type: 'info' },
  APPLIED: { label: '复盘调整已应用', type: 'success' },
  PARTIALLY_APPLIED: { label: '复盘调整部分已应用', type: 'warning' },
  APPLY_FAILED: { label: '已确认调整应用失败', type: 'danger' }
}

export const AGENT_TODAY_PLAN_CHANGE_STATUSES: AgentPlanChangeStatus[] = [
  'CONFIRMED_WAITING_PLAN',
  'APPLYING',
  'APPLIED',
  'PARTIALLY_APPLIED',
  'APPLY_FAILED',
  'STALE'
]

export const getAgentPlanChangeTypeLabel = (value?: string | null) =>
  changeTypeLabels[normalizeCode(value)] || '计划变更'

export const getAgentPlanConfidenceLabel = (value?: string | null) =>
  confidenceLabels[normalizeCode(value)] || '置信度待确认'

export const getAgentPlanChangeWarningLabel = (value?: string | null) => {
  const code = normalizeCode(value)
  if (!code) return '需要人工确认的风险'
  return warningLabels[code] || (/[\u4e00-\u9fff]/.test(String(value)) ? String(value) : `需要确认：${code}`)
}

export const getAgentPlanChangeStatusPresentation = (
  value?: string | null
): AgentPlanChangeStatusPresentation =>
  statusPresentations[normalizeCode(value)] || { label: '计划变更状态待确认', type: 'info' }

export const summarizeAgentReviewPlanSuggestions = (
  suggestions?: AgentReviewPlanSuggestionVO[]
): AgentReviewPlanDecisionSummaryVO => {
  const summary: Required<AgentReviewPlanDecisionSummaryVO> = {
    pendingCount: 0,
    acceptedCount: 0,
    ignoredCount: 0,
    supersededCount: 0
  }
  for (const suggestion of suggestions || []) {
    switch (normalizeCode(suggestion.decisionStatus)) {
      case 'ACCEPTED':
        summary.acceptedCount += 1
        break
      case 'IGNORED':
        summary.ignoredCount += 1
        break
      case 'SUPERSEDED':
        summary.supersededCount += 1
        break
      default:
        summary.pendingCount += 1
    }
  }
  return summary
}

export const buildAgentReviewPlanSuggestionList = (
  review: AgentReviewPlanSeed
): AgentReviewPlanSuggestionListVO => {
  const suggestions = Array.isArray(review.planSuggestions) ? review.planSuggestions : []
  const latestSuggestionVersion = suggestions.reduce(
    (latest, item) => Math.max(latest, item.reviewVersion || 0),
    0
  )
  const reviewVersion = review.reviewVersion || latestSuggestionVersion || 1
  return {
    reviewId: review.id,
    reviewVersion,
    reviewDate: review.reviewDate,
    sourceSnapshotHash: review.sourceSnapshotHash,
    suggestions,
    decisionSummary: review.planDecisionSummary || summarizeAgentReviewPlanSuggestions(suggestions)
  }
}

export const getCurrentAgentReviewPlanSuggestions = (
  data?: AgentReviewPlanSuggestionListVO | null
) => {
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
  if (!suggestions.length) return []
  const reviewVersion = data?.reviewVersion
    || suggestions.reduce((latest, item) => Math.max(latest, item.reviewVersion || 0), 0)
  return reviewVersion
    ? suggestions.filter((item) => !item.reviewVersion || item.reviewVersion === reviewVersion)
    : suggestions
}

export const getAcceptedAgentReviewPlanSuggestionIds = (
  data?: AgentReviewPlanSuggestionListVO | null
) =>
  getCurrentAgentReviewPlanSuggestions(data)
    .filter((item) =>
      normalizeCode(item.decisionStatus) === 'ACCEPTED'
      && item.actionable !== false
    )
    .map((item) => item.id)

export const isWeakAgentPlanSuggestion = (
  suggestion?: AgentReviewPlanSuggestionVO | null
) =>
  Boolean(
    suggestion?.fallback
    || ['LOW', 'INSUFFICIENT'].includes(normalizeCode(suggestion?.confidenceLevel))
  )

export const hasWeakAgentPlanSuggestions = (
  data?: AgentReviewPlanSuggestionListVO | null
) => getCurrentAgentReviewPlanSuggestions(data).some(isWeakAgentPlanSuggestion)

const groupKeyForChangeType = (value?: string | null): AgentPlanChangeGroupKey => {
  switch (normalizeCode(value)) {
    case 'ADD_TASK':
    case 'CARRY_OVER_TASK':
      return 'ADD'
    case 'REMOVE_OPEN_TASK':
      return 'REMOVE'
    case 'RESCHEDULE_TASK':
      return 'RESCHEDULE'
    case 'CHANGE_PRIORITY':
      return 'PRIORITY'
    default:
      return 'OTHER'
  }
}

export const groupAgentPlanChangeItems = (
  items?: AgentPlanChangeItemVO[]
): AgentPlanChangeItemGroup[] => {
  const grouped = new Map<AgentPlanChangeGroupKey, AgentPlanChangeItemVO[]>()
  for (const item of items || []) {
    const key = groupKeyForChangeType(item.changeType)
    grouped.set(key, [...(grouped.get(key) || []), item])
  }
  const result = planChangeGroups.map((group) => ({
    ...group,
    items: grouped.get(group.key) || []
  }))
  const otherItems = grouped.get('OTHER') || []
  if (otherItems.length) {
    result.push({
      key: 'OTHER',
      title: '其他',
      description: '后端返回的其他受支持计划差异。',
      items: otherItems
    })
  }
  return result
}

export const getAgentPlanChangeWarningCodes = (
  preview?: AgentPlanChangePreviewVO | null
) =>
  Array.from(new Set([
    ...(preview?.warnings || []),
    ...(preview?.items || []).flatMap((item) => item.warnings || [])
  ].map((item) => String(item || '').trim()).filter(Boolean)))

export const isAgentPlanChangePreviewExpired = (
  preview?: AgentPlanChangePreviewVO | null,
  now = Date.now()
) => {
  if (!preview?.expiresAt) return false
  const expiresAt = new Date(preview.expiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= now
}

export const canConfirmAgentPlanChange = (
  preview?: AgentPlanChangePreviewVO | null,
  acknowledgedWarningCodes: string[] = [],
  now = Date.now()
) => {
  if (!preview || normalizeCode(preview.status) !== 'PREVIEW_READY') return false
  if (preview.confirmable === false || (preview.blockers || []).length > 0) return false
  if (isAgentPlanChangePreviewExpired(preview, now)) return false
  const acknowledged = new Set(acknowledgedWarningCodes)
  return getAgentPlanChangeWarningCodes(preview).every((code) => acknowledged.has(code))
}

export const isWeakAgentPlanChangePreview = (
  preview?: AgentPlanChangePreviewVO | null
) =>
  Boolean(
    preview?.fallback
    || (preview?.items || []).some((item) =>
      item.fallback
      || ['LOW', 'INSUFFICIENT'].includes(normalizeCode(item.confidenceLevel))
    )
  )

export const createAgentPlanChangeRequestIdentity = (
  operation: string
): AgentPlanChangeRequestIdentity => ({
  requestId: createOperationIdempotencyKey(`agent-plan-change:${operation}:request`),
  idempotencyKey: createOperationIdempotencyKey(`agent-plan-change:${operation}`)
})

export const createSingleFlight = <T>() => {
  let active: Promise<T> | null = null
  return {
    run(factory: () => Promise<T>) {
      if (active) return active
      let current: Promise<T>
      current = Promise.resolve()
        .then(factory)
        .finally(() => {
          if (active === current) active = null
        })
      active = current
      return current
    },
    isRunning() {
      return active !== null
    }
  }
}

const parseLocalDate = (value?: string) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

export const getDefaultAgentPlanChangeTargetDate = (
  reviewDate?: string,
  now: Date = new Date()
) => {
  const today = startOfLocalDay(now)
  const sourceDate = parseLocalDate(reviewDate)
  const target = sourceDate && sourceDate >= today ? new Date(sourceDate) : today
  if (sourceDate && sourceDate >= today) {
    target.setDate(target.getDate() + 1)
  }
  return formatLocalDate(target)
}

const knownPlanChangeErrorCodes = [
  'PLAN_SUGGESTION_NOT_ACTIONABLE',
  'PLAN_CHANGE_WARNING_NOT_ACKNOWLEDGED',
  'PLAN_CHANGE_FORBIDDEN',
  'PLAN_CHANGE_NOT_FOUND',
  'PLAN_CHANGE_PREVIEW_STALE',
  'PLAN_CHANGE_ALREADY_DECIDED',
  'PLAN_CHANGE_CONFIRM_IN_PROGRESS',
  'IDEMPOTENCY_KEY_REUSED',
  'PLAN_CHANGE_VALIDATION_FAILED',
  'PLAN_CHANGE_TEMPORARILY_UNAVAILABLE'
] as const

const errorRecord = (error: unknown) =>
  error && typeof error === 'object' ? error as Record<string, unknown> : {}

const nestedErrorRecord = (error: unknown, key: string) => {
  const value = errorRecord(error)[key]
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

const planChangeErrorTexts = (error: unknown) => {
  const record = errorRecord(error)
  const response = nestedErrorRecord(error, 'response')
  const responseData = nestedErrorRecord(response, 'data')
  return [
    error instanceof Error ? error.message : '',
    record.message,
    record.failureCode,
    typeof record.code === 'string' ? record.code : '',
    responseData.message,
    responseData.failureCode,
    typeof responseData.code === 'string' ? responseData.code : ''
  ].map((item) => String(item || '').trim()).filter(Boolean)
}

export const getAgentPlanChangeErrorCode = (error: unknown) => {
  const texts = planChangeErrorTexts(error)
  return knownPlanChangeErrorCodes.find((code) =>
    texts.some((text) => text.toUpperCase().includes(code))
  )
}

export const getAgentPlanChangeErrorMessage = (
  error: unknown,
  fallback = '计划变更请求失败，请稍后重试。'
) => {
  const message = planChangeErrorTexts(error)
    .find((text) => /[\u4e00-\u9fff]/.test(text))
  if (!message) return fallback
  return knownPlanChangeErrorCodes.reduce(
    (text, code) => text.replace(new RegExp(`^${code}[：:]?\\s*`, 'i'), ''),
    message
  ) || fallback
}

export const getAgentPlanChangeHttpStatus = (error: unknown) => {
  const record = errorRecord(error)
  const response = nestedErrorRecord(error, 'response')
  const status = response.status ?? record.status
  return typeof status === 'number' ? status : undefined
}

export const isAgentPlanChangeConflictError = (error: unknown) => {
  const code = getAgentPlanChangeErrorCode(error)
  return getAgentPlanChangeHttpStatus(error) === 409
    || [
      'PLAN_CHANGE_PREVIEW_STALE',
      'PLAN_CHANGE_ALREADY_DECIDED',
      'PLAN_CHANGE_CONFIRM_IN_PROGRESS',
      'IDEMPOTENCY_KEY_REUSED'
    ].includes(String(code || ''))
}

export const shouldRecoverAgentPlanConfirmByQuery = (error: unknown) => {
  const record = errorRecord(error)
  const code = String(record.code || '').toUpperCase()
  const message = planChangeErrorTexts(error).join(' ').toLowerCase()
  return ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(code)
    || /timeout|timed out|network error|确认请求正在处理/.test(message)
    || getAgentPlanChangeErrorCode(error) === 'PLAN_CHANGE_CONFIRM_IN_PROGRESS'
}

export const mergeAgentPlanChangeConfirmResult = (
  preview: AgentPlanChangePreviewVO,
  result: AgentPlanChangeConfirmVO
): AgentPlanChangePreviewVO => ({
  ...preview,
  status: result.status || preview.status,
  confirmedAt: result.confirmedAt || preview.confirmedAt,
  appliedAt: result.appliedAt || preview.appliedAt,
  confirmable: normalizeCode(result.status) === 'PREVIEW_READY'
})

export const countAppliedAgentPlanChangeItems = (
  changeSet?: AgentPlanChangePreviewVO | null
) =>
  (changeSet?.items || []).filter((item) =>
    ['APPLIED', 'SKIPPED_DUPLICATE'].includes(normalizeCode(item.applyStatus))
  ).length

export const sortAgentPlanChangeSets = (
  changeSets?: AgentPlanChangePreviewVO[]
) => {
  const priority: Record<string, number> = {
    APPLY_FAILED: 0,
    STALE: 1,
    PARTIALLY_APPLIED: 2,
    CONFIRMED_WAITING_PLAN: 3,
    APPLYING: 4,
    APPLIED: 5
  }
  return [...(changeSets || [])].sort((left, right) =>
    (priority[normalizeCode(left.status)] ?? 99) - (priority[normalizeCode(right.status)] ?? 99)
    || String(right.confirmedAt || right.appliedAt || '').localeCompare(String(left.confirmedAt || left.appliedAt || ''))
    || (right.changeSetId || 0) - (left.changeSetId || 0)
  )
}

const reviewDateFor = (
  reviewId: number | undefined,
  reviews?: AgentReviewDateRef[]
) => reviews?.find((review) => review.id === reviewId)?.reviewDate

export const resolveAgentTaskPlanChangeOrigin = (
  task: AgentPlanChangeTaskOriginFields,
  changeSets?: AgentPlanChangePreviewVO[],
  reviews?: AgentReviewDateRef[]
): AgentPlanChangeResolvedOrigin | null => {
  const itemId = task.planChangeItemId == null ? undefined : Number(task.planChangeItemId)
  const confirmed = Boolean(
    task.userConfirmed
    || normalizeCode(task.planOriginType) === 'REVIEW_CONFIRMED'
    || itemId
  )
  if (!confirmed) return null
  const changeSet = (changeSets || []).find((candidate) =>
    (candidate.items || []).some((item) => item.id === itemId)
    || (task.planOriginId != null && candidate.changeSetId === Number(task.planOriginId))
  )
  const item = (changeSet?.items || []).find((candidate) => candidate.id === itemId)
  const reviewId = item?.sourceReviewId || changeSet?.reviewId
  return {
    reviewId,
    reviewDate: reviewDateFor(reviewId, reviews),
    changeType: item?.changeType,
    changeSetId: changeSet?.changeSetId || (task.planOriginId == null ? undefined : Number(task.planOriginId)),
    itemId
  }
}

export const resolveAgentWeekPlanChangeOrigin = (
  item: AgentPlanChangeWeekItemOriginFields,
  changeSets?: AgentPlanChangePreviewVO[],
  reviews?: AgentReviewDateRef[]
): AgentPlanChangeResolvedOrigin | null => {
  const itemId = item.planChangeItemId == null ? undefined : Number(item.planChangeItemId)
  if (!item.reviewConfirmed && !itemId && !item.sourceReviewId) return null
  const changeSet = (changeSets || []).find((candidate) =>
    (candidate.items || []).some((changeItem) => changeItem.id === itemId)
  )
  const changeItem = (changeSet?.items || []).find((candidate) => candidate.id === itemId)
  const reviewId = item.sourceReviewId || changeItem?.sourceReviewId || changeSet?.reviewId
  return {
    reviewId: reviewId == null ? undefined : Number(reviewId),
    reviewDate: reviewDateFor(reviewId == null ? undefined : Number(reviewId), reviews),
    changeType: item.reviewChangeType || changeItem?.changeType,
    changeSetId: changeSet?.changeSetId,
    itemId
  }
}
