# Setup Guide

## Prerequisites

- Node.js 22 and npm (matching CI), plus a Supabase project and a Google OAuth Web client for signed-in flows.
- Supabase CLI and Docker only if running the database and Edge Functions locally. A remote Supabase project can be used instead.
- A Google AI Studio API key only if deliberately deploying the dormant `suggest-team` function; the active calculator does not require Gemini.

From the repository root on PowerShell:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

For macOS/Linux, copy with `cp .env.example .env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` to the URL and public anon/publishable key of the Supabase environment you intend to use. Vite normally serves `http://localhost:5173/`; use the URL it prints if the port changes, and allowlist that exact OAuth return URL. Without public Supabase configuration, the UI cannot sign in. Do not set real server secrets unless running the relevant local Edge Function, and never prefix them with `VITE_`.

## External accounts

1. GitHub repository.
2. Supabase project.
3. Google Auth Platform OAuth client.
4. GitHub Pages enabled for the repository when deploying.

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

5. Only when deploying `suggest-team`, add its secrets:

   ```bash
   supabase secrets set GEMINI_API_KEY=your_key GEMINI_MODEL=gemini-3.1-flash-lite
   ```

For a fully local database, run `supabase start` and then `supabase db reset` only against that local instance. Reset recreates local data. With a remote project, review migrations before `supabase db push`; use a separate test project for integration checks. The repository does not encode hosted Auth provider settings or prove remote migrations were applied. See [Backend](../supabase/README.md).

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
3. Push to `main`, or run **Actions > Deploy to GitHub Pages > Run workflow**. Both paths first run the shared harness/frontend/browser/backend quality checks. Only after they pass does the deployment build with `GITHUB_PAGES=true` and publish `dist`. See [Verification](verification.md) for exactly what these checks cover and what remains external.
4. Check the deployment at `https://rangelmike.github.io/SmartBattleCalculator/`. If you rename the repository or use a custom domain, update the `base` setting in `vite.config.ts`.
5. In Supabase **Authentication > URL Configuration**, set **Site URL** to `https://rangelmike.github.io/SmartBattleCalculator/` and add that URL and `http://localhost:5173/` to **Redirect URLs**. Add other origins only if you actually use them.

The two `VITE_` values are public browser configuration, not server secrets. Keep `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` out of GitHub Pages variables and the frontend. GitHub Pages hosts only static files; Supabase hosts Auth, the database, and Edge Functions.

For development and release checks, use [Verification](verification.md). For current implementation status, use [Progress](../PROGRESS.md).
