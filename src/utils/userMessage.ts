import { ElMessage } from 'element-plus'

export type UserMessageType = 'success' | 'warning' | 'info' | 'error'

export interface UserMessagePayload {
  type: UserMessageType
  message: string
  duration?: number
  groupingKey?: string
  throttleMs?: number
  showClose?: boolean
  persistent?: boolean
}

export interface UserMessageHandle {
  close?: () => void
}

export interface UserMessageGatewayOptions {
  defaultThrottleMs?: number
}

type UserMessageEmitter = (payload: UserMessagePayload) => UserMessageHandle | void

const DEFAULT_ERROR_THROTTLE_MS = 2500

const normalizeMessage = (message: unknown) => String(message || '').trim()

export const createUserMessageGateway = (
  emit: UserMessageEmitter,
  options: UserMessageGatewayOptions = {}
) => {
  const defaultThrottleMs = options.defaultThrottleMs ?? DEFAULT_ERROR_THROTTLE_MS
  const recentMessages = new Map<string, { shownAt: number; handle?: UserMessageHandle | void }>()
  const activeErrors = new Set<UserMessageHandle>()

  const show = (type: UserMessageType, message: unknown, payload: Omit<UserMessagePayload, 'type' | 'message'> = {}) => {
    const normalizedMessage = normalizeMessage(message)
    if (!normalizedMessage) return undefined

    const throttleMs = payload.throttleMs ?? (type === 'error' ? defaultThrottleMs : 0)
    const key = `${type}:${payload.groupingKey || normalizedMessage}`
    const now = Date.now()
    const recent = recentMessages.get(key)

    if (throttleMs > 0 && recent && now - recent.shownAt < throttleMs) {
      return recent.handle
    }

    const handle = emit({
      ...payload,
      type,
      message: normalizedMessage
    })

    if (type === 'error' && !payload.persistent && handle?.close) {
      activeErrors.add(handle)
    }

    if (throttleMs > 0) {
      recentMessages.set(key, { shownAt: now, handle })
    }

    return handle
  }

  const clear = () => {
    recentMessages.clear()
  }

  const closeTransientErrors = () => {
    const handlesToClose = new Set(activeErrors)
    handlesToClose.forEach((handle) => handle.close?.())
    activeErrors.clear()
    recentMessages.forEach((recent, key) => {
      if (recent.handle && handlesToClose.has(recent.handle)) {
        recentMessages.delete(key)
      }
    })
  }

  return {
    show,
    success: (message: unknown, payload?: Omit<UserMessagePayload, 'type' | 'message'>) => show('success', message, payload),
    warning: (message: unknown, payload?: Omit<UserMessagePayload, 'type' | 'message'>) => show('warning', message, payload),
    info: (message: unknown, payload?: Omit<UserMessagePayload, 'type' | 'message'>) => show('info', message, payload),
    error: (message: unknown, payload?: Omit<UserMessagePayload, 'type' | 'message'>) => show('error', message, payload),
    clear,
    closeTransientErrors
  }
}

const userMessageOffset = () => (
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
    ? 70
    : 76
)

export const showUserMessage = createUserMessageGateway((payload) =>
  ElMessage({
    message: payload.message,
    type: payload.type,
    duration: payload.persistent ? 0 : payload.duration,
    grouping: true,
    showClose: payload.showClose ?? payload.type === 'error',
    customClass: 'codecoach-global-message',
    offset: userMessageOffset()
  })
)
