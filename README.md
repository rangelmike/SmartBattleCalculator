# Smart Battle Calculator

A Pokemon Champions damage calculator with Google sign-in, saved own/opponent teams, a searchable Popular teams catalog, and opponent-set estimates from observed damage. React/TypeScript runs in the browser; Supabase handles Auth and data. The Gemini recommendation scaffold is **not** connected to the current UI.

## Run locally

Use Node.js 22 and npm. In PowerShell, from the repository root:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

On macOS/Linux, use `cp .env.example .env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` before signing in. The app needs a Supabase project with Google OAuth and the exact local redirect URL allowed; Vite prints the local URL (normally `http://localhost:5173/`). Without Supabase configuration the sign-in screen loads, but no account can enter the app. See [setup](docs/setup.md) for remote setup and deployment; never expose service-role or Gemini keys as `VITE_` variables.

## Verify

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

For a focused change, run `npm run test -- <test-file>` as well as typecheck. `npm run test:e2e` uses Playwright and starts Vite, but its current smoke assertion is stale; see [progress](PROGRESS.md) before relying on it. Mocked tests do not verify live Google OAuth or database RLS.

## Find your way

- [Architecture](docs/architecture.md): boundaries, flows, data model, and deployment.
- [UI](src/features/README.md): Auth, navigation, profile/team editor, calculator.
- [Pokemon mechanics](src/lib/pokemon/README.md): parsing, Champions validation, damage, temporary battle state.
- [Supabase client](src/lib/supabase/README.md) and [backend](supabase/README.md): Auth, collections, RLS, RPCs, migrations, Edge Functions.
- [Progress](PROGRESS.md): verified state, known gaps, and next actions. [Operations](docs/operations.md): service limits and failure response.

`AGENTS.md` is the short working contract for coding agents. Keep durable design knowledge near the relevant code; update progress only when the state materially changes.
