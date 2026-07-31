import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { stripScopedStyleBlock } from '../helpers/scoped-style'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const withoutInterviewBattleStyleExtension = (source: string) => source.replace(
  /\/\/ ---- 副本战斗（游戏化增量样式，暗色霓虹） ----[\s\S]*?<\/style>/,
  '</style>'
)
const arenaAbilityScope = {
  path: 'src/views/ability-map/AbilityMapView.vue',
  rootClass: 'class="arena arena-ability ability-map page-shell"',
  selector: '.arena-ability'
}
const arenaRoomScope = {
  path: 'src/views/interview/InterviewRoomView.vue',
  rootClass: 'class="interview-room arena-room"',
  selector: '.arena-room'
}

const highTrafficPages = [
  'src/views/question/QuestionTrainingHubView.vue',
  'src/views/interview/InterviewCreateView.vue',
  'src/views/agent/AgentTodayView.vue',
  'src/views/ability-map/AbilityMapView.vue',
  'src/views/agent/AgentTaskListView.vue',
  'src/views/agent/AgentRunDetailView.vue',
  'src/views/analytics/PersonalAnalyticsView.vue',
  'src/views/application-package/ApplicationPackageListView.vue',
  'src/views/application-package/ApplicationPackageDetailView.vue',
  'src/views/job-experiment/JobExperimentListView.vue',
  'src/views/job-experiment/JobExperimentCreateView.vue',
  'src/views/job-experiment/JobExperimentDetailView.vue',
  'src/views/job-experiment/JobExperimentReviewView.vue',
  'src/views/project-evidence/ProjectEvidenceListView.vue',
  'src/views/project-evidence/ProjectEvidenceDetailView.vue',
  'src/views/project-evidence/ProjectEvidenceEditView.vue',
  'src/views/portfolio-demo/PortfolioDemoView.vue',
  'src/views/interview/InterviewRoomView.vue',
  'src/components/agent/AgentCoachActionDialog.vue',
  'src/components/agent/AgentTaskFeedback.vue',
  'src/components/job-readiness/NextActionBanner.vue',
  'src/components/question/QuestionAnswerReviewPanel.vue',
  'src/components/report/InterviewVoiceTraceSection.vue'
]

describe('user workspace layout system', () => {
  it('keeps high-traffic workspace pages free of light product surfaces and decorative gradients', () => {
    for (const path of highTrafficPages) {
      const fullSource = readSource(path)
      const source = path === arenaRoomScope.path
        ? withoutInterviewBattleStyleExtension(fullSource)
        : path === arenaAbilityScope.path
          ? stripScopedStyleBlock(fullSource, arenaAbilityScope.selector)
          : fullSource
      if (path === arenaAbilityScope.path) {
        expect(fullSource, path).toContain(arenaAbilityScope.rootClass)
        expect(fullSource, path).toContain('var(--arena-')
      }
      if (path === arenaRoomScope.path) {
        expect(fullSource, path).toContain(arenaRoomScope.rootClass)
        const roomScopeStart = fullSource.indexOf(`${arenaRoomScope.selector} {`)
        expect(roomScopeStart, path).toBeGreaterThanOrEqual(0)
        const roomScope = fullSource.slice(roomScopeStart)
        expect(roomScope, path).toContain('--room-bg:')
        expect(roomScope, path).not.toMatch(
          /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff)/i
        )
      }
      expect(source, path).not.toMatch(
        /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
      )
      expect(source, path).not.toMatch(/(?:linear|radial)-gradient\(/)
    }

    const resumeHub = readSource('src/views/resume/ResumeJobHubView.vue').replace(
      /(\.snapshot-paper\s*\{[\s\S]*?background:\s*)#ffffff/i,
      '$1var(--resume-paper)'
    )
    expect(resumeHub).not.toMatch(
      /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
    )
    expect(resumeHub).not.toMatch(/(?:linear|radial)-gradient\(/)
  })

  it('uses the wide compact user workspace shell', () => {
    const layout = readSource('src/layouts/UserLayout.vue')
    const topNav = readSource('src/components/layout/UserTopNav.vue')
    const components = readSource('src/styles/user-components.scss')
    const elementTheme = readSource('src/styles/element-dark.scss')
    const variables = readSource('src/styles/variables.scss')
    const arena = readSource('src/styles/arena.scss')
    const routes = readSource('src/router/routes.ts')

    expect(layout).toMatch(/width:\s*min\(100%,\s*1440px\)/)
    expect(topNav).toMatch(/width:\s*min\(100%,\s*1440px\)/)
    expect(layout).toContain("document.body.classList.toggle('arena-overlay-theme', enabled)")
    expect(layout).toContain("document.body.classList.remove('arena-overlay-theme')")
    expect(routes).toContain('arenaTheme: true')
    expect(arena).toMatch(/body\.arena-overlay-theme\s*\{[\s\S]*?--el-bg-color:\s*#ffffff/)
    expect(components).toContain('Compact workspace density')
    expect(components).toMatch(/\.content-card__body,[\s\S]*?padding:\s*16px/)
    expect(elementTheme).not.toMatch(/backdrop-filter\s*:/i)
    expect(elementTheme).not.toMatch(/(?:linear|radial)-gradient\(/i)
    expect(variables).toContain('--cc-primary: #5b8def')
    expect(variables).toContain('--cc-ai: #7d86b2')
    expect(variables).toContain('--cc-ai-cyan: #6ea8fe')
  })

  it('integrates primary interview actions and keeps training support secondary', () => {
    const interview = readSource('src/views/interview/InterviewCreateView.vue')
    const training = readSource('src/views/question/QuestionTrainingHubView.vue')

    expect(interview).toMatch(
      /\.quick-start-panel\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
    )
    expect(interview).toMatch(
      /\.quick-start-panel__actions\s*\{[\s\S]*?flex-direction:\s*row/
    )
    expect(training).toMatch(
      /\.training-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(260px,\s*300px\)/
    )
  })
})
