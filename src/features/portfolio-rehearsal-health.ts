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
  value: value === undefined ? 'n/a' : String(value),
  status
})

const routeCheck = (path: string, title: string): PortfolioRehearsalHealthCheck => {
  const connected = hasRoute(path)
  return {
    key: `route:${path}`,
    title,
    category: 'ROUTE',
    status: pass(connected),
    summary: connected ? 'Route is present in the frontend route table.' : 'Route is missing from the frontend route table.',
    path,
    required: true,
    signals: [
      signal('path', path),
      signal('routeTable', connected ? 'connected' : 'missing', pass(connected))
    ]
  }
}

const requiredDemoRouteChecks = () =>
  [
    routeCheck('/portfolio-demo', 'Portfolio demo console route'),
    ...portfolioDemoKnownPaths
      .filter((path) => path !== '/portfolio-demo')
      .map((path) => routeCheck(path, `Demo target route ${path}`))
  ]

const menuChecks = (): PortfolioRehearsalHealthCheck[] => [
  {
    key: 'menu:user-portfolio-demo',
    title: 'User menu entry for portfolio demo',
    category: 'MENU',
    status: pass(hasRoute('/portfolio-demo')),
    summary: hasRoute('/portfolio-demo')
      ? 'Expected user menu target is routable.'
      : 'Expected user menu target is not routable.',
    path: '/portfolio-demo',
    required: true,
    signals: [
      signal('source', 'src/components/layout/UserSidebar.vue'),
      signal('path', '/portfolio-demo'),
      signal('routeTable', hasRoute('/portfolio-demo') ? 'connected' : 'missing', pass(hasRoute('/portfolio-demo')))
    ]
  },
  {
    key: 'menu:admin-trace-cockpit',
    title: 'Admin menu entry for TraceCockpit',
    category: 'MENU',
    status: appConfig.enableAdminTraceCockpit ? pass(hasRoute('/admin/trace-cockpit')) : 'NOT_CONNECTED',
    summary: appConfig.enableAdminTraceCockpit
      ? 'Expected admin menu target is enabled by frontend config.'
      : 'TraceCockpit menu is feature-flagged off in this frontend build.',
    path: '/admin/trace-cockpit',
    required: true,
    signals: [
      signal('source', 'src/components/layout/AdminSidebar.vue'),
      signal('featureFlag', 'adminTraceCockpit', appConfig.enableAdminTraceCockpit ? 'PASS' : 'NOT_CONNECTED'),
      signal('permission', 'admin:trace:cockpit:view'),
      signal('routeTable', hasRoute('/admin/trace-cockpit') ? 'connected' : 'missing', pass(hasRoute('/admin/trace-cockpit')))
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
      title: 'Portfolio demo API adapter contract',
      category: 'API_ADAPTER',
      status: pass(portfolioReady),
      summary: portfolioReady
        ? 'Portfolio demo adapters are importable. This check does not call them.'
        : 'One or more portfolio demo adapters are not importable.',
      required: true,
      signals: portfolioAdapters.map(([name, adapter]) => signal(name, isFunction(adapter) ? 'importable' : 'missing', pass(isFunction(adapter))))
    },
    {
      key: 'api-adapter:trace-cockpit',
      title: 'TraceCockpit API adapter contract',
      category: 'API_ADAPTER',
      status: pass(traceReady),
      summary: traceReady
        ? 'TraceCockpit adapters are importable. This check does not call them.'
        : 'One or more TraceCockpit adapters are not importable.',
      required: true,
      signals: traceAdapters.map(([name, adapter]) => signal(name, isFunction(adapter) ? 'importable' : 'missing', pass(isFunction(adapter))))
    }
  ]
}

