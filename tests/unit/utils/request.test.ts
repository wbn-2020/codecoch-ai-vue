import { describe, expect, it } from 'vitest'

import { isDemoReadOnlyWriteWhitelisted } from '@/utils/request'

describe('request demo read-only whitelist', () => {
  it('allows only controlled portfolio demo load and reset writes', () => {
    expect(isDemoReadOnlyWriteWhitelisted('/portfolio-demo/load')).toBe(true)
    expect(isDemoReadOnlyWriteWhitelisted('/portfolio-demo/reset')).toBe(true)
    expect(isDemoReadOnlyWriteWhitelisted('https://api.example.test/portfolio-demo/load?demoFlag=true')).toBe(true)
    expect(isDemoReadOnlyWriteWhitelisted('/agent/tasks/1/start')).toBe(false)
    expect(isDemoReadOnlyWriteWhitelisted('/agent/tasks/1/start?next=/portfolio-demo/load')).toBe(false)
  })
})
