# Project Instructions

## Global user preference

- Do not compile `.cpp` files in any way unless the user explicitly overrides this.

## Project shape

- Keep the app TypeScript-first.
- Put user-facing React code under `src/features/*`.
- Put shared Pokemon mechanics under `src/lib/pokemon/*`.
- Put Supabase access under `src/lib/supabase/*`.
- Keep Gemini and service-role calls inside Supabase Edge Functions, never in the browser.
- Prefer existing packages for battle logic: `@smogon/calc`, `@pkmn/dex`, and `@pkmn/sets`.

## Quality bar

- For parser, damage, recommendation, and auth-sensitive changes, add or update tests.
- Run at least `npm run typecheck` and the most relevant tests before finishing when dependencies are installed.
- Keep migrations additive and explicit. Do not weaken RLS policies to make frontend work easier.

## IA suggestions

- The LLM should receive compact, already-scored matchup summaries.
- The deterministic heuristic is the fallback and should work without Gemini.
- Target response time: under 20 seconds, with a 15 second server-side timeout.
