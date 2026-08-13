import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const homeCache = readSource('src/composables/useUserHomeDataCache.ts')
const todayView = readSource('src/views/agent/AgentTodayView.vue')
const taskCenter = readSource('src/views/agent/AgentTaskListView.vue')

describe('daily Agent task consistency contracts', () => {
  it('uses one date-only today snapshot instead of target-scoped cache keys', () => {
    expect(homeCache).toContain('const todaySnapshotKey = (date: string)')
    expect(homeCache).toContain('() => getTodayAgentTasksApi({ date })')
    expect(homeCache).not.toContain('getTodayAgentTasksApi({ date, targetJobId })')
    expect(todayView).toContain('fetchCachedTodayAgentTasks(queryDate.value, shouldForceRefresh(force))')
  })

  it('defaults task-center work to the same business date and labels the scope', () => {
    expect(taskCenter).toContain('getUserDashboardOverviewApi')
    expect(taskCenter).toContain('applyTodayTaskScope(overview.businessDate)')
    expect(taskCenter).toContain('`${query.startDate} · 全部岗位`')
  })

  it('keeps server totals separate from current-page task and minute summaries', () => {
    expect(taskCenter).toContain('服务端筛选共 {{ total }} 条记录')
    expect(taskCenter).toContain('当前页 {{ workspaceTasks.length }} 项可推进')
    expect(taskCenter).toContain('本页约 {{ workspaceEstimatedMinutes }} 分钟')
    expect(taskCenter).toContain('(本页 ${pendingTasks.length})')
    expect(taskCenter).not.toContain('项当前可推进 · 约')
  })

  it('shows a diagnostic state rather than a generic empty result for an exact async receipt', () => {
    expect(taskCenter).toContain('const hasExactAsyncReceiptFilter')
    expect(taskCenter).toContain("'处理记录仍在登记'")
    expect(taskCenter).toContain('本次提交对应的业务运行已登记')
    expect(todayView).toContain("plan?.asyncReceiptStatus === 'RUN_REGISTERED'")
  })
})
