<template>
  <el-dialog
    :model-value="modelValue"
    title="语音设备预检"
    width="min(680px, calc(100vw - 32px))"
    destroy-on-close
    @close="close"
  >
    <div class="device-check">
      <el-alert
        :type="support.level === 'UNSUPPORTED' ? 'warning' : 'info'"
        :closable="false"
        show-icon
        :title="supportTitle"
        :description="supportDescription"
      />

      <section class="device-section">
        <div class="section-head">
          <div>
            <span>输入设备</span>
            <strong>{{ permissionGranted ? '麦克风已连接' : '等待授权' }}</strong>
          </div>
          <el-tag :type="permissionGranted ? 'success' : 'info'" effect="plain">
            {{ permissionGranted ? '可用' : '未检测' }}
          </el-tag>
        </div>

        <el-select
          v-model="selectedDeviceId"
          class="device-select"
          :disabled="checking || recording"
          placeholder="使用系统默认麦克风"
          @change="restartWithSelectedDevice"
        >
          <el-option label="系统默认麦克风" value="" />
          <el-option
            v-for="device in inputDevices"
            :key="device.deviceId"
            :label="device.label || `麦克风 ${device.deviceId.slice(0, 6)}`"
            :value="device.deviceId"
          />
        </el-select>

        <div class="device-actions">
          <el-button
            type="primary"
            :loading="checking"
            :disabled="!support.canRequestMicrophone || recording"
            @click="startCheck"
          >
            <Mic :size="16" />
            {{ permissionGranted ? '重新检测' : '检测麦克风' }}
          </el-button>
          <span>授权只用于本次预检，关闭后会立即释放设备。</span>
        </div>
      </section>

      <section class="device-section">
        <div class="section-head">
          <div>
            <span>实时音量</span>
            <strong>{{ levelLabel }}</strong>
          </div>
          <el-tag :type="levelTagType" effect="plain">{{ inputLevel }}%</el-tag>
        </div>
        <el-progress
          :percentage="inputLevel"
          :stroke-width="12"
          :show-text="false"
          :status="levelState === 'LOUD' ? 'exception' : levelState === 'GOOD' ? 'success' : undefined"
        />
        <p class="section-hint">{{ levelHint }}</p>
      </section>

      <section class="device-section">
        <div class="section-head">
          <div>
            <span>录音试听</span>
            <strong>{{ sampleTitle }}</strong>
          </div>
          <el-tag :type="sampleUrl ? 'success' : 'info'" effect="plain">
            {{ sampleUrl ? '已生成' : '未录制' }}
          </el-tag>
        </div>

        <div class="sample-actions">
          <el-button
            :disabled="!permissionGranted || !support.canRecord || recording"
            @click="startSample"
          >
            <CircleDot :size="16" />
            录制试听
          </el-button>
          <el-button :disabled="!recording" @click="stopSample">
            <Square :size="16" />
            停止
          </el-button>
          <span v-if="recording">{{ sampleSeconds }} 秒，最多 10 秒</span>
        </div>
        <audio v-if="sampleUrl" class="sample-player" :src="sampleUrl" controls preload="metadata" />
      </section>

      <el-alert
        v-if="errorMessage"
        type="warning"
        show-icon
        :closable="false"
        :title="errorMessage"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="useTextMode">
          <Keyboard :size="16" />
          使用文本模式
        </el-button>
        <el-button type="primary" :disabled="!permissionGranted" @click="complete">
          <Check :size="16" />
          完成预检
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Check, CircleDot, Keyboard, Mic, Square } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref } from 'vue'

import {
  inspectInterviewVoiceDeviceSupport,
  interviewVoiceLevelLabel,
  interviewVoiceLevelState,
  interviewVoicePermissionMessage
} from '@/features/interview-voice-device'
import { chooseInterviewVoiceRecorderProfile } from '@/features/interview-voice-product'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  ready: []
  fallback: []
}>()

const support = inspectInterviewVoiceDeviceSupport()
const checking = ref(false)
const permissionGranted = ref(false)
const inputDevices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref('')
const inputLevel = ref(0)
const errorMessage = ref('')
const recording = ref(false)
const sampleSeconds = ref(0)
const sampleUrl = ref('')

