import request from '@/utils/request'
import type { AgentPlanChangeConfirmVO } from '@/types/agentPlanChange'
import type {
  ApplicationWorkspaceVO,
  ApplicationWorkspaceApplication,
  CareerCampaignActionDTO,
  CareerCampaignApplicationVO,
  CareerCampaignCompleteDTO,
  CareerActivityVO,
  CareerCampaignCreateDTO,
  CareerCampaignUpdateDTO,
  CareerCampaignReviewGenerateDTO,
  CareerCampaignReviewVO,
  CareerCampaignVO,
  CareerCommunicationDraftVO,
  CareerContactVO,
  CareerInterviewCalendarLinkDTO,
  CareerInterviewProcessCreateDTO,
  CareerInterviewRescheduleDTO,
  CareerInterviewRoundCreateDTO,
  CareerInterviewRoundUpdateDTO,
  CareerInterviewTransitionDTO,
  CareerOfferCreateDTO,
  CareerOfferDecisionConfirmDTO,
  CareerOfferDecisionPreviewDTO,
  CareerOfferDecisionVO,
  CareerOfferTransitionDTO,
  CareerOfferVersionCreateDTO,
  CareerOfferVO,
  CareerActivityRecordDTO,
  CareerActivitySaveDTO,
  CareerContactSaveDTO,
  CareerInterviewRoundContactSaveDTO,
  CareerInterviewRoundContactVO,
  CareerResearchSnapshotGenerateDTO,
  CareerResearchSnapshotVO,
  CareerResearchSourceCreateDTO,
  CareerResearchSourceVO,
  CareerResearchSourceVersionCreateDTO,
  CareerResearchSourceVersionVO,
  InterviewProcessVO,
  InterviewRoundVO,
  V7ExternalPlanConfirmDTO,
  V7ExternalPlanPreviewDTO,
  V7ExternalPlanPreviewVO,
  V7StatusTransitionDTO,
  V7StatusTransitionVO
} from '@/types/v7/career'

export const getCareerCampaignsV7Api = () =>
  request.get<CareerCampaignVO[], CareerCampaignVO[]>('/career-campaigns').then((items) => items || [])

export const getCareerCampaignApplicationsV7Api = () =>
  request.get<CareerCampaignApplicationVO[], CareerCampaignApplicationVO[]>('/applications').then((items) =>
    (items || []).map((item) => ({
      ...item,
      campaignId: item.campaignId ?? null
    }))
  )

export const createCareerCampaignV7Api = (data: CareerCampaignCreateDTO) =>
  request.post<CareerCampaignVO, CareerCampaignVO>('/career-campaigns', data)

export const updateCareerCampaignV7Api = (id: number, data: CareerCampaignUpdateDTO) =>
  request.put<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}`, data)

export const activateCareerCampaignV7Api = (id: number, data: CareerCampaignActionDTO) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/activate`, data)

