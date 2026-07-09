import type { RouteRecordRaw } from 'vue-router'

import {
  getPortfolioDemoStatusApi,
  getPortfolioDemoStorylineApi,
  loadPortfolioDemoApi,
  resetPortfolioDemoApi
} from '@/api/jobExperiment'
import {
  buildAdminTraceUrl,
  getAdminTraceCockpitApi,
  getTraceCockpitResultApi,
  normalizeTraceQuery,
  stripTraceRawFields
} from '@/api/adminTraceCockpit'
import { appConfig } from '@/config'
import {
  buildPortfolioDemoCoverage,
  portfolioDemoKnownPaths,
  requiredOpsDemoSteps,
  requiredUserDemoSteps
} from '@/features/portfolio-demo'
import { routes } from '@/router/routes'
import type {
  PortfolioRehearsalHealthCheck,
  PortfolioRehearsalHealthReport,
  PortfolioRehearsalHealthSignal,
  PortfolioRehearsalHealthStatus,
  PortfolioRehearsalHealthSummary
} from '@/types/portfolioRehearsal'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const pass = (condition: boolean): PortfolioRehearsalHealthStatus => (condition ? 'PASS' : 'ATTENTION')

const isFunction = (value: unknown) => typeof value === 'function'

const routePath = (parentPath: string, path: string) => {
  if (path.startsWith('/')) return path
  if (!parentPath || parentPath === '/') return `/${path}`.replace(/\/$/, '') || '/'
  return `${parentPath.replace(/\/$/, '')}/${path}`.replace(/\/$/, '') || '/'
}

const flattenRoutes = (items: RouteRecordRaw[], parentPath = ''): RouteRecordRaw[] =>
  items.flatMap((route) => {
    const path = routePath(parentPath, route.path)
    const current = { ...route, path }
    return [current, ...flattenRoutes(route.children || [], path)]
  })

const routeRecords = flattenRoutes(routes)
const routePaths = new Set(routeRecords.map((route) => route.path))

const hasRoute = (path: string) => routePaths.has(path)

const signal = (
  label: string,
  value: string | boolean | number | undefined,
  status?: PortfolioRehearsalHealthStatus
): PortfolioRehearsalHealthSignal => ({
  label,
  value: value === undefined ? '未提供' : String(value),
  status
})

const routeCheck = (path: string, title: string): PortfolioRehearsalHealthCheck => {
  const connected = hasRoute(path)
  return {
    key: `route:${path}`,
    title,
    category: 'ROUTE',
    status: pass(connected),
    summary: connected ? '前端路由表中存在该路由。' : '前端路由表中缺少该路由。',
    path,
    required: true,
    signals: [
      signal('path', path),
      signal('routeTable', connected ? '已连接' : '缺失', pass(connected))
    ]
  }
}

const requiredDemoRouteChecks = () =>
  [
    routeCheck('/portfolio-demo', '作品集演示控制台路由'),
    ...portfolioDemoKnownPaths
      .filter((path) => path !== '/portfolio-demo')
      .map((path) => routeCheck(path, `演示目标路由 ${path}`))
  ]

const menuChecks = (): PortfolioRehearsalHealthCheck[] => [
  {
    key: 'menu:user-portfolio-demo',
    title: '用户菜单作品集演示入口',
    category: 'MENU',
    status: pass(hasRoute('/portfolio-demo')),
    summary: hasRoute('/portfolio-demo')
      ? '用户菜单目标路由可访问。'
      : '用户菜单目标路由不可访问。',
    path: '/portfolio-demo',
    required: true,
    signals: [
      signal('source', 'src/components/layout/UserSidebar.vue'),
      signal('path', '/portfolio-demo'),
      signal('routeTable', hasRoute('/portfolio-demo') ? '已连接' : '缺失', pass(hasRoute('/portfolio-demo')))
    ]
  },
  {
    key: 'menu:admin-trace-cockpit',
    title: '管理菜单 TraceCockpit 入口',
    category: 'MENU',
    status: appConfig.enableAdminTraceCockpit ? pass(hasRoute('/admin/trace-cockpit')) : 'NOT_CONNECTED',
    summary: appConfig.enableAdminTraceCockpit
      ? '管理菜单目标已由前端配置启用。'
      : '当前前端构建中 TraceCockpit 菜单被功能开关关闭。',
    path: '/admin/trace-cockpit',
    required: true,
    signals: [
      signal('source', 'src/components/layout/AdminSidebar.vue'),
      signal('featureFlag', 'adminTraceCockpit', appConfig.enableAdminTraceCockpit ? 'PASS' : 'NOT_CONNECTED'),
      signal('permission', 'admin:trace:cockpit:view'),
      signal('routeTable', hasRoute('/admin/trace-cockpit') ? '已连接' : '缺失', pass(hasRoute('/admin/trace-cockpit')))
    ]
  }
]

