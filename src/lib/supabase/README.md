# Browser Supabase adapter

`client.ts` creates a browser client from the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never place service-role or Gemini secrets in this directory.

- `auth.ts`: Google OAuth, session-to-profile mapping, username update and sign-out. Legacy password helpers remain in source but are not used by the visible sign-in screen. Actual Google-only enforcement depends on hosted Supabase provider settings.
- `teams.ts`: personal `teams` rows and `team_collections` membership. An own save writes both own and opponent membership. Reads request 200 rows at a time but still assemble the whole personal library in the client; do not mistake this for server-side filtered pagination.
- `popular-teams.ts`: bounded 20-team pages and server RPC filters/suggestions. `canManagePopularTeams()` controls UI affordances; Postgres RLS is the write authority. `popular-common-sets.ts` fetches one materialized species default.
- `database.types.ts`: browser query/RPC contracts; keep it aligned with additive SQL migrations. `service-error.ts` translates common service failures for UI display.

Some helpers have local-storage fallbacks when Supabase is absent, but the app cannot authenticate in that state: it is not an offline mode. Unit tests mock the service; test Auth/RLS changes against a configured Supabase environment before claiming live security behavior.
