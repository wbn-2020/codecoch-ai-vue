import type {
  ApplicationQualityVO,
  CareerFunnelVO,
  CareerInsightItemVO,
  CareerInsightOverviewVO as AnalyticsCareerInsightOverviewVO,
  CareerRecommendedActionVO,
  InterviewWeaknessInsightVO,
  ResumeVersionEffectItemVO,
  ResumeVersionEffectVO,
  WeaknessInsightItemVO
} from '@/types/analytics'
import { defaultUserKnownPaths, isKnownAppPath, isV4PreviewPath, routePathOnly } from '@/features/route-safety'

export type CareerActionPriority = 'urgent' | 'high' | 'normal' | 'low'
export type CareerInsightOverviewVO = AnalyticsCareerInsightOverviewVO

export interface CareerActionRoute {
  path: string
  unavailableReason?: string
  blockedPath?: string
}

export interface CareerRecommendedActionItem {
  key: string
  type: string
  priority: CareerActionPriority
  title: string
  description: string
  evidence: string
  actionLabel: string
  actionPath: string
  dedupeKeys: string[]
  unavailableReason?: string
  blockedPath?: string
}

export interface CareerInsightDisplay {
  sampleTips: string[]
  funnelMetrics: Array<{
    key: string
    label: string
    value: string
    hint: string
    tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  }>
  qualityMetrics: Array<{
    key: string
    label: string
    value: string
    hint: string
    tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  }>
  qualityWarnings: Array<{
    key: string
    title: string
    description: string
    evidence: string
    severity: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    actionLabel: string
    actionPath: string
    unavailableReason?: string
  }>
  weaknessItems: Array<{
    key: string
    title: string
    category: string
    count: number
    evidence: string
    actionPath: string
    unavailableReason?: string
  }>
  recommendedActions: CareerRecommendedActionItem[]
  resumeVersions: Array<{
    key: string
    title: string
    sampleText: string
    insightText: string
    applicationCount: number
    interviewCount: number
    offerCount: number
  }>
}

export interface CareerActionResolverOptions {
  enableV4Preview?: boolean
}

export interface DashboardCareerInsightOptions extends CareerActionResolverOptions {
  maxItems?: number
  existingDedupeKeys?: string[]
}

interface NormalizedFunnel {
  latestReadinessScore: number | null
  agentTaskDoneCount: number
  applicationCount: number
  followedUpApplicationCount: number
  interviewApplicationCount: number
  offerApplicationCount: number
  rejectedOrClosedApplicationCount: number
  interviewRate: number
  offerRate: number
}

interface NormalizedApplicationQuality {
  totalApplications: number
  withResumeVersionCount: number
  withFollowUpCount: number
  overdueFollowUpCount: number
  staleApplicationCount: number
  noEventApplicationCount: number
  resumeVersionCoverageRate: number
  followUpCoverageRate: number
  warnings: CareerInsightItemVO[]
}

interface NormalizedResumeVersionEffectItem {
  resumeId: number | null
  resumeVersionId: number | null
  versionNo: number | null
  versionName: string
  currentFlag: number | null
  applicationCount: number
  interviewCount: number
  offerCount: number
  sampleLevel: string
  insightLabel: string
}

interface NormalizedResumeVersionEffect {
  versionUsedCount: number
  currentVersionApplicationCount: number
  applicationsWithoutVersionCount: number
  versions: NormalizedResumeVersionEffectItem[]
}

interface NormalizedWeaknessInsightItem {
  name: string
  category: string
  count: number
  evidence: string
  recommendedActionType: string
  actionPath: string
}

interface NormalizedInterviewWeaknesses {
  rangeDays: number
  interviewCount: number
  reportCount: number
  topWeaknesses: NormalizedWeaknessInsightItem[]
}

