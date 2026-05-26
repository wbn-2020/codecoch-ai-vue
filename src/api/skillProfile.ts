import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  SkillGapItemVO,
  SkillProfileDetailVO,
  SkillProfileGenerateDTO,
  SkillProfileGenerateVO,
  SkillProfileListVO,
  SkillProfileOverviewVO,
  SkillProfileQueryDTO,
  SkillProfileRefreshDTO
} from '@/types/skillProfile'
import { normalizePageResult } from '@/utils/page'

type BackendSkillGapItem = Partial<SkillGapItemVO> & Record<string, unknown>
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
  gap_count?: number
}

const pickText = (source: Record<string, unknown>, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

const pickNumber = (source: Record<string, unknown>, keys: string[], fallback?: number) => {
  for (const key of keys) {
    const value = source[key]
    const numberValue = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numberValue)) return numberValue
  }
  return fallback
}

const pickArray = <T>(source: Record<string, unknown>, keys: string[]): T[] => {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

const normalizeGapItem = (item: BackendSkillGapItem, index = 0): SkillGapItemVO => {
  const source = item || {}
  const id = pickNumber(source, ['id', 'gapId', 'gap_id'], index + 1) || index + 1
  const skillName = pickText(source, ['skillName', 'skill_name', 'name', 'title', 'skill', 'knowledgePoint'], `短板 #${id}`)
  const gapDescription = pickText(source, ['gapDescription', 'gap_description', 'description', 'summary', 'reason'], '暂无差距说明')

  return {
    ...item,
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

const normalizeSkillProfileDetail = (data: BackendSkillProfileDetail | null): SkillProfileDetailVO | null => {
  if (!data) return null
  const source = data as Record<string, unknown>
  return {
    ...data,
    profileId: pickNumber(source, ['profileId', 'profile_id']) || 0,
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    profileName: pickText(source, ['profileName', 'profile_name']),
    overallLevel: pickNumber(source, ['overallLevel', 'overall_level']),
    overallScore: pickNumber(source, ['overallScore', 'overall_score']),
    gapItems: normalizeGapList(pickArray<BackendSkillGapItem>(source, ['gapItems', 'gap_items', 'topGaps', 'top_gaps', 'skillGaps', 'skill_gaps']))
  } as SkillProfileDetailVO
}

const normalizeSkillProfileOverview = (data: BackendSkillProfileOverview): SkillProfileOverviewVO => {
  const source = (data || {}) as Record<string, unknown>
  const topGaps = normalizeGapList(pickArray<BackendSkillGapItem>(source, ['topGaps', 'top_gaps', 'gapItems', 'gap_items', 'skillGaps', 'skill_gaps']))

  return {
    ...data,
    profileId: pickNumber(source, ['profileId', 'profile_id']),
    targetJobId: pickNumber(source, ['targetJobId', 'target_job_id']),
    profileName: pickText(source, ['profileName', 'profile_name']),
    overallLevel: pickNumber(source, ['overallLevel', 'overall_level']),
    overallScore: pickNumber(source, ['overallScore', 'overall_score']),
    topGaps,
    gapCount: pickNumber(source, ['gapCount', 'gap_count'], topGaps.length)
  }
}

export const generateSkillProfileApi = (data: SkillProfileGenerateDTO) => {
  return request.post<SkillProfileGenerateVO, SkillProfileGenerateVO>(
    '/skill-profiles/generate',
    data
  )
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
  return request.post<SkillProfileGenerateVO, SkillProfileGenerateVO>(
    '/skill-profiles/refresh',
    data
  )
}
