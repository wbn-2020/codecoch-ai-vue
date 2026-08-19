import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('resume workbench flow and list data guard', () => {
  it('organizes the workbench around fill, review, preview, and export', () => {
    const topbar = source('src/views/resume/components/ResumeWorkbenchTopbar.vue')
    const editor = source('src/views/resume/ResumeEditView.vue')
    const rail = source('src/views/resume/components/ResumeSectionRail.vue')

    expect(topbar).toContain('简历工作流程')
    expect(topbar).toContain('填写')
    expect(topbar).toContain('检查')
    expect(topbar).toContain('预览')
    expect(topbar).toContain('导出')
    expect(topbar).toContain("'open-preview'")
    expect(editor).toContain('@open-preview="openPreviewStep"')
    expect(editor).toContain("activeWorkbenchStep.value = 'export'")
    expect(editor).toContain('草稿只需名称，其他内容可继续补充')
    expect(editor).toContain("handleSave('draft')")
    expect(topbar).toContain("'save-draft'")
    expect(editor).toContain('保存并创建简历')
    expect(rail).toContain('下一步：检查')
    expect(rail).toContain('开始检查')
  })

  it('does not render misleading exact completion counts for untouched drafts', () => {
    const editor = source('src/views/resume/ResumeEditView.vue')
    const topbar = source('src/views/resume/components/ResumeWorkbenchTopbar.vue')
    const rail = source('src/views/resume/components/ResumeSectionRail.vue')

    expect(editor).toContain('hasResumeContentStarted')
    expect(editor).toContain("'尚未开始'")
    expect(editor).toContain("'待填写后检查'")
    expect(topbar).toContain('v-if="hasStarted"')
    expect(topbar).toContain('待填写')
    expect(rail).toContain('v-if="hasStarted"')
    expect(rail).toContain('从基本信息开始')
  })

  it('marks malformed resume fields for review and blocks default, AI, and interview use', () => {
    const list = source('src/views/resume/ResumeListView.vue')

    expect(list).toContain('getResumeDataIssue')
    expect(list).toContain('检测到异常占位内容')
    expect(list).toContain('数据待核验')
    expect(list).toContain('ensureResumeCanBeUsed')
    expect(list).toContain("ensureResumeCanBeUsed(row, '生成 AI 建议')")
    expect(list).toContain("ensureResumeCanBeUsed(row, '设为默认简历')")
    expect(list).toContain("ensureResumeCanBeUsed(row, '用于模拟面试')")
    expect(list).toContain(':disabled="item.isDefault === 1 || Boolean(getResumeDataIssue(item))"')
  })
})
