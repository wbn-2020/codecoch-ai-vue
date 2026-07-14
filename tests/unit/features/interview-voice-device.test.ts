import { describe, expect, it } from 'vitest'

import {
  inspectInterviewVoiceDeviceSupport,
  interviewVoiceLevelState,
  interviewVoicePermissionMessage
} from '@/features/interview-voice-device'

describe('interview voice device preflight', () => {
  it('reports a full browser capability set', () => {
    const support = inspectInterviewVoiceDeviceSupport({
      navigator: {
        mediaDevices: { getUserMedia: async () => ({} as MediaStream) }
      } as Navigator,
      MediaRecorder: class {} as unknown as typeof MediaRecorder,
      AudioContext: class {} as unknown as typeof AudioContext
    })

    expect(support.level).toBe('SUPPORTED')
    expect(support.warnings).toEqual([])
  })

  it('keeps volume boundaries deterministic', () => {
    expect(interviewVoiceLevelState(0)).toBe('SILENT')
    expect(interviewVoiceLevelState(8)).toBe('LOW')
    expect(interviewVoiceLevelState(50)).toBe('GOOD')
    expect(interviewVoiceLevelState(96)).toBe('LOUD')
  })

  it('turns permission failures into an actionable message', () => {
    expect(interviewVoicePermissionMessage(new DOMException('', 'NotAllowedError'))).toContain('权限被拒绝')
  })
})
