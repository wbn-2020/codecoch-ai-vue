import { access, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cwd = process.cwd()
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const extensions = new Set(['.vue', '.ts', '.tsx', '.js', '.mjs'])
const ignoredDirs = new Set(['.git', '.idea', '.vscode', 'coverage', 'dist', 'logs', 'node_modules', 'target', 'temp', 'tmp'])

const fileIgnoreDirective = 'ui-copy-check-ignore-file'
const lineIgnoreDirective = 'ui-copy-check-ignore-line'

const blockedPhrases = [
  { phrase: '未联调', reason: 'integration-state-copy' },
  { phrase: '静态示例', reason: 'placeholder-copy' },
  { phrase: '真实接口', reason: 'implementation-copy' },
  { phrase: '接口暂未', reason: 'implementation-copy' },
  { phrase: '接口请求失败', reason: 'implementation-copy' },
  { phrase: '后端尚未', reason: 'implementation-copy' },
  { phrase: '前端无法', reason: 'implementation-copy' },
  { phrase: '模型消耗', reason: 'implementation-copy' },
  { phrase: '后台任务中心', reason: 'implementation-copy' },
  { phrase: '后台队列', reason: 'implementation-copy' },
  { phrase: '后台进度', reason: 'implementation-copy' },
  { phrase: '后台生成任务', reason: 'implementation-copy' },
  { phrase: '通知接口', reason: 'implementation-copy' },
  { phrase: 'AI 调用日志', reason: 'technical-copy' },
  { phrase: '调用日志', reason: 'technical-copy' },
  { phrase: '排查信息已保存', reason: 'technical-copy' },
  { phrase: '原始请求', reason: 'raw-data-copy' },
  { phrase: '原始输出', reason: 'raw-data-copy' },
  { phrase: '输入 JSON', reason: 'technical-copy' },
  { phrase: '输出 JSON', reason: 'technical-copy' },
  { phrase: '预期 Schema', reason: 'technical-copy' },
  { phrase: 'Review JSON', reason: 'technical-copy' },
  { phrase: 'Ctrl K', reason: 'tool-shortcut-copy' },
  { phrase: 'Search pages or commands', reason: 'english-ui-copy' },
  { phrase: 'Enter Open', reason: 'english-ui-copy' },
  { phrase: 'JD 分析', reason: 'job-description-copy' },
  { phrase: 'JD 来源', reason: 'job-description-copy' },
  { phrase: 'JD 内容', reason: 'job-description-copy' },
  { phrase: 'JD 笔记', reason: 'job-description-copy' },
  { phrase: 'JD 摘要', reason: 'job-description-copy' },
  { phrase: '目标 JD', reason: 'job-description-copy' },
  { phrase: '这个 JD', reason: 'job-description-copy' },
  { phrase: '简历/JD', reason: 'job-description-copy' },
  { phrase: 'JD 解析', reason: 'job-description-copy' }
]

const usage = `
Usage:
  node scripts/check-ui-copy.mjs [--max N] [target ...]

Default scope scans CodeCoachAI-vue/src. Add "${lineIgnoreDirective}" to a line or
"${fileIgnoreDirective}" to a file after human review when a match is intentional.
`.trim()

let maxFindings = 80
const targetArgs = []
const args = process.argv.slice(2)

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--help' || arg === '-h') {
    console.log(usage)
    process.exit(0)
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

const defaultTargets = [path.join(frontendRoot, 'src')]
const targets = targetArgs.length
  ? targetArgs.map((entry) => path.isAbsolute(entry) ? entry : path.resolve(cwd, entry))
  : defaultTargets

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

for (const target of targets) {
  if (await exists(target)) await walk(target)
}

const inspectLine = (line) => {
  if (!line || line.includes(lineIgnoreDirective)) return []
  const matches = []
  for (const item of blockedPhrases) {
    if (line.includes(item.phrase)) {
      matches.push(`${item.reason}:${item.phrase}`)
    }
  }
  return matches
}

const findings = []

for (const file of files) {
  const content = await readFile(file, 'utf8')
  if (content.includes(fileIgnoreDirective)) continue
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    const matches = inspectLine(line)
    if (matches.length) {
      findings.push({
        file: path.relative(frontendRoot, file),
        line: index + 1,
        matches,
        text: line.trim().slice(0, 160)
      })
    }
  })
}

if (findings.length) {
  console.error(`UI copy check failed: ${findings.length} blocked phrase occurrence(s).`)
  for (const item of findings.slice(0, maxFindings)) {
    console.error(`${item.file}:${item.line} [${item.matches.join(', ')}] ${item.text}`)
  }
  if (findings.length > maxFindings) {
    console.error(`... ${findings.length - maxFindings} more occurrence(s) omitted.`)
  }
  process.exit(1)
}

console.log(`UI copy check passed: scanned ${files.length} file(s) across ${targets.length} target(s).`)
