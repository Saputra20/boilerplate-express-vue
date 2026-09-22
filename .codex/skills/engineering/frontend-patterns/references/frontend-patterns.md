# CMS Foundation Pattern

## Purpose
Guide Vue 3 work without importing React/Next patterns. Router, Pinia, Axios, and Zod are installed but not used by a feature yet.

## Established Pattern
apps/cms/src/main.ts validates environment before mount:
~~~ts
loadEnv();
createApp(App).mount('#app');
~~~
App.vue uses script setup and a semantic main landmark. styles.css imports Tailwind v4 and owns small global shell styling.

## Decision Guide
- Environment work follows src/env.ts then main.ts.
- Shell UI work follows App.vue and styles.css.
- Router/store/client/composable/feature module has no canonical implementation yet; require task contract.
- Create shared UI only after genuine reuse is demonstrated.

## Avoid
Do not fabricate dashboard data, navigation, API calls, state, or generic CRUD components in the foundation shell.

## Verify
Run CMS lint, typecheck, test, build. Browser inspection follows meaningful rendered change.
