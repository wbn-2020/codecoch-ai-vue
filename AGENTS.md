# AGENTS.md - CodeCoachAI Vue Frontend

## Project Identity

This repository is the Vue frontend of CodeCoachAI, an AI interview and job-search training platform.

Local repositories:

- Frontend: `C:\my-claude\CodeCoachAI-vue`
- Backend: `C:\my-claude\CodeCoachAI-java`
- Documentation: `C:\my-claude\CodeCoachAI-doc`

Current frontend branch:

```text
dev-v4
```

Current product stage:

```text
V4
```

V4 positioning:

```text
Personal JobCoachAgent + long-term growth profile + BI analytics + AI engineering observability
```

Primary current implementation stage:

```text
V4-A: JobCoachAgent MVP
```

## V4 Documentation Baseline

Before planning or implementing V4 frontend work, read the V4 documents from:

```text
C:\my-claude\CodeCoachAI-doc\MD\V4
```

Key documents:

```text
C:\my-claude\CodeCoachAI-doc\MD\V4\CodeCoachAI_PRD_V4_个人求职智能体与数据分析增强版.md
C:\my-claude\CodeCoachAI-doc\MD\V4\V4_开发路线图.md
C:\my-claude\CodeCoachAI-doc\MD\V4\V4-A\V4-A_API契约.md
C:\my-claude\CodeCoachAI-doc\MD\V4\V4-A\V4-A_技术设计.md
C:\my-claude\CodeCoachAI-doc\MD\V4\V4-A\V4-A_开发任务拆解.md
C:\my-claude\CodeCoachAI-doc\MD\V4\V4-C\V4-C-1_基础BI看板_预研.md
```

If PRD wording conflicts with the V4 roadmap, the roadmap wins for implementation stage boundaries. For V4-A, do not build automatic daily plans, daily review, `agent_review`, long-term memory, RAG, complex BI, or resume delivery automation.

Frontend API contracts must follow the backend branch `dev-v4` real Controllers/DTOs/VOs after implementation. Draft docs are planning references, not final proof that an API exists.

## Current Tech Stack

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Axios
- Element Plus
- ECharts
- markdown-it
- Sass / SCSS
- Tailwind CSS
- `@vueuse/core`
- `lucide-vue-next`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`

Do not introduce new UI frameworks or heavy dependencies unless the user explicitly asks and the task genuinely requires them.

## V4 Roadmap

Recommended delivery order:

| Stage | Goal | Frontend Rule |
|---|---|---|
| V4-A | JobCoachAgent MVP | Current priority. Build daily plan, task list/actions, run detail, basic admin diagnostics. |
| V4-C-1 | Basic BI dashboard | Use real `agent_run`, `agent_task`, and `ai_call_log` metrics after V4-A. |
| V4-B | Daily review and growth profile | Add automatic plan, daily review, growth pages. |
| V4-C-2 | Full BI + AI Ops | Complete admin BI and AI Ops dashboards. |
| V4-D | Resume versions and job-search progress | Resume versioning and application progress pages. |
| V4-E | Long-term memory and personal knowledge base | Memory and knowledge base management. |

Do not mix later-stage pages into V4-A unless the user explicitly changes scope.

## V4-A Frontend Direction

V4-A user pages:

```text
/agent/today
/agent/tasks
/agent/runs/:id
```

V4-A admin pages:

```text
/admin/agent/runs
/admin/agent/tasks
```

Recommended new files:

```text
src/types/agent.ts
src/api/agent.ts
src/api/adminAgent.ts
src/views/agent/AgentTodayView.vue
src/views/agent/AgentTaskListView.vue
src/views/agent/AgentRunDetailView.vue
src/views/admin/AdminAgentRunView.vue
src/views/admin/AdminAgentTaskView.vue
```

Use existing `src/router/routes.ts`, `src/utils/request.ts`, page normalizers, layouts, route meta, and Element Plus/Tailwind style patterns.

## Stable Existing Capabilities

V1, V2, and V3 frontend capabilities must remain stable:

- Login, logout, token persistence, route guard, user/admin permission handling.
- User dashboard, V3 dashboard, target jobs, JD analysis, resume-JD match, skill profile.
- Question list/detail/practice/favorites/wrong records/recommendations.
- Resume list/edit/upload/analysis/optimization.
- Study plans and daily study tasks.
- Interview creation, room, history, detail, report.
- Admin dashboard, user/role/menu, questions/categories/tags/groups, prompts, AI logs, AI models, files, notices, operation/login logs, async tasks.

Do not break existing paths, API parsing, token headers, permissions, stores, or layout behavior while adding V4 pages.

## Implementation Rules

Before coding, scan the real frontend structure:

- `src/router/routes.ts`
- `src/api`
- `src/types`
- `src/views`
- `src/layouts`
- `src/stores`
- `src/utils/request.ts`
- Existing user and admin page styles.

Rules:

- Use real backend APIs. Do not use mock data to pretend V4-A is complete.
- If a backend endpoint is not implemented yet, show an explicit empty/error/waiting state; do not fake business results.
- Keep API wrappers and type definitions explicit.
- Avoid broad `any`, `// @ts-ignore`, or meaningless type assertions.
- Do not rewrite Axios interceptors, token storage, router guard, or Pinia auth state unless the task explicitly requires it.
- Do not create unreachable pages or fake buttons.
- Dangerous admin actions need confirmation dialogs.
- Empty fields should display `--` or a clear empty state.

