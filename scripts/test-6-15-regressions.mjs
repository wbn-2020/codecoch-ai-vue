import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const [loginView, routerIndex, routes] = await Promise.all([
  read('src/views/auth/LoginView.vue'),
  read('src/router/index.ts'),
  read('src/router/routes.ts')
])

const checks = []

const record = (name, passed, evidence) => {
  checks.push({ name, passed, evidence })
}

const containsAll = (text, needles) => needles.every((needle) => text.includes(needle))

const routeRedirectChecks = [
  ['admin-permissions-alias', "path: 'permissions'", "redirect: '/admin/menus'"],
  ['admin-question-review-alias', "path: 'question-review'", "redirect: '/admin/question-reviews'"],
  ['admin-question-duplicates-alias', "path: 'question-duplicates'", "redirect: '/admin/question-duplicate-reviews'"],
  ['admin-dead-letters-alias', "path: 'dead-letters'", "path: '/admin/async-tasks'", "status: 'DEAD_LETTER'"],
  ['admin-agent-tasks-alias', "path: 'agent-tasks'", "redirect: '/admin/agent/tasks'"],
  ['admin-metrics-alias', "path: 'metrics'", "redirect: '/admin/analytics/metrics'"],
  ['admin-scheduler-alias', "path: 'scheduler'", "redirect: '/admin/analytics/jobs'"],
  ['admin-system-config-alias', "path: 'system-config'", "redirect: '/admin/system/configs'"],
  ['admin-slow-sql-alias', "path: 'slow-sql'", "redirect: '/admin/slow-sql-logs'"],
  ['admin-ai-feedback-alias', "path: 'ai/feedback'", "redirect: '/admin/analytics/ai'"],
  ['admin-knowledge-vector-entry', "path: 'ops/overview'", "AdminOpsOverviewView.vue"],
  ['admin-knowledge-alias', "path: 'knowledge'", "redirect: '/admin/ops/overview'"],
  ['admin-vector-indexes-alias', "path: 'vector-indexes'", "redirect: '/admin/ops/overview'"]
]

for (const [name, ...needles] of routeRedirectChecks) {
  record(name, containsAll(routes, needles), `routes.ts should contain ${needles.join(' and ')}`)
}

record(
  'login-submit-disabled-while-loading',
  /<el-button[^>]+:disabled="loading"[^>]*@click="handleSubmit"/s.test(loginView) ||
    /<el-button[^>]+@click="handleSubmit"[^>]*:disabled="loading"/s.test(loginView),
  'Login submit button should be disabled while loading to prevent duplicate submissions'
)

record(
  'login-handler-short-circuits-duplicate-submit',
  containsAll(loginView, ['if (loading.value)', 'loading.value = true']),
  'handleSubmit should return early while a login attempt is already running'
)

record(
  'login-auth-error-separated-from-navigation-error',
  containsAll(loginView, ['authStore.login(form, { silentError: true })', 'router.replace', 'getPostLoginNavigationErrorMessage']),
  'Login API failures and post-login navigation failures should have separate error handling'
)

record(
  'login-post-navigation-error-does-not-use-login-failure-title',
  containsAll(loginView, [
    ':title="alertTitle"',
    ':type="alertType"',
    "alertTitle.value = '登录失败'",
    "alertTitle.value = '登录后页面加载失败'",
    "alertType.value = 'warning'"
  ]),
  'Post-login navigation failures should not reuse the login failure alert title'
)

record(
  'route-asset-error-has-visible-fallback',
  containsAll(routerIndex, ['/auth-unavailable', 'router.replace', 'routeAssetErrorPattern', 'Loading chunk failed', 'BASE_URL']),
  'Repeated dynamic route asset failures should navigate to a visible fallback instead of leaving a blank page'
)

record(
  'auth-unavailable-route-is-eager',
  containsAll(routes, ["import AuthUnavailableView", "component: AuthUnavailableView"]),
  'Auth unavailable fallback route should be eager so route chunk failures still have a visible fallback'
)

const failed = checks.filter((check) => !check.passed)

if (failed.length) {
  console.error(`6-15 regression checks failed: ${failed.length} missing check(s).`)
  for (const check of failed) {
    console.error(`[missing] ${check.name} :: ${check.evidence}`)
  }
  process.exit(1)
}

console.log(`6-15 regression checks passed: ${checks.length} checks.`)
