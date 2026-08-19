import type { ResumeDeliveryDraft } from '@/types/resumeDelivery'
import { buildResumeProjectPreviewBullets } from '@/features/resume-project-preview'

export const RESUME_TEMPLATE_CODES = [
  'ATS_SINGLE_COLUMN',
  'ATS_COMPACT',
  'ATS_PROJECT_FOCUS',
  'ATS_CLASSIC_SIDEBAR',
  'ATS_STREAK_SIGNATURE'
] as const

export type ResumeTemplateCode = typeof RESUME_TEMPLATE_CODES[number]
export type ResumeAccent = 'ocean' | 'teal' | 'graphite' | 'berry'
export type ResumePreviewDensity = 'comfortable' | 'compact'
export const RESUME_STREAK_TEMPLATE_UNLOCK_DAYS = 7
export type ResumeTemplateAtsRisk = 'LOW' | 'MEDIUM'
export type ResumeExportCheckState = 'PASS' | 'WARNING' | 'REVIEW'

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
  roleFit: string
  pageTendency: string
  atsRisk: ResumeTemplateAtsRisk
  atsRiskLabel: string
  atsRiskDetail: string
  typographyLayout: string
  unlockStreakDays?: number
}

export interface ResumeExportCheckItem {
  key: string
  label: string
  detail: string
  state: ResumeExportCheckState
  heuristic?: boolean
}

export interface ResumeExportCheckInput extends ResumeDocumentDraft {
  templateCode?: ResumeTemplateCode | string
  isSaved: boolean
}

export const resumeTemplateOptions: ResumeTemplateOption[] = [
  {
    code: 'ATS_SINGLE_COLUMN',
    name: '极光绿',
    description: '清晰时间线与强调色标题，适合通用投递',
    shortLabel: '极光',
    className: 'professional',
    roleFit: '通用岗位、研发、产品与运营',
    pageTendency: '内容适中时偏 1 页，经历较多时自然延展到 2 页',
    atsRisk: 'LOW',
    atsRiskLabel: '低',
    atsRiskDetail: '单栏文本顺序稳定，适合先做通用版本。',
    typographyLayout: 'Arial / 微软雅黑；单栏、时间线优先、标题使用强调色'
  },
  {
    code: 'ATS_COMPACT',
    name: '极简线框',
    description: '收紧字号与间距，适合信息较多的简历',
    shortLabel: '极简',
    className: 'compact',
    roleFit: '研发、测试、数据与有较多项目经历的岗位',
    pageTendency: '更偏向压缩到 1 页，长内容仍可能形成 2 页',
    atsRisk: 'LOW',
    atsRiskLabel: '低',
    atsRiskDetail: '单栏且信息密度高，但过度压缩可能影响人工阅读。',
    typographyLayout: 'Arial / 微软雅黑；较小字号与紧凑行距、单栏、信息密度优先'
  },
  {
    code: 'ATS_PROJECT_FOCUS',
    name: '商务靛蓝',
    description: '技能和项目优先，适合研发与工程岗位',
    shortLabel: '靛蓝',
    className: 'project',
    roleFit: '后端、前端、架构、数据与平台工程',
    pageTendency: '项目较少时偏 1 页，项目证据充分时偏 2 页',
    atsRisk: 'LOW',
    atsRiskLabel: '低',
    atsRiskDetail: '仍为单栏文本流，项目区块更突出，适合按证据投递。',
    typographyLayout: 'Arial / 微软雅黑；技能分组靠前、项目优先、蓝色规则线'
  },
  {
    code: 'ATS_CLASSIC_SIDEBAR',
    name: '雅黑侧栏',
    description: '深色信息侧栏，突出技能与联系方式',
    shortLabel: '侧栏',
    className: 'classic',
    roleFit: '设计、市场、运营及重视视觉层次的岗位',
    pageTendency: '信息适中偏 1 页，侧栏内容过多时容易挤压主栏',
    atsRisk: 'MEDIUM',
    atsRiskLabel: '中',
    atsRiskDetail: '双栏视觉结构可能改变阅读顺序，正式投递前必须核对解析结果。',
    typographyLayout: 'Arial / 微软雅黑；左侧深色信息栏、右侧主内容、视觉层次明显'
  },
  {
    code: 'ATS_STREAK_SIGNATURE',
    name: '连胜典藏',
    description: `连续 ${RESUME_STREAK_TEMPLATE_UNLOCK_DAYS} 天完成关卡后解锁`,
    shortLabel: '典藏',
    className: 'streak',
    roleFit: '需要保留个人风格的通用岗位',
    pageTendency: '内容适中偏 1 页，装饰性边框可能增加有效内容占用',
    atsRisk: 'MEDIUM',
    atsRiskLabel: '中',
    atsRiskDetail: '文字仍保持单栏，但装饰更明显；以正式 PDF/DOCX 结果为准。',
    typographyLayout: 'Arial / 微软雅黑；单栏、暖色边框与轻装饰、标题强调更强',
    unlockStreakDays: RESUME_STREAK_TEMPLATE_UNLOCK_DAYS
  }
]

