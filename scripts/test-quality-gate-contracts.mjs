import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const packageJson = JSON.parse(await readFile(path.join(frontendRoot, 'package.json'), 'utf8'))
const scripts = packageJson.scripts || {}
const workflowPath = path.join(frontendRoot, '.github/workflows/frontend-quality.yml')
let workflowText = ''
try {
  workflowText = await readFile(workflowPath, 'utf8')
} catch {
  workflowText = ''
}

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const scriptContains = (scriptName, expected) =>
  typeof scripts[scriptName] === 'string' && scripts[scriptName].includes(expected)

expect(scriptContains('check:quality', 'npm run test:unit:run'), 'check:quality must run frontend unit tests')
expect(scriptContains('check:quality', 'npm run check:mojibake:frontend'), 'check:quality must run the frontend-only mojibake scan')
expect(!scriptContains('check:quality', 'npm run check:mojibake &&'), 'check:quality must not run the cross-repo mojibake scan by default')
expect(!scriptContains('check:quality', 'npm run check:v4-contracts'), 'check:quality must stay runnable in a frontend-only checkout without backend contract files')
expect(!scriptContains('check:quality', 'npm run check:phase10'), 'check:quality must stay runnable in a frontend-only checkout without backend privacy contract files')
expect(scriptContains('check:quality', 'npm run check:wave-contracts'), 'check:quality must run wave-level frontend contract checks')
expect(scriptContains('check:quality', 'npm run check:quality-gates'), 'check:quality must run quality gate self-checks')
expect(
  scripts['check:quality:workspace'] === 'npm run check:quality && npm run check:v4-contracts && npm run check:phase10',
  'check:quality:workspace must extend the frontend-only gate with cross-repo workspace contract checks'
)
expect(scripts['test:unit'] === 'vitest --config vitest.config.ts', 'test:unit must use the shared Vitest config')
expect(scripts['test:unit:run'] === 'vitest run --config vitest.config.ts', 'test:unit:run must run Vitest in non-watch mode')
expect(scriptContains('check:wave-contracts', 'scripts/test-wave1-1-r-analytics-error-contract.mjs'), 'check:wave-contracts must cover analytics error-state contract')
expect(scriptContains('check:wave-contracts', 'scripts/test-wave1-1-r-knowledge-dangerous-confirm-contract.mjs'), 'check:wave-contracts must cover knowledge dangerous confirmation contract')
expect(scriptContains('check:wave-contracts', 'scripts/test-wave3-agent-task-actions.mjs'), 'check:wave-contracts must cover Agent task action contract')
expect(scriptContains('check:wave-contracts', 'scripts/test-wave4-rbac-button-permissions.mjs'), 'check:wave-contracts must cover admin button-level RBAC contract')
expect(scriptContains('check:wave-contracts', 'tests/rbac-overview-contract.test.mjs'), 'check:wave-contracts must cover admin overview RBAC contract')
expect(scriptContains('check:wave-contracts', 'tests/page-normalizer-contract.test.mjs'), 'check:wave-contracts must cover strict PageResult normalization contract')
expect(scripts['check:quality-gates'] === 'node scripts/test-quality-gate-contracts.mjs', 'check:quality-gates must run this contract script')
expect(workflowText.includes('npm ci --ignore-scripts'), 'frontend CI workflow must install dependencies without package lifecycle scripts')
expect(workflowText.includes('npm run check:quality'), 'frontend CI workflow must run the main frontend quality gate')

if (failures.length) {
  console.error(`Quality gate contract checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Quality gate contract checks passed.')
