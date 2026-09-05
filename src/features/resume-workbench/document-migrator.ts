import {
  buildNarrativeEntries,
  normalizeText,
  splitSkills,
  splitSentences,
  groupSkills,
  type ResumeTemplateCode
} from '@/features/resume-document'
import {
  DEFAULT_BUILTIN_SECTION_TITLES,
  RESUME_BUILTIN_SECTION_KEYS,
  type ResumeBlock,
  type ResumeDocumentV2,
  type ResumeEntryItem,
  type ResumeProjectItem,
  type ResumeSection,
  type ResumeSkillGroupItem
} from '@/features/resume-workbench/document'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import type { ResumeProjectVO } from '@/types/resume'

let idCounter = 0
export const nextDocumentId = (prefix: string) => {
  idCounter = (idCounter + 1) % 100000
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface LegacyResumeScalars {
  resumeName?: string
  realName?: string
  email?: string
  phone?: string
  targetPosition?: string
  summary?: string
  skills?: string
  skillStack?: string
  workSummary?: string
  workExperience?: string
  education?: string
  educationExperience?: string
}

/** 行首圆点标记：ATS 文本用 "- " 表达要点，所以只有它需要在扁平列与块类型之间无损往返。 */
const BULLET_MARKER = /^\s*[-*•·]\s+/

/**
 * 摘要扁平列 → 内容块：行首圆点决定块类型，长句继续按句切分。
 * 与服务器 ResumeDocumentMigrator 的摘要分支保持同一规则，投影回写时才不会吃掉用户手写的列表符号。
 */
const summaryToBlocks = (text: string | undefined, prefix: string): ResumeBlock[] => {
  const blocks: ResumeBlock[] = []
  String(text || '')
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const marker = BULLET_MARKER.exec(line)
      const kind: ResumeBlock['kind'] = marker ? 'bullet' : 'line'
      const body = marker ? line.slice(marker[0].length).trim() : line
      splitSentences(body).forEach((sentence) => {
        blocks.push({ id: `${prefix}-b${blocks.length}`, kind, text: sentence })
      })
    })
  return blocks
}

const entriesToBlocksStyle = (
  raw: string | undefined,
  fallbackTitle: string,
  prefix: string
): ResumeEntryItem[] =>
  buildNarrativeEntries(raw, fallbackTitle, prefix).map((entry, index) => ({
    id: `${prefix}-e${index}`,
    heading: entry.title || '',
    subheading: entry.subtitle || '',
    period: entry.period || '',
    meta: entry.meta || '',
    blocks: (entry.bullets || []).map((text, bIndex) => ({
      id: `${prefix}-e${index}-b${bIndex}`,
      kind: 'bullet' as const,
      text
    }))
  }))

const skillGroupsToItems = (raw: string | undefined, prefix: string): ResumeSkillGroupItem[] => {
  const skills = splitSkills(raw)
  if (!skills.length) return []
  const groups = groupSkills(skills)
  if (groups.length <= 1) {
    return [{ id: `${prefix}-g0`, label: '', items: skills }]
  }
  return groups.map((group, index) => ({ id: `${prefix}-g${index}`, label: group.label, items: group.items }))
}

/** 项目行 → 文档条目：id 由 serverId 决定，重排与二次同步都不会漂移。 */
export const projectToDocumentItem = (project: ResumeProjectVO, index: number): ResumeProjectItem => {
  const id = `prj-${project.projectId ?? project.id ?? index}`
  const field = (value: string | undefined, prefix: string): ResumeBlock[] =>
    splitSentences(normalizeText(value)).map((text, bIndex) => ({
      id: `${prefix}-${bIndex}`,
      kind: 'bullet' as const,
      text
    }))
  return {
    id,
    serverId: project.projectId ?? project.id,
    name: normalizeText(project.projectName),
    period: normalizeText(project.projectTime || project.projectPeriod || ''),
    role: normalizeText(project.role || project.responsibility || ''),
    techStack: normalizeText(project.techStack || ''),
    fields: {
      background: field(project.projectBackground || project.description, `${id}-bg`),
      coreFeatures: field(project.coreFeatures || project.highlights, `${id}-core`),
      technicalChallenges: field(
        project.technicalChallenges || project.technicalDifficulties,
        `${id}-tech`
      ),
      outcome: field(project.optimizationResult || project.optimizationResults, `${id}-out`),
      supplement: field(project.extraInfo, `${id}-sup`)
    },
    sort: project.sort ?? project.sortOrder ?? index
  }
}