export interface NormalizedCareerInsightOverview {
  rangeDays: number
  generatedAt: string | null
  funnel: NormalizedFunnel
  applicationQuality: NormalizedApplicationQuality
  resumeVersionEffect: NormalizedResumeVersionEffect
  interviewWeaknesses: NormalizedInterviewWeaknesses
  recommendedActions: CareerRecommendedActionVO[]
  dataWarnings: string[]
}

const priorityWeight: Record<CareerActionPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
}

const toText = (value?: string | number | null) => String(value ?? '').trim()

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toList = <T>(items?: T[] | null): T[] => (Array.isArray(items) ? items : [])

const normalizeToken = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/[.-]/g, '_')
    .toUpperCase()

const routePath = routePathOnly

const isKnownPath = (path: string) => isKnownAppPath(path, defaultUserKnownPaths)

const normalizePriority = (value?: string | null): CareerActionPriority => {
  const token = normalizeToken(value)
  if (token === 'URGENT') return 'urgent'
  if (token === 'HIGH') return 'high'
  if (token === 'LOW') return 'low'
  return 'normal'
}

const formatPercent = (value?: number | null) => {
  const numberValue = toNumber(value)
  const percent = numberValue > 1 ? numberValue : numberValue * 100
  return `${Math.round(percent)}%`
}

const formatScore = (value?: number | null) => {
  if (value === null || value === undefined) return '--'
  return `${Math.round(Number(value))}`
}

const normalizeSeverity = (value?: string | null): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  const token = normalizeToken(value)
  if (token === 'CRITICAL' || token === 'HIGH') return 'danger'
  if (token === 'MEDIUM') return 'warning'
  if (token === 'LOW') return 'info'
  return 'warning'
}

const normalizeFunnel = (funnel?: CareerFunnelVO | null): NormalizedFunnel => ({
  latestReadinessScore: funnel?.latestReadinessScore ?? null,
  agentTaskDoneCount: toNumber(funnel?.agentTaskDoneCount),
  applicationCount: toNumber(funnel?.applicationCount),
  followedUpApplicationCount: toNumber(funnel?.followedUpApplicationCount),
  interviewApplicationCount: toNumber(funnel?.interviewApplicationCount),
  offerApplicationCount: toNumber(funnel?.offerApplicationCount),
  rejectedOrClosedApplicationCount: toNumber(funnel?.rejectedOrClosedApplicationCount),
  interviewRate: toNumber(funnel?.interviewRate),
  offerRate: toNumber(funnel?.offerRate)
})

const normalizeApplicationQuality = (quality?: ApplicationQualityVO | null): NormalizedApplicationQuality => ({
  totalApplications: toNumber(quality?.totalApplications),
  withResumeVersionCount: toNumber(quality?.withResumeVersionCount),
  withFollowUpCount: toNumber(quality?.withFollowUpCount),
  overdueFollowUpCount: toNumber(quality?.overdueFollowUpCount),
  staleApplicationCount: toNumber(quality?.staleApplicationCount),
  noEventApplicationCount: toNumber(quality?.noEventApplicationCount),
  resumeVersionCoverageRate: toNumber(quality?.resumeVersionCoverageRate),
  followUpCoverageRate: toNumber(quality?.followUpCoverageRate),
  warnings: toList(quality?.warnings)
})

const normalizeResumeVersion = (item: ResumeVersionEffectItemVO): NormalizedResumeVersionEffectItem => ({
  resumeId: item.resumeId ?? null,
  resumeVersionId: item.resumeVersionId ?? null,
  versionNo: item.versionNo ?? null,
  versionName: item.versionName || '',
  currentFlag: item.currentFlag ?? null,
  applicationCount: toNumber(item.applicationCount),
  interviewCount: toNumber(item.interviewCount),
  offerCount: toNumber(item.offerCount),
  sampleLevel: item.sampleLevel || '',
  insightLabel: item.insightLabel || ''
})

