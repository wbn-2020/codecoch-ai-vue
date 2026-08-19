import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import {
  isAsyncOperationFailure,
  isAsyncOperationPending,
  resolveAsyncOperationState,
  type AsyncOperationState
} from '@/features/async-operation-state'

export const DAILY_PLAN_STATES = [
  'EMPTY',
  'PROCESSING',
  'FAILED',
  'ACTIVE',
  'COMPLETED',
  'NO_TODO'
] as const

export type DailyPlanState = (typeof DAILY_PLAN_STATES)[number]

export interface DailyPlanStateSnapshot {
  plan?: DailyPlanVO | null
  tasks?: AgentTaskVO[] | null
}

export interface DailyPlanStateResult {
  state: DailyPlanState
  operationState: AsyncOperationState
  totalCount: number
  doneCount: number
  actionableCount: number
  deferredCount: number
}

const normalize = (value?: string | null) => String(value || '').trim().toUpperCase()
const doneStatuses = new Set(['DONE', 'COMPLETED'])
const nonActionableStatuses = new Set([
  'DONE',
  'COMPLETED',
  'SKIPPED',
  'DEFERRED',
  'EXPIRED',
  'CANCELED',
  'CANCELLED'
])

export const resolveDailyPlanState = (
  snapshot?: DailyPlanStateSnapshot | null
): DailyPlanStateResult => {
  const plan = snapshot?.plan || null
  const tasks = snapshot?.tasks ?? plan?.tasks ?? []
  const operationState = resolveAsyncOperationState({
    executionStatus: plan?.executionStatus,
    status: plan?.status,
    consumable: plan?.consumable,
    deliveryQuality: plan?.deliveryQuality,
    fallback: plan?.fallback,
    hasExecution: Boolean(plan?.runId || plan?.executionId || plan?.idempotencyKey),
    hasReceipt: Boolean(
      plan?.asyncMessageId
      || plan?.asyncTraceId
      || plan?.asyncBizType
      || plan?.asyncReceiptStatus
    )
  })

  const doneCount = tasks.filter((task) => doneStatuses.has(normalize(task.status))).length
  const actionableCount = tasks.filter((task) => !nonActionableStatuses.has(normalize(task.status))).length
  const deferredCount = tasks.filter((task) =>
    ['SKIPPED', 'DEFERRED', 'EXPIRED', 'CANCELED', 'CANCELLED'].includes(normalize(task.status))
  ).length

  let state: DailyPlanState
  if (isAsyncOperationFailure(operationState)) {
    state = 'FAILED'
  } else if (isAsyncOperationPending(operationState)) {
    state = 'PROCESSING'
  } else if (tasks.length > 0 && actionableCount > 0) {
    state = 'ACTIVE'
  } else if (tasks.length > 0 && doneCount === tasks.length) {
    state = 'COMPLETED'
  } else if (tasks.length > 0) {
    state = 'NO_TODO'
  } else if (operationState === 'SUCCEEDED' || operationState === 'SUCCEEDED_DEGRADED') {
    state = 'FAILED'
  } else {
    state = 'EMPTY'
  }

  return {
    state,
    operationState,
    totalCount: tasks.length,
    doneCount,
    actionableCount,
    deferredCount
  }
}

export const dailyPlanStateLabel = (state: DailyPlanState) => ({
  EMPTY: '尚未生成',
  PROCESSING: '生成中',
  FAILED: '生成失败',
  ACTIVE: '进行中',
  COMPLETED: '已完成',
  NO_TODO: '无待推进任务'
})[state]
