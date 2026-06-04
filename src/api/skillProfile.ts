import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  SkillGapItemVO,
  SkillProfileDetailVO,
  SkillProfileGenerateDTO,
  SkillProfileGenerateVO,
  SkillProfileListVO,
  SkillProfileOverviewVO,
  SkillProfileRadarDataItemVO,
  SkillProfileQueryDTO,
  SkillProfileRefreshDTO
} from '@/types/skillProfile'
import { normalizePageResult } from '@/utils/page'
import { toFriendlyMessage } from '@/utils/error'

type UnknownRecord = Record<string, unknown>
type BackendSkillGapItem = Partial<SkillGapItemVO> & UnknownRecord
type BackendSkillRadarItem = Partial<SkillProfileRadarDataItemVO> & UnknownRecord
type BackendSkillProfileGenerate = Partial<SkillProfileGenerateVO> & {
  profile_id?: number
  target_job_id?: number
  match_report_id?: number
  error_message?: string
  ai_call_log_id?: number
}
type BackendSkillProfileDetail = Partial<SkillProfileDetailVO> & {
  gap_items?: BackendSkillGapItem[]
  skillGaps?: BackendSkillGapItem[]
  skill_gaps?: BackendSkillGapItem[]
}
type BackendSkillProfileOverview = Partial<SkillProfileOverviewVO> & {
  profile_id?: number
  target_job_id?: number
  profile_name?: string
  overall_level?: number
  overall_score?: number
  top_gaps?: BackendSkillGapItem[]
  gap_items?: BackendSkillGapItem[]
  skillGaps?: BackendSkillGapItem[]
  skill_gaps?: BackendSkillGapItem[]
  radar_data?: BackendSkillRadarItem[]
  radarItems?: BackendSkillRadarItem[]
  radar_items?: BackendSkillRadarItem[]
  gap_count?: number
  next_actions?: unknown
}

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text || !/^[\[{]/.test(text)) return value
  try {
    return JSON.parse(text) as unknown
  } catch {
    return value
  }
}

const toRecord = (value: unknown): UnknownRecord => {
  const parsed = parseMaybeJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as UnknownRecord : {}
}

const pickText = (source: Record<string, unknown>, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = parseMaybeJson(source[key])
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

const pickNumber = (source: Record<string, unknown>, keys: string[], fallback?: number) => {
  for (const key of keys) {
    const value = parseMaybeJson(source[key])
    const numberValue = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numberValue)) return numberValue
  }
  return fallback
}

const pickArray = <T>(source: Record<string, unknown>, keys: string[]): T[] => {
  for (const key of keys) {
    const value = parseMaybeJson(source[key])
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

const pickValue = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return parseMaybeJson(source[key])
  }
  return undefined
}

const normalizeTextList = (value: unknown): string[] => {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const record = item as UnknownRecord
          return pickText(record, ['title', 'name', 'action', 'description', 'summary'])
        }
        return ''
      })
      .filter(Boolean)
  }
  if (typeof parsed === 'string') {
    return parsed.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}

const normalizeGapItem = (item: BackendSkillGapItem, index = 0): SkillGapItemVO => {
  const source = toRecord(item)
  const id = pickNumber(source, ['id', 'gapId', 'gap_id'], index + 1) || index + 1
  const skillName = pickText(source, ['skillName', 'skill_name', 'name', 'title', 'skill', 'knowledgePoint'], `短板 #${id}`)
  const gapDescription = pickText(source, ['gapDescription', 'gap_description', 'description', 'summary', 'reason'], '暂无差距说明')

  return {
    ...(source as Partial<SkillGapItemVO>),
    id,
    profileId: pickNumber(source, ['profileId', 'profile_id']) || 0,
    userId: pickNumber(source, ['userId', 'user_id']),
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    skillName,
    category: pickText(source, ['category', 'categoryName', 'category_name', 'type'], '--'),
    targetLevel: pickNumber(source, ['targetLevel', 'target_level']),
    currentLevel: pickNumber(source, ['currentLevel', 'current_level']),
    gapLevel: pickNumber(source, ['gapLevel', 'gap_level']),
    confidence: pickNumber(source, ['confidence']) as SkillGapItemVO['confidence'],
    severity: pickText(source, ['severity', 'gapSeverity', 'gap_severity'], 'NORMAL'),
    evidenceSources: source.evidenceSources || source.evidence_sources || source.evidenceSourcesJson || [],
    gapDescription,
    recommendedActions: source.recommendedActions || source.recommended_actions || source.recommendedActionsJson || [],
    priority: pickNumber(source, ['priority'], index + 1),
    sourceType: pickText(source, ['sourceType', 'source_type']),
    sourceBizId: pickNumber(source, ['sourceBizId', 'source_biz_id']),
    createdAt: pickText(source, ['createdAt', 'created_at']),
    updatedAt: pickText(source, ['updatedAt', 'updated_at'])
  }
}

const normalizeGapList = (items: BackendSkillGapItem[] = []) =>
  items.map(normalizeGapItem).filter((item) => item.id && item.skillName)

const normalizeRadarItem = (item: BackendSkillRadarItem, index = 0): SkillProfileRadarDataItemVO => {
  const source = toRecord(item)
  return {
    skillName: pickText(source, ['skillName', 'skill_name', 'name', 'title', 'skill', 'knowledgePoint'], `技能 #${index + 1}`),
    category: pickText(source, ['category', 'categoryName', 'category_name', 'type'], '--'),
    targetLevel: pickNumber(source, ['targetLevel', 'target_level', 'targetScore', 'target_score']),
    currentLevel: pickNumber(source, ['currentLevel', 'current_level', 'currentScore', 'current_score']),
    gapLevel: pickNumber(source, ['gapLevel', 'gap_level']),
    severity: pickText(source, ['severity', 'gapSeverity', 'gap_severity'], 'NORMAL')
  }
}