export const isResumeTemplateUnlocked = (
  template: ResumeTemplateOption,
  streakDays: number
) => !template.unlockStreakDays || Math.max(0, Math.floor(streakDays)) >= template.unlockStreakDays

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
    return {
      key: `project-${String(source.projectId || source.id || index)}`,
      title,
      subtitle: role,
      period,
      meta: techStack,
      bullets: buildResumeProjectPreviewBullets(source).flatMap(splitSentences)
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

const projectTextForChecks = (projects: ResumeDeliveryDraft['projects']) =>
  (projects || [])
    .map((project) => Object.values(project || {})
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join(' '))
    .filter(Boolean)

const resumeContentTextForChecks = (input: ResumeExportCheckInput) => [
  input.summary,
  input.workExperience,
  input.educationExperience,
  ...projectTextForChecks(input.projects)
].map(normalizeText).filter(Boolean).join('\n')

const formatHeuristicPageBand = (contentScore: number, templateCode: ResumeTemplateCode) => {
  const threshold = templateCode === 'ATS_COMPACT'
    ? 2500
    : templateCode === 'ATS_CLASSIC_SIDEBAR'
      ? 2050
      : 2250

  if (contentScore > threshold * 1.25) return '较可能超过 2 页'
  if (contentScore > threshold) return '可能落在 1-2 页'
  return '更接近 1 页'
}

export const buildResumeExportChecks = (
  input: ResumeExportCheckInput
): ResumeExportCheckItem[] => {
  const templateCode = normalizeResumeTemplateCode(input.templateCode)
  const template = resumeTemplateOptions.find((item) => item.code === templateCode) || resumeTemplateOptions[0]
  const model = buildResumeDocumentModel(input)
  const contentText = resumeContentTextForChecks(input)
  const skills = splitSkills(input.skillStack)
  const evidenceText = [
    input.summary,
    input.workExperience,
    input.educationExperience,
    ...projectTextForChecks(input.projects)
  ].map(normalizeText).join(' ').toLocaleLowerCase()
  const evidencedSkills = skills.filter((skill) =>
    skill.length >= 2 && evidenceText.includes(skill.toLocaleLowerCase())
  )
  const contentScore = contentText.length
    + skills.length * 14
    + (input.projects || []).length * 80
  const longBlocks = [
    normalizeText(input.summary),
    normalizeText(input.workExperience),
    normalizeText(input.educationExperience),
    ...projectTextForChecks(input.projects)
  ].filter((block) => block.length >= 520)
  const email = normalizeText(input.email)
  const phone = normalizeText(input.phone)
  const hasReadableEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const phoneDigits = phone.replace(/\D/g, '')
  const hasReadablePhone = !phone || /^[+\d\s().-]+$/.test(phone) && phoneDigits.length >= 7
  const hasContact = Boolean(email || phone)
  const contactTooLong = email.length > 48 || phone.length > 28
  const pageBand = formatHeuristicPageBand(contentScore, templateCode)
  const evidenceTarget = Math.max(1, Math.ceil(skills.length * 0.3))
  const projects = input.projects || []
  const projectsWithResults = projects.filter((project) => Boolean(
    normalizeText(project?.optimizationResult)
    || normalizeText(project?.optimizationResults)
  )).length

  return [
    {
      key: 'saved',
      label: '稳定版本已保存',
      detail: input.isSaved
        ? '当前表单与最近稳定版本一致，可以交给正式导出工作台处理。'
        : '请先保存当前内容；正式 PDF/DOCX 必须绑定不可变的稳定版本。',
      state: input.isSaved ? 'PASS' : 'WARNING'
    },
    {
      key: 'contact-readability',
      label: '联系方式可读性',
      detail: !hasContact
        ? '未找到邮箱或手机号，招聘方无法可靠联系你。'
        : !hasReadableEmail || !hasReadablePhone || contactTooLong
          ? '邮箱或手机号格式看起来不完整，请在正式导出前人工核对字符、空格和区号。'
          : email && phone
            ? '邮箱和手机号均已填写，当前字段长度适合在纸张预览中核对。'
            : '已找到 1 种联系方式；建议同时保留邮箱和手机号，并在导出文件中放大核对。',
      state: !hasContact || !hasReadableEmail || !hasReadablePhone || contactTooLong ? 'WARNING' : 'PASS'
    },
    {
      key: 'page-volume',
      label: '潜在页数（启发式）',
      detail: model.hasContent
        ? `${pageBand}；${template.pageTendency}。这不是实际页数，需以稳定版本导出的正式文件为准。`
        : '还没有足够内容判断页数倾向；填写经历后再复核。',
      state: model.hasContent && pageBand === '更接近 1 页' ? 'PASS' : 'REVIEW',
      heuristic: true
    },
    {
      key: 'page-break-risk',
      label: '分页断裂风险（启发式）',
      detail: longBlocks.length
        ? `发现 ${longBlocks.length} 个较长内容块，项目或经历可能在页尾断开；请到版本分页导出工作台检查正式 PDF/DOCX。`
        : '暂未发现明显超长内容块；浏览器预览不能确认真实分页、字体嵌入或换行结果。',
      state: longBlocks.length ? 'WARNING' : 'REVIEW',
      heuristic: true
    },
    {
      key: 'keyword-evidence',
      label: '关键词证据提示',
      detail: !skills.length
        ? '尚未填写技能关键词，无法检查关键词是否被经历或项目证据支撑。'
        : evidencedSkills.length >= evidenceTarget
          ? `已在摘要、经历或项目中找到 ${evidencedSkills.length} 个关键词的文字证据；仍需结合具体 JD 取舍。`
          : `只有 ${evidencedSkills.length}/${skills.length} 个关键词在摘要、经历或项目中复现，建议补充可核验的使用场景和结果。`,
      state: !skills.length || evidencedSkills.length < evidenceTarget ? 'WARNING' : 'PASS'
    },
    {
      key: 'experience-coverage',
      label: '核心经历完整性',
      detail: normalizeText(input.workExperience) || normalizeText(input.educationExperience)
        ? '已填写工作或教育经历；请确认公司、角色、时间范围和职责边界可被核实。'
        : '工作与教育经历均为空，正式投递前应至少补齐一类可核验经历。',
      state: normalizeText(input.workExperience) || normalizeText(input.educationExperience)
        ? 'PASS'
        : 'WARNING'
    },
    {
      key: 'project-result-evidence',
      label: '项目结果证据',
      detail: !projects.length
        ? '尚未添加项目经历，关键词和能力缺少可追问的项目证据。'
        : projectsWithResults
          ? `${projectsWithResults}/${projects.length} 个项目已填写结果字段；数字与结论仍需在事实审计中核对。`
          : '项目已填写，但没有结果字段；建议补充可核验的性能、效率、稳定性、成本或业务结果。',
      state: projects.length && projectsWithResults ? 'PASS' : 'WARNING'
    },
    {
      key: 'target-position',
      label: '目标岗位已明确',
      detail: input.targetPosition?.trim()
        ? `当前目标：${normalizeText(input.targetPosition)}。导出后仍建议按具体 JD 调整关键词顺序。`
        : '未填写目标岗位，无法判断模板和关键词是否适合本次投递。',
      state: input.targetPosition?.trim() ? 'PASS' : 'WARNING'
    }
  ]
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
  if (code === 'ATS_CLASSIC_SIDEBAR') {
    return ['summary', 'experience', 'projects', 'education']
  }
  return ['summary', 'experience', 'projects', 'skills', 'education']
}
