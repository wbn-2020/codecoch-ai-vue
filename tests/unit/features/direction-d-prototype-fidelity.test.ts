import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const directionDPages = [
  ['登录', 'src/views/auth/LoginView.vue', 'class="arena login-page"', '示例成长面板预览'],
  ['今天', 'src/views/user/ArenaHomeView.vue', 'class="arena arena-home"', 'arena-home__boss'],
  ['准备', 'src/views/resume/ArenaPrepareView.vue', 'class="arena arena-prepare"', 'arena-prepare__workspace'],
  ['简历工坊', 'src/views/resume/ResumeEditView.vue', 'class="arena arena-resume-studio resume-editor page-shell"', 'editor-workspace'],
  ['JD 匹配进入页', 'src/views/v3/ResumeMatchView.vue', 'class="arena arena-match v3-page match-entry-page"', 'match-entry-grid'],
  ['JD 匹配结算页', 'src/views/v3/ResumeMatchDetailView.vue', 'class="arena arena-match-detail v3-page"', 'arena-match-settlement'],
  ['训练', 'src/views/question/ArenaTrainView.vue', 'class="arena arena-train"', 'arena-train__preview-card'],
  ['答题间', 'src/views/question/QuestionPracticeSessionView.vue', 'class="arena arena-practice practice-session-page page-shell"', 'practice-question-card'],
  ['面试创建', 'src/views/interview/ArenaInterviewCreateView.vue', 'class="arena arena-iv"', 'arena-iv__dungeons'],
  ['面试房间', 'src/views/interview/InterviewRoomView.vue', 'class="interview-room arena-room"', 'room-topbar'],
  ['面试报告', 'src/views/interview/InterviewReportView.vue', 'class="arena arena-report interview-report page-shell"', 'settlement-card'],
  ['能力图谱', 'src/views/ability-map/AbilityMapView.vue', 'class="arena arena-ability ability-map page-shell"', 'ability-tree-layout'],
  ['工具', 'src/views/tools/RecordsToolsView.vue', 'class="arena arena-tools records-tools-page page-shell"', 'arena-tools__group']
] as const

describe('Direction D prototype fidelity contracts', () => {
  it('maps every Direction D route surface to the Direction D visual shell', () => {
    for (const [name, path, rootClass, primaryStructure] of directionDPages) {
      const source = readSource(path)

      expect(source, `${name}: arena root`).toContain(rootClass)
      expect(source, `${name}: primary structure`).toContain(primaryStructure)
    }
  })

  it('keeps the shared arena shell, navigation and route metadata explicit', () => {
    const layout = readSource('src/layouts/UserLayout.vue')
    const topNav = readSource('src/components/layout/ArenaTopNav.vue')
    const routes = readSource('src/router/routes.ts')
    const arena = readSource('src/styles/arena.scss')

    expect(layout).toContain("v-if=\"usesArenaOverlayTheme && !isImmersivePage\"")
    expect(layout).toContain("class=\"jobcoach-main\"")
    expect(layout).toContain("'is-arena-main': usesArenaOverlayTheme")

    for (const label of ['今天', '准备', '训练', '面试', '工具']) {
      expect(topNav, `primary navigation: ${label}`).toContain(label)
    }
    expect(topNav).toContain('arena-bottom-nav')
    expect(topNav).toContain('@media (max-width: 720px)')

    for (const route of [
      "path: 'dashboard'",
      "path: 'resumes'",
      "path: 'resumes/create'",
      "path: 'resume-match'",
      "path: 'questions/recommendations'",
      "path: 'questions/practice'",
      "path: 'interviews/create'",
      "path: 'interviews/:id/report'",
      "path: 'ability-map'",
      "path: 'tools'"
    ]) {
      expect(routes, route).toContain(route)
    }
    expect(routes).toContain("path: 'interviews/room/:id'")
    expect(routes).toContain('immersive: true')

    for (const token of ['--arena-bg: #f5f7f4', '--arena-card: #ffffff', '--arena-ink: #15211b']) {
      expect(arena).toContain(token)
    }
    expect(arena).toContain('radial-gradient(900px 480px at 90% -5%')
  })

  it('preserves the signed-off resume and tools layout exceptions without weakening mobile reflow', () => {
    const resume = readSource('src/views/resume/ResumeEditView.vue')
    const tools = readSource('src/views/tools/RecordsToolsView.vue')

    // The user explicitly requested the preview in the middle and editing on the right.
    expect(resume).toContain(
      'grid-template-columns: minmax(180px, 0.72fr) minmax(390px, 1.15fr) minmax(440px, 1.28fr)'
    )
    expect(resume).toContain('.preview-column {\n    grid-column: 2;')
    expect(resume).toContain('.editor-main {\n    grid-column: 3;')
    expect(resume).toContain('label="背景"')
    expect(resume).toContain('label="技术决策"')
    expect(resume).toContain('label="量化结果"')
    expect(resume).toContain('class="resume-preview-actions"')
    expect(resume).toContain('handleSaveInlineProject')
    expect(resume).toContain('openPdfExport')
    expect(resume).toContain('@media (max-width: 1020px)')
    expect(resume).toContain('grid-template-columns: minmax(0, 1.2fr) minmax(150px, 0.8fr)')
    expect(resume).toContain('A4 · 自动分页')

    // The user explicitly requested desktop groups in two columns, with mobile retaining one column.
    expect(tools).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(tools).toContain('@media (max-width: 720px)')
    expect(tools).toContain('grid-template-columns: 1fr')
    expect(tools).toContain('背包与仓库 <span aria-hidden="true">🧰</span>')
    expect(tools).toContain('border-radius: 20px')
  })

  it('keeps interview creation as the prototype four-dungeon launch screen', () => {
    const interview = readSource('src/views/interview/ArenaInterviewCreateView.vue')

    expect(interview).toContain('第 1 步 · 选副本')
    expect(interview).toContain('今晚打哪个副本？ <span aria-hidden="true">🎤</span>')
    expect(interview).toContain('完成任意一场 +200 XP，计入「3 场模拟面试」Offer 清单。')
    expect(interview).toContain('grid-template-columns: repeat(2, 1fr)')
    expect(interview).toContain('min-height: 150px')
    expect(interview).toContain('border-radius: var(--arena-radius-card)')
    expect(interview).toContain('class="arena-iv__selection-summary"')
  })

  it('keeps every non-room Direction D page responsive and the interview room independently immersive', () => {
    for (const [name, path] of directionDPages) {
      const source = readSource(path)

      if (name === '面试房间') {
        expect(source).toContain('--room-bg: #101513')
        expect(source).toContain('@media (max-width: 720px)')
        continue
      }

      expect(source, `${name}: mobile reflow`).toMatch(/@media\s*\(max-width:\s*(?:[5-9]\d{2}|1\d{3})px\)/)
    }
  })
})
