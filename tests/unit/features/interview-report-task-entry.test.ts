import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/views/agent/AgentTaskListView.vue'),
  'utf8'
)

describe('interview report async task entry', () => {
  it('uses the interview session identity and never reportId as the route id', () => {
    expect(source).toContain('payload?.sessionId ?? payload?.interviewId')
    expect(source).toContain('const sessionId = getInterviewSessionId(task)')
    expect(source).toContain('`/interviews/${sessionId}/report`')
    expect(source).not.toMatch(/interview\.report[\s\S]{0,240}reportId[\s\S]{0,120}\/report/)
  })
})
