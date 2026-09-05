/** A4 at 96dpi — the same pixel grid TemplatePaper uses for on-screen paper. */
export const A4_PAGE_WIDTH_PX = 794
export const A4_PAGE_HEIGHT_PX = 1123

export interface PaginationUnit {
  id: string
  /** Offset from the paper's top edge, in layout pixels. */
  top: number
  height: number
}

export interface PaginationPlan {
  /** Unit ids that must start on a fresh page so cards never split mid-way. */
  breakBeforeIds: string[]
  pageCount: number
  /** Paper-relative Y positions of page boundaries (page 2+ tops). */
  pageBreakTops: number[]
}

/**
 * Whole-card pagination: a unit that straddles a page boundary is pushed to
 * the next page unless it already starts at one. Units taller than a page
 * keep flowing (the browser splits them) instead of looping forever.
 */
export const planPageBreaks = (
  units: PaginationUnit[],
  pageHeight = A4_PAGE_HEIGHT_PX
): PaginationPlan => {
  const breakBeforeIds: string[] = []
  let maxBottom = 0

  for (const unit of units) {
    if (unit.height <= 0) continue
    const bottom = unit.top + unit.height
    if (bottom > maxBottom) maxBottom = bottom
    const startPage = Math.floor(unit.top / pageHeight)
    const endPage = Math.floor((bottom - 1) / pageHeight)
    const alreadyAtPageTop = unit.top - startPage * pageHeight < 0.5
    if (endPage > startPage && !alreadyAtPageTop) {
      breakBeforeIds.push(unit.id)
    }
  }

  const pageCount = Math.max(1, Math.ceil(maxBottom / pageHeight))
  const pageBreakTops: number[] = []
  for (let page = 1; page < pageCount; page += 1) {
    pageBreakTops.push(page * pageHeight)
  }

  return { breakBeforeIds, pageCount, pageBreakTops }
}