let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrameId: number | undefined
let mediaRecorder: MediaRecorder | null = null
let sampleChunks: BlobPart[] = []
let sampleTimer: number | undefined
let sampleStopTimer: number | undefined
let checkOperationVersion = 0
let recorderFinalized = true

const levelState = computed(() => interviewVoiceLevelState(inputLevel.value))
const levelLabel = computed(() => permissionGranted.value ? interviewVoiceLevelLabel(levelState.value) : '等待检测')
const levelTagType = computed(() => ({
  SILENT: 'info',
  LOW: 'warning',
  GOOD: 'success',
  LOUD: 'danger'
} as const)[levelState.value])
const levelHint = computed(() => {
  if (!permissionGranted.value) return '开始检测后说一句完整的话，确认浏览器能持续收到声音。'
  if (levelState.value === 'SILENT') return '没有检测到有效输入，请确认未静音并选择正确设备。'
  if (levelState.value === 'LOW') return '输入音量偏小，可以靠近麦克风或提高系统输入音量。'
  if (levelState.value === 'LOUD') return '输入接近削波，建议稍微远离麦克风或降低输入增益。'
  return '当前音量适合语音面试。'
})
const supportTitle = computed(() => ({
  SUPPORTED: '浏览器支持完整语音预检',
  LIMITED: '浏览器仅支持部分语音能力',
  UNSUPPORTED: '当前浏览器无法使用语音面试'
})[support.level])
const supportDescription = computed(() =>
  support.warnings.length
    ? `${support.warnings.join('')} 仍可继续使用文本回答。`
    : '请完成权限、音量和试听检查；预检音频不会上传。'
)
const sampleTitle = computed(() => recording.value ? '正在录制试听片段' : sampleUrl.value ? '请回放确认声音清晰' : '录制一段本地试听')

const stopLevelMonitor = () => {
  if (animationFrameId !== undefined) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = undefined
  }
  analyser = null
  inputLevel.value = 0
}

const stopSampleTimers = () => {
  if (sampleTimer !== undefined) {
    window.clearInterval(sampleTimer)
    sampleTimer = undefined
  }
  if (sampleStopTimer !== undefined) {
    window.clearTimeout(sampleStopTimer)
    sampleStopTimer = undefined
  }
}

const discardRecorder = () => {
  stopSampleTimers()
  const recorder = mediaRecorder
  recorderFinalized = true
  mediaRecorder = null
  if (recorder) {
    recorder.ondataavailable = null
    recorder.onstop = null
    recorder.onerror = null
    if (recorder.state !== 'inactive') recorder.stop()
  }
  recording.value = false
  sampleChunks = []
}

const releaseMedia = async () => {
  discardRecorder()
  stopLevelMonitor()
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = null
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close().catch(() => undefined)
  }
  audioContext = null
  permissionGranted.value = false
}

const clearSample = () => {
  if (sampleUrl.value) URL.revokeObjectURL(sampleUrl.value)
  sampleUrl.value = ''
  sampleSeconds.value = 0
  sampleChunks = []
}

const refreshDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return
  const devices = await navigator.mediaDevices.enumerateDevices()
  inputDevices.value = devices.filter((item) => item.kind === 'audioinput')
}

const startLevelMonitor = (stream: MediaStream) => {
  const AudioContextConstructor = window.AudioContext || (window as Window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!AudioContextConstructor) return
  audioContext = new AudioContextConstructor()
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.72
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
    const rms = Math.sqrt(squares / data.length)
    inputLevel.value = Math.min(100, Math.round(rms * 360))
    animationFrameId = window.requestAnimationFrame(readLevel)
  }
  readLevel()
}

const startCheck = async () => {
  if (!support.canRequestMicrophone) return
  const operationVersion = ++checkOperationVersion
  checking.value = true
  errorMessage.value = ''
  clearSample()
  await releaseMedia()
  try {
    const openedStream = await navigator.mediaDevices.getUserMedia({
      audio: selectedDeviceId.value
        ? { deviceId: { exact: selectedDeviceId.value }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true }
    })
    if (operationVersion !== checkOperationVersion) {
      openedStream.getTracks().forEach((track) => track.stop())
      return
    }
    mediaStream = openedStream
    permissionGranted.value = true
    await refreshDevices()
    if (operationVersion !== checkOperationVersion) {
      await releaseMedia()
      return
    }
    startLevelMonitor(openedStream)
  } catch (error) {
    if (operationVersion !== checkOperationVersion) return
    errorMessage.value = interviewVoicePermissionMessage(error)
  } finally {
    if (operationVersion === checkOperationVersion) checking.value = false
  }
}

