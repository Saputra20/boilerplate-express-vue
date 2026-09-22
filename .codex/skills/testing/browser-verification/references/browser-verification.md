# Current Browser Verification Context

## Purpose
Set truthful browser expectations for the current CMS shell.

## Established UI
App.vue renders one main landmark, CMS foundation heading, and paragraph. styles.css imports Tailwind and sets global max-width/padding. No router, form, request, loading state, or browser E2E runner exists.

## Workflow
1. Run bun run dev:cms or bun run --cwd apps/cms dev.
2. Inspect rendered UI only for meaningful visual/interactive change.
3. Check applicable desktop/mobile layout, overflow, focus/keyboard access, and actual changed states.
4. Record evidence or report Visual verification: NOT RUN — reason.

## Decision Guide
Foundation/config/test-only work: normally not applicable. New page, form, navigation, responsive style, auth flow, or critical interaction: browser verification required when available.

## Existing Examples
apps/cms/src/App.vue and apps/cms/src/styles.css show current render; App.test.ts is component evidence, not visual evidence.
