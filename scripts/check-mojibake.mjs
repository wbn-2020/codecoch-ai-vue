// mojibake-check-ignore-file: this checker intentionally contains mojibake signatures.
import { access, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cwd = process.cwd()
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(frontendRoot, '..')
const backendRoot = path.join(workspaceRoot, 'CodeCoachAI-java')

const extensions = new Set([
  '.css',
  '.html',
  '.java',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.scss',
  '.sql',
  '.ts',
  '.tsx',
  '.vue',
  '.xml',
  '.yaml',
  '.yml'
])

const ignoredDirs = new Set([
  '.git',
  '.idea',
  '.vscode',
  'coverage',
  'dist',
  'logs',
  'node_modules',
  'target',
  'temp',
  'tmp'
])

const fileIgnoreDirective = 'mojibake-check-ignore-file'
const lineIgnoreDirective = 'mojibake-check-ignore-line'

const suspiciousRegexes = [
  { name: 'replacement-char', pattern: /\uFFFD/u },
  { name: 'latin1-utf8-c2', pattern: /\u00C2[\u0080-\u00BF]?/u },
  { name: 'latin1-utf8-c3', pattern: /\u00C3[\u0080-\u00BF]/u },
  { name: 'latin1-utf8-punctuation', pattern: /\u00E2(?:\u20AC|\u201A|\u201E|\u2026|\u2122|\u0153|\u0080)/u },
  { name: 'escaped-latin1-utf8', pattern: /\\u00(?:c2|c3|e2)/iu }
]

const rareMojibakeCodePoints = new Set([
  0x9225,
  0x9286,
  0x935d,
  0x937a,
  0x93c9,
  0x93c8,
  0x93c2,
  0x93b5,
  0x93b6,
  0x93cd,
  0x93c4,
  0x9413,
  0x9422,
  0x9436,
  0x9410,
  0x95c1,
  0x95c2,
  0x95c8,
  0x95c6,
  0x95b8,
  0x95bd,
  0x95b4,
  0x95b2,
  0x95ab,
  0x95a5,
  0x95c8,
  0x95b6,
  0x95c3,
  0x95b9,
  0x95c7
])

// Keep this explicit. A broad 0x9200-0x95ff range flags normal Chinese such as 错、问、时间 and makes the gate unusable.
const rareCjkMojibakeRanges = []

const usage = `
Usage:
  node scripts/check-mojibake.mjs [--all|--frontend|--backend] [--max N] [target ...]

Default scope scans CodeCoachAI-vue/src plus CodeCoachAI-java module src/config files.
Add "${lineIgnoreDirective}" to a line or "${fileIgnoreDirective}" to a file when a match is intentional.
`.trim()

let scope = 'all'
let maxFindings = 80
const targetArgs = []
const args = process.argv.slice(2)

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--help' || arg === '-h') {
    console.log(usage)
    process.exit(0)
  }
  if (arg === '--all') {
    scope = 'all'
    continue
  }
  if (arg === '--frontend') {
    scope = 'frontend'
    continue
  }
  if (arg === '--backend') {
    scope = 'backend'
    continue
  }
  if (arg === '--max') {
    maxFindings = Number(args[index + 1]) || maxFindings
    index += 1
    continue
  }
  if (arg.startsWith('--max=')) {
    maxFindings = Number(arg.slice('--max='.length)) || maxFindings
    continue
  }
  targetArgs.push(arg)
}

const exists = async (entry) => {
  try {
    await access(entry)
    return true
  } catch {
    return false
  }
}

const resolveBackendTargets = async () => {
  if (!await exists(backendRoot)) return []

  const entries = await readdir(backendRoot, { withFileTypes: true })
  const moduleSrcDirs = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('codecoachai-')) continue
    const srcDir = path.join(backendRoot, entry.name, 'src')
    if (await exists(srcDir)) moduleSrcDirs.push(srcDir)
  }

  const extraDirs = ['config', 'sql'].map((name) => path.join(backendRoot, name))
  const existingExtras = []
  for (const dir of extraDirs) {
    if (await exists(dir)) existingExtras.push(dir)
  }

  return [...moduleSrcDirs, ...existingExtras]
}

const resolveDefaultTargets = async () => {
  const frontendTargets = scope === 'backend' ? [] : [path.join(frontendRoot, 'src')]
  const backendTargets = scope === 'frontend' ? [] : await resolveBackendTargets()
  return [...frontendTargets, ...backendTargets]
}

const targets = targetArgs.length
  ? targetArgs.map((entry) => path.isAbsolute(entry) ? entry : path.resolve(cwd, entry))
  : await resolveDefaultTargets()

const files = []

const walk = async (entry) => {
  const fullPath = path.resolve(entry)
  const info = await stat(fullPath).catch(() => null)
  if (!info) return
  if (info.isDirectory()) {
    if (ignoredDirs.has(path.basename(fullPath))) return
    const children = await readdir(fullPath)
    await Promise.all(children.map((child) => walk(path.join(fullPath, child))))
    return
  }
  if (info.isFile() && extensions.has(path.extname(fullPath))) {
    files.push(fullPath)
  }
}

await Promise.all(targets.map(walk))

const findings = []

const countRareMojibakeChars = (line) => {
  let count = 0
  for (const char of line) {
    const codePoint = char.codePointAt(0)
    if (
      rareMojibakeCodePoints.has(codePoint) ||
      rareCjkMojibakeRanges.some(([start, end]) => codePoint >= start && codePoint <= end)
    ) {
      count += 1
    }
  }
  return count
}

const inspectLine = (line) => {
  if (!line || line.includes(lineIgnoreDirective)) return []

  const reasons = []
  for (const item of suspiciousRegexes) {
    if (item.pattern.test(line)) reasons.push(item.name)
  }

  const rareCount = countRareMojibakeChars(line)
  if (rareCount >= 2) reasons.push(`rare-cjk-mojibake-cluster:${rareCount}`)

  return [...new Set(reasons)]
}

for (const file of files) {
  const content = await readFile(file, 'utf8')
  if (content.includes(fileIgnoreDirective)) continue
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    const reasons = inspectLine(line)
    if (reasons.length) {
      findings.push({
        file: path.relative(workspaceRoot, file),
        line: index + 1,
        reasons,
        text: line.trim().slice(0, 160)
      })
    }
  })
}

if (findings.length) {
  console.error(`Mojibake check failed: ${findings.length} suspicious line(s).`)
  for (const item of findings.slice(0, maxFindings)) {
    console.error(`${item.file}:${item.line} [${item.reasons.join(', ')}] ${item.text}`)
  }
  if (findings.length > maxFindings) {
    console.error(`... ${findings.length - maxFindings} more line(s) omitted.`)
  }
  process.exit(1)
}

console.log(`Mojibake check passed: scanned ${files.length} file(s) across ${targets.length} target(s).`)
