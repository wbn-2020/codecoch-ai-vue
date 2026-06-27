import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const requestClient = await read('src/utils/request.ts')
const metricsView = await read('src/views/admin/AdminAnalyticsMetricsView.vue')
const jobsView = await read('src/views/admin/AdminAnalyticsJobsView.vue')

const failures = []

const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(
  /if\s*\(\s*result\.code\s*===\s*HTTP_STATUS_CODE\.SUCCESS\s*\)\s*{[\s\S]*?return\s+result\.data[\s\S]*?return\s+Promise\.reject\(result\)/s.test(requestClient),
  'request.ts must reject non-success Result payloads so analytics pages can enter error state'
)

const assertAnalyticsPageErrorContract = ({ source, viewName, fetchName, collectionName }) => {
  expect(
    /const\s+errorMessage\s*=\s*ref\(''\)/.test(source),
    `${viewName} must keep an explicit errorMessage state`
  )

  expect(
    /<AppState\s+v-if="errorMessage"\s+type="error"/.test(source),
    `${viewName} must render an AppState error block before the table empty state`
  )

  expect(
    new RegExp(`const\\s+${fetchName}\\s*=\\s*async\\s*\\(\\)\\s*=>\\s*{[\\s\\S]*?errorMessage\\.value\\s*=\\s*''[\\s\\S]*?catch\\s*\\(error\\)\\s*{[\\s\\S]*?${collectionName}\\.value\\s*=\\s*\\[\\][\\s\\S]*?errorMessage\\.value\\s*=\\s*getErrorMessage\\(error\\)`, 's').test(source),
    `${viewName} must convert analytics API failures into errorMessage instead of only clearing table data`
  )

  expect(
    /<template\s+v-else>[\s\S]*?<el-table/.test(source),
    `${viewName} table and empty state must be hidden when errorMessage is present`
  )
}

assertAnalyticsPageErrorContract({
  source: metricsView,
  viewName: 'AdminAnalyticsMetricsView',
  fetchName: 'fetchMetrics',
  collectionName: 'metrics'
})

assertAnalyticsPageErrorContract({
  source: jobsView,
  viewName: 'AdminAnalyticsJobsView',
  fetchName: 'fetchJobs',
  collectionName: 'jobs'
})

if (failures.length) {
  console.error(`Wave 1.1-R analytics error contract checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Wave 1.1-R analytics error contract checks passed.')
