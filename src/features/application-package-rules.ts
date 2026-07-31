import type { CareerActionItemVO, CareerRiskSignalVO } from '@/features/career-command-center'
import type { JobDescriptionAnalysisVO, TargetJobVO } from '@/types/jobTarget'
import type { ProjectEvidenceDetailVO, ProjectEvidenceListVO, ProjectJdCoverageVO } from '@/types/projectEvidence'
import type { ResumeJobMatchReportDetailVO, ResumeJobMatchReportListVO } from '@/types/resumeJobMatch'
import type { EvidenceSourceVO, SuggestionQualityGateVO, SuggestionTraceVO } from '@/types/suggestion'
import { isEffectiveEvidenceSource, isStrongEvidenceSource, normalizeEvidenceSources } from '@/utils/suggestionAdapter'

export type ApplicationPackageReadinessLevel =
  | 'READY'
  | 'NEEDS_RESUME'
  | 'NEEDS_EVIDENCE'
  | 'NEEDS_TRAINING'
  | 'BLOCKED'

export type ApplicationPackageChecklistStatus = 'PASS' | 'WARN' | 'BLOCKED'

export type ApplicationPackageChecklistKey =
  | 'JD_PARSED'
  | 'HAS_RESUME_VERSION'
  | 'RESUME_VERSION_EXPLAINED'
  | 'MATCH_SCORE_THRESHOLD'
  | 'CORE_SKILL_EVIDENCE'
  | 'INTERVIEW_PROJECT_EVIDENCE'
  | 'INTERVIEW_PREP_READY'
  | 'FOLLOW_UP_PLAN'

export type ApplicationPackageRemediationActionType =
  | 'UPDATE_RESUME_VERSION'
  | 'ADD_PROJECT_EVIDENCE'
  | 'PRACTICE_INTERVIEW'
  | 'CREATE_APPLICATION_RECORD'
  | 'SET_FOLLOW_UP'
  | 'REVIEW_LOW_CONFIDENCE_SOURCE'

export interface ApplicationPackageResumeVersionInput {
  resumeId?: number | null
  resumeVersionId?: number | null
  resumeVersionNo?: number | null
  resumeVersionName?: string | null
  targetJobId?: number | null
  currentFlag?: number | boolean | null
  updatedAt?: string | null
}

export interface ApplicationPackageProjectEvidenceInput extends Partial<ProjectEvidenceDetailVO>, Partial<ProjectEvidenceListVO> {
  jdCoverage?: Partial<ProjectJdCoverageVO> | null
}

export interface ApplicationPackageRuleThresholds {
  minMatchScore: number
  minProjectCoverageScore: number
  minStrongProjectEvidenceCount: number
}

export interface ApplicationPackageRuleInput {
  targetJob?: Partial<TargetJobVO> | null
  jdAnalysis?: Partial<JobDescriptionAnalysisVO> | null
  recommendedResumeVersion?: ApplicationPackageResumeVersionInput | null
  matchReport?: Partial<ResumeJobMatchReportDetailVO & ResumeJobMatchReportListVO> | null
  projectEvidences?: ApplicationPackageProjectEvidenceInput[] | null
  interviewPrepReady?: boolean | null
  followUpPlanned?: boolean | null
  evidenceSources?: EvidenceSourceVO[] | null
  trace?: SuggestionTraceVO
  thresholds?: Partial<ApplicationPackageRuleThresholds>
}

export interface ApplicationPackageChecklistItemVO {
  key: ApplicationPackageChecklistKey
  label: string
  status: ApplicationPackageChecklistStatus
  reason: string
  source?: EvidenceSourceVO
  confidenceBoundary: string
  remediationActionType?: ApplicationPackageRemediationActionType
}

export interface ApplicationPackageFieldMapping {
  packageField: string
  sourceFields: string[]
  checklistKeys: ApplicationPackageChecklistKey[]
  riskTypes: string[]
  fallbackActionTypes: ApplicationPackageRemediationActionType[]
  confidenceBoundary: string
}

export interface ApplicationPackageRuleResult {
  readinessLevel: ApplicationPackageReadinessLevel
  readinessReason: string
  checklist: ApplicationPackageChecklistItemVO[]
  riskSignals: CareerRiskSignalVO[]
  actions: CareerActionItemVO[]
  evidenceSources: EvidenceSourceVO[]
  trace?: SuggestionTraceVO
}

