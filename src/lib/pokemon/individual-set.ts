import { championsItems, type ChampionsPokemonRules } from "@/lib/pokemon/champions-data";
import type { BattlePokemon } from "@/lib/pokemon/damage-calculation";
import { calculateLevel50Stats } from "@/lib/pokemon/team-stats";
import type { PokemonNature, PokemonSpread, TeamMember } from "@/lib/pokemon/types";

export type PopularSetSeed = {
  item: string;
  ability: string;
  nature: string;
  evs: PokemonSpread;
  moves: string[];
};

export function applyIndividualSetDefault(
  base: TeamMember,
  rules: ChampionsPokemonRules,
  popular: PopularSetSeed | null,
  usedItems: Iterable<string | undefined>
): TeamMember {
  if (popular) {
    return {
      ...base, item: popular.item, ability: popular.ability,
      nature: popular.nature as PokemonNature,
      evs: { ...popular.evs }, moves: [...popular.moves]
    };
  }
  const alreadyUsed = new Set(usedItems);
  const item = ["Sitrus Berry", "Leftovers", "Focus Sash", "Assault Vest"]
    .find((candidate) => championsItems.some((item) => item === candidate) && !alreadyUsed.has(candidate))
    ?? championsItems.find((candidate) => !alreadyUsed.has(candidate));
  const stats = calculateLevel50Stats(base, { model: "champions" }).baseStats;
  const physical = stats.atk >= stats.spa;
  const offense = physical ? "atk" : "spa";
  const weakDefense = stats.def < stats.spd ? "def" : "spd";
  const evs: PokemonSpread = stats.spe >= 75
    ? { [offense]: 32, spe: 32, hp: 2 }
    : { [offense]: 32, hp: 32, [weakDefense]: 2 };
  return {
    ...base, item, evs, nature: physical ? "Adamant" : "Modest",
    moves: rules.moves.slice(0, 4)
  };
}

export function memberForSavedTeam(pokemon: BattlePokemon): TeamMember {
  if (pokemon.forme === pokemon.member.species || pokemon.forme.includes("-Mega")) return pokemon.member;
  return {
    ...pokemon.member,
    name: pokemon.member.name === pokemon.member.species ? pokemon.forme : pokemon.member.name,
    species: pokemon.forme,
    ability: pokemon.abilityOverride ?? pokemon.member.ability
  };
}
