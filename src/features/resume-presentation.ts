import {
  normalizeResumeTemplateCode,
  resolveAccentHex,
  type ResumeAccent,
  type ResumeTemplateCode
} from '@/features/resume-document'
import type {
  ResumePresentationConfig,
  ResumePresentationField,
  ResumePresentationFont,
  ResumePresentationOverrideKey,
  ResumePresentationSection
} from '@/types/resumePresentation'

export const RESUME_PRESENTATION_SCHEMA_VERSION = 1

export const RESUME_PRESENTATION_SECTIONS: ResumePresentationSection[] = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education'
]

export const RESUME_PRESENTATION_MODULES = [
  'resume-basic',
  'resume-target',
  'resume-skills',
  'resume-projects',
  'resume-experience'
] as const

export const RESUME_PRESENTATION_FIELDS: ResumePresentationField[] = [
  'realName',
  'targetPosition',
  'email',
  'phone',
  'summary',
  'skills',
  'workExperience',
  'projects',
  'educationExperience'
]

const RESUME_PRESENTATION_FIELD_SET = new Set<string>(RESUME_PRESENTATION_FIELDS)
const RESUME_PRESENTATION_OVERRIDE_KEYS: ResumePresentationOverrideKey[] = [
  'sectionOrder',
  'hiddenSections',
  'fieldVisibility',
  'fieldOrder',
  'basicLayout',
  'basicFieldOrder',
  'basicFieldVisibility',
  'basicFieldIcons',
  'iconMode',
  'autoOnePage',
  'fontFamily',
  'fontScale',
  'lineHeight',
  'sectionSpacing',
  'pageMarginPt',
  'avatar'
]

export const RESUME_PRESENTATION_FONTS: ResumePresentationFont[] = [
  'Arial',
  'Microsoft YaHei',
  'Noto Sans SC',
  'Source Han Sans SC'
]

const DEFAULT_SECTION_ORDER: ResumePresentationSection[] = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education'
]

const DEFAULT_FIELD_VISIBILITY: Record<ResumePresentationField, boolean> = {
  realName: true,
  targetPosition: true,
  email: true,
  phone: true,
  summary: true,
  skills: true,
  workExperience: true,
  projects: true,
  educationExperience: true
}

const BASIC_FIELDS = ['realName', 'targetPosition', 'email', 'phone'] as const
type ResumeBasicField = typeof BASIC_FIELDS[number]
const DEFAULT_BASIC_FIELD_ORDER: ResumeBasicField[] = [...BASIC_FIELDS]
const DEFAULT_BASIC_FIELD_VISIBILITY: Record<ResumeBasicField, boolean> = {
  realName: true,
  targetPosition: true,
  email: true,
  phone: true
}
const DEFAULT_BASIC_FIELD_ICONS: Record<ResumeBasicField, string> = {
  realName: 'user',
  targetPosition: 'briefcase',
  email: 'mail',
  phone: 'phone'
}
const SAFE_BASIC_FIELD_ICONS = new Set([
  'user',
  'briefcase',
  'mail',
  'phone',
  'graduation-cap',
  'circle'
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const finiteNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? Math.min(max, Math.max(min, numberValue))
    : fallback
}

const uniqueSections = (
  value: unknown,
  fallback: ResumePresentationSection[],
  includeMissing = true
) => {
  const entries = Array.isArray(value)
    ? value.filter((item): item is ResumePresentationSection =>
      typeof item === 'string' && RESUME_PRESENTATION_SECTIONS.includes(item as ResumePresentationSection)
    )
    : []
  const merged = Array.from(new Set([
    ...entries,
    ...fallback
  ]))
  return Array.from(new Set(
    includeMissing
      ? [...merged, ...RESUME_PRESENTATION_SECTIONS]
      : merged
  )) as ResumePresentationSection[]
}

const normalizeAccent = (value: unknown): string => {
  // V5 起主题色存自由 hex；旧枚举/别名统一迁移（见 resolveAccentHex）。
  return resolveAccentHex(value)
}

const normalizeFont = (value: unknown): ResumePresentationFont =>
  typeof value === 'string' && RESUME_PRESENTATION_FONTS.includes(value as ResumePresentationFont)
    ? value as ResumePresentationFont
    : 'Arial'

const normalizeFieldOrder = (value: unknown): Partial<Record<string, string[]>> => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, entries]) => RESUME_PRESENTATION_FIELD_SET.has(key) && Array.isArray(entries))
      .map(([key, entries]) => [
        key,
        Array.from(new Set(
          (entries as unknown[])
            .filter((entry): entry is string =>
              typeof entry === 'string'
              && entry.trim().length > 0
              && RESUME_PRESENTATION_FIELD_SET.has(entry.trim())
            )
            .map((entry) => entry.trim())
        )).slice(0, 16)
      ])
  )
}