const adapterChecks = (): PortfolioRehearsalHealthCheck[] => {
  const portfolioAdapters = [
    ['getPortfolioDemoStatusApi', getPortfolioDemoStatusApi],
    ['getPortfolioDemoStorylineApi', getPortfolioDemoStorylineApi],
    ['loadPortfolioDemoApi', loadPortfolioDemoApi],
    ['resetPortfolioDemoApi', resetPortfolioDemoApi]
  ] as const
  const traceAdapters = [
    ['buildAdminTraceUrl', buildAdminTraceUrl],
    ['getAdminTraceCockpitApi', getAdminTraceCockpitApi],
    ['getTraceCockpitResultApi', getTraceCockpitResultApi],
    ['normalizeTraceQuery', normalizeTraceQuery]
  ] as const

  const portfolioReady = portfolioAdapters.every(([, adapter]) => isFunction(adapter))
  const traceReady = traceAdapters.every(([, adapter]) => isFunction(adapter))

  return [
    {
      key: 'api-adapter:portfolio-demo',
      title: '作品集演示 API adapter 静态契约',
      category: 'API_ADAPTER',
      status: pass(portfolioReady),
      summary: portfolioReady
        ? '作品集演示 adapter 可导入；此检查不会调用接口。'
        : '一个或多个作品集演示 adapter 无法导入。',
      required: true,
      signals: portfolioAdapters.map(([name, adapter]) => signal(name, isFunction(adapter) ? '可导入' : '缺失', pass(isFunction(adapter))))
    },
    {
      key: 'api-adapter:trace-cockpit',
      title: 'TraceCockpit API adapter 静态契约',
      category: 'API_ADAPTER',
      status: pass(traceReady),
      summary: traceReady
        ? 'TraceCockpit adapter 可导入；此检查不会调用接口。'
        : '一个或多个 TraceCockpit adapter 无法导入。',
      required: true,
      signals: traceAdapters.map(([name, adapter]) => signal(name, isFunction(adapter) ? '可导入' : '缺失', pass(isFunction(adapter))))
    }
  ]
}

const demoDataCheck = (story?: PortfolioDemoStorylineVO): PortfolioRehearsalHealthCheck => {
  if (!story) {
    return {
      key: 'demo-data:storyline',
      title: '作品集演示 storyline 数据',
      category: 'DEMO_DATA',
      status: 'UNKNOWN',
      summary: '静态检查未提供 storyline 数据；这不代表后端服务失败。',
      required: true,
      signals: [
        signal('source', 'getPortfolioDemoStorylineApi'),
        signal('networkRequest', '未执行', 'PASS'),
        signal('runtimeData', '未提供', 'UNKNOWN')
      ]
    }
  }

  const coverage = buildPortfolioDemoCoverage(story)
  return {
    key: 'demo-data:storyline',
    title: '作品集演示 storyline 数据',
    category: 'DEMO_DATA',
    status: coverage.ready ? 'PASS' : 'ATTENTION',
    summary: coverage.ready
      ? 'Storyline 覆盖所有必需演示步骤，并带有安全路由标记。'
      : 'Storyline 已提供，但存在缺失或不安全的演示信号。',
    required: true,
    signals: [
      signal('totalSteps', coverage.total),
      signal('coveredSteps', coverage.covered, coverage.ready ? 'PASS' : 'ATTENTION'),
      signal('missingKeys', coverage.missingKeys.join(', ') || '无', coverage.missingKeys.length ? 'ATTENTION' : 'PASS'),
      signal('missingDemoMarkers', coverage.missingDemoMarkerKeys.join(', ') || '无', coverage.missingDemoMarkerKeys.length ? 'ATTENTION' : 'PASS'),
      signal('invalidRoutes', String(coverage.invalidRoutes.length), coverage.invalidRoutes.length ? 'ATTENTION' : 'PASS')
    ]
  }
}

