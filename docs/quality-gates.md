# CodeCoachAI Frontend Quality Gates

This document records local quality gates for release candidates. It is intentionally a manual checklist for now; wiring it into CI should be confirmed separately because CI changes affect automated execution.

## Mojibake Checks

Run these before publishing a test build:

```powershell
npm run check:mojibake:frontend
npm run check:mojibake:backend
```

The checker scans Vue/TypeScript/CSS/Markdown/Java/SQL/XML/YAML text for common UTF-8 mojibake patterns, replacement characters, and rare CJK clusters that usually indicate broken Chinese copy.

Use these ignore directives only after human review:

- `mojibake-check-ignore-file`: ignore an entire file.
- `mojibake-check-ignore-line`: ignore one intentionally suspicious line.

## UI Copy Checks

Run this before publishing a test build:

```powershell
npm run check:ui-copy
```

The checker scans frontend source files for blocked visible-copy phrases that previously made the app feel unfinished or overly technical, such as internal integration wording, raw request/output labels, visible JSON/schema labels, and English tool shortcuts in primary navigation.

Use these ignore directives only after human review:

- `ui-copy-check-ignore-file`: ignore an entire file.
- `ui-copy-check-ignore-line`: ignore one intentionally suspicious line.

## Release Candidate Checks

Run this non-destructive gate before publishing a test build:

```powershell
npm run check:quality
```

It expands to:

```powershell
npm run type-check
npm run test:unit:run
npm run check:mojibake:frontend
npm run check:ui-copy
npm run check:wave-contracts
npm run check:quality-gates
```

`check:quality` is the frontend repository gate, so it stays runnable in a frontend-only checkout. Its mojibake scan stays limited to frontend files, and it excludes workspace-level scripts that read `../CodeCoachAI-java`.

Run the cross-repo workspace gate only when the sibling backend repository is present:

```powershell
npm run check:quality:workspace
```

It expands the frontend-only gate with:

```powershell
npm run check:v4-contracts
npm run check:phase10
```

Run `npm run check:mojibake:backend` separately from the backend workspace or in a multi-repo release check when you need cross-repo validation.

`test:unit:run` executes the real frontend unit-test harness:

```powershell
npm run test:unit:run
```

Current scope is intentionally narrow:

- shared component behavior such as `AppState`
- shared utility hardening such as `routeSecurity`

`check:wave-contracts` keeps report-driven regression scripts in the main local gate:

```powershell
npm run check:wave-contracts
```

It covers analytics error-state, knowledge dangerous confirmation, Agent task action routing, admin button-level RBAC, and the admin overview RBAC contract without starting any service.

Run the production build only when you are ready to regenerate `dist`:

```powershell
npm run build
```

Then verify the report-driven workflows manually:

- Admin refresh keeps the admin role and permissions.
- `/resumes` opens from dashboard CTA, sidebar, and direct refresh.
- Resume match failure shows a user-readable diagnosis and retry path.
- JD parse, resume parse, resume match, recommendation generation, and interview report tasks can be found by Message, Trace, or business ID in the user task center.
- Admin task center can query by `traceId` and `bizType + bizId`.
- Mobile admin pages are read-only for write requests and clearly point users to desktop for changes.
- Disabled admin buttons show which permission is missing.

## CI Follow-Up

The frontend repository now includes `.github/workflows/frontend-quality.yml`.

It keeps CI non-destructive:

- `npm ci --ignore-scripts`
- `npm run check:quality`

It does not depend on a sibling backend checkout and does not start any service, browser, Docker, database, Redis, MQ, ES, or Qdrant dependency.

Build jobs can remain separate; the quality workflow exists to keep frontend-only type-check, unit tests, and report-driven contract checks attached to pull requests and pushes.
