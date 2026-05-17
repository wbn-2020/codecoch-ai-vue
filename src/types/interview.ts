import type { PageQuery } from './api'

export type InterviewStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_ANSWER'
  | 'AI_EVALUATING'
  | 'REPORT_GENERATING'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED'
  | string
export type ReportStatus = 'NOT_GENERATED' | 'GENERATING' | 'GENERATED' | 'FAILED' | string
export type NextAction = 'FOLLOW_UP' | 'NEXT_QUESTION' | 'NEXT_STAGE' | 'FINISH' | string
export type InterviewReportSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'
export type InterviewAnswerReviewSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'
export type InterviewAnswerReviewSseStage =
  | 'VALIDATE_REQUEST'
  | 'LOAD_INTERVIEW'
  | 'SAVE_ANSWER'
  | 'BUILD_PROMPT'
  | 'CALL_AI_REVIEW'
  | 'SAVE_REVIEW'
  | 'GENERATE_FOLLOW_UP'
  | 'SAVE_FOLLOW_UP'
  | string
export type InterviewReportSseStage =
  | 'LOAD_INTERVIEW'
  | 'LOAD_ANSWERS'
  | 'BUILD_PROMPT'
  | 'CALL_AI'
  | 'SAVE_REPORT'
  | string

export interface IndustryTemplateVO {
  industryTemplateId: number
  industryCode?: string
  industryName: string
  description?: string
  targetPositions?: string
  coreBusinessScenarios?: string
  keyTechnicalPoints?: string
  commonQuestionDirections?: string
  riskPoints?: string
  promptContext?: string
  enabled?: number
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface InterviewCreateDTO {
  resumeId?: number
  basedOnResume?: boolean
  interviewName?: string
  interviewMode?: string
  targetPosition?: string
  experienceLevel?: string
  industryTemplateId?: number
  industryDirection?: string
  difficulty?: string
  interviewerStyle?: string
  questionCount?: number
}

export interface InterviewStageVO {
  stageId: number
  stageType?: string
  stageName: string
  stageOrder: number
  expectedQuestionCount: number
  actualQuestionCount: number
  focusPoints?: string
  status: string
  stageScore?: number
}

export interface InterviewSessionVO {
  interviewId: number
  interviewName?: string
  interviewMode?: string
  industryTemplateId?: number
  industryDirection?: string
  industryContext?: string
  status: InterviewStatus
  reportStatus: ReportStatus
  stageList?: InterviewStageVO[]
  createdAt?: string
}

export interface InterviewQuestionVO {
  sessionId?: number
  messageId: number
  questionId?: number
  questionGroupId?: number
  questionTitle?: string
  questionContent: string
  questionType?: string
  isFollowUp: boolean
  parentMessageId?: number
  followUpCount?: number
  stageProgress?: string
  interviewStatus?: InterviewStatus
  stageId: number
  stageName?: string
  stageType?: string
  followUpReason?: string
  knowledgePoints?: string[]
}

export interface InterviewCurrentVO {
  interviewId: number
  sessionId?: number
  status: InterviewStatus
  interviewStatus?: InterviewStatus
  currentStage?: InterviewStageVO
  currentQuestion?: InterviewQuestionVO
  startedAt?: string
}

export interface InterviewAnswerDTO {
  messageId: number
  answerContent: string
  answerDurationSeconds?: number
  clientSubmitTime?: string
}

export interface InterviewEvaluationVO {
  score: number
  level?: string
  comment: string
  advantage?: string
  weakness?: string
  suggestion?: string
  knowledgePoints?: string | string[]
  followUpSuggested?: boolean
  followUpReason?: string
}

export interface InterviewProgressVO {
  currentStageOrder: number
  totalStageCount: number
  currentQuestionIndex: number
  totalQuestionCount: number
  answeredQuestionCount: number
  followUpCount: number
  maxFollowUpCount: number
}

export interface InterviewAnswerResultVO {
  interviewId: number
  answerMessageId: number
  score?: number
  comment?: string
  evaluation: InterviewEvaluationVO
  nextAction: NextAction
  nextQuestion?: InterviewQuestionVO
  followUpQuestion?: string
  followUpReason?: string
  followUpValid?: boolean
  knowledgePoints?: string[]
  currentStage?: InterviewStageVO
  interviewStatus: InterviewStatus
  reportStatus?: ReportStatus
  progress?: InterviewProgressVO
}

export interface FinishInterviewVO {
  interviewId: number
  status: InterviewStatus
  reportStatus: ReportStatus
  report?: Partial<InterviewReportVO>
  reportId?: number
  finishedAt?: string
  message?: string
}

export interface RetryReportVO {
  interviewId: number
  reportStatus: ReportStatus
  reportId?: number
  message?: string
}

export interface InterviewAnswerReviewSseParams {
  interviewId: number
}

export interface InterviewAnswerReviewSseEvent {
  requestId?: string
  type?: InterviewAnswerReviewSseEventType | string
  message?: string
  interviewId?: number
  questionId?: number
  answerId?: number
  messageId?: number
  aiCallLogId?: number
  followUpAiCallLogId?: number
  score?: number
  feedback?: string
  followUpQuestion?: string
  followUpReason?: string
  nextAction?: NextAction
  nextQuestion?: InterviewQuestionVO
  stage?: InterviewAnswerReviewSseStage
  code?: string
  result?: InterviewAnswerResultVO | Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface InterviewReportSseParams {
  interviewId: number
  reportId?: number
  forceRegenerate?: boolean
}

export interface InterviewReportSseEvent {
  requestId?: string
  type?: InterviewReportSseEventType | string
  message?: string
  interviewId?: number
  reportId?: number
  aiCallLogId?: number
  result?: InterviewReportVO | Record<string, unknown>
  stage?: InterviewReportSseStage
  code?: string
}

export interface InterviewQueryDTO extends PageQuery {
  status?: InterviewStatus | ''
  reportStatus?: ReportStatus | ''
  keyword?: string
}

export interface InterviewListVO {
  interviewId: number
  interviewName?: string
  interviewMode: string
  resumeName?: string
  targetPosition?: string
  industryTemplateId?: number
  industryDirection?: string
  status: InterviewStatus
  reportStatus: ReportStatus
  totalScore?: number
  stageCount?: number
  questionCount?: number
  startedAt?: string
  finishedAt?: string
  createdAt?: string
}

export interface ResumeSnapshotVO {
  resumeId?: number
  resumeName?: string
  targetPosition?: string
  skills?: string
  workSummary?: string
  education?: string
  projects?: Record<string, unknown>[]
}

export interface InterviewMessageVO {
  messageId: number
  stageId: number
  questionId?: number
  groupId?: number
  role: string
  messageType: string
  content: string
  questionContent?: string
  userAnswer?: string
  aiComment?: string
  score?: number
  isFollowUp: boolean
  parentMessageId?: number
  followUpReason?: string
  knowledgePoints?: string | string[]
  createdAt?: string
}

export interface InterviewDetailVO {
  interviewId: number
  interviewName?: string
  interviewMode: string
  targetPosition?: string
  experienceLevel?: string
  industryTemplateId?: number
  industryDirection?: string
  industryContext?: string
  difficulty?: string
  interviewerStyle?: string
  status: InterviewStatus
  reportStatus: ReportStatus
  resumeSnapshot?: ResumeSnapshotVO
  stages?: InterviewStageVO[]
  messages?: InterviewMessageVO[]
  createdAt?: string
  startedAt?: string
  finishedAt?: string
}

export interface StageReportVO {
  stageId: number
  stageName: string
  stageType?: string
  score?: number
  summary?: string
  weaknesses?: string
  suggestions?: string
}

export interface RecommendedQuestionVO {
  id?: number
  questionId?: number
  title?: string
  difficulty?: string
  reason?: string
}

export interface InterviewReportVO {
  id?: number
  reportId?: number
  interviewId: number
  sessionId?: number
  reportStatus: ReportStatus
  status?: ReportStatus | InterviewStatus
  totalScore?: number
  stageScores?: StageReportVO[]
  weakPoints?: string[] | string
  summary?: string
  reportContent?: string
  stageReports?: StageReportVO[]
  strengths?: string
  mainProblems?: string
  weaknesses?: string
  reviewSuggestions?: string
  suggestions?: string
  weakKnowledgePoints?: string
  projectProblems?: string
  projectExpressionProblems?: string
  recommendedQuestions?: RecommendedQuestionVO[]
  questionReviews?: InterviewMessageVO[]
  qaReview?: InterviewMessageVO[]
  messages?: InterviewMessageVO[]
  generatedAt?: string
  createdAt?: string
  failedReason?: string
  failureReason?: string
  errorMessage?: string
}
