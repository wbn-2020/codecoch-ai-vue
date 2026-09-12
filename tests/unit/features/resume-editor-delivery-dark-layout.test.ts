import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { stripScopedStyleBlock } from '../helpers/scoped-style'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const targetFiles = [
  'src/views/resume/ResumeListView.vue',
  'src/views/resume/ResumeEditView.vue',
  'src/views/resume/components/ResumeDeliveryWorkbench.vue',
  'src/views/resume/components/ResumeArtifactDeliveryPanel.vue'
]
const arenaResumeEditorScope = {
  rootClass: 'class="arena resume-workbench-page resume-editor page-shell"',
  selector: '.resume-workbench-page.resume-editor'
}
const stripArenaMigrationAndPaperPreviewStyles = (source: string) =>
  stripScopedStyleBlock(
    stripScopedStyleBlock(
      stripScopedStyleBlock(source, arenaResumeEditorScope.selector),
      '.arena-resume-studio'
    ),
    '.template-thumb'
  )

describe('resume editor and delivery workspace layout', () => {
  it('keeps every product surface dark while allowing real paper previews to stay white', () => {
    for (const path of targetFiles) {
      const source = readSource(path)
      const validatedSource = path === 'src/views/resume/ResumeEditView.vue'
        ? stripArenaMigrationAndPaperPreviewStyles(source)
        : source
      if (path === 'src/views/resume/ResumeEditView.vue') {
        expect(source, path).toContain(arenaResumeEditorScope.rootClass)
        expect(source, path).toContain('--resume-workbench-bg:')
        expect(source, path).not.toContain('class="arena arena-resume-studio resume-editor page-shell"')
      }
      expect(validatedSource, path).toContain('var(--user-')
      expect(validatedSource, path).not.toMatch(
        /background(?:-color)?:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#eff6ff|#eef4ff|#ecfdf3|#f0fdf4|#f5f8ff|#f5f3ff|#fffbeb|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
      )
      expect(validatedSource, path).not.toMatch(/(?:linear|radial)-gradient\(/i)
    }

    const preview = readSource('src/views/resume/components/ResumeDocumentPreview.vue')
    expect(preview).toMatch(/\.resume-document\s*\{[\s\S]*?background:\s*#fff/)
    expect(preview).toContain('document-section__heading')
    expect(preview).toContain('normalizeResumePresentation')
    // M5: the ATS inline article iterates document-driven render sections for order/visibility.
    expect(preview).toContain('v-for="section in renderSections"')
  })

  it('keeps the supporting workspace in the editor column and bounds the sticky preview to the viewport', () => {
    const source = readSource('src/views/resume/ResumeEditView.vue')
    const baseWorkbenchStyles = source.slice(source.lastIndexOf('// Resume workbench v2'))
    const shellSource = readSource('src/views/resume/components/ResumeWorkbenchShell.vue')

    expect(shellSource).toContain('--workbench-rail-width: 220px')
    expect(shellSource).toContain('--workbench-editor-width: 420px')
    // v22 列序：editor 居中（col 2），preview 居右（col 3），由 Shell :slotted 托管
    expect(shellSource).toMatch(
      /\.resume-workbench-layout > :slotted\(\.resume-workbench-pane--editor\),\s*[\s\S]*?\.resume-workbench-layout > :slotted\(\.resume-workbench-pane--inspector\)\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*1;/
    )
    expect(shellSource).toMatch(
      /\.resume-workbench-layout > :slotted\(\.resume-workbench-pane--preview\)\s*\{[\s\S]*?grid-column:\s*3;[\s\S]*?grid-row:\s*1;[\s\S]*?overflow:\s*hidden;/
    )
    expect(source).toMatch(
      /\.resume-paper-wrap\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?overscroll-behavior:\s*contain;/
    )
    expect(baseWorkbenchStyles).toMatch(
      /\.resume-paper-wrap\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;[\s\S]*?max-height:\s*none;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*auto/
    )
    expect(shellSource).toMatch(
      /@media \(max-width: 1260px\)[\s\S]*?\.resume-workbench-layout\s*\{[\s\S]*?display:\s*block;/
    )
    expect(shellSource).toMatch(
      /@media \(max-width: 1260px\)[\s\S]*?\.resume-workbench-layout > :slotted\(\.resume-workbench-pane--editor\),[\s\S]*?height:\s*min\(780px,\s*calc\(100dvh\s*-\s*194px\)\);[\s\S]*?overflow:\s*auto;/
    )
    expect(source).toContain('ResumeTemplateBrowser')
    // 2026-09-11：编辑器纸张渲染链 = ResumeEditView -> ResumePreviewCanvas -> ResumeDocumentPreview，
    // 打印设计版 = PrintPreviewOverlay -> ResumeDocumentPreview。契约改为保护整条渲染链
    // 而非要求主文件字面引用组件名（PrintPreviewOverlay/Canvas 均已封装该组件）。
    expect(source).toContain('ResumePreviewCanvas')
    expect(source).toContain('PrintPreviewOverlay')
    const canvasSource = readSource('src/views/resume/components/ResumePreviewCanvas.vue')
    expect(canvasSource).toContain('ResumeDocumentPreview')
    const printOverlaySource = readSource('src/views/resume/workbench/dialogs/PrintPreviewOverlay.vue')
    expect(printOverlaySource).toContain('ResumeDocumentPreview')
    const preview = readSource('src/views/resume/components/ResumeDocumentPreview.vue')
    expect(preview).toContain(
      "import { Circle, FileText, Link, Mail, MapPin, Phone } from 'lucide-vue-next'"
    )
    expect(preview).toContain(':is="item.icon"')
    expect(preview).toContain("presentation.iconMode !== 'HIDDEN'")
    expect(preview).toContain('class="document-contact__item"')
  })

  it('keeps list, delivery, and artifact actions close to their content on narrow screens', () => {
    const list = readSource('src/views/resume/ResumeListView.vue')
    const editor = readSource('src/views/resume/ResumeEditView.vue')
    const templateGallery = readSource('src/views/resume/components/ResumeTemplateBrowser.vue')
    const workbench = readSource('src/views/resume/components/ResumeDeliveryWorkbench.vue')
    const artifactPanel = readSource('src/views/resume/components/ResumeArtifactDeliveryPanel.vue')

    // 2026-09-09 测评整改：删除早已被 display:none 隐藏的 legacy hero（与 PageHeader 重复的双 h1 来源），
    // 对应 .resume-hero/.hero-* 样式与守卫同步移除；720px 媒体块仍承载卡片类响应式规则。
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
    expect(templateGallery).toContain('class="template-browser"')
    expect(templateGallery).toContain('class="template-browser__grid"')
    expect(templateGallery).toContain('aspect-ratio: 210 / 297')
    expect(templateGallery).toContain('template-card__secondary')
    expect(templateGallery).toContain('template-card__primary')
    expect(templateGallery).toContain('class="template-preview__renderer"')
    expect(templateGallery).toContain('setInterval(() =>')
    expect(editor).toContain('这里不生成真实 ATS 分数')
    // 2026-09-11：分页口径文案升级为动态 A4 页数提示（previewPageStatus 驱动），意图等价
    expect(editor).toContain('A4 · ')
    expect(editor).toMatch(/previewPageStatus/)
    expect(editor).toContain('打开稳定版本分页与导出工作台')
    expect(editor).toContain('v-show="inspectorMode === \'review\'" class="content-card side-panel export-check-panel"')
    expect(templateGallery).toMatch(/@media \(max-width: 639px\)[\s\S]*?grid-template-columns:\s*1fr;/)
    expect(workbench).not.toContain('previewPages')
    expect(artifactPanel).toMatch(/@media\s*\(max-width:\s*760px\)/)
    expect(artifactPanel).toMatch(/\.artifact-main\s*\{[\s\S]*?min-width:\s*0/)
    expect(artifactPanel).toContain('artifact-template-picker')
    expect(artifactPanel).toContain('resumeTemplateOptions')
    expect(artifactPanel).toContain('getResumeAtsTemplatesApi')
    expect(artifactPanel).toContain('templateVersion')
    expect(artifactPanel).toContain('selectedTemplateVersion.value')
    expect(artifactPanel).toContain(':disabled="!canCreateZip"')
  })

  it('keeps every resume accent readable on white paper headings', () => {
    const preview = readSource('src/views/resume/components/ResumeDocumentPreview.vue')

    expect(preview).toContain('--paper-accent: #1f6f5c')
    expect(preview).not.toContain('--paper-accent: #0f8b7c')
  })
})
