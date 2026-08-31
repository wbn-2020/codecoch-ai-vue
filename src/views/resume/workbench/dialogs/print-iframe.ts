import { h, nextTick, render } from 'vue'

import type { ResumeDocumentDraft, ResumePreviewDensity, ResumeAccent, ResumeTemplateCode } from '@/features/resume-document'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import { A4_PAGE_WIDTH_PX } from '@/features/resume-template/pagination'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

import { PRINT_SHEET_CSS, stabilizePrintBreaks } from './print-pagination'

export interface ResumePrintSheetProps {
  draft: ResumeDocumentDraft
  templateCode: ResumeTemplateCode | string
  accent: ResumeAccent
  density: ResumePreviewDensity
  presentationConfig?: ResumePresentationConfig
  document?: ResumeDocumentV2 | null
}

/**
 * Prints the designed sheet 1:1 through an off-screen iframe: app styles are
 * cloned into the frame, @page A4 CSS is injected, whole-card page breaks are
 * stabilized, then the frame's own window prints.
 */
export const printResumeSheet = async (sheetProps: ResumePrintSheetProps): Promise<void> => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = `${A4_PAGE_WIDTH_PX}px`
  iframe.style.height = '1123px'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  try {
    const frameWindow = iframe.contentWindow
    const frameDocument = iframe.contentDocument
    if (!frameWindow || !frameDocument) {
      throw new Error('print frame unavailable')
    }

    for (const node of Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))) {
      frameDocument.head.appendChild(node.cloneNode(true))
    }
    const printStyle = frameDocument.createElement('style')
    printStyle.textContent = PRINT_SHEET_CSS
    frameDocument.head.appendChild(printStyle)

    const container = frameDocument.createElement('div')
    container.className = 'resume-print-sheet'
    frameDocument.body.appendChild(container)
    render(h(ResumeDocumentPreview, sheetProps), container)
    await nextTick()
    await frameDocument.fonts?.ready.catch(() => undefined)

    const paper = container.querySelector<HTMLElement>('.resume-document')
    if (paper) stabilizePrintBreaks(paper)

    frameWindow.focus()
    frameWindow.print?.()
  } finally {
    window.setTimeout(() => {
      const container = iframe.contentDocument?.body.querySelector('.resume-print-sheet')
      if (container) render(null, container)
      iframe.remove()
    }, 1000)
  }
}
