# Verification

Run commands from the repository root after `npm ci`. Node.js 22 matches the GitHub Actions workflows. Unit/component tests use Vitest and jsdom; E2E uses Playwright and a Vite server.

| Command                                                   | What it checks                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                       | TypeScript project build without publishing.                                                                                                                   |
| `npm run lint`                                            | ESLint across the repository.                                                                                                                                  |
| `npm run test`                                            | All Vitest parser, domain, persistence, and React component tests.                                                                                             |
| `npm run build`                                           | Typecheck plus Vite production bundle.                                                                                                                         |
| `npm run format:check`                                    | Prettier formatting; use if enforcing formatting for a change.                                                                                                 |
| `npm run harness:check`                                   | Feature schema, unique IDs, one active feature, required evidence, existing affected paths, and local documentation links. Does not execute application tests. |
| `npm run harness:test`                                    | Regression tests for invalid states, missing/skipped/failed evidence, paths, links, and snapshot identification.                                               |
| `npm run harness:snapshot`                                | Read-only Git revision, current worktree changes, and SHA-256 source/config identifier for recording a run.                                                    |
| `npm run harness:report`                                  | Validates records, then reports feature counts, continuation, acceptance progress, missing required checks and next actions. Does not run tests.               |
| `npm run --silent harness:handoff`                        | Prints the handoff generated from `feature_list.json`; save this output as `session-handoff.md` after updating continuation. Does not modify files.            |
| `npx playwright install chromium` then `npm run test:e2e` | Current Google sign-in/intro interactions in desktop and mobile Chromium. No real Google sign-in or signed-in flows yet.                                       |
| `npm run check:functions`                                 | Deno typechecking of every Edge Function TypeScript file, including shared helpers; not runtime or integration proof.                                          |
| `npm run test:db`                                         | pgTAP permissions, RPC and common-set trigger tests against the running local database only. Requires Supabase CLI and Docker.                                 |

For a narrow change, run its focused `npm run test -- <path>` plus `npm run typecheck` and `npm run harness:check`; for parser, damage, recommendation, or Auth-sensitive changes, add or update tests and run the full relevant suite. For broader changes, run lint and build too. Add browser checks for changed interactions/layout, function checks plus focused behavior tests for Edge Functions, and local database/client tests for SQL/RLS changes. A missing prerequisite is a pending required check, not a pass.

CI and Pages both call `.github/workflows/checks.yml`: the frontend job uses `npm ci`, validates/tests the harness, checks types/lint/unit tests/build, and runs desktop/mobile smoke tests. The backend job checks all Edge Function types and runs migrations and pgTAP in a disposable local database. Pages depends on both jobs succeeding for the same revision, including manual deployments, then builds with production public configuration and the Pages base path. These gates do not certify hosted settings or all signed-in browser flows.

## Local backend checks

CI pins Deno 2.9.6 and Supabase CLI 2.120.0; use those versions for matching runs. No global install is needed for frontend work. With Docker running and a disposable local database, run:

```powershell
npm run check:functions
supabase db start
npm run test:db
supabase stop --no-backup
```

`db start` applies migrations when creating a fresh database. If reusing a local database after migration changes, review them and run `supabase db reset --local` only when its data can be discarded; then rerun the tests. Never pass `--linked` or a remote database URL for this suite. Test fixtures run in a transaction and roll back. The suite covers admin/non-admin/anonymous Popular access, creator identity, confirmation, RPC filters, and insert/update/delete refresh with unaffected species preserved. Extend it for each changed database contract; it is not exhaustive personal-team or concurrent-write coverage. Deno checking does not execute functions or invoke Gemini.