const normalizeResumeVersionEffect = (effect?: ResumeVersionEffectVO | null): NormalizedResumeVersionEffect => ({
  versionUsedCount: toNumber(effect?.versionUsedCount),
  currentVersionApplicationCount: toNumber(effect?.currentVersionApplicationCount),
  applicationsWithoutVersionCount: toNumber(effect?.applicationsWithoutVersionCount),
  versions: toList(effect?.versions).map(normalizeResumeVersion)
})

const normalizeWeakness = (item: WeaknessInsightItemVO): NormalizedWeaknessInsightItem => ({
  name: item.name || '',
  category: item.category || '',
  count: toNumber(item.count),
  evidence: item.evidence || '',
  recommendedActionType: item.recommendedActionType || '',
  actionPath: item.actionPath || ''
})

const normalizeInterviewWeaknesses = (
  weaknesses?: InterviewWeaknessInsightVO | null
): NormalizedInterviewWeaknesses => ({
  rangeDays: Number(weaknesses?.rangeDays) > 0 ? Number(weaknesses?.rangeDays) : 30,
  interviewCount: toNumber(weaknesses?.interviewCount),
  reportCount: toNumber(weaknesses?.reportCount),
  topWeaknesses: toList(weaknesses?.topWeaknesses).map(normalizeWeakness)
})

export const normalizeCareerInsightOverview = (
  overview?: Partial<CareerInsightOverviewVO> | NormalizedCareerInsightOverview | null
): NormalizedCareerInsightOverview => {
  const normalized = {
    rangeDays: Number(overview?.rangeDays) > 0 ? Number(overview?.rangeDays) : 30,
    generatedAt: overview?.generatedAt || null,
    funnel: normalizeFunnel(overview?.funnel),
    applicationQuality: normalizeApplicationQuality(overview?.applicationQuality),
    resumeVersionEffect: normalizeResumeVersionEffect(overview?.resumeVersionEffect),
    interviewWeaknesses: normalizeInterviewWeaknesses(overview?.interviewWeaknesses),
    recommendedActions: toList(overview?.recommendedActions),
    dataWarnings: toList(overview?.dataWarnings).filter(Boolean)
  }

  if (!overview) {
    normalized.dataWarnings = ['暂无足够求职数据，继续记录投递和面试后会生成趋势建议。']
  }

  return normalized
}

export const resolveCareerActionRoute = (
  rawPath?: string | null,
  options: CareerActionResolverOptions = {}
): CareerActionRoute => {
  const path = toText(rawPath)
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return {
      path: '/agent/today',
      unavailableReason: '目标不是安全的站内路径，已回落到今日任务。',
      blockedPath: path || undefined
    }
  }

  const basePath = routePath(path)
  if (!options.enableV4Preview && isV4PreviewPath(basePath)) {
    return {
      path: '/agent/today',
      unavailableReason: '目标属于 V4 预览能力，当前已回落到可用入口。',
      blockedPath: path
    }
  }

  if (!isKnownPath(basePath)) {
    return {
      path: '/agent/today',
      unavailableReason: '目标路径不存在或未开放，已回落到今日任务。',
      blockedPath: path
    }
  }

  return { path }
}

const buildDedupeKeys = (action: CareerRecommendedActionVO, actionPath: string) => {
  const type = normalizeToken(action.type)
  const path = actionPath.toLowerCase()
  const keys = new Set<string>()
  const id = toText(action.id)
  if (id) keys.add(`career:${id}`)

  if (type.includes('APPLICATION') || type.includes('FOLLOW_UP') || path.includes('/applications')) {
    if (type.includes('OVERDUE')) keys.add('application-follow-up:overdue')
    if (type.includes('DUE_TODAY')) keys.add('application-follow-up:due-today')
    if (path.includes('followup=overdue')) keys.add('application-follow-up:overdue')
    if (path.includes('followup=due-today')) keys.add('application-follow-up:due-today')
    keys.add('career:application')
  }
  if (type.includes('INTERVIEW_WEAKNESS') || path.includes('/weakness-analysis')) keys.add('career:weakness')
  if (type.includes('RESUME')) keys.add('career:resume')
  if (type.includes('AGENT') || type.includes('READINESS')) keys.add('readiness:next-action')

  return Array.from(keys)
}

