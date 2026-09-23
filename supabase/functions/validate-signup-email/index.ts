import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { isValidEmailAddress, normalizeEmail } from "../../../src/lib/supabase/email-validation.ts";
import { canReceiveEmail } from "./domain-check.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  try {
    const payload = await request.json() as { email?: unknown };
    const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
    if (!isValidEmailAddress(email)) return jsonResponse({ valid: false });
    return jsonResponse({ valid: await canReceiveEmail(email.split("@")[1]) });
  } catch {
    return jsonResponse({ error: "Email domain verification is temporarily unavailable" }, { status: 503 });
  }
});
