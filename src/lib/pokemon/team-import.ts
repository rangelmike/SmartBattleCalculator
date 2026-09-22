import { parseShowdownPaste } from "@/lib/pokemon/showdown-parser";
import { hashTeam } from "@/lib/pokemon/team-hash";
import { assertValidChampionsTeam } from "@/lib/pokemon/champions-data";
import type { PokemonTeam } from "@/lib/pokemon/types";

export type TeamListKind = "own" | "opponent";
export type TeamImportMethod = "text" | "pokepaste";

export type SavedTeam = {
  id: string;
  ownerId: string;
  name: string;
  source: string;
  pasteUrl?: string;
  pasteText: string;
  team: PokemonTeam;
  teamHash: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamLibrary = {
  own: SavedTeam[];
  opponent: SavedTeam[];
};

export type TeamImportInput = {
  ownerId: string;
  name: string;
  source: string;
  pasteText: string;
  pasteUrl?: string;
  destination: TeamListKind;
  format?: string;
};

export function isPokePasteUrl(value: string) {
  return /^https:\/\/pokepast\.es\/[a-zA-Z0-9]+\/?$/.test(value.trim());
}

export function toPokePasteRawUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, "");

  if (!isPokePasteUrl(normalized)) {
    throw new Error("The Pokepaste link is invalid.");
  }

  return `${normalized}/raw`;
}

export async function loadPokepasteText(
  url: string,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher(toPokePasteRawUrl(url));

  if (!response.ok) {
    throw new Error("Could not read the Pokepaste.");
  }

  return response.text();
}

export async function buildSavedTeam(input: TeamImportInput): Promise<SavedTeam> {
  const name = input.name.trim();
  const source = input.source.trim();

  if (!name) {
    throw new Error("Give the team a name.");
  }

  if (!source) {
    throw new Error("Enter the team's source.");
  }

  const team = parseShowdownPaste(input.pasteText, input.format ?? "champions");
  await assertValidChampionsTeam(team);

  return createSavedTeam(input, team, input.pasteText);
}

export async function buildSavedTeamFromEditor(input: Omit<TeamImportInput, "pasteText"> & { team: PokemonTeam }) {
  await assertValidChampionsTeam(input.team);
  return createSavedTeam(input, { ...input.team, format: "champions" }, serializePokemonTeam(input.team));
}

export async function updateSavedTeamFromEditor(
  current: SavedTeam,
  input: Pick<TeamImportInput, "name" | "source"> & { team: PokemonTeam }
) {
  const next = await buildSavedTeamFromEditor({
    ownerId: current.ownerId,
    name: input.name,
    source: input.source,
    team: input.team,
    pasteUrl: current.pasteUrl,
    destination: "own"
  });

  return { ...next, id: current.id, createdAt: current.createdAt };
}

async function createSavedTeam(
  input: Pick<TeamImportInput, "ownerId" | "name" | "source" | "pasteUrl">,
  team: PokemonTeam,
  pasteText: string
): Promise<SavedTeam> {
  const name = input.name.trim();
  const source = input.source.trim();

  if (!name) throw new Error("Give the team a name.");
  if (!source) throw new Error("Enter the team's source.");

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    name,
    source,
    pasteUrl: input.pasteUrl?.trim() || undefined,
    pasteText: pasteText.trim(),
    team,
    teamHash: await hashTeam(team),
    createdAt: now,
    updatedAt: now
  };
}

export function serializePokemonTeam(team: PokemonTeam) {
  return team.members
    .map((member) => {
      const lines = [`${member.name === member.species ? member.species : `${member.name} (${member.species})`}${member.item ? ` @ ${member.item}` : ""}`];
      if (member.ability) lines.push(`Ability: ${member.ability}`);
      lines.push("Level: 50");
      const evs = [
        ["hp", "HP"], ["atk", "Atk"], ["def", "Def"], ["spa", "SpA"], ["spd", "SpD"], ["spe", "Spe"]
      ].flatMap(([stat, label]) => member.evs[stat as keyof typeof member.evs] ? [`${member.evs[stat as keyof typeof member.evs]} ${label}`] : []);
      if (evs.length) lines.push(`EVs: ${evs.join(" / ")}`);
      lines.push(`${member.nature ?? "Serious"} Nature`);
      lines.push(...member.moves.map((move) => `- ${move}`));
      return lines.join("\n");
    })
    .join("\n\n");
}

export function addTeamToLibrary(library: TeamLibrary, team: SavedTeam, destination: TeamListKind): TeamLibrary {
  const withOpponent = upsertTeam(library.opponent, team);

  if (destination === "own") {
    return {
      own: upsertTeam(library.own, team),
      opponent: withOpponent
    };
  }

  return {
    own: library.own,
    opponent: withOpponent
  };
}

export function replaceTeamInLibrary(library: TeamLibrary, team: SavedTeam): TeamLibrary {
  const replace = (teams: SavedTeam[]) => teams.map((current) => (current.id === team.id ? team : current));
  return { own: replace(library.own), opponent: replace(library.opponent) };
}

export function removeTeamFromLibrary(library: TeamLibrary, teamId: string): TeamLibrary {
  const remove = (teams: SavedTeam[]) => teams.filter((team) => team.id !== teamId);
  return { own: remove(library.own), opponent: remove(library.opponent) };
}

function upsertTeam(teams: SavedTeam[], team: SavedTeam) {
  const existingIndex = teams.findIndex((item) => item.teamHash === team.teamHash);

  if (existingIndex === -1) {
    return [team, ...teams];
  }

  return teams.map((item, index) => (index === existingIndex ? { ...team, id: item.id } : item));
}
