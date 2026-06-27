import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const routes = await read('src/router/routes.ts')
const analyticsMetrics = await read('src/views/admin/AdminAnalyticsMetricsView.vue')
const analyticsJobs = await read('src/views/admin/AdminAnalyticsJobsView.vue')
const promptRegression = await read('src/views/admin/AdminPromptRegressionView.vue')

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const count = (text, needle) => text.split(needle).length - 1
const sliceFrom = (text, marker, length = 1200) => {
  const start = text.indexOf(marker)
  return start === -1 ? '' : text.slice(start, start + length)
}

const expectContainsAll = (name, text, needles) => {
  const missing = needles.filter((needle) => !text.includes(needle))
  expect(!missing.length, `${name} missing ${missing.join(' | ')}`)
}

expectContainsAll('analytics metrics route list permission', routes, [
  "name: 'AdminAnalyticsMetrics'",
  "requiredPermissions: ['admin:analytics:agent']"
])
expectContainsAll('analytics jobs route list permission', routes, [
  "name: 'AdminAnalyticsJobs'",
  "requiredPermissions: ['admin:analytics:agent']"
])
expectContainsAll('prompt regression route list permission', routes, [
  "name: 'AdminPromptRegression'",
  "requiredPermissions: ['admin:agent:prompt-regression:list']"
])

expect(
  count(analyticsMetrics, `v-permission="'admin:analytics:metric:write'"`) >= 4,
  'AdminAnalyticsMetricsView write actions must be guarded by admin:analytics:metric:write in toolbar, row action, empty state, and dialog submit'
)
expectContainsAll('analytics metric save action keeps confirmation and idempotency', sliceFrom(analyticsMetrics, 'const saveMetric = async', 2200), [
  'confirmDangerActionPreview({',
  'confirm: true',
  'dryRun: false',
  'reason:',
  'createOperationIdempotencyKey(operation)'
])

expect(
  count(analyticsJobs, `v-permission="'admin:analytics:job:run'"`) >= 4,
  'AdminAnalyticsJobsView run/rerun actions must be guarded by admin:analytics:job:run in toolbar, row action, empty state, and dialog submit'
)
expectContainsAll('analytics daily-plan run keeps confirmation and idempotency', sliceFrom(analyticsJobs, 'const runDailyPlan = async', 2200), [
  'confirmDangerActionPreview({',
  'confirm: true',
  'dryRun: false',
  'reason:',
  "createOperationIdempotencyKey('analytics-daily-plan')"
])
expectContainsAll('analytics job rerun keeps confirmation and idempotency', sliceFrom(analyticsJobs, 'const rerun = async', 2200), [
  'confirmDangerActionPreview({',
  'confirm: true',
  'dryRun: false',
  'reason:',
  'createOperationIdempotencyKey(`analytics-rerun-${id}`)'
])

expect(
  count(promptRegression, `v-permission="'admin:agent:prompt-regression:write'"`) >= 4,
  'AdminPromptRegressionView write actions must be guarded by admin:agent:prompt-regression:write in toolbar, row action, empty state, and dialog submit'
)
expect(
  count(promptRegression, `v-permission="'admin:agent:prompt-regression:run'"`) >= 4,
  'AdminPromptRegressionView run actions must be guarded by admin:agent:prompt-regression:run in toolbar, row action, empty state, and dialog submit'
)
expectContainsAll('prompt regression save keeps confirmation and idempotency', sliceFrom(promptRegression, 'const saveCase = async', 2600), [
  'confirmDangerActionPreview({',
  'confirm: true',
  'dryRun: false',
  'reason:',
  'createOperationIdempotencyKey(operationKey)'
])
expectContainsAll('prompt regression run keeps confirmation and idempotency', sliceFrom(promptRegression, 'const runRegression = async', 2200), [
  'confirmDangerActionPreview({',
  'confirm: true',
  'dryRun: false',
  'reason:',
  'createOperationIdempotencyKey(`prompt-regression-${runForm.caseId}`)'
])

if (failures.length) {
  console.error(`Wave 4 RBAC button permission checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Wave 4 RBAC button permission checks passed.')
