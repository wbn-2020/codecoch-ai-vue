import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  emitRequestError,
  enrichRequestErrorDiagnostic,
  formatRequestErrorNotice,
  REQUEST_ERROR_EVENT,
  resetRequestErrorDiagnosticsForTest,
  type RequestErrorDiagnostic
} from '@/utils/errorEvents'

describe('request error diagnostics', () => {
  afterEach(() => {
    vi.useRealTimers()
    resetRequestErrorDiagnosticsForTest()
  })

  it('keeps route and module ownership when dispatching an error', () => {
    const received: RequestErrorDiagnostic[] = []
    const listener = (event: Event) => {
      received.push((event as CustomEvent<RequestErrorDiagnostic>).detail)
    }
    window.addEventListener(REQUEST_ERROR_EVENT, listener)

    const emitted = emitRequestError({
      method: 'POST',
      url: '/resumes',
      message: '保存失败',
      routePath: '/resume/edit',
      module: 'resume',
      requestKey: 'resume-save'
    })

    window.removeEventListener(REQUEST_ERROR_EVENT, listener)

    expect(emitted).toBe(true)
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      routePath: '/resume/edit',
      module: 'resume',
      requestKey: 'resume-save',
      category: 'unknown',
      retryable: true
    })
  })

  it('classifies validation, permission, network and server failures with actionable guidance', () => {
    expect(enrichRequestErrorDiagnostic({
      status: 422,
      message: '模型名称不能为空'
    })).toMatchObject({
      category: 'validation',
      retryable: false,
      nextAction: expect.stringContaining('必填项')
    })
    expect(enrichRequestErrorDiagnostic({
      status: 403,
      message: '无权限执行'
    })).toMatchObject({
      category: 'permission',
      retryable: false
    })
    expect(enrichRequestErrorDiagnostic({
      message: 'Network Error'
    })).toMatchObject({
      category: 'network',
      retryable: true
    })
    expect(enrichRequestErrorDiagnostic({
      status: 503,
      message: '服务不可用'
    })).toMatchObject({
      category: 'server',
      retryable: true
    })
  })

  it('includes the next action and trace id in the global notice', () => {
    expect(formatRequestErrorNotice({
      message: '保存失败',
      nextAction: '检查字段后重试。',
      traceId: 'trace-123'
    })).toBe('保存失败 检查字段后重试。 错误编号：trace-123')
  })

  it('suppresses repeated diagnostics for the same request key inside the throttle window', () => {
    vi.useFakeTimers()
    const listener = vi.fn()
    window.addEventListener(REQUEST_ERROR_EVENT, listener)

    emitRequestError({
      method: 'GET',
      url: '/study-plan',
      message: '读取失败',
      routePath: '/study-plan',
      module: 'study-plan',
      requestKey: 'study-plan-load'
    })
    emitRequestError({
      method: 'GET',
      url: '/study-plan',
      message: '读取失败',
      routePath: '/study-plan',
      module: 'study-plan',
      requestKey: 'study-plan-load'
    })
    vi.advanceTimersByTime(1500)
    emitRequestError({
      method: 'GET',
      url: '/study-plan',
      message: '读取失败',
      routePath: '/study-plan',
      module: 'study-plan',
      requestKey: 'study-plan-load'
    })

    window.removeEventListener(REQUEST_ERROR_EVENT, listener)

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