export const completeCareerCampaignV7Api = (id: number, data: CareerCampaignCompleteDTO) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/complete`, data)

export const archiveCareerCampaignV7Api = (id: number, data: CareerCampaignActionDTO) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(`/career-campaigns/${id}/archive`, data)

export const attachApplicationToCampaignV7Api = (campaignId: number, applicationId: number, idempotencyKey: string) =>
  request.post<CareerCampaignVO, CareerCampaignVO>(
    `/career-campaigns/${campaignId}/applications/${applicationId}`,
    undefined,
    { headers: { 'Idempotency-Key': idempotencyKey } }
  )

export const detachApplicationFromCampaignV7Api = (campaignId: number, applicationId: number, idempotencyKey: string) =>
  request.delete<void, void>(
    `/career-campaigns/${campaignId}/applications/${applicationId}`,
    { headers: { 'Idempotency-Key': idempotencyKey } }
  )

export const getApplicationWorkspaceV7Api = (applicationId: number) =>
  request.get<ApplicationWorkspaceVO, ApplicationWorkspaceVO>(`/applications/${applicationId}/workspace`).then((value) => ({
    ...value,
    allowedTransitions:
      value?.allowedTransitions ??
      (value?.application as ApplicationWorkspaceApplication & { allowedTransitions?: string[] } | undefined)?.allowedTransitions,
    sections: value?.sections || undefined,
    nextSteps: normalizeWorkspaceNextSteps(value?.nextSteps)
  }))

export const transitionApplicationStatusV7Api = (applicationId: number, data: V7StatusTransitionDTO) =>
  request.post<V7StatusTransitionVO | ApplicationWorkspaceApplication, V7StatusTransitionVO | ApplicationWorkspaceApplication>(
    `/applications/${applicationId}/status-transitions`,
    data
  ).then((value) => {
    if (value && typeof value === 'object' && 'application' in value) {
      const result = value as V7StatusTransitionVO
      return {
        ...result,
        allowedTransitions: Array.isArray(result.allowedTransitions) ? result.allowedTransitions : []
      }
    }
    return { application: value as ApplicationWorkspaceApplication, allowedTransitions: [] }
  })

const normalizeRound = (round: InterviewRoundVO): InterviewRoundVO => ({
  ...round,
  scheduledAt: round.scheduledAt || round.scheduledStartsAtUtc,
  reviewSummary: round.reviewSummary || round.resultSummary
})

export const getInterviewProcessV7Api = (applicationId: number) =>
  request.get<InterviewProcessVO, InterviewProcessVO>(`/applications/${applicationId}/interview-process`).then((value) => ({
    ...value,
    rounds: (value?.rounds || []).map(normalizeRound)
  }))

// Interview writes — Idempotency-Key travels in the request BODY (DTO field), never in the header.
export const createInterviewProcessV7Api = (applicationId: number, data: CareerInterviewProcessCreateDTO) =>
  request.post<InterviewProcessVO, InterviewProcessVO>(`/applications/${applicationId}/interview-process`, data).then((value) => ({
    ...value,
    rounds: (value?.rounds || []).map(normalizeRound)
  }))

export const createInterviewRoundV7Api = (processId: number, data: CareerInterviewRoundCreateDTO) =>
  request.post<InterviewRoundVO, InterviewRoundVO>(`/interview-processes/${processId}/rounds`, data).then(normalizeRound)

export const updateInterviewRoundV7Api = (roundId: number, data: CareerInterviewRoundUpdateDTO) =>
  request.put<InterviewRoundVO, InterviewRoundVO>(`/interview-rounds/${roundId}`, data).then(normalizeRound)

export const transitionInterviewRoundV7Api = (roundId: number, data: CareerInterviewTransitionDTO) =>
  request.post<InterviewRoundVO, InterviewRoundVO>(`/interview-rounds/${roundId}/transitions`, data).then(normalizeRound)

export const rescheduleInterviewRoundV7Api = (roundId: number, data: CareerInterviewRescheduleDTO) =>
  request.post<InterviewRoundVO, InterviewRoundVO>(`/interview-rounds/${roundId}/reschedule`, data).then(normalizeRound)

export const linkInterviewRoundCalendarV7Api = (roundId: number, data: CareerInterviewCalendarLinkDTO) =>
  request.post<InterviewRoundVO, InterviewRoundVO>(`/interview-rounds/${roundId}/link-calendar-event`, data).then(normalizeRound)

const normalizeOffer = (offer: CareerOfferVO): CareerOfferVO => ({
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
})

export const getOffersV7Api = (applicationId: number) =>
  request.get<CareerOfferVO[], CareerOfferVO[]>(`/applications/${applicationId}/offers`).then((items) =>
    (items || []).map(normalizeOffer)
  )

// Offer writes — Idempotency-Key travels in the HTTP header (backend @RequestHeader), never in the body.
export const createOfferV7Api = (applicationId: number, data: CareerOfferCreateDTO, idempotencyKey: string) =>
  request.post<CareerOfferVO, CareerOfferVO>(`/applications/${applicationId}/offers`, data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  }).then(normalizeOffer)

export const createOfferVersionV7Api = (offerId: number, data: CareerOfferVersionCreateDTO, idempotencyKey: string) =>
  request.post<CareerOfferVO, CareerOfferVO>(`/offers/${offerId}/versions`, data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  }).then(normalizeOffer)

export const transitionOfferV7Api = (offerId: number, data: CareerOfferTransitionDTO, idempotencyKey: string) =>
  request.post<CareerOfferVO, CareerOfferVO>(`/offers/${offerId}/transitions`, data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  }).then(normalizeOffer)

export const previewOfferDecisionV7Api = (
  campaignId: number,
  data: CareerOfferDecisionPreviewDTO | undefined,
  idempotencyKey: string
) =>
  request.post<CareerOfferDecisionVO, CareerOfferDecisionVO>(
    `/career-campaigns/${campaignId}/offer-decisions/preview`,
    data ?? {},
    { headers: { 'Idempotency-Key': idempotencyKey } }
  )

export const confirmOfferDecisionV7Api = (
  campaignId: number,
  decisionId: number,
  data: CareerOfferDecisionConfirmDTO,
  idempotencyKey: string
) =>
  request.post<CareerOfferDecisionVO, CareerOfferDecisionVO>(
    `/career-campaigns/${campaignId}/offer-decisions/${decisionId}/confirm`,
    data,
    { headers: { 'Idempotency-Key': idempotencyKey } }
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

// Contact writes — create/update/delete and round-contact carry NO idempotency key (backend has none).
export const createContactV7Api = (applicationId: number, data: CareerContactSaveDTO) =>
  request.post<CareerContactVO, CareerContactVO>(`/applications/${applicationId}/contacts`, data).then((item) => ({
    ...item,
    role: item.role || item.roleType
  }))

export const updateContactV7Api = (contactId: number, data: CareerContactSaveDTO) =>
  request.put<CareerContactVO, CareerContactVO>(`/career-contacts/${contactId}`, data).then((item) => ({
    ...item,
    role: item.role || item.roleType
  }))

export const deleteContactV7Api = (contactId: number) =>
  request.delete<void, void>(`/career-contacts/${contactId}`)

// Activity writes — Idempotency-Key travels in the request BODY (DTO field).
export const createActivityV7Api = (applicationId: number, data: CareerActivitySaveDTO) =>
  request.post<CareerActivityVO, CareerActivityVO>(`/applications/${applicationId}/activities`, data).then((item) => ({
    ...item,
    type: item.type || item.activityType,
    happenedAt: item.happenedAt || item.occurredAt
  }))

export const recordActivityV7Api = (activityId: number, data: CareerActivityRecordDTO) =>
  request.post<CareerActivityVO, CareerActivityVO>(`/career-activities/${activityId}/record`, data).then((item) => ({
    ...item,
    type: item.type || item.activityType,
    happenedAt: item.happenedAt || item.occurredAt
  }))

export const listRoundContactsV7Api = (roundId: number) =>
  request
    .get<CareerInterviewRoundContactVO[], CareerInterviewRoundContactVO[]>(`/interview-rounds/${roundId}/contacts`)
    .then((items) => items || [])

export const addRoundContactV7Api = (roundId: number, data: CareerInterviewRoundContactSaveDTO) =>
  request.post<CareerInterviewRoundContactVO, CareerInterviewRoundContactVO>(`/interview-rounds/${roundId}/contacts`, data)

export const removeRoundContactV7Api = (roundContactId: number) =>
  request.delete<void, void>(`/interview-round-contacts/${roundContactId}`)

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

// Research writes — source create/version carry no idempotency key; snapshot generate takes an
// optional body idempotencyKey (backend defaults to a random UUID when omitted).
export const createResearchSourceV7Api = (applicationId: number, data: CareerResearchSourceCreateDTO) =>
  request.post<CareerResearchSourceVO, CareerResearchSourceVO>(`/applications/${applicationId}/research-sources`, data)

export const addResearchSourceVersionV7Api = (sourceId: number, data: CareerResearchSourceVersionCreateDTO) =>
  request.post<CareerResearchSourceVersionVO, CareerResearchSourceVersionVO>(`/research-sources/${sourceId}/versions`, data)

export const deactivateResearchSourceV7Api = (sourceId: number) =>
  request.post<void, void>(`/research-sources/${sourceId}/deactivate`)

export const generateResearchSnapshotV7Api = (applicationId: number, data?: CareerResearchSnapshotGenerateDTO) =>
  request.post<CareerResearchSnapshotVO, CareerResearchSnapshotVO>(
    `/applications/${applicationId}/research-snapshots`,
    data ?? {}
  )

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
