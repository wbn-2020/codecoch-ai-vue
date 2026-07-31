import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authEvents = vi.hoisted(() => ({
  emitAuthCleared: vi.fn(),
  emitAuthRefreshed: vi.fn()
}))

vi.mock('@/utils/authEvents', () => authEvents)

vi.mock('@/utils/errorEvents', () => ({
  emitRequestError: vi.fn()
}))

vi.mock('@/utils/userMessage', () => ({
  showUserMessage: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/composables/useRequestCache', () => ({
  clearAllRequestCache: vi.fn()
}))

const originalAdapter = axios.defaults.adapter

const response = <T>(
  config: InternalAxiosRequestConfig,
  data: T,
  headers: AxiosHeaders = new AxiosHeaders(),
  status = 200
): AxiosResponse<T> => ({
  config,
  data,
  headers,
  status,
  statusText: status >= 400 ? 'ERROR' : 'OK'
})

const installAdapter = (
  handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>
) => {
  axios.defaults.adapter = handler as AxiosAdapter
}

describe('request auth reliability', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    authEvents.emitAuthCleared.mockReset()
    authEvents.emitAuthRefreshed.mockReset()
    window.history.replaceState({}, '', '/login')
  })

  afterEach(() => {
    axios.defaults.adapter = originalAdapter
  })

  it('does not let an old refresh result restore a replaced session', async () => {
    const token = await import('@/utils/token')
    token.beginAuthSession('old-token')

    let refreshConfig: InternalAxiosRequestConfig | undefined
    let resolveRefresh!: (value: AxiosResponse) => void
    let markRefreshStarted!: () => void
    const refreshStarted = new Promise<void>((resolve) => {
      markRefreshStarted = resolve
    })
    const refreshResponse = new Promise<AxiosResponse>((resolve) => {
      resolveRefresh = resolve
    })

    installAdapter(async (config) => {
      if (config.url === '/auth/refresh-token') {
        refreshConfig = config
        markRefreshStarted()
        return refreshResponse
      }
      return response(config, {
        code: 41001,
        message: 'expired'
      })
    })

    const { default: request } = await import('@/utils/request')
    const requestPromise = request.get('/protected')
    const rejection = expect(requestPromise).rejects.toMatchObject({
      staleAuthSession: true
    })

    await refreshStarted
    token.clearLocalAuth()
    token.beginAuthSession('new-token')
    resolveRefresh(response(refreshConfig!, {
      code: 0,
      message: 'ok',
      data: {
        token: 'stale-refreshed-token'
      }
    }))

    await rejection
    expect(token.getToken()).toBe('new-token')
    expect(authEvents.emitAuthRefreshed).not.toHaveBeenCalled()
  })

  it('binds request-time generation and rejects a response from the old session', async () => {
    const token = await import('@/utils/token')
    token.beginAuthSession('old-token')

    let slowConfig: InternalAxiosRequestConfig | undefined
    let resolveSlow!: (value: AxiosResponse) => void
    let markSlowStarted!: () => void
    const slowStarted = new Promise<void>((resolve) => {
      markSlowStarted = resolve
    })
    const slowResponse = new Promise<AxiosResponse>((resolve) => {
      resolveSlow = resolve
    })
    installAdapter(async (config) => {
      slowConfig = config
      markSlowStarted()
      return slowResponse
    })

    const { default: request } = await import('@/utils/request')
    const requestPromise = request.get('/slow')
    const rejection = expect(requestPromise).rejects.toMatchObject({
      staleAuthSession: true
    })

    await slowStarted
    const requestGeneration = (slowConfig as any)._authSessionGeneration
    token.clearLocalAuth()
    token.beginAuthSession('new-token')
    expect(requestGeneration).not.toBe(token.captureAuthSession().generation)
    resolveSlow(response(slowConfig!, {
      code: 0,
      message: 'ok',
      data: { id: 1 }
    }))

    await rejection
  })

  it('refreshes and retries an authenticated HTTP 401 response', async () => {
    const token = await import('@/utils/token')
    token.beginAuthSession('old-token')
    let protectedAttempts = 0

    installAdapter(async (config) => {
      if (config.url === '/auth/refresh-token') {
        return response(config, {
          code: 0,
          message: 'ok',
          data: {
            token: 'refreshed-token'
          }
        })
      }
      protectedAttempts += 1
      if (protectedAttempts === 1) {
        const errorResponse = response(
          config,
          { code: 41000, message: 'unauthorized' },
          new AxiosHeaders(),
          401
        )
        throw new AxiosError(
          'Request failed with status code 401',
          AxiosError.ERR_BAD_RESPONSE,
          config,
          undefined,
          errorResponse
        )
      }
      return response(config, {
        code: 0,
        message: 'ok',
        data: { id: 7 }
      })
    })

    const { default: request } = await import('@/utils/request')
    await expect(request.get('/protected')).resolves.toEqual({ id: 7 })

    expect(protectedAttempts).toBe(2)
    expect(token.getToken()).toBe('refreshed-token')
    expect(authEvents.emitAuthRefreshed).toHaveBeenCalledTimes(1)
  })

  it('does not refresh an HTTP 401 from the login endpoint', async () => {
    let refreshAttempts = 0
    installAdapter(async (config) => {
      if (config.url === '/auth/refresh-token') {
        refreshAttempts += 1
      }
      const errorResponse = response(
        config,
        { code: 41000, message: 'bad credentials' },
        new AxiosHeaders(),
        401
      )
      throw new AxiosError(
        'Request failed with status code 401',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        errorResponse
      )
    })

    const { default: request } = await import('@/utils/request')
    await expect(request.post('/auth/login', {}, { silentError: true })).rejects.toMatchObject({
      code: 41000,
      message: 'bad credentials'
    })

    expect(refreshAttempts).toBe(0)
    expect(authEvents.emitAuthCleared).not.toHaveBeenCalled()
  })

  it('keeps the session on HTTP 403 permission denial', async () => {
    const token = await import('@/utils/token')
    token.beginAuthSession('current-token')
    installAdapter(async (config) => {
      const errorResponse = response(
        config,
        { code: 41003, message: 'forbidden' },
        new AxiosHeaders(),
        403
      )
      throw new AxiosError(
        'Request failed with status code 403',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        errorResponse
      )
    })

    const { default: request } = await import('@/utils/request')
    await expect(request.get('/admin/users')).rejects.toMatchObject({
      code: 41003,
      message: 'forbidden'
    })

    expect(token.getToken()).toBe('current-token')
    expect(authEvents.emitAuthCleared).not.toHaveBeenCalled()
  })

  it('decodes JSON business errors returned as successful Blob responses', async () => {
    installAdapter(async (config) => response(
      config,
      new Blob([
        JSON.stringify({
          code: 422,
          message: 'export failed'
        })
      ], { type: 'application/json' }),
      new AxiosHeaders({ 'Content-Type': 'application/json' })
    ))

    const { default: request } = await import('@/utils/request')
    await expect(request.get('/export', { responseType: 'blob' })).rejects.toMatchObject({
      code: 422,
      message: 'export failed'
    })
  })

  it('decodes JSON business errors returned as HTTP error Blobs', async () => {
    installAdapter(async (config) => {
      const errorResponse = response(
        config,
        new Blob([
          JSON.stringify({
            code: 50001,
            message: 'file generation failed'
          })
        ], { type: 'application/json' }),
        new AxiosHeaders({ 'Content-Type': 'application/json' }),
        500
      )
      throw new AxiosError(
        'Request failed with status code 500',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        errorResponse
      )
    })

    const { default: request } = await import('@/utils/request')
    await expect(request.get('/export', { responseType: 'blob' })).rejects.toMatchObject({
      code: 50001,
      message: 'file generation failed'
    })
  })

  it('strips default admin raw fields but preserves explicit raw endpoint responses', async () => {
    installAdapter(async (config) => response(config, {
      code: 0,
      message: 'ok',
      data: {
        id: 9,
        inputSnapshot: { secret: 'raw-input' },
        inputSnapshotJson: '{"secret":"raw-input"}',
        output: { secret: 'raw-output' },
        outputJson: '{"secret":"raw-output"}',
        rawOutputText: 'raw-output',
        rawFieldsAvailable: true,
        rawFieldsIncluded: true,
        tasks: [{
          id: 1,
          title: 'safe task'
        }]
      }
    }))

    const { default: request } = await import('@/utils/request')
    const safeResult = await request.get<any, any>('/admin/agent/runs/9')
    const rawResult = await request.post<any, any>('/admin/agent/runs/9/raw', {})

    expect(safeResult).toEqual({
      id: 9,
      rawFieldsAvailable: true,
      rawFieldsIncluded: false,
      tasks: [{
        id: 1,
        title: 'safe task'
      }]
    })
    expect(rawResult.inputSnapshot).toEqual({ secret: 'raw-input' })
    expect(rawResult.rawOutputText).toBe('raw-output')
    expect(rawResult.rawFieldsIncluded).toBe(true)
  })

  it('strips AI raw aliases from non-raw endpoints only', async () => {
    installAdapter(async (config) => response(config, {
      code: 0,
      message: 'ok',
      data: {
        id: 10,
        content: 'raw prompt content',
        inputVariablesJson: '{"name":"candidate"}',
        input_variables_json: '{"name":"candidate-snake"}',
        modelParamsJson: '{"temperature":0.7}',
        variablesJson: '{"position":"engineer"}',
        rawFieldsAvailable: true,
        rawFieldsIncluded: true,
        summary: 'safe summary',
        nested: {
          content: 'nested raw content',
          variables_json: '{"secret":true}',
          preview: 'safe preview'
        }
      }
    }))

    const { default: request } = await import('@/utils/request')
    const safeResult = await request.get<any, any>('/admin/ai/logs/10')
    const rawResult = await request.post<any, any>('/admin/ai/logs/10/raw', {})

    expect(safeResult).toEqual({
      id: 10,
      rawFieldsAvailable: true,
      rawFieldsIncluded: false,
      summary: 'safe summary',
      nested: {
        preview: 'safe preview'
      }
    })
    expect(rawResult.content).toBe('raw prompt content')
    expect(rawResult.inputVariablesJson).toContain('candidate')
    expect(rawResult.modelParamsJson).toContain('temperature')
    expect(rawResult.variablesJson).toContain('position')
    expect(rawResult.rawFieldsIncluded).toBe(true)
  })
})
