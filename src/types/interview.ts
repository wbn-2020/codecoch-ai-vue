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
export type TrainingScene = 'PROJECT_DEEP_DIVE' | 'JAVA_SPECIALTY' | string
export type InterviewReportSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'
export type InterviewAnswerReviewSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'
export type InterviewQuestionSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'
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
  applicationId?: number
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
  practiceMode?: string
  questionCount?: number
  trainingScene?: TrainingScene
  targetSkillDomain?: string
  targetSkillCodes?: string[]
  targetLevel?: string
  projectEvidenceIds?: number[]
  followUpIntensity?: string
}

export interface InterviewCreateByJobTargetDTO extends InterviewCreateDTO {
  resumeId: number
  targetJobId: number
  skillProfileId?: number
  matchReportId?: number
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
  applicationId?: number
  interviewName?: string
  interviewMode?: string
  industryTemplateId?: number
  industryDirection?: string
  industryContext?: string
  trainingScene?: TrainingScene
  targetSkillDomain?: string
  targetSkillCodes?: string[]
  targetLevel?: string
  projectEvidenceIds?: number[]
  followUpIntensity?: string
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
  applicationId?: number
  sessionId?: number
  status: InterviewStatus
  interviewStatus?: InterviewStatus
  currentStage?: InterviewStageVO
  currentQuestion?: InterviewQuestionVO
  startedAt?: string
  outline?: InterviewOutlineStageVO[]
}

export interface InterviewOutlineStageVO {
  stageOrder: number
  stageName: string
  stageType?: string
  expectedQuestionCount?: number
  estimatedMinutes?: number
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface InterviewAnswerDTO {
  messageId: number
  answerContent: string
  answerDurationSeconds?: number
  clientSubmitTime?: string
}

export interface InterviewEvaluationVO {
  score?: number
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
  [key: string]: unknown
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
  content?: string
  index?: number
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface InterviewQuestionSseEvent {
  requestId?: string
  type?: InterviewQuestionSseEventType | string
  message?: string
  interviewId?: number
  sessionId?: number
  status?: InterviewStatus
  question?: InterviewQuestionVO
  result?: InterviewCurrentVO | Record<string, unknown>
  stage?: string
  code?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface InterviewQueryDTO extends PageQuery {
  status?: InterviewStatus | ''
  reportStatus?: ReportStatus | ''
  keyword?: string
}

export interface InterviewListVO {
  interviewId: number
  applicationId?: number
  interviewName?: string
  interviewMode: string
  resumeName?: string
  targetPosition?: string
  industryTemplateId?: number
  industryDirection?: string
  trainingScene?: TrainingScene
  targetSkillDomain?: string
  targetSkillCodes?: string[]
  targetLevel?: string
  projectEvidenceIds?: number[]
  followUpIntensity?: string
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
  applicationId?: number
  interviewName?: string
  interviewMode: string
  targetPosition?: string
  experienceLevel?: string
  industryTemplateId?: number
  industryDirection?: string
  industryContext?: string
  difficulty?: string
  interviewerStyle?: string
  trainingScene?: TrainingScene
  targetSkillDomain?: string
  targetSkillCodes?: string[]
  targetLevel?: string
  projectEvidenceIds?: number[]
  followUpIntensity?: string
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
  questionTitle?: string
  difficulty?: string
  reason?: string
  recommendReason?: string
}

export type RubricDimension =
  | 'EXPRESSION_STRUCTURE'
  | 'TECHNICAL_DEPTH'
  | 'BUSINESS_UNDERSTANDING'
  | 'RISK_AWARENESS'
  | 'IMPLEMENTABILITY'
  | string

export interface InterviewRubricScoreVO {
  dimension: RubricDimension
  score?: number
  comment?: string
  evidenceSummary?: string
  improvementSuggestion?: string
  sampleInsufficient?: boolean
  sampleWarning?: string
}

export interface InterviewFollowUpTraceVO {
  questionMessageId?: number
  answerMessageId?: number
  followUpMessageId?: number
  questionSummary?: string
  answerSummary?: string
  followUpQuestion?: string
  followUpIntent?: string
  followUpReason?: string
  exposedRisk?: string
  evidenceSource?: string
}

export interface InterviewAdviceEvidenceSourceVO {
  sourceType?: string
  sourceId?: number | string
  sourceSummary?: string
}

export interface InterviewAdviceEvidenceVO {
  title?: string
  content?: string
  adviceType?: string
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | string
  sampleInsufficient?: boolean
  sampleWarning?: string
  feedbackStatus?: string
  actionUrl?: string
  evidenceSources?: InterviewAdviceEvidenceSourceVO[]
}

export interface InterviewAbilityProfileUpdateVO {
  skillCode?: string
  candidateStatus?: string
  confidence?: string
  evidenceCount?: number
  sampleInsufficient?: boolean
  sampleWarning?: string
}

export interface InterviewReportVO {
  id?: number
  reportId?: number
  interviewId: number
  applicationId?: number
  sessionId?: number
  targetJobId?: number
  skillProfileId?: number
  matchReportId?: number
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
  resumeSuggestions?: string
  resumeAdvice?: string
  recommendedQuestions?: Array<RecommendedQuestionVO | string>
  questionReviews?: InterviewMessageVO[]
  qaReview?: InterviewMessageVO[]
  rubricScores?: InterviewRubricScoreVO[]
  followUpTree?: InterviewFollowUpTraceVO[]
  adviceEvidence?: InterviewAdviceEvidenceVO[]
  abilityProfileUpdates?: InterviewAbilityProfileUpdateVO[]
  messages?: InterviewMessageVO[]
  generatedAt?: string
  createdAt?: string
  failedReason?: string
  failureReason?: string
  errorMessage?: string
}
