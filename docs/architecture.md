# Architecture

## Boundaries

Smart Battle Calculator is a static React/TypeScript SPA built by Vite. `src/app/App.tsx` restores a Supabase session, renders `AuthPage` when signed out, and selects Calculator or Profile by URL hash. GitHub Pages serves only `dist`; Supabase supplies Auth, Postgres/PostgREST, RPCs, and optional Edge Functions.

| Layer                                       | Owns                                                          | Read when changing                                |
| ------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `src/features/*`                            | User-visible React workflows and state                        | [UI map](../src/features/README.md)               |
| `src/lib/pokemon/*`                         | Champions data, parsing, validation, stats, damage, estimates | [Pokemon contracts](../src/lib/pokemon/README.md) |
| `src/lib/supabase/*`                        | Browser Auth and database queries                             | [Client contracts](../src/lib/supabase/README.md) |
| `supabase/migrations`, `supabase/functions` | Schema, RLS, RPCs, server-side integrations                   | [Backend contracts](../supabase/README.md)        |

Put reusable mechanics below the UI, and keep service-role/Gemini calls out of the browser. `src/lib/ai/suggestion-schema.ts` and `supabase/functions/suggest-team` are groundwork only: there is no active recommendation screen or client call. The current Edge Function's empty fallback is not a completed deterministic recommendation.

## User flows

1. `src/features/auth/AuthPage.tsx` offers Google OAuth. `src/lib/supabase/auth.ts` restores the session and reads/updates `profiles`. Legacy email/password helpers remain in that module but are not exposed in the visible UI. Google-only enforcement at the API level depends on Supabase provider settings; the repository cannot prove remote configuration.
2. `src/features/teams/ProfilePage.tsx` imports Showdown text or fetches Pokepaste `/raw` in the browser, then uses `@pkmn/sets` and Champions validation before saving. Manual editing, ordering, searching, and viewing live in the same feature folder. `teams` stores personal team JSON/paste/hash; `team_collections` records own/opponent membership. Saving to own also adds an opponent membership.
3. `popular_teams` is separate from personal teams. Authenticated clients search it through bounded RPC pages. The database `is_popular_team_admin()` RLS policy, not React, controls writes by the verified designated account. A trigger refreshes `popular_pokemon_common_sets` only for species affected by a Popular team change; individual calculator picks read one common set or use a deterministic default.
4. `src/features/calculator/CalculatorWorkspace.tsx` loads teams or individual Pokemon. `@smogon/calc` generation 0 calculates level-50 Champions damage. Field, form/ability, stages, HP, recoil/healing, and recorded observations affect results and opponent estimates. Own damage is recorded as percent dealt; opponent damage as HP lost.
5. A per-user calculator session stores rosters, field, and durable observations in browser `localStorage`. Current HP and stat stages are temporary React state: they survive switching selected Pokemon but not calculator exit or New battle. Reset stats clears the selected Pokemon's temporary changes; New battle keeps My Team but clears opponent, field, and observations.

## Deployment and verification boundary

`vite.config.ts` uses `/SmartBattleCalculator/` when `GITHUB_PAGES=true`; hash navigation avoids server route rewrites. `.github/workflows/ci.yml` runs lint, tests, and build; `.github/workflows/deploy-pages.yml` builds and publishes `dist` from `main`. GitHub Actions injects only public `VITE_SUPABASE_*` values. Schema/RLS changes require additive migrations and a real database check; local mocked tests alone cannot establish hosted permissions. See [setup](setup.md) and [progress](../PROGRESS.md).
