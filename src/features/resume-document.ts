import type { ResumeDeliveryDraft } from '@/types/resumeDelivery'

export const RESUME_TEMPLATE_CODES = [
  'ATS_SINGLE_COLUMN',
  'ATS_COMPACT',
  'ATS_PROJECT_FOCUS'
] as const

export type ResumeTemplateCode = typeof RESUME_TEMPLATE_CODES[number]
export type ResumeAccent = 'ocean' | 'teal' | 'graphite' | 'berry'
export type ResumePreviewDensity = 'comfortable' | 'compact'

export interface ResumeDocumentDraft extends ResumeDeliveryDraft {
  resumeName?: string
}

export interface ResumeDocumentEntry {
  key: string
  title: string
  subtitle?: string
  period?: string
  meta?: string
  bullets: string[]
}

export interface ResumeSkillGroup {
  label: string
  items: string[]
}

export interface ResumeDocumentModel {
  name: string
  targetPosition: string
  contacts: string[]
  summary: string[]
  skills: string[]
  skillGroups: ResumeSkillGroup[]
  workEntries: ResumeDocumentEntry[]
  educationEntries: ResumeDocumentEntry[]
  projectEntries: ResumeDocumentEntry[]
  hasContent: boolean
}

export interface ResumeTemplateOption {
  code: ResumeTemplateCode
  name: string
  description: string
  shortLabel: string
  className: string
}

export const resumeTemplateOptions: ResumeTemplateOption[] = [
  {
    code: 'ATS_SINGLE_COLUMN',
    name: '经典专业',
    description: '清晰时间线与强调色标题，适合通用投递',
    shortLabel: '专业',
    className: 'professional'
  },
  {
    code: 'ATS_COMPACT',
    name: '紧凑一页',
    description: '收紧字号与间距，适合信息较多的简历',
    shortLabel: '紧凑',
    className: 'compact'
  },
  {
    code: 'ATS_PROJECT_FOCUS',
    name: '技术项目',
    description: '技能和项目优先，适合研发与工程岗位',
    shortLabel: '项目',
    className: 'project'
  }
]

export const normalizeResumeTemplateCode = (value?: string): ResumeTemplateCode =>
  RESUME_TEMPLATE_CODES.includes(value as ResumeTemplateCode)
    ? value as ResumeTemplateCode
    : 'ATS_SINGLE_COLUMN'

const normalizeText = (value: unknown) =>
  String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

const splitLines = (value: unknown) =>
  normalizeText(value)
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:(?:[-*•·])\s*|(?:\d+[.)、])\s+)/, '').trim())
    .filter(Boolean)

