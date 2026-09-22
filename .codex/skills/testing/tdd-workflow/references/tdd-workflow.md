# Current Test Infrastructure

## API
- Jest with ts-jest ESM preset: apps/api/jest.config.mjs.
- Command: bun run --cwd apps/api test.
- Tests: apps/api/tests/**/*.test.ts.
- Supertest checks exported Express app.

~~~ts
const response = await request(app).get('/unknown');
expect(response.status).toBe(404);
expect(response.body).toEqual({ message: 'Not found' });
~~~
Source: apps/api/tests/app.test.ts.

## CMS
- Vitest, jsdom, Vue plugin/globals: apps/cms/vitest.config.ts.
- Command: bun run --cwd apps/cms test.
- Vue Test Utils mount pattern: apps/cms/tests/App.test.ts.

~~~ts
expect(mount(App).get('h1').text()).toBe('CMS foundation');
~~~

## Not Established
No fixtures, factories, shared setup, DB/Redis harness, auth helpers, router/Pinia tests, or E2E suite exists.

## Checklist
Map tests to acceptance criteria; isolate env/mocks; test failure behavior where contract exists; never use real secrets; run root test when both apps change.
