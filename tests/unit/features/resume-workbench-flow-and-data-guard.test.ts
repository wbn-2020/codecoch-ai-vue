import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('resume workbench flow and list data guard', () => {
  it('organizes the workbench around 5 template tabs + AI/reset/export PDF', () => {
    const topbar = source('src/views/resume/components/ResumeWorkbenchTopbar.vue')
    const editor = source('src/views/resume/ResumeEditView.vue')
    const rail = source('src/views/resume/components/ResumeSectionRail.vue')

    // v22 原型：topbar 中央是模板切换 tab；右侧是 AI 优化 / 重置 / 导出 PDF
    // tab 标签取自真实模板名（极光绿/雅黑侧栏/连胜典藏/时间轴/极简/画报风），
    // 与原型 6 个模板变体一一对应，杜绝早期写死的错名瑕疵。
    expect(topbar).toContain('简历模板切换')
    expect(topbar).toContain('v-for="template in templates"')
    expect(editor).toContain('WORKBENCH_TEMPLATE_TABS')
    expect(editor).toContain("'ATS_SINGLE_COLUMN'")
    expect(editor).toContain("'ATS_CLASSIC_SIDEBAR'")
    expect(editor).toContain("'ATS_STREAK_SIGNATURE'")
    expect(editor).toContain("'MAGIC_TIMELINE'")
    expect(editor).toContain("'MAGIC_MINIMALIST'")
    expect(editor).toContain("'MAGIC_EDITORIAL'")
    expect(topbar).toContain("'template-change'")
    expect(topbar).toContain("'reset-resume'")
    expect(topbar).toContain("'export-pdf'")
    expect(editor).toContain(':templates="workbenchTemplateTabs"')
    expect(editor).toContain(':active-template-id="selectedResumeTemplateCode"')
    expect(editor).toContain('@template-change="handleWorkbenchTemplateChange"')
    expect(editor).toContain('@reset-resume="handleWorkbenchResetResume"')
    expect(editor).toContain('@export-pdf="openPdfExport"')
    // 保存草稿 / 保存 / 撤销 / 重做契约保留
    expect(topbar).toContain("'save-draft'")
    expect(editor).toContain("handleSave('draft')")
    expect(editor).toContain('保存并创建简历')
    expect(topbar).toContain('aria-label="编辑历史"')
    expect(topbar).toContain("emit('undo')")
    expect(topbar).toContain("emit('redo')")
    expect(editor).toContain(':can-undo="resumeHistory.canUndo.value"')
    expect(editor).toContain(':can-redo="resumeHistory.canRedo.value"')
    expect(editor).toContain('@undo="undoResumeEdit"')
    expect(editor).toContain('@redo="redoResumeEdit"')
    expect(editor).not.toContain('class="workspace-history"')
    // 移动端 tab 切换契约保留
    expect(editor).toContain("const mobileWorkspaceTabs = ['edit', 'review', 'ai', 'preview'] as const")
    expect(editor).toContain("selectMobileWorkspaceTab(mode)")
    expect(editor).toContain("inspectorMode.value = tab === 'preview' ? 'edit' : tab")
    expect(editor).toContain(":aria-labelledby=\"mobileWorkspaceTab === 'ai' ? 'resume-tab-ai' : 'resume-tab-review'\"")
    // 兼容：rail 上的「下一步：检查」入口为兜底触发入口，仍可在 rail 中存在
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
    expect(rail).toContain('板块管理')
    expect(rail).toContain('添加板块')
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

  it('renders stable delivery previews from the v2 snapshot document', () => {
    const delivery = source('src/views/resume/components/ResumeDeliveryWorkbench.vue')

    expect(delivery).toContain(':document="stableDocument"')
    expect(delivery).toContain('normalizeResumeDocument(versionSnapshot.value.document)')
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
