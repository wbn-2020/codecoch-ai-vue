import type {
  InterviewAbilityProfileUpdateVO,
  InterviewAdviceEvidenceVO,
  InterviewFollowUpTraceVO,
  InterviewKnowledgeCandidateVO,
  InterviewMessageVO,
  InterviewReportNextActionVO,
  InterviewReportVO,
  InterviewRubricScoreVO,
  RecommendedQuestionVO,
  StageReportVO
} from '@/types/interview'

export type DisplayRecommendedQuestion = RecommendedQuestionVO & { title?: string }

export interface InterviewReportSections {
  stageReports: StageReportVO[]
  recommendedQuestions: DisplayRecommendedQuestion[]
  qaMessages: InterviewMessageVO[]
  rubricScores: InterviewRubricScoreVO[]
  followUpTree: InterviewFollowUpTraceVO[]
  adviceEvidence: InterviewAdviceEvidenceVO[]
  abilityProfileUpdates: InterviewAbilityProfileUpdateVO[]
}

export const objectItems = <T>(value: unknown): T[] => {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as T[])
    : []
}

export const normalizeRecommendedQuestions = (value: unknown): DisplayRecommendedQuestion[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item }
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item as DisplayRecommendedQuestion
      }
      return null
    })
    .filter((item): item is DisplayRecommendedQuestion => Boolean(item))
}

export const normalizeInterviewReportSections = (report?: Partial<InterviewReportVO> | null): InterviewReportSections => ({
  stageReports: objectItems<StageReportVO>(report?.stageReports || report?.stageScores),
  recommendedQuestions: normalizeRecommendedQuestions(report?.recommendedQuestions),
  qaMessages: objectItems<InterviewMessageVO>(report?.questionReviews || report?.qaReview || report?.messages),
  rubricScores: objectItems<InterviewRubricScoreVO>(report?.rubricScores).map((item) => ({
    ...item,
    sampleWarning: item.sampleInsufficient
      ? item.sampleWarning || '样本不足，仅作为候选判断'
      : item.sampleWarning
  })),
  followUpTree: objectItems<InterviewFollowUpTraceVO>(report?.followUpTree).map((item) => ({
    ...item,
    followUpIntent: item.followUpIntent || 'FOLLOW_UP'
  })),
  adviceEvidence: objectItems<InterviewAdviceEvidenceVO>(report?.adviceEvidence).map((item) => ({
    ...item,
    sampleWarning: item.sampleInsufficient
      ? item.sampleWarning || '样本不足，不能作为强结论'
      : item.sampleWarning,
    evidenceSources: objectItems(item.evidenceSources)
  })),
  abilityProfileUpdates: objectItems<InterviewAbilityProfileUpdateVO>(report?.abilityProfileUpdates).map((item) => ({
    ...item,
    sampleWarning: item.sampleInsufficient
      ? item.sampleWarning || '样本不足，仅作为候选判断'
      : item.sampleWarning
  }))
})

export const rubricLabel = (dimension?: string) => {
  const map: Record<string, string> = {
    EXPRESSION_STRUCTURE: '表达结构',
    TECHNICAL_DEPTH: '技术深度',
    BUSINESS_UNDERSTANDING: '业务理解',
    RISK_AWARENESS: '风险意识',
    IMPLEMENTABILITY: '可落地性'
  }
  return map[String(dimension || '').toUpperCase()] || dimension || '评分维度'
}

export const confidenceLabel = (confidence?: string) => {
  const value = String(confidence || '').toUpperCase()
  if (value === 'HIGH') return '高置信度'
  if (value === 'MEDIUM') return '中置信度'
  if (value === 'LOW') return '低置信度'
  return confidence || '置信度待确认'
}

export const confidenceTagType = (confidence?: string) => {
  const value = String(confidence || '').toUpperCase()
  if (value === 'HIGH') return 'success'
  if (value === 'MEDIUM') return 'warning'
  if (value === 'LOW') return 'info'
  return undefined
}

const plainText = (value: unknown) => String(value || '')
  .replace(/[#>*_`~\[\]()]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const shortText = (value: unknown, fallback = '', size = 120) => {
  const text = plainText(value)
  if (!text) return fallback
  return text.length > size ? `${text.slice(0, size)}...` : text
}

const splitTextItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => plainText(item)).filter(Boolean)
  const text = plainText(value)
  if (!text) return []
  return text
    .split(/[\n;；、，,]/)
    .map((item) => item.replace(/^[-\d.\s]+/, '').trim())
    .filter(Boolean)
}

const reportIdOf = (report?: Partial<InterviewReportVO> | null) => report?.reportId || report?.id

