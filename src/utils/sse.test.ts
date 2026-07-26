import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refreshAccessToken } from '@/utils/request'
import {
  beginAuthSession,
  captureAuthSession,
  clearLocalAuth,
  replaceAuthSessionTokenIfCurrent
} from '@/utils/token'
import { streamSse } from './sse'

vi.mock('@/utils/request', () => ({
  refreshAccessToken: vi.fn()
}))

const encoder = new TextEncoder()
const INITIAL_TOKEN = 'session-token'
const refreshAccessTokenMock = vi.mocked(refreshAccessToken)

const createSseResponse = (...chunks: string[]) => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    }
  })

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
}

const createControlledSseResponse = () => {
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    }
  })

  return {
    response: new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    }),
    enqueue(chunk: string) {
      streamController?.enqueue(encoder.encode(chunk))
    },
    close() {
      streamController?.close()
    }
  }
}

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('streamSse', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    localStorage.clear()
    beginAuthSession(INITIAL_TOKEN)
    fetchMock.mockReset()
    refreshAccessTokenMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    clearLocalAuth()
    vi.unstubAllGlobals()
  })

  it('emits identical delta content when the standard SSE ids differ', async () => {
    fetchMock.mockResolvedValueOnce(createSseResponse(
      'id: delta-1\nevent: delta\ndata: {"requestId":"request-1","content":"same"}\n\n',
      'id: delta-2\nevent: delta\ndata: {"requestId":"request-1","content":"same"}\n\n',
      'event: done\ndata: {}\n\n'
    ))
    const emitted: Array<{ id?: string; content?: string }> = []

    const handle = streamSse({
      url: '/api/test/stream',
      handlers: {
        onEvent: (event, data, parsed) => {
          if (event === 'delta') {
            emitted.push({ id: parsed?.id, content: data?.content })
          }
        }
      }
    })

    await handle.finished

    expect(emitted).toEqual([
      { id: 'delta-1', content: 'same' },
      { id: 'delta-2', content: 'same' }
    ])
  })

  it('emits a replayed delta with the same standard SSE id only once', async () => {
    fetchMock.mockResolvedValueOnce(createSseResponse(
      'id: delta-1\nevent: delta\ndata: {"content":"replayed"}\n\n',
      'id: delta-1\nevent: delta\ndata: {"content":"replayed"}\n\n',
      'event: done\ndata: {}\n\n'
    ))
    const contents: string[] = []

    const handle = streamSse({
      url: '/api/test/stream',
      handlers: {
        onEvent: (event, data) => {
          if (event === 'delta' && data?.content) {
            contents.push(data.content)
          }
        }
      }
    })

    await handle.finished

    expect(contents).toEqual(['replayed'])
  })

  it('does not deduplicate identical content without an id or explicit index', async () => {
    fetchMock.mockResolvedValueOnce(createSseResponse(
      'event: delta\ndata: {"requestId":"request-1","content":"same"}\n\n',
      'event: delta\ndata: {"requestId":"request-1","content":"same"}\n\n',
      'event: done\ndata: {}\n\n'
    ))
    const contents: string[] = []

    const handle = streamSse({
      url: '/api/test/stream',
      handlers: {
        onEvent: (event, data) => {
          if (event === 'delta' && data?.content) {
            contents.push(data.content)
          }
        }
      }
    })

    await handle.finished

    expect(contents).toEqual(['same', 'same'])
  })

  it('falls back to payload event ids and then request id plus explicit index', async () => {
    fetchMock.mockResolvedValueOnce(createSseResponse(
      'event: delta\ndata: {"eventId":"event-1","content":"event-id"}\n\n',
      'event: delta\ndata: {"eventId":"event-1","content":"event-id"}\n\n',
      'event: delta\ndata: {"id":42,"content":"payload-id"}\n\n',
      'event: delta\ndata: {"id":42,"content":"payload-id"}\n\n',
      'event: delta\ndata: {"requestId":"request-1","index":0,"content":"indexed"}\n\n',
      'event: delta\ndata: {"requestId":"request-1","index":0,"content":"indexed"}\n\n',
      'event: done\ndata: {}\n\n'
    ))
    const contents: string[] = []

    const handle = streamSse({
      url: '/api/test/stream',
      handlers: {
        onEvent: (event, data) => {
          if (event === 'delta' && data?.content) {
            contents.push(data.content)
          }
        }
      }
    })

    await handle.finished

    expect(contents).toEqual(['event-id', 'payload-id', 'indexed'])
  })

  it('stops an old readable stream without callbacks after switching accounts', async () => {
    const stream = createControlledSseResponse()
    fetchMock.mockResolvedValueOnce(stream.response)
    const contents: string[] = []
    const errors: Error[] = []
    let doneCalls = 0
    const firstEvent = createDeferred<void>()

    const handle = streamSse({
      url: '/api/test/stream',
      handlers: {
        onEvent: (event, data) => {
          if (event === 'delta' && data?.content) {
            contents.push(data.content)
            firstEvent.resolve()
          }
        },
        onDone: () => {
          doneCalls += 1
        },
        onError: (error) => {
          errors.push(error)
        }
      }
    })

    stream.enqueue('id: before\nevent: delta\ndata: {"content":"before-switch"}\n\n')
    await firstEvent.promise

    beginAuthSession('second-account-token')
    stream.enqueue(
      'id: after\nevent: delta\ndata: {"content":"after-switch"}\n\n'
      + 'event: done\ndata: {}\n\n'
    )
    stream.close()
    await handle.finished

    expect(contents).toEqual(['before-switch'])
    expect(doneCalls).toBe(0)
    expect(errors).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization'))
      .toBe(`Bearer ${INITIAL_TOKEN}`)
  })

  it('does not retry a 401 response with a token from a switched account', async () => {
    const refreshStarted = createDeferred<void>()
    const refreshResult = createDeferred<string>()
    refreshAccessTokenMock.mockImplementationOnce(() => {
      refreshStarted.resolve()
      return refreshResult.promise
    })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
    const callbacks: string[] = []

    const handle = streamSse({
      url: '/api/test/stream',
      method: 'POST',
      body: { prompt: 'original-body' },
      handlers: {
        onEvent: (event) => callbacks.push(`event:${event}`),
        onDone: () => callbacks.push('done'),
        onError: () => callbacks.push('error')
      }
    })

    await refreshStarted.promise
    beginAuthSession('second-account-token')
    refreshResult.resolve('second-account-token')
    await handle.finished

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(callbacks).toEqual([])
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization'))
      .toBe(`Bearer ${INITIAL_TOKEN}`)
  })

  it('retries a 401 response with a refreshed token from the same auth session', async () => {
    const initialSession = captureAuthSession()
    refreshAccessTokenMock.mockImplementationOnce(async () => {
      const sessionId = replaceAuthSessionTokenIfCurrent(initialSession, 'refreshed-token')
      expect(sessionId).toBe(initialSession.sessionId)
      return 'refreshed-token'
    })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(createSseResponse(
        'id: refreshed\nevent: delta\ndata: {"content":"after-refresh"}\n\n',
        'event: done\ndata: {}\n\n'
      ))
    const contents: string[] = []
    let doneCalls = 0

    const handle = streamSse({
      url: '/api/test/stream',
      method: 'POST',
      body: { prompt: 'original-body' },
      handlers: {
        onEvent: (event, data) => {
          if (event === 'delta' && data?.content) {
            contents.push(data.content)
          }
        },
        onDone: () => {
          doneCalls += 1
        }
      }
    })

    await handle.finished

    expect(contents).toEqual(['after-refresh'])
    expect(doneCalls).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(([requestUrl]) => requestUrl))
      .toEqual(['/api/test/stream', '/api/test/stream'])
    expect(fetchMock.mock.calls.map(([, init]) => init?.body))
      .toEqual(['{"prompt":"original-body"}', '{"prompt":"original-body"}'])
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization'))
      .toBe(`Bearer ${INITIAL_TOKEN}`)
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization'))
      .toBe('Bearer refreshed-token')
  })
})
