import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const extractAsyncHandler = (source: string, name: string) => {
  const start = source.indexOf(`const ${name} = async`)
  expect(start, `${name} handler should exist`).toBeGreaterThanOrEqual(0)
  const nextHandler = source.indexOf('\nconst ', start + 1)
  return source.slice(start, nextHandler === -1 ? source.length : nextHandler)
}

const jobsSource = readSource('src/views/admin/AdminAnalyticsJobsView.vue')
const aiOpsSource = readSource('src/views/admin/AdminAiOpsAnalyticsView.vue')
const metricsSource = readSource('src/views/admin/AdminAnalyticsMetricsView.vue')
const regressionSource = readSource('src/views/admin/AdminPromptRegressionView.vue')
const agentRunSource = readSource('src/views/admin/AdminAgentRunView.vue')
const agentTaskSource = readSource('src/views/admin/AdminAgentTaskView.vue')

describe('admin analytics write error isolation', () => {
  it.each([
    [
      '聚合任务页每日计划',
      jobsSource,
      'runDailyPlan',
      '每日计划聚合提交失败',
      'manualRunning.value = false'
    ],
    [
      '聚合任务页重跑',
      jobsSource,
      'rerun',
      '聚合任务重跑提交失败',
      'rerunningId.value = undefined'
    ],
    [
      'AI 运营页每日计划',
      aiOpsSource,
      'runDailyPlan',
      '每日计划聚合提交失败',
      'manualRunning.value = false'
    ],
    [
      'AI 运营页重跑',
      aiOpsSource,
      'rerunJob',
      '聚合任务重跑提交失败',
      'rerunningId.value = undefined'
    ],
    [
      '指标保存',
      metricsSource,
      'saveMetric',
      '指标保存失败',
      'savingMetric.value = false'
    ],
    [
      '回归用例保存',
      regressionSource,
      'saveCase',
      '回归用例保存失败',
      'savingCase.value = false'
    ],
    [
      '回归用例运行',
      regressionSource,
      'runRegression',
      '回归运行提交失败',
      'running.value = false'
    ]
  ])('%s catches rejected writes and restores its local loading state', (_label, source, handlerName, message, reset) => {
    const handler = extractAsyncHandler(source, handlerName)

    expect(handler).toContain('try {')
    expect(handler).toContain('catch (error)')
    expect(handler).toContain('finally {')
    expect(handler).toContain(message)
    expect(handler).toContain('ElMessage.error(')
    expect(handler).toContain(reset)
  })

  it('keeps write errors visible in the current page or dialog', () => {
    expect(jobsSource).toContain('v-if="actionErrorMessage"')
    expect(aiOpsSource).toContain('v-if="actionErrorMessage"')
    expect(metricsSource).toContain('v-if="metricSaveError"')
    expect(regressionSource).toContain('v-if="caseSaveError"')
    expect(regressionSource).toContain('v-if="runErrorMessage"')
  })

  it('isolates audited raw-run access failures and stale detail responses', () => {
    const rawHandler = extractAsyncHandler(agentRunSource, 'loadRunRawDetail')
    const detailHandler = extractAsyncHandler(agentRunSource, 'openRunDetail')

    expect(rawHandler).toContain('catch (error)')
    expect(rawHandler).toContain('rawDetailError.value')
    expect(rawHandler).toContain('rawDetailLoading.value = false')
    expect(agentRunSource).toContain('v-if="rawDetailError"')
    expect(detailHandler).toContain('detailRequestSeq.value')
    expect(detailHandler).toContain('if (requestSeq !== detailRequestSeq.value) return')
    expect(detailHandler).toContain('detailLoading.value = false')
  })

  it('contains task detail navigation failures without leaving a stuck button', () => {
    const handler = extractAsyncHandler(agentTaskSource, 'openRun')

    expect(handler).toContain('await router.push')
    expect(handler).toContain('catch (error)')
    expect(handler).toContain('运行详情页面打开失败')
    expect(handler).toContain('openingRunId.value = undefined')
    expect(agentTaskSource).toContain(':loading="openingRunId === row.agentRunId"')
    expect(agentTaskSource).toContain('v-if="actionErrorMessage"')
  })
})
