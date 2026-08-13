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
const interviewReport = readSource('src/views/interview/InterviewReportView.vue')
const questionDetail = readSource('src/views/question/QuestionTrainingDetailView.vue')
const tools = readSource('src/views/tools/RecordsToolsView.vue')
const applicationWorkspace = readSource('src/views/v4/application-workspace/ApplicationWorkspaceView.vue')
const campaignCockpit = readSource('src/views/v8/campaign-cockpit/CampaignCockpitView.vue')

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

  it('does not expose report-only recommendations as actionable buttons', () => {
    expect(interviewReport).toContain(':disabled="!item.questionId"')
    expect(interviewReport).toContain(':aria-disabled="!item.questionId"')
  })

  it('keeps direct question links inside the question-bank flow', () => {
    expect(questionDetail).toContain('@click="goBackToQuestionBank"')
    expect(questionDetail).toContain("void router.push('/questions')")
    expect(questionDetail).not.toContain('router.back()')
  })

  it('keeps gated tool entries readable when a feature is unavailable', () => {
    expect(tools).toContain('filter: none;')
    expect(tools).toContain('color: var(--arena-ink);')
    expect(tools).toContain('color: var(--user-warning-text);')
    expect(tools).toContain(':disabled="item.enabled === false"')
    expect(tools).toContain('if (item.enabled === false) return')
  })

  it('keeps the ability-map entry action aligned with the Direction D prototype', () => {
    expect(tools).toContain('<span class="arena-tools__enter">进入 ›</span>')
    expect(tools).toMatch(
      /\.arena-tools__enter\s*\{[\s\S]*?color:\s*var\(--arena-grn-d\);[\s\S]*?font-size:\s*13px;[\s\S]*?font-weight:\s*800;/
    )
  })

  it('keeps task status tags valid for unknown backend states', () => {
    const studyPlans = readSource('src/views/study/StudyPlanView.vue')

    expect(studyPlans).toMatch(
      /const taskStatusType = \(status\?: string\) => \{[\s\S]*?if \(value === 'SKIPPED'\) return 'info'[\s\S]*?return 'info'/
    )
  })

  it('guards backend-provided workspace links before rendering or navigating', () => {
    for (const source of [applicationWorkspace, campaignCockpit]) {
      expect(source).toContain("from '@/features/route-safety'")
      expect(source).toContain('resolveAppRoutePath')
      expect(source).toContain('defaultUserKnownPaths')
    }
  })
})
