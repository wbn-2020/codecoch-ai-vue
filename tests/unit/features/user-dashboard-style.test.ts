import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const home = readSource('src/views/user/JobCoachHomeView.vue')
const theme = readSource('src/styles/user-theme.scss')
const components = readSource('src/styles/user-components.scss')
const layout = readSource('src/layouts/UserLayout.vue')
const appShell = readSource('src/components/layout/UserAppShell.vue')
const userNavigation = readSource('src/config/userNavigation.ts')
const componentsWithoutResumePaper = components.replace(/\.resume-paper\s*\{[\s\S]*?\}/g, '')

describe('user dashboard visual guardrails', () => {
  it('contains no legacy dashboard blocks or unbounded decorative surfaces', () => {
    expect(home).not.toMatch(/class="(?:home-hero|cockpit-grid|application-stats-strip|command-center-grid|mobile-action-dock)"/)
    expect(home).not.toMatch(/\.(?:home-hero|cockpit-grid|application-stats-strip|command-center-grid|mobile-action-dock)\b/)
    expect(home).not.toContain('Focused cockpit theme')

    expect(home).not.toMatch(/radial-gradient|linear-gradient/)
    expect(theme).not.toMatch(/radial-gradient|linear-gradient/)
    expect(home).not.toMatch(/backdrop-filter|\bfilter:\s*blur/)
    expect(home).not.toMatch(/box-shadow:\s*(?:inset\s+)?0 0 [1-9]\d*px/)
    expect(home).not.toMatch(/background(?:-color)?:\s*(?:#fff(?:fff)?|white)\b/i)
    expect(theme).toContain('.jobcoach-layout.is-user-redesign')
    expect(theme).toContain('--user-surface: #ffffff')
    expect(layout).not.toMatch(/radial-gradient|linear-gradient/)
    expect(componentsWithoutResumePaper).not.toMatch(/radial-gradient|linear-gradient/)
    expect(components).toMatch(/\.resume-paper\s*\{[\s\S]*?background:\s*#ffffff\b/)
  })

  it('uses the redesigned user app shell instead of the legacy dark navigation', () => {
    expect(layout).toContain('UserAppShell')
    expect(layout).toContain('v-if="!isImmersivePage"')
    expect(layout).not.toContain('radial-gradient(')
    expect(layout).toContain('var(--user-bg)')

    expect(appShell).toContain("from '@/config/userNavigation'")
    // P0 六项主导航口径
    expect(userNavigation).toContain("label: '今日'")
    expect(userNavigation).toContain("label: '求职'")
    expect(userNavigation).toContain("label: '资料'")
    expect(userNavigation).toContain("label: '面试'")
    expect(userNavigation).toContain("label: '训练'")
    expect(userNavigation).toContain("label: '准备度'")
    expect(userNavigation).toContain('mobilePrimaryNavigationKeys')
    expect(appShell).toContain('class="user-app-shell__sidebar"')
    expect(appShell).toContain('class="user-app-shell__topbar"')
    expect(appShell).toContain('class="user-app-shell__mobile-backdrop"')
    expect(appShell).toMatch(/\.user-app-shell__topbar\s*\{[\s\S]*?min-height:\s*56px/)
    expect(appShell).toMatch(/@media \(max-width: 1023px\)[\s\S]*?position:\s*fixed/)
  })

  it('avoids broad important overrides and text-clipping patterns in the dashboard', () => {
    expect(home).not.toContain('!important')
    expect(theme).not.toContain('!important')
    expect(components).not.toContain('!important')
    expect(layout).not.toContain('!important')

    expect(home).not.toMatch(/white-space:\s*nowrap/)
    expect(home).not.toMatch(/overflow:\s*hidden[\s\S]{0,120}text-overflow:\s*ellipsis/)
  })

  it('uses a two-column desktop cockpit and keeps mobile evidence navigation discoverable', () => {
    expect(home).toMatch(/\.dashboard-cockpit-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(/)
    expect(home).toMatch(/@media \(max-width:\s*720px\)[\s\S]*?\.cockpit-signal-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    const mobileStyles = home.slice(home.indexOf('@media (max-width: 720px)'))
    expect(mobileStyles).not.toMatch(/\.recommendation-summary,[\s\S]*?display:\s*none/)
    expect(mobileStyles).not.toMatch(/\.secondary-toggle-section,[\s\S]*?display:\s*none/)
    expect(home).toContain('展开资料和工具')
    expect(home).not.toContain('position: fixed')
    expect(layout).toContain('--user-mobile-nav-height: 60px')
  })

  it('keeps keyboard focus and reduced-motion support', () => {
    expect(home).toMatch(/button:focus-visible/)
    expect(home).toContain('@media (prefers-reduced-motion: reduce)')
    expect(home).toMatch(/transition-duration:\s*0\.01ms/)
  })
})
