import request from '@/utils/request'
import type {
  AgentPlanChangeConfirmDTO,
  AgentPlanChangeConfirmVO,
  AgentPlanChangePreviewDTO,
  AgentPlanChangePreviewVO,
  AgentReviewPlanDecisionDTO,
  AgentReviewPlanSuggestionListVO
} from '@/types/agentPlanChange'
import { compactQueryParams } from '@/utils/page'

interface AgentPlanChangeRequestOptions {
  silentError?: boolean
}

export interface AgentPlanChangeSetQuery {
  targetDate?: string
  status?: string | string[]
}

const normalizeStatusQuery = (status?: string | string[]) =>
  Array.isArray(status) ? status.filter(Boolean).join(',') : status

export const getAgentReviewPlanSuggestionsApi = (
  reviewId: number,
  options?: AgentPlanChangeRequestOptions
) =>
  request.get<AgentReviewPlanSuggestionListVO, AgentReviewPlanSuggestionListVO>(
    `/agent/reviews/${reviewId}/plan-suggestions`,
    options
  )

export const decideAgentReviewPlanSuggestionsApi = (
  reviewId: number,
  data: AgentReviewPlanDecisionDTO,
  options?: AgentPlanChangeRequestOptions
) =>
  request.post<AgentReviewPlanSuggestionListVO, AgentReviewPlanSuggestionListVO>(
    `/agent/reviews/${reviewId}/plan-suggestions/decisions`,
    data,
    options
  )

export const createAgentPlanChangePreviewApi = (
  reviewId: number,
  data: AgentPlanChangePreviewDTO,
  options?: AgentPlanChangeRequestOptions
) =>
  request.post<AgentPlanChangePreviewVO, AgentPlanChangePreviewVO>(
    `/agent/reviews/${reviewId}/plan-change-previews`,
    data,
    options
  )

export const getAgentPlanChangeSetApi = (
  changeSetId: number,
  options?: AgentPlanChangeRequestOptions
) =>
  request.get<AgentPlanChangePreviewVO, AgentPlanChangePreviewVO>(
    `/agent/plan-change-sets/${changeSetId}`,
    options
  )

export const confirmAgentPlanChangeSetApi = (
  changeSetId: number,
  data: AgentPlanChangeConfirmDTO,
  options?: AgentPlanChangeRequestOptions
) =>
  request.post<AgentPlanChangeConfirmVO, AgentPlanChangeConfirmVO>(
    `/agent/plan-change-sets/${changeSetId}/confirm`,
    data,
    options
  )

export const getAgentPlanChangeSetsApi = (
  params?: AgentPlanChangeSetQuery,
  options?: AgentPlanChangeRequestOptions
) =>
  request
    .get<AgentPlanChangePreviewVO[], AgentPlanChangePreviewVO[]>(
      '/agent/plan-change-sets',
      {
        ...options,
        params: compactQueryParams({
          targetDate: params?.targetDate,
          status: normalizeStatusQuery(params?.status)
        })
      }
    )
    .then((data) => data || [])
