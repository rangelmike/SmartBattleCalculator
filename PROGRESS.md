# Progress

Snapshot: 2026-10-07. This is a code-level status, not a claim that the hosted Supabase project or GitHub Pages deployment was checked today. Update this file when behavior or verification changes.

## Implemented in this repository

- Google-only sign-in screen, session restoration, profile username editing, light/dark theme, and calculator/profile navigation.
- Personal own/opponent team collections: import from Showdown text or Pokepaste URL, create manually, edit, reorder, delete, filter, and inspect Pokemon sets and level-50/base stats.
- Popular teams: admin-gated writes by RLS, authenticated paginated search by name/source/included species, and per-species common-set summaries refreshed by a database trigger.
- Champions set validation and damage calculation using `@smogon/calc`; regular/mega forms and abilities, field controls, HP effects, and opponent-stat estimation from recorded damage.
- Calculator rosters from saved teams or individual Pokemon, common-set or deterministic defaults, in-session stat stages/current HP, local battle persistence, and mobile swipe navigation for lower panels.
- Unit/component tests and CI/deploy workflows are present. Shared checks now gate both CI and Pages with harness validation, frontend checks, current sign-in browser smoke, Edge Function typechecking and local database tests. The updated remote workflow has not been executed in this session.
- The feature list uses schema version 2 with required verification levels, identified execution runs, a result for every acceptance step, concrete next actions and authoritative session continuation. The harness checks generated handoff consistency; `npm run harness:report` shows counts, pending verification and the continuation point. AGENTS.md defines reopening/closing work and was reviewed without further editing in the continuity audit.

## Partial or pending

- AI recommendation groundwork (`suggest-team`, cache table, response schema) exists, but no feature calls it from the current app. The current function's fallback is an empty selection; it does not yet meet the intended deterministic recommendation contract. Do not advertise it as usable.
- The `import-pokepaste` Edge Function exists but the active import uses a browser fetch to Pokepaste `/raw`. Its behavior depends on Pokepaste being reachable from the browser.
- Email/password helpers and `validate-signup-email` remain in source although the sign-in screen is Google-only. API-level Google-only enforcement depends on disabling the Email provider in the Supabase project; code alone cannot verify that setting.
- Personal team reads page in 200-row batches but still load the full collection into the client. For larger accounts, server-side filtered pagination is the next scaling step. Popular search already uses bounded RPC pages.
- The production build succeeds but warns about two minified JavaScript chunks above 500 kB (about 3.2 MB and 3.4 MB before gzip). Measure first-load cost on mobile and split data/code where useful.
- E2E smoke now checks the current Google sign-in and intro controls on desktop/mobile. Signed-in calculator/profile navigation and mobile gesture coverage remain pending (`quality-001`); local mocks and viewport smoke do not prove these flows.
- A 24-assertion local pgTAP suite for Popular permissions/RPCs/common-set triggers is implemented, but Docker's Linux engine did not become available, so it has not been executed. `backend-001` and the harness's integration requirement remain `needs_verification`; do not treat the new suite or CI configuration as a database pass.
- `app-001` and `calc-006` retain local evidence but now require browser verification of their navigation/gesture behavior before returning to `passing`.
- Deployment configuration, OAuth redirect allowlist, remote migrations, actual popular-team contents, live performance, and external asset availability must be checked in their respective services. Repository state alone cannot establish them.

## Verification record

Historical report, 2026-10-06: `npm run typecheck`, lint, tests (34 files, 150 tests), and build were reported as passed, with large chunks. This original report has no source identifier and is retained as history, not current feature execution evidence. E2E and live service checks were not run in that earlier report.

Harness hardening verification, 2026-10-07: `2026-10-07-harness-local` in `feature_list.json` identifies the revision, source snapshot, pre-run changes and environment. Harness validation and its 14 regression tests, typecheck, lint, 150 Vitest tests, production build, 2 desktop/mobile Playwright smoke tests, and Deno checking of 5 Edge Function/shared files passed. Build size/dependency annotation warnings remain. The initial browser attempt failed before startup because of restricted-shell access; the rerun outside that sandbox passed. `2026-10-07-harness-backend-unavailable` records that `npm run test:db` failed before SQL execution because local Postgres was unavailable. SQL assertions, remote Actions and hosted OAuth/Supabase checks are not claimed as passed. See [Verification](docs/verification.md) and [Session handoff](session-handoff.md).

Continuity audit verification, 2026-10-07: `2026-10-07-continuity-local` records the repaired source snapshot and passed harness validation, 26 Node regression tests, typecheck, lint, all 34 Vitest files/150 tests with `--maxWorkers=2`, production build and progress reporting. The schema now rejects missing acceptance-step evidence, unfinished work without a next action and stale handoffs. Duplicate affected paths were removed. AGENTS.md was reviewed without editing it; optional clarifications are in docs/verification.md. The default-concurrency run failed 2 UI tests; the full two-worker rerun passed without application/test-source changes. Restricted-shell startup failures and the repaired harness lint errors are preserved in separate identified runs. An earlier development fixture failed 5/25 harness tests before its missing linked feature file was added; that attempt has no exact pre-run snapshot and is troubleshooting history only. CI concurrency sensitivity remains unverified. Database, browser and function checks were not rerun in this audit; the existing database requirement keeps `harness-001` in `needs_verification`. No app, migration, function or workflow source was changed in this audit.

## Next useful steps

1. Start a working Docker Linux engine, run the local database suite, and record the actual result to finish the harness integration requirement. Verify the shared workflow in GitHub Actions when the user chooses to push; no push has been performed.
2. Add signed-in calculator/profile and mobile interaction flows against a controlled Supabase test environment.
3. Move personal team filtering/pagination server-side if library size or response time warrants it.
4. Decide whether to complete or remove the dormant AI recommendation and legacy email/Pokepaste function paths; preserve the Edge Function security boundary if completing them.
