# Smart Battle Calculator

Calculadora web de dano Pokemon orientada a VGC con perfiles, equipos importados desde
Pokepaste/Showdown y sugerencias rapidas con IA.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind, shadcn/ui, lucide-react.
- Datos Pokemon y dano: `@pkmn/dex`, `@pkmn/sets`, `@smogon/calc`.
- Backend, auth y base de datos: Supabase.
- IA: Gemini API desde Supabase Edge Functions.
- Hosting recomendado: Cloudflare Pages.
- Calidad: ESLint, Prettier, Vitest, Playwright.

## Primer setup local

1. Copia variables:

   ```bash
   cp .env.example .env.local
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Corre la app:

   ```bash
   npm run dev
   ```

4. Cuando tengas Supabase CLI:

   ```bash
   supabase start
   supabase db reset
   ```

## Variables necesarias

- `VITE_SUPABASE_URL`: URL publica del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: anon key publica de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: solo servidor/Edge Functions, nunca frontend.
- `GEMINI_API_KEY`: solo Supabase Edge Functions.
- `GEMINI_MODEL`: recomendado `gemini-3.1-flash-lite` para sugerencias rapidas.

## Scripts

- `npm run dev`: desarrollo local.
- `npm run build`: typecheck y build.
- `npm run lint`: ESLint.
- `npm run test`: unit tests.
- `npm run test:e2e`: Playwright.
- `npm run supabase:functions:serve`: Edge Functions locales.

Lee [docs/architecture.md](./docs/architecture.md) antes de implementar features grandes.
