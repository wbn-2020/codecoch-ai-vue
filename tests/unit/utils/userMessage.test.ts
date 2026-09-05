import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createUserMessageGateway } from '@/utils/userMessage'

describe('userMessage gateway', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T00:00:00.000Z'))
  })

  it('throttles duplicate error messages inside the same time window', () => {
    const emit = vi.fn(() => ({ close: vi.fn() }))
    const message = createUserMessageGateway(emit)

    const first = message.error('网络异常，请稍后重试')
    const second = message.error('网络异常，请稍后重试')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('does not merge different error messages or success messages', () => {
    const emit = vi.fn(() => ({ close: vi.fn() }))
    const message = createUserMessageGateway(emit)

    message.error('网络异常，请稍后重试')
    message.error('当前账号无权执行该操作')
    message.success('已保存')
    message.success('已保存')

    expect(emit).toHaveBeenCalledTimes(4)
  })

  it('allows the same error again after the throttle window', () => {
    const emit = vi.fn(() => ({ close: vi.fn() }))
    const message = createUserMessageGateway(emit, { defaultThrottleMs: 2500 })

    message.error('网络异常，请稍后重试')
    vi.advanceTimersByTime(2501)
    message.error('网络异常，请稍后重试')

    expect(emit).toHaveBeenCalledTimes(2)
  })

  it('closes transient error handles while keeping persistent errors open', () => {
    const transientClose = vi.fn()
    const persistentClose = vi.fn()
    const emit = vi.fn()
      .mockReturnValueOnce({ close: transientClose })
      .mockReturnValueOnce({ close: persistentClose })
    const message = createUserMessageGateway(emit)

    message.error('当前页面加载失败')
    message.error('需要继续查看的错误', { persistent: true })
    message.closeTransientErrors()

    expect(transientClose).toHaveBeenCalledTimes(1)
    expect(persistentClose).not.toHaveBeenCalled()
  })
})
