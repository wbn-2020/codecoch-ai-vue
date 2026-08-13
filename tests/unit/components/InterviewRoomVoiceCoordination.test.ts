import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import InterviewRoomView from '@/views/interview/InterviewRoomView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const routeHooks = vi.hoisted(() => ({
  beforeLeave: null as null | (() => Promise<void>)
}))
const routeState = vi.hoisted(() => ({
  query: { voicePreflight: 'ready' } as Record<string, string>
}))
const liveConsole = vi.hoisted(() => ({
  cancelActiveAsr: vi.fn(),
  resetRealtimeVoice: vi.fn()
}))
const dangerAction = vi.hoisted(() => ({
  confirm: vi.fn()
}))
const interviewApi = vi.hoisted(() => ({
  confirmVoiceTranscript: vi.fn(),
  createVoiceSubmission: vi.fn(),
  deleteVoiceAudio: vi.fn(),
  discardVoiceSubmission: vi.fn(),
  finishInterview: vi.fn(),
  getCurrentQuestion: vi.fn(),
  startInterview: vi.fn(),
  streamAnswerReview: vi.fn(),
  submitAnswer: vi.fn(),
  transcribeVoiceSubmission: vi.fn(),
  uploadVoiceAudio: vi.fn()
}))
const voiceProductApi = vi.hoisted(() => ({
  bindScenario: vi.fn(),
  cancelAnalysis: vi.fn(),
  cancelAsr: vi.fn(),
  cancelTts: vi.fn(),
  completeAsr: vi.fn(),
  createAnalysis: vi.fn(),
  createDeviceCheck: vi.fn(),
  createTts: vi.fn(),
  getAnalysis: vi.fn(),
  getScenarioBinding: vi.fn(),
  getTts: vi.fn(),
  openAsr: vi.fn(),
  sendChunk: vi.fn()
}))

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (guard: () => Promise<void>) => {
    routeHooks.beforeLeave = guard
  },
  useRoute: () => ({
    params: { id: '42' },
    query: routeState.query
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: dangerAction.confirm
}))

vi.mock('@/api/interview', () => ({
  confirmInterviewVoiceTranscriptApi: interviewApi.confirmVoiceTranscript,
  createInterviewVoiceSubmissionApi: interviewApi.createVoiceSubmission,
  deleteInterviewVoiceAudioApi: interviewApi.deleteVoiceAudio,
  discardInterviewVoiceSubmissionApi: interviewApi.discardVoiceSubmission,
  finishInterviewApi: interviewApi.finishInterview,
  getCurrentInterviewQuestionApi: interviewApi.getCurrentQuestion,
  startInterviewApi: interviewApi.startInterview,
  streamInterviewAnswerReviewApi: interviewApi.streamAnswerReview,
  submitInterviewAnswerApi: interviewApi.submitAnswer,
  transcribeInterviewVoiceSubmissionApi: interviewApi.transcribeVoiceSubmission,
  uploadInterviewVoiceAudioApi: interviewApi.uploadVoiceAudio
}))

