import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { stripScopedStyleBlock } from '../helpers/scoped-style'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')
const readOptionalSource = (relativePath: string) => {
  const filePath = path.resolve(projectRoot, relativePath)
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

const adminLayoutSource = readSource('src/layouts/AdminLayout.vue')
const adminStyleSource = readOptionalSource('src/views/admin/admin-workspace.scss')
const adminDashboardSource = readSource('src/views/admin/AdminDashboardView.vue')
const authStyleSource = readOptionalSource('src/views/auth/auth-workspace.scss')

const readVueSources = (relativeDirectory: string) => {
  const directory = path.resolve(projectRoot, relativeDirectory)
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.vue'))
    .map((fileName) => ({
      fileName,
      source: fs.readFileSync(path.join(directory, fileName), 'utf8')
    }))
}

const adminPageSources = readVueSources('src/views/admin')
const authPageSources = readVueSources('src/views/auth')

const brightBackgroundPattern =
  /background(?:-color)?\s*:\s*(?:#fff(?:fff)?|#f8fafc|#f8fbff|#eff6ff|#f1f5f9|#f0fdf4|rgba?\(\s*248\s*[, ]\s*250\s*[, ]\s*252\b)/gi
const decorativeSurfacePattern =
  /(?:linear|radial)-gradient\s*\(|backdrop-filter\s*:\s*blur\(|box-shadow\s*:\s*0\s+\d{2,}px\s+\d{2,}px/gi

describe('admin workspace layout system', () => {
  it('compresses the shared admin chrome into a compact three-row workspace', () => {
    expect(adminLayoutSource).toContain("@use '../views/admin/admin-workspace';")
    expect(adminStyleSource).toContain('--admin-header-height: 52px')
    expect(adminStyleSource).toContain('--admin-health-height: 32px')
    expect(adminStyleSource).toContain('--admin-tags-height: 30px')
    expect(adminStyleSource).toContain('height: var(--admin-tags-height)')
    expect(adminStyleSource).toContain('min-height: var(--admin-health-height)')
    expect(adminStyleSource).toMatch(
      /\.admin-health-strip__status,[\s\S]*?\.admin-health-strip__item\s*\{[\s\S]*?min-height:\s*24px[\s\S]*?height:\s*24px/
    )
  })

  it('loads the dashboard health summary only for users granted its overview permission', () => {
    expect(adminLayoutSource).toContain(
      "const canLoadDashboardHealth = computed(() => canOpenAdminLink(['admin:system:overview']))"
    )
    expect(adminLayoutSource).toMatch(
      /onMounted\(\(\) => \{[\s\S]*?if \(canLoadDashboardHealth\.value\) \{\s+fetchDashboardHealth\(\)\s+\}/
    )
  })

  it('keeps the admin root and error recovery on a routable content page', () => {
    const routesSource = readSource('src/router/routes.ts')

    expect(adminLayoutSource).toContain('fallback-path="/admin/dashboard"')
    expect(routesSource).toContain(
      "{ path: '', redirect: '/admin/dashboard', meta: { hidden: true, commandHidden: true } }"
    )
  })

  it('uses solid dark operational surfaces without decorative gradients or bright cards', () => {
    expect(adminStyleSource).not.toMatch(/linear-gradient|radial-gradient/i)

    const violations = adminPageSources.flatMap(({ fileName, source }) => {
      const matches = source.match(brightBackgroundPattern) ?? []
      const decorativeSurfaces = source.match(decorativeSurfacePattern) ?? []
      return [...matches, ...decorativeSurfaces].map((match) => `${fileName}: ${match}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps mobile filters and diagnostic drawers within the viewport with touch-sized actions', () => {
    expect(adminStyleSource).toContain('min-width: 0;')
    expect(adminStyleSource).toContain('max-width: 100%;')
    expect(adminStyleSource).toContain('.admin-diagnostic-drawer.el-drawer')
    expect(adminStyleSource).toContain('width: min(100vw, 460px) !important;')
    expect(adminStyleSource).toContain('overflow-x: hidden;')
    expect(adminStyleSource).toContain('min-height: 44px;')
  })

  it('uses native buttons for navigable dashboard metrics and exposes chart data as tables', () => {
    expect(adminDashboardSource).toContain('v-if="item.path"')
    expect(adminDashboardSource).toContain('type="button"')
    expect(adminDashboardSource).toContain('class="dashboard-chart-data"')
    expect(adminDashboardSource).toContain(':aria-describedby="businessTrendDataId"')
    expect(adminDashboardSource).toContain(':aria-describedby="aiTrendDataId"')
    expect(adminDashboardSource).toContain('clip-path: inset(50%);')
  })

  it('keeps authentication pages on one responsive shared dark surface', () => {
    const authBaseStyles = stripScopedStyleBlock(authStyleSource, '.arena-auth.auth-page')
    expect(authBaseStyles).not.toMatch(/linear-gradient|radial-gradient/i)
    expect(authStyleSource).toContain('min-height: 100dvh')
    expect(authStyleSource).toContain('@media (max-width: 640px)')

    // 方向 D：明确标记为 arena-auth 的认证页允许使用竞技场浅色表面；
    // 其余认证页仍由本契约守护为共享暗色认证壳。
    authPageSources.forEach(({ fileName, source }) => {
      if (fileName === 'LoginView.vue') {
        expect(source).toContain('class="arena login-page"')
        return
      }
      if (['RegisterView.vue', 'ForgotPasswordView.vue', 'ResetPasswordView.vue'].includes(fileName)) {
        expect(source).toContain('class="arena arena-auth auth-page"')
        expect(source).toContain("@use './auth-workspace';")
        return
      }
      expect(source).toContain("@use './auth-workspace';")
      expect(source).not.toMatch(/(?:linear|radial)-gradient\s*\(/i)
    })
  })
})
