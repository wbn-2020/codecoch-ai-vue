import type { ResumeAccent, ResumeTemplateCode } from '@/features/resume-document'
import type {
  ResumePresentationFont,
  ResumePresentationOverrideKey
} from '@/types/resumePresentation'

export const RESUME_DOCUMENT_SCHEMA_VERSION = 2

export const RESUME_BUILTIN_SECTION_KEYS = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education'
] as const

export type ResumeBuiltInSectionKey = (typeof RESUME_BUILTIN_SECTION_KEYS)[number]

export const DEFAULT_BUILTIN_SECTION_TITLES: Record<ResumeBuiltInSectionKey, string> = {
  summary: '个人总结',
  skills: '专业技能',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育经历'
}

export interface ResumeBlock {
  id: string
  kind: 'line' | 'bullet' | 'ordered'
  text: string
}

export type ResumeContactKind = 'phone' | 'email' | 'url' | 'location' | 'text'

export interface ResumeContactItem {
  id: string
  kind: ResumeContactKind
  label: string
  value: string
  iconKey: 'phone' | 'mail' | 'user' | 'briefcase' | 'graduation-cap' | 'circle' | 'url' | 'location'
  visible: boolean
  showLabel: boolean
}

export interface ResumeAvatar {
  url: string
  visible: boolean
  shape: 'SQUARE' | 'ROUNDED' | 'CIRCLE'
  position: 'LEFT' | 'CENTER' | 'RIGHT'
}

export interface ResumeBasics {
  name: string
  headline: string
  contacts: ResumeContactItem[]
  avatar?: ResumeAvatar
}

export interface ResumeLayoutMeta {
  templateCode: ResumeTemplateCode | string
  templateVersion: number
  accentColor: ResumeAccent
  fontFamily: ResumePresentationFont
  fontScale: number
  lineHeight: number
  /** 与 ResumePresentationConfig 同一约定：分区间距为模板自带间距的倍率，页边距为磅值。 */
  sectionSpacing: number
  pageMarginPt: number
  autoOnePage: boolean
  basicLayout: 'LEFT' | 'CENTER' | 'RIGHT'
  iconMode: 'ICON' | 'TEXT' | 'HIDDEN'
  pageSize: 'A4'
  overrides?: Partial<Record<ResumePresentationOverrideKey, boolean>>
}

interface SectionBase {
  id: string
  title: string
  visible: boolean
  builtinKey?: ResumeBuiltInSectionKey
}

export interface TextSection extends SectionBase {
  kind: 'text'
  content: { blocks: ResumeBlock[] }
}

export interface ResumeSkillGroupItem {
  id: string
  label: string
  items: string[]
}

export interface SkillSection extends SectionBase {
  kind: 'skills'
  content: { groups: ResumeSkillGroupItem[] }
}

export interface ResumeEntryItem {
  id: string
  heading: string
  subheading: string
  period: string
  meta: string
  blocks: ResumeBlock[]
}

export interface EntrySection extends SectionBase {
  kind: 'entry'
  content: { items: ResumeEntryItem[] }
}

/** 与服务器 resume_project 固定字段保持映射；键为权威字段名 */
export interface ResumeProjectItem {
  id: string
  /** 服务器 projectId；本地未保存草稿为空 */
  serverId?: number
  name: string
  period: string
  role: string
  techStack: string
  fields: {
    background: ResumeBlock[]
    coreFeatures: ResumeBlock[]
    technicalChallenges: ResumeBlock[]
    outcome: ResumeBlock[]
    supplement: ResumeBlock[]
  }
  sort?: number
}

export interface ProjectSection extends SectionBase {
  kind: 'project'
  content: { items: ResumeProjectItem[] }
}

export interface CustomSection extends SectionBase {
  kind: 'custom'
  variant: 'text' | 'entry'
  content: { blocks?: ResumeBlock[]; items?: ResumeEntryItem[] }
}

export type ResumeSection =
  | TextSection
  | SkillSection
  | EntrySection
  | ProjectSection
  | CustomSection

export interface ResumeDocumentV2 {
  schemaVersion: 2
  basics: ResumeBasics
  layout: ResumeLayoutMeta
  sections: ResumeSection[]
}

export const MAX_CUSTOM_SECTIONS = 12
export const MAX_RESUME_CONTACTS = 8
export const MAX_BLOCKS_PER_FIELD = 60
export const MAX_BLOCK_TEXT_LENGTH = 2000
export const MAX_SECTION_TITLE_LENGTH = 40
export const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']
