import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const aiOpsView = await read('src/views/admin/AdminAiOpsAnalyticsView.vue')

const failures = []

const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(
  aiOpsView.includes("import { useAuthStore } from '@/stores/auth'") &&
    aiOpsView.includes('const authStore = useAuthStore()'),
  'AdminAiOpsAnalyticsView must read the current admin permission snapshot before loading optional analytics data'
)

expect(
  /canViewAgentAnalytics\s*=\s*computed\(\s*\(\)\s*=>\s*authStore\.hasPermission\('admin:analytics:agent'\)\s*\)/s.test(aiOpsView),
  'AdminAiOpsAnalyticsView must derive a canViewAgentAnalytics permission guard for agent-only analytics APIs'
)

expect(
  /canViewAiFeedbackStats\s*=\s*computed\(\s*\(\)\s*=>\s*authStore\.hasPermission\('admin:ai:feedback:stats'\)\s*\)/s.test(aiOpsView),
  'AdminAiOpsAnalyticsView must derive a canViewAiFeedbackStats permission guard for AI result feedback stats'
)

expect(
  /optionalLoad\s*=\s*<[\s\S]*?allowed[\s\S]*?loader[\s\S]*?fallback[\s\S]*?allowed\s*\?\s*loader\(\)\s*:\s*Promise\.resolve\(fallback\)/s.test(aiOpsView),
  'AdminAiOpsAnalyticsView must use optionalLoad so missing optional permissions do not issue doomed 403 requests'
)

for (const apiName of [
  'getAdminAnalyticsOverviewApi',
  'getAdminAnalyticsTrainingApi',
  'getAdminAgentFeedbackApi',
  'getAdminAnalyticsMetricsApi',
  'getAdminAnalyticsJobsApi'
]) {
  const guardedCall = new RegExp(
    `optionalLoad(?:<[^>]+>)?\\(\\s*canLoadAgentAnalytics\\s*,\\s*\\(\\)\\s*=>\\s*${apiName}\\(`,
    's'
  )
  expect(
    guardedCall.test(aiOpsView),
    `AdminAiOpsAnalyticsView must guard ${apiName} with admin:analytics:agent before loading the AI ops page`
  )
}

expect(
  /optionalLoad(?:<[^>]+>)?\(\s*canLoadAiFeedbackStats\s*,\s*\(\)\s*=>\s*getAdminAiResultFeedbackStatsApi\(/s.test(aiOpsView),
  'AdminAiOpsAnalyticsView must guard getAdminAiResultFeedbackStatsApi with admin:ai:feedback:stats before loading the AI ops page'
)

if (failures.length) {
  console.error(`Slice 4g analytics permission drift checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Slice 4g analytics permission drift checks passed.')
