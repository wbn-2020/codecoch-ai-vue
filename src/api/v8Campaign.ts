import request from '@/utils/request'
import type {
  CampaignActionDecision,
  CampaignActionDecisionRecord,
  CampaignActionDecisionDTO,
  CampaignArchiveExportCreateDTO,
  CampaignArchiveExportVO,
  CampaignCockpitVO,
  CampaignOperatingProfile,
  CampaignOperatingProfileUpdateDTO,
  CampaignPulseGenerateDTO,
  CampaignPulseHistoryVO,
  CampaignPulsePlanPreviewDTO,
  CampaignPulseSnapshot,
  CampaignScenarioPreviewDTO,
  CampaignScenarioPreviewVO
} from '@/types/v8/campaign'
import type { V7ExternalPlanPreviewVO } from '@/types/v7/career'

const normalizePulse = (
  value?: CampaignPulseSnapshot | null
): CampaignPulseSnapshot | null => {
  if (!value) return null
  const narrative = value.narrative
  const factEntries = Array.isArray(value.facts)
    ? value.facts
    : Object.entries((value.facts || {}) as Record<string, unknown>)
        .map(([key, fact]) => `${key}：${String(fact ?? '')}`)
  return {
    ...value,
    summary: value.summary || narrative?.summary,
    facts: narrative?.facts?.length ? narrative.facts : factEntries,
    changes: narrative?.changes?.length ? narrative.changes : (value.changes || []),
    driftReasons: narrative?.driftReasons?.length
      ? narrative.driftReasons
      : (value.driftSignals || []),
    focusAreas: narrative?.focusAreas || value.focusAreas || [],
    limits: Array.from(new Set([...(value.limits || []), ...(narrative?.limits || [])])),
    confidenceLevel: narrative?.confidenceLevel || value.confidenceLevel,
    fallback: Boolean(value.fallback || narrative?.fallback),
    generatedAt: value.generatedAt || value.createdAt
  }
}

export const getCampaignOperatingProfileV8Api = (campaignId: number) =>
  request.get<CampaignOperatingProfile, CampaignOperatingProfile>(
    `/career-campaigns/${campaignId}/operating-profile`
  )

export const updateCampaignOperatingProfileV8Api = (
  campaignId: number,
  data: CampaignOperatingProfileUpdateDTO
) =>
  request.put<CampaignOperatingProfile, CampaignOperatingProfile>(
    `/career-campaigns/${campaignId}/operating-profile`,
    data
  )

export const getCampaignCockpitV8Api = (campaignId: number) =>
  request.get<CampaignCockpitVO, CampaignCockpitVO>(
    `/agent/career-campaign-cockpits/${campaignId}`
  ).then((value) => ({
    ...value,
    campaign: value?.campaign
      ? {
          ...value.campaign,
          name: value.campaign.name || value.campaign.title
        }
      : undefined,
    applications: (value?.applications || []).map((application) => ({
      ...application,
      id: application.id || application.applicationId || 0,
      actionUrl: application.actionUrl
        || `/applications/${application.id || application.applicationId}`
    })),
    actionQueue: value?.actionQueue || [],
    warnings: value?.warnings || [],
    limits: value?.limits || []
  }))

export const getCampaignActionDecisionsV8Api = (campaignId: number) =>
  request.get<CampaignActionDecisionRecord[], CampaignActionDecisionRecord[]>(
    `/agent/career-campaign-cockpits/${campaignId}/action-decisions`
  ).then((items) => items || [])

export const saveCampaignActionDecisionV8Api = (
  campaignId: number,
  data: CampaignActionDecisionDTO
) =>
  request.post<CampaignActionDecision, CampaignActionDecision>(
    `/agent/career-campaign-cockpits/${campaignId}/action-decisions`,
    data
  )

export const getCampaignPulseV8Api = (campaignId: number) =>
  request.get<CampaignPulseSnapshot | null, CampaignPulseSnapshot | null>(
    `/agent/career-campaign-pulses/campaigns/${campaignId}`
  ).then(normalizePulse)

export const getCampaignPulseHistoryV8Api = (campaignId: number) =>
  request.get<
    CampaignPulseHistoryVO | CampaignPulseSnapshot[],
    CampaignPulseHistoryVO | CampaignPulseSnapshot[]
  >(
    `/agent/career-campaign-pulses/campaigns/${campaignId}/history`
  ).then((value) => {
    const snapshots = Array.isArray(value) ? value : value?.snapshots
    return (snapshots || [])
      .map(normalizePulse)
      .filter((item): item is CampaignPulseSnapshot => Boolean(item))
  })

export const generateCampaignPulseV8Api = (data: CampaignPulseGenerateDTO) =>
  request.post<CampaignPulseSnapshot, CampaignPulseSnapshot>(
    '/agent/career-campaign-pulses/generate',
    data
  ).then(normalizePulse) as Promise<CampaignPulseSnapshot>

export const createCampaignPulsePlanPreviewV8Api = (
  snapshotId: number,
  data: CampaignPulsePlanPreviewDTO
) =>
  request.post<V7ExternalPlanPreviewVO, V7ExternalPlanPreviewVO>(
    `/agent/career-campaign-pulses/${snapshotId}/plan-preview`,
    data
  )

export const previewCampaignScenarioV8Api = (
  campaignId: number,
  data: CampaignScenarioPreviewDTO
) =>
  request.post<CampaignScenarioPreviewVO, CampaignScenarioPreviewVO>(
    `/agent/career-campaign-cockpits/${campaignId}/scenarios/preview`,
    data
  )

export const createCampaignArchiveExportV8Api = (
  campaignId: number,
  data: CampaignArchiveExportCreateDTO
) =>
  request.post<CampaignArchiveExportVO, CampaignArchiveExportVO>(
    `/career-campaigns/${campaignId}/archive-exports`,
    data
  )

export const getCampaignArchiveExportsV8Api = (campaignId: number) =>
  request.get<CampaignArchiveExportVO[], CampaignArchiveExportVO[]>(
    `/career-campaigns/${campaignId}/archive-exports`
  ).then((items) => items || [])

export const getCampaignArchiveExportV8Api = (exportId: number) =>
  request.get<CampaignArchiveExportVO, CampaignArchiveExportVO>(
    `/career-campaign-archive-exports/${exportId}`
  )

export const downloadCampaignArchiveExportV8Api = (exportId: number) =>
  request.get<Blob, Blob>(
    `/career-campaign-archive-exports/${exportId}/download`,
    { responseType: 'blob' }
  )

export const getCampaignProfileV8Api = getCampaignOperatingProfileV8Api
export const saveCampaignProfileV8Api = updateCampaignOperatingProfileV8Api
export const getCampaignCockpitApi = getCampaignCockpitV8Api
export const previewCampaignScenarioApi = previewCampaignScenarioV8Api
