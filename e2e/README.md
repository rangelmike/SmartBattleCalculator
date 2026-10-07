# Browser tests

`smoke.spec.ts` is the current Playwright suite. `playwright.config.ts` starts Vite on `http://127.0.0.1:5173` and runs desktop Chromium plus a Pixel 7 viewport. Install browser binaries with `npx playwright install chromium` before `npm run test:e2e`.

The smoke test checks the current Google-only sign-in screen and expanding/collapsing its introduction, on desktop and mobile. It runs in shared CI checks before Pages deployment. It does not click Google OAuth or prove signed-in navigation, calculator interactions, mobile gestures, or database permissions. Those remain `quality-001`; add isolated signed-in coverage against a dedicated test Supabase project/account. Never use production data in test fixtures. The Vite server uses an explicit strict port to avoid accidentally checking another origin.
