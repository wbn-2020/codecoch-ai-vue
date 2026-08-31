import {
  MAX_BLOCK_TEXT_LENGTH,
  MAX_BLOCKS_PER_FIELD,
  MAX_CUSTOM_SECTIONS,
  MAX_SECTION_TITLE_LENGTH,
  RESUME_BUILTIN_SECTION_KEYS,
  RESUME_DOCUMENT_SCHEMA_VERSION,
  type ResumeBlock,
  type ResumeDocumentV2,
  type ResumeSection
} from '@/features/resume-workbench/document'
import { nextDocumentId } from '@/features/resume-workbench/document-migrator'

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, num))
}

const CONTROL_PATTERN = new RegExp('[\\u0000-\\u001f\\u007f]', 'g')

const sanitizeTitle = (value: unknown, fallback: string) => {
  const text = String(value ?? '')
    .replace(CONTROL_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SECTION_TITLE_LENGTH)
  return text || fallback
}

const sanitizeBlock = (block: unknown): ResumeBlock => {
  const source = (block || {}) as Partial<ResumeBlock>
  const kind = source.kind === 'bullet' || source.kind === 'ordered' ? source.kind : 'line'
  return {
    id: typeof source.id === 'string' && source.id ? source.id : nextDocumentId('blk'),
    kind,
    text: String(source.text ?? '').replace(CONTROL_PATTERN, ' ').slice(0, MAX_BLOCK_TEXT_LENGTH)
  }
}

const sanitizeBlocks = (blocks: unknown): ResumeBlock[] =>
  Array.isArray(blocks) ? blocks.slice(0, MAX_BLOCKS_PER_FIELD).map(sanitizeBlock) : []

