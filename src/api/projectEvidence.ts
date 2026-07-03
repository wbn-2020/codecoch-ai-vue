import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ProjectEvidenceDetailVO,
  ProjectEvidenceDTO,
  ProjectEvidenceFromResumeProjectDTO,
  ProjectEvidenceListVO,
  ProjectEvidenceQueryDTO,
  ProjectJdCoverageRequestDTO,
  ProjectJdCoverageVO,
  ProjectSkillEvidenceDTO,
  ProjectSkillEvidenceVO,
  ProjectStoryGenerateDTO,
  ProjectStoryGenerationQueryDTO,
  ProjectStoryGenerationVO
} from '@/types/projectEvidence'
import { normalizePageResult } from '@/utils/page'

const splitMissingFields = (value?: string[] | string | null) => {
  if (!value) return []
  return Array.isArray(value) ? value : value.split(',').map((item) => item.trim()).filter(Boolean)
}

const normalizeProjectEvidence = <T extends ProjectEvidenceListVO | ProjectEvidenceDetailVO>(item: T): T => ({
  ...item,
  id: item.id || 0,
  title: item.title || '',
  missingFields: splitMissingFields(item.missingFields),
  completenessScore: item.completenessScore ?? 0,
  completenessStatus: item.completenessStatus || 'INCOMPLETE',
  skillEvidenceCount:
    item.skillEvidenceCount ??
    ('skillEvidences' in item ? item.skillEvidences?.length : undefined) ??
    0,
  ...('skillEvidences' in item ? { skillEvidences: item.skillEvidences || [] } : {})
} as T)

export const getProjectEvidenceListApi = (params?: ProjectEvidenceQueryDTO) => {
  return request
    .get<PageResult<ProjectEvidenceListVO> | ProjectEvidenceListVO[], PageResult<ProjectEvidenceListVO> | ProjectEvidenceListVO[]>(
      '/project-evidence',
      { params }
    )
    .then((result) => normalizePageResult(result, params, normalizeProjectEvidence))
}

export const createProjectEvidenceApi = (data: ProjectEvidenceDTO) => {
  return request
    .post<ProjectEvidenceDetailVO, ProjectEvidenceDetailVO>('/project-evidence', data)
    .then(normalizeProjectEvidence)
}

export const importProjectEvidenceFromResumeProjectApi = (data: ProjectEvidenceFromResumeProjectDTO) => {
  return request
    .post<ProjectEvidenceDetailVO, ProjectEvidenceDetailVO>('/project-evidence/from-resume-project', data)
    .then(normalizeProjectEvidence)
}

export const getProjectEvidenceDetailApi = (id: number) => {
  return request
    .get<ProjectEvidenceDetailVO, ProjectEvidenceDetailVO>(`/project-evidence/${id}`)
    .then(normalizeProjectEvidence)
}

export const updateProjectEvidenceApi = (id: number, data: ProjectEvidenceDTO) => {
  return request
    .put<ProjectEvidenceDetailVO, ProjectEvidenceDetailVO>(`/project-evidence/${id}`, data)
    .then(normalizeProjectEvidence)
}

export const deleteProjectEvidenceApi = (id: number) => {
  return request.delete<void, void>(`/project-evidence/${id}`)
}

export const addProjectSkillEvidenceApi = (projectId: number, data: ProjectSkillEvidenceDTO) => {
  return request.post<ProjectSkillEvidenceVO, ProjectSkillEvidenceVO>(
    `/project-evidence/${projectId}/skill-evidences`,
    data
  )
}

export const updateProjectSkillEvidenceApi = (
  projectId: number,
  evidenceId: number,
  data: ProjectSkillEvidenceDTO
) => {
  return request.put<ProjectSkillEvidenceVO, ProjectSkillEvidenceVO>(
    `/project-evidence/${projectId}/skill-evidences/${evidenceId}`,
    data
  )
}

export const deleteProjectSkillEvidenceApi = (projectId: number, evidenceId: number) => {
  return request.delete<void, void>(`/project-evidence/${projectId}/skill-evidences/${evidenceId}`)
}

export const generateProjectStoryApi = (projectId: number, data: ProjectStoryGenerateDTO) => {
  return request.post<ProjectStoryGenerationVO, ProjectStoryGenerationVO>(
    `/project-evidence/${projectId}/generations`,
    data
  )
}

export const getProjectStoryGenerationsApi = (projectId: number, params?: ProjectStoryGenerationQueryDTO) => {
  return request.get<ProjectStoryGenerationVO[], ProjectStoryGenerationVO[]>(
    `/project-evidence/${projectId}/generations`,
    { params }
  )
}

export const acceptProjectStoryGenerationApi = (projectId: number, generationId: number) => {
  return request.post<ProjectStoryGenerationVO, ProjectStoryGenerationVO>(
    `/project-evidence/${projectId}/generations/${generationId}/accept`
  )
}

export const analyzeProjectJdCoverageApi = (projectId: number, data?: ProjectJdCoverageRequestDTO) => {
  return request.post<ProjectJdCoverageVO, ProjectJdCoverageVO>(`/project-evidence/${projectId}/jd-coverage`, data || {})
}
