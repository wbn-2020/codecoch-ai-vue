import { existsSync } from 'node:fs'
import path from 'node:path'

export const resolveBackendRoot = (frontendRoot = process.cwd()) => {
  const workspaceRoot = path.resolve(frontendRoot, '..')
  const candidates = [
    process.env.CODECOACHAI_BACKEND_ROOT,
    path.join(workspaceRoot, 'codecoch-ai-java'),
    path.join(workspaceRoot, 'CodeCoachAI-java')
  ].filter(Boolean)

  const backendRoot = candidates.find((candidate) => existsSync(candidate))
  if (!backendRoot) {
    throw new Error(
      `Backend repository not found. Checked: ${candidates.join(', ')}. ` +
        'Set CODECOACHAI_BACKEND_ROOT to override the workspace layout.'
    )
  }
  return backendRoot
}