export const defaultBuiltinSections = (): ResumeSection[] =>
  RESUME_BUILTIN_SECTION_KEYS.map((key) => {
    const base = { id: `sec-${key}`, title: DEFAULT_BUILTIN_SECTION_TITLES[key], visible: true, builtinKey: key }
    switch (key) {
      case 'summary':
        return { ...base, kind: 'text' as const, content: { blocks: [] } }
      case 'skills':
        return { ...base, kind: 'skills' as const, content: { groups: [] } }
      case 'experience':
      case 'education':
        return { ...base, kind: 'entry' as const, content: { items: [] } }
      default:
        return { ...base, kind: 'project' as const, content: { items: [] } }
    }
  })

const reorderBuiltins = (sections: ResumeSection[], order: string[] | undefined): ResumeSection[] => {
  if (!order || !order.length) return sections
  const byKey = new Map(sections.map((section) => [section.builtinKey || section.id, section]))
  const ordered = order
    .map((key) => byKey.get(key))
    .filter((section): section is ResumeSection => Boolean(section))
  const rest = sections.filter((section) => !ordered.includes(section))
  return [...ordered, ...rest]
}

const applyHidden = (sections: ResumeSection[], hidden: string[] | undefined): ResumeSection[] => {
  if (!hidden || !hidden.length) return sections
  const hiddenSet = new Set(hidden)
  return sections.map((section) =>
    section.builtinKey && hiddenSet.has(section.builtinKey) ? { ...section, visible: false } : section
  )
}

/** legacy 扁平字段 + projects + presentationConfig → 文档 v2（确定性 id 前缀，便于幂等测试）。 */
export const toResumeDocument = (
  legacy: LegacyResumeScalars,
  projects: ResumeProjectVO[],
  presentation?: ResumePresentationConfig | null
): ResumeDocumentV2 => {
  const summaryText = normalizeText(legacy.summary)
  const workText = legacy.workSummary || legacy.workExperience
  const eduText = legacy.education || legacy.educationExperience
  const skillRaw = legacy.skillStack || legacy.skills

  let sections: ResumeSection[] = defaultBuiltinSections().map((section) => {
    switch (section.builtinKey) {
      case 'summary':
        return section.kind === 'text'
          ? { ...section, content: { blocks: summaryToBlocks(summaryText, 'sec-summary') } }
          : section
      case 'skills':
        return section.kind === 'skills'
          ? { ...section, content: { groups: skillGroupsToItems(skillRaw, 'sec-skills') } }
          : section
      case 'experience':
        return section.kind === 'entry'
          ? { ...section, content: { items: entriesToBlocksStyle(workText, '工作经历', 'sec-work') } }
          : section
      case 'education':
        return section.kind === 'entry'
          ? { ...section, content: { items: entriesToBlocksStyle(eduText, '教育经历', 'sec-edu') } }
          : section
      case 'projects':
        return section.kind === 'project'
          ? { ...section, content: { items: (projects || []).map(projectToDocumentItem) } }
          : section
      default:
        return section
    }
  })
  sections = reorderBuiltins(sections, presentation?.sectionOrder as string[] | undefined)
  sections = applyHidden(sections, presentation?.hiddenSections as string[] | undefined)

  const contacts = [
    { kind: 'phone' as const, value: normalizeText(legacy.phone), label: '电话', iconKey: 'phone' as const },
    { kind: 'email' as const, value: normalizeText(legacy.email), label: '邮箱', iconKey: 'mail' as const }
  ]
    .filter((contact) => contact.value)
    .map((contact) => ({ ...contact, id: `contact-${contact.kind}`, visible: true, showLabel: false }))

  return {
    schemaVersion: 2,
    basics: {
      name: normalizeText(legacy.realName),
      headline: normalizeText(legacy.targetPosition),
      contacts
    },
    layout: {
      templateCode: (presentation?.templateCode || 'ATS_SINGLE_COLUMN') as ResumeTemplateCode,
      templateVersion: presentation?.templateVersion || 1,
      accentColor: presentation?.accentColor || 'default',
      fontFamily: presentation?.fontFamily || 'Arial',
      fontScale: presentation?.fontScale ?? 1,
      lineHeight: presentation?.lineHeight ?? 1.2,
      sectionSpacing: presentation?.sectionSpacing ?? 1,
      pageMarginPt: presentation?.pageMarginPt ?? 42,
      autoOnePage: presentation?.autoOnePage ?? false,
      basicLayout: presentation?.basicLayout || 'LEFT',
      iconMode: presentation?.iconMode || 'ICON',
      pageSize: 'A4',
      ...(presentation?.overrides ? { overrides: presentation.overrides } : {})
    },
    sections
  }
}

export interface LegacyProjection {
  realName: string
  targetPosition: string
  email: string
  phone: string
  summary: string
  skillStack: string
  workExperience: string
  educationExperience: string
  sectionOrder: string[]
  hiddenSections: string[]
  projects: ResumeProjectVO[]
}

