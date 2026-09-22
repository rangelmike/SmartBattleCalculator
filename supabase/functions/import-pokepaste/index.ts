import { jsonResponse, corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };

  if (!url || !/^https:\/\/pokepast\.es\/[a-zA-Z0-9]+$/.test(url)) {
    return jsonResponse({ error: "Invalid Pokepaste URL" }, { status: 400 });
  }

  const response = await fetch(`${url}/raw`);

  if (!response.ok) {
    return jsonResponse({ error: "Could not fetch Pokepaste" }, { status: 502 });
  }

  const pasteText = await response.text();
  return jsonResponse({ pasteText });
});
