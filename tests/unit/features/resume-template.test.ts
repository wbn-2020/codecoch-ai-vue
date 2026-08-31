import { describe, expect, it } from 'vitest'

import { buildResumeRenderModel } from '@/features/resume-template/adapter'
import {
  getResumeTemplateDefinition,
  listResumeTemplateDefinitions,
  mergeResumeTemplateDefinition,
  resumeTemplateRegistry
} from '@/features/resume-template/registry'
import { normalizeResumePresentation } from '@/features/resume-presentation'

describe('resume template registry', () => {
  it('keeps the eleven supported template codes stable', () => {
    expect(resumeTemplateRegistry.map((template) => template.code)).toEqual([
      'ATS_SINGLE_COLUMN',
      'ATS_COMPACT',
      'ATS_PROJECT_FOCUS',
      'ATS_CLASSIC_SIDEBAR',
      'ATS_STREAK_SIGNATURE',
      'MAGIC_TIMELINE',
      'MAGIC_MINIMALIST',
      'MAGIC_ELEGANT',
      'MAGIC_CREATIVE',
      'MAGIC_EDITORIAL',
      'MAGIC_SWISS'
    ])
  })

  it('falls back to the single-column template for unknown codes', () => {
    const template = getResumeTemplateDefinition('UNKNOWN_TEMPLATE')

    expect(template.code).toBe('ATS_SINGLE_COLUMN')
    expect(template.layout.columns).toBe(1)
    expect(template.backendRegistered).toBe(false)
  })

  it('merges backend version and definition without replacing local renderer metadata', () => {
    const template = mergeResumeTemplateDefinition('ATS_PROJECT_FOCUS', {
      templateCode: 'ATS_PROJECT_FOCUS',
      templateVersion: 4,
      templateName: '后端项目模板',
      status: 'ACTIVE',
      definition: {
        sectionOrder: ['projects', 'experience']
      }
    })

    expect(template.version).toBe(4)
    expect(template.rendererKey).toBe('codecoachai/project')
    expect(template.backendRegistered).toBe(true)
    expect(template.exportAvailable).toBe(true)
    expect(template.backendDefinition).toEqual({
      sectionOrder: ['projects', 'experience']
    })
  })

  it('marks a disabled backend template as unavailable for new exports', () => {
    const templates = listResumeTemplateDefinitions([{
      templateCode: 'ATS_COMPACT',
      templateVersion: 2,
      templateName: '紧凑模板',
      status: 'DISABLED'
    }])
    const compact = templates.find((template) => template.code === 'ATS_COMPACT')

    expect(compact?.backendRegistered).toBe(true)
    expect(compact?.exportAvailable).toBe(false)
  })

  it('keeps design-only visual templates out of the formal export contract', () => {
    const sidebar = getResumeTemplateDefinition('ATS_CLASSIC_SIDEBAR')
    const streak = getResumeTemplateDefinition('ATS_STREAK_SIGNATURE')
    const magic = getResumeTemplateDefinition('MAGIC_TIMELINE')

    expect(sidebar.exportAvailable).toBe(false)
    expect(streak.exportAvailable).toBe(false)
    // V4_128 registers the MAGIC_* codes on the server ATS channel as single-column exports.
    expect(magic.exportAvailable).toBe(true)
    expect(getResumeTemplateDefinition('ATS_SINGLE_COLUMN').exportAvailable).toBe(true)
    expect(getResumeTemplateDefinition('ATS_COMPACT').exportAvailable).toBe(true)
    expect(getResumeTemplateDefinition('ATS_PROJECT_FOCUS').exportAvailable).toBe(true)
  })

  it('resolves every registered renderer key to a component', async () => {
    const { getResumeRendererComponent } = await import('@/views/resume/templates')

    for (const template of resumeTemplateRegistry) {
      expect(getResumeRendererComponent(template.rendererKey)).toBeTruthy()
    }
  })

  it('keeps project and streak on independent renderer components', async () => {
    const {
      getResumeRendererComponent,
      ProjectTemplateRenderer,
      StreakTemplateRenderer,
      ModernTemplateRenderer,
      EditorialTemplateRenderer
    } = await import('@/views/resume/templates')

    expect(getResumeRendererComponent('codecoachai/project')).toBe(ProjectTemplateRenderer)
    expect(getResumeRendererComponent('codecoachai/streak')).toBe(StreakTemplateRenderer)
    expect(ProjectTemplateRenderer).not.toBe(ModernTemplateRenderer)
    expect(StreakTemplateRenderer).not.toBe(EditorialTemplateRenderer)
  })
})

describe('resume render model adapter', () => {
  it('normalizes contact visibility and configured order', () => {
    const presentation = normalizeResumePresentation({
      fieldVisibility: {
        phone: true,
        email: true
      },
      basicFieldOrder: ['email', 'unknown', 'phone']
    })
    const model = buildResumeRenderModel({
      realName: '林晨',
      phone: '138 0000 0000',
      email: 'linchen@example.com'
    }, presentation)

    expect(model.contacts.map((contact) => contact.key)).toEqual(['email', 'phone'])
    expect(model.contacts.map((contact) => contact.iconKey)).toEqual(['mail', 'phone'])
  })

  it('filters hidden and empty contacts', () => {
    const presentation = normalizeResumePresentation({
      fieldVisibility: {
        phone: false,
        email: true
      }
    })
    const model = buildResumeRenderModel({
      phone: '138 0000 0000',
      email: ' '
    }, presentation)

    expect(model.contacts).toEqual([])
  })

  it('reuses the compatible document parser for entries and sections', () => {
    const model = buildResumeRenderModel({
      realName: '林晨',
      targetPosition: 'Java 工程师',
      workExperience: '某科技公司 · Java 工程师 2024.01 - 至今\n负责订单域服务开发。',
      skillStack: 'Java, Spring Boot, MySQL'
    })

    expect(model.identity).toEqual({
      name: '林晨',
      targetPosition: 'Java 工程师'
    })
    expect(model.basicLayout).toBe('LEFT')
    expect(model.experience).toHaveLength(1)
    expect(model.skills).toEqual(['Java', 'Spring Boot', 'MySQL'])
    expect(model.sectionOrder).toEqual([
      'summary',
      'experience',
      'projects',
      'skills',
      'education'
    ])
  })
})
