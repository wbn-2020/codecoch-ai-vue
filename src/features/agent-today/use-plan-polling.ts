import { computed, getCurrentScope, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue'

import { isAsyncOperationPending, resolveAsyncOperationState } from '@/features/async-operation-state'
import type { DailyPlanVO } from '@/types/agent'

// 生成是异步的（实测约 7-10 秒到达终态）。PROCESSING/WAITING 期间自动轮询：
// 首间隔 3 秒，之后每 4 秒，上限 90 秒；到达终态或用户离开页面即停。
export const PLAN_POLL_FIRST_DELAY_MS = 3000
export const PLAN_POLL_INTERVAL_MS = 4000
export const PLAN_POLL_MAX_MS = 90000

/**
 * 「今日计划正在生成」的轮询状态机（2026-09-16 从 AgentTodayView 抽出，修复两处线上缺陷）：
 *
 * 缺陷 1（计时冻结）：秒数此前是读 Date.now() 的 computed，没有任何响应式依赖，
 * tick 循环也不更新状态，导致「已等待 0 秒」永不跳动。现在 tick 循环每秒把
 * pollTickNow 写入响应式 ref，planPollElapsedText 依赖它，秒数真实前进。
 *
 * 缺陷 2（超时文案撒谎）：超过 PLAN_POLL_MAX_MS 后此前只停轮询，文案仍承诺
 * “页面会自动刷新”。现在超时置 planPollTimedOut，文案诚实说明自动跟进已暂停，
 * 并提供 retryPlanPolling() 供“立即刷新”按钮重新开启一轮轮询窗口。
 */
export interface UsePlanPollingOptions {
  /** 当前计划快照；用于判断异步操作是否仍未到终态 */
  plan: () => DailyPlanVO | null | undefined
  /** 计划是否处于生成中（PROCESSING）非终态；true 开始轮询，false 停止并清理状态 */
  isRunning: () => boolean
  /** 触发一次强制刷新；完成后继续调度下一轮轮询 */
  refresh: () => Promise<unknown> | unknown
  /** 可注入时钟（测试用），默认 Date.now */
  now?: () => number
  /** 轮询总时长上限（毫秒），默认 PLAN_POLL_MAX_MS */
  maxPollMs?: number
}

export interface PlanPollingController {
  isPlanPolling: Ref<boolean>
  planPollTimedOut: Ref<boolean>
  planPollStartedAt: Ref<number>
  pollTickNow: Ref<number>
  planPollElapsedText: ComputedRef<string>
  planPollingDescription: ComputedRef<string>
  stopPlanPolling: () => void
  /** 超时后手动重试：重置计时窗口、立刻刷新一次并重新进入轮询 */
  retryPlanPolling: () => Promise<void>
}

export const usePlanPolling = (options: UsePlanPollingOptions): PlanPollingController => {
  const now = options.now || (() => Date.now())
  const maxPollMs = options.maxPollMs ?? PLAN_POLL_MAX_MS

  let planPollTimer: ReturnType<typeof setTimeout> | null = null
  let pollTickTimer: ReturnType<typeof setTimeout> | null = null
  const planPollStartedAt = ref(0)
  const isPlanPolling = ref(false)
  const planPollTimedOut = ref(false)
  // 响应式“当前时间”：由秒级 tick 循环驱动，让依赖它的 computed 每秒重算
  const pollTickNow = ref(0)

  const stopPlanPolling = () => {
    if (planPollTimer) {
      clearTimeout(planPollTimer)
      planPollTimer = null
    }
    isPlanPolling.value = false
  }

  const schedulePlanPoll = () => {
    stopPlanPolling()
    const isFirstPoll = planPollStartedAt.value === 0
    if (isFirstPoll) planPollStartedAt.value = now()
    if (now() - planPollStartedAt.value > maxPollMs) {
      // 超过上限仍无终态：停止自动轮询并标记超时，文案据此诚实降级为手动刷新
      isPlanPolling.value = false
      planPollTimedOut.value = true
      return
    }
    const plan = options.plan()
    const planOperation = resolveAsyncOperationState({
      executionStatus: plan?.executionStatus,
      status: plan?.status,
      consumable: plan?.consumable,
      deliveryQuality: plan?.deliveryQuality,
      fallback: plan?.fallback,
      hasExecution: Boolean(plan?.runId || plan?.executionId || plan?.idempotencyKey),
      hasReceipt: Boolean(
        plan?.asyncMessageId
        || plan?.asyncTraceId
        || plan?.asyncBizType
        || plan?.asyncReceiptStatus
      )
    })
    if (!isAsyncOperationPending(planOperation)) {
      isPlanPolling.value = false
      return
    }
    isPlanPolling.value = true
    const delay = isFirstPoll ? PLAN_POLL_FIRST_DELAY_MS : PLAN_POLL_INTERVAL_MS
    planPollTimer = setTimeout(async () => {
      try {
        await options.refresh()
      } finally {
        if (planPollTimer) schedulePlanPoll()
      }
    }, delay)
  }

  // 生成状态一进入非终态就开始轮询；回终态自动停，并清零计时与超时标记
  watch(() => options.isRunning(), (running) => {
    if (running) {
      planPollTimedOut.value = false
      if (!planPollStartedAt.value) pollTickNow.value = now()
      schedulePlanPoll()
    } else {
      stopPlanPolling()
      planPollStartedAt.value = 0
      planPollTimedOut.value = false
    }
  }, { immediate: true })

  const planPollElapsedText = computed(() => {
    if (!planPollStartedAt.value) return ''
    const seconds = Math.max(0, Math.round((pollTickNow.value - planPollStartedAt.value) / 1000))
    return `${seconds} 秒`
  })

  // 轮询期间秒级跳动：每秒写入 pollTickNow，驱动 planPollElapsedText 重算。
  // 保持原语义——每次 tick 先检查 isPlanPolling，false 即停止自我重排。
  watch(isPlanPolling, (polling) => {
    if (!polling) return
    // 防止轮询多次启停叠加出多条 tick 链，始终只保留一条
    if (pollTickTimer) clearTimeout(pollTickTimer)
    const tick = () => {
      if (!isPlanPolling.value) {
        pollTickTimer = null
        return
      }
      pollTickNow.value = now()
      pollTickTimer = setTimeout(tick, 1000)
    }
    tick()
  })

  const planPollingDescription = computed(() => {
    if (planPollTimedOut.value) {
      return '生成耗时已超过预期，自动跟进已暂停。你可以手动刷新查看结果，或稍后在任务中心查看。'
    }
    if (isPlanPolling.value) {
      return `AI 正在根据你的目标岗位和近期训练记录编排今天的任务，通常 10 秒左右完成（已等待 ${planPollElapsedText.value}）。生成完成后会自动出现在这里，不需要离开页面。`
    }
    return '计划已进入处理队列，正在等待结果；页面会自动刷新，也可以在任务中心查看。'
  })

  const retryPlanPolling = async () => {
    stopPlanPolling()
    planPollTimedOut.value = false
    planPollStartedAt.value = 0
    pollTickNow.value = now()
    await options.refresh()
    if (options.isRunning()) {
      schedulePlanPoll()
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopPlanPolling()
      if (pollTickTimer) {
        clearTimeout(pollTickTimer)
        pollTickTimer = null
      }
    })
  }

  return {
    isPlanPolling,
    planPollTimedOut,
    planPollStartedAt,
    pollTickNow,
    planPollElapsedText,
    planPollingDescription,
    stopPlanPolling,
    retryPlanPolling
  }
}
