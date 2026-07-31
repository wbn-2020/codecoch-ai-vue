import type {
  CampaignActionDecision,
  CampaignActionDecisionDTO,
  CampaignActionDecisionStatus
} from '@/types/v8/campaign'

export const CAMPAIGN_ACTION_TYPE_LABELS: Record<string, string> = {
  FOLLOW_UP_OVERDUE: '跟进已逾期',
  FOLLOW_UP_DUE_SOON: '跟进将到期',
  INTERVIEW_PREP_MISSING: '面试准备缺口',
  INTERVIEW_REVIEW_MISSING: '面试复盘缺口',
  OFFER_DEADLINE: 'Offer 截止',
  APPLICATION_STALE: '机会停滞',
  MATERIAL_COVERAGE_LOW: '材料覆盖不足',
  RESEARCH_COVERAGE_LOW: '研究覆盖不足',
  CONTACT_FOLLOW_UP_DUE: '联系人跟进到期',
  PLAN_CAPACITY_OVERLOAD: '计划容量超载'
}

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
}

export const campaignActionTypeLabel = (value?: string) =>
  CAMPAIGN_ACTION_TYPE_LABELS[String(value || '').toUpperCase()] || '周期行动'

export const campaignActionPriorityRank = (value?: string) =>
  PRIORITY_RANK[String(value || '').toUpperCase()] ?? 4

export const sortCampaignActions = (actions: CampaignActionDecision[]) =>
  [...actions].sort((left, right) => {
    const priority = campaignActionPriorityRank(left.priority) - campaignActionPriorityRank(right.priority)
    if (priority) return priority
    const leftDue = left.dueAt || '9999-12-31T23:59:59'
    const rightDue = right.dueAt || '9999-12-31T23:59:59'
    const due = leftDue.localeCompare(rightDue)
    if (due) return due
    return left.semanticKey.localeCompare(right.semanticKey)
  })

export const campaignActionDecisionLabel = (status?: string) => ({
  SNOOZED: '已稍后处理',
  DISMISSED: '已忽略当前事实',
  REOPENED: '已恢复',
  PLAN_PREVIEWED: '已加入预览'
}[String(status || '').toUpperCase()] || '待处理')

export const campaignActionPriorityType = (priority?: string) => ({
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success'
}[String(priority || '').toUpperCase()] || 'info') as 'danger' | 'warning' | 'info' | 'success'

export const isCampaignActionOpen = (action: CampaignActionDecision) =>
  !['SNOOZED', 'DISMISSED'].includes(String(action.decisionStatus || '').toUpperCase())

export const buildCampaignActionDecisionDTO = (
  action: CampaignActionDecision,
  decisionStatus: CampaignActionDecisionStatus,
  idempotencyKey: string,
  options?: { snoozedUntil?: string; reason?: string }
): CampaignActionDecisionDTO => ({
  semanticKey: action.semanticKey,
  sourceHash: action.sourceHash,
  decisionStatus,
  snoozedUntil: options?.snoozedUntil,
  reason: options?.reason,
  idempotencyKey
})
