import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const targetFiles = [
  'src/views/resume/ResumeListView.vue',
  'src/views/resume/ResumeEditView.vue',
  'src/views/resume/components/ResumeDeliveryWorkbench.vue',
  'src/views/resume/components/ResumeArtifactDeliveryPanel.vue'
]

describe('resume editor and delivery workspace layout', () => {
  it('keeps every product surface dark while allowing real paper previews to stay white', () => {
    for (const path of targetFiles) {
      const source = readSource(path)

      expect(source, path).toContain('var(--user-')
      expect(source, path).not.toMatch(
        /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff|#eef4ff|#ecfdf3|#f0fdf4|#f5f8ff|#f5f3ff|#fffbeb|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
      )
      expect(source, path).not.toMatch(/(?:linear|radial)-gradient\(/i)
    }

    const preview = readSource('src/views/resume/components/ResumeDocumentPreview.vue')
    expect(preview).toMatch(/\.resume-document\s*\{[\s\S]*?background:\s*#fff/)
    expect(preview).toContain('document-section__heading')
    expect(preview).toContain('resumeTemplateSectionOrder')
  })

  it('keeps the supporting workspace in the editor column and bounds the sticky preview to the viewport', () => {
    const source = readSource('src/views/resume/ResumeEditView.vue')

    expect(source).toMatch(
      /\.editor-workspace\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(520px,\s*1\.05fr\)/
    )
    expect(source).toMatch(
      /\.editor-aside\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*2;[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(260px,\s*1fr\)\)/
    )
    expect(source).toMatch(
      /\.preview-column\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?height:\s*var\(--resume-preview-viewport-height\);[\s\S]*?max-height:\s*var\(--resume-preview-viewport-height\);[\s\S]*?overflow:\s*visible/
    )
    expect(source).toMatch(
      /\.resume-paper-wrap\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;[\s\S]*?max-height:\s*none;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*auto/
    )
    expect(source).toMatch(
      /@media \(max-width: 1020px\)[\s\S]*?\.preview-column\s*\{[\s\S]*?position:\s*static;[\s\S]*?height:\s*min\(780px,\s*calc\(100dvh\s*-\s*160px\)\);[\s\S]*?max-height:\s*min\(780px,\s*calc\(100dvh\s*-\s*160px\)\);[\s\S]*?overflow:\s*visible;[\s\S]*?\}[\s\S]*?\.resume-paper-wrap\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;[\s\S]*?min-height:\s*0;/
    )
    expect(source).toContain('ResumeDocumentPreview')
    expect(source).toContain('template-selector')
  })

  it('keeps list, delivery, and artifact actions close to their content on narrow screens', () => {
    const list = readSource('src/views/resume/ResumeListView.vue')
    const editor = readSource('src/views/resume/ResumeEditView.vue')
    const workbench = readSource('src/views/resume/components/ResumeDeliveryWorkbench.vue')
    const artifactPanel = readSource('src/views/resume/components/ResumeArtifactDeliveryPanel.vue')

    expect(list).toMatch(/\.resume-hero\s*\{[\s\S]*?grid-template-columns:/)
    expect(list).toMatch(/@media\s*\(max-width:\s*720px\)/)
    expect(workbench).toMatch(/@media\s*\(max-width:\s*680px\)/)
    expect(workbench).toMatch(/\.delivery-grid\s*\{[\s\S]*?minmax\(0,\s*0\.72fr\)\s+minmax\(520px,\s*1\.28fr\)/)
    expect(workbench).toMatch(
      /\.paper-stack\s*\{[\s\S]*?max-height:\s*min\(760px,\s*max\(280px,\s*calc\(100dvh\s*-\s*180px\s*-\s*var\(--resume-delivery-bottom-gap\)\)\)\);[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*auto/
    )
    expect(workbench).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.paper-stack\s*\{[\s\S]*?max-height:\s*none;/
    )
    expect(workbench).toContain('preferredTemplateCode')
    expect(workbench).toContain('hasUnsavedChanges')
    expect(workbench).toContain('stableDraft')
    expect(workbench).toContain('请先保存简历，再导出包含最新内容的 PDF 或 DOCX')
    expect(workbench).not.toContain(':draft="draft"')
    expect(editor).toContain(':has-unsaved-changes="hasUnsavedResumeChanges"')
    expect(editor).toContain('moveRovingSelection')
    expect(editor).toContain(':tabindex="selectedResumeTemplateCode === template.code ? 0 : -1"')
    expect(workbench).not.toContain('previewPages')
    expect(artifactPanel).toMatch(/@media\s*\(max-width:\s*760px\)/)
    expect(artifactPanel).toMatch(/\.artifact-main\s*\{[\s\S]*?min-width:\s*0/)
    expect(artifactPanel).toContain('artifact-template-picker')
    expect(artifactPanel).toContain('resumeTemplateOptions')
    expect(artifactPanel).not.toContain("templateCode: 'ATS_SINGLE_COLUMN'")
    expect(artifactPanel).not.toContain('templateVersion: 1')
  })

  it('keeps every resume accent readable on white paper headings', () => {
    const preview = readSource('src/views/resume/components/ResumeDocumentPreview.vue')

    expect(preview).toContain('--paper-accent: #0b7669')
    expect(preview).not.toContain('--paper-accent: #0f8b7c')
  })
})
