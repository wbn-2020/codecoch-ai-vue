# User Navigation Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make secondary user features easy to discover without changing routes, permissions, feature flags, or the five-workspace primary navigation.

**Architecture:** `UserTopNav.vue` remains the owner of shell navigation. Its flat secondary-link array becomes a typed grouped navigation model shared by the desktop feature panel and responsive expanded panel. A small self-managed popover state handles outside click, Escape, route-change cleanup, and focus restoration without introducing a new dependency.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Router, Lucide Vue, scoped SCSS, Vitest, Vue Test Utils.

---

### Task 1: Lock navigation behavior with tests

**Files:**
- Modify: `tests/unit/components/UserTopNav.test.ts`

- [ ] **Step 1: Add a failing desktop-shortcut test**

Mount the navigation and assert that `.priority-link` renders `今日任务` and `投递管理` with the expected accessible names before the feature panel is opened.

- [ ] **Step 2: Add a failing grouped-panel test**

Open `.more-button`, assert the four group headings, and verify every legacy secondary destination remains present inside `.feature-nav-panel`.

- [ ] **Step 3: Add failing active-state and semantic tests**

Set the route to `/applications`, open the panel, and assert the Applications destination has `is-active` and `aria-current="page"`. Assert every feature destination has an icon and description.

- [ ] **Step 4: Add failing responsive-panel and Escape tests**

Open the mobile panel and assert it contains the same group headings. Open the desktop panel, dispatch Escape, and assert it closes and restores focus to the trigger.

- [ ] **Step 5: Run the target test to verify RED**

Run:

```powershell
npm run test:unit -- tests/unit/components/UserTopNav.test.ts
```

Expected: failures for missing priority links, grouped panel, active state, and Escape behavior.

### Task 2: Implement the grouped feature navigator

**Files:**
- Modify: `src/components/layout/UserTopNav.vue`

- [ ] **Step 1: Define typed navigation groups**

Add icon, description, active-prefix, preview, and feature-flag metadata. Keep the current visibility rules and expose a computed list with empty groups removed.

- [ ] **Step 2: Add desktop high-frequency shortcuts**

Render Today's tasks and Applications as icon-and-label buttons. Add compact-label behavior before the existing tablet breakpoint.

- [ ] **Step 3: Replace the Element Plus flat dropdown**

Render a self-managed panel with four unframed group columns and compact destination rows. Add active state, `aria-current`, and panel semantics.

- [ ] **Step 4: Reuse groups in the responsive panel**

Keep the five primary workspace rows, then render grouped secondary destinations with the same metadata and visibility behavior.

- [ ] **Step 5: Implement lifecycle and keyboard behavior**

Close on route change, outside pointer interaction, and Escape. Restore focus to the feature trigger on Escape and remove document listeners on unmount.

- [ ] **Step 6: Add responsive and focus styling**

Use the existing dark tokens, 8px radii, restrained borders, stable dimensions, safe wrapping, visible focus, and reduced-motion overrides.

- [ ] **Step 7: Run the target test to verify GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/components/UserTopNav.test.ts
```

Expected: all `UserTopNav` tests pass.

### Task 3: Verify integration and production output

**Files:**
- Verify only unless failures require scoped fixes.

- [ ] **Step 1: Run TypeScript**

```powershell
npm run type-check
```

- [ ] **Step 2: Run all Vitest tests**

```powershell
npm run test:unit
```

- [ ] **Step 3: Run contract guards**

```powershell
npm run test:guards
npm run test:v4-contracts
```

- [ ] **Step 4: Build production assets**

```powershell
npm run build
```

- [ ] **Step 5: Inspect real desktop and mobile layouts**

Verify no horizontal overflow, no clipped panel, safe wrapping, current-page state, Escape behavior, outside-click behavior, and clean Console/Network output.

### Task 4: Deploy and revalidate the test environment

**Files:**
- Use the repository's existing deployment scripts and current server layout.
- Update the final acceptance report after verification.

- [ ] **Step 1: Package the verified frontend and any pending backend changes**

- [ ] **Step 2: Deploy with the previously approved test-server interruption window**

- [ ] **Step 3: Verify container health, gateway health, frontend HTTP 200, and current asset hashes**

- [ ] **Step 4: Re-run user login, navigation discovery, mobile layout, and cross-user resume error-state checks**

- [ ] **Step 5: Continue executable four-priority acceptance cases and update the release recommendation**
