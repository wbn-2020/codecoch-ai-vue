import { afterEach, describe, expect, it, vi } from 'vitest'

import { useInterviewVoicePreview } from '@/features/interview-voice-preview'

describe('interview voice preview recorder lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enters opening synchronously before microphone permission resolves', async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined
    const stream = {
      getTracks: () => [{ stop: vi.fn() }]
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => {
          resolveStream = resolve
        }))
      }
    })
    class OpeningMediaRecorder {
      static isTypeSupported = (mimeType: string) => mimeType === 'audio/webm;codecs=opus'
      state: RecordingState = 'inactive'
      mimeType = 'audio/webm;codecs=opus'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onerror: (() => void) | null = null
      onstop: (() => void) | null = null
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
      }
    }
    vi.stubGlobal('MediaRecorder', OpeningMediaRecorder)
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn()
    })

    const startPromise = preview.startRecording()

    expect(preview.state.value).toBe('opening')

    resolveStream?.(stream)
    await startPromise
    expect(preview.state.value).toBe('recording')
    await preview.cancel()
  })

  it('stops a late microphone stream immediately after opening is cancelled', async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined
    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }]
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => {
          resolveStream = resolve
        }))
      }
    })
    const recorderCreated = vi.fn()
    class LateMediaRecorder {
      static isTypeSupported = (mimeType: string) => mimeType === 'audio/webm;codecs=opus'
      constructor() {
        recorderCreated()
      }
    }
    vi.stubGlobal('MediaRecorder', LateMediaRecorder)
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn()
    })

    const startPromise = preview.startRecording()
    await preview.cancel()
    resolveStream?.(stream)
    await startPromise

    expect(stop).toHaveBeenCalledOnce()
    expect(recorderCreated).not.toHaveBeenCalled()
    expect(preview.state.value).toBe('idle')
  })

  it('enters stopping before the recorder stop event finalizes', async () => {
    const stream = {
      getTracks: () => [{ stop: vi.fn() }]
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    let recorder: StoppingMediaRecorder | undefined
    class StoppingMediaRecorder {
      static isTypeSupported = (mimeType: string) => mimeType === 'audio/webm;codecs=opus'
      state: RecordingState = 'inactive'
      mimeType = 'audio/webm;codecs=opus'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onerror: (() => void) | null = null
      onstop: (() => void) | null = null
      constructor() {
        recorder = this
      }
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
      }
    }
    vi.stubGlobal('MediaRecorder', StoppingMediaRecorder)
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn()
    })

    await preview.startRecording()
    preview.stopRecording()

    expect(preview.state.value).toBe('stopping')

    recorder!.onstop?.()
    await preview.cancel()
  })

  it('uses text fallback and stops the opened stream when recorder MIME is unsupported', async () => {
    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }]
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    class UnsupportedMediaRecorder {
      static isTypeSupported = () => false
    }
    vi.stubGlobal('MediaRecorder', UnsupportedMediaRecorder)
    const onFallbackText = vi.fn()
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn(),
      onFallbackText
    })

    await preview.startRecording()

    expect(preview.state.value).toBe('fallback_text')
    expect(stop).toHaveBeenCalledOnce()
    expect(onFallbackText).toHaveBeenCalledOnce()

    await preview.cancel()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('handles recorder error and cancel with exactly one stream teardown', async () => {
    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }]
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    let recorder: ErrorMediaRecorder | undefined
    class ErrorMediaRecorder {
      static isTypeSupported = (mimeType: string) => mimeType === 'audio/webm;codecs=opus'
      state: RecordingState = 'inactive'
      mimeType = 'audio/webm;codecs=opus'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onerror: (() => void) | null = null
      onstop: (() => void) | null = null
      stop = vi.fn(() => {
        this.state = 'inactive'
      })
      constructor() {
        recorder = this
      }
      start() {
        this.state = 'recording'
      }
    }
    vi.stubGlobal('MediaRecorder', ErrorMediaRecorder)
    const onFallbackText = vi.fn()
    const preview = useInterviewVoicePreview({
      onConfirmedText: vi.fn(),
      onFallbackText
    })

    await preview.startRecording()
    const onerror = recorder!.onerror!
    onerror()
    onerror()
    await preview.cancel()

    expect(recorder!.stop).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    expect(onFallbackText).toHaveBeenCalledOnce()
  })
})
