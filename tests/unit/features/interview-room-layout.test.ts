import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('interview room responsive layout', () => {
  it('keeps the question area usable at standard desktop viewports', () => {
    const viewPath = resolve(process.cwd(), 'src/views/interview/InterviewRoomView.vue')
    const source = readFileSync(viewPath, 'utf8')

    expect(source).not.toContain('@media (max-width: 1280px)')
    expect(source).toContain('@media (max-width: 960px)')
    expect(source).toMatch(/\.conversation-scroll\s*\{[\s\S]*?min-height:\s*160px;/)
    expect(source).toMatch(/\.answer-console\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/)
  })
})
