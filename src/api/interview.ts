import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import { buildInterviewReportNextActions } from '@/features/interview-report'
import { normalizeVoiceDeliverySummary } from '@/features/interview-voice-product'
import type {
  FinishInterviewVO,
  IndustryTemplateVO,
  InterviewAnswerDTO,
  InterviewAnswerReviewSseEvent,
  InterviewAnswerReviewSseEventType,
  InterviewAnswerResultVO,
  InterviewCreateByJobTargetDTO,
  InterviewCreateDTO,
  InterviewCurrentVO,
  InterviewDetailVO,
  InterviewListVO,
  InterviewQueryDTO,
  InterviewQuestionSseEvent,
  InterviewQuestionSseEventType,
  InterviewReportSseEvent,
  InterviewReportSseEventType,
  InterviewReportSseParams,
  InterviewReportNextActionVO,
  InterviewReportVO,
  InterviewSessionVO,
  InterviewTranscriptConfirmDTO,
  InterviewTranscriptVO,
  InterviewVoiceSubmissionCreateDTO,
  InterviewVoiceDiscardReason,
  InterviewVoiceSubmissionVO,
  InterviewVoiceUploadVO,
  RetryReportVO
} from '@/types/interview'
import { normalizePageResult } from '@/utils/page'
import { buildSseUrl, streamSse } from '@/utils/sse'

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
  interviewId: session.interviewId || session.id || session.sessionId,
  interviewName: session.interviewName || session.title,
  interviewMode: session.interviewMode || session.mode,
  stageList: (session.stageList || session.stages || []).map(normalizeStage)
})

const normalizeAnswerResult = (result: any, interviewId: number): InterviewAnswerResultVO => {
  const knowledgePoints = normalizeKnowledgePoints(result.knowledgePoints || result.evaluation?.knowledgePoints)
  const followUpQuestion = result.followUpQuestion || result.nextQuestion?.questionContent || ''
  const toOptionalScore = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined
    const scoreValue = Number(value)
    return Number.isFinite(scoreValue) ? scoreValue : undefined
  }
  const resultScore = toOptionalScore(result.score)
  const evaluationScore = toOptionalScore(result.evaluation?.score)
  const score = resultScore ?? evaluationScore
  const evaluation = result.evaluation || {
    score,
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
    score,
    comment: result.comment || evaluation.comment || '',
    evaluation: {
      ...evaluation,
      score,
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

const pickValue = (source: any, keys: string[]) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
      return source[key]
    }
  }
  return undefined
}

const normalizeOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const normalizeTextArray = (value: unknown): string[] => {
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

const normalizeMissingSkills = (value: unknown) =>
  parseArrayValue<any>(value as any)
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const skillName = String(pickValue(item, ['skillName', 'skill_name', 'name']) || '').trim()
      if (!skillName) return null
      return {
        id: normalizeOptionalNumber(pickValue(item, ['id', 'gapItemId', 'gap_item_id'])),
        skillName,
        severity: String(pickValue(item, ['severity', 'gapSeverity', 'gap_severity']) || ''),
        gapDescription: String(pickValue(item, ['gapDescription', 'gap_description', 'description']) || ''),
        recommendedActions: normalizeTextArray(pickValue(item, ['recommendedActions', 'recommended_actions', 'recommendedActionsJson', 'recommended_actions_json'])),
        priority: normalizeOptionalNumber(pickValue(item, ['priority', 'rank'])),
        sourceType: String(pickValue(item, ['sourceType', 'source_type']) || ''),
        sourceBizId: normalizeOptionalNumber(pickValue(item, ['sourceBizId', 'source_biz_id']))
      }
    })
    .filter(Boolean)

const normalizeRecommendedQuestions = (value: any): Array<Record<string, any> | string> => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return item
      return null
    })
    .filter(Boolean) as Array<Record<string, any> | string>
}

const isSuccessfulReportStatus = (status?: unknown) =>
  ['GENERATED', 'SUCCESS', 'COMPLETED'].includes(String(status || '').toUpperCase())

