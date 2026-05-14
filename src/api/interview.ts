import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  FinishInterviewVO,
  InterviewAnswerDTO,
  InterviewAnswerResultVO,
  InterviewCreateDTO,
  InterviewCurrentVO,
  InterviewDetailVO,
  InterviewListVO,
  InterviewQueryDTO,
  InterviewReportVO,
  InterviewSessionVO,
  RetryReportVO
} from '@/types/interview'
import { normalizePageResult } from '@/utils/page'

const normalizeStage = (stage: any = {}) => ({
  ...stage,
  stageId: stage.stageId || stage.id || 0,
  stageName: stage.stageName || stage.stageType || '当前阶段',
  stageOrder: stage.stageOrder || stage.sort || 0,
  expectedQuestionCount: stage.expectedQuestionCount || 0,
  actualQuestionCount: stage.actualQuestionCount || 0
})

const normalizeQuestion = (question: any) => {
  if (!question) return undefined
  return {
    ...question,
    sessionId: question.sessionId || question.interviewId,
    messageId: question.messageId || question.questionId || 0,
    questionGroupId: question.questionGroupId || question.groupId,
    questionTitle: question.questionTitle || '当前问题',
    questionContent: question.questionContent || question.questionText || question.content || '',
    isFollowUp: Boolean(question.isFollowUp),
    parentMessageId: question.parentMessageId,
    followUpCount: question.followUpCount || 0,
    stageProgress: question.stageProgress,
    interviewStatus: question.interviewStatus || question.status,
    stageId: question.stageId || 0,
    stageName: question.stageName
  }
}

const normalizeCurrent = (current: any): InterviewCurrentVO => ({
  ...current,
  interviewId: current.interviewId || current.id,
  sessionId: current.sessionId || current.interviewId || current.id,
  status: current.interviewStatus || current.status,
  interviewStatus: current.interviewStatus || current.status,
  currentStage: current.currentStage ? normalizeStage(current.currentStage) : undefined,
  currentQuestion: normalizeQuestion(current.currentQuestion || current.question)
})

const normalizeSession = (session: any): InterviewSessionVO => ({
  ...session,
  interviewId: session.interviewId || session.id,
  interviewName: session.interviewName || session.title,
  interviewMode: session.interviewMode || session.mode,
  stageList: (session.stageList || session.stages || []).map(normalizeStage)
})

const normalizeAnswerResult = (result: any, interviewId: number): InterviewAnswerResultVO => ({
  ...result,
  interviewId: result.interviewId || result.id || interviewId,
  answerMessageId: result.answerMessageId || 0,
  evaluation: result.evaluation || {
    score: result.score || 0,
    comment: result.comment || ''
  },
  nextQuestion: normalizeQuestion(result.nextQuestion),
  currentStage: result.currentStage ? normalizeStage(result.currentStage) : undefined,
  interviewStatus: result.interviewStatus || 'IN_PROGRESS'
})

