# Setup Guide

## Accounts to create

1. GitHub repository.
2. Supabase project.
3. Google AI Studio API key for Gemini.
4. GitHub Pages enabled for the repository.

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

4. Push schema:

   ```bash
   supabase db push
   ```

5. Add secrets:

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

Keep the repo connected to Codex. The project `AGENTS.md` explains the architecture and guardrails
so future tasks follow the same structure.
