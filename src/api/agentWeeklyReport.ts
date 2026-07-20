import request from '@/utils/request'
import { compactQueryParams } from '@/utils/page'
import { normalizeAgentWeeklyReport } from '@/features/agent-weekly-report'
import type {
  AgentWeeklyReport,
  AgentWeeklyReportGenerateRequest,
  AgentWeeklyReportQuery,
  AgentWeeklyReportRefreshRequest
} from '@/types/agentWeeklyReport'

type WeeklyReportListResponse =
  | AgentWeeklyReport[]
  | {
      records?: AgentWeeklyReport[]
      list?: AgentWeeklyReport[]
    }

const normalizeReportList = (value: WeeklyReportListResponse) => {
  const items = Array.isArray(value) ? value : value?.records || value?.list || []
  return items
    .map((item) => normalizeAgentWeeklyReport(item))
    .filter((item): item is AgentWeeklyReport => Boolean(item))
}

export const getCurrentAgentWeeklyReportApi = (
  params?: AgentWeeklyReportQuery,
  options?: { silentError?: boolean }
) =>
  request
    .get<AgentWeeklyReport | null, AgentWeeklyReport | null>('/agent/weekly-reports/current', {
      params: compactQueryParams(params),
      silentError: options?.silentError
    })
    .then(normalizeAgentWeeklyReport)

export const generateAgentWeeklyReportApi = (data: AgentWeeklyReportGenerateRequest) =>
  request
    .post<AgentWeeklyReport, AgentWeeklyReport>('/agent/weekly-reports/generate', data)
    .then(normalizeAgentWeeklyReport)

export const getAgentWeeklyReportDetailApi = (reportId: number) =>
  request
    .get<AgentWeeklyReport, AgentWeeklyReport>(`/agent/weekly-reports/${reportId}`)
    .then(normalizeAgentWeeklyReport)

export const getAgentWeeklyReportsApi = (params?: AgentWeeklyReportQuery) =>
  request
    .get<WeeklyReportListResponse, WeeklyReportListResponse>('/agent/weekly-reports', {
      params: compactQueryParams(params)
    })
    .then(normalizeReportList)

export const refreshAgentWeeklyReportApi = (
  reportId: number,
  data: AgentWeeklyReportRefreshRequest
) =>
  request
    .post<AgentWeeklyReport, AgentWeeklyReport>(`/agent/weekly-reports/${reportId}/refresh`, data)
    .then(normalizeAgentWeeklyReport)
