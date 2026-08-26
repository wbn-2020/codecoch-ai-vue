import type { ResumeRenderModel } from '@/features/resume-template/schema'
import type {
  ResumePresentationField,
  ResumePresentationSection
} from '@/types/resumePresentation'

export const sectionTitles: Record<ResumePresentationSection, string> = {
  summary: '个人摘要',
  skills: '专业技能',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育经历'
}

export const isFieldVisible = (
  model: ResumeRenderModel,
  field: ResumePresentationField
) => {
  if (model.presentation.fieldVisibility[field] === false) return false

  if (
    field === 'realName'
    || field === 'targetPosition'
    || field === 'email'
    || field === 'phone'
  ) {
    return model.basicFieldVisibility[field] !== false
  }

  return true
}

export const isSectionVisible = (
  model: ResumeRenderModel,
  section: ResumePresentationSection
) =>
  !model.hiddenSections.includes(section)
  && !model.presentation.hiddenSections.includes(section)

export const hasSectionContent = (
  model: ResumeRenderModel,
  section: ResumePresentationSection
) => {
  if (!isSectionVisible(model, section)) return false

  if (section === 'summary') {
    return isFieldVisible(model, 'summary') && model.summary.length > 0
  }
  if (section === 'skills') {
    return isFieldVisible(model, 'skills') && model.skills.length > 0
  }
  if (section === 'experience') {
    return isFieldVisible(model, 'workExperience') && model.experience.length > 0
  }
  if (section === 'projects') {
    return isFieldVisible(model, 'projects') && model.projects.length > 0
  }
  return isFieldVisible(model, 'educationExperience') && model.education.length > 0
}

export const visibleSections = (model: ResumeRenderModel) =>
  model.sectionOrder.filter((section) => hasSectionContent(model, section))
