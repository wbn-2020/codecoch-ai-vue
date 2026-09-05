import type { ResumeBlock, ResumeDocumentV2, ResumeSection } from '@/features/resume-workbench/document'

/**
 * v2 身份式锚点（重排安全），path 文法（段 = 前缀:值，以 / 分隔）：
 *   section:<id>                                       分区整体纯文本
 *   section:<id>/block:<id>                            text / custom(text) 的某块
 *   section:<id>/group:<idx>                           skills 某分组
 *   section:<id>/item:<id>                             entry|project 条目整体
 *   section:<id>/item:<id>/field:<name>                条目标量字段
 *   section:<id>/item:<id>/blocks:<field>              条目块组（entry 的 blocks 或项目 fields.<key>）
 *   section:<id>/item:<id>/block:<id>                  条目内某块（含项目字段块）
 */

const joinLines = (values: Array<string | undefined | null>) =>
  values.filter((value): value is string => Boolean(value && value.length)).join('\n')

const blockLine = (block: ResumeBlock) =>
  `${block.kind === 'bullet' ? '- ' : block.kind === 'ordered' ? '1. ' : ''}${block.text}`

export interface EntryLike {
  id: string
  heading?: string
  subheading?: string
  period?: string
  meta?: string
  blocks?: ResumeBlock[]
}

export type ProjectLikeItem = {
  id: string
  name: string
  period: string
  role: string
  techStack: string
  fields: Record<string, ResumeBlock[]>
}

type Segment = [key: string, value: string]

const parseAnchor = (path: string): { sectionId: string; segments: Segment[] } | null => {
  const parts = path.split('/')
  if (!parts[0]?.startsWith('section:')) return null
  const sectionId = parts[0].slice('section:'.length)
  if (!sectionId) return null
  const segments: Segment[] = []
  for (const raw of parts.slice(1)) {
    const idx = raw.indexOf(':')
    if (idx <= 0) return null
    segments.push([raw.slice(0, idx), raw.slice(idx + 1)])
  }
  return { sectionId, segments }
}

const entryScalarFields = ['heading', 'subheading', 'period', 'meta'] as const
const projectScalarFields = ['name', 'period', 'role', 'techStack'] as const

const sectionOf = (document: ResumeDocumentV2, sectionId: string) =>
  document.sections.find((section) => section.id === sectionId)

const entryItems = (section: ResumeSection): EntryLike[] => {
  if (section.kind === 'entry') return section.content.items
  if (section.kind === 'custom' && section.variant === 'entry') return section.content.items || []
  return []
}

const projectItems = (section: ResumeSection): ProjectLikeItem[] => {
  if (section.kind !== 'project') return []
  return section.content.items as unknown as ProjectLikeItem[]
}

const sectionBlocks = (section: ResumeSection): ResumeBlock[] => {
  if (section.kind === 'text') return section.content.blocks
  if (section.kind === 'custom' && section.variant === 'text') return section.content.blocks || []
  return []
}

const entryPlainText = (item: EntryLike) =>
  joinLines([
    item.heading,
    item.subheading,
    item.period,
    item.meta,
    ...(item.blocks || []).map(blockLine)
  ])

const projectPlainText = (item: ProjectLikeItem) =>
  joinLines([
    item.name,
    item.period,
    item.role,
    item.techStack,
    ...Object.values(item.fields).flat().map(blockLine)
  ])

export const sectionPlainText = (section: ResumeSection): string => {
  switch (section.kind) {
    case 'text':
      return joinLines(sectionBlocks(section).map((block) => block.text))
    case 'skills':
      return joinLines(
        section.content.groups.map((group) => [group.label, ...group.items].filter(Boolean).join('、'))
      )
    case 'entry':
      return joinLines(section.content.items.map(entryPlainText))
    case 'project':
      return joinLines(projectItems(section).map(projectPlainText))
    case 'custom':
      return section.variant === 'entry'
        ? joinLines((section.content.items || []).map(entryPlainText))
        : joinLines((section.content.blocks || []).map((block) => block.text))
    default:
      return ''
  }
}

const findEntry = (section: ResumeSection, itemId: string) =>
  entryItems(section).find((item) => item.id === itemId)

const findProject = (section: ResumeSection, itemId: string) =>
  projectItems(section).find((item) => item.id === itemId)

const entryBlocks = (section: ResumeSection, itemId: string): ResumeBlock[] | null => {
  if (section.kind === 'project') {
    const item = findProject(section, itemId)
    return item ? Object.values(item.fields).flat() : null
  }
  const item = findEntry(section, itemId)
  return item ? item.blocks || [] : null
}

