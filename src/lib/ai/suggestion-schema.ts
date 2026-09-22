import { z } from "zod";

export const aiSuggestionSchema = z.object({
  selectedPokemon: z.array(z.string()).length(4),
  leadOrder: z.array(z.string()).min(1).max(4),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).min(1).max(6),
  risks: z.array(z.string()).max(4),
  fallbackUsed: z.boolean().default(false)
});

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