const traceCockpitChecks = (): PortfolioRehearsalHealthCheck[] => {
  const traceRoute = routeRecords.find((route) => route.path === '/admin/trace-cockpit')
  const traceRouteConnected = Boolean(traceRoute)
  const traceFeatureFlag = traceRoute?.meta?.featureFlag === 'adminTraceCockpit'
  const tracePermission = Array.isArray(traceRoute?.meta?.requiredPermissions)
    ? traceRoute?.meta?.requiredPermissions.includes('admin:trace:cockpit:view')
    : false
  const safeSummaryConnected = isFunction(stripTraceRawFields)

  return [
    {
      key: 'trace-cockpit:entry',
      title: 'TraceCockpit 路由入口',
      category: 'TRACE_COCKPIT',
      status: traceRouteConnected && traceFeatureFlag && tracePermission ? 'PASS' : 'ATTENTION',
      summary: traceRouteConnected
        ? 'TraceCockpit 路由存在，并带有前端守卫信号。'
        : '前端路由表中缺少 TraceCockpit 路由。',
      path: '/admin/trace-cockpit',
      required: true,
      signals: [
        signal('routeTable', traceRouteConnected ? '已连接' : '缺失', pass(traceRouteConnected)),
        signal('featureFlag', traceFeatureFlag ? 'adminTraceCockpit' : '缺失', traceFeatureFlag ? 'PASS' : 'ATTENTION'),
        signal('permission', tracePermission ? 'admin:trace:cockpit:view' : '缺失', tracePermission ? 'PASS' : 'ATTENTION')
      ]
    },
    {
      key: 'trace-cockpit:safe-summary',
      title: 'TraceCockpit 脱敏摘要信号',
      category: 'PRIVACY',
      status: safeSummaryConnected ? 'PASS' : 'ATTENTION',
      summary: safeSummaryConnected
        ? '原文字段剥离 helper 可导入；健康输出只暴露元数据信号。'
        : '原文字段剥离 helper 无法导入。',
      required: true,
      signals: [
        signal('stripTraceRawFields', safeSummaryConnected ? '可导入' : '缺失', pass(safeSummaryConnected)),
        signal('rawSensitiveContent', '健康检查不保存原文', 'PASS'),
        signal('networkRequest', '未执行', 'PASS')
      ]
    }
  ]
}

const requiredStepChecks = (): PortfolioRehearsalHealthCheck[] => [
  {
    key: 'demo-data:required-user-steps',
    title: '用户侧必需演示步骤契约',
    category: 'DEMO_DATA',
    status: requiredUserDemoSteps.length > 0 ? 'PASS' : 'ATTENTION',
    summary: '面向用户演示步骤的静态契约。',
    required: true,
    signals: [
      signal('count', requiredUserDemoSteps.length, requiredUserDemoSteps.length > 0 ? 'PASS' : 'ATTENTION'),
      signal('keys', requiredUserDemoSteps.map((step) => step.key).join(', ') || '无')
    ]
  },
  {
    key: 'demo-data:required-ops-steps',
    title: '运营侧必需演示步骤契约',
    category: 'DEMO_DATA',
    status: requiredOpsDemoSteps.length > 0 ? 'PASS' : 'ATTENTION',
    summary: '面向运营演示步骤的静态契约。',
    required: true,
    signals: [
      signal('count', requiredOpsDemoSteps.length, requiredOpsDemoSteps.length > 0 ? 'PASS' : 'ATTENTION'),
      signal('keys', requiredOpsDemoSteps.map((step) => step.key).join(', ') || '无')
    ]
  }
]

const aggregateStatus = (checks: PortfolioRehearsalHealthCheck[]): PortfolioRehearsalHealthStatus => {
  const requiredChecks = checks.filter((check) => check.required !== false)
  if (requiredChecks.some((check) => check.status === 'ATTENTION')) return 'ATTENTION'
  if (requiredChecks.some((check) => check.status === 'NOT_CONNECTED')) return 'NOT_CONNECTED'
  if (requiredChecks.some((check) => check.status === 'UNKNOWN')) return 'UNKNOWN'
  return 'PASS'
}

const summarize = (checks: PortfolioRehearsalHealthCheck[]): PortfolioRehearsalHealthSummary => ({
  status: aggregateStatus(checks),
  total: checks.length,
  pass: checks.filter((check) => check.status === 'PASS').length,
  attention: checks.filter((check) => check.status === 'ATTENTION').length,
  unknown: checks.filter((check) => check.status === 'UNKNOWN').length,
  notConnected: checks.filter((check) => check.status === 'NOT_CONNECTED').length
})

export const buildPortfolioRehearsalHealthReport = (story?: PortfolioDemoStorylineVO): PortfolioRehearsalHealthReport => {
  const checks = [
    ...requiredDemoRouteChecks(),
    ...menuChecks(),
    ...adapterChecks(),
    ...requiredStepChecks(),
    demoDataCheck(story),
    ...traceCockpitChecks()
  ]

  return {
    summary: summarize(checks),
    checks
  }
}

export const portfolioRehearsalHealthStatuses: PortfolioRehearsalHealthStatus[] = [
  'PASS',
  'ATTENTION',
  'UNKNOWN',
  'NOT_CONNECTED'
]
