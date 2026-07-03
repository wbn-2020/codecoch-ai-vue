import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adminAccess = readFileSync(resolve(root, 'src/router/adminAccess.ts'), 'utf8')
const routes = readFileSync(resolve(root, 'src/router/routes.ts'), 'utf8')

assert.doesNotMatch(
  adminAccess,
  /ADMIN_BASELINE_PERMISSIONS|authStore\.isAdmin\s*&&/,
  'ADMIN role alone must not satisfy admin:system:overview access'
)

assert.match(
  routes,
  /requiredPermissions:\s*\[\s*['"]admin:system:overview['"]\s*\]/,
  'admin dashboard route must keep the admin:system:overview permission code'
)
