# Unit/component test setup

`setup.ts` is loaded by `vitest.config.ts` for jsdom-based Vitest tests. Source tests live beside the module they cover as `*.test.ts` or `*.test.tsx`; browser tests live in `e2e/`.

Use focused mocks for Supabase/network calls in component tests, but do not treat those mocks as proof of hosted Auth configuration or database RLS. Run `npm run test` for the full suite and follow [Verification](../../docs/verification.md) for release checks.

Harness regression tests use Node's test runner in `scripts/validate-harness.test.mjs` (`npm run harness:test`); Vitest deliberately excludes them. Database pgTAP tests run separately with `npm run test:db`, which already supplies `--local`. Shared CI runs each appropriate runner.
