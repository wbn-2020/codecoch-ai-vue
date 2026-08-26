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
    expect(topbar).toContain('aria-label="编辑历史"')
    expect(topbar).toContain("emit('undo')")
    expect(topbar).toContain("emit('redo')")
    expect(editor).toContain(':can-undo="resumeHistory.canUndo.value"')
    expect(editor).toContain(':can-redo="resumeHistory.canRedo.value"')
    expect(editor).toContain('@undo="undoResumeEdit"')
    expect(editor).toContain('@redo="redoResumeEdit"')
    expect(editor).not.toContain('class="workspace-history"')
    expect(editor).toContain("const mobileWorkspaceTabs = ['edit', 'review', 'ai', 'preview'] as const")
    expect(editor).toContain("selectMobileWorkspaceTab(mode)")
    expect(editor).toContain("inspectorMode.value = tab === 'preview' ? 'edit' : tab")
    expect(editor).toContain(":aria-labelledby=\"mobileWorkspaceTab === 'ai' ? 'resume-tab-ai' : 'resume-tab-review'\"")
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

  it('discards stale delivery workbench loads after resume or refresh changes', () => {
    const delivery = source('src/views/resume/components/ResumeDeliveryWorkbench.vue')

    expect(delivery).toContain('let loadGeneration = 0')
    expect(delivery).toContain('const generation = ++loadGeneration')
    expect(delivery).toContain('const isCurrentLoad =')
    expect(delivery).toContain('generation === loadGeneration')
    expect(delivery).toContain('resumeId === props.resumeId')
    expect(delivery).toContain('disposed = true')
  })

  it('guards export responses and reports the returned artifact state accurately', () => {
    const delivery = source('src/views/resume/components/ResumeDeliveryWorkbench.vue')

    expect(delivery).toContain('const resumeVersionId = currentVersion.value.id')
    expect(delivery).toContain('generation !== loadGeneration')
    expect(delivery).toContain("if (!result.artifact)")
    expect(delivery).toContain("artifact.status === 'READY'")
    expect(delivery).toContain("artifact.status === 'FAILED'")
    expect(delivery).toContain('正在生成文件')
    expect(delivery).toContain('可以下载')
  })

  it('keeps preview-only templates out of the formal ZIP template options', () => {
    const artifactPanel = source('src/views/resume/components/ResumeArtifactDeliveryPanel.vue')
    const templateBrowser = source('src/views/resume/components/ResumeTemplateBrowser.vue')

    expect(artifactPanel).toContain('isFormalResumeTemplateCode(template.code)')
    expect(artifactPanel).toContain('const refreshedGeneration = await loadArtifacts()')
    expect(artifactPanel).toContain('refreshedGeneration !== loadGeneration')
    expect(artifactPanel).toContain('generation !== loadGeneration')
    expect(artifactPanel).toContain('投递 ZIP 生成失败，请检查简历版本')
    expect(templateBrowser).toContain('role="list"')
    expect(templateBrowser).not.toMatch(
      /class="template-browser__grid"[\s\S]*?role="radiogroup"/
    )
    expect(templateBrowser).not.toContain('const moveSelection =')
  })
})
