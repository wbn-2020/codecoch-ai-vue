import { describe, expect, it } from 'vitest'

import { normalizeResumeSuggestion } from '@/features/resume-delivery'

describe('resume suggestion delivery state', () => {
  it('marks an accepted suggestion stale when the current version is newer than its applied version', () => {
    const suggestion = normalizeResumeSuggestion({
      id: 10,
      resumeId: 1,
      sourceResumeVersionId: 2,
      appliedResumeVersionId: 3,
      sectionKey: 'summary',
      anchorStart: 6,
      anchorEnd: 12,
      originalText: 'stable',
      suggestedText: 'robust',
      acceptedText: 'robust',
      riskLevel: 'LOW',
      status: 'ACCEPTED'
    }, 4)

    expect(suggestion.stale).toBe(true)
    expect(suggestion.canUndo).toBe(false)
  })

  it('keeps a batch sibling undoable from the latest undo version in the same batch', () => {
    const target = {
      id: 10,
      resumeId: 1,
      sourceResumeVersionId: 2,
      appliedResumeVersionId: 3,
      sectionKey: 'summary',
      anchorStart: 6,
      anchorEnd: 12,
      originalText: 'stable',
      suggestedText: 'robust',
      acceptedText: 'robust',
      riskLevel: 'LOW' as const,
      status: 'ACCEPTED' as const
    }
    const undoneSibling = {
      ...target,
      id: 9,
      anchorStart: 0,
      anchorEnd: 5,
      originalText: 'Built',
      suggestedText: 'Created',
      acceptedText: 'Created',
      status: 'UNDONE' as const,
      undoResumeVersionId: 4
    }

    const suggestion = normalizeResumeSuggestion(target, 4, [target, undoneSibling])

    expect(suggestion.stale).toBe(false)
    expect(suggestion.canUndo).toBe(true)
  })

  it('does not borrow an undo version from another suggestion batch', () => {
    const target = {
      id: 10,
      resumeId: 1,
      sourceResumeVersionId: 2,
      appliedResumeVersionId: 3,
      sectionKey: 'summary',
      anchorStart: 6,
      anchorEnd: 12,
      originalText: 'stable',
      suggestedText: 'robust',
      acceptedText: 'robust',
      riskLevel: 'LOW' as const,
      status: 'ACCEPTED' as const
    }
    const otherBatchUndo = {
      ...target,
      id: 9,
      resumeId: 2,
      status: 'UNDONE' as const,
      undoResumeVersionId: 4
    }

    const suggestion = normalizeResumeSuggestion(target, 4, [target, otherBatchUndo])

    expect(suggestion.stale).toBe(true)
    expect(suggestion.canUndo).toBe(false)
  })
})
