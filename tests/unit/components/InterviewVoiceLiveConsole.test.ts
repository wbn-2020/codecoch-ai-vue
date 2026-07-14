import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  cancelAsr: vi.fn(),
  cancelTts: vi.fn(),
  cancelAnalysis: vi.fn(),
  completeAsr: vi.fn(),
  createTts: vi.fn(),
  createAnalysis: vi.fn(),
  createDeviceCheck: vi.fn(),
  getTts: vi.fn(),
  getAnalysis: vi.fn(),
  openAsr: vi.fn(),
  sendChunk: vi.fn()
}))

vi.mock('@/api/interviewVoiceProduct', () => ({
  cancelInterviewStreamingAsrApi: api.cancelAsr,
  cancelInterviewTtsTaskApi: api.cancelTts,
  cancelInterviewVoiceDeliveryAnalysisApi: api.cancelAnalysis,
  completeInterviewStreamingAsrApi: api.completeAsr,
  createInterviewTtsTaskApi: api.createTts,
  createInterviewVoiceDeliveryAnalysisApi: api.createAnalysis,
  createInterviewVoiceDeviceCheckApi: api.createDeviceCheck,
  getInterviewTtsTaskApi: api.getTts,
  getInterviewVoiceDeliveryAnalysisApi: api.getAnalysis,
  openInterviewStreamingAsrApi: api.openAsr,
  sendInterviewStreamingAsrChunkApi: api.sendChunk
}))

import InterviewVoiceLiveConsole from '@/views/interview/components/InterviewVoiceLiveConsole.vue'

const stubs = {
  'el-alert': { template: '<div class="alert-stub">{{ title }}</div>', props: ['title'] },
  'el-progress': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}

const mountConsole = (props: {
  disabled?: boolean
  persistRecording?: (request: {
    blob: Blob
    mimeType: string
    durationMs: number
    confirmedText: string
  }) => Promise<{
    voiceSubmissionId: number
    transcriptId: number
    transcriptConfidence?: number
    answerSource?: string
    fallback?: boolean
  }>
} = {}) => mount(InterviewVoiceLiveConsole, {
  props: {
    sessionId: 7,
    questionKey: 11,
    questionText: 'Describe a production incident.',
    ...props
  },
  global: { stubs }
})

const createStream = () => {
  const stop = vi.fn()
  const track = {
    stop,
    getSettings: () => ({
      sampleRate: 48_000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    })
  }
  return {
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track]
    } as unknown as MediaStream,
    stop
  }
}