const blocksToText = (blocks: ResumeBlock[]) =>
  blocks
    .map((block) => (block.kind === 'bullet' ? `- ${block.text}` : block.text))
    .filter((line) => line.length > 0)
    .join('\n')

const entryToText = (item: ResumeEntryItem) =>
  joinNonEmpty([
    item.heading && item.period ? `${item.heading}    ${item.period}` : item.heading || item.period,
    item.subheading,
    item.meta,
    ...blocksToLines(item.blocks)
  ]).join('\n')

const blocksToLines = (blocks: ResumeBlock[]) =>
  blocks.map((block) => (block.kind === 'bullet' ? `- ${block.text}` : block.text)).filter((line) => line.length)

const joinNonEmpty = (values: Array<string | undefined>) =>
  values.filter((value): value is string => Boolean(value && value.trim().length))

/** 文档 v2 → legacy 标量投影（写回扁平列 / 老客户端兼容）。 */
export const fromResumeDocument = (document: ResumeDocumentV2): LegacyProjection => {
  const builtin = (key: string) => document.sections.find((section) => section.builtinKey === key)
  const summarySection = builtin('summary')
  const skillsSection = builtin('skills')
  const workSection = builtin('experience')
  const eduSection = builtin('education')
  const projectSection = builtin('projects')

  const skillsText =
    skillsSection && skillsSection.kind === 'skills'
      ? skillsSection.content.groups.flatMap((group) => group.items).join('、')
      : ''

  const projectedProjects: ResumeProjectVO[] =
    projectSection && projectSection.kind === 'project'
      ? projectSection.content.items.map((item, index) => ({
          projectId: item.serverId as number,
          projectName: item.name,
          projectTime: item.period,
          role: item.role,
          techStack: item.techStack,
          projectBackground: blocksToText(item.fields.background),
          coreFeatures: blocksToText(item.fields.coreFeatures),
          technicalChallenges: blocksToText(item.fields.technicalChallenges),
          optimizationResult: blocksToText(item.fields.outcome),
          extraInfo: blocksToText(item.fields.supplement),
          sort: item.sort ?? index
        }))
      : []

  const phone = document.basics.contacts.find((contact) => contact.kind === 'phone')?.value || ''
  const email = document.basics.contacts.find((contact) => contact.kind === 'email')?.value || ''

  return {
    realName: document.basics.name,
    targetPosition: document.basics.headline,
    email,
    phone,
    summary: summarySection && summarySection.kind === 'text' ? blocksToText(summarySection.content.blocks) : '',
    skillStack: skillsText,
    workExperience:
      workSection && workSection.kind === 'entry'
        ? workSection.content.items.map(entryToText).join('\n\n')
        : '',
    educationExperience:
      eduSection && eduSection.kind === 'entry'
        ? eduSection.content.items.map(entryToText).join('\n\n')
        : '',
    sectionOrder: document.sections
      .filter((section) => section.builtinKey)
      .map((section) => section.builtinKey as string),
    hiddenSections: document.sections
      .filter((section) => section.builtinKey && !section.visible)
      .map((section) => section.builtinKey as string),
    projects: projectedProjects
  }
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * 老客户端只能表达扁平列：用它重建内置分区内容，同时保留自定义分区、分区顺序与可见性。
 * 与服务器 ResumeDocumentStore.mergeFlatEdit 保持同一规则。
 */
export const mergeFlatEdit = (
  existing: ResumeDocumentV2,
  legacy: LegacyResumeScalars,
  projects: ResumeProjectVO[],
  presentation?: ResumePresentationConfig | null
): ResumeDocumentV2 => {
  const migrated = toResumeDocument(legacy, projects, presentation)
  const fresh = new Map(
    migrated.sections
      .filter((section): section is ResumeSection & { builtinKey: string } => Boolean(section.builtinKey))
      .map((section) => [section.builtinKey, section])
  )
  const used = new Set<string>()
  const sections: ResumeSection[] = []

  existing.sections.forEach((section) => {
    const key = section.builtinKey
    if (!key) {
      sections.push(clone(section))
      return
    }
    const replacement = fresh.get(key)
    if (!replacement) return
    used.add(key)
    sections.push({
      ...clone(replacement),
      id: section.id || replacement.id,
      title: section.title?.trim() || replacement.title,
      visible: section.visible !== false
    } as ResumeSection)
  })

  fresh.forEach((section, key) => {
    if (!used.has(key)) sections.push(section)
  })

  const customContacts = existing.basics.contacts.filter(
    (contact) => contact.kind !== 'phone' && contact.kind !== 'email'
  )
  return {
    ...migrated,
    basics: {
      ...migrated.basics,
      contacts: [...migrated.basics.contacts, ...customContacts]
    },
    sections
  }
}
