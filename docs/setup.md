# Setup Guide

## Accounts to create

1. GitHub repository.
2. Supabase project.
3. Google AI Studio API key for Gemini.
4. Cloudflare Pages project connected to GitHub.

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

## Cloudflare Pages

- Framework preset: Vite.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Add only public frontend env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## GitHub

Keep the repo connected to Codex. The project `AGENTS.md` explains the architecture and guardrails
so future tasks follow the same structure.
