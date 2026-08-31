import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
  planPageBreaks,
  type PaginationPlan
} from '@/features/resume-template/pagination'

export const PRINT_UNIT_SELECTOR = '[data-section]'
export const PRINT_BREAK_CLASS = 'is-print-break'

export interface PrintPaginationResult extends PaginationPlan {
  passes: number
}

/** offsetTop chain summed up to the positioned root — layout pixels, transform-safe. */
const topWithin = (element: HTMLElement, root: HTMLElement) => {
  let top = 0
  let node: HTMLElement | null = element
  while (node && node !== root) {
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return top
}

/**
 * Applies whole-card page breaks in place. Each pass re-measures after the
 * previous pass pushed cards to fresh pages, and stops once the break set
 * stabilizes (or after maxPasses to guarantee termination).
 */
export const stabilizePrintBreaks = (
  root: HTMLElement,
  selector: string = PRINT_UNIT_SELECTOR,
  pageHeight: number = A4_PAGE_HEIGHT_PX,
  maxPasses = 6
): PrintPaginationResult => {
  let plan: PaginationPlan = planPageBreaks([], pageHeight)
  let passes = 0

  for (; passes < maxPasses; passes += 1) {
    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
    const units = elements.map((element) => ({
      id: element.dataset.section || element.className,
      top: topWithin(element, root),
      height: element.offsetHeight
    }))
    plan = planPageBreaks(units, pageHeight)

    let changed = false
    for (const element of elements) {
      const id = element.dataset.section || element.className
      const shouldBreak = plan.breakBeforeIds.includes(id)
      if (element.classList.contains(PRINT_BREAK_CLASS) !== shouldBreak) {
        element.classList.toggle(PRINT_BREAK_CLASS, shouldBreak)
        changed = true
      }
    }
    if (!changed) break
  }

  return { ...plan, passes }
}

/** Injected into the print iframe so the browser paginates an exact A4 sheet. */
export const PRINT_SHEET_CSS = `
@page { size: A4 portrait; margin: 0; }
html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }
body { width: ${A4_PAGE_WIDTH_PX}px; }
.resume-print-sheet { position: relative; width: ${A4_PAGE_WIDTH_PX}px; }
.resume-print-sheet .resume-document {
  width: ${A4_PAGE_WIDTH_PX}px;
  max-width: none;
  border: 0;
  box-shadow: none;
}
.${PRINT_BREAK_CLASS} { break-before: page; }
.resume-print-sheet li,
.resume-print-sheet .document-entry,
.resume-print-sheet .template-entry,
.resume-print-sheet .document-project-section { break-inside: avoid; }
.resume-print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`
