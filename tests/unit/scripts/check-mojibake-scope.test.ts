import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const tempRoots: string[] = []

const createStandaloneFrontendCheckout = () => {
  const checkoutRoot = mkdtempSync(join(tmpdir(), 'codecoachai-frontend-'))
  const frontendRoot = join(checkoutRoot, 'codecoch-ai-vue')
  const scriptsRoot = join(frontendRoot, 'scripts')

  mkdirSync(join(frontendRoot, 'src'), { recursive: true })
  mkdirSync(scriptsRoot, { recursive: true })
  writeFileSync(join(frontendRoot, 'src', 'example.ts'), 'export const greeting = "你好"')
  cpSync(join(projectRoot, 'scripts', 'check-mojibake.mjs'), join(scriptsRoot, 'check-mojibake.mjs'))
  cpSync(join(projectRoot, 'scripts', 'workspace-paths.mjs'), join(scriptsRoot, 'workspace-paths.mjs'))

  tempRoots.push(checkoutRoot)
  return frontendRoot
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('check-mojibake scope isolation', () => {
  it('runs the frontend scope without a sibling backend checkout', () => {
    const frontendRoot = createStandaloneFrontendCheckout()

    const output = execFileSync(
      process.execPath,
      [join(frontendRoot, 'scripts', 'check-mojibake.mjs'), '--frontend'],
      { cwd: frontendRoot, encoding: 'utf8' }
    )

    expect(output).toContain('Mojibake check passed')
  })

  it('still requires a backend checkout for the backend scope', () => {
    const frontendRoot = createStandaloneFrontendCheckout()

    const result = spawnSync(
      process.execPath,
      [join(frontendRoot, 'scripts', 'check-mojibake.mjs'), '--backend'],
      { cwd: frontendRoot, encoding: 'utf8' }
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Backend repository not found')
  })
})
