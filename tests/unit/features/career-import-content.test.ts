import { describe, expect, it } from 'vitest'

import { sha256Bytes } from '@/features/career-import-content'

describe('career import content hash', () => {
  it('produces the standard SHA-256 digest without relying on secure-context Web Crypto', () => {
    expect(sha256Bytes(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
})
