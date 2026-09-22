import type { PokemonSpread, PokemonStatId, PokemonTeam, TeamMember } from "@/lib/pokemon/types";

const statIds: PokemonStatId[] = ["hp", "atk", "def", "spa", "spd", "spe"];

export type TeamValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validatePokemonTeam(team: PokemonTeam): TeamValidationResult {
  const errors: string[] = [];

  if (!team.members.length) {
    errors.push("The team needs at least one Pokemon.");
  }

  if (team.members.length > 6) {
    errors.push("A team cannot have more than 6 Pokemon.");
  }

  team.members.forEach((member, index) => {
    errors.push(...validateTeamMember(member, index));
  });

  return { ok: errors.length === 0, errors };
}

export function assertValidPokemonTeam(team: PokemonTeam) {
  const result = validatePokemonTeam(team);

  if (!result.ok) {
    throw new Error(result.errors.join(" "));
  }
}

function validateTeamMember(member: TeamMember, index: number) {
  const number = index + 1;
  const errors: string[] = [];

  if (!member.species.trim()) {
    errors.push(`Pokemon ${number} needs a species.`);
  }

  if (!Number.isFinite(member.level) || member.level < 1 || member.level > 100) {
    errors.push(`${member.species || `Pokemon ${number}`} needs a level between 1 and 100.`);
  }

  if (member.moves.length === 0) {
    errors.push(`${member.species || `Pokemon ${number}`} needs at least one move.`);
  }

  if (member.moves.length > 4) {
    errors.push(`${member.species || `Pokemon ${number}`} cannot have more than 4 moves.`);
  }

  errors.push(...validateSpread(member.evs, "EV", 0, 252, 510, member.species || `Pokemon ${number}`));
  errors.push(...validateSpread(member.ivs, "IV", 0, 31, 186, member.species || `Pokemon ${number}`));

  return errors;
}

function validateSpread(
  spread: PokemonSpread,
  label: "EV" | "IV",
  min: number,
  max: number,
  totalMax: number,
  pokemonName: string
) {
  const errors: string[] = [];
  const total = statIds.reduce((sum, stat) => {
    const value = spread[stat] ?? 0;

    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push(`${pokemonName} has invalid ${label}s in ${stat}.`);
    }

    return sum + value;
  }, 0);

  if (total > totalMax) {
    errors.push(`${pokemonName} exceeds the total ${label} limit.`);
  }

  return errors;
}
