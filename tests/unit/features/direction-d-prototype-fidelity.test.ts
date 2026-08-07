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

    expect(layout).toContain('class="arena-frame"')
    expect(layout).toContain('width: min(calc(100% - 28px), 1180px)')
    expect(layout).toContain('align-items: center')
    expect(layout).toContain('border-radius: 22px')
    expect(layout).toContain('v-if="!isImmersivePage"')
    expect(layout).toContain("class=\"jobcoach-main\"")
    expect(layout).toContain("'is-arena-main': usesArenaShell")
    expect(layout).toContain("document.body.classList.add('is-user-layout-active')")
    expect(layout).toContain("document.body.classList.remove('is-user-layout-active')")
    expect(layout).not.toContain('UserTopNav')

    for (const label of ['今天', '准备', '训练', '面试', '工具']) {
      expect(topNav, `primary navigation: ${label}`).toContain(label)
    }
    expect(topNav).toContain('arena-bottom-nav')
    expect(topNav).toContain('@media (max-width: 720px)')
    expect(topNav).toContain("@click=\"go('/tools')\"")

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

    for (const token of [
      '--arena-bg: #f5f7f4',
      '--arena-card: #ffffff',
      '--arena-ink: #15211b',
      '--arena-grn: #17b26a',
      '--arena-grn-d: #0e9f5d',
      '--arena-action: #0a8750',
      '--arena-action-hover: #087542',
      '--el-color-primary: #0a8750',
      '--el-color-primary-dark-2: #087542'
    ]) {
      expect(arena).toContain(token)
    }
    expect(arena).toContain('radial-gradient(900px 480px at 90% -5%')
  })

  it('keeps white text on Direction D primary actions readable', () => {
    const arena = readSource('src/styles/arena.scss')

    expect(arena).toContain('background: var(--arena-action);')
    expect(arena).toContain('--el-button-bg-color: var(--arena-action);')
    expect(arena).toContain('--user-primary: var(--arena-action);')
    expect(arena).toContain('--user-warning-text: #8a4b00;')
  })

  it('preserves the signed-off resume workbench and prototype tools layout without weakening mobile reflow', () => {
    const resume = readSource('src/views/resume/ResumeEditView.vue')
    const tools = readSource('src/views/tools/RecordsToolsView.vue')
    const userComponents = readSource('src/styles/user-components.scss')
    const layout = readSource('src/layouts/UserLayout.vue')
    const topNav = readSource('src/components/layout/ArenaTopNav.vue')
    const acceptanceEnv = readSource('.env.acceptance')
    const routes = readSource('src/router/routes.ts')

    // The user explicitly requested the preview in the middle and editing on the right.
    expect(resume).toContain(
      'grid-template-columns: 200px 360px minmax(0, 1fr)'
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
    expect(resume).toContain('grid-template-columns: 180px minmax(300px, 0.9fr) minmax(0, 1fr)')
    expect(resume).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(resume).toContain('A4 · 自动分页')

    // Direction D defines the tools page as a focused 760px single-column inventory.
    expect(tools).toContain('width: min(100%, 760px)')
    expect(tools).toContain('gap: 14px')
    expect(tools).toContain('@media (max-width: 720px)')
    expect(tools).toContain('背包与仓库 <span aria-hidden="true">🧰</span>')
    expect(tools).toContain(':data-tool-path="item.path"')
    expect(tools).toContain(':disabled="item.enabled === false"')
    expect(tools).toContain("appConfig.enableV4KnowledgePreview ? '私域资料与引用来源' : '当前环境暂未开放'")
    expect(tools).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(acceptanceEnv).toContain('VITE_ENABLE_V6_WEEKLY_REPORT=true')

    for (const toolRoute of [
      "path: 'applications'",
      "path: 'career-calendar'",
      "path: 'project-evidence'",
      "path: 'application-packages'",
      "path: 'knowledge'",
      "path: 'ability-map'",
      "path: 'agent/weekly-reports'",
      "path: 'analytics/personal'",
      "path: 'job-experiments'",
      "path: 'portfolio-demo'",
      "path: 'onboarding'"
    ]) {
      expect(routes, `tools entry route: ${toolRoute}`).toContain(toolRoute)
    }
    for (const routePrefix of [
      "'/applications'",
      "'/career-calendar'",
      "'/project-evidence'",
      "'/application-packages'",
      "'/knowledge'",
      "'/ability-map'",
      "'/agent/weekly-reports'",
      "'/analytics/personal'",
      "'/job-experiments'",
      "'/portfolio-demo'",
      "'/onboarding'"
    ]) {
      expect(topNav, `tools navigation ownership: ${routePrefix}`).toContain(routePrefix)
    }

    // Legacy workbench rules must not turn an arena page root into a grid.
    expect(userComponents).toContain('.page-shell:not(.arena)')
    expect(userComponents).toContain('.user-page-shell:not(.arena)')
    expect(layout).toContain('> :deep(.arena.page-shell)')
  })

  it('keeps extended tool destinations inside the Direction D reading column and mobile safe area', () => {
    const layout = readSource('src/layouts/UserLayout.vue')
    const agentToday = readSource('src/views/agent/AgentTodayView.vue')
    const interviewHistory = readSource('src/views/interview/InterviewHistoryView.vue')
    const evidenceList = readSource('src/views/project-evidence/ProjectEvidenceListView.vue')
    const evidenceDetail = readSource('src/views/project-evidence/ProjectEvidenceDetailView.vue')
    const evidenceEdit = readSource('src/views/project-evidence/ProjectEvidenceEditView.vue')

    expect(layout).toContain('width: min(100%, 1060px)')
    expect(layout).toContain('padding: 28px 34px 46px')
    expect(layout).toContain('padding: 18px 14px calc(84px + env(safe-area-inset-bottom, 0px))')
    expect(layout).toContain('> :deep(.page-shell.page-shell--wide)')
    expect(interviewHistory).toContain('class="interview-history-page page-shell page-shell--wide"')
    expect(agentToday).toContain('class="agent-page page-shell"')

    for (const source of [evidenceList, evidenceDetail, evidenceEdit]) {
      expect(source).toContain('border-radius: var(--arena-radius-card)')
    }
    expect(evidenceList).toContain('var(--arena-line)')
    expect(evidenceDetail).toContain('var(--arena-line)')
    expect(evidenceList).toContain('color: var(--user-warning-text)')
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
    expect(interview).toContain(
      '<button type="button" class="arena-btn arena-btn--sec" style="padding: 9px 15px'
    )
    expect(interview).toContain(
      '<button type="button" class="arena-btn arena-btn--pri" style="padding: 13px 24px'
    )
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

  it('keeps the interview-room finish path available on mobile and protects drafts when changing questions', () => {
    const room = readSource('src/views/interview/InterviewRoomView.vue')

    expect(room).toContain('handleReloadCurrentQuestion')
    expect(room).toContain('丢弃草稿并换题')
    expect(room).toContain('上一题未提交草稿已清除。')
    expect(room).toContain(':aria-label="canViewReport ? reportButtonText : \'结束并生成报告\'"')
    expect(room).toContain('width: 34px')
    expect(room).toContain("'identity actions'")
    expect(room).toContain("'progress progress'")
    expect(room).toContain('grid-area: progress;')
    expect(room).toContain('font-variant-numeric: tabular-nums;')
  })
})
