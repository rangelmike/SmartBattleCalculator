import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: optionalEnvironmentValue(z.string().url()),
  VITE_SUPABASE_ANON_KEY: optionalEnvironmentValue(z.string())
});

export const clientEnv = clientEnvSchema.parse(import.meta.env);

function optionalEnvironmentValue<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}
