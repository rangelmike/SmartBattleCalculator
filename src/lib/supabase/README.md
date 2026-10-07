# Browser Supabase access

`client.ts` creates the public browser client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `auth.ts` handles OAuth/session/profile data; `teams.ts` handles personal `teams` and `team_collections`; `popular-teams.ts` and `popular-common-sets.ts` use authenticated tables/RPCs; `service-error.ts` maps service failures to UI messages. `database.types.ts` describes the relevant database rows.

## Rules

- This is a browser module: never import a service-role key or Gemini secret. Do not treat `canManagePopularTeams()` as authorization; SQL RLS is the authority.
- A personal own save creates both own and opponent collection entries. Team rows are loaded in 200-row pages but the library is still assembled client-side. Popular search pages are 20 rows, with server-side filters.
- `auth.ts` still exports legacy email/password helpers; the active `AuthPage` uses `signInWithGoogle()`. Supabase project provider settings determine whether legacy API sign-in is possible.
- When Supabase is not configured, some library helpers have local-storage fallbacks, but the app's session gate cannot sign in. Do not present this as a full offline mode.
- Schema/RLS changes belong in additive `supabase/migrations` files. Keep client types and RPC assumptions in sync with SQL.

Run `npm run test -- src/lib/supabase` and `npm run typecheck` for changes here. Auth and RLS-sensitive changes also need a configured integration check; unit mocks alone cannot prove database permissions.
