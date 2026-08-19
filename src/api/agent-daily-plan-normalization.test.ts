import { describe, expect, it } from 'vitest'

import { normalizeDailyPlan } from './agent'

describe('daily plan API normalization', () => {
  it('keeps a registered execution non-empty before tasks are persisted', () => {
    expect(normalizeDailyPlan({
      asyncReceiptStatus: 'run_registered',
      executionStatus: 'pending',
      tasks: []
    })).toMatchObject({
      asyncReceiptStatus: 'RUN_REGISTERED',
      executionStatus: 'PENDING',
      empty: false
    })
  })

  it('normalizes execution delivery fields without inventing consumability', () => {
    expect(normalizeDailyPlan({
      status: 'success',
      executionStatus: 'succeeded_degraded',
      deliveryQuality: 'degraded',
      executionSource: 'mq',
      consumable: true,
      tasks: [{ id: 1, status: 'todo' }]
    })).toMatchObject({
      status: 'SUCCESS',
      executionStatus: 'SUCCEEDED_DEGRADED',
      deliveryQuality: 'DEGRADED',
      executionSource: 'MQ',
      consumable: true,
      empty: false,
      tasks: [{ id: 1, status: 'TODO' }]
    })

    expect(normalizeDailyPlan({ tasks: [] }).consumable).toBeUndefined()
  })

  it('only derives empty when no lifecycle evidence exists or the backend explicitly marks it', () => {
    expect(normalizeDailyPlan({ tasks: [] }).empty).toBe(true)
    expect(normalizeDailyPlan({ runId: 9, status: 'FAILED', tasks: [] }).empty).toBe(false)
    expect(normalizeDailyPlan({ runId: 9, status: 'RUNNING', empty: true, tasks: [] }).empty).toBe(true)
  })
})