describe('InterviewVoiceLiveConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.cancelAsr.mockResolvedValue(undefined)
    api.cancelTts.mockResolvedValue(undefined)
    api.cancelAnalysis.mockResolvedValue(undefined)
    api.createDeviceCheck.mockResolvedValue({ deviceCheckId: 31 })
    api.openAsr.mockResolvedValue({
      sessionId: 'asr-1',
      provider: 'SERVER_CONFIGURED',
      status: 'OPEN'
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lets the server choose TTS provider and releases rejected playback exactly once', async () => {
    const pause = vi.fn()
    const play = vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError'))
    class RejectingAudio {
      src = ''
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      pause = pause
      play = play
    }
    vi.stubGlobal('Audio', RejectingAudio)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tts')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    api.createTts.mockResolvedValue({
      taskId: 'tts-1',
      provider: 'SERVER_CONFIGURED',
      status: 'SUCCEEDED',
      contentType: 'audio/mpeg',
      audioBase64: 'AQ=='
    })

    const wrapper = mountConsole()
    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()

    expect(api.createTts).toHaveBeenCalledWith(
      {
        text: 'Describe a production incident.',
        locale: 'zh-CN',
        audioFormat: 'mp3',
        timeoutMs: 15_000
      },
      expect.any(Object)
    )
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()

    wrapper.unmount()
    await flushPromises()
    expect(pause).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('maps an Ogg Opus recorder to OGG_OPUS without client-selected provider or mock text', async () => {
    const { stream } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    const recorderOptions: MediaRecorderOptions[] = []
    class OggMediaRecorder {
      static isTypeSupported = (mimeType: string) => mimeType === 'audio/ogg;codecs=opus'
      state: RecordingState = 'inactive'
      mimeType: string
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onerror: (() => void) | null = null
      onstop: (() => void) | null = null
      constructor(_stream: MediaStream, options: MediaRecorderOptions = {}) {
        recorderOptions.push(options)
        this.mimeType = options.mimeType || ''
      }
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
      }
    }
    vi.stubGlobal('MediaRecorder', OggMediaRecorder)

    const wrapper = mountConsole()
    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()

    expect(recorderOptions).toEqual([{ mimeType: 'audio/ogg;codecs=opus' }])
    expect(api.openAsr).toHaveBeenCalledWith(
      {
        language: 'zh-CN',
        sampleRateHz: 48_000,
        channels: 1,
        encoding: 'OGG_OPUS',
        timeoutMs: 120_000
      },
      expect.any(Object)
    )

    wrapper.unmount()
    await flushPromises()
  })

  it('falls back to text and releases tracks when no supported recorder MIME exists', async () => {
    const { stream, stop } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    class UnsupportedMediaRecorder {
      static isTypeSupported = () => false
    }
    vi.stubGlobal('MediaRecorder', UnsupportedMediaRecorder)

    const wrapper = mountConsole()
    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()

    expect(api.openAsr).not.toHaveBeenCalled()
    expect(stop).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('文本')

    wrapper.unmount()
    await flushPromises()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('confirms manual fallback text without creating fake voice metrics', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined
    })

    const wrapper = mountConsole()
    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    await wrapper.find('textarea').setValue('manual fallback answer')
    const confirmButton = wrapper.findAll('button')
      .find((button) => button.text().includes('写入文本回答'))

    expect(confirmButton).toBeDefined()
    await confirmButton!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('transcript-confirmed')).toEqual([['manual fallback answer']])
    expect(api.createAnalysis).not.toHaveBeenCalled()
  })

  it('tears down recorder error and unmount through one cleanup path', async () => {
    const { stream, stop } = createStream()
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

    const wrapper = mountConsole()
    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    const onerror = recorder!.onerror!

    onerror()
    onerror()
    wrapper.unmount()
    await flushPromises()

    expect(recorder!.stop).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    expect(api.cancelAsr).toHaveBeenCalledOnce()
  })

  it('tears down a normal stop followed by unmount exactly once', async () => {
    const { stream, stop } = createStream()
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
      stop = vi.fn(() => {
        this.state = 'inactive'
        this.onstop?.()
      })
      constructor() {
        recorder = this
      }
      start() {
        this.state = 'recording'
      }
    }
    vi.stubGlobal('MediaRecorder', StoppingMediaRecorder)
    api.completeAsr.mockResolvedValue({
      sessionId: 'asr-1',
      provider: 'SERVER_CONFIGURED',
      status: 'COMPLETED',
      finalTranscript: 'final answer'
    })

    const wrapper = mountConsole()
    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    await wrapper.findAll('button')[3].trigger('click')
    await flushPromises()
    wrapper.unmount()
    await flushPromises()

    expect(recorder!.stop).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    expect(api.completeAsr).toHaveBeenCalledOnce()
    expect(api.cancelAsr).toHaveBeenCalledOnce()
  })

  it('persists the full realtime recording before analysis and sends only confirmed evidence ids', async () => {
    const { stream } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    let recorder: PersistedMediaRecorder | undefined
    class PersistedMediaRecorder {
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
        this.onstop?.()
      }
    }
    vi.stubGlobal('MediaRecorder', PersistedMediaRecorder)
    api.sendChunk
      .mockResolvedValueOnce({
        sessionId: 'asr-1',
        provider: 'SERVER_CONFIGURED',
        status: 'OPEN',
        partialTranscript: 'streaming',
        acceptedChunks: 1
      })
      .mockResolvedValueOnce({
        sessionId: 'asr-1',
        provider: 'SERVER_CONFIGURED',
        status: 'OPEN',
        partialTranscript: 'streaming answer',
        acceptedChunks: 2
      })
    api.completeAsr.mockResolvedValue({
      sessionId: 'asr-1',
      provider: 'SERVER_CONFIGURED',
      status: 'COMPLETED',
      finalTranscript: 'streaming answer',
      acceptedChunks: 2
    })
    const persisted = {
      voiceSubmissionId: 81,
      transcriptId: 91,
      transcriptConfidence: 0.96,
      answerSource: 'VOICE_TRANSCRIPT'
    }
    const persistRecording = vi.fn().mockResolvedValue(persisted)
    api.createAnalysis.mockResolvedValue({
      analysisId: 101,
      sessionId: 7,
      voiceSubmissionId: 81,
      taskStatus: 'SUCCEEDED'
    })
    const wrapper = mountConsole({ persistRecording })

    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    const firstChunk = new Blob(['first-'], { type: 'audio/webm;codecs=opus' })
    const secondChunk = new Blob(['second'], { type: 'audio/webm;codecs=opus' })
    recorder!.ondataavailable?.({ data: firstChunk } as BlobEvent)
    recorder!.ondataavailable?.({ data: secondChunk } as BlobEvent)
    await wrapper.findAll('button')[3].trigger('click')
    await flushPromises()
    await wrapper.find('textarea').setValue('reviewed streaming answer')
    await wrapper.find('.transcript-panel__actions button').trigger('click')
    await flushPromises()

    expect(persistRecording).toHaveBeenCalledOnce()
    const request = persistRecording.mock.calls[0][0]
    expect(request.confirmedText).toBe('reviewed streaming answer')
    expect(request.mimeType).toBe('audio/webm;codecs=opus')
    expect(request.durationMs).toBeGreaterThan(0)
    expect(request.blob.size).toBe(firstChunk.size + secondChunk.size)
    expect(await request.blob.text()).toBe('first-second')
    expect(api.createAnalysis).toHaveBeenCalledWith(
      7,
      {
        voiceSubmissionId: 81,
        deviceCheckId: 31,
        timeoutMs: 10_000
      },
      expect.any(Object)
    )
    expect(api.createAnalysis.mock.calls[0][1]).not.toHaveProperty('transcript')
    expect(api.createAnalysis.mock.calls[0][1]).not.toHaveProperty('audioDurationMs')
    expect(api.createAnalysis.mock.calls[0][1]).not.toHaveProperty('timestampSource')
    expect(api.createAnalysis.mock.calls[0][1]).not.toHaveProperty('wordTimings')
    expect(persistRecording.mock.invocationCallOrder[0])
      .toBeLessThan(api.createAnalysis.mock.invocationCallOrder[0])
    expect(wrapper.emitted('transcript-confirmed')).toEqual([
      ['reviewed streaming answer', persisted]
    ])
  })

  it('does not request analysis when persistence returns no confirmed voice submission id', async () => {
    const { stream } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    let recorder: MissingEvidenceMediaRecorder | undefined
    class MissingEvidenceMediaRecorder {
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
        this.onstop?.()
      }
    }
    vi.stubGlobal('MediaRecorder', MissingEvidenceMediaRecorder)
    api.sendChunk.mockResolvedValue({
      sessionId: 'asr-1',
      provider: 'SERVER_CONFIGURED',
      status: 'OPEN',
      partialTranscript: 'answer',
      acceptedChunks: 1
    })
    api.completeAsr.mockResolvedValue({
      sessionId: 'asr-1',
      provider: 'SERVER_CONFIGURED',
      status: 'COMPLETED',
      finalTranscript: 'answer',
      acceptedChunks: 1
    })
    const persistRecording = vi.fn().mockResolvedValue({ transcriptId: 91 })
    const wrapper = mountConsole({
      persistRecording: persistRecording as unknown as NonNullable<
        Parameters<typeof mountConsole>[0]['persistRecording']
      >
    })

    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    recorder!.ondataavailable?.({
      data: new Blob(['answer'], { type: 'audio/webm;codecs=opus' })
    } as BlobEvent)
    await wrapper.findAll('button')[3].trigger('click')
    await flushPromises()
    await wrapper.find('.transcript-panel__actions button').trigger('click')
    await flushPromises()

    expect(persistRecording).toHaveBeenCalledOnce()
    expect(api.createAnalysis).not.toHaveBeenCalled()
    expect(wrapper.emitted('transcript-confirmed')).toBeUndefined()
  })

  it('reports realtime ASR runtime activity until disabled cancels it', async () => {
    const { stream } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    class ActiveMediaRecorder {
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
    vi.stubGlobal('MediaRecorder', ActiveMediaRecorder)
    const wrapper = mountConsole()

    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('runtime-active-changed')).toContainEqual([true])

    await wrapper.setProps({ disabled: true })
    await flushPromises()

    expect(wrapper.emitted('runtime-active-changed')?.at(-1)).toEqual([false])
  })

  it('releases recorder, stream, and remote chunk session when disabled becomes true', async () => {
    const { stream, stop } = createStream()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    })
    let recorder: DisabledMediaRecorder | undefined
    class DisabledMediaRecorder {
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
    vi.stubGlobal('MediaRecorder', DisabledMediaRecorder)
    const wrapper = mountConsole()

    await wrapper.findAll('button')[2].trigger('click')
    await flushPromises()
    await wrapper.setProps({ disabled: true })
    await flushPromises()

    expect(recorder!.stop).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    expect(api.cancelAsr).toHaveBeenCalledOnce()
    expect(api.completeAsr).not.toHaveBeenCalled()

    wrapper.unmount()
    await flushPromises()
    expect(recorder!.stop).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    expect(api.cancelAsr).toHaveBeenCalledOnce()
  })
})
