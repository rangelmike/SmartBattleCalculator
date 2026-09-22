# Smart Battle Calculator

VGC-focused Pokemon damage calculator with profiles, teams imported from
Pokepaste/Showdown, and quick AI suggestions.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind, shadcn/ui, lucide-react.
- Pokemon data and damage: `@pkmn/dex`, `@pkmn/sets`, `@smogon/calc`.
- Backend, authentication, and database: Supabase.
- AI: Gemini API through Supabase Edge Functions.
- Recommended hosting: Cloudflare Pages.
- Quality: ESLint, Prettier, Vitest, Playwright.

## Local setup

1. Copy the environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. When Supabase CLI is available:

   ```bash
   supabase start
   supabase db reset
   ```

## Required variables

- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server/Edge Functions only, never the frontend.
- `GEMINI_API_KEY`: Supabase Edge Functions only.
- `GEMINI_MODEL`: `gemini-3.1-flash-lite` is recommended for quick suggestions.

## Scripts

- `npm run dev`: local development.
- `npm run build`: typecheck and build.
- `npm run lint`: ESLint.
- `npm run test`: unit tests.
- `npm run test:e2e`: Playwright.
- `npm run supabase:functions:serve`: local Edge Functions.

Read [docs/architecture.md](./docs/architecture.md) before implementing major features.
