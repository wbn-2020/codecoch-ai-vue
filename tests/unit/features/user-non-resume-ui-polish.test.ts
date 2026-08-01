import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const knowledge = readSource('src/views/v4/KnowledgeBaseView.vue')
const growth = readSource('src/views/v4/GrowthProfileView.vue')
const dashboard = readSource('src/views/v3/V3DashboardView.vue')
const training = readSource('src/views/question/QuestionTrainingHubView.vue')
const jobCoach = readSource('src/views/user/JobCoachHomeView.vue')
const recordsTools = readSource('src/views/tools/RecordsToolsView.vue')

describe('non-resume user UI polish', () => {
  it('keeps knowledge materials primary and advanced operations collapsed by default', () => {
    expect(knowledge).toContain('<details class="knowledge-operations">')
    expect(knowledge).toContain('<details class="knowledge-eval-details">')
    expect(knowledge).not.toMatch(/<details class="knowledge-(?:operations|eval-details)"\s+open/)
    expect(knowledge.indexOf('class="knowledge-operations"')).toBeLessThan(
      knowledge.indexOf('class="workspace-grid"')
    )
    expect(knowledge).toMatch(/\.knowledge-operations > summary:focus-visible/)
    expect(knowledge).toContain('aria-label="近重复阈值百分比"')
  })

  it('uses one cold-start action instead of repeated growth empty states', () => {
    expect(growth).toContain('class="growth-next-action"')
    expect(growth).toContain('先补一条可信训练记录')
    expect(growth).toContain('<section v-if="!isColdStart" class="content-card">')
    expect(growth).not.toContain('type="empty"')
    expect(growth).toMatch(/\.compact-empty\s*\{[\s\S]*?display:\s*flex/)
  })

  it('places the dashboard next task before metrics and collapses secondary navigation', () => {
    expect(dashboard.indexOf('class="priority-panel"')).toBeLessThan(
      dashboard.indexOf('class="metric-grid"')
    )
    expect(dashboard).toContain('<details class="content-panel onboarding-panel"')
    expect(dashboard).toContain('<details class="content-panel utilities-panel">')
    expect(dashboard).not.toContain('class="next-action-list"')
    expect(dashboard).toMatch(/\.metric-card:focus-visible[\s\S]*?\.onboarding-summary:focus-visible/)
    expect(dashboard).toContain(':aria-label="`${item.label}：${item.value}，${item.hint}`"')
  })

  it('makes the training task first and removes duplicate fallback panels', () => {
    expect(training.indexOf('class="today-plan-card"')).toBeLessThan(
      training.indexOf('class="hero-copy"')
    )
    expect(training).toContain('class="plan-primary-action"')
    expect(training).not.toContain('class="hero-metrics"')
    expect(training).not.toContain('class="content-card fallback-panel"')
    expect(training).not.toMatch(/\.recommendation-empty-state\s*\{[^}]*min-height:/)
    expect(training).toContain('aria-label="推荐依据"')
    expect(training).toContain('aria-label="题目数量"')
    expect(training).toMatch(/\.quick-links button:focus-visible/)
    expect(training).toMatch(
      /@media \(max-width:\s*980px\)[\s\S]*?grid-template-areas:\s*"plan"\s*"copy"/
    )
  })

  it('keeps recommendation evidence and the secondary tool toggle discoverable on mobile', () => {
    const mobileStyles = jobCoach.slice(jobCoach.indexOf('@media (max-width: 720px)'))

    expect(mobileStyles).not.toMatch(/\.recommendation-summary,[\s\S]*?display:\s*none/)
    expect(mobileStyles).not.toMatch(/\.secondary-toggle-section,[\s\S]*?display:\s*none/)
    expect(jobCoach).toContain('展开资料和工具')
  })

  it('keeps the backpack directory scannable and mobile-friendly', () => {
    expect(recordsTools).toContain('class="arena-tools__group-title"')
    expect(recordsTools).toContain('class="arena-tools__row"')
    expect(recordsTools).toMatch(
      /\.arena-tools__row\s*\{[\s\S]*?min-width:\s*0/
    )
    expect(recordsTools).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*?\.arena-tools__row\s*\{[\s\S]*?min-height:\s*64px/
    )
  })
})
