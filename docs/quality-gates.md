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
npm run check:mojibake
npm run check:ui-copy
```

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

The frontend repository currently has no `.github/workflows` directory. When CI wiring is explicitly approved, add a GitHub Actions workflow that runs `npm run check:quality` before build jobs.

Do not wire CI automatically without review, because workflow files change what remote CI runners execute on push or pull request. Keep logs bounded and keep the gate non-destructive: type-check, mojibake scan, and UI-copy scan first; build only in the release job that is allowed to regenerate artifacts.