export const toRecommendedActionItems = (
  actions?: CareerRecommendedActionVO[] | null,
  options: CareerActionResolverOptions = {}
): CareerRecommendedActionItem[] =>
  toList(actions)
    .map((action, index): CareerRecommendedActionItem | undefined => {
      const route = resolveCareerActionRoute(action.actionPath, options)
      const title = toText(action.title)
      if (!title) return undefined
      const key = toText(action.id) || `${normalizeToken(action.type).toLowerCase() || 'career-action'}-${index + 1}`

      const item: CareerRecommendedActionItem = {
        key,
        type: normalizeToken(action.type) || 'CAREER_ACTION',
        priority: normalizePriority(action.priority),
        title,
        description: toText(action.description) || '根据最近求职数据生成的改进行动。',
        evidence: toText(action.evidence),
        actionLabel: toText(action.actionLabel) || '去处理',
        actionPath: route.path,
        dedupeKeys: buildDedupeKeys(action, route.path)
      }
      if (route.unavailableReason) item.unavailableReason = route.unavailableReason
      if (route.blockedPath) item.blockedPath = route.blockedPath
      return item
    })
    .filter((item): item is CareerRecommendedActionItem => Boolean(item))
    .sort((left, right) => {
      const priorityDiff = priorityWeight[left.priority] - priorityWeight[right.priority]
      if (priorityDiff !== 0) return priorityDiff
      return left.key.localeCompare(right.key)
    })

export const toDashboardCareerInsightItems = (
  actions?: CareerRecommendedActionVO[] | null,
  options: DashboardCareerInsightOptions = {}
) => {
  const existing = new Set(options.existingDedupeKeys || [])
  const seen = new Set<string>()

  return toRecommendedActionItems(actions, options)
    .filter((item) => {
      const dedupeKeys = item.dedupeKeys
      if (dedupeKeys.some((key) => existing.has(key) || seen.has(key))) return false
      dedupeKeys.forEach((key) => seen.add(key))
      return true
    })
    .slice(0, Math.min(3, Math.max(1, Math.floor(Number(options.maxItems) || 3))))
}

const metric = (
  key: string,
  label: string,
  value: string | number,
  hint: string,
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
) => ({
  key,
  label,
  value: String(value),
  hint,
  tone
})

const toWarningDisplay = (warning: CareerInsightItemVO, index: number, options: CareerActionResolverOptions) => {
  const route = resolveCareerActionRoute(warning.actionPath, options)
  return {
    key: toText(warning.type) || `warning-${index + 1}`,
    title: toText(warning.title) || '需要关注的质量信号',
    description: toText(warning.description) || '这条信号来自最近的投递和跟进记录。',
    evidence: toText(warning.evidence),
    severity: normalizeSeverity(warning.severity),
    actionLabel: toText(warning.actionLabel) || '去处理',
    actionPath: route.path,
    unavailableReason: route.unavailableReason
  }
}

