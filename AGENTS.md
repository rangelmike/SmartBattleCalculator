# Project Instructions

This repository is the handoff between coding sessions. Keep decisions, current state, and verification recoverable from files, not chat history. Prefer a small, accurate map over a large feature inventory.

## Project Overview

Smart Battle Calculator is a React/TypeScript Pokemon Champions damage calculator. GitHub Pages serves the static UI; Supabase provides Google Auth, Postgres, RLS, and Edge Functions. Start at `README.md`; read `docs/architecture.md` for the system map and `PROGRESS.md` for current work and known gaps. Read a module's nearby README only when working there.

## Startup Workflow

1. Read `PROGRESS.md`, check `git status --short`, and inspect the latest request. Existing changes belong to the user unless proven otherwise; do not reset them.
2. Follow `README.md` for setup and checks. Read the relevant module README and source/tests before deciding where to edit. If status docs conflict with code, verify the code and repair the stale claim.
3. Pick the smallest coherent task requested by the user. Do not start unrelated backlog work merely because `PROGRESS.md` lists it. Note any baseline failure before changing code.

## Working Rules

- Do not compile `.cpp` files in any way unless the user explicitly overrides this global preference.
- Do not modify `AGENTS.md` unless the user explicitly requests it. Keep this file short; place module-specific decisions near their code.
- Keep user-facing React in `src/features/*`, shared Pokemon rules in `src/lib/pokemon/*`, and browser Supabase access in `src/lib/supabase/*`. Prefer existing patterns and `@smogon/calc`, `@pkmn/dex`, and `@pkmn/sets` over new battle engines.
- Keep Gemini, Google client secrets, and Supabase service-role credentials out of browser code and `VITE_` variables. RLS, not UI visibility, authorizes database writes. Keep migrations additive; never weaken RLS to fix frontend behavior.
- For AI work, pass compact pre-scored matchup summaries, validate responses, and make the deterministic fallback useful without Gemini. Aim under 20 seconds with a 15-second server timeout. AI recommendations are not currently a shipped UI feature.
- Add or update focused tests for parser, damage, recommendation, and Auth-sensitive changes. Keep changes scoped; do not overwrite unrelated work or commit/push unless requested.

## Required Artifacts

- Code behavior change: implementation, relevant tests, and an update to the affected module README only if its contract or constraints changed.
- Schema/API change: additive migration, matching client types/contracts, and a real RLS/integration check when possible. Record any unverified external step explicitly.
- Multi-session or unfinished work: update the short `PROGRESS.md` handoff with exact state, verification, blocker, and next action. Do not create an exhaustive `feature_list.json` for already-shipped behavior; use a task-specific plan only when it helps.

## Definition Of Done

- The requested behavior is complete within scope; run `npm run typecheck` and relevant tests when dependencies are installed. Use lint/build and browser or Supabase integration checks when the change crosses those boundaries.
- Review the diff and runtime evidence. Passing mocked tests does not prove hosted OAuth, RLS, or deployment. Record checks that could not run and why.
- Leave a clean handoff: update `PROGRESS.md` for material changes or incomplete work, name unresolved risks and the next action, and avoid claiming a remote state that was not checked. Keep the startup path in `README.md` usable.
