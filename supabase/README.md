# Supabase backend

The four timestamped files in `migrations/` are the schema history. They define `profiles`, personal `teams` and `team_collections`, `popular_teams`, `popular_pokemon_common_sets`, and the currently unused AI cache/usage tables. Apply new changes with additive migrations; update `src/lib/supabase/database.types.ts` when browser contracts change.

RLS limits personal writes to `auth.uid()`; `teams` also permits reads of rows explicitly marked `is_public`. Authenticated users can read Popular teams, while `is_popular_team_admin()` checks the designated account's verified email and ID for writes. Do not substitute a frontend email comparison or relax RLS. Popular search/suggestion RPCs return bounded results. A trigger updates common-set summaries only for species affected by an insert, edit, or delete.

`functions/import-pokepaste` exists but the current UI fetches Pokepaste `/raw` directly. `functions/validate-signup-email` is legacy; the visible UI signs in with Google. `functions/suggest-team` is unfinished groundwork: no UI caller, and its empty fallback is not a useful recommendation. Only Edge Functions may use Gemini or service-role credentials.

Before `supabase db push`, review the linked project and migration diff. `supabase db reset` recreates the local database and can destroy local test data. Frontend mocks do not prove remote RLS, triggers, OAuth provider settings, or deployed functions; verify those in a disposable Supabase project.

`tests/database/access.test.sql` checks actual RLS, RPCs and common-set triggers under separate database roles. `npm run verify:backend` runs it in an isolated disposable local stack; use `npm run verify:full` for acceptance including browser storage/calculator flows. See [verification](../docs/verification.md) for prerequisites and the external hosted check.
