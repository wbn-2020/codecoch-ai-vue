import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('AdminDashboard failure task route', () => {
  it('uses the same four failure states for every dashboard entry and task-center filter', () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'src/views/admin/AdminDashboardView.vue'),
      'utf8'
    )
    const taskCenterSource = readFileSync(
      resolve(process.cwd(), 'src/views/admin/AsyncTaskView.vue'),
      'utf8'
    )

    expect(dashboardSource).toContain(
      "const failedTaskStatusFilter = 'FAILED,DEAD,ERROR,DEAD_LETTER'"
    )
    expect(dashboardSource).toContain('path: failedTaskRoute')
    expect(dashboardSource).not.toContain("/admin/async-tasks?status=FAILED'")
    expect(taskCenterSource).toContain(
      "const failedTaskStatusFilter = 'FAILED,DEAD,ERROR,DEAD_LETTER'"
    )
    expect(taskCenterSource).toContain('label="全部失败终态"')
  })
})
