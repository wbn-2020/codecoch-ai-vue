import type { JobSearchExperimentMetricsVO } from '@/types/jobExperiment'

export const jobExperimentRelationOptions = [
  { label: '简历版本', value: 'RESUME_VERSION' },
  { label: '岗位目标', value: 'TARGET_JOB' },
  { label: 'JD 分析', value: 'JD_ANALYSIS' },
  { label: '投递记录', value: 'JOB_APPLICATION' },
  { label: '项目证据', value: 'PROJECT_EVIDENCE' }
]

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
  metrics?: Partial<Pick<JobSearchExperimentMetricsVO, 'sampleInsufficient' | 'sampleWarning' | 'applicationCount' | 'interviewCompletedCount'>>
) => Boolean(
  metrics?.sampleInsufficient ||
  metrics?.sampleWarning ||
  (metrics?.applicationCount ?? 0) < 10 ||
  (metrics?.interviewCompletedCount ?? 0) < 3
)
