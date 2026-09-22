import { Teams } from "@pkmn/sets";
import type { PokemonSet } from "@pkmn/sets";
import type { PokemonTeam, TeamMember } from "@/lib/pokemon/types";

export function parseShowdownPaste(pasteText: string, format = "vgc"): PokemonTeam {
  const normalizedText = pasteText.trim();

  if (!normalizedText) {
    throw new Error("The team text cannot be empty.");
  }

  const importedTeam = Teams.importTeam(normalizedText);
  const members = importedTeam?.team.map(toTeamMember) ?? [];

  if (members.length > 6) {
    throw new Error("A team cannot have more than 6 Pokemon.");
  }

  if (members.length === 0) {
    throw new Error("No Pokemon were found in the imported text.");
  }

  return { format, members };
}

function toTeamMember(set: Partial<PokemonSet<string>>): TeamMember {
  const species = set.species?.trim();

  if (!species) {
    throw new Error("Each Pokemon needs a valid species.");
  }

  return {
    name: set.name?.trim() || species,
    species,
    item: set.item?.trim() || undefined,
    ability: set.ability?.trim() || undefined,
    level: set.level ?? 50,
    evs: set.evs ?? {},
    ivs: set.ivs ?? {},
    moves: set.moves?.filter(Boolean) ?? [],
    nature: set.nature as TeamMember["nature"],
    teraType: set.teraType?.trim() || undefined
  };
}