const normalizeRadarList = (items: BackendSkillRadarItem[] = [], fallbackGaps: SkillGapItemVO[] = []) => {
  const normalized = items
    .map(normalizeRadarItem)
    .filter((item) => item.skillName || item.category)
  if (normalized.length) return normalized
  return fallbackGaps.slice(0, 6).map((gap, index) => ({
    skillName: gap.skillName || `技能 #${index + 1}`,
    category: gap.category || '--',
    currentLevel: gap.currentLevel,
    targetLevel: gap.targetLevel,
    gapLevel: gap.gapLevel,
    severity: gap.severity
  }))
}

const normalizeSkillProfileGenerate = (data: BackendSkillProfileGenerate | null): SkillProfileGenerateVO => {
  const source = toRecord(data)
  return {
    ...(source as Partial<SkillProfileGenerateVO>),
    profileId: pickNumber(source, ['profileId', 'profile_id']) || 0,
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    matchReportId: pickNumber(source, ['matchReportId', 'match_report_id']),
    gapCount: pickNumber(source, ['gapCount', 'gap_count']),
    status: pickText(source, ['status'], 'FAILED'),
    errorMessage: toFriendlyMessage(pickText(source, ['errorMessage', 'error_message']), ''),
    aiCallLogId: pickNumber(source, ['aiCallLogId', 'ai_call_log_id']),
    createdAt: pickText(source, ['createdAt', 'created_at']),
    updatedAt: pickText(source, ['updatedAt', 'updated_at'])
  }
}

const normalizeSkillProfileDetail = (data: BackendSkillProfileDetail | null): SkillProfileDetailVO | null => {
  if (!data) return null
  const source = toRecord(data)
  return {
    ...(source as Partial<SkillProfileDetailVO>),
    profileId: pickNumber(source, ['profileId', 'profile_id']) || 0,
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    profileName: pickText(source, ['profileName', 'profile_name']),
    overallLevel: pickNumber(source, ['overallLevel', 'overall_level']),
    overallScore: pickNumber(source, ['overallScore', 'overall_score']),
    gapItems: normalizeGapList(pickArray<BackendSkillGapItem>(source, ['gapItems', 'gap_items', 'topGaps', 'top_gaps', 'skillGaps', 'skill_gaps']))
  } as SkillProfileDetailVO
}

const normalizeSkillProfileOverview = (data: BackendSkillProfileOverview | null): SkillProfileOverviewVO => {
  const source = toRecord(data)
  const topGaps = normalizeGapList(pickArray<BackendSkillGapItem>(source, ['topGaps', 'top_gaps', 'gapItems', 'gap_items', 'skillGaps', 'skill_gaps']))
  const radarData = normalizeRadarList(
    pickArray<BackendSkillRadarItem>(source, ['radarData', 'radar_data', 'radarItems', 'radar_items', 'skills', 'skillRadar', 'skill_radar']),
    topGaps
  )

  return {
    ...(source as Partial<SkillProfileOverviewVO>),
    profileId: pickNumber(source, ['profileId', 'profile_id']),
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    profileName: pickText(source, ['profileName', 'profile_name']),
    overallLevel: pickNumber(source, ['overallLevel', 'overall_level']),
    overallScore: pickNumber(source, ['overallScore', 'overall_score']),
    radarData,
    topGaps,
    nextActions: normalizeTextList(pickValue(source, ['nextActions', 'next_actions', 'recommendedActions', 'recommended_actions'])),
    gapCount: pickNumber(source, ['gapCount', 'gap_count'], topGaps.length)
  }
}

export const generateSkillProfileApi = (data: SkillProfileGenerateDTO) => {
  return request
    .post<BackendSkillProfileGenerate | null, BackendSkillProfileGenerate | null>(
      '/skill-profiles/generate',
      data
    )
    .then(normalizeSkillProfileGenerate)
}

export const getSkillProfileByJobTargetApi = (targetJobId: number) => {
  return request
    .get<BackendSkillProfileDetail | null, BackendSkillProfileDetail | null>(
      `/skill-profiles/by-job-target/${targetJobId}`
    )
    .then(normalizeSkillProfileDetail)
}

export const getSkillProfileByIdApi = (profileId: number) => {
  return request
    .get<BackendSkillProfileDetail | null, BackendSkillProfileDetail | null>(
      `/skill-profiles/${profileId}`
    )
    .then(normalizeSkillProfileDetail)
}

export const getSkillProfileOverviewApi = (targetJobId?: number) => {
  return request
    .get<BackendSkillProfileOverview, BackendSkillProfileOverview>('/skill-profiles/overview', {
      params: targetJobId ? { targetJobId } : undefined
    })
    .then(normalizeSkillProfileOverview)
}

export const getSkillProfilesApi = (params?: SkillProfileQueryDTO) => {
  return request
    .get<PageResult<SkillProfileListVO>, PageResult<SkillProfileListVO>>('/skill-profiles', {
      params
    })
    .then((result) => normalizePageResult(result, params))
}

export const refreshSkillProfileApi = (data: SkillProfileRefreshDTO) => {
  return request
    .post<BackendSkillProfileGenerate | null, BackendSkillProfileGenerate | null>(
      '/skill-profiles/refresh',
      data
    )
    .then(normalizeSkillProfileGenerate)
}