const normalizeNextActions = (
  source: any,
  reportId?: number,
  interviewId?: number,
  reportStatus?: unknown
): InterviewReportNextActionVO[] => {
  if (!isSuccessfulReportStatus(reportStatus)) return []

  const actions = Array.isArray(source?.nextActions) ? source.nextActions : []
  const normalized = actions
    .map((item: any, index: number) => {
      if (!item || typeof item !== 'object') return null
      return {
        actionType: String(item.actionType || ''),
        title: String(item.title || ''),
        description: String(item.description || ''),
        priority: Number(item.priority || index + 1),
        actionUrl: String(item.actionUrl || ''),
        actionSource: String(item.actionSource || 'BACKEND'),
        relatedBizType: String(item.relatedBizType || ''),
        relatedBizId: item.relatedBizId !== undefined && item.relatedBizId !== null ? Number(item.relatedBizId) : undefined,
        evidence: String(item.evidence || '')
      } as InterviewReportNextActionVO
    })
    .filter((item: InterviewReportNextActionVO | null): item is InterviewReportNextActionVO =>
      Boolean(item?.actionType && item.title)
    )
    .sort((left: InterviewReportNextActionVO, right: InterviewReportNextActionVO) =>
      (left.priority || 0) - (right.priority || 0)
    )

  if (normalized.length) return normalized

  return buildInterviewReportNextActions({
    ...source,
    id: source.id || reportId,
    reportId: source.reportId || reportId,
    interviewId: source.interviewId || source.sessionId || interviewId,
    reportStatus
  })
}

const normalizeFinish = (result: any, interviewId: number): FinishInterviewVO => ({
  ...result,
  interviewId: result.interviewId || result.id || interviewId,
  reportId: result.reportId || result.report?.id,
  message: result.message || '面试已结束',
  asyncMessageId: result.asyncMessageId || result.messageId || result.report?.asyncMessageId,
  asyncTraceId: result.asyncTraceId || result.traceId || result.report?.asyncTraceId,
  asyncBizType: result.asyncBizType || result.bizType || result.report?.asyncBizType,
  asyncBizId: result.asyncBizId || result.bizId || result.report?.asyncBizId,
  asyncSendStatus: result.asyncSendStatus || result.sendStatus || result.report?.asyncSendStatus
})

const normalizeAsyncFinish = (result: any, interviewId: number): FinishInterviewVO => ({
  ...result,
  interviewId: result.interviewId || result.id || result.sessionId || interviewId,
  status: result.status || result.interviewStatus || 'REPORT_GENERATING',
  reportStatus: result.reportStatus || result.report?.status || result.report?.reportStatus || 'GENERATING',
  reportId: result.reportId || result.report?.id,
  message: result.message || '面试已结束，报告正在生成',
  asyncMessageId: result.asyncMessageId || result.messageId || result.report?.asyncMessageId,
  asyncTraceId: result.asyncTraceId || result.traceId || result.report?.asyncTraceId,
  asyncBizType: result.asyncBizType || result.bizType || result.report?.asyncBizType,
  asyncBizId: result.asyncBizId || result.bizId || result.report?.asyncBizId,
  asyncSendStatus: result.asyncSendStatus || result.sendStatus || result.report?.asyncSendStatus
})

