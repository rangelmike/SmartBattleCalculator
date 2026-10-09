# Verification

Use Node.js 22 and `npm ci`. Tests use the existing Vitest, Playwright and Supabase tools; no application authentication bypass is added.

## Commands and scope

| Command                  | Checks                                                                                                       | Use                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `npm run verify`         | Typecheck, lint, unit/component tests, production build, signed-out browser smoke on desktop and mobile      | Changes outside schema, Auth, storage, calculator and deployment                         |
| `npm run verify:full`    | All of the above plus real local migrations/RLS/RPC/trigger tests and signed-in browser CRUD/calculator flow | Schema, Auth, team storage, calculator or deployment changes; CI and pre-deployment gate |
| `npm run verify:backend` | Disposable database migrations and pgTAP tests only                                                          | Focused development; **not** an acceptance check                                         |

Every command stops at the first failed stage and exits nonzero. After fixing a failure, rerun the complete applicable command, not only the failed stage. Review [verification-failures](verification-failures.md) before starting. Record the command, environment, cause, fix and rerun result there; unresolved checks also belong in [PROGRESS](../PROGRESS.md).

Vitest and Playwright use at most two workers to keep component-test timings stable while the local backend is running.

## Prerequisites

- Install matching browser binaries once: `npx playwright install chromium` (Linux CI: `npx playwright install --with-deps chromium`). The two projects use Chromium with desktop/mobile viewports.
- For full/backend checks, install Supabase CLI 2.117.0 (the CI version), and start Docker Desktop with Linux containers, or Docker Engine on Linux. No hosted Supabase account or credentials are required.
- Keep ports 4173 and 55421–55423 available. An existing server on 4173 is rejected rather than reused.
- Windows sandbox restrictions may require running the same verification command in an approved shell; log this as an environment issue, not an application success/failure.

The runner builds an isolated Supabase project under ignored `.supabase/verification`, copying the repository config, migrations and SQL tests. It resets **only** `smart-battle-calculator-verification`, and stops it/removes its disposable database at the end. The normal local development project and hosted project are untouched. Initial runs need network access to download container images. After an interrupted run, clean only this test stack with `supabase --workdir .supabase/verification stop --no-backup`.

The frontend build explicitly overrides developer `.env.local` Supabase values. Basic checks have no backend; full checks use only `http://127.0.0.1:55421`. Local keys stay in process memory; the service key is not a `VITE_` value. No test credentials or sessions should be committed or uploaded as artifacts.

## What the integration checks establish

`supabase/tests/database/access.test.sql` seeds fixtures as postgres, then switches to `anon`/`authenticated` with separate user claims. It tests owner CRUD, cross-user read/write denial, public-team reads, collection isolation/cascades, Popular administrator restrictions (including confirmation and forged email claims), search/suggestion RPCs, and common-set insert/update/species-change/delete triggers. It ends with a rollback. Assertions never rely on the service role to prove RLS.

`e2e/signed-in.spec.ts` uses an admin client only to create/delete a disposable account. An ordinary session then exercises actual profile/team queries and writes in the built app: import, reload, edit, both collections, calculator loading, a fixed damage range, temporary HP/stages, New battle, deletion and sign-out. Password login is a **local test fixture**, not a production sign-in feature or proof of Google OAuth. No database queries or Auth responses are mocked in this flow.

Playwright reports/traces and `dist` are ignored local outputs. Traces from full verification may contain local session tokens: inspect locally and do not publish them.

## External acceptance: Google and deployed Pages

Local success does not verify a hosted provider, deployed migrations or deployment. After changes to Auth/deployment, and before a release claim, use a designated test Supabase project and test accounts; use production only for non-destructive checks explicitly requested by its owner.

1. Record commit, date, frontend URL and Supabase project identifier (no secrets). Confirm the intended migrations are applied and provider/redirect settings match [setup](setup.md).
2. Open the deployed Pages URL in a fresh browser. Verify assets load under `/SmartBattleCalculator/`, and Profile/Calculator hash navigation and refresh work.
3. Sign in with real Google. Verify the redirect returns to the same app, an existing account keeps its user ID and teams, and sign-out/re-entry works. Cancel a new sign-in and verify the app remains usable and exposes a recoverable error.
4. In the test project, verify a regular account cannot write Popular through the API and the designated confirmed administrator can. Save/reload/delete only a named test team; verify derived common sets update. Confirm API email/password sign-in is disabled when claiming Google-only enforcement.
5. If checking Pokepaste availability, import a known legal fixture through its real `/raw` URL and record the URL/result. Local mocked fetch tests do not prove live availability.

Record each result in PROGRESS with a link to the CI run/deployment when available. Mark unavailable steps **unverified**, with the reason and next action. Do not save OAuth tokens, service keys or real user data as evidence.

References: [Supabase database testing](https://supabase.com/docs/guides/database/testing), [CLI local tests](https://supabase.com/docs/reference/cli/supabase-test-db).
