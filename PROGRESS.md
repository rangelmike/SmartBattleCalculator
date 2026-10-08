# Current State

Snapshot: 2026-10-07. This is a repository handoff, not a claim that hosted Supabase or GitHub Pages was inspected. At the start of this documentation task, `main` was clean at `63fdca5`.

## Working now

- The visible app supports Google sign-in, profile/team management, Popular team search, and the Champions damage calculator. See [architecture](docs/architecture.md) and the module READMEs for contracts.
- No application feature is currently mid-implementation. This session is tightening the repository harness after an oversized `feature_list.json` was reverted; do not recreate a full historical feature catalog.

## Known gaps

- `e2e/smoke.spec.ts` expects the obsolete heading `your teams, ready`; Playwright cannot be treated as a passing release gate until repaired.
- Hosted Google provider/redirect settings, applied migrations, admin RLS, common-set trigger behavior, live Pokepaste access, and deployed Pages health are not verified by local frontend tests.
- `suggest-team` and `src/lib/ai/suggestion-schema.ts` are not wired to the UI; the Edge Function's empty fallback does not meet the intended deterministic recommendation behavior. Legacy email/password helpers and signup validation code remain in source.
- Personal team reads page at 200 rows but still download the entire library before client-side search; move to server-side filtered pagination if account size makes this slow.
- The production build warns about two minified JavaScript chunks above 500 kB (about 3.2 MB and 3.4 MB before gzip); measure first-load performance before optimizing.

## Verification and next action

- 2026-10-07 local verification: `npm run typecheck`, `npm run lint`, `npm run test` (34 files, 150 tests), and `npm run build` passed. Vitest/build needed an unsandboxed shell because esbuild could not read parent directories in this restricted Windows sandbox. `npm run test:e2e` and live Supabase/OAuth/Pages checks were not run. Internal documentation links and `git diff --check` passed.
- Next session: check `git status`, read the newest user request, then inspect only the relevant module. If continuing general hardening, fix the stale E2E smoke assertion and add a controlled signed-in browser flow before making broad completion claims.
