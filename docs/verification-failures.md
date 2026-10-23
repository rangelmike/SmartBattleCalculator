# Verification failures

Keep a short record of failures and rerun evidence. An environment blocker is not a passing check. Do not include secrets or full session traces.

## 2026-10-08 — baseline verification gaps (resolved locally)

- Baseline: clean `main` at `a289ec2`. `npm run typecheck` passed on Node 24.21.0/npm 11.19.0; CI/documented runtime is Node 22.
- The smoke test expected the obsolete `your teams, ready` heading. No real backend/browser integration suite or unified verification command existed; the newly supplied agent instructions referenced absent verification documents.
- Supabase CLI inspection initially failed under the Windows sandbox while writing telemetry outside the workspace; the approved-shell rerun confirmed CLI 2.117.0. Docker is installed but its Linux engine was unavailable at initial inspection.
- Fix/rerun: implemented unified commands, real local database/browser checks and the shared CI/deployment gate. Docker's Linux engine was started. Complete `npm run verify:full` passed on Node 24.21.0/npm 11.19.0 with CLI 2.117.0: typecheck, lint, 150 tests, all four migrations, 57 SQL assertions, production build and four desktop/mobile browser cases. The isolated stack stopped with no backup; exit code 0. Hosted OAuth/deployment and the GitHub-hosted Node 22 workflow remain unverified locally; follow the external procedure before claiming release acceptance.

## 2026-10-08 — new verification harness lint (resolved)

- Command: `npm run verify`; typecheck passed, then lint correctly stopped the sequence.
- Cause: missing JS parameter/status-result types in the runner and an explicit throw in browser-test cleanup.
- Fix: added parameter types, validated CLI output with existing Zod, and used a cleanup assertion. The subsequent complete `npm run verify` passed typecheck, lint, all 150 unit/component tests, build and both browser smoke tests.

## 2026-10-08 — Windows sandbox prevents esbuild startup (resolved by approved shell)

- Command: second `npm run verify`, after passing typecheck/lint.
- Cause: esbuild cannot read parent directories to resolve `vitest.config.ts` in this sandbox (same baseline environment issue recorded in PROGRESS).
- Action: reran the complete command in an approved shell; no application/configuration workaround. `npm run verify` passed. The same approved shell is needed for full verification on this host.

## 2026-10-08 — component test timeouts under load (resolved)

- Command: approved-shell `npm run verify`; several component tests exceeded the existing 5-second timeout while the default worker pool and Docker startup ran concurrently.
- Fix: cap Vitest and Playwright at two workers to avoid oversubscribing this machine and CI. Assertions and existing test timeouts are unchanged.
- Focused rerun: 19/20 tests passed; the multi-switch team-panel test still took 6.25 seconds. Its repeated global accessibility-role queries scan large species/move dropdowns. Replaced field lookups with exact accessible labels and scoped sprite-button queries to the roster, preserving all assertions and the 5-second limit. The next focused run passed 2/2, with the multi-switch test taking 1.79 seconds; complete `npm run verify` then passed 150/150.

## 2026-10-08 — database-test SQL syntax (resolved)

- Command: `npm run verify:backend`; all four migrations applied, then 13 assertions passed before PostgreSQL rejected a nested data-modifying CTE. The command exited nonzero and cleaned up the isolated stack.
- Cause/fix: test code placed UPDATE/DELETE CTEs inside assertion arguments; moved those CTEs to the top level as PostgreSQL requires. No migrations or RLS policies changed. Complete `npm run verify:backend` then passed all four migrations and 57 SQL assertions and cleaned up the stack. The final complete `npm run verify:full` also passed with exit code 0.

## 2026-10-08 — focused formatting check (resolved)

- The focused Prettier check reported formatting differences in the runner, browser specs/config and verification guide.
- Fix: formatted only those five new/edited files. The complete focused Prettier command then passed; complete acceptance is tracked in the baseline entry.

## 2026-10-08 — signed-in browser selector (resolved)

