<template>
  <section class="voice-live-console">
    <div class="voice-live-console__head">
      <div>
        <span class="voice-kicker">语音面试</span>
        <strong>TTS 读题与流式字幕</strong>
        <p>语音能力始终可取消；字幕写入回答前必须由你确认。</p>
      </div>
      <div class="voice-live-console__status">
        <el-tag :type="preflightReady ? 'success' : 'info'" effect="plain">
          {{ preflightReady ? '设备已预检' : '未预检' }}
        </el-tag>
        <el-tag v-if="asrProvider" type="warning" effect="plain">
          {{ asrProvider === 'MOCK' ? 'Mock 字幕通道' : asrProvider }}
        </el-tag>
      </div>
    </div>

    <div class="voice-control-grid">
      <article class="voice-control">
        <div class="voice-control__title">
          <div>
            <span>AI 读题</span>
            <strong>{{ ttsLabel }}</strong>
          </div>
          <Volume2 :size="18" />
        </div>
        <p>{{ ttsHint }}</p>
        <div class="voice-actions">
          <el-button
            type="primary"
            plain
            :loading="ttsState === 'loading'"
            :disabled="disabled || !questionText.trim() || ttsState === 'playing'"
            @click="playQuestion"
          >
            <Volume2 :size="16" />
            播放
          </el-button>
          <el-button
            :disabled="!['loading', 'playing'].includes(ttsState)"
            @click="stopTts"
          >
            <VolumeX :size="16" />
            停止
          </el-button>
        </div>
      </article>

      <article class="voice-control">
        <div class="voice-control__title">
          <div>
            <span>实时字幕</span>
            <strong>{{ asrLabel }}</strong>
          </div>
          <Radio :size="18" />
        </div>
        <div class="voice-level">
          <span>输入音量 {{ inputLevel }}%</span>
          <span>{{ recordingSeconds }}s</span>
        </div>
        <el-progress
          :percentage="inputLevel"
          :stroke-width="8"
          :show-text="false"
          :status="inputLevel > 90 ? 'exception' : inputLevel >= 8 ? 'success' : undefined"
        />
        <div class="voice-actions">
          <el-button
            type="primary"
            :disabled="disabled || ['opening', 'recording', 'stopping'].includes(asrState)"
            @click="startStreamingAsr"
          >
            <Mic :size="16" />
            开始字幕
          </el-button>
          <el-button :disabled="asrState !== 'recording'" @click="stopStreamingAsr">
            <MicOff :size="16" />
            停止
          </el-button>
          <el-button :disabled="asrState === 'idle' && !transcriptDraft" @click="useTextFallback">
            <Keyboard :size="16" />
            文本降级
          </el-button>
        </div>
      </article>
    </div>

    <el-alert
      v-if="asrProvider === 'MOCK'"
      type="warning"
      :closable="false"
      show-icon
      title="当前后端提供的是 Mock 流式 ASR：它用于验证会话、分片、取消和字幕状态，不代表真实语音识别结果。请人工校对后再写入回答。"
    />

    <div v-if="partialTranscript || transcriptDraft || asrState === 'fallback'" class="transcript-panel">
      <div class="transcript-panel__head">
        <div>
          <span>{{ asrState === 'recording' ? '实时字幕' : '字幕草稿' }}</span>
          <strong>{{ asrState === 'recording' ? '录音进行中' : '确认后才写入回答' }}</strong>
        </div>
        <el-tag :type="asrState === 'recording' ? 'success' : 'info'" effect="plain">
          {{ acceptedChunks }} 个音频分片
        </el-tag>
      </div>
      <p v-if="asrState === 'recording'" class="partial-transcript">
        {{ partialTranscript || '正在等待第一段字幕...' }}
      </p>
      <el-input
        v-else
        v-model="transcriptDraft"
        type="textarea"
        :rows="4"
        :disabled="disabled || analysisLoading"
        placeholder="请校对或手动输入本轮回答，确认后才会写入正式回答。"
      />
      <div v-if="asrState !== 'recording'" class="transcript-panel__actions">
        <span>没有逐词时间戳时，表达分析不会展示停顿次数。</span>
        <el-button
          type="primary"
          plain
          :disabled="disabled || !transcriptDraft.trim() || analysisLoading"
          @click="confirmTranscript"
        >
          <Check :size="16" />
          写入文本回答
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      type="warning"
      :closable="false"
      show-icon
      :title="errorMessage"
    />
  </section>
