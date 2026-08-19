export const ASYNC_OPERATION_STATES = [
  'NOT_STARTED',
  'WAITING',
  'PROCESSING',
  'SUCCEEDED',
  'SUCCEEDED_DEGRADED',
  'FAILED_RETRYABLE',
  'FAILED_FINAL',
  'CANCELLED'
] as const

export type AsyncOperationState = (typeof ASYNC_OPERATION_STATES)[number]

export interface AsyncOperationSnapshot {
  executionStatus?: string | null
  status?: string | null
  consumable?: boolean | null
  deliveryQuality?: string | null
  fallback?: boolean | null
  hasExecution?: boolean
  hasReceipt?: boolean
  executionId?: string | null
  generationToken?: string | null
  asyncMessageId?: string | null
  asyncTraceId?: string | null
}

export interface AsyncOperationScope {
  resourceType: string
  resourceId: string | number
  executionId?: string | null
  generationToken?: string | null
  asyncMessageId?: string | null
  asyncTraceId?: string | null
}

const normalize = (value?: string | null) => String(value || '').trim().toUpperCase()

const waitingStatuses = new Set([
  'PENDING',
  'QUEUED',
  'WAITING',
  'ACCEPTED',
  'CREATED',
  'INITIALIZED',
  'RUN_REGISTERED',
  'MQ_ACCEPTED'
])

const processingStatuses = new Set([
  'RUNNING',
  'PROCESSING',
  'IN_PROGRESS',
  'RETRYING',
  'GENERATING',
  'PARSING',
  'REPORT_GENERATING'
])

const successStatuses = new Set([
  'SUCCESS',
  'SUCCEEDED',
  'COMPLETED',
  'FINISHED',
  'GENERATED',
  'ACTIVE',
  'PARSED',
  'WAIT_CONFIRM'
])

const retryableFailureStatuses = new Set([
  'FAILED',
  'FAIL',
  'ERROR',
  'FAILED_RETRYABLE'
])

const finalFailureStatuses = new Set([
  'FAILED_FINAL',
  'DEAD',
  'DEAD_LETTER',
  'UNSCORABLE',
  'NOT_SCORABLE',
  'INSUFFICIENT_SAMPLE',
  'SAMPLE_INSUFFICIENT'
])

export const resolveAsyncOperationState = (
  snapshot?: AsyncOperationSnapshot | null
): AsyncOperationState => {
  if (!snapshot) return 'NOT_STARTED'

  const status = normalize(snapshot.executionStatus) || normalize(snapshot.status)
  const hasExecution = Boolean(snapshot.hasExecution || snapshot.hasReceipt)

  if (!status) return hasExecution ? 'WAITING' : 'NOT_STARTED'
  if (waitingStatuses.has(status)) return 'WAITING'
  if (processingStatuses.has(status)) return 'PROCESSING'
  if (status === 'CANCELED' || status === 'CANCELLED') return 'CANCELLED'
  if (retryableFailureStatuses.has(status)) return 'FAILED_RETRYABLE'
  if (finalFailureStatuses.has(status)) return 'FAILED_FINAL'

  if (status === 'SUCCEEDED_DEGRADED') {
    return snapshot.consumable === false ? 'FAILED_FINAL' : 'SUCCEEDED_DEGRADED'
  }

  if (successStatuses.has(status)) {
    if (snapshot.consumable === false) return 'FAILED_FINAL'
    const degraded = snapshot.fallback === true || normalize(snapshot.deliveryQuality) === 'DEGRADED'
    return degraded ? 'SUCCEEDED_DEGRADED' : 'SUCCEEDED'
  }

  return hasExecution ? 'FAILED_RETRYABLE' : 'NOT_STARTED'
}

export const isAsyncOperationFailure = (state: AsyncOperationState) =>
  state === 'FAILED_RETRYABLE' || state === 'FAILED_FINAL' || state === 'CANCELLED'

export const isAsyncOperationPending = (state: AsyncOperationState) =>
  state === 'WAITING' || state === 'PROCESSING'

export const isAsyncOperationTerminal = (state: AsyncOperationState) =>
  state === 'SUCCEEDED'
  || state === 'SUCCEEDED_DEGRADED'
  || state === 'FAILED_RETRYABLE'
  || state === 'FAILED_FINAL'
  || state === 'CANCELLED'

export const shouldPollAsyncOperation = (snapshot?: AsyncOperationSnapshot | null) =>
  isAsyncOperationPending(resolveAsyncOperationState(snapshot))

const normalizedScopeValue = (value?: string | number | null) => String(value || '').trim()
const correlationFields: Array<keyof Pick<
  AsyncOperationScope,
  'executionId' | 'generationToken' | 'asyncMessageId' | 'asyncTraceId'
>> = ['executionId', 'generationToken', 'asyncMessageId', 'asyncTraceId']

const isSameAsyncOperation = (
  current: AsyncOperationSnapshot,
  received: AsyncOperationSnapshot
) => correlationFields.every((field) => {
  const currentValue = normalizedScopeValue(current[field])
  const receivedValue = normalizedScopeValue(received[field])
  return !currentValue || !receivedValue || currentValue === receivedValue
})

export const preferTerminalAsyncOperationSnapshot = <T extends AsyncOperationSnapshot>(
  current?: T | null,
  received?: T | null
): T | null | undefined => {
  if (!current || !received || !isSameAsyncOperation(current, received)) return received
  const currentState = resolveAsyncOperationState(current)
  const receivedState = resolveAsyncOperationState(received)
  return isAsyncOperationTerminal(currentState) && !isAsyncOperationTerminal(receivedState)
    ? current
    : received
}

export const createAsyncOperationScope = (
  resourceType: string,
  resourceId: string | number,
  snapshot?: Omit<AsyncOperationScope, 'resourceType' | 'resourceId'>
): AsyncOperationScope => ({
  resourceType,
  resourceId,
  executionId: snapshot?.executionId,
  generationToken: snapshot?.generationToken,
  asyncMessageId: snapshot?.asyncMessageId,
  asyncTraceId: snapshot?.asyncTraceId
})

/**
 * Reject a response for an older execution while allowing legacy responses
 * that only expose the stable business resource identifier.
 */
export const isCurrentAsyncOperationResponse = (
  expected?: AsyncOperationScope | null,
  received?: AsyncOperationScope | null
) => {
  if (!expected || !received) return false
  if (
    normalizedScopeValue(expected.resourceType) !== normalizedScopeValue(received.resourceType)
    || normalizedScopeValue(expected.resourceId) !== normalizedScopeValue(received.resourceId)
  ) {
    return false
  }

  return correlationFields.every((field) => {
    const expectedValue = normalizedScopeValue(expected[field])
    const receivedValue = normalizedScopeValue(received[field])
    return !expectedValue || !receivedValue || expectedValue === receivedValue
  })
}
