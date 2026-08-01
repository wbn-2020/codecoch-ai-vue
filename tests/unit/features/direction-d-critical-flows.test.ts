import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const interviewRoom = readSource('src/views/interview/InterviewRoomView.vue')
const resumeMatch = readSource('src/views/v3/ResumeMatchView.vue')
const resumePrepare = readSource('src/views/resume/ArenaPrepareView.vue')
const resumeEditor = readSource('src/views/resume/ResumeEditView.vue')

describe('direction D critical flows', () => {
  it('keeps a text answer path available in the compact interview room', () => {
    const compactRoomStyles = interviewRoom.slice(interviewRoom.lastIndexOf('@media (max-width: 720px)'))

    expect(compactRoomStyles).toMatch(/\.answer-console\s*\{[\s\S]*?display:\s*block/)
    expect(compactRoomStyles).toContain(':deep(.answer-console .el-textarea__inner)')
    expect(compactRoomStyles).not.toMatch(/\.answer-console\s*\{\s*display:\s*none/)
  })

  it('preserves an explicit new-match entry instead of redirecting it to history', () => {
    expect(resumePrepare).toMatch(
      /path:\s*'\/resume-match',[\s\S]*?query:\s*\{[\s\S]*?new:\s*1/
    )
    expect(resumeMatch).toContain('if (isNewMatchEntry.value) return')
    expect(resumeMatch).toContain('const hasScopedEntry')
    expect(resumeMatch).toContain('item.resumeId === routeResumeId.value')
    expect(resumeMatch).toContain('item.targetJobId === routeTargetJobId')
  })

  it('mounts the resume workspace panes in left-to-right keyboard order', () => {
    expect(resumeEditor).toContain('id="resume-panel-advice-mount"')
    expect(resumeEditor).toContain('id="resume-panel-preview-mount"')
    expect(resumeEditor).toContain('<Teleport defer to="#resume-panel-advice-mount">')
    expect(resumeEditor).toContain('<Teleport defer to="#resume-panel-preview-mount">')
    expect(resumeEditor).toContain('.workspace-teleport-target {\n  display: contents;')
  })
})