const splitSentences = (value: string) => {
  if (!value) return []
  const explicit = splitLines(value)
  if (explicit.length > 1) return explicit
  if (value.length < 58) return [value]
  return value
    .split(/(?<=[。！？；;])\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const dateRangePattern =
  /((?:19|20)\d{2}(?:[./-]\d{1,2})?\s*(?:-|–|—|至|~)\s*(?:(?:19|20)\d{2}(?:[./-]\d{1,2})?|至今|现在|Present))$/i

const splitTitleAndPeriod = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  const match = normalized.match(dateRangePattern)
  if (!match) return { title: normalized, period: '' }
  return {
    title: normalized.slice(0, match.index).trim().replace(/[|·｜]\s*$/, ''),
    period: match[1].replace(/—/g, '-')
  }
}

const isSectionHeading = (value: string, fallbackTitle: string) =>
  value.replace(/\s+/g, '').replace(/[：:]/g, '') === fallbackTitle

const isLikelyEntryTitle = (
  value: string,
  period: string,
  fallbackTitle: string
) => {
  if (!value) return false
  if (/^(?:负责|参与|主导|推动|协助|就读|毕业(?:于)?|主修|获得|担任|在[^|｜·]{1,24}(?:(?:期间|任职(?:期间)?|就读(?:期间)?|学习(?:期间)?)(?:主修|负责|参与|担任|学习|工作|获得)|工作(?:期间|时|中)?(?:负责|参与|担任|完成|实现|推动|协助))|完成(?:了|某|项目|系统)|实现(?:了|某|系统|功能|项目)|优化(?:了|某|系统|性能|流程|项目)|维护(?:了|过|某|系统|服务|项目)|支持(?:了|某|系统|项目))/.test(value)) {
    return false
  }
  if (period || /[|｜·]/.test(value)) return true
  if (value.length > 45 || /[。！？；;]/.test(value)) return false

  if (fallbackTitle === '工作经历') {
    return /(?:公司|集团|科技|银行|研究院|事务所|工作室|实验室)/.test(value)
      && /(?:工程师|开发|架构|产品|运营|设计|经理|主管|顾问|实习|负责人)/.test(value)
  }

  return /(?:大学|学院|学校|研究院)/.test(value)
}

const buildNarrativeEntries = (
  value: unknown,
  fallbackTitle: string,
  prefix: string
): ResumeDocumentEntry[] => {
  const normalized = normalizeText(value)
  if (!normalized) return []

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.map((block, index): ResumeDocumentEntry | null => {
    const lines = splitLines(block)
      .filter((line) => !isSectionHeading(line, fallbackTitle))
    if (!lines.length) return null

    const first = lines[0]
    const { title, period } = splitTitleAndPeriod(first)
    const hasDistinctTitle = isLikelyEntryTitle(title, period, fallbackTitle)
    const hasStandalonePeriod = Boolean(period && !title)
    const followingPeriod = hasDistinctTitle && !period && lines[1]
      ? splitTitleAndPeriod(lines[1])
      : { title: '', period: '' }
    const hasFollowingPeriod = Boolean(followingPeriod.period && !followingPeriod.title)
    const bodyStart = hasDistinctTitle
      ? hasFollowingPeriod ? 2 : 1
      : hasStandalonePeriod ? 1 : 0
    const bodyLines = lines.slice(bodyStart)
    const entryPeriod = hasDistinctTitle || hasStandalonePeriod
      ? period || followingPeriod.period
      : ''

    return {
      key: `${prefix}-${index}`,
      title: hasDistinctTitle ? title : '',
      period: entryPeriod,
      bullets: bodyLines.flatMap(splitSentences)
    }
  }).filter((entry): entry is ResumeDocumentEntry => Boolean(entry))
}

const splitSkills = (value: unknown) =>
  normalizeText(value)
    .split(/[，,、\n/|；;]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const matchesAny = (value: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(value))

const groupSkills = (skills: string[]): ResumeSkillGroup[] => {
  const buckets: Record<string, string[]> = {
    语言与基础: [],
    框架与架构: [],
    数据与中间件: [],
    工程实践: []
  }

  skills.forEach((skill) => {
    if (matchesAny(skill, [
      /\b(?:java|kotlin|go|golang|python|c\+\+|c#|javascript|typescript|sql|html|css)\b/i,
      /算法|数据结构|计算机网络|操作系统/
    ])) {
      buckets['语言与基础'].push(skill)
      return
    }
    if (matchesAny(skill, [
      /spring|vue|react|angular|node|nestjs|django|flask|微服务|分布式|ddd|架构/i
    ])) {
      buckets['框架与架构'].push(skill)
      return
    }
    if (matchesAny(skill, [
      /mysql|postgres|oracle|redis|mongo|kafka|rabbit|rocket|mq|elasticsearch|clickhouse|数据库/i
    ])) {
      buckets['数据与中间件'].push(skill)
      return
    }
    buckets['工程实践'].push(skill)
  })

  return Object.entries(buckets)
    .filter(([, items]) => items.length)
    .map(([label, items]) => ({ label, items }))
}

const projectText = (
  project: Record<string, unknown>,
  keys: string[]
) => keys.map((key) => normalizeText(project[key])).find(Boolean) || ''

const buildProjectEntries = (
  projects: ResumeDeliveryDraft['projects']
): ResumeDocumentEntry[] =>
  (projects || []).map((project, index) => {
    const source = project || {}
    const title = projectText(source, ['projectName', 'title']) || `项目经历 ${index + 1}`
    const period = projectText(source, ['projectTime', 'projectPeriod'])
    const role = projectText(source, ['role', 'responsibility'])
    const techStack = projectText(source, ['techStack'])
    const bulletSource = [
      projectText(source, ['projectBackground', 'description']),
      projectText(source, ['coreFeatures']),
      projectText(source, ['highlights']),
      projectText(source, ['technicalChallenges', 'technicalDifficulties']),
      projectText(source, ['optimizationResult', 'optimizationResults']),
      projectText(source, ['extraInfo'])
    ].filter(Boolean)

    return {
      key: `project-${String(source.projectId || source.id || index)}`,
      title,
      subtitle: role,
      period,
      meta: techStack,
      bullets: bulletSource.flatMap(splitSentences)
    }
  })

export const buildResumeDocumentModel = (
  draft: ResumeDocumentDraft
): ResumeDocumentModel => {
  const skills = splitSkills(draft.skillStack)
  const summary = splitSentences(normalizeText(draft.summary))
  const workEntries = buildNarrativeEntries(draft.workExperience, '工作经历', 'work')
  const educationEntries = buildNarrativeEntries(draft.educationExperience, '教育经历', 'education')
  const projectEntries = buildProjectEntries(draft.projects)
  const realName = normalizeText(draft.realName)
  const targetPosition = normalizeText(draft.targetPosition)
  const contacts = [draft.phone, draft.email].map(normalizeText).filter(Boolean)
  const hasContent = Boolean(
    realName
    || targetPosition
    || summary.length
    || skills.length
    || workEntries.length
    || educationEntries.length
    || projectEntries.length
  )

  return {
    name: realName || '姓名',
    targetPosition: targetPosition || '目标岗位',
    contacts,
    summary,
    skills,
    skillGroups: groupSkills(skills),
    workEntries,
    educationEntries,
    projectEntries,
    hasContent
  }
}

export const resumeTemplateSectionOrder = (
  code: ResumeTemplateCode
): Array<'summary' | 'skills' | 'experience' | 'projects' | 'education'> => {
  if (code === 'ATS_COMPACT') {
    return ['summary', 'skills', 'experience', 'projects', 'education']
  }
  if (code === 'ATS_PROJECT_FOCUS') {
    return ['summary', 'skills', 'projects', 'experience', 'education']
  }
  return ['summary', 'experience', 'projects', 'skills', 'education']
}