const demoDataCheck = (story?: PortfolioDemoStorylineVO): PortfolioRehearsalHealthCheck => {
  if (!story) {
    return {
      key: 'demo-data:storyline',
      title: 'Portfolio demo storyline data',
      category: 'DEMO_DATA',
      status: 'UNKNOWN',
      summary: 'Storyline data was not supplied to the static checker. This is not treated as a service failure.',
      required: true,
      signals: [
        signal('source', 'getPortfolioDemoStorylineApi'),
        signal('networkRequest', 'not executed', 'PASS'),
        signal('runtimeData', 'not supplied', 'UNKNOWN')
      ]
    }
  }

  const coverage = buildPortfolioDemoCoverage(story)
  return {
    key: 'demo-data:storyline',
    title: 'Portfolio demo storyline data',
    category: 'DEMO_DATA',
    status: coverage.ready ? 'PASS' : 'ATTENTION',
    summary: coverage.ready
      ? 'Storyline covers all required demo steps with safe route markers.'
      : 'Storyline is present but has missing or unsafe demo signals.',
    required: true,
    signals: [
      signal('totalSteps', coverage.total),
      signal('coveredSteps', coverage.covered, coverage.ready ? 'PASS' : 'ATTENTION'),
      signal('missingKeys', coverage.missingKeys.join(', ') || 'none', coverage.missingKeys.length ? 'ATTENTION' : 'PASS'),
      signal('missingDemoMarkers', coverage.missingDemoMarkerKeys.join(', ') || 'none', coverage.missingDemoMarkerKeys.length ? 'ATTENTION' : 'PASS'),
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
      title: 'TraceCockpit route entry',
      category: 'TRACE_COCKPIT',
      status: traceRouteConnected && traceFeatureFlag && tracePermission ? 'PASS' : 'ATTENTION',
      summary: traceRouteConnected
        ? 'TraceCockpit route is present with frontend guard signals.'
        : 'TraceCockpit route is missing from the frontend route table.',
      path: '/admin/trace-cockpit',
      required: true,
      signals: [
        signal('routeTable', traceRouteConnected ? 'connected' : 'missing', pass(traceRouteConnected)),
        signal('featureFlag', traceFeatureFlag ? 'adminTraceCockpit' : 'missing', traceFeatureFlag ? 'PASS' : 'ATTENTION'),
        signal('permission', tracePermission ? 'admin:trace:cockpit:view' : 'missing', tracePermission ? 'PASS' : 'ATTENTION')
      ]
    },
    {
      key: 'trace-cockpit:safe-summary',
      title: 'TraceCockpit desensitized summary signal',
      category: 'PRIVACY',
      status: safeSummaryConnected ? 'PASS' : 'ATTENTION',
      summary: safeSummaryConnected
        ? 'Raw stripping helper is importable; health output only exposes metadata signals.'
        : 'Raw stripping helper is not importable.',
      required: true,
      signals: [
        signal('stripTraceRawFields', safeSummaryConnected ? 'importable' : 'missing', pass(safeSummaryConnected)),
        signal('rawSensitiveContent', 'not stored by health checker', 'PASS'),
        signal('networkRequest', 'not executed', 'PASS')
      ]
    }
  ]
}

const requiredStepChecks = (): PortfolioRehearsalHealthCheck[] => [
  {
    key: 'demo-data:required-user-steps',
    title: 'Required user demo steps contract',
    category: 'DEMO_DATA',
    status: requiredUserDemoSteps.length > 0 ? 'PASS' : 'ATTENTION',
    summary: 'Static contract for user-facing rehearsal steps.',
    required: true,
    signals: [
      signal('count', requiredUserDemoSteps.length, requiredUserDemoSteps.length > 0 ? 'PASS' : 'ATTENTION'),
      signal('keys', requiredUserDemoSteps.map((step) => step.key).join(', ') || 'none')
    ]
  },
  {
    key: 'demo-data:required-ops-steps',
    title: 'Required ops demo steps contract',
    category: 'DEMO_DATA',
    status: requiredOpsDemoSteps.length > 0 ? 'PASS' : 'ATTENTION',
    summary: 'Static contract for ops-facing rehearsal steps.',
    required: true,
    signals: [
      signal('count', requiredOpsDemoSteps.length, requiredOpsDemoSteps.length > 0 ? 'PASS' : 'ATTENTION'),
      signal('keys', requiredOpsDemoSteps.map((step) => step.key).join(', ') || 'none')
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
