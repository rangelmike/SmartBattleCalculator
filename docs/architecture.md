# Architecture

## System boundary

Smart Battle Calculator is a static React/TypeScript SPA built with Vite and deployed to GitHub Pages. A browser session uses Supabase Auth and PostgREST under RLS. Pokemon rules and damage calculation run in the browser; Supabase Edge Functions hold server-only integrations. No application server runs on GitHub Pages.

```text
Browser: src/app -> src/features -> src/lib/pokemon
                            |           |
                            +-> src/lib/supabase -> Supabase Auth/PostgREST/RPC
                                                     -> public tables + RLS + private triggers
Supabase Edge Functions: import-pokepaste, suggest-team, validate-signup-email
```

The currently active UI calls Supabase directly for teams and common sets and fetches Pokepaste `/raw` through `src/lib/pokemon/team-import.ts`. The `import-pokepaste` Edge Function exists but is not wired to that import flow. The `suggest-team` Edge Function and `src/lib/ai` schema are groundwork for a later recommendation UI, not a shipped calculator feature. `validate-signup-email` is legacy code from email/password signup; the visible sign-in is Google-only. See [Progress](../PROGRESS.md) for current gaps.

## Ownership

| Area | Responsibility | Details |
| --- | --- | --- |
| `src/app`, `src/features/navigation` | Session gate, theme, hash navigation | [App](../src/app/README.md), [navigation](../src/features/navigation/README.md) |
| `src/features/auth` | Google sign-in screen | [Auth](../src/features/auth/README.md) |
| `src/features/teams` | Profile, import/editor/viewer, local search UI | [Teams](../src/features/teams/README.md) |
| `src/features/calculator` | Battle workspace, controls, results, responsive panels | [Calculator](../src/features/calculator/README.md) |
| `src/lib/pokemon` | Domain types, Champions data and validation, sets, damage, estimates, session helpers | [Pokemon](../src/lib/pokemon/README.md) |
| `src/lib/supabase` | Browser client, Auth and storage queries | [Supabase client](../src/lib/supabase/README.md) |
| `src/lib/ai` | Suggested response shape only | [AI schema](../src/lib/ai/README.md) |
| `supabase` | Schema, RLS, RPCs, server-side functions | [Backend](../supabase/README.md) |

Shared presentation primitives belong under `src/components`; global CSS is in `src/styles/globals.css`. Keep user-facing feature state in `src/features/*`, reusable mechanics in `src/lib/pokemon/*`, and Supabase access in `src/lib/supabase/*`.

## Main flows

1. `src/app/App.tsx` restores a Supabase session, renders Google sign-in when absent, and navigates by hash between calculator and profile.
2. The profile imports Showdown text via `@pkmn/sets` or fetches a Pokepaste `/raw` URL, validates the resulting team against Champions rules, then saves personal teams to `teams` plus `team_collections`. An own-team save also creates an opponent collection entry. Editing persists member order in `team_json.members`.
3. Popular teams live in a separate table. Authenticated users can search them with bounded RPC pages; only the designated verified admin can write, enforced by database RLS. A trigger refreshes common-set rows for species affected by popular-team changes.
4. The calculator loads saved rosters or individual species. Individual sets use a popular common set when present and a deterministic Champions default otherwise. `@smogon/calc` generation 0 calculates damage at level 50; field effects, HP recovery/recoil, and observations feed the display and opponent estimation.
5. The per-user calculator session is stored in browser `localStorage`. Stat stages and current HP are in React memory and intentionally do not survive calculator exit or New battle; Reset stats clears them for the selected Pokemon. New battle clears opponent/field/observations but keeps My Team.

## Data and trust boundaries

- `profiles`: one profile per Auth user; `teams` holds personal set JSON, paste text, and hash; `team_collections` determines own/opponent membership.
- `popular_teams`: searchable global teams. `popular_pokemon_common_sets`: materialized species defaults maintained by a trigger. `ai_recommendation_cache` and `usage_events` exist in schema but are not part of the active UI flow.
- The browser receives only `VITE_SUPABASE_URL` and the public anon key. Database RLS is the authorization boundary; UI visibility is not authorization. The designated Popular teams admin condition is defined in SQL, not client-controlled settings.
- Gemini and the Supabase service-role key must remain in Edge Functions. Any future AI UI must send compact, scored matchup summaries and retain a deterministic fallback. The present `suggest-team` function is not wired to such a client flow.
- Keep migrations additive, preserve RLS, validate team data before writes, and test changes to parser, damage, recommendations, or Auth.

## Deployment and operations

`vite.config.ts` selects `/SmartBattleCalculator/` as the production base when `GITHUB_PAGES=true`. `.github/workflows/deploy-pages.yml` builds and publishes `dist` on `main`; Google OAuth redirects must point to the same base URL. See [Setup](setup.md), [Verification](verification.md), and [Operations](operations.md).
