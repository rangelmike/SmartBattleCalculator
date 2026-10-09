# Current State

Snapshot: 2026-10-08. This is a repository handoff, not a claim that hosted Supabase or GitHub Pages was inspected. Verification work began on clean `main` at `a289ec2`.

## Working now

- The visible app supports Google sign-in, profile/team management, Popular team search, and the Champions damage calculator. See [architecture](docs/architecture.md) and the module READMEs for contracts.
- Verification work adds unified commands, disposable local Supabase RLS/RPC/trigger tests, a signed-in browser flow and a shared CI/pre-deployment gate. Application behavior and database policies are unchanged. See [verification](docs/verification.md) and the [failure record](docs/verification-failures.md) for scope and current rerun state.

## Known gaps

- Hosted Google provider/redirect settings, applied remote migrations/RLS/triggers, live Pokepaste access, and deployed Pages health still require the external acceptance procedure. Local integration tests exercise an isolated stack, not hosted configuration.
- `suggest-team` and `src/lib/ai/suggestion-schema.ts` are not wired to the UI; the Edge Function's empty fallback does not meet the intended deterministic recommendation behavior. Legacy email/password helpers and signup validation code remain in source.
- Personal team reads page at 200 rows but still download the entire library before client-side search; move to server-side filtered pagination if account size makes this slow.
- The production build warns about two minified JavaScript chunks above 500 kB (about 3.2 MB and 3.4 MB before gzip); measure first-load performance before optimizing.

## Verification and next action

- 2026-10-07 local verification: `npm run typecheck`, `npm run lint`, `npm run test` (34 files, 150 tests), and `npm run build` passed. Vitest/build needed an unsandboxed shell because esbuild could not read parent directories in this restricted Windows sandbox. `npm run test:e2e` and live Supabase/OAuth/Pages checks were not run. Internal documentation links and `git diff --check` passed.
- 2026-10-08: complete `npm run verify:full` passed typecheck, lint, 150 unit/component tests, all four migrations, 57 real SQL permission/RPC/trigger assertions, production build and four browser cases (signed-out and signed-in CRUD/calculator/sign-out on desktop/mobile). Cleanup stopped the disposable stack with no backup; exit code 0. Basic `verify` and focused `verify:backend` also passed earlier. Runs used Node 24.21.0/npm 11.19.0 and Supabase CLI 2.117.0 in an approved Windows shell; the shared CI workflow is configured for Node 22 but has not run on GitHub. Focused formatting and `git diff --check` passed. Resolved failures and rerun evidence are in the failure record.
- Next action: run the shared CI workflow after these changes are published, and follow the documented external acceptance procedure when a test deployment/account is available. Hosted Google OAuth, remote permissions/migrations and Pages remain unverified; no commit, push or deployment was performed here.
