import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const interviewRoom = readSource('src/views/interview/InterviewRoomView.vue')
const resumeMatch = readSource('src/views/v3/ResumeMatchView.vue')
const resumePrepare = readSource('src/views/resume/ArenaPrepareView.vue')
const resumeEditor = readSource('src/views/resume/ResumeEditView.vue')
const abilityMap = readSource('src/views/ability-map/AbilityMapView.vue')
const arenaInterviewCreate = readSource('src/views/interview/ArenaInterviewCreateView.vue')

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

  it('resolves the default match landing to the latest successful report before showing the new-match workspace', () => {
    expect(resumeMatch).toContain('const entryResolved = ref(false)')
    expect(resumeMatch).toContain('v-if="!entryResolved || redirectingToLatestReport"')
    expect(resumeMatch).toContain('const waitForLatestReportDecision = async () =>')
    expect(resumeMatch).toContain('window.setTimeout(() => resolve(false), 5000)')
    expect(resumeMatch).toContain('const redirected = await waitForLatestReportDecision()')
    expect(resumeMatch).toContain('if (!redirected) {\n    entryResolved.value = true')
  })

  it('mounts the resume workspace panes in left-to-right keyboard order', () => {
    expect(resumeEditor).toContain('id="resume-panel-advice-mount"')
    expect(resumeEditor).toContain('id="resume-panel-preview-mount"')
    expect(resumeEditor).toContain('<Teleport defer to="#resume-panel-advice-mount">')
    expect(resumeEditor).toContain('<Teleport defer to="#resume-panel-preview-mount">')
    expect(resumeEditor).toContain('.workspace-teleport-target {\n  display: contents;')
  })

  it('keeps every skill node itself tappable for training in the skill tree', () => {
    expect(abilityMap).toContain('class="ability-node"')
    expect(abilityMap).toContain('@click="startSkillTraining(skill)"')
    expect(abilityMap).toMatch(/\.ability-node\s*\{[\s\S]*?cursor:\s*pointer/)
  })

  it('does not move users away from the start action after choosing a normal dungeon', () => {
    expect(arenaInterviewCreate).toMatch(
      /const selectDungeon = \(item: ModeCard\) => \{[\s\S]*?selectMode\(item\)[\s\S]*?if \(item\.industry\) \{[\s\S]*?scrollToConfig\(\)[\s\S]*?\}/
    )
  })
})
