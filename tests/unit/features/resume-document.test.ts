import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import {
  buildResumeDocumentModel,
  normalizeResumeTemplateCode,
  resumeTemplateSectionOrder
} from '@/features/resume-document'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

describe('resume document model', () => {
  it('turns flat resume fields into semantic entries without inventing content', () => {
    const model = buildResumeDocumentModel({
      realName: '测试用户',
      targetPosition: 'Java 开发工程师',
      phone: '13800000000',
      email: 'candidate@example.com',
      summary: '负责交易系统建设。推动接口稳定性提升。',
      skillStack: 'Java、Spring Boot、MySQL、Redis、Docker',
      workExperience: '示例科技 · Java 工程师 2022.03 - 至今\n负责订单服务重构\n接口错误率下降 30%',
      educationExperience: '示例大学 · 软件工程 2018.09 - 2022.06\n本科',
      projects: [{
        projectId: 7,
        projectName: '订单中台',
        projectTime: '2023.01 - 2023.10',
        role: '核心开发',
        techStack: 'Spring Boot / Redis',
        projectBackground: '支撑多渠道订单接入',
        technicalChallenges: '解决热点数据竞争',
        optimizationResult: '峰值吞吐提升 40%'
      }]
    })

    expect(model.name).toBe('测试用户')
    expect(model.summary).toEqual(['负责交易系统建设。推动接口稳定性提升。'])
    expect(model.workEntries[0]).toMatchObject({
      title: '示例科技 · Java 工程师',
      period: '2022.03 - 至今'
    })
    expect(model.workEntries[0].bullets).toEqual(['负责订单服务重构', '接口错误率下降 30%'])
    expect(model.projectEntries[0].bullets).toEqual([
      '支撑多渠道订单接入',
      '解决热点数据竞争',
      '峰值吞吐提升 40%'
    ])
    expect(model.skillGroups.flatMap((group) => group.items)).toEqual(model.skills)
  })

  it('does not treat an internal resume name as actual paper content', () => {
    expect(buildResumeDocumentModel({ resumeName: 'Java 简历 V2' }).hasContent).toBe(false)
  })

  it('keeps flat narrative fields under their section instead of repeating the section title', () => {
    const model = buildResumeDocumentModel({
      workExperience: '负责订单服务重构。接口错误率下降 30%。',
      educationExperience: '示例大学软件工程本科。'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '',
      bullets: ['负责订单服务重构。接口错误率下降 30%。']
    })
    expect(model.educationEntries[0]).toMatchObject({
      title: '',
      bullets: ['示例大学软件工程本科。']
    })
  })

  it('removes pasted section headings and keeps flat multi-line content as bullets', () => {
    const model = buildResumeDocumentModel({
      workExperience: '工作经历\n负责订单服务重构\n推动接口错误率下降 30%',
      educationExperience: '教育经历：\n示例大学软件工程本科'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '',
      bullets: ['负责订单服务重构', '推动接口错误率下降 30%']
    })
    expect(model.educationEntries[0]).toMatchObject({
      title: '示例大学软件工程本科',
      bullets: []
    })
  })

  it('does not promote narrative lines that happen to mention an organization and role', () => {
    const model = buildResumeDocumentModel({
      workExperience: '负责示例科技公司订单系统开发 2022.03 - 至今\n接口错误率下降 30%',
      educationExperience: '在示例大学期间主修软件工程\n获得校级奖学金'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '',
      period: '',
      bullets: ['负责示例科技公司订单系统开发 2022.03 - 至今', '接口错误率下降 30%']
    })
    expect(model.educationEntries[0]).toMatchObject({
      title: '',
      bullets: ['在示例大学期间主修软件工程', '获得校级奖学金']
    })
  })

  it('keeps a role-first title and a following date line as one semantic entry', () => {
    const model = buildResumeDocumentModel({
      workExperience: '开发工程师 示例科技公司\n2022.03 - 至今\n负责订单服务重构'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '开发工程师 示例科技公司',
      period: '2022.03 - 至今',
      bullets: ['负责订单服务重构']
    })
  })

  it('does not confuse organizations starting with 在 with narrative prefixes', () => {
    const model = buildResumeDocumentModel({
      workExperience: [
        '在线教育工作室 · 前端开发工程师 2022.03 - 至今',
        '负责课程平台前端开发',
        '',
        '在线学习科技公司 · Java 工程师 2020.06 - 2022.02',
        '负责订单服务重构'
      ].join('\n')
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '在线教育工作室 · 前端开发工程师',
      period: '2022.03 - 至今',
      bullets: ['负责课程平台前端开发']
    })
    expect(model.workEntries[1]).toMatchObject({
      title: '在线学习科技公司 · Java 工程师',
      period: '2020.06 - 2022.02',
      bullets: ['负责订单服务重构']
    })
  })

  it('keeps explicit 在某机构 action phrases as narrative content', () => {
    const model = buildResumeDocumentModel({
      workExperience: [
        '在示例科技公司任职期间负责订单系统',
        '在示例科技公司工作时参与架构升级'
      ].join('\n'),
      educationExperience: '在示例大学期间主修软件工程'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '',
      period: '',
      bullets: [
        '在示例科技公司任职期间负责订单系统',
        '在示例科技公司工作时参与架构升级'
      ]
    })
    expect(model.educationEntries[0]).toMatchObject({
      title: '',
      period: '',
      bullets: ['在示例大学期间主修软件工程']
    })
  })

  it('preserves standalone and inline date ranges without duplicating them in bullets', () => {
    const standalone = buildResumeDocumentModel({
      workExperience: '2022.03 - 至今\n负责订单服务重构'
    })
    const inline = buildResumeDocumentModel({
      workExperience: '示例科技 · Java 工程师 2022.03 - 至今'
    })

    expect(standalone.workEntries[0]).toMatchObject({
      title: '',
      period: '2022.03 - 至今',
      bullets: ['负责订单服务重构']
    })
    expect(inline.workEntries[0]).toMatchObject({
      title: '示例科技 · Java 工程师',
      period: '2022.03 - 至今',
      bullets: []
    })
  })

  it('extracts a date range placed on the line after an entry title', () => {
    const model = buildResumeDocumentModel({
      workExperience: '示例科技 · Java 工程师\n2022.03 - 至今\n负责订单服务重构'
    })

    expect(model.workEntries[0]).toMatchObject({
      title: '示例科技 · Java 工程师',
      period: '2022.03 - 至今',
      bullets: ['负责订单服务重构']
    })
  })

  it('does not create an empty entry from a section heading alone', () => {
    const model = buildResumeDocumentModel({ workExperience: '工作经历：' })

    expect(model.workEntries).toEqual([])
    expect(model.hasContent).toBe(false)
  })

  it('renders a pasted section heading once and skips an empty entry header', () => {
    const wrapper = mount(ResumeDocumentPreview, {
      props: {
        draft: {
          workExperience: '工作经历\n负责订单服务重构'
        }
      }
    })

    expect(wrapper.text().match(/工作经历/g)).toHaveLength(1)
    expect(wrapper.find('.document-entry__head').exists()).toBe(false)
    expect(wrapper.find('.document-entry li').text()).toBe('负责订单服务重构')
  })

  it('keeps preview order aligned with the three server ATS templates', () => {
    expect(resumeTemplateSectionOrder('ATS_SINGLE_COLUMN')).toEqual([
      'summary',
      'experience',
      'projects',
      'skills',
      'education'
    ])
    expect(resumeTemplateSectionOrder('ATS_COMPACT')[1]).toBe('skills')
    expect(resumeTemplateSectionOrder('ATS_PROJECT_FOCUS')[2]).toBe('projects')
    expect(normalizeResumeTemplateCode('UNKNOWN')).toBe('ATS_SINGLE_COLUMN')
  })
})