const DEFAULT_THRESHOLDS: ApplicationPackageRuleThresholds = {
  minMatchScore: 70,
  minProjectCoverageScore: 60,
  minStrongProjectEvidenceCount: 1
}

const normalizeCode = (value?: unknown) => String(value || '').trim().toUpperCase()
const hasText = (value?: unknown) => typeof value === 'string' && value.trim().length > 0
const coerceNumber = (value: unknown): number | undefined => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const sourceId = (value: unknown): number | string | null | undefined => {
  if (value === null) return null
  if (value === undefined || value === '') return undefined
  if (typeof value === 'number' || typeof value === 'string') return value
  return undefined
}

const isParsed = (status?: unknown) => {
  const normalized = normalizeCode(status)
  return normalized === 'PARSED' || normalized === 'SUCCESS' || normalized === 'COMPLETED'
}

const compact = <T>(items: Array<T | undefined | null>): T[] =>
  items.filter((item): item is T => item !== undefined && item !== null)

const qualityGate = (
  status: SuggestionQualityGateVO['gateStatus'],
  strength: SuggestionQualityGateVO['suggestionStrength'],
  reasons: string[],
  missingEvidenceTypes: string[] = []
): SuggestionQualityGateVO => ({
  gateStatus: status,
  suggestionStrength: strength,
  reasons,
  missingEvidenceTypes
})

const routeWithQuery = (path: string, query: Record<string, number | string | null | undefined>) => {
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return search ? `${path}?${search}` : path
}

const evidenceSource = (
  sourceType: string,
  sourceIdValue: unknown,
  sourceTitle: string,
  evidenceSummary: string,
  trustStatus: EvidenceSourceVO['trustStatus'] = 'PARTIAL',
  actionUrl?: string
): EvidenceSourceVO => ({
  sourceType,
  sourceId: sourceId(sourceIdValue),
  sourceTitle,
  title: sourceTitle,
  evidenceSummary,
  sourceSummary: evidenceSummary,
  summary: evidenceSummary,
  trustStatus,
  actionUrl
})

export const APPLICATION_PACKAGE_FIELD_MAPPINGS: ApplicationPackageFieldMapping[] = [
  {
    packageField: 'targetJobId / jdAnalysisId',
    sourceFields: ['TargetJob.id', 'TargetJob.parseStatus', 'JobDescriptionAnalysis.id', 'JobDescriptionAnalysis.parseStatus'],
    checklistKeys: ['JD_PARSED'],
    riskTypes: ['MISSING_JD_ANALYSIS'],
    fallbackActionTypes: ['REVIEW_LOW_CONFIDENCE_SOURCE'],
    confidenceBoundary: 'JD 未解析时只能生成补资料或复核动作，不能判断岗位是否值得投。'
  },
  {
    packageField: 'recommendedResumeVersionId',
    sourceFields: ['ResumeVersion.id', 'ResumeJobMatchReport.resumeVersionId'],
    checklistKeys: ['HAS_RESUME_VERSION', 'RESUME_VERSION_EXPLAINED'],
    riskTypes: ['MISSING_RESUME_VERSION', 'RESUME_VERSION_UNEXPLAINED'],
    fallbackActionTypes: ['UPDATE_RESUME_VERSION'],
    confidenceBoundary: '没有简历版本或缺少适配理由时，推荐降级为更新简历版本。'
  },
  {
    packageField: 'matchReportId / match score',
    sourceFields: ['ResumeJobMatchReport.reportId', 'overallScore', 'trustStatus', 'fallback'],
    checklistKeys: ['MATCH_SCORE_THRESHOLD'],
    riskTypes: ['LOW_MATCH_SCORE', 'UNTRUSTED_MATCH_REPORT'],
    fallbackActionTypes: ['UPDATE_RESUME_VERSION'],
    confidenceBoundary: '匹配报告失败、降级或分数低于阈值时，不能输出“可以投”的强结论。'
  },
  {
    packageField: 'projectEvidenceIds / coverage',
    sourceFields: ['ProjectEvidence.id', 'completenessStatus', 'skillEvidences', 'ProjectJdCoverageVO'],
    checklistKeys: ['CORE_SKILL_EVIDENCE', 'INTERVIEW_PROJECT_EVIDENCE'],
    riskTypes: ['MISSING_PROJECT_EVIDENCE', 'WEAK_PROJECT_EVIDENCE'],
    fallbackActionTypes: ['ADD_PROJECT_EVIDENCE'],
    confidenceBoundary: '项目证据不足时，只能提示补指标、职责、难点、取舍和结果。'
  },
  {
    packageField: 'interviewQuestionGroupId / interview prep',
    sourceFields: ['recommendedInterviewTopics', 'interviewPrepReady'],
    checklistKeys: ['INTERVIEW_PREP_READY'],
    riskTypes: ['MISSING_INTERVIEW_PREP'],
    fallbackActionTypes: ['PRACTICE_INTERVIEW'],
    confidenceBoundary: '面试准备不足时，优先生成练面试动作，暂不形成直接投递建议。'
  },
  {
    packageField: 'actions / follow up plan',
    sourceFields: ['followUpPlanned', 'JobApplication.nextFollowUpAt'],
    checklistKeys: ['FOLLOW_UP_PLAN'],
    riskTypes: ['MISSING_FOLLOW_UP_PLAN'],
    fallbackActionTypes: ['SET_FOLLOW_UP'],
    confidenceBoundary: '跟进计划缺失只影响投递后管理，不应被解释为岗位或能力结论。'
  }
]

