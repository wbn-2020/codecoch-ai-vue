# CodeCoachAI User Navigation Discoverability Design

## Context

The authenticated user shell currently keeps five primary destinations in the top navigation and places the remaining destinations in a single-column "more" dropdown. The dropdown exposes labels without icons, descriptions, grouping, or current-page context, so users who do not already know the product structure can easily miss important workflows.

The redesign keeps the existing routes, feature flags, permissions, dark visual system, and five-item mobile bottom navigation. It changes only how secondary destinations are surfaced and understood.

## Design Decision

### Persistent primary navigation

Keep the five existing primary workspaces:

- Dashboard
- Question practice
- Mock interview
- Resume lab
- Ability map

These remain the stable mental model for the product.

### High-frequency desktop shortcuts

Expose two direct actions without opening a menu:

- Today's tasks
- Applications

At wide desktop widths, show icon and label. At narrower desktop widths, keep the icons and accessible names while hiding the visible labels. Below the existing desktop-navigation breakpoint, these actions remain available in the grouped mobile panel.

### Grouped feature navigator

Replace the single-column dropdown with a wide navigation panel. Group links by user intent instead of implementation module:

1. Today's progress
2. Job assets
3. Training and review
4. Growth and support

Every destination includes a Lucide icon, a concise title, a one-line description, and an active state when its route is current. Existing preview and feature-flag visibility rules remain in force.

The panel is a navigation surface, not a grid of promotional cards. Groups use unframed columns and compact rows so the interface stays work-focused.

### Responsive behavior

- Desktop: five primary workspaces, two high-frequency shortcuts, and the grouped feature panel.
- Tablet: the primary workspace row collapses to the existing menu trigger; the expanded panel uses the same grouped information architecture.
- Mobile: the five-item bottom navigation remains stable; the top menu trigger opens all primary and grouped destinations in a scrollable panel above the bottom navigation.
- Text must wrap safely and controls must not resize when active state or labels change.

### Accessibility and interaction

- The feature trigger exposes `aria-expanded`, `aria-controls`, and an accessible label.
- The panel has an explicit navigation label.
- Current destinations expose `aria-current="page"`.
- Escape closes the feature panel and returns focus to the trigger.
- Clicking outside closes the panel.
- Route changes close desktop and mobile panels.
- Focus-visible styling is present for every interactive destination.
- Reduced-motion users do not receive transform animation.

## Acceptance Criteria

- Today's tasks and Applications are directly visible on desktop without opening the feature panel.
- All links previously found under "more" remain reachable.
- The feature panel renders four semantic groups with icons and descriptions.
- The current secondary route is visibly and semantically highlighted.
- Mobile users can discover the same grouped destinations.
- Feature-flagged links preserve their current visibility rules.
- No horizontal overflow is introduced at desktop, tablet, or mobile widths.
- Navigation tests, TypeScript, full Vitest, contracts, and the production build pass.
- Real-browser checks confirm keyboard closing, responsive layout, console health, and expected network behavior.
