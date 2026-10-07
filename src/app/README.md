# App shell

`App.tsx` is the browser entry after `src/main.tsx`. It restores the Supabase session, shows `AuthPage` until signed in, and switches between `CalculatorPage` and `ProfilePage` using the URL hash. Theme preference is read from `src/lib/theme.ts`.

Keep global session, page, and theme state here. Put feature behavior in `src/features/*` and data access in `src/lib/*`; do not add direct Supabase queries or battle rules to the app shell. The `#calculator`/`#profile` navigation is intentional for GitHub Pages. Verify route/theme changes with navigation tests and `npm run typecheck`.
