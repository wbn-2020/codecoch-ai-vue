import type { TagProps } from 'element-plus'

export const missingFieldLabels: Record<string, string> = {
  background: '业务背景',
  responsibility: '个人贡献',
  difficulty: '技术难点',
  solution: '解决方案',
  result: '量化结果',
  reflection: '复盘沉淀',
  skillEvidence: '能力证据'
}

export const normalizeMissingFields = (fields?: string[] | string | null): string[] => {
  if (!fields) return []
  const keys = Array.isArray(fields) ? fields : fields.split(',')
  return keys
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => missingFieldLabels[field] || field)
}

export const getCompletenessTone = (status?: string | null): TagProps['type'] => {
  if (status === 'READY') return 'success'
  if (status === 'NEEDS_IMPROVEMENT') return 'warning'
  if (status === 'INCOMPLETE') return 'danger'
  return 'info'
}

export const getStrengthTone = (strength?: string | null): TagProps['type'] => {
  if (strength === 'STRONG') return 'success'
  if (strength === 'WEAK') return 'warning'
  return 'info'
}

export const summarizeSourceState = (source: {
  sourceResumeId?: number | null
  sourceResumeProjectId?: number | null
  sourceAvailable?: boolean | null
}) => {
  if (!source.sourceResumeId || !source.sourceResumeProjectId) return '手动创建'
  return source.sourceAvailable === false ? '原简历项目已不可用' : '来自简历项目'
}
