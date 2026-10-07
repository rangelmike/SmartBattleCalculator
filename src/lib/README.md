# Shared library

This layer holds non-visual code consumed by features. [Pokemon](pokemon/README.md) owns battle mechanics, [Supabase](supabase/README.md) owns browser persistence/Auth access, and [AI](ai/README.md) currently defines only a future recommendation schema.

`env.ts` validates public Vite configuration; `theme.ts` stores the light/dark preference; `utils.ts` contains small shared helpers. Do not move feature UI state or direct DOM rendering into this layer. Keep server secrets out of any `src/` module, and place focused tests beside shared helpers.