const normalizeSection = (section: unknown): ResumeSection | null => {
  const source = (section || {}) as ResumeSection & Record<string, unknown>
  const kind = source.kind
  const base = {
    id: typeof source.id === 'string' && source.id ? source.id : nextDocumentId('sec'),
    title: sanitizeTitle(source.title, ''),
    visible: source.visible !== false
  }
  const builtinKey = RESUME_BUILTIN_SECTION_KEYS.includes(source.builtinKey as never)
    ? source.builtinKey
    : undefined

  switch (kind) {
    case 'text':
      return { ...base, builtinKey, kind: 'text', content: { blocks: sanitizeBlocks((source.content as { blocks?: unknown })?.blocks) } }
    case 'skills': {
      const groups = Array.isArray((source.content as { groups?: unknown })?.groups)
        ? (source.content as unknown as { groups: Array<Record<string, unknown>> }).groups.slice(0, MAX_CUSTOM_SECTIONS)
        : []
      return {
        ...base,
        builtinKey,
        kind: 'skills',
        content: {
          groups: groups.map((group) => ({
            id: typeof group.id === 'string' && group.id ? group.id : nextDocumentId('grp'),
            label: sanitizeTitle(group.label, ''),
            items: (Array.isArray(group.items) ? group.items : [])
              .slice(0, 100)
              .map((item) => String(item ?? '').replace(CONTROL_PATTERN, ' ').trim().slice(0, 80))
              .filter((item) => item.length > 0)
          }))
        }
      }
    }
    case 'entry':
    case 'custom': {
      const variant = kind === 'entry' ? undefined : source.variant === 'entry' ? 'entry' : 'text'
      const normalizeItem = (item: Record<string, unknown>) => ({
        id: typeof item.id === 'string' && item.id ? item.id : nextDocumentId('item'),
        heading: String(item.heading ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
        subheading: String(item.subheading ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
        period: String(item.period ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 60),
        meta: String(item.meta ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
        blocks: sanitizeBlocks(item.blocks)
      })
      if (kind === 'entry') {
        const items = Array.isArray((source.content as { items?: unknown })?.items)
          ? (source.content as unknown as { items: Array<Record<string, unknown>> }).items.slice(0, 50).map(normalizeItem)
          : []
        return { ...base, builtinKey, kind: 'entry', content: { items } }
      }
      if (variant === 'entry') {
        const items = Array.isArray((source.content as { items?: unknown })?.items)
          ? (source.content as unknown as { items: Array<Record<string, unknown>> }).items.slice(0, 50).map(normalizeItem)
          : []
        return { ...base, kind: 'custom', variant: 'entry', content: { items } }
      }
      return { ...base, kind: 'custom', variant: 'text', content: { blocks: sanitizeBlocks((source.content as { blocks?: unknown })?.blocks) } }
    }
    case 'project': {
      const items = Array.isArray((source.content as { items?: unknown })?.items)
        ? (source.content as unknown as { items: Array<Record<string, unknown>> }).items.slice(0, 50)
        : []
      return {
        ...base,
        builtinKey,
        kind: 'project',
        content: {
          items: items.map((item) => {
            const fields = (item.fields || {}) as Record<string, unknown>
            return {
              id: typeof item.id === 'string' && item.id ? item.id : nextDocumentId('prj'),
              serverId: Number.isFinite(Number(item.serverId)) && Number(item.serverId) > 0 ? Number(item.serverId) : undefined,
              name: String(item.name ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
              period: String(item.period ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 60),
              role: String(item.role ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 60),
              techStack: String(item.techStack ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 200),
              fields: {
                background: sanitizeBlocks(fields.background),
                coreFeatures: sanitizeBlocks(fields.coreFeatures),
                technicalChallenges: sanitizeBlocks(fields.technicalChallenges),
                outcome: sanitizeBlocks(fields.outcome),
                supplement: sanitizeBlocks(fields.supplement)
              },
              sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : undefined
            }
          })
        }
      }
    }
    default:
      return null
  }
}

/**
 * 客户端归一化：与服务器 ResumeDocumentNormalizer 保持同一边界策略。
 * 输入未知形状 → 合法 v2 文档（补齐 id、夹取数值、清洗标题/控制符、限流自定义分区）。
 */
export const normalizeResumeDocument = (input: unknown): ResumeDocumentV2 | null => {
  const source = (input || {}) as Partial<ResumeDocumentV2> & Record<string, unknown>
  if ((source as { schemaVersion?: number }).schemaVersion !== RESUME_DOCUMENT_SCHEMA_VERSION) return null
  const basics = (source.basics || {}) as ResumeDocumentV2['basics']
  const layout = (source.layout || {}) as ResumeDocumentV2['layout']

  const rawSections = Array.isArray(source.sections) ? source.sections : []
  let customCount = 0
  const sections: ResumeSection[] = []
  const seenBuiltin = new Set<string>()
  for (const raw of rawSections) {
    const section = normalizeSection(raw)
    if (!section) continue
    if (section.builtinKey) {
      if (seenBuiltin.has(section.builtinKey)) continue
      seenBuiltin.add(section.builtinKey)
    } else {
      if (customCount >= MAX_CUSTOM_SECTIONS) continue
      customCount += 1
    }
    sections.push(section)
  }

  return {
    schemaVersion: RESUME_DOCUMENT_SCHEMA_VERSION,
    basics: {
      name: String(basics.name ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 60),
      headline: String(basics.headline ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
      contacts: (Array.isArray(basics.contacts) ? basics.contacts : []).slice(0, 8).map((contact) => ({
        id: typeof contact.id === 'string' && contact.id ? contact.id : nextDocumentId('ct'),
        kind: (['phone', 'email', 'url', 'location', 'text'] as const).includes(contact.kind)
          ? contact.kind
          : 'text',
        label: String(contact.label ?? '').slice(0, 20),
        value: String(contact.value ?? '').replace(CONTROL_PATTERN, ' ').slice(0, 120),
        iconKey: (['phone', 'mail', 'user', 'briefcase', 'graduation-cap', 'circle'] as const).includes(contact.iconKey)
          ? contact.iconKey
          : 'circle',
        visible: contact.visible !== false,
        showLabel: contact.showLabel === true
      })),
      ...(basics.avatar && {
        avatar: {
          url: String(basics.avatar.url ?? '').slice(0, 500),
          visible: basics.avatar.visible === true,
          shape: (['SQUARE', 'ROUNDED', 'CIRCLE'] as const).includes(basics.avatar.shape)
            ? basics.avatar.shape
            : 'ROUNDED',
          position: (['LEFT', 'CENTER', 'RIGHT'] as const).includes(basics.avatar.position)
            ? basics.avatar.position
            : 'LEFT'
        }
      })
    },
    layout: {
      templateCode: String(layout.templateCode || 'ATS_SINGLE_COLUMN'),
      templateVersion: clampNumber(layout.templateVersion, 1, 99, 1),
      accentColor: layout.accentColor || 'default',
      fontFamily: layout.fontFamily || 'Arial',
      fontScale: clampNumber(layout.fontScale, 0.86, 1.18, 1),
      lineHeight: clampNumber(layout.lineHeight, 1, 1.6, 1.2),
      sectionSpacing: clampNumber(layout.sectionSpacing, 0.7, 1.6, 1),
      pageMarginPt: clampNumber(layout.pageMarginPt, 24, 72, 42),
      autoOnePage: layout.autoOnePage === true,
      basicLayout: (['LEFT', 'CENTER', 'RIGHT'] as const).includes(layout.basicLayout) ? layout.basicLayout : 'LEFT',
      iconMode: (['ICON', 'TEXT', 'HIDDEN'] as const).includes(layout.iconMode) ? layout.iconMode : 'ICON',
      pageSize: 'A4',
      ...(layout.overrides ? { overrides: layout.overrides } : {})
    },
    sections
  }
}
