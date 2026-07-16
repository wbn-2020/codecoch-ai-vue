import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('user base route redirects', () => {
  it('keeps route-safe base links on a real user destination', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/router/routes.ts'), 'utf8')

    expect(source).toContain("{ path: 'interviews', redirect: '/interviews/history'")
    expect(source).toContain("{ path: 'agent/runs', redirect: '/agent/today'")
  })
})
