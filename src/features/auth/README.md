# Auth UI

`AuthPage.tsx` is the signed-out screen. It offers Google OAuth via `src/lib/supabase/auth.ts`, handles a canceled OAuth redirect, and shows a short feature overview. There is no visible email/password form.

Keep provider calls and session conversion in `src/lib/supabase`, not in the component. The OAuth return URL uses Vite's base path; changes must be checked against local and GitHub Pages redirect allowlists. Hiding email/password in the UI does not disable it in Supabase: configure the hosted Email provider separately. Verify with `npm run test -- src/features/auth/AuthPage.test.tsx` and an actual Google sign-in in a configured environment.
