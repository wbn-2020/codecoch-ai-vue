import { appConfig } from '@/config'
import { getToken } from '@/utils/token'

export type SseStandardEventName = 'start' | 'delta' | 'metadata' | 'done' | 'error'
export type SseEventName = SseStandardEventName | 'progress' | 'result' | string

export interface SseEventData {
  requestId?: string
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
  const dataText = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')

  if (!dataText) {
    return { event: rawEvent, rawEvent }
  }

  let data: T
  try {
    data = JSON.parse(dataText) as T
  } catch {
    data = { message: dataText, content: dataText } as T
  }

  const eventFromData = rawEvent === 'message' && data?.type ? String(data.type) : rawEvent
  const event = eventFromData === 'chunk' ? 'delta' : eventFromData
  return { event, rawEvent, data }
}

const getDedupeKey = (event: SseEventName, data?: SseEventData) => {
  if (event !== 'delta' || !data?.content) return ''
  const requestId = data.requestId || 'default'
  const index = data.index ?? 'no-index'
  return `${requestId}:${index}:${data.content}`
}

const isStartLikeEvent = (event: SseEventName) => {
  return ['start', 'delta', 'metadata', 'done', 'progress', 'result'].includes(event)
}

const createSseError = (data?: SseEventData) => {
  return new Error(data?.message || data?.code || 'SSE stream error')
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
  const abort = () => controller.abort()

  if (signal) {
    if (signal.aborted) abort()
    signal.addEventListener('abort', abort, { once: true })
  }

  let hasStarted = false
  const emittedKeys = new Set<string>()

  const finished = (async () => {
    try {
      if (!window.fetch || !window.ReadableStream) {
        throw new Error('Current browser does not support fetch SSE streaming')
      }

      const token = getToken()
      const requestHeaders: HeadersInit = {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {})
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      const emitBlock = (block: string) => {
        const parsed = parseSseBlock<T>(block.trim())
        if (!parsed) return

        const key = getDedupeKey(parsed.event, parsed.data)
        if (key && emittedKeys.has(key)) return
        if (key) emittedKeys.add(key)

        if (isStartLikeEvent(parsed.event)) {
          hasStarted = true
        }
        handlers?.onEvent?.(parsed.event, parsed.data, parsed)
        if (parsed.event === 'error') {
          throw createSseError(parsed.data)
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        blocks.forEach(emitBlock)
      }

      if (buffer.trim()) {
        emitBlock(buffer)
      }

      handlers?.onDone?.()
    } catch (error) {
      if (controller.signal.aborted) return
      handlers?.onError?.(error instanceof Error ? error : new Error(String(error)), hasStarted)
      throw error
    } finally {
      signal?.removeEventListener('abort', abort)
    }
  })()

  return {
    abort,
    cancel: abort,
    finished
  }
}
