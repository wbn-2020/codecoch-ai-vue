import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const aiTypesFile = path.join(frontendRoot, 'src/types/ai.ts')
const aiLogViewFile = path.join(frontendRoot, 'src/views/admin/AiCallLogView.vue')
const agentTypesFile = path.join(frontendRoot, 'src/types/agent.ts')
const agentTodayFile = path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue')

const [aiTypes, aiLogView, agentTypes, agentToday] = await Promise.all([
  readFile(aiTypesFile, 'utf8'),
  readFile(aiLogViewFile, 'utf8'),
  readFile(agentTypesFile, 'utf8'),
  readFile(agentTodayFile, 'utf8')
])

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(aiTypes.includes("resultSource?: 'LLM' | 'MOCK' | 'FALLBACK' | string"), 'AiCallLogVO must expose resultSource')
expect(aiTypes.includes('resultSourceLabel?: string'), 'AiCallLogVO must expose resultSourceLabel')
expect(aiTypes.includes('fallback?: boolean'), 'AiCallLogVO must expose fallback flag')
expect(aiLogView.includes("resultSourceTagType(row)"), 'AI log view must render source tags in table')
expect(aiLogView.includes("resultSourceLabel(detail)"), 'AI log view must render source tags in detail panel')
expect(aiLogView.includes("label: '来源'"), 'AI log view must register source as a table column')

expect(agentTypes.includes('failureAction?: string | null'), 'DailyPlanVO type must include failureAction')
expect(agentTypes.includes('failureActionLabel?: string | null'), 'DailyPlanVO type must include failureActionLabel')
expect(agentTypes.includes('failureSuggestion?: string | null'), 'DailyPlanVO type must include failureSuggestion')

expect(agentToday.includes('plan.value?.failureSuggestion'), 'AgentTodayView must prefer failureSuggestion')
expect(agentToday.includes('plan.value?.failureAction'), 'AgentTodayView must branch on failureAction')
expect(agentToday.includes('plan.value?.failureActionLabel'), 'AgentTodayView must surface failureActionLabel')

if (failures.length) {
  console.error(`Phase 2 AI truthfulness checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Phase 2 AI truthfulness checks passed.')
