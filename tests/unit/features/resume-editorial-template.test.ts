import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildResumeRenderModel } from '@/features/resume-template/adapter'
import { normalizeResumePresentation } from '@/features/resume-presentation'
import {
  EditorialTemplateRenderer,
  EDITORIAL_RENDERER_KEY
} from '@/views/resume/templates/editorial'

const makeModel = () =>
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
  }, normalizeResumePresentation({
    sectionOrder: ['education', 'skills', 'summary', 'projects', 'experience'],
    hiddenSections: ['education'],
    fieldVisibility: {
      realName: false,
      email: false,
      projects: false
    },
    accentColor: 'ocean',
    fontFamily: 'Microsoft YaHei',
    fontScale: 1.1,
    lineHeight: 1.6,
    sectionSpacing: 1.4,
    pageMarginPt: 52
  }))

describe('editorial resume template renderer', () => {
  it('exposes the editorial renderer key', () => {
    expect(EDITORIAL_RENDERER_KEY).toBe('codecoachai/editorial')
  })

  it('renders a single-column editorial layout from presentation controls', () => {
    const wrapper = mount(EditorialTemplateRenderer, {
      props: {
        model: makeModel()
      }
    })

    expect(wrapper.classes()).toContain('editorial-renderer')
    expect(wrapper.find('[data-section="skills"]').exists()).toBe(true)
    expect(wrapper.find('[data-section="summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-section="experience"]').exists()).toBe(true)
    expect(wrapper.find('[data-section="education"]').exists()).toBe(false)
    expect(wrapper.find('[data-section="projects"]').exists()).toBe(false)

    const text = wrapper.text()
    expect(text).not.toContain('林晨')
    expect(text).not.toContain('linchen@example.com')
    expect(text).toContain('138 0000 0000')
    expect(text).toContain('Java 工程师')
    expect(text.indexOf('专业技能')).toBeLessThan(text.indexOf('个人摘要'))
    expect(text.indexOf('个人摘要')).toBeLessThan(text.indexOf('工作经历'))

    const style = wrapper.attributes('style')
    expect(style).toContain('--template-font-family: Microsoft YaHei')
    expect(style).toContain('--template-font-scale: 1.1')
    expect(style).toContain('--template-line-height: 1.6')
    expect(style).toContain('--template-section-gap: 25.2px')
    expect(style).toContain('--template-page-margin: 69.33px')
    expect(style).toContain('--template-accent: #3E6AAE')
  })

  it('keeps the shared paper at strict A4 dimensions with named container queries', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/templates/shared/TemplatePaper.vue'),
      'utf8'
    )

    expect(source).toContain('width: 794px')
    expect(source).toContain('min-height: 1123px')
    expect(source).toContain('aspect-ratio: 210 / 297')
    expect(source).toContain('container: template-paper / inline-size')
    expect(source).toContain('points * (4 / 3)')
  })
})
