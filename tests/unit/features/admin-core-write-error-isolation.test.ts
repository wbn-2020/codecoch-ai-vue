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

const expectIsolatedWrite = (
  source: string,
  name: string,
  apiName: string,
  refreshToken: string,
  loadingReset: string
) => {
  const block = extractTopLevelConst(source, name)
  expect(block).toContain(apiName)
  expect(block).toContain('try {')
  expect(block).toContain('catch (error)')
  expect(block).toContain('finally {')
  expect(block).toContain('getErrorMessage(error')
  expect(block).toContain(refreshToken)
  expect(block).toContain(loadingReset)
}

const userManage = readSource('src/views/admin/UserManageView.vue')
const questionManage = readSource('src/views/admin/QuestionManageView.vue')
const systemConfig = readSource('src/views/admin/SystemConfigView.vue')
const notificationManage = readSource('src/views/admin/NotificationManageView.vue')
const announcementManage = readSource('src/views/admin/AnnouncementManageView.vue')
const asyncTask = readSource('src/views/admin/AsyncTaskView.vue')

describe('admin core write error isolation contracts', () => {
  it.each([
    ['handleResetPassword', 'resetAdminUserPasswordApi', 'fetchUsers()', 'passwordResettingId.value = null'],
    ['handleAssignRoles', 'assignAdminUserRolesApi', 'fetchUsers()', 'roleAssignSaving.value = false'],
    ['handleToggleStatus', 'updateAdminUserStatusApi', 'fetchUsers()', 'statusChangingId.value = null']
  ])('keeps UserManageView.%s failures local and reloads server state', (name, api, refresh, reset) => {
    expectIsolatedWrite(userManage, name, api, refresh, reset)
  })

  it.each([
    ['handleSave', 'createSystemConfigApi', 'fetchConfigs()', 'saving.value = false'],
    ['handleDelete', 'deleteSystemConfigApi', 'fetchConfigs()', 'deletingConfigId.value = null']
  ])('keeps SystemConfigView.%s failures local and reloads server state', (name, api, refresh, reset) => {
    expectIsolatedWrite(systemConfig, name, api, refresh, reset)
  })

  it.each([
    ['handleSend', 'sendAdminNotificationApi', 'fetchNotices()', 'saving.value = false'],
    ['handleDelete', 'deleteAdminNotificationApi', 'fetchNotices()', 'deletingNoticeId.value = null']
  ])('keeps NotificationManageView.%s failures local and reloads server state', (name, api, refresh, reset) => {
    expectIsolatedWrite(notificationManage, name, api, refresh, reset)
  })

  it('isolates announcement save and all row mutations behind the shared local runner', () => {
    expectIsolatedWrite(
      announcementManage,
      'handleSave',
      'createAdminAnnouncementApi',
      'fetchAnnouncements()',
      'saving.value = false'
    )

    const runner = extractTopLevelConst(announcementManage, 'runRowAction')
    expect(runner).toContain('try {')
    expect(runner).toContain('catch (error)')
    expect(runner).toContain('finally {')
    expect(runner).toContain('fetchAnnouncements()')
    expect(runner).toContain("actionLoadingKey.value = ''")

    for (const api of [
      'publishAdminAnnouncementApi',
      'offlineAdminAnnouncementApi',
      'deleteAdminAnnouncementApi'
    ]) {
      expect(announcementManage).toContain(api)
    }
  })

  it.each([
    ['handleSave', 'createAdminQuestionApi', 'fetchQuestions()', 'saving.value = false'],
    ['handleStatus', 'updateAdminQuestionStatusApi', 'fetchQuestions()', "questionActionLoadingKey.value = ''"],
    ['handleDelete', 'deleteAdminQuestionApi', 'fetchQuestions()', "questionActionLoadingKey.value = ''"],
    ['handleGenerateReviews', 'submitAiQuestionGenerateApi', 'fetchReviews()', 'generating.value = false'],
    ['handleApproveReview', 'approveQuestionReviewApi', 'refreshReviewPublishWorkspace()', 'reviewActionLoadingId.value = null'],
    ['handleRejectReview', 'rejectQuestionReviewApi', 'refreshReviewPublishWorkspace()', 'reviewActionLoadingId.value = null'],
    ['handleCancelReview', 'cancelQuestionReviewApi', 'refreshReviewPublishWorkspace()', 'reviewActionLoadingId.value = null'],
    ['handleApproveReviewWithEdit', 'approveQuestionReviewApi', 'refreshReviewPublishWorkspace()', 'reviewApproveSaving.value = false'],
    ['handleBatchApproveReviews', 'batchApproveQuestionReviewsApi', 'refreshReviewPublishWorkspace()', 'batchReviewProcessing.value = false'],
    ['handleBatchRejectReviews', 'batchRejectQuestionReviewsApi', 'refreshReviewPublishWorkspace()', 'batchReviewProcessing.value = false'],
    ['handleCheckDuplicates', 'checkQuestionDuplicateApi', 'refreshDuplicateWorkspace()', 'duplicateChecking.value = false'],
    ['handleEvaluateDuplicates', 'evaluateQuestionDuplicateApi', 'refreshDuplicateWorkspace()', 'duplicateEvaluating.value = false'],
    ['saveCurrentDuplicateEvalCases', 'saveQuestionDuplicateEvalCaseApi', 'refreshDuplicateEvalWorkspace()', 'duplicateEvalSaving.value = false'],
    ['runDuplicateEvalCases', 'runQuestionDuplicateEvalApi', 'refreshDuplicateEvalWorkspace()', 'duplicateEvalRunning.value = false'],
    ['sweepDuplicateThresholds', 'sweepQuestionDuplicateThresholdApi', 'refreshDuplicateEvalWorkspace()', 'duplicateThresholdSweeping.value = false'],
    ['deleteDuplicateEvalCase', 'deleteQuestionDuplicateEvalCaseApi', 'fetchDuplicateEvalCases()', 'duplicateEvalDeletingId.value = null'],
    ['handleRebuildEmbedding', 'rebuildQuestionEmbeddingApi', 'refreshEmbeddingServerState()', 'embeddingRebuilding.value = false'],
    ['handleRetryFailedEmbedding', 'retryFailedQuestionEmbeddingApi', 'refreshEmbeddingServerState()', 'embeddingRetrying.value = false'],
    ['handleMergeDuplicate', 'mergeQuestionDuplicateReviewApi', 'refreshDuplicateWorkspace()', 'duplicateActionLoadingId.value = null'],
    ['handleIgnoreDuplicate', 'ignoreQuestionDuplicateReviewApi', 'refreshDuplicateWorkspace()', 'duplicateActionLoadingId.value = null'],
    ['handleBatchMergeDuplicates', 'batchMergeQuestionDuplicateReviewApi', 'refreshDuplicateWorkspace()', 'duplicateBatchProcessing.value = false'],
    ['handleBatchIgnoreDuplicates', 'batchIgnoreQuestionDuplicateReviewApi', 'refreshDuplicateWorkspace()', 'duplicateBatchProcessing.value = false'],
    ['handleImport', 'importAdminQuestionsApi', 'refreshQuestionDuplicateWorkspace()', 'importing.value = false']
  ])('keeps QuestionManageView.%s failures local and reloads server state', (name, api, refresh, reset) => {
    expectIsolatedWrite(questionManage, name, api, refresh, reset)
  })

  it('treats write-reason prompt cancellation as a normal exit and does not rethrow generation fallback errors', () => {
    const prompt = extractTopLevelConst(questionManage, 'promptForQuestionAction')
    const fallback = extractTopLevelConst(questionManage, 'runLegacyGenerateFallback')

    expect(prompt).toContain('catch {')
    expect(prompt).toContain('return null')
    expect(questionManage).not.toMatch(/const\s+\{\s*value\s*\}\s*=\s*await\s+ElMessageBox\.prompt/)
    expect(fallback).not.toContain('throw error')
    expect(fallback).toContain('return fallbackError')
  })

  it('keeps async task detail and retry failures within the current page and refreshes attempted retries', () => {
    const openDetail = extractTopLevelConst(asyncTask, 'openDetail')
    const handleRetry = extractTopLevelConst(asyncTask, 'handleRetry')
    const handleDeadRetry = extractTopLevelConst(asyncTask, 'handleDeadRetry')

    expect(openDetail).toContain('try {')
    expect(openDetail).toContain('catch (error)')
    expect(openDetail).toContain('getErrorMessage(error')

    for (const block of [handleRetry, handleDeadRetry]) {
      expect(block).toContain('try {')
      expect(block).toContain('catch (error)')
      expect(block).toContain('finally {')
      expect(block).toContain('isTaskActionCancelled(error)')
      expect(block).toContain('getErrorMessage(error')
      expect(block).toContain('if (attempted) await fetchTasks()')
    }
  })
})