</template>

<script setup lang="ts">
import { Check, Keyboard, Mic, MicOff, Radio, Volume2, VolumeX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import {
  cancelInterviewStreamingAsrApi,
  cancelInterviewTtsTaskApi,
  cancelInterviewVoiceDeliveryAnalysisApi,
  completeInterviewStreamingAsrApi,
  createInterviewTtsTaskApi,
  createInterviewVoiceDeliveryAnalysisApi,
  createInterviewVoiceDeviceCheckApi,
  getInterviewTtsTaskApi,
  getInterviewVoiceDeliveryAnalysisApi,
  openInterviewStreamingAsrApi,
  sendInterviewStreamingAsrChunkApi
} from '@/api/interviewVoiceProduct'
import {
  audioBase64ToBlob,
  blobToBase64,
  chooseInterviewVoiceRecorderProfile,
  isInterviewVoiceTaskSuccessful,
  isInterviewVoiceTaskTerminal
} from '@/features/interview-voice-product'
import type {
  InterviewRealtimeVoicePersistenceRequest,
  InterviewRealtimeVoicePersistenceResult,
  InterviewStreamingAsrSessionVO,
  InterviewVoiceDeliveryAnalysisVO
} from '@/types/interviewVoiceProduct'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  sessionId: number
  questionKey: string | number
  questionText: string
  disabled?: boolean
  preflightReady?: boolean
  persistRecording?: (
    request: InterviewRealtimeVoicePersistenceRequest
  ) => Promise<InterviewRealtimeVoicePersistenceResult>
}>(), {
  disabled: false,
  preflightReady: false
})

const emit = defineEmits<{
  'transcript-confirmed': [text: string, evidence?: InterviewRealtimeVoicePersistenceResult]
  'analysis-updated': [analysis: InterviewVoiceDeliveryAnalysisVO]
  'runtime-active-changed': [active: boolean]
}>()

type TtsState = 'idle' | 'loading' | 'playing' | 'completed' | 'error'
type AsrState = 'idle' | 'opening' | 'recording' | 'stopping' | 'draft' | 'fallback' | 'error'

const ttsState = ref<TtsState>('idle')
const ttsMessage = ref('')
const asrState = ref<AsrState>('idle')
const asrProvider = ref('')
const partialTranscript = ref('')
const transcriptDraft = ref('')
const acceptedChunks = ref(0)
const inputLevel = ref(0)
const recordingSeconds = ref(0)
const errorMessage = ref('')
const analysisLoading = ref(false)
const asrRuntimeActive = computed(() =>
  ['opening', 'recording', 'stopping'].includes(asrState.value) || analysisLoading.value
)

let ttsTaskId = ''
let ttsController: AbortController | null = null
let ttsAudio: HTMLAudioElement | null = null
let ttsObjectUrl = ''
let speechUtterance: SpeechSynthesisUtterance | null = null
let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrameId: number | undefined
let recordingTimer: number | undefined
let recordingStartedAt = 0
let lastRecordingDurationMs = 0
let recordedAudioChunks: Blob[] = []
let recordedAudioBlob: Blob | null = null
let recordedAudioMimeType = ''
let asrSession: InterviewStreamingAsrSessionVO | null = null
let asrController: AbortController | null = null
let asrSequence = 0
let asrOperationVersion = 0
let asrChunkQueue: Promise<void> = Promise.resolve()
let mediaReleased = true
let recorderFinalized = true
let analysisId: number | null = null
let analysisController: AbortController | null = null
let analysisOperationVersion = 0
let confirmationOperationVersion = 0
let deviceCheckId: number | undefined

