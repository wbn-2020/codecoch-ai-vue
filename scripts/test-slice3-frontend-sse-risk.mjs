import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const [
  sseUtil,
  requestUtil,
  knowledgeView,
  routes,
  guards,
  v4Api
] = await Promise.all([
  read('src/utils/sse.ts'),
  read('src/utils/request.ts'),
  read('src/views/v4/KnowledgeBaseView.vue'),
  read('src/router/routes.ts'),
  read('src/router/guards.ts'),
  read('src/api/v4.ts')
])

const failures = []

const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const containsAll = (text, needles) => needles.every((needle) => text.includes(needle))

const blockAfter = (text, marker, length = 1800) => {
  const start = text.indexOf(marker)
  return start === -1 ? '' : text.slice(start, start + length)
}

const routeBlockFor = (routePath) => {
  const marker = `path: '${routePath}'`
  const start = routes.indexOf(marker)
  if (start === -1) return ''
  const nextRoute = routes.indexOf('{ path:', start + marker.length)
  return routes.slice(start, nextRoute === -1 ? start + 500 : nextRoute)
}

expect(
  containsAll(requestUtil, ['export const refreshAccessToken', 'refreshToken()']),
  'request.ts must expose the same refresh-token path used by axios retries for long-lived SSE requests'
)

expect(
  containsAll(sseUtil, ['refreshAccessToken', 'isAuthFailureResponse', 'fetchWithCurrentToken', 'retryAfterAuthRefresh']) &&
    /if\s*\(\s*await\s+isAuthFailureResponse\(response\)\s*\)/s.test(sseUtil),
  'streamSse must refresh auth and retry once before stream consumption when the initial fetch is an auth failure'
)

expect(
  containsAll(knowledgeView, [
    'onBeforeUnmount',
    'activeKnowledgeAskStream',
    'cancelActiveKnowledgeAskStream',
    'knowledgeAskRunId',
    'activeKnowledgeAskStream = stream',
    'stream.finished',
    'cancelActiveKnowledgeAskStream()'
  ]),
  'KnowledgeBaseView must retain and cancel active knowledge SSE streams on replacement and unmount'
)

expect(
  /if\s*\(\s*knowledgeAskRunId\s*!==\s*askRunId\s*\)/s.test(knowledgeView),
  'KnowledgeBaseView SSE callbacks must ignore stale/cancelled ask runs to avoid corrupting newer answers'
)

const knowledgeAskStreamBlock = blockAfter(v4Api, 'export const askKnowledgeStreamApi')
expect(
  containsAll(knowledgeAskStreamBlock, [
    'let errorDispatched = false',
    'const dispatchStreamError',
    'if (errorDispatched) return',
    'errorDispatched = true',
    "case 'error':",
    'dispatchStreamError(',
    'onError: (error) => dispatchStreamError('
  ]),
  'askKnowledgeStreamApi must dedupe SSE error callbacks so event:error and transport onError cannot trigger duplicate fallback requests'
)

for (const routePath of ['agent/reviews', 'growth/profile', 'growth/skills', 'growth/readiness', 'agent/memory', 'knowledge']) {
  const block = routeBlockFor(routePath)
  expect(block, `Missing V4 preview route ${routePath}`)
  expect(block.includes('previewOnly: true'), `V4 preview route ${routePath} must remain previewOnly gated`)
}

expect(
  containsAll(guards, ['isPreviewRoute(to)', 'enableV4ExperimentalRoutes', '/feature-unavailable']),
  'router guard must block previewOnly V4 routes when the experimental flag is disabled'
)

if (failures.length) {
  console.error(`Slice 3 frontend SSE risk checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Slice 3 frontend SSE risk checks passed.')
