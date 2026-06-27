import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const checks = [
  {
    file: 'src/types/agent.ts',
    patterns: [
      'reviewId?: number | null',
      'reviewSummary?: string | null',
      'reviewNextActions?: string[]',
      'reviewSource?:',
      'reviewNote?: string | null'
    ]
  },
  {
    file: 'src/api/agent.ts',
    patterns: [
      'reviewSource: task.reviewSource',
      'reviewNextActions: Array.isArray(task.reviewNextActions)',
      'inputSnapshotJson',
      'rawOutputText',
      '...safeRun'
    ]
  },
  {
    file: 'src/views/agent/AgentTodayView.vue',
    patterns: [
      'task.reviewSummary',
      'task.reviewNextActions?.length',
      'completedTask?.reviewNote'
    ]
  },
  {
    file: 'src/views/agent/AgentTaskListView.vue',
    patterns: [
      'task.reviewSummary',
      'task.reviewNextActions?.length',
      'completedTask?.reviewNote'
    ]
  },
  {
    file: 'src/views/agent/AgentRunDetailView.vue',
    patterns: [
      'task.reviewSummary',
      'task.reviewNextActions?.length',
      'task.reviewSourceLabel'
    ]
  }
]

for (const check of checks) {
  const content = read(check.file)
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      throw new Error(`${check.file} missing ${pattern}`)
    }
  }
}

console.log('Phase 4 agent review evidence checks passed.')
