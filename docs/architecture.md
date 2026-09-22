# Architecture

## Goals

Build a free-first Pokemon VGC damage calculator with:

- fast manual damage calculations;
- profiles and saved teams;
- Pokepaste/Showdown import;
- AI suggestions that choose 4 Pokemon and lead order in under 20 seconds.

## Core principle

The app should not depend on AI for correctness. The deterministic engine parses teams,
normalizes Pokemon data, calculates matchup signals, and produces a fallback recommendation.
Gemini only turns that compact analysis into a final recommendation and explanation.

## Recommended directory ownership

```text
src/
  app/                    App shell and global providers
  components/             Shared UI components
  features/
    calculator/           Damage calculator screens and state
    teams/                Team library, import, editor
    ai-suggestions/       Matchup selector and recommendation UI
    auth/                 Login and profile flows
  lib/
    pokemon/              Parse, normalize, damage, matchup scoring
    supabase/             Supabase client and generated DB types
    ai/                   Shared schemas for Edge Function responses
  styles/                 Tailwind global CSS
supabase/
  migrations/             Database schema and RLS
  functions/              Server-only logic and external API calls
docs/                     Architecture and operating notes
```

## Data model

- `profiles`: one row per auth user.
- `teams`: saved teams, raw paste text, normalized JSON and stable hash.
- `ai_recommendation_cache`: cached Gemini/heuristic responses by team hash pair.
- `usage_events`: optional lightweight telemetry for imports and AI calls.

## AI flow

1. User selects own team and opponent team.
2. Client calls `suggest-team` Edge Function.
3. Function checks cache by `(format, own_team_hash, opponent_team_hash, model)`.
4. If cache misses, it computes or receives deterministic matchup summaries.
5. Gemini returns strict JSON matching `aiSuggestionSchema`.
6. Function validates JSON, stores cache, and returns it.
7. If Gemini times out or fails, return deterministic fallback with `fallbackUsed: true`.

## Deployment

- GitHub Pages:
  - `.github/workflows/deploy-pages.yml` builds with `npm run build` and publishes `dist` on pushes to `main`;
  - the Vite production base is `/SmartBattleCalculator/`, matching the repository's Pages URL;
  - GitHub Actions repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are embedded in the frontend build;
  - the browser uses hash navigation, so no server-side route fallback is needed.
- Supabase:
  - apply migrations;
  - configure the GitHub Pages URL for Auth redirects;
  - deploy Edge Functions and set their secrets: `GEMINI_API_KEY`, `GEMINI_MODEL`.

GitHub Pages serves static files only. Supabase handles authentication, data, and server-side AI calls.

## Security rules

- Browser uses only Supabase anon key.
- Service role key stays in Supabase Edge Functions or trusted scripts.
- RLS owns access control for user data.
- Public teams can be read by everyone; private teams only by owner.
- AI endpoints require authenticated users.

## Cost controls

- Cache AI results by team hashes.
- Keep prompts compact.
- Add per-user daily AI limits before public launch.
- Make deterministic fallback good enough for free-tier outages.
