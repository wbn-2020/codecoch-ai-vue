import { describe, expect, it } from 'vitest'

import {
  renderMarkdownInline,
  stripMarkdownInline,
  toPlainLines
} from '@/features/resume-workbench/markdown-lite'
import { fromResumeDocument, toResumeDocument } from '@/features/resume-workbench/document-migrator'
import { normalizeResumeDocument } from '@/features/resume-workbench/document-normalizer'
import {
  resolveAnchorText,
  applyAnchorReplacement,
  sectionPlainText
} from '@/features/resume-workbench/document-anchor'
import {
  addCustomSection,
  addBlock,
  moveSection,
  removeSection,
  toggleSectionVisible,
  addEntryItem,
  moveEntryItem
} from '@/features/resume-workbench/section-ops'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'

const legacyScalars = {
  resumeName: '后端简历',
  realName: '张伟',
  email: 'zhangwei@example.com',
  phone: '13800000000',
  targetPosition: '高级 Java 工程师',
  summary:
    '八年后端与分布式系统经验，主导过日活千万级交易系统的核心链路重构与稳定性治理。曾负责可观测平台建设，将线上故障平均定位时间从小时级压缩到分钟级。持有 PMP 与阿里云架构师认证，长期关注高并发场景下的成本与效率平衡。',
  skills: 'Java,Spring,MySQL,Redis,Vue,Kafka,Docker,Kubernetes,ELK',
  workSummary: '',
  workExperience:
    '字节跳动 · 后端开发    2021.03-至今\n负责交易系统稳定性建设，核心接口 P99 降低 40%。\n搭建可观测平台，故障定位时间缩短 60%。\n\n美团 · Java 开发    2018.07-2021.02\n参与订单服务拆分，支撑峰值 QPS 提升 3 倍。',
  education: '',
  educationExperience: '华中科技大学    2014.09-2018.06\n计算机科学与技术 本科'
}

const legacyProjects = [
  {
    projectId: 101,
    projectName: 'CodeCoachAI 模拟面试',
    projectTime: '2025.01-2025.06',
    role: '后端负责人',
    techStack: 'Java, Spring, MySQL',
    projectBackground: '面向求职者的 AI 面试训练平台。',
    coreFeatures: '支持多轮问答与评分报告生成。',
    technicalChallenges: '高并发下会话状态一致性。',
    optimizationResult: '面试完成率提升 25%。',
    extraInfo: '开源项目。'
  }
]

const presentation = {
  templateCode: 'ATS_PROJECT_FOCUS',
  sectionOrder: ['summary', 'projects', 'skills', 'experience', 'education'],
  hiddenSections: ['education']
} as never

const buildDoc = (): ResumeDocumentV2 =>
  toResumeDocument(legacyScalars, legacyProjects as never, presentation)

