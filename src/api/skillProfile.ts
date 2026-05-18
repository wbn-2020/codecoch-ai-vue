import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  SkillProfileDetailVO,
  SkillProfileGenerateDTO,
  SkillProfileGenerateVO,
  SkillProfileListVO,
  SkillProfileOverviewVO,
  SkillProfileQueryDTO,
  SkillProfileRefreshDTO
} from '@/types/skillProfile'
import { normalizePageResult } from '@/utils/page'

export const generateSkillProfileApi = (data: SkillProfileGenerateDTO) => {
  return request.post<SkillProfileGenerateVO, SkillProfileGenerateVO>(
    '/skill-profiles/generate',
    data
  )
}

export const getSkillProfileByJobTargetApi = (targetJobId: number) => {
  return request.get<SkillProfileDetailVO, SkillProfileDetailVO>(
    `/skill-profiles/by-job-target/${targetJobId}`
  )
}

export const getSkillProfileOverviewApi = (targetJobId?: number) => {
  return request.get<SkillProfileOverviewVO, SkillProfileOverviewVO>('/skill-profiles/overview', {
    params: targetJobId ? { targetJobId } : undefined
  })
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