## UI And Design Rules

Continue the existing product direction:

- Dark AI workbench.
- Job-search training cockpit.
- Developer/IDE-like panels.
- Low-saturation borders.
- Clear information hierarchy.
- Element Plus for tables, forms, dialogs, pagination, selects, date pickers.
- Tailwind/SCSS for layout, spacing, dark cards, responsive structure.
- `lucide-vue-next` for icons when practical.

Every V4 page must handle:

- loading
- empty
- error
- permission failure where relevant
- mobile and desktop text overflow safely

Do not build a marketing landing page for V4-A. The first screen should be the usable Agent experience.

## V4-A API Expectations

Expected user API wrappers:

```text
POST /agent/job-coach/daily-plan/generate
GET  /agent/job-coach/daily-plan/latest
GET  /agent/tasks/today
GET  /agent/tasks
POST /agent/tasks/{id}/complete
POST /agent/tasks/{id}/skip
GET  /agent/runs/{id}
```

Expected admin API wrappers:

```text
GET /admin/agent/runs
GET /admin/agent/tasks
```

Optional task start/restore APIs should not be surfaced unless the backend implements them and the current scope includes them.

## Security And Privacy Rules

- Normal users must not access admin pages.
- User pages must not expose another user's Agent runs or tasks.
- Admin pages must respect existing admin route meta and permission style.
- Do not display full sensitive raw content by default.
- Mask or collapse raw AI output where it may include private text.
- Never write real database passwords, AI keys, tokens, or credentials into source, docs, logs, or committed files.

## Build And Verification Rules

After frontend code changes, run:

```text
npx vue-tsc -b
npm run build
git diff --check
```

For AGENTS-only or documentation-only changes, `git diff --check` is sufficient unless the user asks for build verification.

If a local page is implemented and a dev server is appropriate, start it and verify the relevant route in the browser unless the user asks not to.

Do not claim browser, backend, or integration verification happened unless it actually happened.

## Git Rules

You may be in a dirty worktree. Never revert unrelated user changes.

Before committing:

1. Run `git status --short`.
2. Confirm no runtime files or secrets are staged.
3. Run `git diff --check`.
4. Run required type/build checks.
5. Stage only intended files.
6. Commit only when the user asks or the current task explicitly requires it.
7. Push only when requested or when the workflow explicitly says to do so.

## Required Completion Report

When completing a frontend task, report:

1. Task conclusion.
2. Current directory.
3. Current branch.
4. Modified files.
5. What changed.
6. API impact.
7. Route impact.
8. Permission impact.
9. Verification performed.
10. Browser validation, if performed.
11. Commit ID, if committed.
12. Push result, if pushed.
13. Remaining risks.
14. Next recommended step.