describe('markdown-lite', () => {
  it('renders bold/italic/links and escapes html', () => {
    expect(renderMarkdownInline('用 **Java** 与 *Kafka* 构建系统')).toBe(
      '用 <strong>Java</strong> 与 <em>Kafka</em> 构建系统'
    )
    expect(renderMarkdownInline('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('only allows http/https/mailto links', () => {
    expect(renderMarkdownInline('[主页](https://example.com)')).toContain('<a href="https://example.com"')
    expect(renderMarkdownInline('[坏](javascript:alert(1))')).not.toContain('<a')
    expect(renderMarkdownInline('[邮](mailto:a@b.com)')).toContain('mailto:a@b.com')
  })

  it('strips markers for ATS plain text', () => {
    expect(stripMarkdownInline('**主导** 交易系统 [文档](https://x.cn)')).toBe('主导 交易系统 文档')
    expect(stripMarkdownInline('**主导** 系统', true)).toBe('主导 系统')
    expect(stripMarkdownInline('[https://x.cn](https://x.cn)', true)).toBe('https://x.cn (https://x.cn)')
  })

  it('toPlainLines drops empty lines and keeps kinds', () => {
    const lines = toPlainLines([
      { kind: 'bullet', text: '**做** 了 A' },
      { kind: 'line', text: '' }
    ])
    expect(lines).toEqual([{ kind: 'bullet', text: '做 了 A' }])
  })
})

describe('document migrator (legacy -> v2 -> legacy)', () => {
  it('maps flat fields into builtin sections with order/visibility projection', () => {
    const doc = buildDoc()
    expect(doc.schemaVersion).toBe(2)
    expect(doc.basics.name).toBe('张伟')
    expect(doc.basics.headline).toBe('高级 Java 工程师')
    expect(doc.basics.contacts.map((c) => c.kind)).toEqual(['phone', 'email'])
    expect(doc.layout.templateCode).toBe('ATS_PROJECT_FOCUS')
    expect(doc.sections.map((s) => s.builtinKey)).toEqual([
      'summary',
      'projects',
      'skills',
      'experience',
      'education'
    ])
    expect(doc.sections.find((s) => s.builtinKey === 'education')?.visible).toBe(false)
    const summary = doc.sections.find((s) => s.builtinKey === 'summary')
    expect(summary?.kind).toBe('text')
    if (summary?.kind === 'text') expect(summary.content.blocks.length).toBe(3)
    const skills = doc.sections.find((s) => s.builtinKey === 'skills')
    expect(skills?.kind).toBe('skills')
    const work = doc.sections.find((s) => s.builtinKey === 'experience')
    if (work?.kind === 'entry') {
      expect(work.content.items).toHaveLength(2)
      expect(work.content.items[0].heading).toBe('字节跳动 · 后端开发')
      expect(work.content.items[0].period).toBe('2021.03-至今')
      expect(work.content.items[0].blocks.length).toBe(2)
    } else {
      throw new Error('experience section missing')
    }
    const projects = doc.sections.find((s) => s.builtinKey === 'projects')
    if (projects?.kind === 'project') {
      expect(projects.content.items[0].serverId).toBe(101)
      expect(projects.content.items[0].fields.background).toHaveLength(1)
    } else {
      throw new Error('projects section missing')
    }
  })

  it('projects back to legacy scalars and idempotency holds on second pass', () => {
    const doc = buildDoc()
    const legacy = fromResumeDocument(doc)
    expect(legacy.realName).toBe('张伟')
    expect(legacy.targetPosition).toBe('高级 Java 工程师')
    expect(legacy.email).toBe('zhangwei@example.com')
    expect(legacy.phone).toBe('13800000000')
    expect(legacy.sectionOrder).toEqual(['summary', 'projects', 'skills', 'experience', 'education'])
    expect(legacy.hiddenSections).toEqual(['education'])
    expect(legacy.projects[0].projectName).toBe('CodeCoachAI 模拟面试')
    expect(legacy.projects[0].optimizationResult).toContain('面试完成率提升 25%')

    const docAgain = toResumeDocument(
      { ...legacyScalars, skillStack: legacy.skillStack, workExperience: legacy.workExperience, educationExperience: legacy.educationExperience, summary: legacy.summary },
      legacy.projects as never,
      presentation
    )
    const legacyAgain = fromResumeDocument(docAgain)
    expect(legacyAgain.workExperience).toBe(legacy.workExperience)
    expect(legacyAgain.skillStack).toBe(legacy.skillStack)
    expect(legacyAgain.summary).toBe(legacy.summary)
    expect(legacyAgain.educationExperience).toBe(legacy.educationExperience)
  })
})

describe('normalizer', () => {
  it('rejects non-v2 payloads and clamps layout values', () => {
    expect(normalizeResumeDocument({ schemaVersion: 1 })).toBeNull()
    const doc = normalizeResumeDocument({
      schemaVersion: 2,
      basics: { name: 'x'.repeat(100), contacts: [{ kind: 'weird', value: 'v' }] },
      layout: { fontScale: 99, lineHeight: 0, sectionSpacing: -4, pageMarginPt: 500 },
      sections: [
        { id: 'sec-summary', builtinKey: 'summary', kind: 'text', title: '总\u0007结', content: { blocks: [{ text: 'a' }] } }
      ]
    })!
    expect(doc.basics.name.length).toBeLessThanOrEqual(60)
    expect(doc.basics.contacts[0].kind).toBe('text')
    expect(doc.layout.fontScale).toBe(1.18)
    expect(doc.layout.lineHeight).toBe(1)
    expect(doc.layout.sectionSpacing).toBe(0.7)
    expect(doc.layout.pageMarginPt).toBe(72)
    expect(doc.sections[0].title).toBe('总结')
    expect(doc.sections[0].kind).toBe('text')
    if (doc.sections[0].kind === 'text') {
      expect(doc.sections[0].content.blocks[0].id).toBeTruthy()
    }
  })

  it('keeps migrated layout values untouched by normalization', () => {
    const doc = toResumeDocument(legacyScalars, legacyProjects as never, {
      templateCode: 'ATS_COMPACT',
      fontScale: 0.94,
      lineHeight: 1.45,
      sectionSpacing: 0.82,
      pageMarginPt: 64
    } as never)
    const normalized = normalizeResumeDocument(doc)!
    expect(normalized.layout.fontScale).toBe(0.94)
    expect(normalized.layout.lineHeight).toBe(1.45)
    expect(normalized.layout.sectionSpacing).toBe(0.82)
    expect(normalized.layout.pageMarginPt).toBe(64)
  })

  it('dedupes builtin keys and caps custom sections', () => {
    const doc = normalizeResumeDocument({
      schemaVersion: 2,
      basics: {},
      layout: {},
      sections: [
        { id: 'a', builtinKey: 'summary', kind: 'text', content: { blocks: [] } },
        { id: 'b', builtinKey: 'summary', kind: 'text', content: { blocks: [] } },
        ...Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, kind: 'custom', variant: 'text', title: `T${i}`, content: { blocks: [] } }))
      ]
    })!
    expect(doc.sections.filter((s) => s.builtinKey === 'summary')).toHaveLength(1)
    expect(doc.sections.filter((s) => !s.builtinKey)).toHaveLength(12)
  })
})