const ttsLabel = computed(() => ({
  idle: '等待播放',
  loading: '正在合成',
  playing: '正在播放',
  completed: '播放完成',
  error: '暂不可用'
})[ttsState.value])

const ttsHint = computed(() => {
  if (ttsMessage.value) return ttsMessage.value
  if (ttsState.value === 'loading') return '正在调用后端 TTS 任务并等待结果。'
  if (ttsState.value === 'playing') return '换题、停止或离开页面时会立即释放播放资源。'
  return '优先播放后端音频；未返回可播放音频时会切换为浏览器朗读。'
})

const asrLabel = computed(() => ({
  idle: '等待开始',
  opening: '正在建立会话',
  recording: '录音与字幕进行中',
  stopping: '正在完成字幕',
  draft: '字幕待校对',
  fallback: '文本降级',
  error: '字幕不可用'
})[asrState.value])

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    let timer: number
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

const releaseTtsPlayback = () => {
  const audio = ttsAudio
  ttsAudio = null
  if (audio) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.src = ''
  }
  if (ttsObjectUrl) {
    URL.revokeObjectURL(ttsObjectUrl)
    ttsObjectUrl = ''
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
  speechUtterance = null
}

const cancelTtsTask = async () => {
  const taskId = ttsTaskId
  ttsTaskId = ''
  ttsController?.abort()
  ttsController = null
  if (taskId) {
    await cancelInterviewTtsTaskApi(taskId, { silentError: true }).catch(() => undefined)
  }
}

const stopTts = async () => {
  releaseTtsPlayback()
  await cancelTtsTask()
  ttsState.value = 'idle'
  ttsMessage.value = ''
}

const playBrowserSpeech = () => {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    throw new Error('后端未返回可播放音频，且当前浏览器不支持本地朗读。')
  }
  const utterance = new SpeechSynthesisUtterance(props.questionText)
  utterance.lang = 'zh-CN'
  utterance.rate = 1
  utterance.onend = () => {
    if (speechUtterance !== utterance) return
    speechUtterance = null
    ttsState.value = 'completed'
  }
  utterance.onerror = () => {
    if (speechUtterance !== utterance) return
    speechUtterance = null
    ttsState.value = 'error'
    ttsMessage.value = '浏览器朗读失败，可直接阅读题目继续作答。'
  }
  speechUtterance = utterance
  ttsState.value = 'playing'
  speechSynthesis.speak(utterance)
}

const playBackendAudio = async (audioBase64: string, contentType: string) => {
  const blob = audioBase64ToBlob(audioBase64, contentType)
  ttsObjectUrl = URL.createObjectURL(blob)
  const audio = new Audio(ttsObjectUrl)
  ttsAudio = audio
  audio.onended = () => {
    if (ttsAudio !== audio) return
    releaseTtsPlayback()
    ttsState.value = 'completed'
  }
  audio.onerror = () => {
    if (ttsAudio !== audio) return
    releaseTtsPlayback()
    ttsState.value = 'error'
    ttsMessage.value = '后端返回了音频，但浏览器无法播放该格式。'
  }
  ttsState.value = 'playing'
  try {
    await audio.play()
  } catch (error) {
    releaseTtsPlayback()
    throw error
  }
}

const playQuestion = async () => {
  await stopTts()
  errorMessage.value = ''
  ttsState.value = 'loading'
  const controller = new AbortController()
  ttsController = controller
  try {
    let task = await createInterviewTtsTaskApi({
      text: props.questionText.trim(),
      locale: 'zh-CN',
      audioFormat: 'mp3',
      timeoutMs: 15000
    }, {
      signal: controller.signal,
      silentError: true
    })
    ttsTaskId = task.taskId
    while (!isInterviewVoiceTaskTerminal(task.status)) {
      await delay(250, controller.signal)
      task = await getInterviewTtsTaskApi(task.taskId, {
        signal: controller.signal,
        silentError: true
      })
    }
    if (!isInterviewVoiceTaskSuccessful(task.status)) {
      throw new Error(task.errorMessage || 'TTS 任务没有成功完成。')
    }
    ttsTaskId = ''
    ttsController = null
    if (
      task.audioBase64
      && task.contentType?.startsWith('audio/')
      && task.contentType !== 'application/x-codecoachai-tts-mock'
    ) {
      await playBackendAudio(task.audioBase64, task.contentType)
      return
    }
    ttsMessage.value = '后端未返回可播放音频，当前使用浏览器朗读题目。'
    playBrowserSpeech()
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') return
    ttsState.value = 'error'
    ttsMessage.value = getErrorMessage(error, 'TTS 暂不可用，可直接阅读题目继续作答。')
  }
}

