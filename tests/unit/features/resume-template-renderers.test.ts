import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { buildResumeRenderModel } from '@/features/resume-template/adapter'
import { normalizeResumePresentation } from '@/features/resume-presentation'
import { ClassicTemplateRenderer, CLASSIC_RENDERER_KEY } from '@/views/resume/templates/classic'
import { LeftRightTemplateRenderer, LEFT_RIGHT_RENDERER_KEY } from '@/views/resume/templates/left-right'
import { ModernTemplateRenderer, MODERN_RENDERER_KEY } from '@/views/resume/templates/modern'
import {
  hasSectionContent,
  isFieldVisible,
  visibleSections
} from '@/views/resume/templates/shared/renderModel'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

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

describe('resume template renderer foundation', () => {
  it('exposes stable renderer keys for all three stage-three renderers', () => {
    expect(CLASSIC_RENDERER_KEY).toBe('codecoachai/classic')
    expect(MODERN_RENDERER_KEY).toBe('codecoachai/modern')
    expect(LEFT_RIGHT_RENDERER_KEY).toBe('codecoachai/left-right')
  })

  it('shares section and field visibility rules across renderers', () => {
    const model = makeModel({
      hiddenSections: ['education'],
      fieldVisibility: {
        phone: false
      }
    })

    expect(isFieldVisible(model, 'phone')).toBe(false)
    expect(hasSectionContent(model, 'education')).toBe(false)
    expect(visibleSections(model)).not.toContain('education')
    expect(visibleSections(model)).toContain('experience')
  })

  it.each([
    ['classic', ClassicTemplateRenderer, 'classic-renderer'],
    ['modern', ModernTemplateRenderer, 'modern-renderer'],
    ['left-right', LeftRightTemplateRenderer, 'left-right-renderer']
  ] as const)('renders model content with the %s layout', (_name, renderer, className) => {
    const wrapper = mount(renderer, {
      props: {
        model: makeModel()
      }
    })

    expect(wrapper.find(`.${className}`).exists()).toBe(true)
    expect(wrapper.text()).toContain('林晨')
    expect(wrapper.text()).toContain('Java 工程师')
    expect(wrapper.text()).toContain('linchen@example.com')
    expect(wrapper.text()).toContain('订单平台')
    expect(wrapper.text()).toContain('工作经历')
  })

  it('does not render hidden identity fields or hidden sections', () => {
    const wrapper = mount(ClassicTemplateRenderer, {
      props: {
        model: makeModel({
          hiddenSections: ['projects'],
          fieldVisibility: {
            realName: false,
            email: false
          }
        })
      }
    })

    expect(wrapper.text()).not.toContain('林晨')
    expect(wrapper.text()).not.toContain('linchen@example.com')
    expect(wrapper.text()).not.toContain('订单平台')
    expect(wrapper.text()).toContain('Java 工程师')
  })

  it('keeps project and streak renderers aligned with the configured section order', () => {
    const projectSource = readSource(
      'src/views/resume/templates/project/ProjectTemplateRenderer.vue'
    )
    const streakSource = readSource(
      'src/views/resume/templates/streak/StreakTemplateRenderer.vue'
    )

    expect(projectSource).not.toContain('projectFirstOrder')
    expect(projectSource).toContain('visibleSections(props.model)')
    expect(streakSource).toContain('v-for="section in sections"')
    expect(streakSource).toContain('streamEntriesBySection[section]')
    expect(streakSource).not.toContain('grid-template-columns: 74px minmax(0, 1fr)')
  })
})
