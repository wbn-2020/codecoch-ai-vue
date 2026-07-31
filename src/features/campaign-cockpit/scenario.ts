import type {
  CampaignActionDecision,
  CampaignFocusMode,
  CampaignScenarioPreviewDTO,
  CampaignScenarioPreviewVO
} from '@/types/v8/campaign'

export const CAMPAIGN_FOCUS_MODE_OPTIONS: Array<{ value: CampaignFocusMode; label: string }> = [
  { value: 'DEADLINE_FIRST', label: '截止优先' },
  { value: 'HIGH_PRIORITY_FIRST', label: '高优先级优先' },
  { value: 'BALANCED', label: '均衡安排' }
]

export const createDefaultCampaignScenarioInput = (): CampaignScenarioPreviewDTO => ({
  availableMinutes: 180,
  focusMode: 'BALANCED',
  maxApplications: 5,
  includeLowConfidence: false
})

export const normalizeCampaignScenarioInput = (
  input: Partial<CampaignScenarioPreviewDTO>
): CampaignScenarioPreviewDTO => {
  const defaults = createDefaultCampaignScenarioInput()
  return {
    availableMinutes: Math.max(0, Math.floor(Number(input.availableMinutes ?? defaults.availableMinutes))),
    focusMode: CAMPAIGN_FOCUS_MODE_OPTIONS.some((item) => item.value === input.focusMode)
      ? input.focusMode as CampaignFocusMode
      : defaults.focusMode,
    maxApplications: Math.max(0, Math.floor(Number(input.maxApplications ?? defaults.maxApplications))),
    includeLowConfidence: Boolean(input.includeLowConfidence)
  }
}

export const validateCampaignScenarioInput = (input: CampaignScenarioPreviewDTO) => {
  const errors: string[] = []
  if (!Number.isFinite(input.availableMinutes) || input.availableMinutes < 0) {
    errors.push('可用时间不能小于 0 分钟。')
  }
  if (!Number.isFinite(input.maxApplications) || input.maxApplications < 0) {
    errors.push('机会数量不能小于 0。')
  }
  return errors
}

export const scenarioActionCount = (preview?: CampaignScenarioPreviewVO | null) => ({
  selected: preview?.selectedActions?.length || 0,
  deferred: preview?.deferredActions?.length || 0,
  totalMinutes: preview?.totalEstimatedMinutes || 0,
  remainingMinutes: preview?.capacityRemainingMinutes || 0
})

export const sortScenarioActions = (actions: CampaignActionDecision[]) =>
  [...actions].sort((left, right) => {
    const leftDue = left.dueAt || '9999-12-31T23:59:59'
    const rightDue = right.dueAt || '9999-12-31T23:59:59'
    return leftDue.localeCompare(rightDue) || left.semanticKey.localeCompare(right.semanticKey)
  })
