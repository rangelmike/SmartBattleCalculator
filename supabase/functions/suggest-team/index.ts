import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { jsonResponse, corsHeaders } from "../_shared/cors.ts";

type SuggestRequest = {
  format?: string;
  ownTeamHash: string;
  opponentTeamHash: string;
  matchupSummary: unknown;
};

const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SuggestRequest;
  const format = body.format ?? "vgc";

  const { data: cached } = await serviceClient
    .from("ai_recommendation_cache")
    .select("response_json")
    .eq("format", format)
    .eq("own_team_hash", body.ownTeamHash)
    .eq("opponent_team_hash", body.opponentTeamHash)
    .eq("model", model)
    .maybeSingle();

  if (cached?.response_json) {
    return jsonResponse({ source: "cache", suggestion: cached.response_json });
  }

  const suggestion = await askGemini(body.matchupSummary).catch(() => fallbackSuggestion());

  await serviceClient.from("ai_recommendation_cache").insert({
    format,
    own_team_hash: body.ownTeamHash,
    opponent_team_hash: body.opponentTeamHash,
    model,
    response_json: suggestion
  });

  return jsonResponse({ source: suggestion.fallbackUsed ? "fallback" : "gemini", suggestion });
});

async function askGemini(matchupSummary: unknown) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fallbackSuggestion();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  "Eres un asistente VGC. Devuelve solo JSON valido. Elige exactamente 4 Pokemon, " +
                  "ordena leads/uso y explica de forma breve. No inventes Pokemon fuera del resumen."
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    task: "select_four_pokemon_under_20_seconds",
                    matchupSummary,
                    schema: {
                      selectedPokemon: ["string", "string", "string", "string"],
                      leadOrder: ["string"],
                      confidence: "number 0..1",
                      reasons: ["string"],
                      risks: ["string"],
                      fallbackUsed: false
                    }
                  })
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      }
    );

    if (!response.ok) return fallbackSuggestion();

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallbackSuggestion();

    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackSuggestion() {
  return {
    selectedPokemon: [],
    leadOrder: [],
    confidence: 0,
    reasons: ["No se pudo obtener respuesta de IA; usa la heuristica local."],
    risks: [],
    fallbackUsed: true
  };
}