const buildEvidenceSources = (input: ApplicationPackageRuleInput): EvidenceSourceVO[] => {
  const targetJobId = input.targetJob?.id ?? input.jdAnalysis?.targetJobId
  const matchReportId = input.matchReport?.reportId
  const projectSources = (input.projectEvidences || []).map((item) =>
    evidenceSource(
      'PROJECT_EVIDENCE',
      item.id,
      item.title || '项目证据',
      item.jdCoverage?.coverageScore !== undefined
        ? `JD 覆盖分 ${item.jdCoverage.coverageScore}`
        : item.completenessStatus
          ? `完整度状态 ${item.completenessStatus}`
          : '项目证据待复核',
      isProjectEvidenceStrong(item) ? 'VERIFIED' : 'PARTIAL',
      item.id ? `/project-evidence/${item.id}` : '/project-evidence'
    )
  )

  return normalizeEvidenceSources([
    input.evidenceSources,
    targetJobId
      ? evidenceSource(
          'TARGET_JOB',
          targetJobId,
          input.targetJob?.jobTitle || input.jdAnalysis?.jobTitle || '目标岗位',
          isParsed(input.targetJob?.parseStatus) || isParsed(input.jdAnalysis?.parseStatus)
            ? 'JD 已解析'
            : '目标岗位存在，但岗位描述处理状态待确认',
          isParsed(input.targetJob?.parseStatus) || isParsed(input.jdAnalysis?.parseStatus) ? 'VERIFIED' : 'PARTIAL',
          `/job-targets/${targetJobId}/analysis`
        )
      : undefined,
    input.jdAnalysis?.id
      ? evidenceSource(
          'JD_ANALYSIS',
          input.jdAnalysis.id,
          '岗位分析',
          input.jdAnalysis.summary || '岗位分析结果可用于投递包判断',
          isParsed(input.jdAnalysis.parseStatus) ? 'VERIFIED' : 'PARTIAL',
          targetJobId ? `/job-targets/${targetJobId}/analysis` : undefined
        )
      : undefined,
    input.recommendedResumeVersion?.resumeVersionId
      ? evidenceSource(
          'RESUME_VERSION',
          input.recommendedResumeVersion.resumeVersionId,
          input.recommendedResumeVersion.resumeVersionName || '推荐简历版本',
          input.recommendedResumeVersion.targetJobId
            ? '简历版本已绑定目标岗位或具备明确适配上下文'
            : '简历版本可用，但适配理由需要展示',
          input.recommendedResumeVersion.targetJobId ? 'VERIFIED' : 'PARTIAL',
          input.recommendedResumeVersion.resumeId
            ? `/resumes/${input.recommendedResumeVersion.resumeId}/versions?versionId=${input.recommendedResumeVersion.resumeVersionId}`
            : `/resume-versions?versionId=${input.recommendedResumeVersion.resumeVersionId}`
        )
      : undefined,
    matchReportId
      ? evidenceSource(
          'RESUME_MATCH',
          matchReportId,
          '简历匹配报告',
          input.matchReport?.overallScore !== undefined
            ? `综合匹配分 ${input.matchReport.overallScore}`
            : input.matchReport?.summary || '匹配报告可用于 readiness 判断',
          input.matchReport?.trustStatus === 'VERIFIED' && !input.matchReport?.fallback ? 'VERIFIED' : 'PARTIAL',
          `/resume-match/${matchReportId}`
        )
      : undefined,
    ...projectSources
  ])
}