vi.mock('@/api/interviewVoiceProduct', () => ({
  bindInterviewScenarioApi: voiceProductApi.bindScenario,
  cancelInterviewStreamingAsrApi: voiceProductApi.cancelAsr,
  cancelInterviewTtsTaskApi: voiceProductApi.cancelTts,
  cancelInterviewVoiceDeliveryAnalysisApi: voiceProductApi.cancelAnalysis,
  completeInterviewStreamingAsrApi: voiceProductApi.completeAsr,
  createInterviewTtsTaskApi: voiceProductApi.createTts,
  createInterviewVoiceDeliveryAnalysisApi: voiceProductApi.createAnalysis,
  createInterviewVoiceDeviceCheckApi: voiceProductApi.createDeviceCheck,
  getInterviewScenarioBindingApi: voiceProductApi.getScenarioBinding,
  getInterviewTtsTaskApi: voiceProductApi.getTts,
  getInterviewVoiceDeliveryAnalysisApi: voiceProductApi.getAnalysis,
  openInterviewStreamingAsrApi: voiceProductApi.openAsr,
  sendInterviewStreamingAsrChunkApi: voiceProductApi.sendChunk
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

const VoiceConsoleStub = defineComponent({
  name: 'InterviewVoiceLiveConsole',
  props: {
    disabled: Boolean,
    persistRecording: Function,
    questionKey: [String, Number]
  },
  emits: ['runtime-active-changed'],
  setup(props, { emit, expose }) {
    expose({
      cancelActiveAsr: () => liveConsole.cancelActiveAsr(),
      resetRealtimeVoice: () => liveConsole.resetRealtimeVoice()
    })
    return {
      props,
      activate: () => emit('runtime-active-changed', true)
    }
  },
  template: `
    <div
      class="voice-console-stub"
      :data-disabled="String(props.disabled)"
      :data-question-key="String(props.questionKey)"
    >
      <button class="activate-live-asr" @click="activate">activate live ASR</button>
    </div>
  `
})

const stubs = {
  AppState: {
    template: '<div><slot /></div>'
  },
  InterviewVoiceDeliveryMetrics: true,
  InterviewVoiceLiveConsole: VoiceConsoleStub,
  MarkdownPreview: true,
  StatusTag: true,
  'el-alert': true,
  'el-button': {
    props: ['disabled'],
    template: '<button :disabled="disabled"><slot /></button>'
  },
  'el-input': {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: `
      <textarea
        :disabled="disabled"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `
  },
  'el-progress': true,
  'el-tab-pane': {
    template: '<div><slot /></div>'
  },
  'el-tabs': {
    template: '<div><slot /></div>'
  },
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

const currentQuestion = {
  interviewId: 42,
  status: 'IN_PROGRESS',
  currentQuestion: {
    messageId: 101,
    questionId: 202,
    questionContent: 'Describe a production incident.',
    isFollowUp: false,
    stageId: 1
  }
} as const

const mountRoom = async () => {
  const wrapper = mount(InterviewRoomView, {
    global: {
      stubs,
      directives: {
        loading: () => undefined
      }
    }
  })
  await flushPromises()
  return wrapper
}

const getCompatibilityStartButton = (wrapper: Awaited<ReturnType<typeof mountRoom>>) =>
  wrapper.find('.voice-preview__actions').findAll('button')[0]

describe('InterviewRoomView voice recording coordination', () => {
  const originalMediaDevices = navigator.mediaDevices

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    routeHooks.beforeLeave = null
    routeState.query = { voicePreflight: 'ready' }
    routerPush.mockResolvedValue(undefined)
    liveConsole.cancelActiveAsr.mockResolvedValue(undefined)
    liveConsole.resetRealtimeVoice.mockResolvedValue(undefined)
    dangerAction.confirm.mockResolvedValue(true)
    interviewApi.getCurrentQuestion.mockResolvedValue(currentQuestion)
    interviewApi.discardVoiceSubmission.mockResolvedValue(undefined)
    interviewApi.streamAnswerReview.mockReturnValue({
      abort: vi.fn(),
      finished: Promise.resolve()
    })
    voiceProductApi.getScenarioBinding.mockRejectedValue(new Error('not bound'))
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices
    })
    vi.unstubAllGlobals()
  })

  it('disables compatibility recording while realtime ASR is active', async () => {
    const wrapper = await mountRoom()

    await wrapper.find('.activate-live-asr').trigger('click')
    await nextTick()

    expect(getCompatibilityStartButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('keeps session and deep feedback content behind compact disclosure controls', async () => {
    const wrapper = await mountRoom()

    expect(wrapper.find('.rail-overview').exists()).toBe(true)
    expect(wrapper.find('.rail-overview').text()).toContain('训练进度')
    expect(wrapper.find('.room-feedback-drawer > summary').text()).toContain('本题反馈')
    expect(wrapper.find('.answer-console').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps voice-facing recovery messages in Chinese without implementation details', () => {
    const roomSource = readFileSync(
      resolve(process.cwd(), 'src/views/interview/InterviewRoomView.vue'),
      'utf8'
    )
    const liveConsoleSource = readFileSync(
      resolve(process.cwd(), 'src/views/interview/components/InterviewVoiceLiveConsole.vue'),
      'utf8'
    )

    expect(roomSource).not.toContain('No active interview question')
    expect(roomSource).not.toContain('Voice transcript confirmation failed')
    expect(roomSource).not.toContain('Please confirm or clear the voice transcript draft')
    expect(liveConsoleSource).not.toContain('Confirmed voice submission evidence')
    expect(roomSource).toContain('当前没有可作答的面试题，请刷新页面后重试。')
    expect(liveConsoleSource).toContain('语音提交凭证缺失，暂时无法进行表达分析。')
  })

  it('keeps the current question contract fixed above the scrollable question area', async () => {
    routeState.query = {}
    const wrapper = await mountRoom()

    expect(wrapper.find('.question-briefbar').text()).toContain('第 1 题')
    expect(wrapper.find('.question-briefbar').text()).toContain('文本作答（默认）')
    expect(wrapper.find('.question-briefbar').text()).toContain('单题建议 03:00')
    expect(wrapper.find('.voice-tool-summary').text()).toContain('语音未预检')
    expect(wrapper.find('.voice-preflight-action').text()).toContain('开始 10 秒预检')
    expect(wrapper.find('.answer-submit-action').exists()).toBe(true)
    wrapper.unmount()
  })

  it('exposes voice unavailability and text fallback when preflight cannot start', async () => {
    routeState.query = {}
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined
    })
    const wrapper = await mountRoom()

    await wrapper.find('.voice-preflight-action').trigger('click')
    await flushPromises()

    expect(wrapper.find('.voice-tool-summary').text()).toContain('语音不可用')
    expect(wrapper.find('.voice-preflight-panel').text()).toContain('使用文本回答')
    wrapper.unmount()
  })

  it('finishes the 10 second preflight and releases the microphone stream', async () => {
    routeState.query = {}
    vi.useFakeTimers()
    const stopTrack = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [{ readyState: 'live' }],
          getTracks: () => [{ stop: stopTrack }]
        })
      }
    })
    vi.stubGlobal('MediaRecorder', class {})
    const wrapper = await mountRoom()

    await wrapper.find('.voice-preflight-action').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(10_000)
    await nextTick()

    expect(wrapper.find('.voice-tool-summary').text()).toContain('语音已预检')
    expect(stopTrack).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('removes the answer submit action when the report becomes the primary outcome', async () => {
    interviewApi.getCurrentQuestion.mockResolvedValue({
      interviewId: 42,
      status: 'COMPLETED',
      currentQuestion: null
    })
    const wrapper = await mountRoom()

    expect(wrapper.find('.completion-primary-action').exists()).toBe(true)
    expect(wrapper.find('.answer-submit-action').exists()).toBe(false)
    expect(wrapper.find('.topbar-report-action').exists()).toBe(true)
    wrapper.unmount()
  })

  it('disables realtime ASR and answer submission throughout compatibility opening and stopping', async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined
    const stopTrack = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => {
          resolveStream = resolve
        }))
      }
    })
    let recorder: RecordingMediaRecorder | undefined
    class RecordingMediaRecorder {
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
    vi.stubGlobal('MediaRecorder', RecordingMediaRecorder)
    const wrapper = await mountRoom()

    const startPromise = getCompatibilityStartButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('.voice-console-stub').attributes('data-disabled')).toBe('true')
    expect(wrapper.find('.answer-submit-action').attributes('disabled')).toBeDefined()

    resolveStream?.({
      getTracks: () => [{ stop: stopTrack }]
    } as unknown as MediaStream)
    await startPromise
    await flushPromises()

    expect(wrapper.find('.voice-console-stub').attributes('data-disabled')).toBe('true')
    await wrapper.find('.voice-preview__actions').findAll('button')[1].trigger('click')
    await nextTick()

    expect(recorder!.state).toBe('inactive')
    expect(wrapper.find('.voice-console-stub').attributes('data-disabled')).toBe('true')
    expect(wrapper.find('.answer-submit-action').attributes('disabled')).toBeDefined()
    wrapper.unmount()
    await flushPromises()
  })

  it('awaits realtime ASR cancellation before starting answer submission', async () => {
    let resolveCancellation: (() => void) | undefined
    liveConsole.resetRealtimeVoice.mockImplementation(() => new Promise<void>((resolve) => {
      resolveCancellation = resolve
    }))
    const wrapper = await mountRoom()
    await wrapper.find('textarea').setValue('A concise answer.')
    const submitButton = wrapper.find('.answer-submit-action')

    expect(submitButton).toBeDefined()
    const submitPromise = submitButton!.trigger('click')
    await nextTick()

    expect(liveConsole.resetRealtimeVoice).toHaveBeenCalledOnce()
    expect(interviewApi.streamAnswerReview).not.toHaveBeenCalled()

    resolveCancellation?.()
    await submitPromise
    await flushPromises()

    expect(interviewApi.streamAnswerReview).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('reuses upload, submission, transcribe, and confirm before returning realtime evidence', async () => {
    interviewApi.uploadVoiceAudio.mockResolvedValue({ fileId: 501 })
    interviewApi.createVoiceSubmission.mockResolvedValue({
      voiceSubmissionId: 601,
      voiceStatus: 'UPLOADED'
    })
    interviewApi.transcribeVoiceSubmission.mockResolvedValue({
      voiceSubmissionId: 601,
      voiceStatus: 'TRANSCRIBE_FAILED',
      transcript: {
        transcriptId: 701,
        voiceSubmissionId: 601,
        transcriptStatus: 'FAILED',
        fallback: true
      }
    })
    interviewApi.confirmVoiceTranscript.mockResolvedValue({
      transcriptId: 701,
      voiceSubmissionId: 601,
      transcriptStatus: 'CONFIRMED',
      confirmedText: 'reviewed realtime answer',
      fallback: true
    })
    const wrapper = await mountRoom()
    const persistRecording = wrapper.findComponent(VoiceConsoleStub)
      .props('persistRecording') as (request: {
        blob: Blob
        mimeType: string
        durationMs: number
        confirmedText: string
      }) => Promise<Record<string, unknown>>
    const blob = new Blob(['complete realtime audio'], { type: 'audio/webm;codecs=opus' })

    const result = await persistRecording({
      blob,
      mimeType: 'audio/webm;codecs=opus',
      durationMs: 3_200,
      confirmedText: 'reviewed realtime answer'
    })

    expect(interviewApi.uploadVoiceAudio).toHaveBeenCalledOnce()
    const uploadedFile = interviewApi.uploadVoiceAudio.mock.calls[0][0] as File
    expect(uploadedFile.size).toBe(blob.size)
    expect(interviewApi.createVoiceSubmission).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        fileId: 501,
        questionMessageId: 101,
        questionId: 202,
        audioDurationMs: 3_200,
        mimeType: 'audio/webm;codecs=opus'
      }),
      expect.any(Object)
    )
    expect(interviewApi.transcribeVoiceSubmission).toHaveBeenCalledWith(
      42,
      601,
      expect.any(Object)
    )
    expect(interviewApi.confirmVoiceTranscript).toHaveBeenCalledWith(
      42,
      701,
      {
        confirmedText: 'reviewed realtime answer',
        lowConfidenceAcknowledged: false
      },
      expect.any(Object)
    )
    expect(interviewApi.uploadVoiceAudio.mock.invocationCallOrder[0])
      .toBeLessThan(interviewApi.createVoiceSubmission.mock.invocationCallOrder[0])
    expect(interviewApi.createVoiceSubmission.mock.invocationCallOrder[0])
      .toBeLessThan(interviewApi.transcribeVoiceSubmission.mock.invocationCallOrder[0])
    expect(interviewApi.transcribeVoiceSubmission.mock.invocationCallOrder[0])
      .toBeLessThan(interviewApi.confirmVoiceTranscript.mock.invocationCallOrder[0])
    expect(result).toMatchObject({
      voiceSubmissionId: 601,
      transcriptId: 701,
      answerSource: 'MANUAL_TRANSCRIPT',
      fallback: true
    })
    wrapper.unmount()
  })

  it('awaits realtime cleanup before replacing the current question', async () => {
    let resolveReset: (() => void) | undefined
    liveConsole.resetRealtimeVoice.mockImplementation(() => new Promise<void>((resolve) => {
      resolveReset = resolve
    }))
    interviewApi.getCurrentQuestion
      .mockResolvedValueOnce(currentQuestion)
      .mockResolvedValueOnce({
        ...currentQuestion,
        currentQuestion: {
          ...currentQuestion.currentQuestion,
          messageId: 303,
          questionId: 404,
          questionContent: 'Describe the follow-up mitigation.'
        }
      })
    const wrapper = await mountRoom()

    const refreshPromise = wrapper.find('.answer-reload-action').trigger('click')
    await nextTick()

    expect(liveConsole.resetRealtimeVoice).toHaveBeenCalledOnce()
    expect(wrapper.find('.voice-console-stub').attributes('data-question-key')).toBe('101')

    resolveReset?.()
    await refreshPromise
    await flushPromises()

    expect(wrapper.find('.voice-console-stub').attributes('data-question-key')).toBe('303')
    wrapper.unmount()
  })

  it('awaits realtime cleanup before finishing the interview', async () => {
    let resolveReset: (() => void) | undefined
    liveConsole.resetRealtimeVoice.mockImplementation(() => new Promise<void>((resolve) => {
      resolveReset = resolve
    }))
    interviewApi.finishInterview.mockResolvedValue({
      interviewId: 42,
      message: 'finishing'
    })
    const wrapper = await mountRoom()
    const finishButton = wrapper.find('.topbar-report-action')

    expect(finishButton.exists()).toBe(true)
    const finishPromise = finishButton.trigger('click')
    await flushPromises()

    expect(liveConsole.resetRealtimeVoice).toHaveBeenCalledOnce()
    expect(interviewApi.finishInterview).not.toHaveBeenCalled()

    resolveReset?.()
    await finishPromise
    await flushPromises()

    expect(interviewApi.finishInterview).toHaveBeenCalledWith(42)
    wrapper.unmount()
  })

  it('awaits local media release and realtime cancellation before route leave completes', async () => {
    const stopTrack = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }]
        })
      }
    })
    class RouteLeaveMediaRecorder {
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
    vi.stubGlobal('MediaRecorder', RouteLeaveMediaRecorder)
    const wrapper = await mountRoom()
    await getCompatibilityStartButton(wrapper).trigger('click')
    await flushPromises()
    liveConsole.resetRealtimeVoice.mockClear()
    let resolveReset: (() => void) | undefined
    liveConsole.resetRealtimeVoice.mockImplementation(() => new Promise<void>((resolve) => {
      resolveReset = resolve
    }))
    let leaveCompleted = false

    const leavePromise = routeHooks.beforeLeave!().then(() => {
      leaveCompleted = true
    })
    await nextTick()

    expect(stopTrack).toHaveBeenCalledOnce()
    expect(liveConsole.resetRealtimeVoice).toHaveBeenCalledOnce()
    expect(leaveCompleted).toBe(false)

    resolveReset?.()
    await leavePromise

    expect(leaveCompleted).toBe(true)
    wrapper.unmount()
  })

  it('uses restored server timing and progress facts without resetting the same question', async () => {
    vi.useFakeTimers()
    const presentedAt = new Date(Date.now() - 65_000).toISOString()
    interviewApi.getCurrentQuestion
      .mockResolvedValueOnce({
        ...currentQuestion,
        currentQuestionIndex: 3,
        totalQuestionCount: 8,
        answeredQuestionCount: 2,
        currentQuestion: {
          ...currentQuestion.currentQuestion,
          questionPresentedAt: presentedAt
        }
      })
      .mockResolvedValueOnce({
        ...currentQuestion,
        currentQuestionIndex: 3,
        totalQuestionCount: 8,
        answeredQuestionCount: 2,
        currentQuestion: {
          ...currentQuestion.currentQuestion,
          questionPresentedAt: presentedAt
        }
      })
    const wrapper = await mountRoom()

    expect(wrapper.find('.question-briefbar').text()).toContain('第 3 / 8 题')
    expect(wrapper.find('.topbar-progress').text()).toContain('2/8')
    expect(wrapper.find('.room-timer').text()).toBe('01:05')

    await wrapper.find('.answer-reload-action').trigger('click')
    await flushPromises()
    expect(wrapper.find('.room-timer').text()).toBe('01:05')
    wrapper.unmount()
  })

  it('merges follow-up progress and outline from the answer-review stream into the current room state', async () => {
    interviewApi.getCurrentQuestion.mockResolvedValue({
      ...currentQuestion,
      currentQuestionIndex: 2,
      totalQuestionCount: 5,
      answeredQuestionCount: 1,
      outline: [
        { stageOrder: 1, stageName: '基础', expectedQuestionCount: 5 }
      ]
    })
    interviewApi.streamAnswerReview.mockImplementation((_id, _payload, handlers) => {
      void handlers.onEvent('done', {
        result: {
          interviewId: 42,
          answerMessageId: 101,
          evaluation: { comment: '继续说明恢复策略。' },
          nextAction: 'FOLLOW_UP',
          nextQuestion: {
            messageId: 303,
            questionId: 404,
            questionContent: 'Describe the rollback plan.',
            isFollowUp: true,
            stageId: 1
          },
          interviewStatus: 'IN_PROGRESS',
          progress: {
            currentQuestionIndex: 3,
            totalQuestionCount: 5,
            answeredQuestionCount: 2
          },
          outline: [
            { stageOrder: 1, stageName: '基础', expectedQuestionCount: 5 },
            { stageOrder: 2, stageName: '深入', expectedQuestionCount: 3 }
          ]
        }
      })
      return {
        abort: vi.fn(),
        finished: Promise.resolve()
      }
    })
    const wrapper = await mountRoom()
    await wrapper.find('textarea').setValue('I would roll back the release.')
    await wrapper.find('.answer-submit-action').trigger('click')
    await flushPromises()

    expect(wrapper.find('.voice-console-stub').attributes('data-question-key')).toBe('303')
    expect(wrapper.find('.topbar-progress').text()).toContain('2/5')
    expect(wrapper.find('.question-briefbar').text()).toContain('第 3 / 5 题')
    expect((wrapper.vm as unknown as {
      current: { outline?: Array<{ stageName: string }> }
    }).current.outline?.map((stage) => stage.stageName)).toEqual(['基础', '深入'])
    wrapper.unmount()
  })
})
