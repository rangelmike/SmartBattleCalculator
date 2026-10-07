# Supabase backend

Supabase hosts Auth, Postgres/PostgREST, RPCs, and Edge Functions. GitHub Pages hosts only the built SPA. See [Setup](../docs/setup.md) for configuring a project and [Operations](../docs/operations.md) for service monitoring.

## Schema and permissions

Apply `migrations/` in timestamp order. `20260922000000_initial_schema.sql` creates profiles, personal teams, cache/usage tables and RLS; `...01000_team_collections.sql` adds own/opponent membership; `...02000_popular_teams.sql` adds Popular teams, bounded search/suggestion RPCs, and the verified designated-admin policy; `...03000_popular_pokemon_common_sets.sql` adds materialized common sets and a trigger that refreshes only affected species.

Only authenticated clients read Popular teams. Popular writes require both `is_popular_team_admin()` and matching `created_by` under RLS; the designated email condition is in SQL. Do not broaden grants or policies to make a client operation pass. Keep schema changes additive and update `src/lib/supabase/database.types.ts` when query contracts change. Migrations cannot verify the remote project's provider/redirect settings or whether they have been applied there.

## Functions

| Function                | Current role                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `import-pokepaste`      | Server-side raw Pokepaste fetch exists; active UI currently fetches `/raw` in the browser instead.            |
| `suggest-team`          | Authenticated Gemini/cache groundwork; no UI caller yet, and current fallback is not a useful recommendation. |
| `validate-signup-email` | Legacy email/password signup support; active Google-only UI does not call it.                                 |
| `_shared`               | CORS and JSON response helpers.                                                                               |

Never expose `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth client secret, or `GEMINI_API_KEY` to Vite/browser code. Supabase-provided service keys belong only in trusted Edge Functions. A future AI implementation must validate inputs/outputs, keep a 15-second server-side timeout, and retain a deterministic fallback.

Use `supabase db reset` only against an intended local instance; it recreates local data. Use `supabase db push` only after reviewing additive migrations and the linked project. RLS-sensitive behavior needs a real Supabase integration check, not just mocked unit tests.

`tests/database/permissions.test.sql` exercises Popular-team RLS, RPC filtering and common-set insert/update/delete refresh as admin, non-admin and anonymous roles, with transaction-local fixtures and rollback. Run `npm run test:db` against a disposable local database; it explicitly uses `--local`. Shared CI starts a fresh database, applies migrations and runs this suite before Pages may deploy. Run `npm run check:functions` for all Edge Function TypeScript files. Record actual backend results separately from mocked frontend results; hosted OAuth and remote migrations still require external verification. See [Verification](../docs/verification.md) for prerequisites and coverage limits.
