export interface ResumeProjectPreviewSection {
  key: 'background' | 'core' | 'technical' | 'outcome' | 'supplement'
  title: string
  values: string[]
}

type ProjectRecord = Record<string, unknown>

const sectionDefinitions: Array<{
  key: ResumeProjectPreviewSection['key']
  title: string
  fields: string[]
}> = [
  { key: 'background', title: '项目背景', fields: ['projectBackground', 'description'] },
  { key: 'core', title: '核心功能', fields: ['coreFeatures', 'highlights'] },
  { key: 'technical', title: '技术难点', fields: ['technicalChallenges', 'technicalDifficulties'] },
  { key: 'outcome', title: '结果指标', fields: ['optimizationResult', 'optimizationResults'] },
  { key: 'supplement', title: '补充说明', fields: ['extraInfo'] }
]

const normalizeText = (value: unknown) =>
  typeof value === 'string'
    ? value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim()
    : ''

const normalizedIdentity = (value: string) => value.replace(/\s+/g, ' ').toLocaleLowerCase()

const splitValues = (value: unknown) => {
  const text = normalizeText(value)
  if (!text) return []

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:(?:[-*•·])\s*|(?:\d+[.)、])\s+)/, '').trim())
    .filter(Boolean)

  return lines.length > 1 ? lines : [text]
}

/**
 * Produces the single source of truth for project preview content. Alias fields
 * are ordered by authority and identical text is rendered once across the project.
 */
export const buildResumeProjectPreviewSections = (
  project?: ProjectRecord | null
): ResumeProjectPreviewSection[] => {
  const source = project || {}
  const rendered = new Set<string>()

  return sectionDefinitions
    .map((definition) => {
      const values = definition.fields
        .flatMap((field) => splitValues(source[field]))
        .filter((value) => {
          const identity = normalizedIdentity(value)
          if (!identity || rendered.has(identity)) return false
          rendered.add(identity)
          return true
        })
      return { key: definition.key, title: definition.title, values }
    })
    .filter((section) => section.values.length)
}

export const buildResumeProjectPreviewBullets = (
  project?: ProjectRecord | null
) => buildResumeProjectPreviewSections(project)
  .flatMap((section) => section.values.map((value) => `${section.title}：${value}`))
