# User Dashboard Focus Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized card-heavy user dashboard with the approved focused cockpit and action timeline while keeping existing business actions and trust boundaries.

**Architecture:** Recompose `JobCoachHomeView.vue` around existing computed data instead of changing APIs. Introduce native dark dashboard tokens, remove light-first styling, and keep secondary data behind one progressive disclosure section. Limit global theme changes to semantic tokens and user layout surfaces.

**Tech Stack:** Vue 3, TypeScript, SCSS, Element Plus, Lucide, Vitest, Vue Test Utils.

---

### Task 1: Add dashboard structure regression tests

**Files:**
- Create: `tests/unit/components/JobCoachHomeView.test.ts`
- Test: `src/views/user/JobCoachHomeView.vue`

- [ ] **Step 1: Write failing tests**

```ts
it('renders one primary task title and one primary CTA', async () => {
  const wrapper = mountDashboard()
  await flushPromises()
  expect(wrapper.findAll('[data-testid="dashboard-primary-task-title"]')).toHaveLength(1)
  expect(wrapper.findAll('[data-testid="dashboard-primary-action"]')).toHaveLength(1)
})

it('keeps secondary resources collapsed by default', async () => {
  const wrapper = mountDashboard()
  await flushPromises()
  expect(wrapper.find('[data-testid="dashboard-secondary-content"]').exists()).toBe(false)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm run test:unit:run -- tests/unit/components/JobCoachHomeView.test.ts
```

Expected: selectors are missing or repeated.

- [ ] **Step 3: Add test fixtures for no task, no application action, partial API failure and mobile-safe rendering**

- [ ] **Step 4: Run the test file and preserve the failing evidence**

### Task 2: Recompose the dashboard template

**Files:**
- Modify: `src/views/user/JobCoachHomeView.vue`

- [ ] **Step 1: Replace the Hero and three-card cockpit with one focused summary**

Required structure:

```vue
<section class="dashboard-focus">
  <article class="dashboard-primary">
    <span class="dashboard-label">今日优先行动</span>
    <h1 data-testid="dashboard-primary-task-title">{{ primaryTask.title }}</h1>
    <p>{{ primaryTask.description }}</p>
    <div class="dashboard-primary__meta">
      <span>{{ primaryTask.minutes }} 分钟</span>
      <span>{{ primaryTask.reason }}</span>
    </div>
    <el-button data-testid="dashboard-primary-action" type="primary" @click="go(primaryTask.path)">
      {{ primaryTask.cta }}
    </el-button>
  </article>
  <dl class="dashboard-signals">
    <!-- target, evidence, report, risk -->
  </dl>
</section>
```

- [ ] **Step 2: Merge primary action, visible tasks and application actions into one ordered timeline**

- [ ] **Step 3: Limit the timeline to three visible actions and retain complete/skip behavior**

- [ ] **Step 4: Move evidence details into a compact adjacent panel**

- [ ] **Step 5: Replace all lower sections with one collapsed secondary region**

- [ ] **Step 6: Remove duplicated Hero, cockpit cards, application stats wall, command center grid and oversized mobile dock**

- [ ] **Step 7: Run the focused component tests**

Expected: all dashboard structure tests pass.

### Task 3: Implement native dark visual styling

**Files:**
- Modify: `src/views/user/JobCoachHomeView.vue`
- Modify: `src/styles/user-theme.scss`
- Modify: `src/styles/user-components.scss`
- Modify: `src/layouts/UserLayout.vue`
- Modify: `src/components/layout/UserTopNav.vue`

- [ ] **Step 1: Replace cyan/neon tokens with restrained blue-gray semantic tokens**

```scss
--user-bg: #0b1018;
--user-surface: #111925;
--user-surface-muted: #0e1621;
--user-surface-raised: #162131;
--user-border: #273140;
--user-text: #eef2f7;
--user-text-secondary: #b8c1ce;
--user-text-muted: #8d99aa;
--user-primary: #5b8def;
```

- [ ] **Step 2: Remove decorative grid and radial-orb backgrounds from `UserLayout.vue`**

- [ ] **Step 3: Remove light Dashboard declarations and write dark-first scoped styles**

- [ ] **Step 4: Remove Dashboard dependence on broad global `!important` overrides**

- [ ] **Step 5: Add consistent `:focus-visible`, hover, active, disabled and reduced-motion states**

- [ ] **Step 6: Make desktop 1366x768 and mobile 390x844 layouts structurally responsive**

- [ ] **Step 7: Run type-check and dashboard tests**

### Task 4: Add static quality guards

**Files:**
- Modify: `tests/unit/components/JobCoachHomeView.test.ts`
- Create: `tests/unit/features/user-dashboard-style.test.ts`

- [ ] **Step 1: Assert Dashboard source has no white card background declarations**

```ts
expect(source).not.toMatch(/background:\s*#fff(?:fff)?\b/i)
```

- [ ] **Step 2: Assert removed duplicate section class names are absent from the template**

- [ ] **Step 3: Assert custom buttons have focus-visible styling and mobile dock height is bounded**

- [ ] **Step 4: Run all frontend tests, type-check and build**

```powershell
npm run test:unit:run
npm run type-check
npm run build
```

Expected: exit 0.

### Task 5: Browser visual verification

**Files:**
- Evidence: `文档相关/审查报告/7-10/evidence-2026-07-13-dashboard/`

- [ ] **Step 1: Start the frontend dev server with the test API**
- [ ] **Step 2: Capture 1366x768, 1440x900 and 390x844 screenshots**
- [ ] **Step 3: Verify no horizontal scroll, white panels, duplicate CTA or text clipping**
- [ ] **Step 4: Verify keyboard focus and secondary disclosure**
- [ ] **Step 5: Record console and Network errors**
