import {
  normalizeResumeTemplateCode,
  resumeTemplateOptions,
  RESUME_FORMAL_EXPORT_TEMPLATE_CODES,
  type ResumeTemplateCode,
  type ResumeTemplateOption
} from '@/features/resume-document'
import { createDefaultResumePresentation } from '@/features/resume-presentation'
import type { ResumeAtsTemplateVO } from '@/types/resumeDelivery'
import type { ResumePresentationSection } from '@/types/resumePresentation'

import type {
  ResumeTemplateCategory,
  ResumeTemplateDefinition,
  ResumeTemplateLayoutContract,
  ResumeTemplateTypography
} from './schema'

const supportedSections: ResumePresentationSection[] = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education'
]

// The server ATS channel list is the single source of truth in resume-document.ts
// (V4_128 registers the MAGIC_* codes as honest single-column ATS exports).
const exportTemplateCodes = new Set<ResumeTemplateCode>(RESUME_FORMAL_EXPORT_TEMPLATE_CODES)

const typography: ResumeTemplateTypography = {
  bodyFont: 'Arial',
  nameSize: 30,
  roleSize: 14,
  sectionTitleSize: 14,
  bodySize: 11.5,
  metadataSize: 10.5,
  lineHeight: 1.62,
  letterSpacing: 0
}

const layouts: Record<string, ResumeTemplateLayoutContract> = {
  professional: {
    columns: 1,
    sectionTitle: 'band',
    entryLayout: 'timeline',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  compact: {
    columns: 1,
    sectionTitle: 'plain',
    entryLayout: 'stack',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  project: {
    columns: 1,
    sectionTitle: 'plain',
    entryLayout: 'grid',
    contactPlacement: 'header',
    accentSurface: 'header'
  },
  classic: {
    columns: 2,
    sectionTitle: 'rule',
    entryLayout: 'stack',
    contactPlacement: 'sidebar',
    accentSurface: 'sidebar'
  },
  streak: {
    columns: 1,
    sectionTitle: 'rule',
    entryLayout: 'stack',
    contactPlacement: 'header',
    accentSurface: 'paper'
  },
  timeline: {
    columns: 1,
    sectionTitle: 'rule',
    entryLayout: 'timeline',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  minimalist: {
    columns: 1,
    sectionTitle: 'plain',
    entryLayout: 'stack',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  elegant: {
    columns: 1,
    sectionTitle: 'rule',
    entryLayout: 'stack',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  creative: {
    columns: 1,
    sectionTitle: 'band',
    entryLayout: 'grid',
    contactPlacement: 'header',
    accentSurface: 'header'
  },
  editorial: {
    columns: 1,
    sectionTitle: 'rule',
    entryLayout: 'stack',
    contactPlacement: 'header',
    accentSurface: 'none'
  },
  swiss: {
    columns: 2,
    sectionTitle: 'plain',
    entryLayout: 'grid',
    contactPlacement: 'header',
    accentSurface: 'none'
  }
}

const categoryByClassName: Record<string, ResumeTemplateCategory> = {
  professional: 'classic',
  compact: 'minimalist',
  project: 'section-band',
  classic: 'two-column',
  streak: 'editorial',
  timeline: 'timeline',
  minimalist: 'minimalist',
  elegant: 'classic',
  creative: 'creative',
  editorial: 'editorial',
  swiss: 'classic'
}

const rendererKeyByClassName: Record<string, string> = {
  professional: 'codecoachai/magic-lr',
  compact: 'codecoachai/classic',
  project: 'codecoachai/project',
  streak: 'codecoachai/streak',
  classic: 'codecoachai/left-right',
  timeline: 'codecoachai/timeline',
  minimalist: 'codecoachai/minimalist',
  elegant: 'codecoachai/elegant',
  creative: 'codecoachai/creative',
  editorial: 'codecoachai/editorial',
  swiss: 'codecoachai/swiss'
}

const makeDefinition = (option: ResumeTemplateOption): ResumeTemplateDefinition => ({
  code: option.code,
  version: 1,
  name: option.name,
  description: option.description,
  className: option.className,
  category: categoryByClassName[option.className] || 'classic',
  rendererKey: rendererKeyByClassName[option.className]
    || `codecoachai/${option.className}`,
  previewRendererKey: rendererKeyByClassName[option.className]
    ? `${rendererKeyByClassName[option.className]}/preview`
    : `codecoachai/${option.className}/preview`,
  supportedSections,
  defaultPresentation: createDefaultResumePresentation(option.code),
  typography: {
    ...typography,
    bodySize: option.code === 'ATS_COMPACT' ? 10.5 : typography.bodySize
  },
  layout: layouts[option.className] || layouts.professional,
  exportAvailable: exportTemplateCodes.has(option.code),
  backendRegistered: false
})

export const resumeTemplateRegistry: ResumeTemplateDefinition[] =
  resumeTemplateOptions.map(makeDefinition)

export const getResumeTemplateDefinition = (
  code?: string
): ResumeTemplateDefinition => {
  const normalized = normalizeResumeTemplateCode(code)
  return resumeTemplateRegistry.find((template) => template.code === normalized)
    || resumeTemplateRegistry[0]
}

export const mergeResumeTemplateDefinition = (
  code: string | undefined,
  backendTemplate?: ResumeAtsTemplateVO
): ResumeTemplateDefinition => {
  const local = getResumeTemplateDefinition(code || backendTemplate?.templateCode)
  if (!backendTemplate) return local

  return {
    ...local,
    version: Math.max(1, Math.floor(Number(backendTemplate.templateVersion) || local.version)),
    exportAvailable: local.exportAvailable
      && (!backendTemplate.status || backendTemplate.status === 'ACTIVE'),
    backendRegistered: true,
    backendStatus: backendTemplate.status,
    backendDefinition: backendTemplate.definition
  }
}

export const getResumeTemplateOption = (
  code?: string
): ResumeTemplateOption => {
  const normalized = normalizeResumeTemplateCode(code)
  return resumeTemplateOptions.find((template) => template.code === normalized)
    || resumeTemplateOptions[0]
}

export const listResumeTemplateDefinitions = (
  backendTemplates: ResumeAtsTemplateVO[] = []
) => resumeTemplateRegistry.map((template) => mergeResumeTemplateDefinition(
  template.code,
  backendTemplates.find((item) => item.templateCode === template.code)
))
