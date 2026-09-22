import {
  addTeamToLibrary,
  removeTeamFromLibrary,
  replaceTeamInLibrary,
  type SavedTeam,
  type TeamLibrary,
  type TeamListKind
} from "@/lib/pokemon/team-import";
import type { Json } from "@/lib/supabase/database.types";
import { supabase } from "@/lib/supabase/client";

const localLibraryKeyPrefix = "sbc.team-library.";

type RemoteTeamRow = {
  id: string;
  user_id: string;
  name: string;
  source: string;
  paste_url: string | null;
  paste_text: string;
  team_json: Json;
  team_hash: string;
  created_at: string;
  updated_at: string;
};

export async function loadTeamLibrary(userId: string): Promise<TeamLibrary> {
  if (!supabase) {
    return readLocalLibrary(userId);
  }

  const { data, error } = await supabase
    .from("teams")
    .select("id,user_id,name,source,paste_url,paste_text,team_json,team_hash,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const teams = ((data ?? []) as RemoteTeamRow[]).map(rowToSavedTeam);
  const { data: collectionData, error: collectionError } = await supabase
    .from("team_collections")
    .select("team_id,list_kind")
    .eq("user_id", userId);

  if (collectionError) {
    throw collectionError;
  }

  const collections = collectionData ?? [];
  const ownIds = new Set(collections.filter((item) => item.list_kind === "own").map((item) => item.team_id));
  const opponentIds = new Set(
    collections.filter((item) => item.list_kind === "opponent").map((item) => item.team_id)
  );

  if (collections.length === 0) {
    return {
      own: teams,
      opponent: teams
    };
  }

  return {
    own: teams.filter((team) => ownIds.has(team.id)),
    opponent: teams.filter((team) => opponentIds.has(team.id))
  };
}

export async function saveTeamToLibrary(userId: string, team: SavedTeam, destination: TeamListKind) {
  if (!supabase) {
    const library = addTeamToLibrary(readLocalLibrary(userId), team, destination);
    writeLocalLibrary(userId, library);
    return library;
  }

  const { error } = await supabase.from("teams").upsert(
    {
      id: team.id,
      user_id: userId,
      name: team.name,
      source: team.source,
      paste_url: team.pasteUrl ?? null,
      paste_text: team.pasteText,
      team_json: team.team,
      team_hash: team.teamHash,
      format: team.team.format
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }

  const listKinds: TeamListKind[] = destination === "own" ? ["own", "opponent"] : ["opponent"];
  const { error: collectionError } = await supabase.from("team_collections").upsert(
    listKinds.map((listKind) => ({
      user_id: userId,
      team_id: team.id,
      list_kind: listKind
    })),
    { onConflict: "user_id,team_id,list_kind" }
  );

  if (collectionError) {
    throw collectionError;
  }

  return loadTeamLibrary(userId);
}

export async function updateTeamInLibrary(userId: string, team: SavedTeam) {
  if (!supabase) {
    const library = replaceTeamInLibrary(readLocalLibrary(userId), team);
    writeLocalLibrary(userId, library);
    return library;
  }

  const { error } = await supabase
    .from("teams")
    .update({
      name: team.name,
      source: team.source,
      paste_url: team.pasteUrl ?? null,
      paste_text: team.pasteText,
      team_json: team.team,
      team_hash: team.teamHash,
      format: team.team.format,
      updated_at: team.updatedAt
    })
    .eq("id", team.id)
    .eq("user_id", userId);

  if (error) throw error;
  return loadTeamLibrary(userId);
}

export async function deleteTeamFromLibrary(userId: string, teamId: string) {
  if (!supabase) {
    const library = removeTeamFromLibrary(readLocalLibrary(userId), teamId);
    writeLocalLibrary(userId, library);
    return library;
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId).eq("user_id", userId);
  if (error) throw error;
  return loadTeamLibrary(userId);
}

function rowToSavedTeam(row: RemoteTeamRow): SavedTeam {
  return {
    id: row.id,
    ownerId: row.user_id,
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

function readLocalLibrary(userId: string): TeamLibrary {
  const raw = localStorage.getItem(`${localLibraryKeyPrefix}${userId}`);

  if (!raw) {
    return { own: [], opponent: [] };
  }

  try {
    return JSON.parse(raw) as TeamLibrary;
  } catch {
    localStorage.removeItem(`${localLibraryKeyPrefix}${userId}`);
    return { own: [], opponent: [] };
  }
}

function writeLocalLibrary(userId: string, library: TeamLibrary) {
  localStorage.setItem(`${localLibraryKeyPrefix}${userId}`, JSON.stringify(library));
}
