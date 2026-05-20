export type DashboardStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'SUPPORTED' | 'unsupported' | string

export interface AdminDashboardSummaryCardVO {
  key: string
  label: string
  value: number
  sourceTable?: string
}

export interface AdminDashboardTrendStatVO {
  date: string
  interviewCount?: number
  resumeUploadCount?: number
  aiCallCount?: number
  aiCallFailedCount?: number
  studyPlanGeneratedCount?: number
  questionReviewGeneratedCount?: number
}

export interface AdminDashboardPendingItemVO {
  key: string
  label: string
  count: number
  status?: DashboardStatus
  sourceTable?: string
  reason?: string
}

export interface AdminDashboardServiceStatusVO {
  serviceName: string
  status: DashboardStatus
  reason?: string
  source?: string
}

export interface AdminDashboardSystemStatusVO {
  status: DashboardStatus
  services: AdminDashboardServiceStatusVO[]
  generatedAt?: string
}

export interface AdminDashboardOverviewVO {
  summaryCards: AdminDashboardSummaryCardVO[]
  trendStats: AdminDashboardTrendStatVO[]
  pendingItems: AdminDashboardPendingItemVO[]
  systemStatus?: AdminDashboardSystemStatusVO
  dataSourceDesc?: string
  generatedAt?: string
}

export interface UserDashboardRecentResumeParseVO {
  analysisRecordId: number
  resumeId?: number
  fileName?: string
  parseStatus?: string
  updatedAt?: string
}

export interface UserDashboardRecentResumeOptimizeVO {
  optimizeRecordId: number
  resumeId?: number
  optimizeStatus?: string
  aiCallLogId?: number
  updatedAt?: string
}

export interface UserDashboardRecentInterviewVO {
  interviewId: number
  title?: string
  status?: string
  reportStatus?: string
  updatedAt?: string
}

export interface UserDashboardRecentReportVO {
  reportId: number
  interviewId: number
  status?: string
  totalScore?: number
  generatedAt?: string
}

export interface UserDashboardActiveStudyPlanVO {
  planId: number
  planTitle?: string
  planStatus?: string
  totalTaskCount?: number
  doneTaskCount?: number
  progressPercent?: number
  updatedAt?: string
}

export interface UserDashboardEntryStatusVO {
  key: string
  status: string
  reason?: string
  relatedId?: number
}

export interface V3DashboardTargetJobVO {
  targetJobId?: number
  id?: number
  jobTitle?: string
  companyName?: string
  jobLevel?: string
  parseStatus?: string
  updatedAt?: string
}

export interface V3DashboardLatestMatchVO {
  matchReportId?: number
  reportId?: number
  resumeId?: number
  targetJobId?: number
  overallScore?: number
  status?: string
  summary?: string
  updatedAt?: string
}

export interface V3DashboardStudyProgressVO extends UserDashboardActiveStudyPlanVO {
  planId: number
}

export interface V3DashboardRecommendedQuestionsVO {
  batchId?: number
  status?: string
  questionCount?: number
  sourceType?: string
  updatedAt?: string
}

export interface V3DashboardNextActionVO {
  title?: string
  desc?: string
  description?: string
  path?: string
  actionUrl?: string
  type?: string
}

export interface V3DashboardOverviewVO extends UserDashboardOverviewVO {
  currentTargetJob?: V3DashboardTargetJobVO | null
  latestMatch?: V3DashboardLatestMatchVO | null
  studyProgress?: V3DashboardStudyProgressVO | null
  recommendedQuestions?: V3DashboardRecommendedQuestionsVO | null
  nextActions?: V3DashboardNextActionVO[] | string[] | string | null
}

export interface UserDashboardOverviewVO {
  resumeCount: number
  recentResumeParse?: UserDashboardRecentResumeParseVO | null
  recentResumeOptimize?: UserDashboardRecentResumeOptimizeVO | null
  interviewCount: number
  recentInterview?: UserDashboardRecentInterviewVO | null
  recentReport?: UserDashboardRecentReportVO | null
  studyPlanCount: number
  activeStudyPlan?: UserDashboardActiveStudyPlanVO | null
  todayTaskCount: number
  todayCompletedTaskCount: number
  entryStatuses: UserDashboardEntryStatusVO[]
  generatedAt?: string
}
