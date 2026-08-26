import type {
  ResumeDocumentDraft,
  ResumeDocumentEntry,
  ResumeSkillGroup,
  ResumeTemplateCode
} from '@/features/resume-document'
import type { ResumePresentationConfig, ResumePresentationSection } from '@/types/resumePresentation'

export type ResumeTemplateCategory =
  | 'classic'
  | 'two-column'
  | 'section-band'
  | 'timeline'
  | 'minimalist'
  | 'editorial'
  | 'creative'

export interface ResumeTemplateTypography {
  bodyFont: string
  nameSize: number
  roleSize: number
  sectionTitleSize: number
  bodySize: number
  metadataSize: number
  lineHeight: number
  letterSpacing: number
}

export interface ResumeTemplateLayoutContract {
  columns: 1 | 2
  sectionTitle: 'rule' | 'band' | 'plain'
  entryLayout: 'stack' | 'timeline' | 'grid'
  contactPlacement: 'header' | 'sidebar'
  accentSurface: 'none' | 'header' | 'sidebar' | 'paper'
}

export interface ResumeTemplateDefinition {
  code: ResumeTemplateCode
  version: number
  name: string
  description: string
  className: string
  category: ResumeTemplateCategory
  rendererKey: string
  previewRendererKey: string
  supportedSections: ResumePresentationSection[]
  defaultPresentation: Partial<ResumePresentationConfig>
  typography: ResumeTemplateTypography
  layout: ResumeTemplateLayoutContract
  exportAvailable: boolean
  backendRegistered: boolean
  backendStatus?: string
  backendDefinition?: Record<string, unknown>
}

export type ResumeContactIconKey =
  | 'phone'
  | 'mail'
  | 'user'
  | 'briefcase'
  | 'graduation-cap'
  | 'circle'

export interface ResumeContactModel {
  key: 'phone' | 'email'
  label: string
  value: string
  iconKey: ResumeContactIconKey
  visible: boolean
  showLabel: boolean
}

export interface ResumeRenderModel {
  identity: {
    name: string
    targetPosition: string
  }
  basicLayout: 'LEFT' | 'CENTER' | 'RIGHT'
  basicFieldOrder: Array<'realName' | 'targetPosition' | 'email' | 'phone'>
  basicFieldVisibility: Partial<Record<'realName' | 'targetPosition' | 'email' | 'phone', boolean>>
  basicFieldIcons: Partial<Record<'realName' | 'targetPosition' | 'email' | 'phone', string>>
  iconMode: 'ICON' | 'TEXT' | 'HIDDEN'
  density: 'comfortable' | 'compact'
  contacts: ResumeContactModel[]
  summary: string[]
  skills: string[]
  skillGroups: ResumeSkillGroup[]
  experience: ResumeDocumentEntry[]
  projects: ResumeDocumentEntry[]
  education: ResumeDocumentEntry[]
  sectionOrder: ResumePresentationSection[]
  hiddenSections: ResumePresentationSection[]
  presentation: ResumePresentationConfig
  source: ResumeDocumentDraft
  hasContent: boolean
}
