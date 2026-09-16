import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PLAN_POLL_MAX_MS,
  usePlanPolling
} from '@/features/agent-today/use-plan-polling'
import type { DailyPlanVO } from '@/types/agent'

const CLOCK_BASE = 1_757_000_000_000

const pendingPlan = (): DailyPlanVO => ({
  runId: 777,
  status: 'RUNNING',
  summary: '生成中'
})

const succeededPlan = (): DailyPlanVO => ({
  runId: 777,
  status: 'SUCCESS',
  consumable: true,
  summary: '今日训练'
})

describe('usePlanPolling', () => {
  let scope: EffectScope
  let running: { value: boolean }
  let plan: { value: DailyPlanVO | undefined }
  let refresh: ReturnType<typeof vi.fn>
  let controller: ReturnType<typeof usePlanPolling>

  const mountController = () => {
    scope.run(() => {
      controller = usePlanPolling({
        plan: () => plan.value,
        isRunning: () => running.value,
        refresh
      })
    })
    return controller
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(CLOCK_BASE)
    running = ref(false)
    plan = ref<DailyPlanVO | undefined>(undefined)
    refresh = vi.fn(async () => undefined)
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  it('starts polling when the plan enters the running state', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()

    expect(c.isPlanPolling.value).toBe(true)
    expect(c.planPollTimedOut.value).toBe(false)
    expect(c.planPollingDescription.value).toContain('已等待 0 秒')
  })

  it('drives the elapsed text with pollTickNow so the seconds actually tick', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()
    expect(c.planPollElapsedText.value).toBe('0 秒')

    // 秒级 tick 每 1000ms 把当前时间写入 pollTickNow（回归缺陷 1：计时冻结）
    await vi.advanceTimersByTimeAsync(5_000)
    expect(c.pollTickNow.value).toBe(CLOCK_BASE + 5_000)
    expect(c.planPollElapsedText.value).toBe('5 秒')
    expect(c.planPollingDescription.value).toContain('已等待 5 秒')

    // 轮询刷新确实被调度（首间隔 3 秒）
    expect(refresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(20_000)
    expect(c.planPollElapsedText.value).toBe('25 秒')
    expect(c.planPollingDescription.value).toContain('已等待 25 秒')
  })

  it('times out past the polling window and switches to the honest copy without false promises', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()

    await vi.advanceTimersByTimeAsync(PLAN_POLL_MAX_MS + 5_000)

    expect(c.planPollTimedOut.value).toBe(true)
    expect(c.isPlanPolling.value).toBe(false)
    expect(c.planPollingDescription.value).toBe(
      '生成耗时已超过预期，自动跟进已暂停。你可以手动刷新查看结果，或稍后在任务中心查看。'
    )
    expect(c.planPollingDescription.value).not.toContain('页面会自动刷新')

    // 超时后不再继续打点
    const callsAfterTimeout = refresh.mock.calls.length
    await vi.advanceTimersByTimeAsync(20_000)
    expect(refresh).toHaveBeenCalledTimes(callsAfterTimeout)
    expect(c.planPollTimedOut.value).toBe(true)
  })

  it('retryPlanPolling resets the window, refreshes once and resumes polling', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(PLAN_POLL_MAX_MS + 5_000)
    expect(c.planPollTimedOut.value).toBe(true)
    const refreshCallsBeforeRetry = refresh.mock.calls.length

    await c.retryPlanPolling()
    expect(c.planPollTimedOut.value).toBe(false)
    expect(c.isPlanPolling.value).toBe(true)
    expect(refresh.mock.calls.length).toBe(refreshCallsBeforeRetry + 1)
    expect(c.planPollElapsedText.value).toBe('0 秒')

    // 新一轮窗口重新计时：再等 50 秒仍在轮询而非超时
    await vi.advanceTimersByTimeAsync(50_000)
    expect(c.planPollTimedOut.value).toBe(false)
    expect(refresh.mock.calls.length).toBeGreaterThan(1)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(c.planPollingDescription.value).toContain('已等待 60 秒')
  })

  it('stops and clears the timeout flag when the plan reaches a terminal state', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(PLAN_POLL_MAX_MS + 5_000)
    expect(c.planPollTimedOut.value).toBe(true)

    plan.value = succeededPlan()
    running.value = false
    await nextTick()

    expect(c.isPlanPolling.value).toBe(false)
    expect(c.planPollTimedOut.value).toBe(false)
    expect(c.planPollStartedAt.value).toBe(0)

    const callsOnTerminal = refresh.mock.calls.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(refresh).toHaveBeenCalledTimes(callsOnTerminal)
  })

  it('stops polling when the plan snapshot is no longer pending even while still marked running', async () => {
    plan.value = pendingPlan()
    const c = mountController()
    running.value = true
    await nextTick()
    expect(c.isPlanPolling.value).toBe(true)

    // 快照提前回终态（isRunning 尚未翻转）：下一轮 schedule 自检即停
    plan.value = succeededPlan()
    await vi.advanceTimersByTimeAsync(3_000)
    await nextTick()
    expect(c.isPlanPolling.value).toBe(false)

    const callsAfterStop = refresh.mock.calls.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(refresh).toHaveBeenCalledTimes(callsAfterStop)
  })
})
