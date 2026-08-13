import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { stripScopedStyleBlock } from '../helpers/scoped-style'

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n')

const workspaceFiles = [
  'src/views/resume/ResumeListView.vue',
  'src/views/resume/ResumeEditView.vue',
  'src/views/resume/ResumeJobHubView.vue',
  'src/views/resume/ResumeJobHubSafeView.vue',
  'src/views/resume/components/ResumeDeliveryWorkbench.vue',
  'src/views/resume/components/ResumeArtifactDeliveryPanel.vue',
  'src/views/application-package/ApplicationPackageListView.vue',
  'src/views/application-package/ApplicationPackageDetailView.vue',
  'src/views/project-evidence/ProjectEvidenceListView.vue',
  'src/views/project-evidence/ProjectEvidenceDetailView.vue',
  'src/views/project-evidence/ProjectEvidenceEditView.vue'
]

const stripPaperPreviewStyles = (path: string, source: string) => {
  let result = source

  if (path.endsWith('ResumeEditView.vue')) {
    result = result.replace(
      /\.resume-paper\s*\{[\s\S]*?(?=\n\.side-panel\s*\{)/,
      '.resume-paper { background: var(--resume-paper); }\n'
    )
    result = stripScopedStyleBlock(result, '.template-thumb')
  } else if (path.endsWith('ResumeDeliveryWorkbench.vue')) {
    result = result.replace(
      /\.a4-sheet\s*\{[\s\S]*?(?=\n\.section-empty,)/,
      '.a4-sheet { background: var(--resume-paper); }\n'
    )
    result = result.replace(
      /\.page-number\s*\{[\s\S]*?(?=\n\.section-empty,)/,
      '.page-number { color: var(--resume-paper-muted); }\n'
    )
    result = result.replace(
      /\.paper-empty\s*\{[\s\S]*?(?=\n\.section-empty\s*\{)/,
      '.paper-empty { color: var(--resume-paper-muted); }\n'
    )
  } else if (path.endsWith('ResumeJobHubView.vue')) {
    result = result.replace(
      /\.snapshot-paper\s*\{[\s\S]*?(?=\n\.experiment-card\s*\{)/,
      '.snapshot-paper { background: var(--resume-paper); }\n'
    )
  }

  return result.replace(/min-height:\s*(?:184|540|620|720|760)px/gi, '')
}

const arenaMigrationScopeByPath: Record<string, { rootClass: string; selector: string }> = {
  'src/views/resume/ResumeEditView.vue': {
    rootClass: 'class="arena arena-resume-studio resume-editor page-shell"',
    selector: '.arena-resume-studio'
  }
}

describe('resume, application package, and project evidence workspace layout', () => {
  it('uses user workspace tokens outside intentional resume paper previews', () => {
    for (const path of workspaceFiles) {
      const source = stripPaperPreviewStyles(path, readSource(path))
      const arenaScope = arenaMigrationScopeByPath[path]
      const validatedSource = arenaScope
        ? stripScopedStyleBlock(source, arenaScope.selector)
        : source
      if (arenaScope) {
        expect(source, path).toContain(arenaScope.rootClass)
        expect(source, path).toContain('var(--arena-')
      }
      expect(validatedSource, path).toContain('var(--user-')
      expect(validatedSource, path).not.toMatch(/var\(--app-|var\(--text-secondary|var\(--el-color-primary/i)
      expect(validatedSource, path).not.toMatch(
        /(?:background|background-color|color|border-color):\s*(?:#[0-9a-f]{3,8}|rgba?\()/i
      )
      expect(validatedSource, path).not.toMatch(/(?:linear|radial)-gradient\(/i)
    }
  })

  it('removes glass wrappers and non-paper fixed-height work areas', () => {
    for (const path of workspaceFiles) {
      const source = stripPaperPreviewStyles(path, readSource(path))

      expect(source, path).not.toContain('cc-glass')
      expect(source, path).not.toMatch(/min-height:\s*(?:1[5-9]\d|[2-9]\d{2}|\d{4,})px/i)
    }
  })

  it('flattens the resume hub instead of nesting cards inside a large hero container', () => {
    const source = readSource('src/views/resume/ResumeJobHubView.vue')

    expect(source).toMatch(
      /\.hub-hero\s*\{[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent/
    )
    expect(source).toMatch(
      /\.experiment-stack\s*\{[\s\S]*?border:\s*1px solid var\(--user-border\)[\s\S]*?background:\s*var\(--user-surface\)/
    )
    expect(source).toMatch(
      /\.experiment-card\s*\{[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent/
    )
    expect(source).toMatch(
      /\.path-step\s*\{[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent/
    )
  })

  it('keeps each page family compact and structurally responsive', () => {
    const safeHub = readSource('src/views/resume/ResumeJobHubSafeView.vue')
    const packageList = readSource('src/views/application-package/ApplicationPackageListView.vue')
    const projectList = readSource('src/views/project-evidence/ProjectEvidenceListView.vue')
    const projectDetail = readSource('src/views/project-evidence/ProjectEvidenceDetailView.vue')

    expect(safeHub).not.toMatch(/grid-template-columns:\s*repeat\(4,/)
    expect(safeHub).toMatch(/@media\s*\(max-width:\s*640px\)/)

    expect(packageList).toMatch(/\.application-package-list\s*\{[\s\S]*?min-width:\s*0/)
    expect(packageList).toMatch(/\.list-surface\s*\{[\s\S]*?overflow:\s*hidden/)

    expect(projectList).toMatch(
      /\.hero-panel\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/
    )
    expect(projectList).toMatch(/@media\s*\(max-width:\s*760px\)/)

    expect(projectDetail).toMatch(
      /\.fact-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    )
  })
})
