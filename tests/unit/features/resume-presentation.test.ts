import { describe, expect, it } from 'vitest'

import {
  createDefaultResumePresentation,
  mergeResumeTemplatePresentation,
  normalizeResumePresentation
} from '@/features/resume-presentation'

describe('resume presentation config', () => {
  it('creates a complete default configuration', () => {
    const config = createDefaultResumePresentation('ATS_COMPACT', 3)

    expect(config.templateCode).toBe('ATS_COMPACT')
    expect(config.templateVersion).toBe(3)
    expect(config.moduleOrder).toHaveLength(5)
    expect(config.sectionOrder).toEqual([
      'summary',
      'experience',
      'projects',
      'skills',
      'education'
    ])
  })

  it('drops unsupported values and keeps bounded presentation settings', () => {
    const config = normalizeResumePresentation({
      templateCode: 'UNTRUSTED',
      fontFamily: 'url(https://example.com/font.woff)',
      fontScale: 10,
      lineHeight: 0,
      hiddenModules: ['resume-basic', 'resume-skills', 'unknown'],
      fieldOrder: {
        realName: ['email', '<script>', 'email', 'unknown']
      }
    })

    expect(config.templateCode).toBe('ATS_SINGLE_COLUMN')
    expect(config.fontFamily).toBe('Arial')
    expect(config.fontScale).toBe(1.18)
    expect(config.lineHeight).toBe(1)
    expect(config.hiddenModules).toEqual(['resume-skills'])
    expect(config.fieldOrder).toEqual({ realName: ['email'] })
  })

  it('merges registered template layout without discarding user settings', () => {
    const config = normalizeResumePresentation({
      accentColor: 'berry',
      hiddenSections: ['education']
    })

    const merged = mergeResumeTemplatePresentation(config, {
      templateCode: 'ATS_PROJECT_FOCUS',
      templateVersion: 2,
      definition: {
        sectionOrder: ['projects', 'summary', 'unknown'],
        hiddenSections: ['skills']
      }
    })

    expect(merged.templateCode).toBe('ATS_PROJECT_FOCUS')
    expect(merged.templateVersion).toBe(2)
    expect(merged.accentColor).toBe('red')
    expect(merged.sectionOrder).toEqual(['projects', 'summary', 'experience', 'skills', 'education'])
    expect(merged.hiddenSections).toEqual(['skills'])
  })

  it('uses explicit overrides when a template is applied', () => {
    const config = normalizeResumePresentation({
      templateCode: 'ATS_SINGLE_COLUMN',
      fontFamily: 'Microsoft YaHei',
      pageMarginPt: 50,
      overrides: { fontFamily: true, pageMarginPt: true }
    })

    const merged = mergeResumeTemplatePresentation(config, {
      templateCode: 'ATS_COMPACT',
      templateVersion: 2,
      definition: {
        fontFamily: 'Arial',
        marginPt: 32,
        lineSpacing: 1
      }
    })

    expect(merged.fontFamily).toBe('Microsoft YaHei')
    expect(merged.pageMarginPt).toBe(50)
    expect(merged.lineHeight).toBe(1)
  })

  it('normalizes basic information layout and safe icon settings', () => {
    const config = normalizeResumePresentation({
      basicLayout: 'CENTER',
      basicFieldOrder: ['email', 'phone', 'unknown', 'email'],
      basicFieldVisibility: {
        phone: false
      },
      basicFieldIcons: {
        email: 'mail',
        phone: '<script>',
        realName: 'user'
      },
      iconMode: 'ICON',
      autoOnePage: true
    })

    expect(config.basicLayout).toBe('CENTER')
    expect(config.basicFieldOrder).toEqual([
      'email',
      'phone',
      'realName',
      'targetPosition'
    ])
    expect(config.basicFieldVisibility.phone).toBe(false)
    expect(config.basicFieldIcons.email).toBe('mail')
    expect(config.basicFieldIcons.phone).toBe('phone')
    expect(config.iconMode).toBe('ICON')
    expect(config.autoOnePage).toBe(true)
  })

  it('falls back safely for unsupported basic layout and icon mode', () => {
    const config = normalizeResumePresentation({
      basicLayout: 'FLOATING',
      iconMode: 'SVG',
      autoOnePage: 'yes'
    })

    expect(config.basicLayout).toBe('LEFT')
    expect(config.iconMode).toBe('ICON')
    expect(config.autoOnePage).toBe(false)
  })

  it('preserves partial fallback basic settings when the snapshot omits fields', () => {
    const config = normalizeResumePresentation({
      basicFieldVisibility: {
        email: true
      },
      basicFieldIcons: {
        email: 'mail'
      }
    }, {
      basicFieldVisibility: {
        phone: false
      },
      basicFieldIcons: {
        phone: 'circle'
      }
    })

    expect(config.basicFieldVisibility).toMatchObject({
      email: true,
      phone: false
    })
    expect(config.basicFieldIcons).toMatchObject({
      email: 'mail',
      phone: 'circle'
    })
  })
})