const hasRecommendedInterviewTopics = (matchReport?: Partial<ResumeJobMatchReportDetailVO & ResumeJobMatchReportListVO> | null) => {
  const topics = matchReport?.recommendedInterviewTopics
  if (Array.isArray(topics)) return topics.length > 0
  return hasText(topics)
}

const hasSkillEvidence = (item: ApplicationPackageProjectEvidenceInput) =>
  Number(item.skillEvidenceCount || 0) > 0 || Boolean(item.skillEvidences?.length)

const isProjectEvidenceStrong = (item: ApplicationPackageProjectEvidenceInput) => {
  const coverage = coerceNumber(item.jdCoverage?.coverageScore)
  if (coverage !== undefined && coverage >= DEFAULT_THRESHOLDS.minProjectCoverageScore) return true
  if (normalizeCode(item.completenessStatus) === 'READY' && hasSkillEvidence(item)) return true
  return Boolean(item.skillEvidences?.some((evidence) => normalizeCode(evidence.strengthLevel) === 'STRONG' && evidence.confirmed !== false))
}

const countStrongProjectEvidence = (items: ApplicationPackageProjectEvidenceInput[] = []) =>
  items.filter(isProjectEvidenceStrong).length

const getBestProjectCoverageScore = (items: ApplicationPackageProjectEvidenceInput[] = []) =>
  items.reduce<number | undefined>((best, item) => {
    const score = coerceNumber(item.jdCoverage?.coverageScore)
    if (score === undefined) return best
    return best === undefined ? score : Math.max(best, score)
  }, undefined)

const findSource = (sources: EvidenceSourceVO[], sourceType: string, sourceIdValue?: unknown) =>
  sources.find((source) => {
    if (normalizeCode(source.sourceType) !== sourceType) return false
    return sourceIdValue === undefined || String(source.sourceId ?? '') === String(sourceIdValue)
  })

const checklistItem = (
  key: ApplicationPackageChecklistKey,
  label: string,
  status: ApplicationPackageChecklistStatus,
  reason: string,
  confidenceBoundary: string,
  source?: EvidenceSourceVO,
  remediationActionType?: ApplicationPackageRemediationActionType
): ApplicationPackageChecklistItemVO => ({
  key,
  label,
  status,
  reason,
  confidenceBoundary,
  source,
  remediationActionType
})