const normalizeBasicFieldOrder = (value: unknown): ResumeBasicField[] => {
  const entries = Array.isArray(value)
    ? value.filter((item): item is ResumeBasicField =>
      typeof item === 'string' && BASIC_FIELDS.includes(item as ResumeBasicField)
    )
    : []
  return Array.from(new Set([...entries, ...DEFAULT_BASIC_FIELD_ORDER]))
}

const normalizeBasicFieldVisibility = (
  value: unknown
): Record<ResumeBasicField, boolean> => {
  const source = isRecord(value) ? value : {}
  return Object.fromEntries(
    BASIC_FIELDS.map((field) => [field, source[field] !== false])
  ) as Record<ResumeBasicField, boolean>
}

const normalizePartialBasicFieldVisibility = (
  value: unknown
): Partial<Record<ResumeBasicField, boolean>> => {
  const source = isRecord(value) ? value : {}
  return Object.fromEntries(
    BASIC_FIELDS
      .filter((field) => typeof source[field] === 'boolean')
      .map((field) => [field, source[field]])
  ) as Partial<Record<ResumeBasicField, boolean>>
}

const normalizeBasicFieldIcons = (
  value: unknown
): Record<ResumeBasicField, string> => {
  const source = isRecord(value) ? value : {}
  return Object.fromEntries(
    BASIC_FIELDS.map((field) => [
      field,
      typeof source[field] === 'string'
        && SAFE_BASIC_FIELD_ICONS.has(source[field].trim())
        ? source[field].trim()
        : DEFAULT_BASIC_FIELD_ICONS[field]
    ])
  ) as Record<ResumeBasicField, string>
}

const normalizePartialBasicFieldIcons = (
  value: unknown
): Partial<Record<ResumeBasicField, string>> => {
  const source = isRecord(value) ? value : {}
  return Object.fromEntries(
    BASIC_FIELDS
      .filter((field) =>
        typeof source[field] === 'string'
        && SAFE_BASIC_FIELD_ICONS.has(source[field].trim())
      )
      .map((field) => [field, (source[field] as string).trim()])
  ) as Partial<Record<ResumeBasicField, string>>
}

export const createDefaultResumePresentation = (
  templateCode: ResumeTemplateCode | string = 'ATS_SINGLE_COLUMN',
  templateVersion = 1
): ResumePresentationConfig => ({
  schemaVersion: RESUME_PRESENTATION_SCHEMA_VERSION,
  templateCode: normalizeResumeTemplateCode(templateCode),
  templateVersion: Math.max(1, Math.floor(Number(templateVersion) || 1)),
  moduleOrder: [...RESUME_PRESENTATION_MODULES],
  hiddenModules: [],
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  hiddenSections: [],
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  fieldOrder: {},
  basicLayout: 'LEFT',
  basicFieldOrder: [...DEFAULT_BASIC_FIELD_ORDER],
  basicFieldVisibility: { ...DEFAULT_BASIC_FIELD_VISIBILITY },
  basicFieldIcons: { ...DEFAULT_BASIC_FIELD_ICONS },
  iconMode: 'ICON',
  autoOnePage: false,
  accentColor: '#0047AB',
  fontFamily: 'Arial',
  fontScale: 1,
  lineHeight: 1.2,
  sectionSpacing: 1,
  pageMarginPt: 42,
  overrides: {},
  avatar: {
    visible: false,
    position: 'RIGHT',
    shape: 'SQUARE'
  }
})

