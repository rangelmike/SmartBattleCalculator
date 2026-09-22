import { assertValidChampionsTeam } from "@/lib/pokemon/champions-data";
import { getPokemonSuggestionContext, type TeamSearchFilters, type TeamSearchSuggestion } from "@/lib/pokemon/team-search";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import type { PopularTeamRow } from "@/lib/supabase/database.types";
import { supabase } from "@/lib/supabase/client";

export const popularTeamPageSize = 20;

export async function canManagePopularTeams() {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("is_popular_team_admin");
  if (error) throw error;
  return data === true;
}

export async function searchPopularTeams(filters: TeamSearchFilters, offset = 0) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("search_popular_teams", {
    p_text: filters.text.trim(),
    p_pokemon: filters.pokemon.split(",").map((value) => value.trim()).filter(Boolean),
    p_limit: popularTeamPageSize + 1,
    p_offset: Math.max(0, offset)
  });
  if (error) throw error;
  const rows = data ?? [];
  return {
    teams: rows.slice(0, popularTeamPageSize).map(rowToSavedTeam),
    hasMore: rows.length > popularTeamPageSize
  };
}

export async function suggestPopularSources(prefix: string): Promise<TeamSearchSuggestion[]> {
  return suggestPopularTeams("source", prefix, []);
}

export async function suggestPopularPokemon(query: string, caret: number): Promise<TeamSearchSuggestion[]> {
  const { prefix, excluded } = getPokemonSuggestionContext(query, caret);
  return suggestPopularTeams("pokemon", prefix, excluded);
}

export async function createPopularTeam(team: SavedTeam) {
  const client = requireSupabase();
  await assertValidChampionsTeam(team.team);
  const { error } = await client.from("popular_teams").insert({
    id: team.id,
    created_by: team.ownerId,
    name: team.name,
    source: team.source,
    format: team.team.format,
    paste_url: team.pasteUrl ?? null,
    paste_text: team.pasteText,
    team_json: team.team,
    team_hash: team.teamHash,
    species_names: team.team.members.map((member) => member.species)
  });
  if (error) throw error;
}

export async function updatePopularTeam(team: SavedTeam) {
  const client = requireSupabase();
  await assertValidChampionsTeam(team.team);
  const { data, error } = await client.from("popular_teams").update({
    name: team.name,
    source: team.source,
    format: team.team.format,
    paste_url: team.pasteUrl ?? null,
    paste_text: team.pasteText,
    team_json: team.team,
    team_hash: team.teamHash,
    species_names: team.team.members.map((member) => member.species)
  }).eq("id", team.id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Popular team not found or you do not have permission to edit it.");
}

export async function deletePopularTeam(teamId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from("popular_teams").delete().eq("id", teamId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Popular team not found or you do not have permission to delete it.");
}

async function suggestPopularTeams(kind: "source" | "pokemon", prefix: string, excluded: string[]) {
  if (!supabase || !prefix.trim()) return [];
  const { data, error } = await supabase.rpc("suggest_popular_teams", {
    p_kind: kind,
    p_prefix: prefix.trim(),
    p_excluded: excluded
  });
  if (error) throw error;
  return (data ?? []).map((item) => ({ name: item.name, teamCount: Number(item.team_count) }));
}

function rowToSavedTeam(row: PopularTeamRow): SavedTeam {
  return {
    id: row.id,
    ownerId: row.created_by,
    name: row.name,
    source: row.source,
    pasteUrl: row.paste_url ?? undefined,
    pasteText: row.paste_text,
    team: row.team_json as SavedTeam["team"],
    teamHash: row.team_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function requireSupabase() {
  if (!supabase) throw new Error("Popular teams require a Supabase connection.");
  return supabase;
}
