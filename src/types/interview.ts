import type { PageQuery } from './api'

export type InterviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'FAILED' | string
export type ReportStatus = 'NOT_GENERATED' | 'GENERATING' | 'GENERATED' | 'FAILED' | string
export type NextAction = 'FOLLOW_UP' | 'NEXT_QUESTION' | 'NEXT_STAGE' | 'FINISH' | string

export interface InterviewCreateDTO {
  resumeId?: number
  questionGroupId?: number
  mode?: string
  title?: string
  maxQuestionCount?: number
  basedOnResume?: boolean
  interviewName?: string
  interviewMode?: string
  targetPosition?: string
  experienceLevel?: string
  industryDirection?: string
  difficulty?: string
  interviewerStyle?: string
  stageTypes?: string[]
  questionCount?: number
  config?: Record<string, unknown>
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
  status: InterviewStatus
  reportStatus: ReportStatus
  stageList?: InterviewStageVO[]
  createdAt?: string
}

export interface InterviewQuestionVO {
  messageId: number
  questionId?: number
  groupId?: number
  questionTitle?: string
  questionContent: string
  questionType?: string
  isFollowUp: boolean
  stageId: number
  stageType?: string
}

export interface InterviewCurrentVO {
  interviewId: number
  status: InterviewStatus
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
  knowledgePoints?: string
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
  evaluation: InterviewEvaluationVO
  nextAction: NextAction
  nextQuestion?: InterviewQuestionVO
  currentStage?: InterviewStageVO
  interviewStatus: InterviewStatus
  progress?: InterviewProgressVO
}

export interface FinishInterviewVO {
  interviewId: number
  status: InterviewStatus
  reportStatus: ReportStatus
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
  knowledgePoints?: string
  createdAt?: string
}

export interface InterviewDetailVO {
  interviewId: number
  interviewName?: string
  interviewMode: string
  targetPosition?: string
  experienceLevel?: string
  industryDirection?: string
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

export interface InterviewReportVO {
  reportId?: number
  interviewId: number
  reportStatus: ReportStatus
  totalScore?: number
  summary?: string
  stageReports?: StageReportVO[]
  strengths?: string
  weaknesses?: string
  suggestions?: string
  weakKnowledgePoints?: string
  projectExpressionProblems?: string
  recommendedQuestions?: Record<string, unknown>[]
  messages?: InterviewMessageVO[]
  generatedAt?: string
  failedReason?: string
}
