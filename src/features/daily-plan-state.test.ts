import { describe, expect, it } from 'vitest'

import {
  createAsyncOperationScope,
  isAsyncOperationTerminal,
  isCurrentAsyncOperationResponse,
  preferTerminalAsyncOperationSnapshot,
  resolveAsyncOperationState,
  shouldPollAsyncOperation
} from './async-operation-state'
import { resolveDailyPlanState } from './daily-plan-state'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'

const task = (id: number, status: string): AgentTaskVO => ({ id, status })
const plan = (partial: Partial<DailyPlanVO>): DailyPlanVO => partial

describe('async operation state', () => {
  it.each([
    [{}, 'NOT_STARTED'],
    [{ hasReceipt: true }, 'WAITING'],
    [{ status: 'PENDING' }, 'WAITING'],
    [{ status: 'RUNNING' }, 'PROCESSING'],
    [{ status: 'GENERATING' }, 'PROCESSING'],
    [{ status: 'PARSING' }, 'PROCESSING'],
    [{ status: 'REPORT_GENERATING' }, 'PROCESSING'],
    [{ status: 'WAIT_CONFIRM', consumable: true }, 'SUCCEEDED'],
    [{ status: 'ACTIVE', consumable: true }, 'SUCCEEDED'],
    [{ status: 'SUCCESS', consumable: true }, 'SUCCEEDED'],
    [{ status: 'SUCCESS', consumable: true, deliveryQuality: 'DEGRADED' }, 'SUCCEEDED_DEGRADED'],
    [{ executionStatus: 'SUCCEEDED_DEGRADED', consumable: true }, 'SUCCEEDED_DEGRADED'],
    [{ status: 'SUCCESS', consumable: false }, 'FAILED_FINAL'],
    [{ status: 'FAILED' }, 'FAILED_RETRYABLE'],
    [{ executionStatus: 'FAILED_FINAL' }, 'FAILED_FINAL'],
    [{ status: 'CANCELED' }, 'CANCELLED']
  ])('maps %o to %s', (input, expected) => {
    expect(resolveAsyncOperationState(input)).toBe(expected)
  })

  it('only polls non-terminal executions', () => {
    expect(shouldPollAsyncOperation({ status: 'GENERATING', hasExecution: true })).toBe(true)
    expect(shouldPollAsyncOperation({ status: 'SUCCESS', consumable: true })).toBe(false)
    expect(shouldPollAsyncOperation({ status: 'FAILED' })).toBe(false)
    expect(isAsyncOperationTerminal(resolveAsyncOperationState({
      status: 'SUCCESS',
      consumable: true
    }))).toBe(true)
  })

  it('rejects late responses from a different execution while accepting legacy resource-scoped responses', () => {
    const expected = createAsyncOperationScope('resume.parse', 42, {
      asyncMessageId: 'message-current',
      asyncTraceId: 'trace-current'
    })

    expect(isCurrentAsyncOperationResponse(expected, createAsyncOperationScope('resume.parse', 42))).toBe(true)
    expect(isCurrentAsyncOperationResponse(expected, createAsyncOperationScope('resume.parse', 42, {
      asyncMessageId: 'message-current',
      asyncTraceId: 'trace-current'
    }))).toBe(true)
    expect(isCurrentAsyncOperationResponse(expected, createAsyncOperationScope('resume.parse', 42, {
      asyncMessageId: 'message-older'
    }))).toBe(false)
    expect(isCurrentAsyncOperationResponse(expected, createAsyncOperationScope('resume.parse', 43))).toBe(false)
  })

  it('preserves a terminal snapshot against stale pending refreshes for the same execution', () => {
    const completed = {
      executionId: 'execution-42',
      asyncMessageId: 'message-42',
      status: 'COMPLETED'
    }

    expect(preferTerminalAsyncOperationSnapshot(completed, {
      executionId: 'execution-42',
      asyncMessageId: 'message-42',
      status: 'RUNNING'
    })).toBe(completed)

    expect(preferTerminalAsyncOperationSnapshot(completed, {
      executionId: 'execution-43',
      asyncMessageId: 'message-43',
      status: 'RUNNING'
    })).toEqual(expect.objectContaining({ executionId: 'execution-43', status: 'RUNNING' }))
  })
})

describe('daily plan state matrix', () => {
  it.each([
    ['no plan and no tasks', undefined, [], 'EMPTY'],
    ['registered execution', plan({ asyncReceiptStatus: 'RUN_REGISTERED' }), [], 'PROCESSING'],
    ['running execution with stale tasks', plan({ status: 'RUNNING', runId: 9 }), [task(1, 'DONE')], 'PROCESSING'],
    ['failed execution with stale tasks', plan({ executionStatus: 'FAILED_RETRYABLE', runId: 9 }), [task(1, 'DONE')], 'FAILED'],
    ['cancelled execution', plan({ executionStatus: 'CANCELLED', runId: 9 }), [], 'FAILED'],
    ['active task', plan({ status: 'SUCCESS', consumable: true }), [task(1, 'TODO')], 'ACTIVE'],
    ['all tasks completed', plan({ status: 'SUCCESS', consumable: true }), [task(1, 'DONE'), task(2, 'DONE')], 'COMPLETED'],
    ['all tasks skipped or deferred', plan({ status: 'SUCCESS', consumable: true }), [task(1, 'SKIPPED'), task(2, 'DEFERRED')], 'NO_TODO'],
    ['mixed completed and deferred tasks', plan({ status: 'SUCCESS', consumable: true }), [task(1, 'DONE'), task(2, 'DEFERRED')], 'NO_TODO'],
    ['successful run without output', plan({ status: 'SUCCESS', consumable: true, runId: 9 }), [], 'FAILED'],
    ['legacy false success', plan({ status: 'SUCCESS', consumable: false, runId: 9 }), [], 'FAILED']
  ])('%s resolves to %s', (_label, dailyPlan, tasks, expected) => {
    expect(resolveDailyPlanState({ plan: dailyPlan, tasks }).state).toBe(expected)
  })

  it('never treats a zero-task plan as completed', () => {
    expect(resolveDailyPlanState({
      plan: plan({ status: 'SUCCESS', consumable: true, runId: 9 }),
      tasks: []
    }).state).not.toBe('COMPLETED')
  })
})
