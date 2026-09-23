import { Generations, toID } from "@smogon/calc";
import { championsSpeciesRules } from "@/lib/pokemon/champions-learnsets";
import type { PokemonNature, PokemonStatId, PokemonTeam, TeamMember } from "@/lib/pokemon/types";

const champions = Generations.get(0);

export const championsSpecies = [...champions.species]
  .map((species) => species.name)
  .sort((left, right) => left.localeCompare(right, "en"));

export const championsItems = [...champions.items]
  .map((item) => item.name)
  .sort((left, right) => left.localeCompare(right, "en"));

export const championsNatures = [...champions.natures]
  .map((nature) => nature.name)
  .sort((left, right) => left.localeCompare(right, "en"));

export const natureStatIds = ["atk", "def", "spa", "spd", "spe"] as const;
export type NatureStatId = (typeof natureStatIds)[number];

const natureStatLabels: Record<NatureStatId, string> = {
  atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe"
};

export function getNatureStatPair(nature: PokemonNature | undefined): { plus: NatureStatId; minus: NatureStatId } {
  const data = champions.natures.get(toID(nature ?? "Serious"));
  return { plus: data?.plus as NatureStatId ?? "spe", minus: data?.minus as NatureStatId ?? "spe" };
}

export function getNatureForStats(plus: PokemonStatId, minus: PokemonStatId): PokemonNature | null {
  if (plus === "hp" || minus === "hp") return null;
  const nature = [...champions.natures].find((candidate) => candidate.plus === plus && candidate.minus === minus);
  return nature?.name ?? null;
}

export function getNatureOptionLabel(nature: PokemonNature): string {
  const { plus, minus } = getNatureStatPair(nature);
  return `${nature} (+${natureStatLabels[plus]} / -${natureStatLabels[minus]})`;
}

export type ChampionsPokemonRules = {
  species: string;
  abilities: string[];
  moves: string[];
};

export type ChampionsValidationResult = {
  ok: boolean;
  errors: string[];
};

export function isChampionsSpecies(value: string) {
  return Boolean(champions.species.get(toID(value)));
}

export function isChampionsItem(value: string) {
  return Boolean(champions.items.get(toID(value)));
}

export function isChampionsNature(value: string | undefined): value is PokemonNature {
  return Boolean(value && champions.natures.get(toID(value)));
}

export function getChampionsFormeAbility(forme: string) {
  const id = toID(forme);
  return championsSpeciesRules[id]?.abilities[0] ?? champions.species.get(id)?.abilities?.[0];
}

export function getChampionsFormeAbilities(forme: string) {
  return championsSpeciesRules[toID(forme)]?.abilities;
}

export function loadChampionsPokemonRules(speciesName: string): Promise<ChampionsPokemonRules> {
  const species = champions.species.get(toID(speciesName));

  if (!species) {
    throw new Error(`${speciesName || "This Pokemon"} is not available in Pokemon Champions.`);
  }

  const rules = championsSpeciesRules[species.id];
  if (!rules) {
    throw new Error(`No Champions rules found for ${species.name}.`);
  }

  return Promise.resolve({ species: rules.name, abilities: rules.abilities, moves: rules.moves });
}

export async function validateChampionsTeam(team: PokemonTeam): Promise<ChampionsValidationResult> {
  const errors: string[] = [];

  if (team.members.length === 0) errors.push("The team needs at least one Pokemon.");
  if (team.members.length > 6) errors.push("A Champions team cannot have more than 6 Pokemon.");

  const speciesIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const [index, member] of team.members.entries()) {
    const label = member.species || `Pokemon ${index + 1}`;
    const speciesId = toID(member.species);

    if (!isChampionsSpecies(member.species)) {
      errors.push(`${label} is not available in Pokemon Champions.`);
      continue;
    }

    if (speciesIds.has(speciesId)) errors.push(`${label} is duplicated on the team.`);
    speciesIds.add(speciesId);

    if (member.level !== 50) errors.push(`${label} must always be level 50.`);
    if (!isChampionsNature(member.nature)) errors.push(`${label} needs a valid nature.`);

    if (member.item) {
      const itemId = toID(member.item);
      if (!isChampionsItem(member.item)) errors.push(`${member.item} is not a valid Champions item.`);
      if (itemIds.has(itemId)) errors.push(`${member.item} is duplicated on the team.`);
      itemIds.add(itemId);
    } else {
      errors.push(`${label} needs a valid Champions item.`);
    }

    const evTotal = Object.values(member.evs).reduce((sum, value) => sum + (value ?? 0), 0);
    for (const [stat, value] of Object.entries(member.evs)) {
      if (!Number.isInteger(value) || value < 0 || value > 32) {
        errors.push(`${label} has invalid SP/EVs in ${stat}; they must be between 0 and 32.`);
      }
    }
    if (evTotal > 66) errors.push(`${label} exceeds the total 66 SP/EV limit.`);

    for (const [stat, value] of Object.entries(member.ivs)) {
      if (!Number.isInteger(value) || value < 0 || value > 31) {
        errors.push(`${label} has invalid IVs in ${stat}; they must be between 0 and 31.`);
      }
    }

    const rules = await loadChampionsPokemonRules(member.species);
    const abilityIds = new Set(rules.abilities.map(toID));
    const moveIds = new Set(rules.moves.map(toID));

    if (!member.ability || !abilityIds.has(toID(member.ability))) {
      errors.push(`The ability ${member.ability || "selected"} is not valid for ${label} in Champions.`);
    }

    if (member.moves.length === 0 || member.moves.length > 4) {
      errors.push(`${label} must have between 1 and 4 moves.`);
    }

    const selectedMoves = new Set<string>();
    for (const move of member.moves) {
      const moveId = toID(move);
      if (!moveIds.has(moveId)) errors.push(`${label} cannot learn ${move} in Champions.`);
      if (selectedMoves.has(moveId)) errors.push(`${label} has duplicate move ${move}.`);
      selectedMoves.add(moveId);
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function assertValidChampionsTeam(team: PokemonTeam) {
  const result = await validateChampionsTeam(team);
  if (!result.ok) throw new Error(result.errors.join(" "));
}

export async function createChampionsMember(speciesName: string): Promise<TeamMember> {
  const rules = await loadChampionsPokemonRules(speciesName);
  return {
    name: rules.species,
    species: rules.species,
    ability: rules.abilities[0],
    level: 50,
    nature: "Serious",
    evs: {},
    ivs: {},
    moves: []
  };
}

export function getNatureModifiers(nature: PokemonNature | undefined) {
  const data = nature ? champions.natures.get(toID(nature)) : undefined;
  if (!data || data.plus === data.minus) return {};
  return { plus: data.plus, minus: data.minus };
}

export function getChampionsItemIconUrl(itemName: string) {
  if (champions.items.get(toID(itemName))?.megaStone) {
    return "https://play.pokemonshowdown.com/sprites/misc/mega.png";
  }

  const slug = itemName
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://play.pokemonshowdown.com/sprites/itemicons/${slug}.png`;
}
