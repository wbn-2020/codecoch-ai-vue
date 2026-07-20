import request from '@/utils/request'
import type { AgentPlanChangeConfirmVO } from '@/types/agentPlanChange'
import type {
  ApplicationWorkspaceVO,
  ApplicationWorkspaceApplication,
  CareerActivityVO,
  CareerCampaignCreateDTO,
  CareerCampaignReviewGenerateDTO,
  CareerCampaignReviewVO,
  CareerCampaignVO,
  CareerCommunicationDraftVO,
  CareerContactVO,
  CareerOfferVO,
  CareerResearchSnapshotVO,
  CareerResearchSourceVO,
  InterviewProcessVO,
  V7ExternalPlanConfirmDTO,
  V7ExternalPlanPreviewDTO,
  V7ExternalPlanPreviewVO,
  V7StatusTransitionDTO
} from '@/types/v7/career'

export const getCareerCampaignsV7Api = () =>
  request.get<CareerCampaignVO[], CareerCampaignVO[]>('/career-campaigns').then((items) => items || [])

export const createCareerCampaignV7Api = (data: CareerCampaignCreateDTO) =>
  request.post<CareerCampaignVO, CareerCampaignVO>('/career-campaigns', data)

export const updateCareerCampaignV7Api = (id: number, data: Partial<CareerCampaignCreateDTO>) =>
  request.put<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}`, data)

export const activateCareerCampaignV7Api = (id: number) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/activate`)

export const completeCareerCampaignV7Api = (id: number) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/complete`)

export const archiveCareerCampaignV7Api = (id: number) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/archive`)