const restartWithSelectedDevice = () => {
  if (permissionGranted.value) void startCheck()
}

const startSample = () => {
  if (!mediaStream || recording.value || typeof MediaRecorder === 'undefined') return
  clearSample()
  errorMessage.value = ''
  sampleChunks = []
  try {
    const recorderProfile = chooseInterviewVoiceRecorderProfile()
    if (!recorderProfile) {
      errorMessage.value = '当前浏览器不支持 WebM/Opus 或 Ogg/Opus 录音，已释放麦克风，请使用文本模式。'
      void releaseMedia()
      return
    }
    const recorder = new MediaRecorder(mediaStream, { mimeType: recorderProfile.mimeType })
    recorderFinalized = false
    mediaRecorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) sampleChunks.push(event.data)
    }
    recorder.onerror = () => {
      if (recorderFinalized) return
      recorderFinalized = true
      errorMessage.value = '试听录音失败，请检查麦克风后重试。'
      discardRecorder()
    }
    recorder.onstop = () => {
      if (recorderFinalized) return
      recorderFinalized = true
      stopSampleTimers()
      recording.value = false
      mediaRecorder = null
      if (!sampleChunks.length) {
        errorMessage.value = '没有录到有效声音，请确认麦克风未静音。'
        return
      }
      const blob = new Blob(sampleChunks, { type: recorder.mimeType || 'audio/webm' })
      sampleUrl.value = URL.createObjectURL(blob)
      sampleChunks = []
    }
    recorder.start(500)
    recording.value = true
    sampleSeconds.value = 0
    sampleTimer = window.setInterval(() => {
      sampleSeconds.value += 1
    }, 1000)
    sampleStopTimer = window.setTimeout(stopSample, 10_000)
  } catch {
    errorMessage.value = '浏览器无法创建试听录音，请继续使用文本回答。'
  }
}

const stopSample = () => {
  const recorder = mediaRecorder
  stopSampleTimers()
  if (recorder && recorder.state !== 'inactive') recorder.stop()
  recording.value = false
}

const close = () => {
  checkOperationVersion += 1
  checking.value = false
  emit('update:modelValue', false)
  void releaseMedia()
  clearSample()
}

const complete = () => {
  emit('ready')
  close()
}

const useTextMode = () => {
  emit('fallback')
  close()
}

onBeforeUnmount(() => {
  checkOperationVersion += 1
  void releaseMedia()
  clearSample()
})
</script>

<style scoped lang="scss">
.device-check {
  display: grid;
  gap: 16px;
}

.device-section {
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.section-head,
.device-actions,
.sample-actions,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head {
  margin-bottom: 14px;
}

.section-head div {
  display: grid;
  gap: 4px;
}

.section-head span,
.device-actions span,
.sample-actions span,
.section-hint {
  color: var(--user-text-muted);
  font-size: 13px;
}

.device-select,
.sample-player {
  width: 100%;
}

.device-actions,
.sample-actions {
  justify-content: flex-start;
  margin-top: 12px;
}

.sample-player {
  margin-top: 14px;
}

.section-hint {
  margin: 10px 0 0;
}

@media (max-width: 640px) {
  .section-head,
  .device-actions,
  .sample-actions,
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }
}

.device-check {
  gap: 10px;
  min-width: 0;
  color: var(--user-text);
}

.device-section {
  min-width: 0;
  padding: 12px;
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.section-head {
  margin-bottom: 10px;

  span {
    color: var(--user-text-muted);
  }

  strong {
    color: var(--user-text);
  }
}

.device-actions,
.sample-actions {
  flex-wrap: wrap;
  margin-top: 10px;
}

.section-head span,
.device-actions span,
.sample-actions span,
.section-hint {
  color: var(--user-text-muted);
}

.sample-player {
  min-width: 0;
  margin-top: 10px;
}

.dialog-footer {
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .device-section {
    padding: 10px;
  }

  .dialog-footer :deep(.el-button),
  .device-actions :deep(.el-button),
  .sample-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