describe('anchors', () => {
  it('resolves section/block/item/granular paths and survives reordering', () => {
    let doc = buildDoc()
    const work = doc.sections.find((s) => s.builtinKey === 'experience')!
    if (work.kind !== 'entry') throw new Error('bad shape')
    const firstItem = work.content.items[0]
    const firstBlock = firstItem.blocks[0]

    expect(resolveAnchorText(doc, `section:${work.id}/item:${firstItem.id}/field:heading`)).toBe('字节跳动 · 后端开发')
    expect(resolveAnchorText(doc, `section:${work.id}/item:${firstItem.id}/block:${firstBlock.id}`)).toContain('P99')

    doc = moveSection(doc, work.id, 0)
    expect(resolveAnchorText(doc, `section:${work.id}/item:${firstItem.id}/field:heading`)).toBe('字节跳动 · 后端开发')
  })

  it('applies replacements immutably at block and project-field granularity', () => {
    let doc = buildDoc()
    const work = doc.sections.find((s) => s.builtinKey === 'experience')!
    const proj = doc.sections.find((s) => s.builtinKey === 'projects')!
    if (work.kind !== 'entry' || proj.kind !== 'project') throw new Error('bad shape')
    const item = work.content.items[0]
    const block = item.blocks[0]
    const project = proj.content.items[0]

    const next = applyAnchorReplacement(doc, `section:${work.id}/item:${item.id}/block:${block.id}`, '改写了职责描述')
    expect(resolveAnchorText(next, `section:${work.id}/item:${item.id}/block:${block.id}`)).toBe('改写了职责描述')
    expect(resolveAnchorText(doc, `section:${work.id}/item:${item.id}/block:${block.id}`)).not.toBe('改写了职责描述')

    const next2 = applyAnchorReplacement(
      next,
      `section:${proj.id}/item:${project.id}/blocks:outcome`,
      '- 转化率提升 30%\n- 成本下降 12%'
    )
    const p2 = (next2.sections.find((s) => s.builtinKey === 'projects') as Extract<typeof proj, { kind: 'project' }>).content.items[0]
    expect(p2.fields.outcome.map((b) => b.text)).toEqual(['转化率提升 30%', '成本下降 12%'])
  })

  it('sectionPlainText covers skills groups and text sections', () => {
    const doc = buildDoc()
    const skills = doc.sections.find((s) => s.builtinKey === 'skills')!
    const text = sectionPlainText(skills)
    expect(text).toContain('语言与基础')
    expect(text).toContain('Java')
  })
})

describe('section ops', () => {
  it('adds/removes custom sections, blocks, items; moves and toggles', () => {
    let doc = buildDoc()
    const before = doc.sections.length
    doc = addCustomSection(doc, { variant: 'text', title: '证书' })
    expect(doc.sections.length).toBe(before + 1)
    const custom = doc.sections[doc.sections.length - 1]
    doc = addBlock(doc, custom.id, { kind: 'line', text: 'CKA' })
    if (doc.sections[doc.sections.length - 1].kind === 'custom') {
      const c = doc.sections[doc.sections.length - 1]
      expect(c.content.blocks).toHaveLength(1)
    }
    doc = removeSection(doc, custom.id)
    expect(doc.sections.length).toBe(before)

    const summary = doc.sections.find((s) => s.builtinKey === 'summary')!
    expect(removeSection(doc, summary.id).sections.length).toBe(before)

    doc = toggleSectionVisible(doc, summary.id)
    expect(doc.sections.find((s) => s.id === summary.id)?.visible).toBe(false)
    doc = toggleSectionVisible(doc, summary.id)
    expect(doc.sections.find((s) => s.id === summary.id)?.visible).toBe(true)

    doc = moveSection(doc, summary.id, 4)
    expect(doc.sections[4].builtinKey).toBe('summary')

    const edu = doc.sections.find((s) => s.builtinKey === 'education')!
    doc = addEntryItem(doc, edu.id)
    const eduAfter = doc.sections.find((s) => s.id === edu.id)!
    if (eduAfter.kind === 'entry') {
      expect(eduAfter.content.items).toHaveLength(2)
      const moved = moveEntryItem(doc, edu.id, eduAfter.content.items[1].id, -1)
      const eduMoved = moved.sections.find((s) => s.id === edu.id)!
      if (eduMoved.kind === 'entry') {
        expect(eduMoved.content.items[0].id).toBe(eduAfter.content.items[1].id)
      }
    }
  })
})