export const buildApplicationPackageChecklist = (input: ApplicationPackageRuleInput): ApplicationPackageChecklistItemVO[] => {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds }
  const sources = buildEvidenceSources(input)
  const targetJobId = input.targetJob?.id ?? input.jdAnalysis?.targetJobId
  const jdParsed = isParsed(input.jdAnalysis?.parseStatus) || isParsed(input.targetJob?.parseStatus)
  const hasJdText = hasText(input.targetJob?.jdText) || hasText(input.jdAnalysis?.summary)
  const resumeVersionId = input.recommendedResumeVersion?.resumeVersionId ?? input.matchReport?.resumeVersionId
  const matchScore = coerceNumber(input.matchReport?.overallScore)
  const matchTrusted = normalizeCode(input.matchReport?.status) === 'SUCCESS' &&
    input.matchReport?.fallback !== true &&
    normalizeCode(input.matchReport?.trustStatus) !== 'FALLBACK'
  const strongProjectEvidenceCount = countStrongProjectEvidence(input.projectEvidences || [])
  const bestProjectCoverage = getBestProjectCoverageScore(input.projectEvidences || [])
  const projectEvidenceMeetsThreshold =
    strongProjectEvidenceCount >= thresholds.minStrongProjectEvidenceCount ||
    bestProjectCoverage !== undefined && bestProjectCoverage >= thresholds.minProjectCoverageScore
  const interviewReady = Boolean(input.interviewPrepReady || hasRecommendedInterviewTopics(input.matchReport))

  return [
    checklistItem(
      'JD_PARSED',
      'JD 已解析',
      jdParsed ? 'PASS' : hasJdText ? 'WARN' : 'BLOCKED',
      jdParsed ? '岗位分析可作为投递包来源。' : hasJdText ? '已有 JD 文本，但解析状态待确认。' : '缺少可用 JD 或岗位分析。',
      'JD 未解析时，不输出强 readiness 结论。',
      findSource(sources, 'JD_ANALYSIS') || findSource(sources, 'TARGET_JOB', targetJobId),
      jdParsed ? undefined : 'REVIEW_LOW_CONFIDENCE_SOURCE'
    ),
    checklistItem(
      'HAS_RESUME_VERSION',
      '有可用简历版本',
      resumeVersionId ? 'PASS' : 'BLOCKED',
      resumeVersionId ? '已有推荐或匹配绑定的简历版本。' : '缺少可用于该岗位的简历版本。',
      '没有简历版本时，只能建议补简历或更新版本。',
      findSource(sources, 'RESUME_VERSION', resumeVersionId),
      resumeVersionId ? undefined : 'UPDATE_RESUME_VERSION'
    ),
    checklistItem(
      'RESUME_VERSION_EXPLAINED',
      '简历版本适配理由可解释',
      input.recommendedResumeVersion?.targetJobId || input.matchReport?.reportId ? 'PASS' : resumeVersionId ? 'WARN' : 'BLOCKED',
      input.recommendedResumeVersion?.targetJobId || input.matchReport?.reportId
        ? '简历版本有目标岗位绑定或匹配报告支撑。'
        : resumeVersionId
          ? '简历版本可用，但需要展示适配理由。'
          : '没有简历版本，无法解释推荐理由。',
      '适配理由不清时，不能把“最新简历”包装成最优推荐。',
      findSource(sources, 'RESUME_MATCH') || findSource(sources, 'RESUME_VERSION', resumeVersionId),
      input.recommendedResumeVersion?.targetJobId || input.matchReport?.reportId ? undefined : 'UPDATE_RESUME_VERSION'
    ),
    checklistItem(
      'MATCH_SCORE_THRESHOLD',
      '简历与岗位描述匹配分达到阈值',
      matchTrusted && matchScore !== undefined && matchScore >= thresholds.minMatchScore
        ? 'PASS'
        : matchTrusted && matchScore !== undefined
          ? 'WARN'
          : 'BLOCKED',
      matchScore === undefined
        ? '缺少可信匹配分。'
        : matchTrusted
          ? `当前匹配分 ${matchScore}，阈值 ${thresholds.minMatchScore}。`
          : '匹配报告失败、降级或可信状态不足。',
      '匹配报告低分或降级时，不输出“可以投”的强结论。',
      findSource(sources, 'RESUME_MATCH'),
      matchTrusted && matchScore !== undefined && matchScore >= thresholds.minMatchScore ? undefined : 'UPDATE_RESUME_VERSION'
    ),
    checklistItem(
      'CORE_SKILL_EVIDENCE',
      '核心技能要求有证据支撑',
      projectEvidenceMeetsThreshold ? 'PASS' : strongProjectEvidenceCount > 0 || bestProjectCoverage !== undefined ? 'WARN' : 'BLOCKED',
      projectEvidenceMeetsThreshold
        ? '已有项目证据覆盖核心要求。'
        : strongProjectEvidenceCount > 0 || bestProjectCoverage !== undefined
          ? '有项目证据线索，但覆盖或强度不足。'
          : '缺少能支撑 JD 核心要求的项目证据。',
      '证据不足时，只能建议补项目证据，不能声称能力已覆盖。',
      sources.find((source) => normalizeCode(source.sourceType) === 'PROJECT_EVIDENCE' && isEffectiveEvidenceSource(source)),
      projectEvidenceMeetsThreshold ? undefined : 'ADD_PROJECT_EVIDENCE'
    ),
    checklistItem(
      'INTERVIEW_PROJECT_EVIDENCE',
      '至少一段项目证据可用于面试深挖',
      strongProjectEvidenceCount >= thresholds.minStrongProjectEvidenceCount ? 'PASS' : 'WARN',
      strongProjectEvidenceCount >= thresholds.minStrongProjectEvidenceCount
        ? '至少一段项目证据适合进入面试深挖。'
        : '项目证据还不够稳定，面试深挖前建议补充指标、职责、难点和结果。',
      '没有强项目证据时，面试准备只能作为练习和补证据入口。',
      sources.find((source) => normalizeCode(source.sourceType) === 'PROJECT_EVIDENCE' && isStrongEvidenceSource(source)),
      strongProjectEvidenceCount >= thresholds.minStrongProjectEvidenceCount ? undefined : 'ADD_PROJECT_EVIDENCE'
    ),
    checklistItem(
      'INTERVIEW_PREP_READY',
      '已生成面试准备方向',
      interviewReady ? 'PASS' : 'WARN',
      interviewReady ? '已有面试准备方向或推荐面试主题。' : '还没有面试准备方向。',
      '面试准备缺失时，应生成练习动作，不应阻断投递记录创建。',
      findSource(sources, 'RESUME_MATCH'),
      interviewReady ? undefined : 'PRACTICE_INTERVIEW'
    ),
    checklistItem(
      'FOLLOW_UP_PLAN',
      '已设置投递后跟进计划',
      input.followUpPlanned ? 'PASS' : 'WARN',
      input.followUpPlanned ? '已有投递后跟进计划。' : '还没有投递后跟进计划。',
      '跟进计划缺失只影响执行管理，不代表岗位或个人能力结论。',
      undefined,
      input.followUpPlanned ? undefined : 'SET_FOLLOW_UP'
    )
  ]
}

