import { recordAgentMetricEventApi } from '@/api/agent'

/**
 * Phase 3 漏斗指标：每周完成「岗位分析 → 定向训练 → 模拟面试 → 查看复盘」闭环次数的度量底座。
 * 战略报告 §8.2 核心漏斗各节点对应一个 funnel_* 事件；幂等键避免重复上报。
 * 事件通道复用 agent_metric_event（eventCode 为开放 string），失败静默（不影响用户操作）。
 */
export type FunnelStep =
  | 'funnel_resume_imported'
  | 'funnel_job_created'
  | 'funnel_jd_analyzed'
  | 'funnel_match_report_viewed'
  | 'funnel_training_started'
  | 'funnel_training_completed'
  | 'funnel_interview_started'
  | 'funnel_report_viewed'
  | 'funnel_action_executed'

const idempotencyKey = (step: FunnelStep, bizId?: string | number) =>
  `${step}:${bizId ?? 'na'}:${new Date().toISOString().slice(0, 10)}`

export const trackFunnelStep = (
  step: FunnelStep,
  options?: { targetJobId?: number; bizId?: string | number; sourcePage?: string }
) => {
  void recordAgentMetricEventApi(
    {
      eventCode: step,
      idempotencyKey: idempotencyKey(step, options?.bizId),
      targetJobId: options?.targetJobId,
      bizId: options?.bizId != null ? String(options.bizId) : undefined,
      sourcePage: options?.sourcePage
    },
    { silentError: true }
  ).catch(() => {
    // 指标上报失败不影响用户操作
  })
}
