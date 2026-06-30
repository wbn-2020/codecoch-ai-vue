import { describe, expect, it } from 'vitest'

import { translateFailureReason, translateFeedbackType } from './adminDisplay'

describe('translateFeedbackType', () => {
  it('maps agent feedback values case-insensitively', () => {
    const supportedValues = ['HELPFUL', 'NOT_HELPFUL', 'TOO_HARD', 'TOO_EASY', 'IRRELEVANT']

    supportedValues.forEach((value) => {
      expect(translateFeedbackType(value.toLowerCase())).toBe(translateFeedbackType(value))
      expect(translateFeedbackType(value)).not.toBe(value)
    })
  })

  it('keeps equivalent alias groups aligned', () => {
    expect(translateFeedbackType('LIKE')).toBe(translateFeedbackType('LIKED'))
    expect(translateFeedbackType('DISLIKE')).toBe(translateFeedbackType('DISLIKED'))
  })

  it('falls back to the original value for unknown types and to UNKNOWN for empty input', () => {
    expect(translateFeedbackType('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(translateFeedbackType(undefined)).toBe(translateFeedbackType('UNKNOWN'))
  })
})

describe('translateFailureReason', () => {
  it('returns a placeholder for empty values', () => {
    expect(translateFailureReason(undefined)).toBe('-')
    expect(translateFailureReason(null)).toBe('-')
  })

  it('replaces provider failure prefixes while preserving the detail suffix', () => {
    const result = translateFailureReason('Provider request failed: timeout after 30s')

    expect(result).toContain('timeout after 30s')
    expect(result).not.toContain('Provider request failed:')
  })

  it('normalizes decrypt and configuration failures', () => {
    const decryptFailure = translateFailureReason('Provider api-key decrypt failed: invalid ciphertext')
    const configFailure = translateFailureReason('AI base-url, api-key or model is not configured')

    expect(decryptFailure).toContain('invalid ciphertext')
    expect(decryptFailure).not.toContain('Provider api-key decrypt failed:')
    expect(configFailure).toContain('api-key')
    expect(configFailure).not.toContain('model is not configured')
  })
})
