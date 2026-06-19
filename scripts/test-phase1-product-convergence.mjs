import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const routeFile = path.join(frontendRoot, 'src/router/routes.ts')
const sidebarFile = path.join(frontendRoot, 'src/components/layout/UserSidebar.vue')

const [routes, sidebar] = await Promise.all([
  readFile(routeFile, 'utf8'),
  readFile(sidebarFile, 'utf8')
])

const failures = []

const routeBlockFor = (routePath) => {
  const marker = `path: '${routePath}'`
  const start = routes.indexOf(marker)
  if (start === -1) return ''
  const nextRoute = routes.indexOf('{ path:', start + marker.length)
  return routes.slice(start, nextRoute === -1 ? start + 500 : nextRoute)
}

const sidebarBlockFor = (menuPath) => {
  const marker = `path: '${menuPath}'`
  const start = sidebar.indexOf(marker)
  if (start === -1) return ''
  const nextItem = sidebar.indexOf('{ label:', start + marker.length)
  return sidebar.slice(start, nextItem === -1 ? start + 300 : nextItem)
}

const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const stageOutRoutes = [
  'agent/reviews',
  'growth/profile',
  'growth/skills',
  'growth/readiness',
  'agent/memory',
  'knowledge'
]

for (const routePath of stageOutRoutes) {
  const block = routeBlockFor(routePath)
  expect(block, `Missing route ${routePath}`)
  expect(
    block.includes('previewOnly: true') || block.includes("featureFlag: 'v4Preview'"),
    `Stage-out route ${routePath} must be preview gated`
  )
}

const stageOutSidebarPaths = [
  '/agent/reviews',
  '/growth/profile',
  '/agent/memory',
  '/knowledge'
]

for (const menuPath of stageOutSidebarPaths) {
  const block = sidebarBlockFor(menuPath)
  expect(block, `Missing sidebar item ${menuPath}`)
  expect(
    block.includes('previewOnly: true') || block.includes("featureFlag: 'v4Preview'"),
    `Stage-out sidebar item ${menuPath} must be hidden or preview gated`
  )
}

const legacyResumeMatchRoute = routeBlockFor('resume-job-match')
expect(legacyResumeMatchRoute, 'Missing legacy /resume-job-match compatibility redirect')
expect(
  legacyResumeMatchRoute.includes("redirect: '/resume-match'"),
  'Legacy /resume-job-match must redirect to /resume-match'
)

const legacyResumeMatchDetailRoute = routeBlockFor('resume-job-match/:id')
expect(legacyResumeMatchDetailRoute, 'Missing legacy /resume-job-match/:id compatibility redirect')
expect(
  legacyResumeMatchDetailRoute.includes("redirect:") && legacyResumeMatchDetailRoute.includes("ResumeMatchDetail"),
  'Legacy /resume-job-match/:id must redirect to ResumeMatchDetail'
)

if (failures.length) {
  console.error(`Phase 1 product convergence checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Phase 1 product convergence checks passed.')