const risk = (
  id: string,
  riskType: string,
  severity: CareerRiskSignalVO['severity'],
  title: string,
  description: string,
  recommendedActionId?: string
): CareerRiskSignalVO => ({
  id,
  riskType,
  severity,
  title,
  description,
  recommendedActionId
})

export const buildApplicationPackageRiskSignals = (checklist: ApplicationPackageChecklistItemVO[]): CareerRiskSignalVO[] => {
  const byKey = new Map(checklist.map((item) => [item.key, item]))
  const risks: CareerRiskSignalVO[] = []

  if (byKey.get('JD_PARSED')?.status === 'BLOCKED') {
    risks.push(risk(
      'application-package:risk:missing-jd-analysis',
      'MISSING_JD_ANALYSIS',
      'HIGH',
      '岗位描述分析缺失',
      '缺少可引用的岗位分析时，系统不能判断投递准备度。',
      'application-package:action:review-low-confidence-source'
    ))
  }
  if (byKey.get('HAS_RESUME_VERSION')?.status === 'BLOCKED') {
    risks.push(risk(
      'application-package:risk:missing-resume-version',
      'NEEDS_RESUME',
      'HIGH',
      '缺少简历版本',
      '投递包无法推荐简历或生成可信匹配判断。',
      'application-package:action:update-resume-version'
    ))
  }
  if (byKey.get('MATCH_SCORE_THRESHOLD')?.status !== 'PASS') {
    risks.push(risk(
      'application-package:risk:match-report-weak',
      'LOW_MATCH_SCORE',
      byKey.get('MATCH_SCORE_THRESHOLD')?.status === 'BLOCKED' ? 'HIGH' : 'MEDIUM',
      '匹配报告不足以支撑强推荐',
      byKey.get('MATCH_SCORE_THRESHOLD')?.reason || '匹配分或可信状态不足。',
      'application-package:action:update-resume-version'
    ))
  }
  if (byKey.get('CORE_SKILL_EVIDENCE')?.status !== 'PASS') {
    risks.push(risk(
      'application-package:risk:project-evidence-gap',
      'NEEDS_EVIDENCE',
      byKey.get('CORE_SKILL_EVIDENCE')?.status === 'BLOCKED' ? 'HIGH' : 'MEDIUM',
      '项目证据覆盖不足',
      byKey.get('CORE_SKILL_EVIDENCE')?.reason || '核心要求缺少项目证据支撑。',
      'application-package:action:add-project-evidence'
    ))
  }
  if (byKey.get('INTERVIEW_PREP_READY')?.status !== 'PASS') {
    risks.push(risk(
      'application-package:risk:interview-prep-missing',
      'NEEDS_TRAINING',
      'MEDIUM',
      '面试准备方向待生成',
      '建议先练一场带岗位上下文的模拟面试。',
      'application-package:action:practice-interview'
    ))
  }
  if (byKey.get('FOLLOW_UP_PLAN')?.status !== 'PASS') {
    risks.push(risk(
      'application-package:risk:follow-up-missing',
      'MISSING_FOLLOW_UP_PLAN',
      'LOW',
      '投递后跟进计划缺失',
      '这会影响投递漏斗管理，但不应被解释为能力风险。',
      'application-package:action:set-follow-up-plan'
    ))
  }

  return risks
}

