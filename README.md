# Smart Battle Calculator

An English-language, Pokemon Champions/VGC-oriented damage calculator. Sign in with Google, import or build level-50 teams, inspect sets, and calculate matchups with field conditions and observed-damage estimates. My teams, Opponent teams, and a searchable Popular teams catalog are separate collections. The frontend is static; Supabase supplies Auth and persistence.

## Start here

| Question                               | Answer                                                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is this?                          | A React/TypeScript battle-preparation app using `@smogon/calc` for damage, `@pkmn/sets` for paste parsing, and Supabase for accounts and teams.                                                                       |
| How is it organized?                   | [Architecture](docs/architecture.md) maps UI, mechanics, persistence, database, and Edge Functions. Each active module has a nearby README.                                                                           |
| How do I run it?                       | Use the quick start below; [Setup](docs/setup.md) covers Supabase, Google OAuth, and deployment.                                                                                                                      |
| How do I verify it?                    | Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`; see [Verification](docs/verification.md).                                                                                               |
| Where are we now?                      | [Progress](PROGRESS.md) separates shipped behavior, partial work, and known gaps.                                                                                                                                     |
| What should the next session continue? | [Feature list](feature_list.json) owns task state, step-level evidence and continuation; [Session handoff](session-handoff.md) is generated from it. Run `npm run harness:report` to see progress and pending checks. |

## Quick start

Requires Node.js 22 and npm. For a signed-in app, also requires a configured Supabase project and Google OAuth. From the repository root:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` before trying to sign in. Vite prints the local URL (normally `http://localhost:5173/`). Without those values, the app builds but cannot authenticate. Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in a `VITE_` variable. The project uses `#calculator` and `#profile` navigation so static hosting works without route rewrites.

## Repository map

- [`src/app`](src/app/README.md): root session, theme, and navigation state.
- [`src/features`](src/features/README.md): user-facing Auth, calculator, profile/team library, and app shell.
- [`src/lib/pokemon`](src/lib/pokemon/README.md): Champions rules, parsing, validation, statistics, damage, and battle state.
- [`src/lib/supabase`](src/lib/supabase/README.md): browser Auth, personal teams, Popular teams, and common sets.
- [`src/lib/ai`](src/lib/ai/README.md): suggestion response schema; AI UI is not yet connected.
- [`src/lib`](src/lib/README.md), [`src/styles`](src/styles/README.md), [`src/test`](src/test/README.md): shared configuration, theme/styles, and unit-test setup.
- [`supabase`](supabase/README.md): additive SQL migrations, RLS, and Edge Functions.
- [`e2e`](e2e/README.md): Playwright smoke coverage.
- [`scripts`](scripts/README.md): harness validation, progress reporting, handoff/snapshot output, backend typechecking and sprite-map maintenance.
- [`docs/operations.md`](docs/operations.md): service limits, failure behavior, and owner actions.

Before changing code, read [`AGENTS.md`](AGENTS.md). It contains the project's ownership, security, and testing rules.
