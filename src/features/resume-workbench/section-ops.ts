import {
  DEFAULT_BUILTIN_SECTION_TITLES,
  MAX_CUSTOM_SECTIONS,
  type ResumeBlock,
  type ResumeBuiltInSectionKey,
  type ResumeDocumentV2,
  type ResumeEntryItem,
  type ResumeSection
} from '@/features/resume-workbench/document'
import { nextDocumentId } from '@/features/resume-workbench/document-migrator'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const findSectionIndex = (document: ResumeDocumentV2, sectionId: string) =>
  document.sections.findIndex((section) => section.id === sectionId)

export const moveSection = (document: ResumeDocumentV2, sectionId: string, toIndex: number): ResumeDocumentV2 => {
  const next = clone(document)
  const from = findSectionIndex(next, sectionId)
  if (from < 0) return document
  const clamped = Math.max(0, Math.min(next.sections.length - 1, toIndex))
  if (from === clamped) return document
  const [section] = next.sections.splice(from, 1)
  next.sections.splice(clamped, 0, section)
  return next
}

export const toggleSectionVisible = (document: ResumeDocumentV2, sectionId: string): ResumeDocumentV2 => {
  const index = findSectionIndex(document, sectionId)
  if (index < 0) return document
  const next = clone(document)
  next.sections[index] = { ...next.sections[index], visible: !next.sections[index].visible }
  return next
}

export const renameSection = (document: ResumeDocumentV2, sectionId: string, title: string): ResumeDocumentV2 => {
  const index = findSectionIndex(document, sectionId)
  if (index < 0) return document
  const next = clone(document)
  next.sections[index] = { ...next.sections[index], title }
  return next
}

export const addCustomSection = (
  document: ResumeDocumentV2,
  options: { variant: 'text' | 'entry'; title?: string; at?: number }
): ResumeDocumentV2 => {
  const customCount = document.sections.filter((section) => !section.builtinKey).length
  if (customCount >= MAX_CUSTOM_SECTIONS) return document
  const next = clone(document)
  const section: ResumeSection =
    options.variant === 'entry'
      ? {
          id: nextDocumentId('sec-custom'),
          title: options.title || '自定义分区',
          visible: true,
          kind: 'custom',
          variant: 'entry',
          content: { items: [] }
        }
      : {
          id: nextDocumentId('sec-custom'),
          title: options.title || '自定义分区',
          visible: true,
          kind: 'custom',
          variant: 'text',
          content: { blocks: [] }
        }
  const at = Math.max(0, Math.min(next.sections.length, options.at ?? next.sections.length))
  next.sections.splice(at, 0, section)
  return next
}

/** 自定义分区直接删除；内置分区只允许隐藏（数据与服务器标量列保持）。 */
export const removeSection = (document: ResumeDocumentV2, sectionId: string): ResumeDocumentV2 => {
  const section = document.sections.find((item) => item.id === sectionId)
  if (!section || section.builtinKey) return document
  return { ...clone(document), sections: clone(document).sections.filter((item) => item.id !== sectionId) }
}

export const addBlock = (
  document: ResumeDocumentV2,
  sectionId: string,
  block: Omit<ResumeBlock, 'id'> = { kind: 'line', text: '' }
): ResumeDocumentV2 => {
  const index = findSectionIndex(document, sectionId)
  if (index < 0) return document
  const next = clone(document)
  const section = next.sections[index]
  if (section.kind === 'text') section.content.blocks.push({ ...block, id: nextDocumentId('blk') })
  else if (section.kind === 'custom' && section.variant === 'text')
    section.content.blocks = [...(section.content.blocks || []), { ...block, id: nextDocumentId('blk') }]
  else return document
  return next
}

export const updateBlockText = (
  document: ResumeDocumentV2,
  sectionId: string,
  blockId: string,
  text: string
): ResumeDocumentV2 => {
  const next = clone(document)
  const walk = (blocks: ResumeBlock[]) => {
    const block = blocks.find((item) => item.id === blockId)
    if (block) block.text = text
  }
  for (const section of next.sections) {
    if (section.id !== sectionId) continue
    if (section.kind === 'text') walk(section.content.blocks)
    if (section.kind === 'custom' && section.variant === 'text') walk(section.content.blocks || [])
    if (section.kind === 'entry') section.content.items.forEach((item) => walk(item.blocks))
    if (section.kind === 'custom' && section.variant === 'entry')
      (section.content.items || []).forEach((item) => walk(item.blocks))
    if (section.kind === 'project')
      section.content.items.forEach((item) => Object.values(item.fields).forEach(walk))
  }
  return next
}

export const createEntryItem = (): ResumeEntryItem => ({
  id: nextDocumentId('item'),
  heading: '',
  subheading: '',
  period: '',
  meta: '',
  blocks: []
})

export const addEntryItem = (document: ResumeDocumentV2, sectionId: string): ResumeDocumentV2 => {
  const next = clone(document)
  const section = next.sections.find((item) => item.id === sectionId)
  if (!section) return document
  if (section.kind === 'entry') section.content.items.push(createEntryItem())
  else if (section.kind === 'custom' && section.variant === 'entry')
    section.content.items = [...(section.content.items || []), createEntryItem()]
  else return document
  return next
}

export const removeEntryItem = (
  document: ResumeDocumentV2,
  sectionId: string,
  itemId: string
): ResumeDocumentV2 => {
  const next = clone(document)
  const section = next.sections.find((item) => item.id === sectionId)
  if (!section) return document
  if (section.kind === 'entry')
    section.content.items = section.content.items.filter((item) => item.id !== itemId)
  else if (section.kind === 'custom' && section.variant === 'entry')
    section.content.items = (section.content.items || []).filter((item) => item.id !== itemId)
  else return document
  return next
}

export const moveEntryItem = (
  document: ResumeDocumentV2,
  sectionId: string,
  itemId: string,
  delta: number
): ResumeDocumentV2 => {
  const next = clone(document)
  const section = next.sections.find((item) => item.id === sectionId)
  if (!section) return document
  const list =
    section.kind === 'entry'
      ? section.content.items
      : section.kind === 'custom' && section.variant === 'entry'
        ? section.content.items || []
        : null
  if (!list) return document
  const from = list.findIndex((item) => item.id === itemId)
  const to = Math.max(0, Math.min(list.length - 1, from + delta))
  if (from < 0 || from === to) return document
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  return next
}

export const builtinSectionDefaults = (key: ResumeBuiltInSectionKey) => DEFAULT_BUILTIN_SECTION_TITLES[key]
