import type { ResumeDocumentEntry } from '@/features/resume-document'
import type {
  ResumeBlock,
  ResumeDocumentV2,
  ResumeEntryItem,
  ResumeProjectItem,
  ResumeSection
} from '@/features/resume-workbench/document'
import { toPlainLines } from '@/features/resume-workbench/markdown-lite'
import type { ResumePresentationSection } from '@/types/resumePresentation'

import type { ResumeRenderModel, ResumeRenderSection } from './schema'

const BUILTIN_TITLES: Record<ResumePresentationSection, string> = {
  summary: '个人摘要',
  skills: '专业技能',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育经历'
}

const PROJECT_FIELD_LABELS: Array<{
  field: keyof ResumeProjectItem['fields']
  key: 'background' | 'core' | 'technical' | 'outcome' | 'supplement'
  title: string
}> = [
  { field: 'background', key: 'background', title: '项目背景' },
  { field: 'coreFeatures', key: 'core', title: '核心功能' },
  { field: 'technicalChallenges', key: 'technical', title: '技术难点' },
  { field: 'outcome', key: 'outcome', title: '结果指标' },
  { field: 'supplement', key: 'supplement', title: '补充说明' }
]

const BUILTIN_FIELD_KEYS: Record<ResumePresentationSection, string> = {
  summary: 'summary',
  skills: 'skills',
  experience: 'workExperience',
  projects: 'projects',
  education: 'educationExperience'
}

const blockLines = (blocks?: ResumeBlock[]) =>
  toPlainLines(blocks || []).map((line) => line.text)

const entryItemToRender = (item: ResumeEntryItem): ResumeDocumentEntry => ({
  key: item.id,
  title: item.heading,
  subtitle: item.subheading || undefined,
  period: item.period || undefined,
  meta: item.meta || undefined,
  bullets: blockLines(item.blocks)
})

const projectItemToRender = (item: ResumeProjectItem, index: number): ResumeDocumentEntry => ({
  key: item.id,
  title: item.name || `项目经历 ${index + 1}`,
  subtitle: item.role || undefined,
  period: item.period || undefined,
  meta: item.techStack || undefined,
  bullets: [],
  projectSections: PROJECT_FIELD_LABELS
    .map(({ field, key, title }) => ({ key, title, values: blockLines(item.fields[field]) }))
    .filter((section) => section.values.length > 0)
})

type SectionContentModel = Pick<
  ResumeRenderModel,
  'summary' | 'skills' | 'experience' | 'projects' | 'education'
  | 'sectionOrder' | 'hiddenSections' | 'presentation'
>

const builtinFieldVisible = (key: ResumePresentationSection, model: SectionContentModel) =>
  model.presentation.fieldVisibility[BUILTIN_FIELD_KEYS[key] as keyof typeof model.presentation.fieldVisibility] !== false

const builtinHasContent = (key: ResumePresentationSection, model: SectionContentModel) => {
  if (!builtinFieldVisible(key, model)) return false
  if (key === 'summary') return model.summary.length > 0
  if (key === 'skills') return model.skills.length > 0
  if (key === 'experience') return model.experience.length > 0
  if (key === 'projects') return model.projects.length > 0
  return model.education.length > 0
}

const builtinKind = (key: ResumePresentationSection): ResumeRenderSection['kind'] =>
  key === 'summary' ? 'text' : key === 'skills' ? 'skills' : key === 'projects' ? 'project' : 'entry'

const mapDocumentSection = (
  section: ResumeSection,
  model: SectionContentModel
): ResumeRenderSection | null => {
  const key = section.builtinKey as ResumePresentationSection | undefined
  if (key) {
    if (!builtinHasContent(key, model)) return null
    return {
      id: section.id,
      title: section.title?.trim() || BUILTIN_TITLES[key],
      builtinKey: key,
      kind: builtinKind(key)
    }
  }

  if (section.kind === 'custom' && section.variant === 'entry') {
    const items = section.content.items || []
    if (!items.length) return null
    return {
      id: section.id,
      title: section.title?.trim() || '自定义分区',
      kind: 'custom',
      entries: items.map(entryItemToRender)
    }
  }

  const blocks = section.kind === 'custom' ? section.content.blocks || [] : []
  if (!blocks.some((block) => block.text.trim().length > 0)) return null
  return {
    id: section.id,
    title: section.title?.trim() || '自定义分区',
    kind: 'custom',
    blocks
  }
}

/**
 * 文档 v2 → 渲染分区序列。顺序与可见性以文档数组为准：
 * 内置分区内容沿用既有模型字段，自定义分区携带自己的块或条目。
 * 没有文档时退回旧的 sectionOrder 行为，保证未升级调用方不受影响。
 */
export const buildRenderSections = (
  document: ResumeDocumentV2 | null | undefined,
  model: SectionContentModel
): ResumeRenderSection[] => {
  if (!document) {
    return model.sectionOrder
      .filter((key) =>
        builtinHasContent(key, model)
        && !model.hiddenSections.includes(key)
        && !model.presentation.hiddenSections.includes(key))
      .map((key) => ({
        id: `sec-${key}`,
        title: BUILTIN_TITLES[key],
        builtinKey: key,
        kind: builtinKind(key)
      }))
  }

  return document.sections
    .filter((section) => section.visible !== false)
    .map((section) => mapDocumentSection(section, model))
    .filter((section): section is ResumeRenderSection => Boolean(section))
}
