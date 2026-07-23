import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { createStableOperationIdempotencyKey } from '@/utils/idempotency'

describe('V9 stable idempotency keys', () => {
  it('uses canonical object ordering and a SHA-256 payload digest', () => {
    const first = createStableOperationIdempotencyKey('evidence-result', {
      outcomeCode: 'UNKNOWN',
      knownFacts: [],
      limits: ['单一样本不能归因']
    })
    const reordered = createStableOperationIdempotencyKey('evidence-result', {
      limits: ['单一样本不能归因'],
      knownFacts: [],
      outcomeCode: 'UNKNOWN'
    })
    const expectedDigest = createHash('sha256')
      .update('{"knownFacts":[],"limits":["单一样本不能归因"],"outcomeCode":"UNKNOWN"}')
      .digest('hex')

    expect(first).toBe(reordered)
    expect(first).toBe(`evidence-result:${expectedDigest}`)
    expect(first.split(':').at(-1)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('separates different payloads that collided under the previous 32-bit hash', () => {
    const first = createStableOperationIdempotencyKey('evidence-result', 'payload-162789')
    const second = createStableOperationIdempotencyKey('evidence-result', 'payload-379192')

    expect(first).not.toBe(second)
  })

  it('preserves array order while keeping repeated payloads stable', () => {
    const payload = { knownFacts: ['先收到回复', '再进入面试'] }

    expect(createStableOperationIdempotencyKey('evidence-result', payload)).toBe(
      createStableOperationIdempotencyKey('evidence-result', payload)
    )
    expect(createStableOperationIdempotencyKey('evidence-result', payload)).not.toBe(
      createStableOperationIdempotencyKey('evidence-result', {
        knownFacts: ['再进入面试', '先收到回复']
      })
    )
  })
})
