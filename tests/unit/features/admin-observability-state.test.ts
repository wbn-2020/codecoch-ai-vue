import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const loginLogSource = readSource('src/views/admin/LoginLogView.vue')
const operationLogSource = readSource('src/views/admin/OperationLogView.vue')
const opsOverviewSource = readSource('src/views/admin/AdminOpsOverviewView.vue')

describe('admin observability data states', () => {
  it.each([
    ['登录日志', loginLogSource],
    ['操作日志', operationLogSource]
  ])('%s keeps summary failures distinct from real zero values', (_label, source) => {
    expect(source).toContain("const summaryError = ref('')")
    expect(source).toMatch(/catch \(error\) \{[\s\S]*?summary\.value = undefined[\s\S]*?summaryError\.value = getErrorMessage/)
    expect(source).toContain("value: unavailable ? '未知'")
    expect(source).toContain("logError ? '未知' : total")
    expect(source).not.toMatch(/summary\?\.(?:totalLoginLogs|totalOperationLogs) \?\? total/)
  })

  it.each([
    ['登录日志', loginLogSource],
    ['操作日志', operationLogSource]
  ])('%s supports keyboard submit and stable mobile filter actions', (_label, source) => {
    expect(source).toContain('@submit.prevent="handleSearch"')
    expect(source).toContain('native-type="submit"')
    expect(source).toContain('class="audit-filter-actions"')
    expect(source).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.audit-filter-actions[\s\S]*?flex: 1 1 0/)
  })

  it('marks operations snapshots as fresh, stale, or unknown with timestamps', () => {
    expect(opsOverviewSource).toContain("type SourceState = 'fresh' | 'stale' | 'unknown'")
    expect(opsOverviewSource).toContain('const sourceSnapshots = reactive')
    expect(opsOverviewSource).toContain('OPS_DATA_STALE_AFTER_MS = 5 * 60 * 1000')
    expect(opsOverviewSource).toContain('上次成功获取于')
    expect(opsOverviewSource).toContain('已超过 5 分钟')
    expect(opsOverviewSource).toContain("statusLabel: status === 'fresh' ? '最新' : status === 'stale' ? '陈旧' : '未知'")
    expect(opsOverviewSource).toContain('role="status"')
  })

  it('does not substitute cumulative totals for missing per-minute operations metrics', () => {
    expect(opsOverviewSource).toContain("sourceMetric(dashboardSource, opsMetrics.value?.rpm, compact)")
    expect(opsOverviewSource).toContain("sourceMetric(dashboardSource, opsMetrics.value?.tpm, compact)")
    expect(opsOverviewSource).not.toMatch(/opsMetrics\.value\?\.rpm \|\| aiOverview/)
    expect(opsOverviewSource).not.toMatch(/opsMetrics\.value\?\.tpm \|\| aiOverview/)
    expect(opsOverviewSource).toContain('sourceMetric(dataSourceLabels.vectorHealth, vectorHealth?.embeddingMetrics?.callCount, compact)')
  })

  it('exposes the operations trend chart to assistive technology', () => {
    expect(opsOverviewSource).toContain('role="img"')
    expect(opsOverviewSource).toContain('tabindex="0"')
    expect(opsOverviewSource).toContain(':aria-label="trendChartAriaLabel"')
    expect(opsOverviewSource).toContain('points.join')
    expect(opsOverviewSource).toContain('aria-label="查看题目"')
    expect(opsOverviewSource).toContain('aria-label="查看知识库片段"')
    expect(opsOverviewSource).toContain('aria-label="复制索引点编号"')
  })

  it.each([
    ['登录日志', loginLogSource, 'aria-label="登录日志表格密度"'],
    ['操作日志', operationLogSource, 'aria-label="操作日志表格密度"']
  ])('%s labels its density control', (_label, source, label) => {
    expect(source).toContain(label)
  })
})
