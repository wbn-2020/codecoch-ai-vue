import {
  buildResumeDocumentModel,
  normalizeResumeTemplateCode,
  resumeTemplateSectionOrder,
  type ResumePreviewDensity,
  type ResumeDocumentDraft
} from '@/features/resume-document'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'
import { buildRenderSections } from './render-sections'
import { normalizeResumePresentation } from '@/features/resume-presentation'
import type { ResumePresentationConfig } from '@/types/resumePresentation'

import type {
  ResumeContactIconKey,
  ResumeContactModel,
  ResumeRenderModel,
  ResumeRenderSection
} from './schema'

type ResumeBasicField = 'realName' | 'targetPosition' | 'email' | 'phone'

const contactDefinitions: Array<{
  key: ResumeContactModel['key']
  label: string
  iconKey: ResumeContactModel['iconKey']
  field: 'phone' | 'email'
}> = [
  { key: 'phone', label: '电话', iconKey: 'phone', field: 'phone' },
  { key: 'email', label: '邮箱', iconKey: 'mail', field: 'email' }
]

const normalizeContact = (
  draft: ResumeDocumentDraft,
  presentation: ResumePresentationConfig
): ResumeContactModel[] => {
  const configuredOrder = presentation.basicFieldOrder || []
  const order = [
    ...configuredOrder.filter((field): field is ResumeBasicField =>
      field === 'phone' || field === 'email'
    ),
    ...contactDefinitions.map((definition) => definition.field)
  ]
  const uniqueOrder = Array.from(new Set(order))

  return [...contactDefinitions]
    .sort((left, right) =>
      uniqueOrder.indexOf(left.field) - uniqueOrder.indexOf(right.field)
    )
    .map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: String(draft[definition.field] || '').trim(),
    iconKey: (
      presentation.basicFieldIcons[definition.field] || definition.iconKey
    ) as ResumeContactIconKey,
    visible: presentation.basicFieldVisibility[definition.field] !== false
      && presentation.fieldVisibility[definition.field] !== false,
    showLabel: presentation.iconMode === 'TEXT'
    }))
    .filter((contact) => contact.visible && Boolean(contact.value))
}

const CUSTOM_CONTACT_LABELS: Record<string, string> = {
  url: '链接',
  location: '所在地',
  text: '其他'
}

const defaultContactLabel = (kind: string): string => CUSTOM_CONTACT_LABELS[kind] || '其他'

/**
 * 文档 v2 的 basics.contacts 除了 phone/email（由 normalizeContact 从扁平字段映射），
 * 还可能携带 url/location/text 等自定义字段；这里把它们补进渲染模型，
 * 图标按 kind 取 url→Link / location→MapPin / 其余→circle（见 TemplateContactItem）。
 */
const appendCustomContacts = (
  base: ResumeContactModel[],
  document?: ResumeDocumentV2 | null
): ResumeContactModel[] => {
  if (!document?.basics?.contacts?.length) return base
  const extras = document.basics.contacts
    .filter((contact) => contact.kind !== 'phone' && contact.kind !== 'email')
    .map((contact) => ({
      key: contact.id,
      label: contact.label || defaultContactLabel(contact.kind),
      value: String(contact.value || '').trim(),
      iconKey: contact.iconKey,
      visible: contact.visible !== false,
      showLabel: contact.showLabel === true
    }))
    .filter((contact) => contact.visible && Boolean(contact.value))
  return extras.length ? [...base, ...extras] : base
}

export const buildResumeRenderModel = (
  draft: ResumeDocumentDraft,
  presentationSource?: ResumePresentationConfig,
  density: ResumePreviewDensity = 'comfortable',
  document?: ResumeDocumentV2 | null
): ResumeRenderModel => {
  const rawPresentation = presentationSource || draft.presentationConfig
  const documentModel = buildResumeDocumentModel(draft)
  const presentation = normalizeResumePresentation(
    rawPresentation,
    { templateCode: normalizeResumeTemplateCode(rawPresentation?.templateCode) }
  )
  const templateCode = normalizeResumeTemplateCode(
    presentationSource?.templateCode || draft.presentationConfig?.templateCode
  )
  const canonicalSectionOrder = ['summary', 'experience', 'projects', 'skills', 'education']
  const hasExplicitSectionOrder = presentation.overrides?.sectionOrder === true
    || presentation.sectionOrder.some((section, index) => section !== canonicalSectionOrder[index])
    || presentation.sectionOrder.length !== canonicalSectionOrder.length
  if (!hasExplicitSectionOrder) {
    presentation.sectionOrder = resumeTemplateSectionOrder(templateCode)
  }

  const model: ResumeRenderModel = {
    identity: {
      name: documentModel.name,
      targetPosition: documentModel.targetPosition
    },
    basicLayout: presentation.basicLayout,
    basicFieldOrder: presentation.basicFieldOrder,
    basicFieldVisibility: presentation.basicFieldVisibility,
    basicFieldIcons: presentation.basicFieldIcons,
    iconMode: presentation.iconMode,
    density,
    contacts: appendCustomContacts(normalizeContact(draft, presentation), document),
    summary: documentModel.summary,
    skills: documentModel.skills,
    skillGroups: documentModel.skillGroups,
    experience: documentModel.workEntries,
    projects: documentModel.projectEntries,
    education: documentModel.educationEntries,
    sectionOrder: presentation.sectionOrder,
    hiddenSections: presentation.hiddenSections,
    renderSections: [] as ResumeRenderSection[],
    presentation,
    source: draft,
    hasContent: documentModel.hasContent
  }
  model.renderSections = buildRenderSections(document, model)
  return model
}