const stopRecordingTimer = () => {
  if (recordingTimer !== undefined) {
    window.clearInterval(recordingTimer)
    recordingTimer = undefined
  }
}

const stopLevelMonitor = () => {
  if (animationFrameId !== undefined) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = undefined
  }
  analyser = null
  inputLevel.value = 0
}

const releaseMedia = async () => {
  if (mediaReleased) return
  mediaReleased = true
  stopRecordingTimer()
  stopLevelMonitor()
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = null
  mediaRecorder = null
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close().catch(() => undefined)
  }
  audioContext = null
}

const clearRecordedEvidence = () => {
  recordedAudioChunks = []
  recordedAudioBlob = null
  recordedAudioMimeType = ''
  lastRecordingDurationMs = 0
}

const startLevelMonitor = (stream: MediaStream) => {
  const AudioContextConstructor = window.AudioContext || (window as Window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!AudioContextConstructor) return
  audioContext = new AudioContextConstructor()
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.7
  audioContext.createMediaStreamSource(stream).connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  const readLevel = () => {
    if (!analyser) return
    analyser.getByteTimeDomainData(data)
    let squares = 0
    for (const value of data) {
      const normalized = (value - 128) / 128
      squares += normalized * normalized
    }
    inputLevel.value = Math.min(100, Math.round(Math.sqrt(squares / data.length) * 360))
    animationFrameId = window.requestAnimationFrame(readLevel)
  }
  readLevel()
}

const rmsDbfsFromLevel = (level: number) => {
  if (level <= 0) return -120
  return Math.max(-120, Math.min(0, Math.round(20 * Math.log10(Math.min(1, level / 100)))))
}

const createDeviceCheck = async (
  stream: MediaStream,
  controller: AbortController,
  operationVersion: number
) => {
  const settings = stream.getAudioTracks()[0]?.getSettings()
  const check = await createInterviewVoiceDeviceCheckApi(props.sessionId, {
    permissionState: 'GRANTED',
    sampleRateHz: Number(settings?.sampleRate || 48000),
    channels: Number(settings?.channelCount || 1),
    inputDetected: inputLevel.value >= 5,
    echoCancellation: Boolean(settings?.echoCancellation),
    noiseSuppression: Boolean(settings?.noiseSuppression),
    autoGainControl: Boolean(settings?.autoGainControl),
    averageRmsDbfs: rmsDbfsFromLevel(inputLevel.value),
    clippingRatio: inputLevel.value > 95 ? 0.01 : 0
  }, {
    signal: controller.signal,
    silentError: true
  })
  if (operationVersion === asrOperationVersion && !controller.signal.aborted) {
    deviceCheckId = check.deviceCheckId
  }
}

const cancelRemoteAsr = async () => {
  const sessionId = asrSession?.sessionId
  asrController?.abort()
  asrController = null
  asrSession = null
  if (sessionId) {
    await cancelInterviewStreamingAsrApi(sessionId, { silentError: true }).catch(() => undefined)
  }
}

const cancelStreamingAsr = async (preserveDraft = false) => {
  asrOperationVersion += 1
  const recorder = mediaRecorder
  recorderFinalized = true
  if (recorder) {
    recorder.ondataavailable = null
    recorder.onstop = null
    recorder.onerror = null
    if (recorder.state !== 'inactive') recorder.stop()
  }
  await releaseMedia()
  await cancelRemoteAsr()
  asrChunkQueue = Promise.resolve()
  asrSequence = 0
  acceptedChunks.value = 0
  partialTranscript.value = ''
  recordingSeconds.value = 0
  if (!preserveDraft) transcriptDraft.value = ''
  asrProvider.value = ''
  clearRecordedEvidence()
  asrState.value = preserveDraft && transcriptDraft.value ? 'fallback' : 'idle'
}

