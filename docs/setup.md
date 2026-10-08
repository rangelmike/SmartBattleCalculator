# Setup Guide

## Local development

Use Node.js 22, `npm ci`, and `npm run dev`. Copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell), then set the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values from a Supabase project. Google OAuth must allow the exact Vite URL printed by the dev server. Without Supabase, the signed-out screen can render but sign-in will not work.

The Supabase CLI and Docker are needed only to run the database/Edge Functions locally. `supabase start` starts the local stack; `supabase db reset` recreates its local database, so do not use it against data you need to keep. A Google AI Studio key is only relevant to the currently unconnected `suggest-team` Edge Function; the active calculator does not require Gemini.

## Supabase

1. Install Supabase CLI.
2. Log in:

   ```bash
   supabase login
   ```

3. Link the remote project:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Review the additive migrations in `supabase/migrations`, then push schema to the intended linked project:

   ```bash
   supabase db push
   ```

5. Only if deploying `suggest-team`, add its secrets:

   ```bash
   supabase secrets set GEMINI_API_KEY=your_key GEMINI_MODEL=gemini-3.1-flash-lite
   ```

## Google-only authentication

1. In Google Auth Platform, create a Web OAuth client. Use `https://rangelmike.github.io` as the production JavaScript origin and copy the callback URL shown by Supabase's Google provider page into Google's authorized redirect URIs.
2. In the hosted Supabase project, enable **Authentication > Sign In / Providers > Google** and enter the Google client ID and secret there. Never place the secret in a `VITE_` variable or this repository.
3. In **Authentication > URL Configuration**, set the Site URL and an exact Redirect URL to `https://rangelmike.github.io/SmartBattleCalculator/`. Add the exact local development URL only while testing locally. The app redirects to its Vite base path after Google sign-in.
4. Verify an existing account signs in through Google with the **same Supabase user ID** and can still see its saved teams. Verify the designated administrator can still manage Popular teams; its database policy requires the confirmed email and the matching user ID.
5. To enforce Google-only access at the API level, disable the **Email** sign-in provider in Supabase after Google has been verified. Do not turn off the project-wide **Allow new users to sign up** setting, since new Google users still need to be created. Existing sessions may remain valid until they expire or are revoked.
6. The `validate-signup-email` Edge Function is no longer called by the app. Remove its deployed instance after confirming no other client depends on it. No SMTP server is required for the active Google-only sign-in flow.

## GitHub Pages

1. In the GitHub repository, open **Settings > Pages** and select **GitHub Actions** as the build and deployment source.
2. Open **Settings > Secrets and variables > Actions > Variables** and create these repository variables:
   - `VITE_SUPABASE_URL`: your Supabase Project URL;
   - `VITE_SUPABASE_ANON_KEY`: your Supabase publishable/anon key.
3. Push to `main`, or run **Actions > Deploy to GitHub Pages > Run workflow**. The workflow checks types and tests, builds with `GITHUB_PAGES=true`, and publishes `dist`.
4. Check the deployment at `https://rangelmike.github.io/SmartBattleCalculator/`. If you rename the repository or use a custom domain, update the `base` setting in `vite.config.ts`.
5. In Supabase **Authentication > URL Configuration**, set **Site URL** to `https://rangelmike.github.io/SmartBattleCalculator/` and add that URL and `http://localhost:5173/` to **Redirect URLs**. Add other origins only if you actually use them.

The two `VITE_` values are public browser configuration, not server secrets. Keep `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` out of GitHub Pages variables and the frontend. GitHub Pages hosts only static files; Supabase hosts Auth, the database, and Edge Functions.

The repository cannot verify hosted OAuth provider settings, applied remote migrations, or live RLS behavior. Use a separate test project for integration checks and record their outcome in [progress](../PROGRESS.md).
