import { describe, expect, it, vi } from 'vitest'

import {
  answerContainsConfirmedVoiceText,
  mergeConfirmedVoiceText,
  resolveConfirmedVoiceAnswerSource,
  useInterviewVoicePreview
} from './interview-voice-preview'

describe('interview voice preview', () => {
  it('keeps the confirmed voice segment while allowing typed text around it', () => {
    const answer = mergeConfirmedVoiceText('typed prefix', '', 'confirmed voice')

    expect(answer).toBe('typed prefix\n\nconfirmed voice')
    expect(answerContainsConfirmedVoiceText(`${answer}\n\ntyped suffix`, 'confirmed voice')).toBe(true)
    expect(resolveConfirmedVoiceAnswerSource(
      { answerSource: 'VOICE_TRANSCRIPT' },
      `${answer}\n\ntyped suffix`,
      'confirmed voice'
    )).toBe('VOICE_TRANSCRIPT_WITH_TEXT')
  })

  it('replaces the previously confirmed segment instead of duplicating it', () => {
    expect(mergeConfirmedVoiceText(
      'typed prefix\n\nold voice\n\ntyped suffix',
      'old voice',
      'new voice'
    )).toBe('typed prefix\n\nnew voice\n\ntyped suffix')
  })

  it('cancel clears an in-flight local lifecycle', () => {
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn()
    })
    preview.setUploading()

    preview.cancel()

    expect(preview.state.value).toBe('idle')
    expect(preview.isBusy.value).toBe(false)
    expect(preview.submission.value).toBeNull()
  })
})
