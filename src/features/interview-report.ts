import type {
  InterviewAbilityProfileUpdateVO,
  InterviewAdviceEvidenceVO,
  InterviewFollowUpTraceVO,
  InterviewMessageVO,
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
