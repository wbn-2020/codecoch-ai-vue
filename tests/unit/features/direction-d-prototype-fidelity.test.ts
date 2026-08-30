import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const directionDPages = [
  ['登录', 'src/views/auth/LoginView.vue', 'class="arena login-page"', '示例成长面板预览'],
  ['今天', 'src/views/user/ArenaHomeView.vue', 'class="arena arena-home"', 'arena-home__task'],
  ['准备', 'src/views/resume/ArenaPrepareView.vue', 'class="arena arena-prepare"', 'arena-prepare__workspace'],
  ['简历工坊', 'src/views/resume/ResumeEditView.vue', 'class="arena resume-workbench-page resume-editor page-shell"', '<ResumeWorkbenchShell'],
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

  it('keeps the redesigned user shell, navigation and route metadata explicit', () => {
    const layout = readSource('src/layouts/UserLayout.vue')
    const appShell = readSource('src/components/layout/UserAppShell.vue')
    const sidebar = readSource('src/components/layout/UserSidebar.vue')
    const navigation = readSource('src/config/userNavigation.ts')
    const routes = readSource('src/router/routes.ts')
    const theme = readSource('src/styles/user-theme.scss')

    expect(layout).toContain('<UserAppShell')
    expect(layout).toContain('<CommandPalette v-if="!isImmersivePage" v-model="commandPaletteOpen" scope="user" />')
    expect(layout).toContain('v-if="!isImmersivePage"')
    expect(layout).toContain("class=\"jobcoach-main\"")
    expect(layout).toContain("document.body.classList.add('is-user-layout-active')")
    expect(layout).toContain("document.body.classList.remove('is-user-layout-active')")
    expect(layout).toContain("document.body.classList.toggle('user-overlay-theme', !immersive)")
    expect(layout).not.toContain('ArenaTopNav')
    expect(appShell).toContain('class="user-app-shell"')
    expect(appShell).toContain('<UserSidebar :collapsed="isSidebarCollapsed" :badges="sidebarBadges" />')
    expect(appShell).toContain("localStorage.setItem(storageKey, collapsed ? '1' : '0')")
    expect(appShell).toContain('useDocumentScrollLock(mobileOpen)')
    expect(sidebar).toContain("from '@/config/userNavigation'")

    for (const label of ['今日', '简历准备', '岗位匹配', '面试训练', '模拟面试', '投递管理', '求职资料', '成长分析']) {
      expect(navigation, `primary navigation: ${label}`).toContain(`label: '${label}'`)
    }
    expect(navigation).toContain("path: '/tools'")

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
      '.jobcoach-layout.is-user-redesign',
      // v21 · Quiet Luxury：暖中性画布 + 深墨绿主色（文档相关/原型/v21-visual-brief.md）
      '--user-bg: #f6f6f4',
      '--user-sidebar-bg: #ffffff',
      '--user-primary: #1f6f5c',
      '--user-ai: #6f5c93',
      '--el-color-primary: #1f6f5c',
      'body.user-overlay-theme'
    ]) {
      expect(theme).toContain(token)
    }
  })

  it('keeps white text on Direction D primary actions readable', () => {
    const arena = readSource('src/styles/arena.scss')

    // v21 · Quiet Luxury：主按钮改同色相微渐变，白字对比度不变（#1F6F5C 深墨绿）
    expect(arena).toContain('background: var(--arena-grad-accent);')
    expect(arena).toContain('--el-button-bg-color: var(--arena-action);')
    expect(arena).toContain('--user-primary: var(--arena-action);')
    expect(arena).toContain('--user-warning-text: #8e520a;')
  })

  it('preserves the signed-off resume workbench and prototype tools layout without weakening mobile reflow', () => {
    const resume = readSource('src/views/resume/ResumeEditView.vue')
    const resumeShell = readSource('src/views/resume/components/ResumeWorkbenchShell.vue')
    const tools = readSource('src/views/tools/RecordsToolsView.vue')
    const userComponents = readSource('src/styles/user-components.scss')
    const layout = readSource('src/layouts/UserLayout.vue')
    const navigation = readSource('src/config/userNavigation.ts')
    const acceptanceEnv = readSource('.env.acceptance')
    const routes = readSource('src/router/routes.ts')

    // Resume workbench v2 keeps the A4 canvas central and the contextual editor on the right.
    expect(resumeShell).toContain('--workbench-rail-width: 220px')
    expect(resumeShell).toContain('--workbench-editor-width: 420px')
    expect(resume).toContain('<ResumeSectionRail')
    expect(resume).toContain('<ResumeWorkbenchTopbar')
    expect(resume).toContain('<ResumeTemplateBrowser')
    expect(resumeShell).toMatch(/\.resume-workbench-layout > :deep\(\.resume-workbench-pane--preview\)\s*\{[\s\S]*?grid-column:\s*2;/)
    expect(resumeShell).toMatch(/\.resume-workbench-layout > :deep\(\.resume-workbench-pane--editor\),\s*[\s\S]*?\.resume-workbench-layout > :deep\(\.resume-workbench-pane--inspector\)\s*\{[\s\S]*?grid-column:\s*3;/)
    expect(resume).toContain('label="背景"')
    expect(resume).toContain('label="技术决策"')
    expect(resume).toContain('label="量化结果"')
    expect(resume).toContain('class="resume-preview-actions"')
    expect(resume).toContain('handleSaveInlineProject')
    expect(resume).toContain('openPdfExport')
    expect(resume).toContain('@media (max-width: 1260px)')
    expect(resumeShell).toContain('@media (max-width: 1260px)')
    expect(resumeShell).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.resume-workbench-layout\s*\{[\s\S]*?display:\s*block;/)
    expect(resume).toContain('A4 预览 · 分页以导出为准')
    expect(layout).toContain("'is-resume-workbench-page': isResumeWorkbench")
    expect(layout).toContain("'is-resume-workbench-main': isResumeWorkbench")
    expect(routes).toContain("layoutMode: 'resume-workbench'")

    // The tools page keeps the Direction D inventory and adds a wider operational summary.
    expect(tools).toContain('width: min(100%, 1180px)')
    expect(tools).toContain('gap: 14px')
    expect(tools).toContain('@media (max-width: 720px)')
    expect(tools).toContain('求职资料与工具')
    expect(tools).toContain(':data-tool-path="item.path"')
    expect(tools).toContain(':disabled="item.enabled === false"')
    expect(tools).toContain("appConfig.enableV4KnowledgePreview ? '私域资料与引用来源' : '当前环境暂未开放'")
    expect(tools).toContain('class="arena-tools__operations"')
    expect(tools).toContain('最近产物')
    expect(tools).toContain('异常状态')
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
      expect(navigation, `navigation ownership: ${routePrefix}`).toContain(routePrefix)
    }

    // Legacy workbench rules must not turn an arena page root into a grid.
    expect(userComponents).toContain('.page-shell:not(.arena)')
    expect(userComponents).toContain('.user-page-shell:not(.arena)')
    expect(layout).toContain('> :deep(.arena:not(.interview-room))')
  })

  it('keeps extended tool destinations inside the Direction D reading column and mobile safe area', () => {
    const layout = readSource('src/layouts/UserLayout.vue')
    const agentToday = readSource('src/views/agent/AgentTodayView.vue')
    const interviewHistory = readSource('src/views/interview/InterviewHistoryView.vue')
    const evidenceList = readSource('src/views/project-evidence/ProjectEvidenceListView.vue')
    const evidenceDetail = readSource('src/views/project-evidence/ProjectEvidenceDetailView.vue')
    const evidenceEdit = readSource('src/views/project-evidence/ProjectEvidenceEditView.vue')

    expect(layout).toContain('width: min(100%, 1440px)')
    expect(layout).toContain('padding: 28px 32px 46px')
    expect(layout).toContain('padding: 18px 14px calc(32px + env(safe-area-inset-bottom, 0px))')
    expect(layout).toContain('> :deep(.page-shell.page-shell--wide)')
    expect(interviewHistory).toContain('class="interview-history-page page-shell page-shell--wide cc-module-page"')
    expect(agentToday).toContain('class="agent-page page-shell"')

    for (const source of [evidenceList, evidenceDetail, evidenceEdit]) {
      expect(source).toContain('border-radius: var(--arena-radius-card)')
    }
    expect(evidenceList).toContain('var(--arena-line)')
    expect(evidenceDetail).toContain('var(--arena-line)')
    expect(evidenceList).toContain('color: var(--user-warning-text)')
  })

  it('keeps interview creation as the prototype four-mode launch screen', () => {
    const interview = readSource('src/views/interview/ArenaInterviewCreateView.vue')

    expect(interview).toContain('第 1 步 · 选择模拟形式')
    expect(interview).toContain('开始一场模拟面试</h1>')
    expect(interview).toContain('选择适合当前目标的场景，完成后将生成面试复盘报告。')
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