export const buildCareerInsightDisplay = (
  overview?: Partial<CareerInsightOverviewVO> | NormalizedCareerInsightOverview | null,
  options: CareerActionResolverOptions = {}
): CareerInsightDisplay => {
  const normalized = normalizeCareerInsightOverview(overview)
  const funnel = normalized.funnel
  const quality = normalized.applicationQuality
  const interview = normalized.interviewWeaknesses
  const sampleTips = [...normalized.dataWarnings]

  if (quality.totalApplications < 3) {
    sampleTips.push('投递样本仍偏少，建议先把投递和跟进记录补齐后再观察趋势。')
  }
  if (interview.reportCount < 1) {
    sampleTips.push('面试报告样本不足，完成一次模拟面试后会生成弱项洞察。')
  }

  const funnelMetrics = [
    metric('readiness', '准备度', formatScore(funnel.latestReadinessScore), '来自最近一次 readiness_score_record', 'primary'),
    metric('agent-tasks', 'Agent 完成', funnel.agentTaskDoneCount, `近 ${normalized.rangeDays} 天完成任务`, 'success'),
    metric('applications', '投递数', funnel.applicationCount, '进入个人求职漏斗的投递', 'info'),
    metric('follow-ups', '已跟进', funnel.followedUpApplicationCount, '有跟进记录或跟进计划的投递', 'success'),
    metric('interviews', '进入面试', funnel.interviewApplicationCount, `面试率 ${formatPercent(funnel.interviewRate)}`, 'warning'),
    metric('offers', 'Offer', funnel.offerApplicationCount, `Offer 率 ${formatPercent(funnel.offerRate)}`, 'danger')
  ]

  const qualityMetrics = [
    metric(
      'resume-version-coverage',
      '简历版本覆盖',
      formatPercent(quality.resumeVersionCoverageRate),
      `${quality.withResumeVersionCount}/${quality.totalApplications} 条投递已绑定版本`,
      quality.resumeVersionCoverageRate >= 0.8 ? 'success' : 'warning'
    ),
    metric(
      'follow-up-coverage',
      '跟进覆盖',
      formatPercent(quality.followUpCoverageRate),
      `${quality.withFollowUpCount}/${quality.totalApplications} 条投递有跟进`,
      quality.followUpCoverageRate >= 0.8 ? 'success' : 'warning'
    ),
    metric('overdue-follow-up', '逾期跟进', quality.overdueFollowUpCount, '需要优先处理', quality.overdueFollowUpCount > 0 ? 'danger' : 'success'),
    metric('stale-applications', '停滞投递', quality.staleApplicationCount, '长时间没有事件或更新', quality.staleApplicationCount > 0 ? 'warning' : 'success'),
    metric('no-event', '无事件投递', quality.noEventApplicationCount, '缺少跟进、面试或结果记录', quality.noEventApplicationCount > 0 ? 'warning' : 'success')
  ]

  const qualityWarnings = quality.warnings.map((warning, index) => toWarningDisplay(warning, index, options))

  const weaknessItems = interview.topWeaknesses.map((item, index) => {
    const route = resolveCareerActionRoute(item.actionPath || '/weakness-analysis', options)
    return {
      key: toText(item.name) || `weakness-${index + 1}`,
      title: toText(item.name) || '未命名弱项',
      category: toText(item.category) || '面试弱项',
      count: item.count,
      evidence: toText(item.evidence) || `${item.count} 次报告提及`,
      actionPath: route.path,
      unavailableReason: route.unavailableReason
    }
  })

  const resumeVersions = normalized.resumeVersionEffect.versions.map((item, index) => {
    const sampleLow = normalizeToken(item.sampleLevel) === 'LOW' || item.applicationCount < 3
    const name = item.versionName || `版本 ${item.versionNo || index + 1}`
    const insight = sampleLow
      ? '样本较少，先继续观察，不做效果排名。'
      : item.insightLabel || (item.interviewCount > 0 ? '已带来面试机会。' : '继续观察投递结果。')

    return {
      key: String(item.resumeVersionId || `${item.resumeId || 'resume'}-${item.versionNo || index}`),
      title: name,
      sampleText: sampleLow ? '样本不足' : `${item.applicationCount} 次投递`,
      insightText: insight,
      applicationCount: item.applicationCount,
      interviewCount: item.interviewCount,
      offerCount: item.offerCount
    }
  })

  return {
    sampleTips: Array.from(new Set(sampleTips)).slice(0, 3),
    funnelMetrics,
    qualityMetrics,
    qualityWarnings,
    weaknessItems,
    recommendedActions: toRecommendedActionItems(normalized.recommendedActions, options),
    resumeVersions
  }
}