const sendChunk = (
  blob: Blob,
  operationVersion: number,
  controller: AbortController
) => {
  asrChunkQueue = asrChunkQueue.then(async () => {
    if (
      operationVersion !== asrOperationVersion
      || controller.signal.aborted
      || !asrSession?.sessionId
      || blob.size <= 0
    ) return
    const snapshot = await sendInterviewStreamingAsrChunkApi(
      asrSession.sessionId,
      {
        sequence: asrSequence,
        audioBase64: await blobToBase64(blob),
        endOfStream: false
      },
      {
        signal: controller.signal,
        silentError: true
      }
    )
    asrSequence += 1
    acceptedChunks.value = Number(snapshot.acceptedChunks || asrSequence)
    partialTranscript.value = snapshot.partialTranscript || partialTranscript.value
    asrSession = snapshot
  })
}

const finalizeStreamingAsr = async (
  operationVersion: number,
  controller: AbortController
) => {
  asrState.value = 'stopping'
  lastRecordingDurationMs = Math.max(1, Date.now() - recordingStartedAt)
  await asrChunkQueue
  if (
    operationVersion !== asrOperationVersion
    || controller.signal.aborted
    || !asrSession?.sessionId
  ) return
  const completed = await completeInterviewStreamingAsrApi(asrSession.sessionId, {
    signal: controller.signal,
    silentError: true
  })
  asrSession = completed
  asrProvider.value = completed.provider
  acceptedChunks.value = Number(completed.acceptedChunks || acceptedChunks.value)
  transcriptDraft.value = completed.finalTranscript || completed.partialTranscript || ''
  partialTranscript.value = completed.finalTranscript || partialTranscript.value
  await releaseMedia()
  asrController = null
  asrState.value = transcriptDraft.value ? 'draft' : 'fallback'
  if (!transcriptDraft.value) {
    errorMessage.value = '流式字幕会话已完成，但没有返回文本，请手动输入回答。'
  }
}

const startStreamingAsr = async () => {
  await cancelStreamingAsr()
  errorMessage.value = ''
  asrState.value = 'opening'
  const operationVersion = ++asrOperationVersion
  const controller = new AbortController()
  asrController = controller
  try {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('当前浏览器无法录音，请切换文本回答。')
    }
    const openedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    })
    if (operationVersion !== asrOperationVersion || controller.signal.aborted) {
      openedStream.getTracks().forEach((track) => track.stop())
      return
    }
    mediaStream = openedStream
    mediaReleased = false
    const recorderProfile = chooseInterviewVoiceRecorderProfile()
    if (!recorderProfile) {
      await releaseMedia()
      asrState.value = 'fallback'
      errorMessage.value = '当前浏览器不支持 WebM/Opus 或 Ogg/Opus 录音，已切换到文本回答。'
      return
    }
    const trackSettings = openedStream.getAudioTracks()[0]?.getSettings()
    startLevelMonitor(openedStream)
    await createDeviceCheck(openedStream, controller, operationVersion).catch(() => undefined)
    if (operationVersion !== asrOperationVersion || controller.signal.aborted) {
      await releaseMedia()
      return
    }
    const openedSession = await openInterviewStreamingAsrApi({
      language: 'zh-CN',
      sampleRateHz: Math.min(48000, Math.max(8000, Number(trackSettings?.sampleRate || 48000))),
      channels: 1,
      encoding: recorderProfile.encoding,
      timeoutMs: 120000
    }, {
      signal: controller.signal,
      silentError: true
    })
    if (operationVersion !== asrOperationVersion || controller.signal.aborted) {
      await cancelInterviewStreamingAsrApi(openedSession.sessionId, { silentError: true })
        .catch(() => undefined)
      await releaseMedia()
      return
    }
    asrSession = openedSession
    asrProvider.value = asrSession.provider
    const recorder = new MediaRecorder(openedStream, { mimeType: recorderProfile.mimeType })
    recorderFinalized = false
    mediaRecorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedAudioChunks.push(event.data)
      }
      sendChunk(event.data, operationVersion, controller)
    }
    recorder.onerror = () => {
      if (recorderFinalized) return
      recorderFinalized = true
      errorMessage.value = '浏览器录音中断，已切换到文本降级。'
      transcriptDraft.value = partialTranscript.value
      void cancelStreamingAsr(true)
    }
    recorder.onstop = () => {
      if (recorderFinalized) return
      recorderFinalized = true
      recordedAudioMimeType = recorder.mimeType || recorderProfile.mimeType
      recordedAudioBlob = new Blob(recordedAudioChunks, { type: recordedAudioMimeType })
      void finalizeStreamingAsr(operationVersion, controller).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        errorMessage.value = getErrorMessage(error, '流式字幕结束失败，请校对已有文本或使用文本回答。')
        transcriptDraft.value = transcriptDraft.value || partialTranscript.value
        void cancelStreamingAsr(true)
      })
    }
    recordingStartedAt = Date.now()
    recordingSeconds.value = 0
    recordingTimer = window.setInterval(() => {
      recordingSeconds.value += 1
      if (recordingSeconds.value >= 115) stopStreamingAsr()
    }, 1000)
    recorder.start(1000)
    asrState.value = 'recording'
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') return
    errorMessage.value = getErrorMessage(error, '实时字幕暂不可用，已切换到文本回答。')
    await cancelStreamingAsr(true)
    asrState.value = 'fallback'
  }
}

