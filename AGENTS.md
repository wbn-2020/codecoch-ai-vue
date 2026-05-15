# AGENTS.md — CodeCoachAI Vue Frontend

## Project identity

This repository is the Vue frontend of CodeCoachAI, an AI interview training platform.

Current project phase:
- V1 code is considered functionally complete.
- V1 documentation still needs to be updated and aligned with the actual code.
- The next development phase is V2.
- Do not start V2 feature implementation until V1 frontend pages, API contracts, and release notes are synchronized.

Related repositories:
- Frontend: https://github.com/wbn-2020/codecoch-ai-vue.git
- Backend: https://github.com/wbn-2020/codecoch-ai-java.git
- Docs: https://github.com/wbn-2020/codecoch-ai-doc.git

## Frontend architecture expectations

Act as a senior Vue + TypeScript frontend engineer.

Expected stack:
- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- Axios

Keep the current routing, layout, store, and API module structure unless explicitly asked to refactor.

## V1 scope that must remain stable

V1 pages and flows include:
- Login and registration
- User profile
- Question list/detail/answering
- Favorites
- Wrong records
- Resume and project experience management
- Interview creation
- Interview room
- Interview report
- Interview history
- Admin dashboard
- Admin user/role management
- Admin question/category/tag/group management
- Admin prompt management
- Admin AI call logs
- Admin system configuration

## Non-negotiable rules

1. Do not invent API paths. Use the actual backend controller mappings or existing `src/api/**` files.
2. Do not add fake mock data to hide backend integration issues unless explicitly requested.
3. Do not keep adding compatibility hacks in API adapters. Prefer aligning DTOs with backend contracts.
4. If a response shape is uncertain, stop and inspect the backend contract before changing UI logic.
5. Do not break role-based navigation:
   - Admin users can access admin routes.
   - Normal users cannot see or access admin functions.
6. Keep user-side and admin-side navigation clearly separated.
7. For AI interview pages, account for real LLM latency. Do not assume all AI responses return within a few seconds.
8. Avoid changing global request timeout blindly. Prefer per-API timeout for AI scoring/report generation if needed.
9. For every UI fix, state the route, component file, API file, and reproduction steps.

## Build and verification commands

Use the actual project scripts if they exist. Otherwise prefer:

```bash
npm install
npm run type-check
npm run build
npm run dev
```

Check in browser:
- No old API paths appear in Network.
- No unexpected 401/403/404.
- Logout immediately redirects or clears protected state.
- Admin buttons are hidden for normal users.
- Interview create → room → answer → follow-up/score → finish → report works.

## Required response format for Codex

When completing a task, report:

1. Task conclusion
2. Modified files
3. What changed in each file
4. Affected route/page
5. Affected API module
6. Backend contract assumptions
7. Verification performed
8. Remaining risks
9. Next recommended step

## Documentation sync rule

If UI behavior changes V1 usage, update or instruct the user to update:
- V1 user guide
- API contract notes
- `PROJECT_STATE.md`
- `V1_RELEASE_NOTES_DRAFT.md`
