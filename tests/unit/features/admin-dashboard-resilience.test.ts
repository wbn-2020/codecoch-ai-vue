import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const dashboardSource = readSource('src/views/admin/AdminDashboardView.vue')
const layoutSource = readSource('src/layouts/AdminLayout.vue')

describe('admin dashboard resilience', () => {
  it('renders stable local skeletons while the slow overview request is pending', () => {
    expect(dashboardSource).toContain('const loading = ref(true)')
    expect(dashboardSource).toContain('const initialLoading = computed(() => loading.value && !dashboard.value)')
    expect(dashboardSource).toContain('aria-label="趋势数据加载中"')
    expect(dashboardSource).toContain('metric-skeleton-')
    expect(dashboardSource).toContain('pending-skeleton-')
    expect(dashboardSource).toContain('status-skeleton-')
    expect(dashboardSource).not.toContain('class="admin-metric-grid" v-loading="loading"')
  })

  it('keeps the last successful overview visible when a refresh fails', () => {
    expect(dashboardSource).toContain("const dataStale = computed(() => overviewError.value && Boolean(dashboard.value))")
    expect(dashboardSource).toContain('管理首页刷新失败，已保留上次数据')
    expect(dashboardSource).toContain('当前展示上次成功数据')
    expect(dashboardSource).not.toMatch(/catch \(error\) \{\s+dashboard\.value = null/)
  })

  it('does not present an unknown critical service set as healthy', () => {
    expect(dashboardSource).toContain("status === 'DEGRADED' || status === 'UNKNOWN'")
    expect(dashboardSource).toContain('return statusText(effectiveSystemStatus.value)')
    expect(layoutSource).toContain("status === 'DEGRADED' || status === 'UNKNOWN'")
    expect(layoutSource).toContain('项服务状态待确认')
  })

  it('uses explicit top-strip semantics for permissions, session and service health', () => {
    expect(layoutSource).toContain('<span>服务状态</span>')
    expect(layoutSource).toContain('<span>权限数量</span>')
    expect(layoutSource).toContain("{{ authStore.permissions.length }} 项")
    expect(layoutSource).toContain('<span>登录态</span>')
    expect(layoutSource).toContain("'已验证' : '待验证'")
    expect(layoutSource).toContain('<span>请求诊断</span>')
    expect(layoutSource).toContain("if (!canLoadDashboardHealth.value) return '无查看权限'")
    expect(layoutSource).toContain('const dashboardHealthLoading = ref(true)')
  })

  it('translates common service probe failures while retaining the raw reason as a title', () => {
    expect(dashboardSource).toContain(':title="item.reason || item.source || undefined"')
    expect(dashboardSource).toContain('健康探测连接超时，请检查服务地址、容器网络和 Actuator 端口')
    expect(dashboardSource).toContain('健康探测连接被拒绝，请确认服务进程和健康检查端口')
  })
})
