import { onBeforeUnmount, ref } from 'vue'

import { toFriendlyMessage } from '@/utils/error'

export type SseStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

export interface UseSseStateOptions {
  /** 自动清除错误的延迟（ms），0 表示不自动清除 */
  autoClearErrorMs?: number
}

/**
 * SSE 状态管理 composable
 *
 * 将 SSE 的连接状态、错误信息局部化到组件内部，
 * 避免全局 ElMessage 弹窗干扰用户操作。
 *
 * 用法：
 * ```ts
 * const { status, error, events, start, reset } = useSseState()
 *
 * start(() => streamSomeApi(params, {
 *   onEvent: (event, data) => {
 *     addEvent(event, data)
 *     // 业务逻辑
 *   },
 *   onError: (err, hasStarted) => setError(err, hasStarted),
 *   onDone: () => setDone()
 * }))
 * ```
 */
export const useSseState = (options: UseSseStateOptions = {}) => {
  const { autoClearErrorMs = 0 } = options

  const status = ref<SseStatus>('idle')
  const error = ref<string>('')
  const errorDetail = ref<Error | null>(null)
  const hasStarted = ref(false)
  const events = ref<Array<{ key: string; event: string; message?: string; timestamp: number }>>([])

  let clearErrorTimer: ReturnType<typeof setTimeout> | undefined

  const reset = () => {
    status.value = 'idle'
    error.value = ''
    errorDetail.value = null
    hasStarted.value = false
    events.value = []
    if (clearErrorTimer) {
      clearTimeout(clearErrorTimer)
      clearErrorTimer = undefined
    }
  }

  const setConnecting = () => {
    status.value = 'connecting'
    error.value = ''
    errorDetail.value = null
    hasStarted.value = false
    events.value = []
  }

  const setStreaming = () => {
    status.value = 'streaming'
    hasStarted.value = true
  }

  const setDone = () => {
    status.value = 'done'
  }

  const setError = (err: Error | string, started = false) => {
    const message = toFriendlyMessage(typeof err === 'string' ? err : err.message, '流式连接异常，请稍后重试。')
    status.value = 'error'
    error.value = message
    errorDetail.value = typeof err === 'string' ? new Error(err) : err
    hasStarted.value = started

    if (autoClearErrorMs > 0) {
      clearErrorTimer = setTimeout(() => {
        error.value = ''
        status.value = 'idle'
      }, autoClearErrorMs)
    }
  }

  const addEvent = (event: string, message?: string) => {
    if (status.value === 'connecting') {
      setStreaming()
    }
    events.value.push({
      key: `${Date.now()}-${events.value.length}`,
      event,
      message,
      timestamp: Date.now()
    })
  }

  onBeforeUnmount(() => {
    if (clearErrorTimer) {
      clearTimeout(clearErrorTimer)
      clearErrorTimer = undefined
    }
  })

  return {
    /** 当前 SSE 状态 */
    status,
    /** 错误信息（空字符串表示无错误） */
    error,
    /** 错误对象 */
    errorDetail,
    /** SSE 是否已经开始接收事件 */
    hasStarted,
    /** 已接收的事件列表 */
    events,
    /** 重置所有状态 */
    reset,
    /** 标记为连接中 */
    setConnecting,
    /** 标记为流式接收中 */
    setStreaming,
    /** 标记为完成 */
    setDone,
    /** 标记为错误 */
    setError,
    /** 添加一条事件记录 */
    addEvent
  }
}