export const resolveAnchorText = (document: ResumeDocumentV2, path: string): string | null => {
  const parsed = parseAnchor(path)
  if (!parsed) return null
  const section = sectionOf(document, parsed.sectionId)
  if (!section) return null
  const { segments } = parsed
  if (segments.length === 0) return sectionPlainText(section)

  const [firstKey, firstValue] = segments[0]
  if (firstKey === 'block' && segments.length === 1) {
    return sectionBlocks(section).find((block) => block.id === firstValue)?.text ?? null
  }
  if (firstKey === 'group' && section.kind === 'skills') {
    const group = section.content.groups[Number(firstValue)]
    return group ? [group.label, ...group.items].filter(Boolean).join('、') : null
  }
  if (firstKey === 'item') {
    const isProject = section.kind === 'project'
    const exists = isProject ? findProject(section, firstValue) : findEntry(section, firstValue)
    if (!exists) return null
    if (segments.length === 1) {
      return isProject ? projectPlainText(exists as ProjectLikeItem) : entryPlainText(exists)
    }

    const [secondKey, secondValue] = segments[1]
    if (secondKey === 'field') {
      const allowed = isProject ? projectScalarFields : entryScalarFields
      if (!allowed.includes(secondValue as never)) return null
      return ((exists as unknown as Record<string, string>)[secondValue] ?? '')
    }
    if (secondKey === 'blocks') {
      const blocks = isProject
        ? (secondValue
            ? ((exists as unknown as ProjectLikeItem).fields[secondValue] ?? null)
            : Object.values((exists as unknown as ProjectLikeItem).fields).flat())
        : (exists as EntryLike).blocks || []
      if (blocks == null) return null
      if (segments.length === 3 && segments[2][0] === 'block') {
        return blocks.find((block) => block.id === segments[2][1])?.text ?? null
      }
      return joinLines(blocks.map((block) => block.text))
    }
    if (secondKey === 'block') {
      const blocks = isProject
        ? Object.values((exists as unknown as ProjectLikeItem).fields).flat()
        : (exists as EntryLike).blocks || []
      return blocks.find((block) => block.id === secondValue)?.text ?? null
    }
  }
  return null
}

const linesToBlocks = (existing: ResumeBlock[], replacement: string, prefix: string): ResumeBlock[] =>
  replacement.split(/\n/).map((raw, index) => {
    const isBullet = /^\s*(?:[-*•·])\s/.test(raw)
    const isOrdered = /^\s*\d+[.)、]\s/.test(raw)
    const text = raw.replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/, '').trim()
    return {
      id: existing[index]?.id || `${prefix}-${index}`,
      kind: isBullet ? 'bullet' : isOrdered ? 'ordered' : 'line',
      text
    }
  })

const mapEntries = (section: ResumeSection, fn: (item: EntryLike) => EntryLike): ResumeSection => {
  if (section.kind === 'entry')
    return {
      ...section,
      content: { items: section.content.items.map(fn) as typeof section.content.items }
    }
  if (section.kind === 'custom' && section.variant === 'entry')
    return {
      ...section,
      content: {
        ...section.content,
        items: (section.content.items || []).map(fn) as typeof section.content.items
      }
    }
  return section
}

const replaceInSection = (section: ResumeSection, segments: Segment[], replacement: string): ResumeSection => {
  if (segments.length === 0) return section
  const [[firstKey, firstValue], second] = segments

  if (firstKey === 'block' && segments.length === 1) {
    const blocks = sectionBlocks(section).map((block) =>
      block.id === firstValue ? { ...block, text: replacement } : block
    )
    if (section.kind === 'text') return { ...section, content: { blocks } }
    if (section.kind === 'custom' && section.variant === 'text')
      return { ...section, content: { ...section.content, blocks } }
    return section
  }

  if (firstKey === 'group' && section.kind === 'skills') {
    const groups = section.content.groups.map((group, index) => {
      if (index !== Number(firstValue)) return group
      const parts = replacement.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
      return { ...group, label: parts[0] ?? group.label, items: parts.length > 1 ? parts.slice(1) : group.items }
    })
    return { ...section, content: { groups } }
  }

  if (firstKey !== 'item') return section

  if (section.kind === 'project') {
    const items = (section.content.items as unknown as ProjectLikeItem[]).map((item) => {
      if (item.id !== firstValue || !second) return item
      const [secondKey, secondValue] = second
      if (secondKey === 'field' && projectScalarFields.includes(secondValue as never)) {
        return { ...item, [secondValue]: replacement }
      }
      if (secondKey === 'blocks' && !(secondValue in item.fields)) return item
      if (secondKey === 'blocks') {
        return {
          ...item,
          fields: {
            ...item.fields,
            [secondValue]: linesToBlocks(item.fields[secondValue], replacement, `${item.id}-${secondValue}`)
          }
        }
      }
      if (secondKey === 'block') {
        const fields = Object.fromEntries(
          Object.entries(item.fields).map(([key, blocks]) => [
            key,
            (blocks as ResumeBlock[]).map((block) =>
              block.id === secondValue ? { ...block, text: replacement } : block
            )
          ])
        ) as Record<string, ResumeBlock[]>
        return { ...item, fields }
      }
      return item
    })
    return { ...section, content: { items: items as typeof section.content.items } }
  }

  return mapEntries(section, (item) => {
    if (item.id !== firstValue || !second) return item
    const [secondKey, secondValue] = second
    if (secondKey === 'field' && entryScalarFields.includes(secondValue as never)) {
      return { ...item, [secondValue]: replacement }
    }
    if (secondKey === 'blocks') {
      return { ...item, blocks: linesToBlocks(item.blocks || [], replacement, `${item.id}-blk`) }
    }
    if (secondKey === 'block') {
      return {
        ...item,
        blocks: (item.blocks || []).map((block) =>
          block.id === secondValue ? { ...block, text: replacement } : block
        )
      }
    }
    return item
  })
}

/** AI 建议应用：按锚点整段替换，返回新文档（不可变）。 */
export const applyAnchorReplacement = (
  document: ResumeDocumentV2,
  path: string,
  replacement: string
): ResumeDocumentV2 => {
  const parsed = parseAnchor(path)
  if (!parsed) return document
  return {
    ...document,
    sections: document.sections.map((section) =>
      section.id === parsed.sectionId ? replaceInSection(section, parsed.segments, replacement) : section
    )
  }
}