const action = (
  actionType: ApplicationPackageRemediationActionType,
  title: string,
  description: string,
  reason: string,
  sourceType: string,
  evidenceSources: EvidenceSourceVO[],
  priority: CareerActionItemVO['priority'],
  actionUrl: string,
  trace?: SuggestionTraceVO
): CareerActionItemVO => {
  const id = `application-package:action:${actionType.toLowerCase().replace(/_/g, '-')}`
  const hasEffectiveEvidence = evidenceSources.some(isEffectiveEvidenceSource)
  return {
    id,
    title,
    description,
    reason,
    actionType,
    status: 'TODO',
    priority,
    sourceType,
    sourceLinks: evidenceSources.slice(0, 3).map((source) => ({
      sourceType: source.sourceType || sourceType,
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle || source.title,
      sourceSummary: source.sourceSummary || source.evidenceSummary || source.summary,
      actionUrl: source.actionUrl,
      trustStatus: source.trustStatus
    })),
    evidenceSources,
    trace,
    qualityGate: hasEffectiveEvidence
      ? qualityGate('WARN', 'NORMAL', ['补救行动来自投递包检查项，完成后需要刷新投递包。'])
      : qualityGate('BLOCKED', 'WEAK', ['缺少当前有效证据，只能作为补资料动作。']),
    resultSource: 'RULE',
    fallback: !hasEffectiveEvidence,
    actionUrl,
    dedupeKey: id,
    pagePath: '/dashboard'
  }
}

export const buildApplicationPackageActions = (
  checklist: ApplicationPackageChecklistItemVO[],
  input: ApplicationPackageRuleInput = {}
): CareerActionItemVO[] => {
  const sources = buildEvidenceSources(input)
  const byAction = new Map<ApplicationPackageRemediationActionType, ApplicationPackageChecklistItemVO[]>()
  checklist.forEach((item) => {
    if (item.status === 'PASS' || !item.remediationActionType) return
    byAction.set(item.remediationActionType, [...(byAction.get(item.remediationActionType) || []), item])
  })

  const targetJobId = input.targetJob?.id ?? input.jdAnalysis?.targetJobId
  const matchReportId = input.matchReport?.reportId
  const resumeVersionId = input.recommendedResumeVersion?.resumeVersionId ?? input.matchReport?.resumeVersionId
  const firstProjectEvidenceId = input.projectEvidences?.find((item) => item.id)?.id

  return compact([
    byAction.has('UPDATE_RESUME_VERSION')
      ? action(
          'UPDATE_RESUME_VERSION',
          '更新或选择更适配的简历版本',
          '匹配报告或简历版本证据不足，先补齐简历表达再刷新投递包。',
          byAction.get('UPDATE_RESUME_VERSION')?.[0]?.reason || '简历版本需要复核。',
          'RESUME_VERSION',
          compact([findSource(sources, 'RESUME_VERSION', resumeVersionId), findSource(sources, 'RESUME_MATCH', matchReportId)]),
          'HIGH',
          routeWithQuery('/resume-versions', { targetJobId, versionId: resumeVersionId }),
          input.trace
        )
      : undefined,
    byAction.has('ADD_PROJECT_EVIDENCE')
      ? action(
          'ADD_PROJECT_EVIDENCE',
          '补充项目证据',
          '补齐核心技能对应的项目背景、职责、难点、方案、指标结果和复盘。',
          byAction.get('ADD_PROJECT_EVIDENCE')?.[0]?.reason || '项目证据覆盖不足。',
          'PROJECT_EVIDENCE',
          sources.filter((source) => normalizeCode(source.sourceType) === 'PROJECT_EVIDENCE'),
          'HIGH',
          firstProjectEvidenceId
            ? routeWithQuery(`/project-evidence/${firstProjectEvidenceId}`, { targetJobId })
            : routeWithQuery('/project-evidence', { targetJobId }),
          input.trace
        )
      : undefined,
    byAction.has('PRACTICE_INTERVIEW')
      ? action(
          'PRACTICE_INTERVIEW',
          '练一场岗位上下文模拟面试',
          '用当前 JD、简历版本、匹配报告和项目证据生成一场文本模拟面试。',
          byAction.get('PRACTICE_INTERVIEW')?.[0]?.reason || '面试准备方向待生成。',
          'RESUME_MATCH',
          compact([findSource(sources, 'TARGET_JOB', targetJobId), findSource(sources, 'RESUME_MATCH', matchReportId)]),
          'MEDIUM',
          routeWithQuery('/interviews/create', { source: 'application-package', targetJobId, matchReportId, resumeVersionId }),
          input.trace
        )
      : undefined,
    byAction.has('SET_FOLLOW_UP')
      ? action(
          'SET_FOLLOW_UP',
          '设置投递后跟进计划',
          '创建投递记录时补上下一次跟进时间，避免投递后断链。',
          byAction.get('SET_FOLLOW_UP')?.[0]?.reason || '缺少跟进计划。',
          'JOB_APPLICATION',
          sources.filter((source) => ['TARGET_JOB', 'RESUME_MATCH'].includes(normalizeCode(source.sourceType))),
          'LOW',
          '/applications',
          input.trace
        )
      : undefined,
    byAction.has('REVIEW_LOW_CONFIDENCE_SOURCE')
      ? action(
          'REVIEW_LOW_CONFIDENCE_SOURCE',
          '复核低置信来源',
          '补齐或重新解析 JD，避免用不完整岗位信息生成投递建议。',
          byAction.get('REVIEW_LOW_CONFIDENCE_SOURCE')?.[0]?.reason || '来源可信度不足。',
          'JD_ANALYSIS',
          sources.filter((source) => ['TARGET_JOB', 'JD_ANALYSIS'].includes(normalizeCode(source.sourceType))),
          'HIGH',
          targetJobId ? `/job-targets/${targetJobId}/analysis` : '/job-targets',
          input.trace
        )
      : undefined
  ])
}

