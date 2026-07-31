import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const acceptanceEnv = () => {
  const content = fs.readFileSync(path.resolve(process.cwd(), '.env.acceptance'), 'utf8')
  return new Map(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1)] as const
      })
  )
}

describe('acceptance feature configuration', () => {
  it('enables the full V7 workspace and V8 campaign cockpit surface', () => {
    const env = acceptanceEnv()

    expect(env.get('VITE_ENABLE_V7_CAMPAIGN_WORKSPACE')).toBe('true')
    expect(env.get('VITE_ENABLE_V8_CAMPAIGN_COCKPIT')).toBe('true')
    expect(env.get('VITE_ENABLE_V8_CAMPAIGN_PULSE')).toBe('true')
    expect(env.get('VITE_ENABLE_V8_CAMPAIGN_PLAN')).toBe('true')
    expect(env.get('VITE_ENABLE_V8_CAMPAIGN_PORTFOLIO')).toBe('true')
    expect(env.get('VITE_ENABLE_V8_CAMPAIGN_EXPORT')).toBe('true')
  })
})
