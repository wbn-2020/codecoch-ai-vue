import type { ResumeAccent, ResumeTemplateCode } from '@/features/resume-document'

export type ResumePresentationSection =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'

export type ResumePresentationField =
  | 'realName'
  | 'targetPosition'
  | 'email'
  | 'phone'
  | 'summary'
  | 'skills'
  | 'workExperience'
  | 'projects'
  | 'educationExperience'

export type ResumePresentationFont =
  | 'Arial'
  | 'Microsoft YaHei'
  | 'Noto Sans SC'
  | 'Source Han Sans SC'

export type ResumePresentationOverrideKey =
  | 'sectionOrder'
  | 'hiddenSections'
  | 'fieldVisibility'
  | 'fieldOrder'
  | 'basicLayout'
  | 'basicFieldOrder'
  | 'basicFieldVisibility'
  | 'basicFieldIcons'
  | 'iconMode'
  | 'autoOnePage'
  | 'fontFamily'
  | 'fontScale'
  | 'lineHeight'
  | 'sectionSpacing'
  | 'pageMarginPt'
  | 'avatar'

export interface ResumePresentationConfig {
  schemaVersion: number
  templateCode: ResumeTemplateCode | string
  templateVersion: number
  moduleOrder: string[]
  hiddenModules: string[]
  sectionOrder: ResumePresentationSection[]
  hiddenSections: ResumePresentationSection[]
  fieldVisibility: Partial<Record<ResumePresentationField, boolean>>
  fieldOrder: Partial<Record<string, string[]>>
  basicLayout: 'LEFT' | 'CENTER' | 'RIGHT'
  basicFieldOrder: Array<'realName' | 'targetPosition' | 'email' | 'phone'>
  basicFieldVisibility: Partial<Record<'realName' | 'targetPosition' | 'email' | 'phone', boolean>>
  basicFieldIcons: Partial<Record<'realName' | 'targetPosition' | 'email' | 'phone', string>>
  iconMode: 'ICON' | 'TEXT' | 'HIDDEN'
  autoOnePage: boolean
  accentColor: ResumeAccent
  fontFamily: ResumePresentationFont
  fontScale: number
  lineHeight: number
  sectionSpacing: number
  pageMarginPt: number
  overrides?: Partial<Record<ResumePresentationOverrideKey, boolean>>
  avatar: {
    visible: boolean
    position: 'LEFT' | 'CENTER' | 'RIGHT'
    shape: 'SQUARE' | 'ROUNDED' | 'CIRCLE'
  }
}
