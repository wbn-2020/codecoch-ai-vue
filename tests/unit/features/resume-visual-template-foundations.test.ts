import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { buildResumeRenderModel } from '@/features/resume-template/adapter'
import { normalizeResumePresentation } from '@/features/resume-presentation'
import {
  CreativeTemplateRenderer,
  CREATIVE_RENDERER_KEY
} from '@/views/resume/templates/creative'
import {
  ElegantTemplateRenderer,
  ELEGANT_RENDERER_KEY
} from '@/views/resume/templates/elegant'
import {
  MinimalistTemplateRenderer,
  MINIMALIST_RENDERER_KEY
} from '@/views/resume/templates/minimalist'
import {
  SwissTemplateRenderer,
  SWISS_RENDERER_KEY
} from '@/views/resume/templates/swiss'
import {
  TimelineTemplateRenderer,
  TIMELINE_RENDERER_KEY
} from '@/views/resume/templates/timeline'

const makeModel = (presentationSource?: Record<string, unknown>) =>
  buildResumeRenderModel({
    realName: '林晨',
    email: 'linchen@example.com',
    phone: '138 0000 0000',
    targetPosition: 'Java 工程师',
    summary: '负责订单域服务建设，持续提升系统稳定性。',
    skillStack: 'Java, Spring Boot, MySQL',
    workExperience: '某科技公司 · Java 工程师 2024.01 - 至今\n负责订单服务开发。',
    projects: [{
      projectName: '订单平台',
      projectBackground: '支撑多渠道订单接入',
      coreFeatures: '建设订单编排流程'
    }],
    educationExperience: '某大学 · 计算机科学与技术 2020 - 2024'
  }, normalizeResumePresentation(presentationSource))

const renderers = [
  ['timeline', TimelineTemplateRenderer, TIMELINE_RENDERER_KEY, 'timeline-renderer'],
  ['minimalist', MinimalistTemplateRenderer, MINIMALIST_RENDERER_KEY, 'minimalist-renderer'],
  ['elegant', ElegantTemplateRenderer, ELEGANT_RENDERER_KEY, 'elegant-renderer'],
  ['creative', CreativeTemplateRenderer, CREATIVE_RENDERER_KEY, 'creative-renderer'],
  ['swiss', SwissTemplateRenderer, SWISS_RENDERER_KEY, 'swiss-renderer']
] as const

describe('resume visual template foundations', () => {
  it.each(renderers)('exposes the %s renderer key and renders ResumeRenderModel content', (_name, renderer, key, className) => {
    const wrapper = mount(renderer, {
      props: { model: makeModel() }
    })

    expect(key).toBe(`codecoachai/${_name}`)
    expect(wrapper.find(`.${className}`).exists()).toBe(true)
    expect(wrapper.text()).toContain('林晨')
    expect(wrapper.text()).toContain('Java 工程师')
    expect(wrapper.text()).toContain('linchen@example.com')
    expect(wrapper.text()).toContain('订单平台')
  })

  it('uses the configured section order and hiddenSections in every renderer', () => {
    const model = makeModel({
      sectionOrder: ['education', 'skills', 'summary', 'projects', 'experience'],
      hiddenSections: ['education', 'projects']
    })

    for (const [_name, renderer] of renderers) {
      const wrapper = mount(renderer, { props: { model } })
      const sections = wrapper.findAll('[data-section]')

      expect(sections.map((section) => section.attributes('data-section'))).toEqual([
        'skills',
        'summary',
        'experience'
      ])
      expect(wrapper.text()).not.toContain('订单平台')
      expect(wrapper.text()).not.toContain('某大学')
    }
  })

  it('applies fieldVisibility, contacts, iconMode, and presentation variables', () => {
    const model = makeModel({
      fieldVisibility: {
        realName: false,
        email: false
      },
      iconMode: 'TEXT',
      accentColor: 'ocean',
      fontFamily: 'Microsoft YaHei',
      fontScale: 1.1,
      lineHeight: 1.6,
      sectionSpacing: 1.4,
      pageMarginPt: 52
    })

    for (const [_name, renderer] of renderers) {
      const wrapper = mount(renderer, { props: { model } })
      const style = wrapper.attributes('style')

      expect(wrapper.classes()).toContain('template-paper')
      expect(wrapper.text()).not.toContain('林晨')
      expect(wrapper.text()).not.toContain('linchen@example.com')
      expect(wrapper.text()).toContain('138 0000 0000')
      expect(style).toContain('--template-font-family: Microsoft YaHei')
      expect(style).toContain('--template-font-scale: 1.1')
      expect(style).toContain('--template-line-height: 1.6')
      expect(style).toContain('--template-section-gap: 25.2px')
      expect(style).toContain('--template-page-margin: 69.33px')
      expect(style).toContain('--template-accent: #3E6AAE')
      expect(wrapper.find('.template-contact-item__label').exists()).toBe(true)
    }
  })

  it('uses five different structural signatures', () => {
    const wrappers = renderers.map(([_name, renderer]) =>
      mount(renderer, { props: { model: makeModel() } })
    )

    expect(wrappers[0].find('.timeline-renderer__track').exists()).toBe(true)
    expect(wrappers[1].find('.minimalist-renderer__section h2').exists()).toBe(true)
    expect(wrappers[1].find('.template-section-title').exists()).toBe(false)
    expect(wrappers[2].find('.template-section-title').exists()).toBe(true)
    expect(wrappers[3].find('.creative-renderer__section-label').exists()).toBe(true)
    expect(wrappers[4].find('.swiss-renderer__body').attributes('class')).toContain('swiss-renderer__body')
    expect(wrappers[4].find('.swiss-renderer__body').element.tagName).toBe('MAIN')
  })
})
