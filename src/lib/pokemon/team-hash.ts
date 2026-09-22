import type { PokemonTeam } from "@/lib/pokemon/types";

export async function hashTeam(team: PokemonTeam) {
  const payload = JSON.stringify(team);
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