const normalizeListItem = (item: any): InterviewListVO => ({
  ...item,
  interviewId: item.interviewId || item.id,
  interviewName: item.interviewName || item.title,
  interviewMode: item.interviewMode || item.mode,
  questionCount: item.questionCount || item.answeredQuestionCount,
  startedAt: item.startedAt || item.startTime,
  finishedAt: item.finishedAt || item.endTime,
  createdAt: item.createdAt || item.updatedAt,
  voiceDeliverySummary: normalizeVoiceDeliverySummary(
    item.voiceDeliverySummary || item.voice_delivery_summary,
    item.interviewId || item.id
  )
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
  const reportId = source.id || source.reportId
  const sourceInterviewId = source.interviewId || source.sessionId || interviewId
  const reportStatus = status || (hasReportContent ? 'GENERATED' : 'NOT_GENERATED')

  return {
    ...source,
    id: reportId,
    reportId,
    interviewId: sourceInterviewId,
    sessionId: source.sessionId || source.interviewId || interviewId,
    targetJobId: normalizeOptionalNumber(pickValue(source, ['targetJobId', 'target_job_id'])),
    skillProfileId: normalizeOptionalNumber(pickValue(source, ['skillProfileId', 'skill_profile_id'])),
    matchReportId: normalizeOptionalNumber(pickValue(source, ['matchReportId', 'match_report_id'])),
    targetJobTitle: String(pickValue(source, ['targetJobTitle', 'target_job_title', 'jobTitle', 'job_title']) || ''),
    targetCompanyName: String(pickValue(source, ['targetCompanyName', 'target_company_name', 'companyName', 'company_name']) || ''),
    jdEvidenceSummary: String(pickValue(source, ['jdEvidenceSummary', 'jd_evidence_summary']) || ''),
    missingSkills: normalizeMissingSkills(pickValue(source, ['missingSkills', 'missing_skills'])),
    status,
    reportStatus,
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
    rubricScores: parseArrayValue(source.rubricScores || source.rubric || source.dimensionScores),
    followUpTree: parseArrayValue(source.followUpTree || source.followUpTrace || source.followUps),
    adviceEvidence: parseArrayValue(source.adviceEvidence || source.adviceItems || source.recommendations),
    abilityProfileUpdates: parseArrayValue(source.abilityProfileUpdates || source.abilityUpdates),
    messages: parseArrayValue(source.messages || source.qaReview || source.questionReviews),
    recommendedQuestions: normalizeRecommendedQuestions(source.recommendedQuestions),
    nextActions: normalizeNextActions(source, reportId, sourceInterviewId, reportStatus),
    summary: source.summary || source.reportContent || '',
    reportContent: source.reportContent || source.summary || '',
    generatedAt: source.generatedAt || source.createdAt,
    failedReason: source.failedReason || source.failureReason || source.errorMessage || '',
    asyncMessageId: source.asyncMessageId || source.messageId,
    asyncTraceId: source.asyncTraceId || source.traceId,
    asyncBizType: source.asyncBizType || source.bizType,
    asyncBizId: source.asyncBizId || source.bizId,
    asyncSendStatus: source.asyncSendStatus || source.sendStatus,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    trustStatus: source.trustStatus,
    evidenceSummary: source.evidenceSummary,
    fallback: source.fallback
    ,
    voiceDeliverySummary: normalizeVoiceDeliverySummary(
      source.voiceDeliverySummary || source.voice_delivery_summary,
      sourceInterviewId
    )
  }
}

const toCreatePayload = (data: InterviewCreateDTO | InterviewCreateByJobTargetDTO) => ({
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
  practiceMode: data.practiceMode,
  recommendationSource: data.recommendationSource,
  recommendationReason: data.recommendationReason,
  applicationId: data.applicationId,
  applicationPackageId: data.applicationPackageId,
  targetJobId: data.targetJobId,
  jdAnalysisId: data.jdAnalysisId,
  resumeVersionId: data.resumeVersionId,
  matchReportId: data.matchReportId,
  basedOnResume: data.basedOnResume ?? Boolean(data.resumeId),
  trainingScene: data.trainingScene,
  targetSkillDomain: data.targetSkillDomain,
  targetSkillCodes: data.targetSkillCodes,
  targetLevel: data.targetLevel,
  projectEvidenceIds: data.projectEvidenceIds,
  followUpIntensity: data.followUpIntensity,
  ...('skillProfileId' in data ? {
    skillProfileId: data.skillProfileId
  } : {})
})

const toInterviewReportSseQuery = (params: InterviewReportSseParams) => ({
  interviewId: String(params.interviewId),
  reportId: params.reportId ? String(params.reportId) : '',
  forceRegenerate: params.forceRegenerate ? 'true' : 'false'
})

const toAnswerPayload = (data: InterviewAnswerDTO) => ({
  messageId: data.messageId,
  questionId: data.questionId,
  answerContent: data.answerContent,
  answerDurationSeconds: data.answerDurationSeconds,
  clientSubmitTime: data.clientSubmitTime,
  voiceSubmissionId: data.voiceSubmissionId,
  transcriptId: data.transcriptId,
  transcriptConfidence: data.transcriptConfidence,
  answerSource: data.answerSource
})

export const streamInterviewReportApi = (
  params: InterviewReportSseParams,
  handlers: {
    onEvent?: (event: InterviewReportSseEventType | string, data?: InterviewReportSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<InterviewReportSseEvent>({
    url: buildSseUrl('/ai/sse/interview-report', toInterviewReportSseQuery(params)),
    signal,
    handlers
  })
}

export const streamInterviewAnswerReviewApi = (
  interviewId: number,
  data: InterviewAnswerDTO,
  handlers: {
    onEvent?: (event: InterviewAnswerReviewSseEventType | string, data?: InterviewAnswerReviewSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<InterviewAnswerReviewSseEvent>({
    url: buildSseUrl('/ai/sse/interview-answer-review', { interviewId: String(interviewId) }),
    method: 'POST',
    body: toAnswerPayload(data),
    signal,
    handlers
  })
}

export const streamInterviewQuestionApi = (
  sessionId: number,
  handlers: {
    onEvent?: (event: InterviewQuestionSseEventType | string, data?: InterviewQuestionSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<InterviewQuestionSseEvent>({
    url: buildSseUrl('/ai/sse/interview-question', { sessionId: String(sessionId) }),
    signal,
    handlers
  })
}

export const createInterviewApi = (data: InterviewCreateDTO) => {
  return request
    .post<InterviewSessionVO, InterviewSessionVO>('/interviews', toCreatePayload(data))
    .then(normalizeSession)
}

export const createInterviewByJobTargetApi = (data: InterviewCreateByJobTargetDTO) => {
  return request
    .post<InterviewSessionVO, InterviewSessionVO>('/interviews/create-by-job-target', toCreatePayload(data))
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
    toAnswerPayload(data)
  ).then((result) => normalizeAnswerResult(result, id))
}

export interface InterviewVoiceRequestOptions {
  signal?: AbortSignal
  silentError?: boolean
}

export const uploadInterviewVoiceAudioApi = (
  file: Blob | File,
  options?: InterviewVoiceRequestOptions
) => {
  const formData = new FormData()
  const filename = file instanceof File ? file.name : `interview-voice-${Date.now()}.webm`
  formData.append('file', file, filename)
  return request.post<InterviewVoiceUploadVO, InterviewVoiceUploadVO>('/files/upload', formData, {
    params: { bizType: 'INTERVIEW_VOICE' },
    signal: options?.signal,
    silentError: options?.silentError
  })
}

export const createInterviewVoiceSubmissionApi = (
  id: number,
  data: InterviewVoiceSubmissionCreateDTO,
  options?: InterviewVoiceRequestOptions
) => {
  return request.post<InterviewVoiceSubmissionVO, InterviewVoiceSubmissionVO>(
    `/interviews/${id}/voice/submissions`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )
}

export const transcribeInterviewVoiceSubmissionApi = (
  id: number,
  submissionId: number,
  options?: InterviewVoiceRequestOptions
) => {
  return request.post<InterviewVoiceSubmissionVO, InterviewVoiceSubmissionVO>(
    `/interviews/${id}/voice/submissions/${submissionId}/transcribe`,
    undefined,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )
}

export const getInterviewVoiceSubmissionApi = (id: number, submissionId: number) => {
  return request.get<InterviewVoiceSubmissionVO, InterviewVoiceSubmissionVO>(
    `/interviews/${id}/voice/submissions/${submissionId}`
  )
}

export const confirmInterviewVoiceTranscriptApi = (
  id: number,
  transcriptId: number,
  data: InterviewTranscriptConfirmDTO,
  options?: InterviewVoiceRequestOptions
) => {
  return request.post<InterviewTranscriptVO, InterviewTranscriptVO>(
    `/interviews/${id}/voice/transcripts/${transcriptId}/confirm`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )
}

export const discardInterviewVoiceSubmissionApi = (
  id: number,
  submissionId: number,
  reason: InterviewVoiceDiscardReason,
  options?: InterviewVoiceRequestOptions
) => {
  return request.post<void, void>(
    `/interviews/${id}/voice/submissions/${submissionId}/discard`,
    { reason },
    { silentError: options?.silentError }
  )
}

export const deleteInterviewVoiceAudioApi = (
  fileId: number,
  options?: InterviewVoiceRequestOptions
) => {
  return request.delete<void, void>(`/files/${fileId}`, {
    params: { bizType: 'INTERVIEW_VOICE' },
    signal: options?.signal,
    silentError: options?.silentError
  })
}

export const submitInterviewVoiceTranscriptAnswerApi = (id: number, transcriptId: number) => {
  return request.post<InterviewAnswerResultVO, InterviewAnswerResultVO>(
    `/interviews/${id}/voice/transcripts/${transcriptId}/submit-answer`
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

export type InterviewReportExportFormat = 'markdown' | 'json'

export const exportInterviewReportApi = (id: number, format: InterviewReportExportFormat) => {
  const suffix = format === 'json' ? '/json' : ''
  return request.get<Blob, Blob>(`/interviews/${id}/report/export${suffix}`, {
    responseType: 'blob'
  })
}
