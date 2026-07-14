import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const targetPages = [
  'src/views/tools/RecordsToolsView.vue',
  'src/views/user/UserOnboardingView.vue',
  'src/views/question/FavoriteQuestionView.vue',
  'src/views/question/WrongQuestionView.vue',
  'src/views/study/StudyPlanView.vue'
]

describe('user empty-state density and theme readability', () => {
  it('uses user-theme tokens for text and state colors', () => {
    const hardcodedThemeColor =
      /(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color|accent-color)\s*:\s*(?:#[\da-f]{3,8}|rgba?\()/i

    for (const path of targetPages) {
      const source = readSource(path)

      expect(source, path).toContain('var(--user-')
      expect(source, path).not.toMatch(hardcodedThemeColor)
    }
  })

  it('keeps empty and result regions content-driven', () => {
    for (const path of targetPages) {
      const source = readSource(path)

      expect(source, path).not.toMatch(/min-height:\s*(?:220|240|260)px/i)
    }
  })
})
