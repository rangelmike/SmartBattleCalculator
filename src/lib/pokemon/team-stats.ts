import { calcStat, Generations, toID } from "@smogon/calc";
import { Dex } from "@pkmn/dex";
import type { PokemonSpread, TeamMember } from "@/lib/pokemon/types";

export const pokemonStatIds = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

export type PokemonStatModel = "champions" | "standard";
export type Level50Stats = Record<(typeof pokemonStatIds)[number], number>;

const champions = Generations.get(0);
const championsAccuracyOverrides: Record<string, number | true> = {
  clangoroussoul: true,
  crabhammer: 95,
  geargrind: 90,
  makeitrain: 95
};

export function inferPokemonStatModel(evs: PokemonSpread): PokemonStatModel {
  const values = Object.values(evs).filter((value): value is number => typeof value === "number" && value > 0);

  if (values.length > 0 && values.every((value) => value <= 32) && values.some((value) => value % 4 !== 0)) {
    return "champions";
  }

  return "standard";
}

export function calculateLevel50Stats(
  member: TeamMember,
  options: { species?: string; model?: PokemonStatModel } = {}
) {
  const model = options.model ?? inferPokemonStatModel(member.evs);
  const generation = model === "champions" ? 0 : 9;
  const speciesName = options.species ?? member.species;
  const species = Generations.get(generation).species.get(toID(speciesName));

  if (!species) {
    throw new Error(`No base stats found for ${speciesName}.`);
  }

  const stats = Object.fromEntries(
    pokemonStatIds.map((stat) => [
      stat,
      calcStat(
        generation,
        stat,
        species.baseStats[stat],
        member.ivs[stat] ?? 31,
        member.evs[stat] ?? 0,
        50,
        member.nature
      )
    ])
  ) as Level50Stats;

  return { model, stats };
}

export function getChampionsMegaSpecies(member: Pick<TeamMember, "species" | "item">) {
  const speciesId = toID(member.species);
  const itemId = toID(member.item ?? "");
  if (speciesId.length < 3 || !itemId.endsWith("ite") || !itemId.startsWith(speciesId.slice(0, 3))) {
    return null;
  }

  const stone = champions.items.get(itemId)?.megaStone;
  const megaName = Object.entries(stone ?? {}).find(([baseSpecies]) => toID(baseSpecies) === speciesId)?.[1];
  return megaName ? champions.species.get(toID(megaName))?.name ?? null : null;
}

export function getChampionsMoveDetails(moveName: string) {
  const id = toID(moveName);
  const move = champions.moves.get(id);
  if (!move) return null;

  const dexMove = Dex.moves.get(id);
  const accuracy = championsAccuracyOverrides[id] ?? dexMove?.accuracy;
  const category = move.category ?? dexMove?.category;

  return {
    power: category === "Status" ? "—" : move.basePower > 0 ? String(move.basePower) : "Variable",
    accuracy: accuracy === true ? "Always" : typeof accuracy === "number" ? `${accuracy}%` : "—"
  };
}

export function getPokemonSpriteUrl(speciesName: string) {
  const speciesId = toID(speciesName);

  if (!speciesId) {
    return undefined;
  }

  const spriteName = speciesName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://play.pokemonshowdown.com/sprites/ani/${spriteName}.gif`;
}
