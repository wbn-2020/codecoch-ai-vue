import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const workspaceRoot = process.cwd()

const collectVueFiles = (directory: string): string[] =>
  readdirSync(resolve(workspaceRoot, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectVueFiles(path) : entry.name.endsWith('.vue') ? [path] : []
  })

const pageFiles = [...collectVueFiles('src/views/v3'), ...collectVueFiles('src/views/v4')]

const readSource = (path: string) => readFileSync(resolve(workspaceRoot, path), 'utf8')

describe('V3/V4 compact dark workspace', () => {
  it('keeps every V3/V4 product surface free of light cards, decorative gradients and broad shadows', () => {
    for (const path of pageFiles) {
      const source = readSource(path)
      expect(source, relative(workspaceRoot, path)).not.toMatch(
        /background(?:-color)?\s*:\s*(?:#fff(?:fff)?|white|#f8fafc|#f8fbff|#f1f5f9|#eff6ff|#f0fdf4|rgba\(\s*255\s*,\s*255\s*,\s*255)/i
      )
      expect(source, relative(workspaceRoot, path)).not.toMatch(/(?:linear|radial)-gradient\(/i)
      expect(source, relative(workspaceRoot, path)).not.toMatch(
        /box-shadow\s*:\s*var\(--app-shadow\)/i
      )
    }
  })

  it('uses compact signal layouts for the main V3/V4 decision pages', () => {
    const dashboard = readSource('src/views/v3/V3DashboardView.vue')
    const targets = readSource('src/views/v3/JobTargetListView.vue')
    const matchDetail = readSource('src/views/v3/ResumeMatchDetailView.vue')
    const growth = readSource('src/views/v4/GrowthProfileView.vue')
    const applications = readSource('src/views/v4/JobApplicationView.vue')

    expect(dashboard).toMatch(/\.metric-grid\s*\{[\s\S]*?display:\s*grid/)
    expect(dashboard).toMatch(/\.metric-card\s*\{[\s\S]*?box-shadow:\s*none/)
    expect(targets).toMatch(/\.metric-grid\s*\{[\s\S]*?border(?:-top)?:\s*1px/)
    expect(matchDetail).toMatch(/\.score-grid\s*\{[\s\S]*?border(?:-top)?:\s*1px/)
    expect(growth).toMatch(/\.v4-grid\s*\{[\s\S]*?border(?:-top)?:\s*1px/)
    expect(applications).toMatch(/\.status-funnel\s*\{[\s\S]*?overflow-x:\s*auto/)
    expect(applications).toMatch(/\.status-funnel\s*\{[\s\S]*?min-width:\s*0/)
    expect(applications).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.v4-application-page[\s\S]*?min-width:\s*0/
    )
    expect(applications).toContain('getResumeVersionsApi')
    expect(applications).toMatch(/<el-select[\s\S]*?v-model="form\.resumeVersionId"/)
    expect(applications).not.toMatch(/<el-input-number[^>]*v-model="form\.resumeVersionId"/)
  })

  it('collapses dense evidence, trend and knowledge workspaces to one column on mobile', () => {
    const matrix = readSource('src/views/v3/components/JobRequirementEvidenceMatrix.vue')
    const resumeMatch = readSource('src/views/v3/ResumeMatchView.vue')
    const growth = readSource('src/views/v4/GrowthProfileView.vue')
    const knowledge = readSource('src/views/v4/KnowledgeBaseView.vue')

    for (const [path, source] of [
      ['JobRequirementEvidenceMatrix.vue', matrix],
      ['ResumeMatchView.vue', resumeMatch],
      ['GrowthProfileView.vue', growth],
      ['KnowledgeBaseView.vue', knowledge]
    ] as const) {
      expect(source, path).toMatch(
        /@media\s*\(max-width:\s*(?:720|760|768|800|900|960)px\)[\s\S]*?grid-template-columns:\s*1fr/
      )
    }
  })

  it('keeps the V7 opportunity workspace grid shrinkable around its scrollable tabs', () => {
    const workspace = readSource('src/views/v4/application-workspace/ApplicationWorkspaceView.vue')

    expect(workspace).toMatch(
      /\.application-workspace\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
    )
    expect(workspace).toMatch(
      /\.workspace-tabs\s*:deep\(\.el-tabs__nav-wrap\)\s*\{[\s\S]*?overflow-x:\s*auto/
    )
  })
})
