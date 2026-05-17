import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  FinishInterviewVO,
  IndustryTemplateVO,
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

const normalizeKnowledgePoints = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // split plain text below
  }
  return trimmed
    .split(/[,\n;；、，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

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
    stageName: question.stageName,
    followUpReason: question.followUpReason,
    knowledgePoints: normalizeKnowledgePoints(question.knowledgePoints)
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

const normalizeAnswerResult = (result: any, interviewId: number): InterviewAnswerResultVO => {
  const knowledgePoints = normalizeKnowledgePoints(result.knowledgePoints || result.evaluation?.knowledgePoints)
  const followUpQuestion = result.followUpQuestion || result.nextQuestion?.questionContent || ''
  const evaluation = result.evaluation || {
    score: result.score || 0,
    comment: result.comment || ''
  }
  const nextQuestion =
    result.nextQuestion ||
    (followUpQuestion
      ? {
          questionTitle: '追问',
          questionContent: followUpQuestion,
          messageId: result.nextMessageId || result.answerMessageId || 0,
          isFollowUp: true,
          followUpCount: result.progress?.followUpCount || 0,
          followUpReason: result.followUpReason || evaluation.followUpReason,
          knowledgePoints,
          stageId: result.currentStage?.stageId || 0,
          stageName: result.currentStage?.stageName
        }
      : undefined)

  return {
    ...result,
    interviewId: result.interviewId || result.id || interviewId,
    answerMessageId: result.answerMessageId || 0,
    score: result.score ?? evaluation.score,
    comment: result.comment || evaluation.comment || '',
    evaluation: {
      ...evaluation,
      score: evaluation.score ?? result.score ?? 0,
      comment: evaluation.comment || result.comment || '',
      knowledgePoints,
      followUpReason: result.followUpReason || evaluation.followUpReason
    },
    nextQuestion: normalizeQuestion(nextQuestion),
    followUpQuestion,
    followUpReason: result.followUpReason || evaluation.followUpReason || '',
    followUpValid: result.followUpValid,
    knowledgePoints,
    currentStage: result.currentStage ? normalizeStage(result.currentStage) : undefined,
    interviewStatus: result.interviewStatus || 'IN_PROGRESS',
    reportStatus: result.reportStatus
  }
}

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

const normalizeAsyncFinish = (result: any, interviewId: number): FinishInterviewVO => ({
  ...result,
  interviewId: result.interviewId || result.id || result.sessionId || interviewId,
  status: result.status || result.interviewStatus || 'REPORT_GENERATING',
  reportStatus: result.reportStatus || result.report?.status || result.report?.reportStatus || 'GENERATING',
  reportId: result.reportId || result.report?.id,
  message: result.message || '面试已结束，报告正在生成'
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

const normalizeReport = (report: any, interviewId: number): InterviewReportVO => {
  const nestedReport = report?.report && typeof report.report === 'object' ? report.report : {}
  const source = { ...nestedReport, ...report }
  const status = source.reportStatus || source.status || nestedReport.status || nestedReport.reportStatus
  const hasReportContent = Boolean(source.totalScore || source.summary || source.reportContent || source.generatedAt || source.createdAt)

  return {
    ...source,
    id: source.id || source.reportId,
    reportId: source.reportId || source.id,
    interviewId: source.interviewId || source.sessionId || interviewId,
    sessionId: source.sessionId || source.interviewId || interviewId,
    status,
    reportStatus: status || (hasReportContent ? 'GENERATED' : 'NOT_GENERATED'),
    stageReports: parseArrayValue(source.stageReports || source.stageScores),
    stageScores: parseArrayValue(source.stageScores || source.stageReports),
    weakPoints: source.weakPoints || source.weakKnowledgePoints || [],
    strengths: source.strengths || '',
    mainProblems: source.mainProblems || source.weaknesses || '',
    weaknesses: source.weaknesses || source.mainProblems || '',
    reviewSuggestions: source.reviewSuggestions || source.suggestions || '',
    suggestions: source.suggestions || source.reviewSuggestions || '',
    projectProblems: source.projectProblems || source.projectExpressionProblems || '',
    projectExpressionProblems: source.projectExpressionProblems || source.projectProblems || '',
    questionReviews: parseArrayValue(source.questionReviews || source.qaReview || source.messages),
    qaReview: parseArrayValue(source.qaReview || source.questionReviews || source.messages),
    messages: parseArrayValue(source.messages || source.qaReview || source.questionReviews),
    summary: source.summary || source.reportContent || '',
    reportContent: source.reportContent || source.summary || '',
    generatedAt: source.generatedAt || source.createdAt,
    failedReason: source.failedReason || source.failureReason || source.errorMessage || ''
  }
}

const toCreatePayload = (data: InterviewCreateDTO) => ({
  interviewMode: data.interviewMode,
  resumeId: data.resumeId,
  title: data.interviewName,
  maxQuestionCount: data.questionCount,
  targetPosition: data.targetPosition,
  experienceLevel: data.experienceLevel,
  industryTemplateId: data.industryTemplateId,
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

export const getIndustryTemplatesApi = () => {
  return request.get<IndustryTemplateVO[], IndustryTemplateVO[]>('/industry-templates')
}

export const getIndustryTemplateDetailApi = (id: number) => {
  return request.get<IndustryTemplateVO, IndustryTemplateVO>(`/industry-templates/${id}`)
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
    .then((result) => normalizeAsyncFinish(result, id))
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
