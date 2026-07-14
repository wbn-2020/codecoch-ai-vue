import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const diagnostics = vi.hoisted(() => ({
  emitRequestError: vi.fn()
}))

vi.mock('@/utils/errorEvents', () => ({
  emitRequestError: diagnostics.emitRequestError
}))

vi.mock('@/utils/userMessage', () => ({
  showUserMessage: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/utils/authEvents', () => ({
  emitAuthRefreshed: vi.fn()
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

const loadRequestModule = () => import('@/utils/request')

describe('request response metadata', () => {
  beforeEach(() => {
    vi.resetModules()
    diagnostics.emitRequestError.mockReset()
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    axios.defaults.adapter = originalAdapter
  })

  it('keeps default successful responses unwrapped through real interceptors', async () => {
    installAdapter(async (config) => response(config, {
      code: 0,
      message: 'ok',
      data: { id: 7 },
      traceId: 'body-trace'
    }))
    const { default: request } = await loadRequestModule()

    const result = await request.get('/trace-test')

    expect(result).toEqual({ id: 7 })
  })

  it('returns a trimmed body trace before a mixed-case AxiosHeaders trace', async () => {
    installAdapter(async (config) => response(
      config,
      {
        code: 0,
        message: 'ok',
        data: { id: 7 },
        traceId: '  body-trace  '
      },
      new AxiosHeaders({ 'X-TrAcE-Id': '  header-trace  ' })
    ))
    const { requestWithMeta } = await loadRequestModule()

    const result = await requestWithMeta<{ id: number }>({
      url: '/trace-test',
      method: 'GET'
    })

    expect(result.traceId).toBe('body-trace')
  })

  it('uses AxiosHeaders.get case-insensitively when the body trace is blank', async () => {
    installAdapter(async (config) => response(
      config,
      {
        code: 0,
        message: 'ok',
        data: { id: 7 },
        traceId: ' '
      },
      new AxiosHeaders({ 'X-TrAcE-Id': '  header-trace  ' })
    ))
    const { requestWithMeta } = await loadRequestModule()

    const result = await requestWithMeta<{ id: number }>({
      url: '/trace-test',
      method: 'GET'
    })

    expect(result.traceId).toBe('header-trace')
  })

  it('rejects preserveEnvelope responses that are not Result envelopes', async () => {
    installAdapter(async (config) => response(config, { id: 7 }))
    const { requestWithMeta } = await loadRequestModule()

    await expect(requestWithMeta<{ id: number }>({
      url: '/trace-test',
      method: 'GET'
    })).rejects.toThrow('preserveEnvelope requires a Result response envelope')
  })

  it('preserves the final envelope after refresh and retry', async () => {
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
        return response(config, {
          code: 41000,
          message: 'expired'
        })
      }
      return response(
        config,
        {
          code: 0,
          message: 'ok',
          data: { id: 7 }
        },
        new AxiosHeaders({ 'X-Trace-Id': 'retry-trace' })
      )
    })
    const { requestWithMeta } = await loadRequestModule()

    const result = await requestWithMeta<{ id: number }, { query: string }>({
      url: '/trace-test',
      method: 'POST',
      data: { query: 'java' }
    })

    expect(protectedAttempts).toBe(2)
    expect(result).toEqual({
      code: 0,
      message: 'ok',
      data: { id: 7 },
      traceId: 'retry-trace'
    })
  })

  it('uses the response header trace for business error diagnostics', async () => {
    installAdapter(async (config) => response(
      config,
      {
        code: 500,
        message: 'business failed',
        traceId: ' '
      },
      new AxiosHeaders({ 'X-Trace-Id': 'business-header-trace' })
    ))
    const { default: request } = await loadRequestModule()

    await expect(request.get('/business-error')).rejects.toMatchObject({
      code: 500,
      message: 'business failed'
    })

    expect(diagnostics.emitRequestError).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: 'business-header-trace' })
    )
  })

  it('uses the response header trace for HTTP error diagnostics', async () => {
    installAdapter(async (config) => {
      const errorResponse = response(
        config,
        { message: 'http failed' },
        new AxiosHeaders({ 'x-TRACE-id': 'http-header-trace' }),
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
    const { default: request } = await loadRequestModule()

    await expect(request.get('/http-error')).rejects.toBeInstanceOf(AxiosError)

    expect(diagnostics.emitRequestError).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: 'http-header-trace' })
    )
  })
})
