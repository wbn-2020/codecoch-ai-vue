export type InterviewVoiceDeviceSupportLevel = 'SUPPORTED' | 'LIMITED' | 'UNSUPPORTED'
export type InterviewVoiceLevelState = 'SILENT' | 'LOW' | 'GOOD' | 'LOUD'

export interface InterviewVoiceDeviceSupport {
  level: InterviewVoiceDeviceSupportLevel
  canRequestMicrophone: boolean
  canRecord: boolean
  canMeasureLevel: boolean
  warnings: string[]
}

export interface InterviewVoiceBrowserScope {
  navigator: Navigator
  MediaRecorder?: typeof MediaRecorder
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export const inspectInterviewVoiceDeviceSupport = (
  scope: InterviewVoiceBrowserScope | undefined =
    typeof window === 'undefined'
      ? undefined
      : {
          navigator: window.navigator,
          MediaRecorder: typeof MediaRecorder === 'undefined' ? undefined : MediaRecorder,
          AudioContext: window.AudioContext,
          webkitAudioContext: (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        }
): InterviewVoiceDeviceSupport => {
  const canRequestMicrophone = Boolean(scope?.navigator?.mediaDevices?.getUserMedia)
  const canRecord = Boolean(scope?.MediaRecorder)
  const canMeasureLevel = Boolean(scope?.AudioContext || scope?.webkitAudioContext)
  const warnings: string[] = []

  if (!canRequestMicrophone) warnings.push('浏览器无法请求麦克风权限。')
  if (!canRecord) warnings.push('浏览器无法录制试听片段。')
  if (!canMeasureLevel) warnings.push('浏览器无法检测实时输入音量。')

  return {
    level: canRequestMicrophone && canRecord && canMeasureLevel
      ? 'SUPPORTED'
      : canRequestMicrophone
        ? 'LIMITED'
        : 'UNSUPPORTED',
    canRequestMicrophone,
    canRecord,
    canMeasureLevel,
    warnings
  }
}

export const interviewVoiceLevelState = (level: number): InterviewVoiceLevelState => {
  if (level < 3) return 'SILENT'
  if (level < 16) return 'LOW'
  if (level <= 88) return 'GOOD'
  return 'LOUD'
}

export const interviewVoiceLevelLabel = (state: InterviewVoiceLevelState) => ({
  SILENT: '未检测到声音',
  LOW: '输入偏小',
  GOOD: '音量正常',
  LOUD: '输入过大'
})[state]

export const interviewVoicePermissionMessage = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return '麦克风权限被拒绝，请在浏览器站点设置中允许访问，或继续使用文本回答。'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return '没有检测到可用麦克风，请连接设备后重试。'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '麦克风正被其他应用占用，请关闭占用程序后重试。'
  }
  return '麦克风暂时不可用，请检查系统输入设备或继续使用文本回答。'
}