const parseArrayValue = <T>(value: T[] | string | undefined | null): T[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeFinish = (result: any, interviewId: number): FinishInterviewVO => ({
  ...result,
  interviewId: result.interviewId || result.id || interviewId,
  reportId: result.reportId || result.report?.id,
  message: result.message || '面试已结束'
})

const normalizeListItem = (item: any): InterviewListVO => ({
  ...item,
  interviewId: item.interviewId || item.id,
  interviewName: item.interviewName || item.title,
  interviewMode: item.interviewMode || item.mode,
  questionCount: item.questionCount || item.answeredQuestionCount,
  startedAt: item.startedAt || item.startTime,
  finishedAt: item.finishedAt || item.endTime,
  createdAt: item.createdAt || item.updatedAt
})

const normalizeDetail = (detail: any): InterviewDetailVO => ({
  ...detail,
  interviewId: detail.interviewId || detail.id,
  interviewName: detail.interviewName || detail.title,
  interviewMode: detail.interviewMode || detail.mode,
  stages: (detail.stages || []).map(normalizeStage),
  messages: (detail.messages || []).map((message: any) => ({
    ...message,
    messageId: message.messageId || message.id,
    questionContent: message.questionContent || message.content,
    aiComment: message.aiComment || message.comment,
    isFollowUp: Boolean(message.isFollowUp)
  }))
})

const normalizeReport = (report: any, interviewId: number): InterviewReportVO => ({
  ...report,
  id: report.id || report.reportId,
  reportId: report.reportId || report.id,
  interviewId: report.interviewId || report.sessionId || interviewId,
  sessionId: report.sessionId || report.interviewId || interviewId,
  reportStatus: report.reportStatus || report.status,
  stageReports: parseArrayValue(report.stageReports || report.stageScores),
  stageScores: parseArrayValue(report.stageScores || report.stageReports),
  weakPoints: report.weakPoints || report.weakKnowledgePoints,
  strengths: report.strengths,
  mainProblems: report.mainProblems || report.weaknesses,
  weaknesses: report.weaknesses || report.mainProblems,
  reviewSuggestions: report.reviewSuggestions || report.suggestions,
  suggestions: report.suggestions || report.reviewSuggestions,
  projectProblems: report.projectProblems || report.projectExpressionProblems,
  projectExpressionProblems: report.projectExpressionProblems || report.projectProblems,
  questionReviews: parseArrayValue(report.questionReviews || report.qaReview || report.messages),
  qaReview: parseArrayValue(report.qaReview || report.questionReviews || report.messages),
  messages: parseArrayValue(report.messages || report.qaReview || report.questionReviews),
  summary: report.summary || report.reportContent,
  reportContent: report.reportContent || report.summary,
  failedReason: report.failedReason || report.failureReason
})

const toCreatePayload = (data: InterviewCreateDTO) => ({
  interviewMode: data.interviewMode,
  resumeId: data.resumeId,
  interviewName: data.interviewName,
  questionCount: data.questionCount,
  targetPosition: data.targetPosition,
  experienceLevel: data.experienceLevel,
  industryDirection: data.industryDirection,
  difficulty: data.difficulty,
  interviewerStyle: data.interviewerStyle,
  basedOnResume: data.basedOnResume ?? Boolean(data.resumeId)
})

export const createInterviewApi = (data: InterviewCreateDTO) => {
  return request
    .post<InterviewSessionVO, InterviewSessionVO>('/interviews', toCreatePayload(data))
    .then(normalizeSession)
}

export const startInterviewApi = (id: number) => {
  return request
    .post<InterviewCurrentVO, InterviewCurrentVO>(`/interviews/${id}/start`)
    .then(normalizeCurrent)
}

export const getCurrentInterviewQuestionApi = (id: number) => {
  return request.get<InterviewCurrentVO, InterviewCurrentVO>(`/interviews/${id}/current`).then(normalizeCurrent)
}

export const submitInterviewAnswerApi = (id: number, data: InterviewAnswerDTO) => {
  return request.post<InterviewAnswerResultVO, InterviewAnswerResultVO>(
    `/interviews/${id}/answer`,
    { answerContent: data.answerContent }
  ).then((result) => normalizeAnswerResult(result, id))
}

export const finishInterviewApi = (id: number) => {
  return request
    .post<FinishInterviewVO, FinishInterviewVO>(`/interviews/${id}/finish`)
    .then((result) => normalizeFinish(result, id))
}

export const retryInterviewReportApi = (id: number) => {
  return request
    .post<RetryReportVO, RetryReportVO>(`/interviews/${id}/report/retry`)
    .then((result: any) => normalizeFinish(result, id) as RetryReportVO)
}

export const getInterviewsApi = (params?: InterviewQueryDTO) => {
  return request
    .get<PageResult<InterviewListVO>, PageResult<InterviewListVO>>('/interviews', {
      params
    })
    .then((result) => normalizePageResult(result, params, normalizeListItem))
}

export const getInterviewDetailApi = (id: number) => {
  return request.get<InterviewDetailVO, InterviewDetailVO>(`/interviews/${id}`).then(normalizeDetail)
}

export const getInterviewReportApi = (id: number) => {
  return request.get<InterviewReportVO, InterviewReportVO>(`/interviews/${id}/report`).then((result) => normalizeReport(result, id))
}
