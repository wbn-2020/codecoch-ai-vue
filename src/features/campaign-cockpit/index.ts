import type {
  CampaignCapacitySummary,
  CampaignCockpitVO,
  CampaignOperatingProfile,
  CampaignPulseSummary
} from '@/types/v8/campaign'

export const DEFAULT_CAMPAIGN_TIMEZONE = 'Asia/Shanghai'

export const DEFAULT_OPERATING_PROFILE: Omit<CampaignOperatingProfile, 'campaignId'> = {
  configured: false,
  weeklyApplicationTarget: 5,
  weeklyTimeBudgetMinutes: 300,
  maxActiveOpportunities: 8,
  staleAfterDays: 7,
  defaultFollowUpDays: 5,
  focusRoles: [],
  focusLocations: [],
  focusChannels: [],
  timezone: DEFAULT_CAMPAIGN_TIMEZONE
}

export const normalizeOperatingProfile = (
  campaignId: number,
  value?: Partial<CampaignOperatingProfile> | null
): CampaignOperatingProfile => ({
  campaignId,
  ...DEFAULT_OPERATING_PROFILE,
  ...value,
  focusRoles: Array.isArray(value?.focusRoles) ? value.focusRoles.filter(Boolean) : [],
  focusLocations: Array.isArray(value?.focusLocations) ? value.focusLocations.filter(Boolean) : [],
  focusChannels: Array.isArray(value?.focusChannels) ? value.focusChannels.filter(Boolean) : [],
  timezone: value?.timezone || DEFAULT_CAMPAIGN_TIMEZONE
})

export const getCampaignStatusPresentation = (status?: string) => {
  const normalized = String(status || '').toUpperCase()
  const values: Record<string, { label: string; type: 'success' | 'info' | 'warning' | 'danger' }> = {
    DRAFT: { label: '草稿', type: 'info' },
    ACTIVE: { label: '进行中', type: 'success' },
    PAUSED: { label: '已暂停', type: 'warning' },
    COMPLETED: { label: '已完成', type: 'info' },
    ARCHIVED: { label: '已归档', type: 'info' }
  }
  return values[normalized] || { label: '状态待确认', type: 'info' }
}

export const getCampaignConfidencePresentation = (value?: string) => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'HIGH') return { label: '高置信度', type: 'success' as const }
  if (normalized === 'MEDIUM') return { label: '中置信度', type: 'warning' as const }
  if (normalized === 'LOW') return { label: '低置信度', type: 'danger' as const }
  return { label: '置信度待确认', type: 'info' as const }
}

export const getCampaignPulseDisplay = (
  pulse?: CampaignPulseSummary | null
) => ({
  summary: pulse?.summary || '当前还没有周期脉搏摘要。',
  facts: pulse?.facts || [],
  changes: pulse?.changes || [],
  driftReasons: pulse?.driftReasons || [],
  limits: pulse?.limits || [],
  fallback: Boolean(pulse?.fallback),
  confidence: getCampaignConfidencePresentation(pulse?.confidenceLevel)
})

export const getCampaignCoverageLabels = (coverage?: CampaignCockpitVO['coverage']) => {
  if (!coverage) return { included: 0, unavailable: 0, failed: 0 }
  if ('included' in coverage || 'unavailable' in coverage || 'failed' in coverage) {
    return {
      included: Array.isArray(coverage.included) ? coverage.included.length : 0,
      unavailable: Array.isArray(coverage.unavailable) ? coverage.unavailable.length : 0,
      failed: Array.isArray(coverage.failed) ? coverage.failed.length : 0
    }
  }
  const sections = Object.values(coverage)
  return {
    included: sections.filter((section) => section?.available !== false).length,
    unavailable: sections.filter((section) => section?.available === false).length,
    failed: sections.filter((section) =>
      section?.available === false && Boolean(section.warning)
    ).length
  }
}

export const getCampaignCapacityPresentation = (capacity?: CampaignCapacitySummary) => ({
  remaining: capacity?.remainingMinutes ?? '--',
  budget: capacity?.availableMinutes ?? capacity?.weeklyBudgetMinutes ?? '--',
  used: capacity?.usedMinutes ?? capacity?.openActionMinutes ?? '--',
  active: capacity?.activeOpportunityCount ?? '--',
  maximum: capacity?.maxActiveOpportunities ?? '--',
  applications: capacity?.weeklyApplications ?? '--',
  target: capacity?.weeklyApplicationTarget ?? '--'
})
