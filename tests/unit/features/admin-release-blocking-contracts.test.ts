import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const extractTopLevelConst = (source: string, name: string) => {
  const start = source.indexOf(`const ${name} =`)
  if (start < 0) throw new Error(`Missing top-level const ${name}`)
  const next = source.indexOf('\nconst ', start + 1)
  return source.slice(start, next < 0 ? source.length : next)
}

const asyncTaskSource = readSource('src/views/admin/AsyncTaskView.vue')
const promptTemplateSource = readSource('src/views/admin/PromptTemplateView.vue')

describe('admin release-blocking write contracts', () => {
  it('confirms a fresh async-task retry preview immediately with its preview hash', () => {
    const handleRetry = extractTopLevelConst(asyncTaskSource, 'handleRetry')
    const buildPayload = extractTopLevelConst(asyncTaskSource, 'buildTaskActionPayload')
    const previewIndex = handleRetry.indexOf('getAdminTaskRetryPreviewApi(row.id)')
    const confirmationIndex = handleRetry.indexOf("promptActionNote('重试失败任务', row, preview)")
    const retryIndex = handleRetry.indexOf(
      "retryAdminTaskApi(row.id, buildTaskActionPayload('admin-task-retry', row, note, preview))"
    )

    expect(previewIndex).toBeGreaterThanOrEqual(0)
    expect(confirmationIndex).toBeGreaterThan(previewIndex)
    expect(retryIndex).toBeGreaterThan(confirmationIndex)
    expect(buildPayload).toContain('previewHash: requireRetryPreviewHash(preview)')
  })

  it('refreshes after an expired retry preview and blocks duplicate confirmation chains', () => {
    const handleRetry = extractTopLevelConst(asyncTaskSource, 'handleRetry')

    expect(handleRetry).toContain('if (retryingId.value !== null) return')
    expect(handleRetry).toContain('catch (error)')
    expect(handleRetry).toContain('getErrorMessage(error')
    expect(handleRetry).toContain('if (attempted) await fetchTasks()')
    expect(asyncTaskSource).toContain('重试预览缺少校验值，请刷新后重新确认')
  })

  it('activates a real prompt version and verifies the refreshed persisted template state', () => {
    const handleStatus = extractTopLevelConst(promptTemplateSource, 'handleStatus')

    expect(handleStatus).toContain('activatePromptTemplateVersionApi')
    expect(handleStatus).toContain('await refreshAndVerifyPromptActivation')
    expect(handleStatus).toContain('row.activeVersionId')
    expect(handleStatus).not.toContain('Please activate a prompt version to enable this template.')
  })

  it('keeps prompt activation failure reasons and trace references visible', () => {
    const formatter = extractTopLevelConst(promptTemplateSource, 'promptActionErrorMessage')
    const verifier = extractTopLevelConst(promptTemplateSource, 'refreshAndVerifyPromptActivation')

    expect(formatter).toContain('traceId')
    expect(formatter).toContain('requestId')
    expect(formatter).toContain('rawReason')
    expect(verifier).toContain('status !== 1')
    expect(verifier).toContain('activeVersionId')
  })
})