export const attachApplicationToCampaignV7Api = (campaignId: number, applicationId: number) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${campaignId}/applications/${applicationId}`)

export const detachApplicationFromCampaignV7Api = (campaignId: number, applicationId: number) =>
  request.delete<void, void>(`/career-campaigns/${campaignId}/applications/${applicationId}`)

export const getApplicationWorkspaceV7Api = (applicationId: number) =>
  request.get<ApplicationWorkspaceVO, ApplicationWorkspaceVO>(`/applications/${applicationId}/workspace`).then((value) => ({
    ...value,
    sections: value?.sections || undefined,
    nextSteps: normalizeWorkspaceNextSteps(value?.nextSteps)
  }))

export const transitionApplicationStatusV7Api = (applicationId: number, data: V7StatusTransitionDTO) =>
  request.post<ApplicationWorkspaceApplication, ApplicationWorkspaceApplication>(
    `/applications/${applicationId}/status-transitions`,
    data
  )

export const getInterviewProcessV7Api = (applicationId: number) =>
  request.get<InterviewProcessVO, InterviewProcessVO>(`/applications/${applicationId}/interview-process`).then((value) => ({
    ...value,
    rounds: (value?.rounds || []).map((round) => ({
      ...round,
      scheduledAt: round.scheduledAt || round.scheduledStartsAtUtc,
      reviewSummary: round.reviewSummary || round.resultSummary
    }))
  }))

export const getOffersV7Api = (applicationId: number) =>
  request.get<CareerOfferVO[], CareerOfferVO[]>(`/applications/${applicationId}/offers`).then((items) =>
    (items || []).map((offer) => ({
      ...offer,
      currentVersion: offer.currentVersion
        ? {
          ...offer.currentVersion,
          baseSalary: offer.currentVersion.baseSalary ?? offer.currentVersion.annualBaseSalary,
          bonus: offer.currentVersion.bonus ?? offer.currentVersion.annualBonus,
            deadlineAt:
              offer.currentVersion.deadlineAt ??
              offer.currentVersion.decisionDeadline ??
              offer.decisionDeadline,
            notes: offer.currentVersion.notes ?? offer.currentVersion.note
          }
        : offer.currentVersion
    }))
  )

export const getContactsV7Api = (applicationId: number) =>
  request.get<CareerContactVO[], CareerContactVO[]>(`/applications/${applicationId}/contacts`).then((items) =>
    (items || []).map((item) => ({ ...item, role: item.role || item.roleType }))
  )

export const getActivitiesV7Api = (applicationId: number) =>
  request.get<CareerActivityVO[], CareerActivityVO[]>(`/applications/${applicationId}/activities`).then((items) =>
    (items || []).map((item) => ({
      ...item,
      type: item.type || item.activityType,
      happenedAt: item.happenedAt || item.occurredAt
    }))
  )

export const createCommunicationDraftV7Api = (applicationId: number, data: { purpose: string; facts?: string[] }) =>
  request.post<CareerCommunicationDraftVO, CareerCommunicationDraftVO>(`/applications/${applicationId}/communication-drafts`, {
    ...data,
    facts: data.facts?.join('\n')
  }).then((item) => {
    const rawFallback = (item as CareerCommunicationDraftVO & { fallback?: unknown }).fallback
    return {
      ...item,
      confidenceLevel: item.confidenceLevel || item.confidence,
      fallback: typeof rawFallback === 'boolean' ? rawFallback : Boolean(rawFallback)
    }
  })

export const getResearchSourcesV7Api = (applicationId: number) =>
  request.get<CareerResearchSourceVO[], CareerResearchSourceVO[]>(`/applications/${applicationId}/research-sources`).then((items) =>
    (items || []).map((item) => ({
      ...item,
      url: item.url || item.officialUrl,
      collectedAt: item.collectedAt || item.currentVersion?.capturedAt,
      contentHash: item.contentHash || item.currentVersion?.contentHash,
      active: item.active ?? item.status === 'ACTIVE'
    }))
  )

export const getLatestResearchSnapshotV7Api = (applicationId: number) =>
  request.get<CareerResearchSnapshotVO | null, CareerResearchSnapshotVO | null>(`/applications/${applicationId}/research-snapshots/latest`).then((item) => {
    const research = item?.research
    return item
      ? {
          ...item,
          facts: normalizeResearchFacts(item.facts || research?.facts),
          unknowns: item.unknowns || research?.unknowns || [],
          sourceLimits: item.sourceLimits || research?.sourceLimits || [],
          questionsToVerify: item.questionsToVerify || research?.questionsToVerify || [],
          preparationFocus: item.preparationFocus || research?.preparationFocus || [],
          riskSignals: item.riskSignals || research?.riskSignals || [],
          sourceRefs: item.sourceRefs || item.sourceVersionIds?.map(String) || [],
          confidenceLevel: item.confidenceLevel || research?.confidenceLevel,
          fallback: item.fallback ?? Boolean(item.fallbackReason)
        }
      : null
  })

export const getCareerCampaignReviewV7Api = (campaignId: number) =>
  request.get<CareerCampaignReviewVO, CareerCampaignReviewVO>(`/agent/career-campaign-reviews/campaigns/${campaignId}`)

export const generateCareerCampaignReviewV7Api = (data: CareerCampaignReviewGenerateDTO) =>
  request.post<CareerCampaignReviewVO, CareerCampaignReviewVO>('/agent/career-campaign-reviews/generate', data)

export const confirmCareerMemoryCandidateV7Api = (
  candidateId: number,
  data: { idempotencyKey: string; confirmed?: boolean }
) =>
  request.post<CareerCampaignReviewVO, CareerCampaignReviewVO>(
    `/agent/career-campaign-reviews/memory-candidates/${candidateId}/confirm`,
    data
  )

export const createExternalPlanPreviewV7Api = (data: V7ExternalPlanPreviewDTO) =>
  request.post<V7ExternalPlanPreviewVO, V7ExternalPlanPreviewVO>('/agent/plan-changes/external/preview', data)

export const getExternalPlanPreviewV7Api = (changeSetId: number) =>
  request.get<V7ExternalPlanPreviewVO, V7ExternalPlanPreviewVO>(`/agent/plan-change-sets/${changeSetId}`)

export const confirmExternalPlanPreviewV7Api = (changeSetId: number, data: V7ExternalPlanConfirmDTO) =>
  request.post<AgentPlanChangeConfirmVO, AgentPlanChangeConfirmVO>(
    `/agent/plan-change-sets/${changeSetId}/confirm`,
    data
  )

const normalizeWorkspaceNextSteps = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `rule-next-step-${index}`,
        title: item,
        description: item,
        source: '规则聚合'
      }
    }
    return item
  })
}

const normalizeResearchFacts = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') {
      const statement = (item as { statement?: unknown }).statement
      return typeof statement === 'string' ? statement : JSON.stringify(item)
    }
    return String(item)
  })
}
