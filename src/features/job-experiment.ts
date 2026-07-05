import type {
  JobExperimentRelationType,
  JobSearchExperimentMetricsVO,
  JobSearchExperimentRelationVO
} from '@/types/jobExperiment'

export const jobExperimentSupportedRelationTypes: JobExperimentRelationType[] = [
  'RESUME_VERSION',
  'TARGET_JOB',
  'JD_ANALYSIS',
  'MATCH_REPORT',
  'JOB_APPLICATION',
  'PROJECT_EVIDENCE'
]

export const jobExperimentRelationOptions: Array<{ label: string; value: JobExperimentRelationType }> = [
  { label: '简历版本', value: 'RESUME_VERSION' },
  { label: '岗位目标', value: 'TARGET_JOB' },
  { label: '岗位描述分析', value: 'JD_ANALYSIS' },
  { label: '匹配报告', value: 'MATCH_REPORT' },
  { label: '投递记录', value: 'JOB_APPLICATION' },
  { label: '项目证据', value: 'PROJECT_EVIDENCE' }
]

const relationLabelMap = jobExperimentRelationOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label
  return map
}, {})

export const isSupportedJobExperimentRelationType = (type?: string): type is JobExperimentRelationType =>
  jobExperimentSupportedRelationTypes.includes(type as JobExperimentRelationType)

export const jobExperimentRelationLabel = (type?: string) => relationLabelMap[type || ''] || '未支持证据'

export const confidenceLabel = (confidence?: string) => {
  if (confidence === 'HIGH') return '高置信度'
  if (confidence === 'MEDIUM') return '中置信度'
  return '低置信度'
}

export const statusLabel = (status?: string) => {
  if (status === 'RUNNING') return '进行中'
  if (status === 'REVIEWED') return '已复盘'
  if (status === 'ARCHIVED') return '已归档'
  return '草稿'
}

export const shouldKeepConclusionWeak = (
  metrics?: Partial<Pick<JobSearchExperimentMetricsVO, 'sampleInsufficient' | 'confidenceLevel' | 'sampleWarning' | 'applicationCount' | 'interviewCompletedCount'>>
) => {
  if (!metrics) return true
  if (metrics.sampleInsufficient) return true
  if (metrics.confidenceLevel === 'LOW' || metrics.confidenceLevel === 'MEDIUM') return true
  if (metrics.confidenceLevel === 'HIGH' && metrics.sampleInsufficient === false) return false
  return (metrics.applicationCount ?? 0) < 10 || (metrics.interviewCompletedCount ?? 0) < 3
}

export interface JobExperimentEvidenceCoverageItem {
  type: JobExperimentRelationType
  label: string
  count: number
  covered: boolean
  summaries: string[]
}

export interface JobExperimentEvidenceCoverage {
  total: number
  covered: number
  missingTypes: JobExperimentRelationType[]
  items: JobExperimentEvidenceCoverageItem[]
}

export const buildJobExperimentEvidenceCoverage = (
  relations: Array<Pick<JobSearchExperimentRelationVO, 'relationType' | 'relationSummary'>> = []
): JobExperimentEvidenceCoverage => {
  const supportedRelations = relations.filter((relation) => isSupportedJobExperimentRelationType(relation.relationType))

  const items = jobExperimentSupportedRelationTypes.map((type) => {
    const matched = supportedRelations.filter((relation) => relation.relationType === type)
    return {
      type,
      label: jobExperimentRelationLabel(type),
      count: matched.length,
      covered: matched.length > 0,
      summaries: matched
        .map((relation) => relation.relationSummary?.trim())
        .filter((summary): summary is string => Boolean(summary))
    }
  })

  return {
    total: items.length,
    covered: items.filter((item) => item.covered).length,
    missingTypes: items.filter((item) => !item.covered).map((item) => item.type),
    items
  }
}