const reportContextQuery = (report?: Partial<InterviewReportVO> | null) => {
  const params = new URLSearchParams()
  params.set('source', 'interviewReport')
  if (report?.interviewId) params.set('interviewId', String(report.interviewId))
  const reportId = reportIdOf(report)
  if (reportId) params.set('reportId', String(reportId))
  if (report?.targetJobId) params.set('targetJobId', String(report.targetJobId))
  if (report?.skillProfileId) params.set('skillProfileId', String(report.skillProfileId))
  if (report?.matchReportId) params.set('matchReportId', String(report.matchReportId))
  return params.toString()
}

const withQuery = (path: string, report?: Partial<InterviewReportVO> | null, extra?: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams(reportContextQuery(report))
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

const action = (
  report: Partial<InterviewReportVO> | null | undefined,
  input: Omit<InterviewReportNextActionVO, 'actionSource' | 'relatedBizType' | 'relatedBizId'> & {
    relatedBizType?: string
    relatedBizId?: number
  }
): InterviewReportNextActionVO => ({
  actionSource: 'REPORT_ADAPTER',
  relatedBizType: input.relatedBizType || 'INTERVIEW_REPORT',
  relatedBizId: input.relatedBizId || reportIdOf(report),
  ...input
})

export const buildInterviewReportKnowledgeCandidates = (
  report?: Partial<InterviewReportVO> | null
): InterviewKnowledgeCandidateVO[] => {
  const sections = normalizeInterviewReportSections(report)
  const candidates: InterviewKnowledgeCandidateVO[] = []
  const boundary = '候选资产，仅用于人工确认；不会自动入库，也不会写入长期记忆。'
  const push = (candidate: Omit<InterviewKnowledgeCandidateVO, 'id' | 'boundary' | 'candidateOnly' | 'actionUrl'> & { actionUrl?: string }) => {
    if (!candidate.title) return
    const id = `${candidate.sourceField}:${plainText(candidate.title).slice(0, 48)}`
    if (candidates.some((item) => item.id === id)) return
    candidates.push({
      id,
      boundary,
      candidateOnly: true,
      actionUrl: candidate.actionUrl || withQuery('/knowledge', report, { candidate: candidate.sourceField }),
      ...candidate
    })
  }

  splitTextItems(report?.weakPoints || report?.weakKnowledgePoints).slice(0, 4).forEach((item) => {
    push({
      title: item,
      content: '来自薄弱知识点，建议先复练或补充笔记后再确认是否入库。',
      sourceField: 'weakPoints',
      evidence: shortText(report?.mainProblems || report?.weaknesses, '报告标记为薄弱点'),
      confidence: report?.trustStatus || (report?.fallback ? 'LOW' : 'MEDIUM')
    })
  })

  sections.rubricScores
    .filter((item) => Number(item.score || 0) > 0 && Number(item.score || 0) < 70)
    .slice(0, 3)
    .forEach((item) => {
      push({
        title: rubricLabel(item.dimension),
        content: item.improvementSuggestion || item.comment,
        sourceField: 'rubricScores',
        evidence: item.evidenceSummary || item.comment,
        confidence: item.sampleInsufficient ? 'LOW' : 'MEDIUM'
      })
    })

  sections.adviceEvidence.slice(0, 3).forEach((item) => {
    push({
      title: item.title || shortText(item.content, '建议候选'),
      content: item.content,
      sourceField: 'adviceEvidence',
      evidence: item.evidenceSources?.map((source) => source.sourceSummary).filter(Boolean).join('；') || item.content,
      confidence: item.sampleInsufficient ? 'LOW' : item.confidence
    })
  })

  sections.abilityProfileUpdates.slice(0, 3).forEach((item) => {
    push({
      title: item.skillCode || '能力画像候选更新',
      content: item.candidateStatus,
      sourceField: 'abilityProfileUpdates',
      evidence: item.evidenceSummary,
      confidence: item.sampleInsufficient ? 'LOW' : item.confidence
    })
  })

  return candidates.slice(0, 8)
}

export const buildInterviewReportNextActions = (
  report?: Partial<InterviewReportVO> | null
): InterviewReportNextActionVO[] => {
  const sections = normalizeInterviewReportSections(report)
  const reportId = reportIdOf(report)
  const actions: InterviewReportNextActionVO[] = []
  const hasQuestions = sections.recommendedQuestions.length > 0
  const hasProblems = Boolean(report?.mainProblems || report?.weaknesses || report?.weakPoints || report?.weakKnowledgePoints)
  const hasProjectProblems = Boolean(report?.projectProblems || report?.projectExpressionProblems || report?.resumeSuggestions || report?.resumeAdvice)
  const lowRubric = sections.rubricScores.find((item) => Number(item.score || 0) > 0 && Number(item.score || 0) < 70)
  const followUpRisk = sections.followUpTree.find((item) => item.exposedRisk || item.followUpReason)
  const knowledgeCandidates = buildInterviewReportKnowledgeCandidates(report)
  const evidenceFallback = report?.evidenceSummary || report?.summary || report?.reportContent || '报告未返回明确证据摘要，页面仅给出低置信兜底入口。'

  if (hasQuestions || hasProblems || lowRubric) {
    actions.push(action(report, {
      actionType: 'QUESTION_PRACTICE',
      title: hasQuestions ? '复练报告推荐题' : '复练薄弱维度',
      description: hasQuestions
        ? '把推荐题带入下一轮专项训练，验证薄弱知识点是否稳定。'
        : '报告没有可跳转题目，先用薄弱维度进入专项训练。',
      priority: 1,
      actionUrl: withQuery('/questions/practice', report, {
        mode: hasQuestions ? 'recommended' : 'category',
        sourceField: hasQuestions ? 'recommendedQuestions' : lowRubric ? 'rubricScores' : 'weakPoints'
      }),
      evidence: shortText(lowRubric?.evidenceSummary || report?.mainProblems || report?.weaknesses || report?.weakPoints, evidenceFallback),
      confidenceBoundary: lowRubric?.sampleInsufficient ? lowRubric.sampleWarning : '来自报告短板、评分维度或推荐题；训练结果需回到下一轮面试验证。',
      fallbackReason: hasQuestions ? '' : '报告未提供可跳转推荐题，使用薄弱维度兜底。',
      sourceFields: ['weakPoints', 'mainProblems', 'rubricScores', 'recommendedQuestions']
    }))
  }

  if (hasProjectProblems) {
    actions.push(action(report, {
      actionType: 'PROJECT_EVIDENCE',
      title: '补项目证据链',
      description: '把项目背景、职责、指标、取舍和复盘补成可复用回答。',
      priority: 2,
      actionUrl: withQuery('/project-evidence', report, { sourceField: 'projectProblems' }),
      evidence: shortText(report?.projectProblems || report?.projectExpressionProblems || report?.resumeSuggestions || report?.resumeAdvice, evidenceFallback),
      confidenceBoundary: '只创建补证据入口，不自动改简历、不自动生成项目事实。',
      sourceFields: ['projectProblems', 'projectExpressionProblems', 'resumeSuggestions', 'resumeAdvice']
    }))
  }

  if (knowledgeCandidates.length) {
    actions.push(action(report, {
      actionType: 'KNOWLEDGE_CANDIDATE',
      title: `确认 ${knowledgeCandidates.length} 个知识候选`,
      description: '先人工确认候选知识点，再决定是否整理到个人知识库。',
      priority: 3,
      actionUrl: withQuery('/knowledge', report, { candidate: 'interviewReport' }),
      evidence: knowledgeCandidates.slice(0, 3).map((item) => item.title).join('；'),
      confidenceBoundary: '候选资产不自动入库，不写入长期记忆；需用户确认。',
      candidateOnly: true,
      sourceFields: ['weakPoints', 'rubricScores', 'adviceEvidence', 'abilityProfileUpdates']
    }))
  }

  if (report?.targetJobId || report?.matchReportId || report?.targetJobTitle) {
    actions.push(action(report, {
      actionType: 'JOB_FOLLOW_UP',
      title: '跟进投递与岗位差距',
      description: '把本次面试暴露的问题带回目标岗位、投递记录或 JD 差距跟进。',
      priority: 4,
      actionUrl: withQuery('/applications', report, { sourceField: 'targetJob' }),
      evidence: shortText(report?.jdEvidenceSummary || followUpRisk?.exposedRisk || evidenceFallback),
      confidenceBoundary: '仅预留跟进入口，不自动创建投递事件。',
      sourceFields: ['targetJobId', 'matchReportId', 'jdEvidenceSummary', 'followUpTree']
    }))
  }

  actions.push(action(report, {
    actionType: 'REVIEW_EXPERIMENT',
    title: followUpRisk ? '复盘追问暴露风险' : '复盘本轮训练实验',
    description: '把本轮报告沉淀为下一次训练或求职实验的假设。',
    priority: actions.length + 1,
    actionUrl: withQuery('/job-experiments', report, { sourceField: followUpRisk ? 'followUpTree' : 'reportSummary' }),
    evidence: shortText(followUpRisk?.exposedRisk || followUpRisk?.followUpReason || report?.summary || evidenceFallback),
    confidenceBoundary: followUpRisk?.exposedRisk
      ? '来自追问树暴露风险，仍需结合真实投递结果验证。'
      : '报告证据不足时只生成复盘入口，不生成强结论。',
    fallbackReason: followUpRisk ? '' : '未发现追问树风险，使用报告摘要兜底。',
    sourceFields: ['followUpTree', 'summary', 'evidenceSummary']
  }))

  return actions
    .sort((left, right) => (left.priority || 0) - (right.priority || 0))
    .slice(0, 5)
}
