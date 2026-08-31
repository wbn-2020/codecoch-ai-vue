import type {
  ResumeDocumentDraft,
  ResumeDocumentEntry,
  ResumeSkillGroup,
  ResumeTemplateCode
} from '@/features/resume-document'
import type { ResumeBlock } from '@/features/resume-workbench/document'
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

/**
 * 渲染器消费的分区单元：顺序、可见性与标题都来自文档 v2，
 * 内置分区沿用既有模型字段，自定义分区自带内容块或条目。
 */
export interface ResumeRenderSection {
  id: string
  title: string
  builtinKey?: ResumePresentationSection
  kind: 'text' | 'skills' | 'entry' | 'project' | 'custom'
  blocks?: ResumeBlock[]
  entries?: ResumeDocumentEntry[]
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
  renderSections: ResumeRenderSection[]
  hiddenSections: ResumePresentationSection[]
  presentation: ResumePresentationConfig
  source: ResumeDocumentDraft
  hasContent: boolean
}