export const normalizeResumePresentation = (
  source?: unknown,
  fallback?: Partial<ResumePresentationConfig>
): ResumePresentationConfig => {
  const base = createDefaultResumePresentation(
    fallback?.templateCode || 'ATS_SINGLE_COLUMN',
    fallback?.templateVersion || 1
  )
  const value = isRecord(source) ? source : {}
  const fallbackRecord = isRecord(fallback) ? fallback : {}
  const fieldVisibility = {
    ...base.fieldVisibility,
    ...(isRecord(fallbackRecord.fieldVisibility) ? fallbackRecord.fieldVisibility : {}),
    ...(isRecord(value.fieldVisibility) ? value.fieldVisibility : {})
  }
  const rawAvatar = isRecord(value.avatar)
    ? value.avatar
    : isRecord(fallbackRecord.avatar)
      ? fallbackRecord.avatar
      : base.avatar
  const rawOverrides = isRecord(value.overrides)
    ? value.overrides
    : isRecord(fallbackRecord.overrides)
      ? fallbackRecord.overrides
      : {}
  const overrides = Object.fromEntries(
    RESUME_PRESENTATION_OVERRIDE_KEYS
      .filter((key) => rawOverrides[key] === true)
      .map((key) => [key, true])
  ) as Partial<Record<ResumePresentationOverrideKey, boolean>>
  const hiddenModules = Array.isArray(value.hiddenModules)
    ? value.hiddenModules.filter((item): item is string =>
      typeof item === 'string'
      && RESUME_PRESENTATION_MODULES.includes(item as typeof RESUME_PRESENTATION_MODULES[number])
      && item !== 'resume-basic'
      && item !== 'resume-target'
    )
    : base.hiddenModules
  const rawModuleOrder = Array.isArray(value.moduleOrder)
    ? value.moduleOrder.filter((item): item is string =>
      typeof item === 'string'
      && RESUME_PRESENTATION_MODULES.includes(item as typeof RESUME_PRESENTATION_MODULES[number])
    )
    : []
  const moduleOrder = Array.from(new Set([
    ...rawModuleOrder,
    ...RESUME_PRESENTATION_MODULES
  ]))

  return {
    ...base,
    ...fallback,
    schemaVersion: RESUME_PRESENTATION_SCHEMA_VERSION,
    templateCode: typeof value.templateCode === 'string'
      ? normalizeResumeTemplateCode(value.templateCode)
      : normalizeResumeTemplateCode(fallback?.templateCode || base.templateCode),
    templateVersion: Math.max(
      1,
      Math.floor(Number(value.templateVersion ?? fallback?.templateVersion ?? base.templateVersion) || 1)
    ),
    moduleOrder,
    hiddenModules: Array.from(new Set(hiddenModules)),
    sectionOrder: uniqueSections(value.sectionOrder ?? fallbackRecord.sectionOrder, base.sectionOrder),
    hiddenSections: uniqueSections(
      value.hiddenSections ?? fallbackRecord.hiddenSections,
      [],
      false
    ),
    fieldVisibility: Object.fromEntries(
      RESUME_PRESENTATION_FIELDS.map((field) => [field, fieldVisibility[field] !== false])
    ) as Record<ResumePresentationField, boolean>,
    fieldOrder: normalizeFieldOrder(value.fieldOrder ?? fallbackRecord.fieldOrder),
    basicLayout: value.basicLayout === 'CENTER' || value.basicLayout === 'RIGHT'
      ? value.basicLayout
      : fallbackRecord.basicLayout === 'CENTER' || fallbackRecord.basicLayout === 'RIGHT'
        ? fallbackRecord.basicLayout
        : base.basicLayout,
    basicFieldOrder: normalizeBasicFieldOrder(
      value.basicFieldOrder ?? fallbackRecord.basicFieldOrder
    ),
    basicFieldVisibility: {
      ...base.basicFieldVisibility,
      ...normalizePartialBasicFieldVisibility(fallbackRecord.basicFieldVisibility),
      ...normalizePartialBasicFieldVisibility(value.basicFieldVisibility)
    },
    basicFieldIcons: {
      ...base.basicFieldIcons,
      ...normalizePartialBasicFieldIcons(fallbackRecord.basicFieldIcons),
      ...normalizePartialBasicFieldIcons(value.basicFieldIcons)
    },
    iconMode: value.iconMode === 'TEXT' || value.iconMode === 'HIDDEN'
      ? value.iconMode
      : fallbackRecord.iconMode === 'TEXT' || fallbackRecord.iconMode === 'HIDDEN'
        ? fallbackRecord.iconMode
        : base.iconMode,
    autoOnePage: value.autoOnePage === true || fallbackRecord.autoOnePage === true,
    accentColor: normalizeAccent(value.accentColor ?? fallback?.accentColor),
    fontFamily: normalizeFont(value.fontFamily ?? fallback?.fontFamily),
    fontScale: finiteNumber(value.fontScale ?? fallback?.fontScale, base.fontScale, 0.86, 1.18),
    lineHeight: finiteNumber(value.lineHeight ?? fallback?.lineHeight, base.lineHeight, 1, 1.6),
    sectionSpacing: finiteNumber(value.sectionSpacing ?? fallback?.sectionSpacing, base.sectionSpacing, 0.7, 1.6),
    pageMarginPt: finiteNumber(value.pageMarginPt ?? fallback?.pageMarginPt, base.pageMarginPt, 24, 72),
    overrides,
    avatar: {
      visible: rawAvatar.visible === true,
      position: rawAvatar.position === 'LEFT' || rawAvatar.position === 'CENTER'
        ? rawAvatar.position
        : 'RIGHT',
      shape: rawAvatar.shape === 'ROUNDED' || rawAvatar.shape === 'CIRCLE'
        ? rawAvatar.shape
        : 'SQUARE'
    }
  }
}

