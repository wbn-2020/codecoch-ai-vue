import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { toFriendlyMessage } from '@/utils/error'
import { refreshAccessToken } from '@/utils/request'
import {
  captureAuthSession,
  isAuthSessionCurrent,
  type AuthSessionSnapshot
} from '@/utils/token'

export type SseStandardEventName = 'start' | 'delta' | 'metadata' | 'done' | 'error'
export type SseEventName = SseStandardEventName | 'progress' | 'result' | string

export interface SseEventData {
  requestId?: string
  eventId?: string | number
  id?: string | number
  type?: string
  message?: string
  content?: string
  index?: number
  code?: string
  result?: unknown
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface SseParsedEvent<T extends SseEventData = SseEventData> {
  event: SseEventName
  rawEvent: string
  id?: string
  data?: T
}

export interface StreamSseHandlers<T extends SseEventData = SseEventData> {
  onEvent?: (event: SseEventName, data?: T, parsed?: SseParsedEvent<T>) => void
  onError?: (error: Error, hasStarted: boolean) => void
  onDone?: () => void
}

export interface StreamSseOptions<T extends SseEventData = SseEventData> {
  url: string
  method?: 'GET' | 'POST'
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  handlers?: StreamSseHandlers<T>
}

export interface StreamSseHandle {
  abort: () => void
  cancel: () => void
  finished: Promise<void>
}

const MAX_SSE_DEDUPE_KEYS = 500
const AUTH_SESSION_WATCH_INTERVAL_MS = 100

export const buildSseUrl = (path: string, params: Record<string, string>) => {
  const baseUrl = appConfig.apiBaseUrl || ''
  const normalizedBase = baseUrl.startsWith('http')
    ? baseUrl
    : `${window.location.origin}${baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`}`
  const url = new URL(`${normalizedBase.replace(/\/$/, '')}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

const parseSseBlock = <T extends SseEventData>(block: string): SseParsedEvent<T> | null => {
  const lines = block.split(/\r?\n/)
  const rawEvent = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
  let id: string | undefined
  lines.forEach((line) => {
    if (line === 'id') {
      id = undefined
      return
    }
    if (!line.startsWith('id:')) return
    const candidate = line.slice(3).replace(/^ /, '')
    if (!candidate.includes('\0')) {
      id = candidate || undefined
    }
  })
  const dataText = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')

  if (!dataText) {
    return { event: rawEvent, rawEvent, id }
  }

  let data: T
  try {
    data = JSON.parse(dataText) as T
  } catch {
    data = { message: dataText, content: dataText } as T
  }

  const eventFromData = rawEvent === 'message' && data?.type ? String(data.type) : rawEvent
  const event = eventFromData === 'chunk' ? 'delta' : eventFromData
  return { event, rawEvent, id, data }
}

const normalizeStableEventId = (value: unknown) => {
  if (typeof value === 'string') return value || ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

const getDedupeKey = ({ event, id, data }: SseParsedEvent) => {
  if (event !== 'delta') return ''

  const standardEventId = normalizeStableEventId(id)
  if (standardEventId) {
    return JSON.stringify(['sse-id', standardEventId])
  }

  const payloadEventId = normalizeStableEventId(data?.eventId)
    || normalizeStableEventId(data?.id)
  if (payloadEventId) {
    return JSON.stringify(['payload-id', payloadEventId])
  }

  const requestId = normalizeStableEventId(data?.requestId)
  const index = normalizeStableEventId(data?.index)
  if (requestId && index) {
    return JSON.stringify(['request-index', requestId, index])
  }

  return ''
}

const isStartLikeEvent = (event: SseEventName) => {
  return ['start', 'delta', 'metadata', 'done', 'progress', 'result'].includes(event)
}

const createSseError = (data?: SseEventData) => {
  return new Error(toFriendlyMessage(data?.message || data?.code, '生成进度暂时不可用，请稍后刷新查看结果。'))
}

const isAuthFailureCode = (code?: unknown) =>
  code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID

const isAuthFailureResponse = async (response: Response) => {
  if (response.status === 401) return true
  if (!response.ok) return false

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return false

  try {
    const payload = await response.clone().json()
    return isAuthFailureCode(payload?.code)
  } catch {
    return false
  }
}

export const streamSse = <T extends SseEventData = SseEventData>({
  url,
  method = 'GET',
  body,
  headers,
  signal,
  handlers
}: StreamSseOptions<T>): StreamSseHandle => {
  const controller = new AbortController()
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let authSession = captureAuthSession()
  let staleAuthSession = false

  const abort = () => {
    controller.abort()
    void activeReader?.cancel().catch(() => undefined)
  }

  const stopForStaleAuthSession = () => {
    if (staleAuthSession) return
    staleAuthSession = true
    abort()
  }

  const isSameAuthSessionIdentity = (
    previous: AuthSessionSnapshot,
    current: AuthSessionSnapshot
  ) => previous.generation === current.generation
    && previous.sessionId === current.sessionId

  const ensureAuthSessionCurrent = () => {
    if (isAuthSessionCurrent(authSession)) return true

    const currentSession = captureAuthSession()
    if (isSameAuthSessionIdentity(authSession, currentSession)) {
      authSession = currentSession
      return true
    }

    stopForStaleAuthSession()
    return false
  }

  if (signal) {
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  }

  const sessionWatchId = window.setInterval(() => {
    if (!controller.signal.aborted) {
      ensureAuthSessionCurrent()
    }
  }, AUTH_SESSION_WATCH_INTERVAL_MS)

  let hasStarted = false
  let receivedDone = false
  const emittedKeys = new Set<string>()

  const rememberDedupeKey = (key: string) => {
    emittedKeys.add(key)
    if (emittedKeys.size > MAX_SSE_DEDUPE_KEYS) {
      const oldestKey = emittedKeys.values().next().value
      if (oldestKey) emittedKeys.delete(oldestKey)
    }
  }

  const finished = (async () => {
    try {
      if (controller.signal.aborted) return

      if (!window.fetch || !window.ReadableStream) {
        throw new Error('当前浏览器暂不支持实时进度，已尝试切换为普通生成方式。')
      }

      const buildRequestHeaders = (session: AuthSessionSnapshot): HeadersInit => {
        return {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
          ...(headers || {})
        }
      }

      const requestBody = body === undefined ? undefined : JSON.stringify(body)
      const fetchWithCapturedSession = () => {
        if (!ensureAuthSessionCurrent()) return null
        const requestSession = authSession
        return fetch(url, {
          method,
          headers: buildRequestHeaders(requestSession),
          body: requestBody,
          signal: controller.signal
        })
      }

      const retryAfterAuthRefresh = async () => {
        if (!ensureAuthSessionCurrent()) return null
        await refreshAccessToken()
        if (controller.signal.aborted || !ensureAuthSessionCurrent()) return null
        return fetchWithCapturedSession()
      }

      const initialRequest = fetchWithCapturedSession()
      if (!initialRequest) return
      let response = await initialRequest
      if (!ensureAuthSessionCurrent()) return

      const authFailure = await isAuthFailureResponse(response)
      if (!ensureAuthSessionCurrent()) return
      if (authFailure) {
        const refreshedResponse = await retryAfterAuthRefresh()
        if (!refreshedResponse) return
        response = refreshedResponse
        if (!ensureAuthSessionCurrent()) return
      }

      if (!ensureAuthSessionCurrent()) return
      if (!response.ok || !response.body) {
        throw new Error('生成进度暂时不可用，系统会继续处理，请稍后刷新查看结果。')
      }

      const reader = response.body.getReader()
      activeReader = reader
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      const emitBlock = (block: string) => {
        if (!ensureAuthSessionCurrent()) return false
        const parsed = parseSseBlock<T>(block.replace(/\r?\n$/, ''))
        if (!parsed) return true

        const key = getDedupeKey(parsed)
        if (key && emittedKeys.has(key)) return true
        if (key) rememberDedupeKey(key)

        if (isStartLikeEvent(parsed.event)) {
          hasStarted = true
        }
        handlers?.onEvent?.(parsed.event, parsed.data, parsed)
        if (!ensureAuthSessionCurrent()) return false
        if (parsed.event === 'done') {
          receivedDone = true
          emittedKeys.clear()
        }
        if (parsed.event === 'error') {
          emittedKeys.clear()
          throw createSseError(parsed.data)
        }
        return true
      }

      while (true) {
        if (!ensureAuthSessionCurrent()) return
        const { value, done } = await reader.read()
        if (!ensureAuthSessionCurrent()) return
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        for (const block of blocks) {
          if (!emitBlock(block)) return
        }
      }

      if (buffer && !emitBlock(buffer)) {
        return
      }

      if (!ensureAuthSessionCurrent()) return
      if (!receivedDone) {
        throw new Error('生成连接提前中断，系统可能仍在处理，请稍后刷新结果。')
      }
      handlers?.onDone?.()
    } catch (error) {
      if (controller.signal.aborted || !ensureAuthSessionCurrent()) return
      handlers?.onError?.(error instanceof Error ? error : new Error(String(error)), hasStarted)
      throw error
    } finally {
      window.clearInterval(sessionWatchId)
      activeReader = null
      emittedKeys.clear()
      signal?.removeEventListener('abort', abort)
    }
  })()

  return {
    abort,
    cancel: abort,
    finished
  }
}
