import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

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
      /onMounted\(\(\) => \{\s+if \(canLoadDashboardHealth\.value\) \{\s+fetchDashboardHealth\(\)\s+\}/
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
    expect(authStyleSource).not.toMatch(/linear-gradient|radial-gradient/i)
    expect(authStyleSource).toContain('min-height: 100dvh')
    expect(authStyleSource).toContain('@media (max-width: 640px)')

    // 方向 D Phase V1：LoginView 已切换为 arena 浅色门面（豁免本契约），
    // 其余认证页沿用 auth-workspace 暗色，待 Phase V2 统一收口。
    authPageSources.forEach(({ fileName, source }) => {
      if (fileName === 'LoginView.vue') {
        expect(source).toContain('class="arena login-page"')
        return
      }
      expect(source).toContain("@use './auth-workspace';")
      expect(source).not.toMatch(/(?:linear|radial)-gradient\s*\(/i)
    })
  })
})
