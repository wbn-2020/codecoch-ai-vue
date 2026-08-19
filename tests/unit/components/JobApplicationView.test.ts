import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/views/v4/JobApplicationView.vue'), 'utf8')

describe('JobApplicationView information hierarchy', () => {
  it('keeps initial loading separate from the no-records empty state', () => {
    expect(source).toContain('const isInitialLoading = computed(() => loading.value && !hasLoadedApplications.value)')
    expect(source).toContain('title="正在加载投递记录"')
    expect(source).toContain('title="还没有投递记录"')
  })

  it('puts stage, resume version and next action ahead of secondary record metadata', () => {
    expect(source).toContain('class="record-priority-summary"')
    expect(source).toContain('<dt>当前阶段</dt>')
    expect(source).toContain('<dt>使用简历</dt>')
    expect(source).toContain('<dt>下一步</dt>')
    expect(source).toContain('class="record-next-step"')
  })

  it('keeps one primary action in each list empty-state branch', () => {
    expect(source).toContain('v-if="hasListFilter" type="primary" @click="clearStatusFilter"')
    expect(source).toContain('v-else type="primary" :icon="Plus" @click="openCreate"')
  })

  it('keeps the create and edit dialog inside a 390px viewport', () => {
    expect(source).toContain('class="application-edit-dialog"')
    expect(source).toContain('width="min(720px, calc(100vw - 24px))"')
    expect(source).toMatch(
      /:global\(\.application-edit-dialog \.el-dialog__body\)\s*\{[\s\S]*?overflow-x:\s*hidden/
    )
  })

  it('uses recoverable archive controls and restricts deletion to archived applications', () => {
    expect(source).toContain('command="archive"')
    expect(source).toContain('command="restore"')
    expect(source).toContain('v-if="item.archivedAt" command="delete"')
    expect(source).toContain('显示已归档')
    expect(source).toContain('archiveApplicationApi')
    expect(source).toContain('restoreApplicationApi')
    expect(source).toContain('deleteApplicationApi')
    expect(source).toContain('归档不等于删除')
    expect(source).toContain('只有已归档记录才能删除')
    expect(source).toContain('用户端不提供自行恢复入口')
  })

  it('exposes the complete attachment lifecycle in both create and edit flows', () => {
    expect(source).toContain('data-testid="select-application-attachments"')
    expect(source).toContain('uploadApplicationAttachmentApi')
    expect(source).toContain('getApplicationAttachmentsApi')
    expect(source).toContain('replaceApplicationAttachmentApi')
    expect(source).toContain('deleteApplicationAttachmentApi')
    expect(source).toContain('downloadApplicationAttachmentApi')
    expect(source).toContain('投递已保存，但有 ${attachmentResult.failed} 个附件上传失败')
    expect(source).toContain('retryPendingAttachment')
    expect(source).toContain('downloadBlobReliably')
    expect(source).toContain('reliableDownloadOptionsForFile')
  })
})