const stopStreamingAsr = () => {
  if (asrState.value !== 'recording' || !mediaRecorder) return
  asrState.value = 'stopping'
  stopRecordingTimer()
  if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
}

const cancelAnalysis = async () => {
  const currentAnalysisId = analysisId
  analysisOperationVersion += 1
  analysisController?.abort()
  analysisController = null
  analysisId = null
  analysisLoading.value = false
  if (currentAnalysisId) {
    await cancelInterviewVoiceDeliveryAnalysisApi(
      props.sessionId,
      currentAnalysisId,
      { silentError: true }
    ).catch(() => undefined)
  }
}

const analyzeConfirmedSubmission = async (voiceSubmissionId: number) => {
  if (!voiceSubmissionId) return
  const operationVersion = ++analysisOperationVersion
  const controller = new AbortController()
  analysisController = controller
  try {
    let analysis = await createInterviewVoiceDeliveryAnalysisApi(
      props.sessionId,
      {
        voiceSubmissionId,
        deviceCheckId,
        timeoutMs: 10000
      },
      {
        signal: controller.signal,
        silentError: true
      }
    )
    analysisId = analysis.analysisId
    emit('analysis-updated', analysis)
    while (!isInterviewVoiceTaskTerminal(analysis.taskStatus)) {
      await delay(300, controller.signal)
      analysis = await getInterviewVoiceDeliveryAnalysisApi(
        props.sessionId,
        analysis.analysisId,
        {
          signal: controller.signal,
          silentError: true
        }
      )
      if (operationVersion !== analysisOperationVersion) return
      emit('analysis-updated', analysis)
    }
    analysisId = null
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') return
    errorMessage.value = getErrorMessage(error, '表达指标暂时无法生成，不影响文本回答。')
  } finally {
    if (operationVersion === analysisOperationVersion) {
      analysisController = null
      analysisLoading.value = false
    }
  }
}