export const isResumePresentationSectionVisible = (
  config: ResumePresentationConfig,
  section: ResumePresentationSection
) => !config.hiddenSections.includes(section)

export const mergeResumeTemplatePresentation = (
  config: ResumePresentationConfig,
  template: {
    templateCode?: string
    templateVersion?: number
    definition?: Record<string, unknown>
  }
) => {
  const definition = template.definition || {}
  const overrides = config.overrides || {}
  const sectionOrder = Array.isArray(definition.sectionOrder)
    ? definition.sectionOrder
      .map((value) => String(value).toLowerCase())
      .filter((value): value is ResumePresentationSection =>
        RESUME_PRESENTATION_SECTIONS.includes(value as ResumePresentationSection)
      )
    : config.sectionOrder
  const hiddenSections = Array.isArray(definition.hiddenSections)
    ? definition.hiddenSections
      .map((value) => String(value).toLowerCase())
      .filter((value): value is ResumePresentationSection =>
        RESUME_PRESENTATION_SECTIONS.includes(value as ResumePresentationSection)
      )
    : config.hiddenSections

  const next: Partial<ResumePresentationConfig> = {
    ...config,
    templateCode: template.templateCode || config.templateCode,
    templateVersion: template.templateVersion || config.templateVersion,
    overrides
  }
  if (!overrides.sectionOrder && sectionOrder.length) {
    next.sectionOrder = sectionOrder
  }
  if (!overrides.hiddenSections) {
    next.hiddenSections = hiddenSections
  }
  if (!overrides.fontFamily && typeof definition.fontFamily === 'string') {
    next.fontFamily = definition.fontFamily as ResumePresentationFont
  }
  if (!overrides.lineHeight && Number.isFinite(Number(definition.lineSpacing))) {
    next.lineHeight = Number(definition.lineSpacing)
  }
  if (!overrides.pageMarginPt && Number.isFinite(Number(definition.marginPt))) {
    next.pageMarginPt = Number(definition.marginPt)
  }
  return normalizeResumePresentation(next)
}
