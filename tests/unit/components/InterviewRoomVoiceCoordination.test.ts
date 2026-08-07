import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGameProfileStore } from '@/features/game-profile'
import InterviewRoomView from '@/views/interview/InterviewRoomView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const routeHooks = vi.hoisted(() => ({
  beforeLeave: null as null | (() => Promise<void>)
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
    query: {}
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

  it('records a completed interview reward once when the room is reopened', async () => {
    interviewApi.getCurrentQuestion.mockResolvedValue({
      interviewId: 42,
      status: 'COMPLETED',
      currentQuestion: null
    })

    const first = await mountRoom()
    const gameProfile = useGameProfileStore()
    expect(gameProfile.xp).toBe(200)
    expect(gameProfile.streakDays).toBe(1)
    expect(gameProfile.todayMissionDone).toBe(0)
    first.unmount()

    const second = await mountRoom()
    expect(gameProfile.xp).toBe(200)
    expect(gameProfile.streakDays).toBe(1)
    second.unmount()
  })

  it('only grants answer XP when the interview evaluation is passing', async () => {
    interviewApi.streamAnswerReview.mockImplementation((_id, _payload, handlers) => {
      void handlers.onEvent('done', {
        result: {
          answerMessageId: 901,
          score: 42,
          evaluation: {
            score: 42,
            level: 'NEEDS_IMPROVEMENT',
            comment: '需要补强'
          },
          interviewStatus: 'IN_PROGRESS',
          nextAction: 'NEXT_QUESTION'
        }
      })
      return {
        abort: vi.fn(),
        finished: Promise.resolve()
      }
    })

    const wrapper = await mountRoom()
    const gameProfile = useGameProfileStore()
    await wrapper.find('textarea').setValue('A concise answer.')
    await wrapper.find('.answer-submit-action').trigger('click')
    await flushPromises()

    expect(gameProfile.xp).toBe(0)
    wrapper.unmount()
  })

  it('records completion XP immediately when finish returns a terminal status', async () => {
    interviewApi.finishInterview.mockResolvedValue({
      interviewId: 42,
      status: 'REPORT_GENERATING',
      reportStatus: 'GENERATING',
      message: 'finishing'
    })

    const wrapper = await mountRoom()
    const gameProfile = useGameProfileStore()
    await wrapper.find('.topbar-report-action').trigger('click')
    await flushPromises()

    expect(gameProfile.xp).toBe(200)
    expect(gameProfile.streakDays).toBe(1)
    wrapper.unmount()
  })
})
