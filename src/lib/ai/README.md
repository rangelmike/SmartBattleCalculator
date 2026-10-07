# AI contract (not yet exposed)

`suggestion-schema.ts` defines the intended Zod response for a four-Pokemon recommendation. There is no current UI call site for `suggest-team`; the schema is groundwork, not a released feature.

If implementing the feature, score matchup data deterministically first, send only compact summaries to the Edge Function, validate responses against this schema, and provide a useful local fallback without Gemini. Keep Gemini and service-role calls in Supabase Edge Functions. The current function's empty fallback does not satisfy that contract; see [Progress](../../../PROGRESS.md).
