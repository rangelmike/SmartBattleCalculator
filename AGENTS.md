# Project Instructions

This repository is designed for long-running coding-agent work. Optimize for a correct, understandable handoff, not raw code output. Leave the next session able to continue without guessing what changed, what was verified, or what remains uncertain.

## Project Overview

- Smart Battle Calculator is a TypeScript/React/Vite web app for Pokemon Champions damage calculations, profiles, and saved personal and Popular teams. GitHub Pages serves the static frontend; Supabase provides Auth, data, RLS, RPCs, and Edge Functions.
- Start with `README.md` for the repository map, `docs/architecture.md` for ownership and trust boundaries, `docs/setup.md` for local/remote setup, `docs/verification.md` for checks, and `PROGRESS.md` for current status. Read the nearby module README before changing that module.
- The active UI is Google sign-in, team management, and the calculator. AI recommendation code exists but is not a shipped UI flow; check `PROGRESS.md` before treating groundwork as complete.

## Startup Workflow

1. Read this file and the task's relevant docs and code. Check `git status --short` before editing; preserve unrelated or pre-existing changes.
2. Read `session-handoff.md` and `feature_list.json`. Resume the active feature when it fits the user's request. For autonomous backlog work, choose the highest-priority unblocked unfinished feature (lower numbers first). The user's latest request takes precedence; do not silently switch to an unrelated backlog item.
3. Identify the smallest affected modules, their contracts, and nearby tests. Trace behavior across UI, Pokemon logic, Supabase client, and SQL when a change crosses those boundaries.
4. Confirm the requested scope and acceptance behavior from the user's latest message. If an external setting or live service is required, distinguish what the repository can verify from what needs a configured environment.
5. Record significant discoveries or changed assumptions in the relevant module documentation or `PROGRESS.md`, unless the user explicitly limits which files may be edited.

## Working Rules

- Do not modify `AGENTS.md` unless the user explicitly requests a change to `AGENTS.md`. Ordinary feature work is not permission to edit it.
- Keep the app TypeScript-first. Put user-facing React code under `src/features/*`, shared Pokemon mechanics under `src/lib/pokemon/*`, and Supabase access under `src/lib/supabase/*`. Follow existing patterns and keep changes scoped.
- Prefer `@smogon/calc`, `@pkmn/dex`, and `@pkmn/sets` for battle calculations, data, and paste parsing. Validate Champions sets at the domain boundary rather than only in UI controls.
- Never expose Gemini, Google OAuth client secrets, or Supabase service-role credentials in browser code or `VITE_` variables. Keep Gemini and service-role calls inside Supabase Edge Functions. Treat RLS as the authorization boundary; a hidden button or client email check is not permission control.
- Keep SQL migrations additive and explicit. Do not weaken RLS to make frontend work easier. Update client types and tests when database contracts change.
- For AI suggestions, send compact, already-scored matchup summaries. A useful deterministic heuristic must work without Gemini. Target a response under 20 seconds, with a 15-second server-side timeout.
- Add or update focused tests for parser, damage, recommendation, and Auth-sensitive changes. Scale additional coverage to the risk of the change. Do not silently change behavior to satisfy a test without checking the domain rule.
- Do not overwrite unrelated work, reset the worktree, or commit/push unless the user requests it. Keep secrets, user data, and database dumps out of the repository.

## Feature List Rules

- Feature list file: `feature_list.json`.
- Only one feature active at a time.
- Before implementation, add or update the feature's observable acceptance steps in `verification`, affected paths in `related_files`, and `required_checks` (`local`, `browser`, `functions`, `integration`, or `hosted`). Mark it `in_progress`. Small fixes may reuse the relevant feature ID; do not create a new feature for every file edit.
- Reopen a `passing` feature when changing its behavior, contract, dependencies, or verification requirements. Set affected check results to `pending`; preserve earlier runs as history. Unaffected features keep their state.
- `needs_verification` means implementation exists but a required check is still pending or failed. Use `blocked` only with a concrete blocker and next action in `notes` and the handoff. Neither state counts as passing or as a second active feature.
- Mark `passing` only when every required level has a passed result linked to a structured `verification_runs` entry and every acceptance step has been checked. Test-file descriptions alone are not execution evidence. Browser mocks do not verify live OAuth or database RLS.
- Record executed commands, results, environment, timestamp, Git revision, pre-run worktree changes, and source snapshot as described in `docs/verification.md`. Record failures and skipped checks honestly; never manufacture evidence or lower acceptance criteria just to obtain a pass.
- Run `npm run harness:check` before handoff. It validates the records and references, not the truth of test results or the completeness of test coverage.

## Required Artifacts

- Behavior changes: implementation plus relevant tests. Update the nearby module README or architecture docs when a contract, ownership boundary, setup step, or operational rule changes.
- Database changes: an additive migration, matching `src/lib/supabase` contract/type updates, and verification of RLS-sensitive behavior in an appropriate environment.
- Meaningful status changes or newly discovered gaps: update `PROGRESS.md` with what is implemented, what remains, and the dated verification result. Do not present unverified remote deployment or OAuth settings as facts.
- `feature_list.json`: source of truth for feature state
- Handoff: update `session-handoff.md` at the end of a work session, including incomplete or interrupted work. Record the feature ID/state, changed files, verification run IDs/results, blockers, and the exact next step. Keep `PROGRESS.md` as the project summary and `feature_list.json` as the authoritative feature state. Do not create or edit extra artifacts when the user explicitly restricts file scope; provide the same handoff in chat and identify the deferred record updates.

## Definition Of Done

- The requested behavior or documentation is complete within the agreed scope, with no known required step left half-finished.
- Run at least `npm run harness:check`, `npm run typecheck`, and the most relevant tests when dependencies are installed. For broader changes, run `npm run lint` and `npm run build`. Browser interaction/layout changes require appropriate Playwright or documented browser checks; Edge Function changes require `npm run check:functions` plus relevant behavior tests; SQL/RLS/trigger changes require `npm run test:db` on the local test database plus matching client tests. Hosted configuration changes require explicit hosted evidence. If a required check cannot run, retain an unfinished state and record why.
- Review the diff for accidental edits, secrets, stale claims, and broken references. Ensure documentation and `PROGRESS.md` reflect material changes unless the user's scope forbids touching them.
- Give a concise, truthful handoff: what changed, how it was verified, and what remains unverified. Never equate a passing local test with a verified hosted service.
