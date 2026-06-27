import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const roomFile = path.join(frontendRoot, 'src/views/interview/InterviewRoomView.vue')
const typesFile = path.join(frontendRoot, 'src/types/interview.ts')

const [roomView, interviewTypes] = await Promise.all([
  readFile(roomFile, 'utf8'),
  readFile(typesFile, 'utf8')
])

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(roomView.includes('answerReviewStreamingFeedback'), 'Interview room must keep a streaming feedback buffer')
expect(
  /event\s*===\s*'delta'/.test(roomView) && /event\s*===\s*'token'/.test(roomView),
  'Interview room must handle both delta and token events as streaming content'
)
expect(
  /answerReviewStreamingFeedback\.value\s*\+=/.test(roomView),
  'Interview room must append token content to the streaming feedback buffer'
)
expect(
  roomView.includes('review-stream-preview'),
  'Interview room must render the streaming feedback preview while answer review is running'
)
expect(
  /if\s*\(\s*isAnswerReviewTokenEvent\(event,\s*data\)\s*\)\s*\{[\s\S]*?return\s*\}/.test(roomView),
  'Token events must not be pushed into the stage event list'
)
expect(interviewTypes.includes("'token'"), 'InterviewAnswerReviewSseEventType must include token')
expect(interviewTypes.includes('content?: string'), 'InterviewAnswerReviewSseEvent must expose token content')
expect(interviewTypes.includes('index?: number'), 'InterviewAnswerReviewSseEvent must expose token index')

if (failures.length) {
  console.error(`Phase 3 interview streaming checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Phase 3 interview streaming checks passed.')