const confirmTranscript = async () => {
  const text = transcriptDraft.value.trim()
  if (!text) return
  const blob = recordedAudioBlob
  if (!blob?.size || !props.persistRecording) {
    emit('transcript-confirmed', text)
    asrState.value = 'draft'
    return
  }

  await cancelAnalysis()
  const operationVersion = ++confirmationOperationVersion
  analysisLoading.value = true
  try {
    const evidence = await props.persistRecording({
      blob,
      mimeType: recordedAudioMimeType || blob.type || 'audio/webm',
      durationMs: Math.max(1, lastRecordingDurationMs),
      confirmedText: text
    })
    if (operationVersion !== confirmationOperationVersion) return
    if (!evidence?.voiceSubmissionId) {
      throw new Error('Confirmed voice submission evidence is required before analysis.')
    }
    emit('transcript-confirmed', text, evidence)
    await analyzeConfirmedSubmission(evidence.voiceSubmissionId)
    if (operationVersion !== confirmationOperationVersion) return
    clearRecordedEvidence()
    asrState.value = 'draft'
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') return
    errorMessage.value = getErrorMessage(
      error,
      '实时录音证据保存或确认失败，请保留字幕草稿后重试。'
    )
  } finally {
    if (operationVersion === confirmationOperationVersion && !analysisController) {
      analysisLoading.value = false
    }
  }
}

const useTextFallback = async () => {
  transcriptDraft.value = transcriptDraft.value || partialTranscript.value
  await cancelStreamingAsr(true)
  asrState.value = 'fallback'
  errorMessage.value = '已切换到文本降级；请手动校对或输入内容，确认后再写入回答。'
}

const resetAll = async () => {
  confirmationOperationVersion += 1
  await Promise.all([
    stopTts(),
    cancelStreamingAsr(),
    cancelAnalysis()
  ])
  errorMessage.value = ''
}

const cancelActiveAsr = async () => {
  if (
    !asrRuntimeActive.value
    && !asrSession
    && !mediaRecorder
    && !mediaStream
  ) return
  await cancelStreamingAsr()
}

const resetRealtimeVoice = async () => {
  await resetAll()
}

watch(asrRuntimeActive, (active) => {
  emit('runtime-active-changed', active)
})

watch(() => props.disabled, (disabled) => {
  if (disabled) void resetAll()
})

watch(() => props.questionKey, () => {
  void resetAll()
})

defineExpose({
  cancelActiveAsr,
  resetRealtimeVoice
})

onBeforeUnmount(() => {
  void resetAll()
})
</script>

<style scoped lang="scss">
.voice-live-console {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid rgba(45, 212, 191, 0.26);
  border-radius: 12px;
  background: rgba(13, 148, 136, 0.08);
}

.voice-live-console__head,
.voice-control__title,
.transcript-panel__head,
.transcript-panel__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.voice-live-console__head {
  strong,
  p {
    display: block;
  }

  strong {
    margin-top: 4px;
    color: #f8fafc;
  }

  p {
    margin: 5px 0 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.5;
  }
}

.voice-kicker {
  color: #5eead4;
  font-size: 12px;
  font-weight: 700;
}

.voice-live-console__status,
.voice-actions,
.voice-level {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.voice-control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.voice-control {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.42);

  > p {
    min-height: 38px;
    margin: 7px 0 10px;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.55;
  }
}

.voice-control__title {
  color: #5eead4;

  span,
  strong {
    display: block;
  }

  span {
    color: #94a3b8;
    font-size: 11px;
  }

  strong {
    margin-top: 4px;
    color: #e2e8f0;
  }
}

.voice-level {
  justify-content: space-between;
  margin: 7px 0;
  color: #94a3b8;
  font-size: 11px;
}

.voice-actions {
  margin-top: 10px;
}

.transcript-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 10px;
  background: rgba(8, 47, 73, 0.24);
}

.transcript-panel__head {
  span,
  strong {
    display: block;
  }

  span {
    color: #67e8f9;
    font-size: 11px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    color: #f8fafc;
  }
}

.partial-transcript {
  min-height: 54px;
  margin: 0;
  color: #e2e8f0;
  line-height: 1.65;
  white-space: pre-wrap;
}

.transcript-panel__actions {
  align-items: center;

  span {
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.45;
  }
}

:deep(.transcript-panel .el-textarea__inner) {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(2, 6, 23, 0.68);
  color: #e2e8f0;
  box-shadow: none;
}

@media (max-width: 760px) {
  .voice-control-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .voice-live-console__head,
  .transcript-panel__head,
  .transcript-panel__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .voice-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .voice-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
