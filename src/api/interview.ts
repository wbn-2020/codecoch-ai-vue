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
    messageId: question.messageId || question.questionId || 0,
    groupId: question.groupId || question.questionGroupId,
    questionTitle: question.questionTitle || '当前问题',
    questionContent: question.questionContent || question.questionText || '',
    isFollowUp: Boolean(question.isFollowUp),
    stageId: question.stageId || 0
  }
}

const normalizeCurrent = (current: any): InterviewCurrentVO => ({
  ...current,
  interviewId: current.interviewId || current.id,
  currentStage: current.currentStage ? normalizeStage(current.currentStage) : undefined,
  currentQuestion: normalizeQuestion(current.currentQuestion)
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
  reportId: report.reportId || report.id,
  interviewId: report.interviewId || report.sessionId || interviewId,
  reportStatus: report.reportStatus || report.status,
  failedReason: report.failedReason || report.failureReason
})

const toCreatePayload = (data: InterviewCreateDTO) => ({
  mode: data.mode || data.interviewMode,
  resumeId: data.resumeId,
  title: data.title || data.interviewName,
  maxQuestionCount: data.maxQuestionCount || data.questionCount,
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
    .then((result) => ({
      ...result,
      records: (result.records || []).map(normalizeListItem)
    }))
}

export const getInterviewDetailApi = (id: number) => {
  return request.get<InterviewDetailVO, InterviewDetailVO>(`/interviews/${id}`).then(normalizeDetail)
}

export const getInterviewReportApi = (id: number) => {
  return request.get<InterviewReportVO, InterviewReportVO>(`/interviews/${id}/report`).then((result) => normalizeReport(result, id))
}
