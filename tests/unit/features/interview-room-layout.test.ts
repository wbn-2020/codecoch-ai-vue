import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('interview room responsive layout', () => {
  it('keeps the question area usable at standard desktop viewports', () => {
    const viewPath = resolve(process.cwd(), 'src/views/interview/InterviewRoomView.vue')
    const source = readFileSync(viewPath, 'utf8')

    expect(source).not.toContain('@media (max-width: 1280px)')
    expect(source).toContain('@media (max-width: 960px)')
    expect(source).toMatch(/WAITING_ANSWER:\s*'等待作答'/)
    // 聊天式布局：问题流是主滚动区（flex 主导 + min-height:0），回答台固定底部独立滚动
    expect(source).toMatch(/\.conversation-scroll\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/)
    expect(source).toMatch(/\.answer-console\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?overflow-y:\s*auto;/)
    expect(source).toContain('class="question-briefbar"')
    expect(source).toContain('剩余 / 建议时间')
    expect(source).toMatch(/\.question-briefbar\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
    expect(source).toMatch(/@media \(max-width:\s*420px\)[\s\S]*?\.voice-preview__actions[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(source).toContain("v-if=\"current.status !== 'NOT_STARTED' && !canViewReport\"")
  })
})
