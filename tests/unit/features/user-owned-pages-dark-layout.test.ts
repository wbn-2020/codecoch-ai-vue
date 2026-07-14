import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const ownedPages = [
  'src/views/question/FavoriteQuestionView.vue',
  'src/views/question/PracticeModeView.vue',
  'src/views/question/QuestionDetailView.vue',
  'src/views/question/QuestionListView.vue',
  'src/views/question/QuestionPracticeSessionView.vue',
  'src/views/question/QuestionTrainingDetailView.vue',
  'src/views/question/WrongQuestionView.vue',
  'src/views/study/DailyTaskView.vue',
  'src/views/study/StudyPlanView.vue',
  'src/views/tools/RecordsToolsView.vue',
  'src/views/user/DashboardView.vue',
  'src/views/user/NotificationCenterView.vue',
  'src/views/user/PasswordView.vue',
  'src/views/user/ProfileView.vue',
  'src/views/user/ProjectExperienceView.vue',
  'src/views/user/UserOnboardingView.vue',
  'src/views/user/WeaknessAnalysisView.vue'
]

const darkQuestionPages = [
  'src/views/question/QuestionListView.vue',
  'src/views/question/QuestionPracticeSessionView.vue',
  'src/views/question/QuestionTrainingDetailView.vue'
]

const legacyLightPalette =
  /#(?:075985|166534|1d4ed8|2563eb|475569|64748b|94a3b8|bbf7d0|bfdbfe|cbd5e1|dbeafe|e0f2fe|eff6ff|f0fdf4|f8fafc|fff7ed)\b/i

describe('owned user workspace pages', () => {
  it('uses dark user-theme surfaces without decorative gradients', () => {
    for (const path of ownedPages) {
      const source = readSource(path)

      expect(source, path).toContain('var(--user-')
      expect(source, path).not.toMatch(
        /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff|#fff7ed|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
      )
      expect(source, path).not.toMatch(/(?:linear|radial)-gradient\(/i)
    }
  })

  it('keeps workspace layouts compact and mobile-safe', () => {
    for (const path of ownedPages) {
      const source = readSource(path)

      expect(source, path).not.toMatch(
        /grid-template-columns:\s*repeat\(\s*(?:3|4)\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/i
      )
      expect(source, path).not.toMatch(/min-height:\s*(?:[5-9]\d{2}|\d{4,})px/i)
      expect(source, path).toMatch(/min-width:\s*0/i)
      expect(source, path).toMatch(/@media\s*\(max-width:\s*(?:6\d{2}|7\d{2})px\)/i)
    }
  })

  it('keeps dark question pages free of legacy light-palette literals', () => {
    for (const path of darkQuestionPages) {
      expect(readSource(path), path).not.toMatch(legacyLightPalette)
    }
  })

  it('keeps the mobile practice rail opaque with a compact theme shadow', () => {
    const source = readSource('src/views/question/QuestionPracticeSessionView.vue')
    const mobileRailRules = Array.from(
      source.matchAll(/\.mobile-practice-rail\s*\{(?<declarations>[^}]*)\}/gi),
      (match) => match.groups?.declarations || ''
    )
    const fixedRailRule = mobileRailRules.find((rule) => /position:\s*fixed/i.test(rule))

    expect(fixedRailRule).toBeDefined()
    expect(fixedRailRule).not.toMatch(/backdrop-filter\s*:/i)
    expect(fixedRailRule).toMatch(/box-shadow:\s*var\(--user-shadow-sm\)/i)
  })

  it('keeps the shared shell free of glass blur and decorative backgrounds', () => {
    const shared = readSource('src/styles/index.scss')
    expect(shared).not.toMatch(/backdrop-filter\s*:/i)
    expect(shared).not.toMatch(/(?:linear|radial)-gradient\(/i)
    expect(shared).not.toMatch(/min-height:\s*2[2-9]\dpx/i)
  })
})