const deriveReadiness = (
  checklist: ApplicationPackageChecklistItemVO[],
  risks: CareerRiskSignalVO[]
): Pick<ApplicationPackageRuleResult, 'readinessLevel' | 'readinessReason'> => {
  const byKey = new Map(checklist.map((item) => [item.key, item]))
  if (byKey.get('JD_PARSED')?.status === 'BLOCKED') {
    return {
      readinessLevel: 'BLOCKED',
      readinessReason: '缺少可用岗位描述分析，先复核岗位来源。'
    }
  }
  if (risks.some((item) => item.riskType === 'NEEDS_RESUME' || item.riskType === 'LOW_MATCH_SCORE')) {
    return {
      readinessLevel: 'NEEDS_RESUME',
      readinessReason: '简历版本或匹配报告不足，先更新简历再刷新投递包。'
    }
  }
  if (risks.some((item) => item.riskType === 'NEEDS_EVIDENCE')) {
    return {
      readinessLevel: 'NEEDS_EVIDENCE',
      readinessReason: '核心要求缺少项目证据支撑，先补证据再投递。'
    }
  }
  if (risks.some((item) => item.riskType === 'NEEDS_TRAINING')) {
    return {
      readinessLevel: 'NEEDS_TRAINING',
      readinessReason: '材料基本可用，但建议先完成一场岗位上下文面试训练。'
    }
  }
  return {
    readinessLevel: 'READY',
    readinessReason: 'JD、简历匹配、项目证据和面试准备均达到 MVP 投递包门槛。'
  }
}

export const buildApplicationPackageRuleResult = (
  input: ApplicationPackageRuleInput
): ApplicationPackageRuleResult => {
  const checklist = buildApplicationPackageChecklist(input)
  const riskSignals = buildApplicationPackageRiskSignals(checklist)
  const actions = buildApplicationPackageActions(checklist, input)
  const readiness = deriveReadiness(checklist, riskSignals)

  return {
    ...readiness,
    checklist,
    riskSignals,
    actions,
    evidenceSources: buildEvidenceSources(input),
    trace: input.trace
  }
}