- Command: `npm run verify:full`; typecheck, lint, 150 unit/component tests, 57 SQL assertions, build and both smoke tests passed. Both signed-in browser cases stopped at the Weather selector after successfully saving, reloading, editing and loading a real stored team. Cleanup completed and the command exited nonzero.
- Cause/fix: exact label matching included the select's option text; switched to its observed accessible combobox name. Added a 10-second action timeout for faster diagnostics. The complete `npm run verify:full` rerun passed all stages, including signed-in CRUD/calculator/sign-out on desktop (11.8 seconds) and mobile (13.5 seconds), four browser cases total. Cleanup succeeded and exit code was 0.

## 2026-10-22 — Champions sprite catalog mapping (resolved)

- Initial `npm run sprites:refresh` could not resolve Basculegion: the calculator's species objects do not expose National Dex numbers.
- Fix: resolve default-species numbers through `@pkmn/dex`, with explicit aliases for differing form names and verified cosmetic filenames. Complete refresh passed for all 359 supported species/forms against the live PokeAPI Champions WebP index, with no base-form fallback for missing forms.
- The sandbox could not resolve api.github.com; the public catalog refresh succeeded in the approved shell.
- `git diff --check` caught extra trailing blank lines in two edited files; removed them before final verification.

## 2026-10-22 — sprite refresh response validation (resolved in source)

- `npm run verify` passed typecheck, then stopped at lint because the sprite refresh script used an unvalidated JSON response.
- Fix: validate the public directory response with Zod before constructing the filename set. Complete rerun evidence follows in PROGRESS.

## 2026-10-22 — restricted-shell browser verification (rerun in progress)

- Complete `npm run verify` passed typecheck, lint, all 151 tests and production build, then made no progress after Playwright launched its preview server in the restricted Windows shell. Interrupted that stalled run; it is not a passing acceptance check.
- Action: rerun the complete `npm run verify:full` in the approved shell, including the signed-in calculator flow and disposable local backend. Results are recorded in PROGRESS.

## 2026-10-22 — local Docker engine unavailable

- `npm run verify:full` in the approved shell passed typecheck, lint and 151 tests, then Supabase start/cleanup failed because the Docker Desktop Linux engine named pipe was absent. `docker info` independently confirmed the engine was stopped.
- Action: start the installed Docker Desktop engine, then rerun the entire full command; this run is not a passing acceptance check.
- Rerun: starting Docker Desktop did not make its Linux engine available (no Docker process remained). A second complete `verify:full` again passed typecheck/lint/151 tests and stopped at the same Docker connection failure; full integration remains blocked. Run `npm run verify:full` once Docker Desktop's Linux engine is running. The approved-shell basic verification is tracked separately in PROGRESS.
- Final rerun: approved-shell `npm run verify` passed typecheck/lint/151 tests/build and both browser smoke cases (exit 0), resolving the generator lint and restricted-shell browser issues. Full integration remains blocked specifically by Docker as documented in this entry.

## 2026-10-22 — calculator nature regression selector (resolved in test)

- Focused `CalculatorTeamPanel.test.tsx` run failed because the new assertion expected `rowheader` semantics from the existing table's unscoped `<th>` elements. Nature values and raise/lower selectors were already synchronized.
- Fix: assert the exact visible stat arrow labels instead. Rerun the complete focused file before proceeding to the next small change; final verification evidence is in PROGRESS.

## 2026-10-22 — calculator adjustments full verification (Docker blocked)

- `npm run verify:full` in the approved Windows shell passed typecheck, lint and all 154 tests (34 files), then failed at disposable Supabase startup/cleanup because Docker Desktop's Linux engine pipe is absent. The independent `docker info` prerequisite check reported the same failure; this is the existing environment blocker.
- No application or test bypass was added. Full database/signed-in browser integration remains unverified; next action is `npm run verify:full` with a working Docker Linux engine. Basic verification is run separately and does not replace full acceptance.
- The focused nature selector rerun passed both panel tests after the test selector fix documented above.
- Final fallback evidence: complete approved-shell `npm run verify` passed typecheck/lint/154 tests/build and both desktop/mobile browser smoke cases (exit 0). Existing build warnings remain non-fatal. No full-integration success is claimed.