Official command references: [Supabase database tests](https://supabase.com/docs/guides/local-development/testing/overview) and [Deno check](https://docs.deno.com/runtime/reference/cli/check/).

## Evidence and continuation

Keep existing feature IDs and acceptance steps; add a feature before implementing new scoped behavior. `required_checks` specifies the levels needed to close it. `check_results` separates local, browser, function, database integration and hosted results. Implemented work with missing required checks is `needs_verification`. Only the current implementation task is `in_progress`; blocked work names its blocker and next action.

The record uses `schema_version: 2`. Every `verification` step has exactly one `acceptance_results` entry with its one-based `step`, verification `level`, `status`, and a concrete `summary`. A passed or failed entry references an actual `run_id` at that level; pending entries describe what has not been checked. A full test suite may satisfy a focused-test step when it actually includes those tests; say so in the summary rather than claiming the focused command was executed. `evidence` remains supporting prose, while `acceptance_results` maps each step to execution evidence. Passing requires every acceptance step and every required check to pass. A successful unrelated command at the same level is not sufficient evidence: the author/reviewer still checks that the recorded command and observations cover the step.

Every unfinished feature also has a concrete `next_action`. The top-level `continuation` records the session's `feature_id`, timezone-aware `updated_at`, scope/summary, `next_action`, blockers, changed paths, verification run IDs and context (environment limits, pre-existing changes, and deferred work). It must point to the active feature when one exists; otherwise it can retain the implemented feature awaiting verification. Its next action must agree with that feature. Use the calendar date of the timestamp's stated timezone for `last_updated`.

`session-handoff.md` is generated from this continuation record and the referenced feature's current state. Update the JSON first, regenerate the handoff, then run `npm run harness:check`. The validator rejects drift in state, next action, run references or handoff content. Do not maintain a second independent state in Markdown. For example, a UTF-8-safe regeneration from PowerShell is:

```powershell
node --input-type=module -e "import fs from 'node:fs'; import {renderHandoff} from './scripts/validate-harness.mjs'; fs.writeFileSync('session-handoff.md', renderHandoff(JSON.parse(fs.readFileSync('feature_list.json','utf8'))));"
npm run harness:check
npm run harness:report
```

Checkpoint continuation after meaningful discoveries, scope changes and before long checks, including when required checks are still pending. An interrupted session should leave an honest `in_progress` state and the next action needed to resume; it must not be marked passing just to close the session. At startup, read the handoff and run the report after dependencies are available. Follow the user's request and the saved continuation before using the priority-sorted backlog. Counts show scoped features, not effort completed or release readiness; optional hosted checks and the age/source of each referenced run still matter.

Before running checks, capture `npm run harness:snapshot`. Afterward, append a `verification_runs` entry in `feature_list.json` containing a unique run ID, actual timestamp with timezone, the captured revision/source snapshot/worktree, tool versions and environment, and each command's level/result/summary. Commands may include documented manual checks with their precise observed result. Link the feature's result to `run_id`; map its `evidence` to the acceptance behavior checked. Do not label checks that were never executed as passed. A run with a failed or skipped command at a level cannot support a passed result for that level; record a separate successful rerun.

The snapshot hashes executable source, tests, styles, schema and configuration under src/e2e/scripts/supabase/.github, plus root build/config/lock files. It normalizes CRLF to LF and excludes documentation, feature_list.json, environment files and generated build/test output, so saving evidence does not change its own identifier. Capture it again if executable files change during checks. It identifies the checkout, including uncommitted code; it does not prove tests ran. The validator also cannot establish whether acceptance assertions are sufficient or automatically decide which earlier features a change invalidates. Reopen affected features and rerun their relevant checks after behavior/contract/dependency changes; preserve old runs as history. Documentation-only edits need no reclassification of unrelated passing features.

Before ending or handing off, update feature state/results, the project summary in PROGRESS.md when materially changed, and session-handoff.md with changed paths, run IDs, blockers, and the exact next action. Keep secrets, tokens, user IDs and production fixtures out of evidence. A restricted file scope takes precedence: report deferred record updates in chat. No step authorizes committing, pushing or modifying hosted services.

## Harness audit, 2026-10-07

The existing AGENTS.md correctly defines ownership, startup order, one active feature, required verification, reopening, and the distinction between repository evidence and hosted services. This audit leaves it unchanged, as it requires an explicit request to edit that file. Its detailed evidence protocol is implemented here and in the validator. Suggested future additions to AGENTS.md are an explicit startup `harness:report`, a reference to generated handoffs/step-level acceptance results, and checkpoints before long operations. These are instruction clarifications, not approval prerequisites for ordinary authorized work.

The earlier validator accepted nonempty acceptance prose even when individual steps were unverified and checked only that the handoff file existed. Version 2 adds step-level execution references, resumable actions, authoritative continuation, handoff consistency, and a read-only report. Existing execution runs are retained without changing their timestamps or source identifiers. Local-only features keep their scoped historical test evidence; remaining browser/database/hosted steps are recorded as pending. Neither JSON structure nor a SHA-256 identifier proves that commands ran or that test assertions are adequate. Review evidence against the actual tests, and keep remote checks separate.

Manual checks still needed for a real release: Google redirect and session restoration, import from a live Pokepaste, personal and Popular team permissions with non-admin/admin accounts, calculator form/ability changes, mobile swipe, and Supabase RLS under authenticated users. Mocked frontend tests do not prove remote configuration or RLS policies. Use [Setup](setup.md) for environment requirements.
