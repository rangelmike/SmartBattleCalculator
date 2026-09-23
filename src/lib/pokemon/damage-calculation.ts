import { calculate, Field, Generations, Move, Pokemon, toID } from "@smogon/calc";
import { getChampionsFormeAbilities, getChampionsFormeAbility, getNatureForStats } from "@/lib/pokemon/champions-data";
import { getChampionsMegaSpecies } from "@/lib/pokemon/team-stats";
import type { PokemonNature, PokemonSpread, PokemonStatId, TeamMember } from "@/lib/pokemon/types";

const champions = Generations.get(0);

export type BattleStatus = "" | "brn" | "par" | "psn" | "tox" | "slp" | "frz";
export type BattleSide = "own" | "opponent";
export type BoostableStat = Exclude<PokemonStatId, "hp">;
export type BattleBoosts = Partial<Record<BoostableStat, number>>;
export type FieldSideState = {
  protect: boolean;
  helpingHand: boolean;
  auroraVeil: boolean;
  reflect: boolean;
  lightScreen: boolean;
  tailwind: boolean;
  leechSeed: boolean;
  friendGuard: boolean;
  stealthRock: boolean;
  spikes: number;
  steelySpirit: boolean;
  saltCure: boolean;
  ingrain: boolean;
  curse: boolean;
  binding: boolean;
  charge: boolean;
  aquaRing: boolean;
};

export type BattleFieldState = {
  gameType: "Singles" | "Doubles";
  terrain: "" | "Electric" | "Grassy" | "Misty" | "Psychic";
  weather: "" | "Sun" | "Rain" | "Sand" | "Snow";
  fairyAura: boolean;
  gravity: boolean;
  own: FieldSideState;
  opponent: FieldSideState;
};

export type BattlePokemon = {
  id: string;
  member: TeamMember;
  forme: string;
  currentHp: number;
  status: BattleStatus;
  criticalMoves: string[];
  boosts?: BattleBoosts;
  abilityOverride?: string;
  typeOverride?: Pokemon["types"];
};

export type DamageCalculation = {
  min: number;
  max: number;
  minPercent: number;
  maxPercent: number;
  rolls: number[];
  description: string;
  koChance: string;
};

export function emptyFieldSide(): FieldSideState {
  return {
    protect: false, helpingHand: false, auroraVeil: false, reflect: false,
    lightScreen: false, tailwind: false, leechSeed: false, friendGuard: false,
    stealthRock: false, spikes: 0, steelySpirit: false, saltCure: false,
    ingrain: false, curse: false, binding: false, charge: false, aquaRing: false
  };
}

export function defaultBattleField(): BattleFieldState {
  return {
    gameType: "Doubles", terrain: "", weather: "", fairyAura: false,
    gravity: false, own: emptyFieldSide(), opponent: emptyFieldSide()
  };
}

export function getChampionsFormes(speciesName: string): string[] {
  const species = champions.species.get(toID(speciesName));
  if (!species) return [speciesName];
  const base = champions.species.get(toID(species.baseSpecies ?? species.name));
  const choices = [base?.name, ...(base?.otherFormes ?? []), species.name].flatMap((name) => name ? [String(name)] : []);
  return [...new Set(choices.filter((name) => champions.species.get(toID(name))))];
}

export function getDefaultForme(member: TeamMember) {
  return getChampionsMegaSpecies(member) ?? member.species;
}

export function getPokemonTypes(forme: string) {
  return champions.species.get(toID(forme))?.types ?? [];
}

export function getChampionsTypes() {
  return [...champions.types].map((type) => type.name).sort((left, right) => left.localeCompare(right, "en"));
}

export function getFormeDefaultAbility(forme: string) {
  return getChampionsFormeAbility(forme);
}

export function getBattleAbility(pokemon: BattlePokemon) {
  const selected = pokemon.abilityOverride ?? pokemon.member.ability;
  if (pokemon.forme === pokemon.member.species && !pokemon.forme.includes("-Mega")) return pokemon.member.ability;
  const abilities = getChampionsFormeAbilities(pokemon.forme);
  return abilities?.find((ability) => toID(ability) === toID(selected)) ?? abilities?.[0] ?? selected;
}

export function normalizeBattlePokemonAbility(pokemon: BattlePokemon): BattlePokemon {
  const ability = getBattleAbility(pokemon);
  if (pokemon.forme === pokemon.member.species && !pokemon.forme.includes("-Mega")) {
    return pokemon.abilityOverride === undefined ? pokemon : { ...pokemon, abilityOverride: undefined };
  }
  return ability === pokemon.abilityOverride ? pokemon : { ...pokemon, abilityOverride: ability };
}

export function getMoveInfo(moveName: string) {
  const move = champions.moves.get(toID(moveName));
  if (!move) return null;
  return { power: move.basePower, type: move.type, category: move.category ?? "Status" };
}

export function makeBattlePokemon(member: TeamMember, id: string = crypto.randomUUID()): BattlePokemon {
  const forme = getDefaultForme(member);
  const pokemon = new Pokemon(champions, forme, { level: 50, nature: member.nature, ivs: member.ivs, evs: member.evs });
  return {
    id, member: { ...member, level: 50, evs: { ...member.evs }, ivs: { ...member.ivs }, moves: [...member.moves] },
    forme, currentHp: pokemon.maxHP(), status: "", criticalMoves: [],
    abilityOverride: forme === member.species ? undefined : getFormeDefaultAbility(forme)
  };
}

export function getMaxHp(pokemon: BattlePokemon) {
  return new Pokemon(champions, pokemon.forme, {
    level: 50, nature: pokemon.member.nature, ivs: pokemon.member.ivs, evs: pokemon.member.evs
  }).maxHP();
}

export function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  moveName: string,
  attackerSide: BattleSide,
  fieldState: BattleFieldState,
  options: { details?: boolean } = {}
): DamageCalculation | null {
  const moveData = champions.moves.get(toID(moveName));
  if (!moveData) return null;

  const attackingPokemon = toCalcPokemon(attacker);
  const defendingPokemon = toCalcPokemon(defender);
  const move = new Move(champions, moveName, { isCrit: attacker.criticalMoves.includes(toID(moveName)) });
  const field = new Field({
    gameType: fieldState.gameType,
    terrain: fieldState.terrain || undefined,
    weather: fieldState.weather || undefined,
    isFairyAura: fieldState.fairyAura,
    isGravity: fieldState.gravity,
    attackerSide: toCalcSide(fieldState[attackerSide]),
    defenderSide: toCalcSide(fieldState[attackerSide === "own" ? "opponent" : "own"])
  });
  const result = calculate(champions, attackingPokemon, defendingPokemon, move, field);
  const [min, max] = result.range();
  const maxHp = defendingPokemon.maxHP();
  if (max === 0) {
    const reason = field.defenderSide.isProtected ? "blocked by Protect" : "no damage";
    return {
      min: 0, max: 0, minPercent: 0, maxPercent: 0,
      rolls: [0],
      description: `${attacker.forme} ${moveName} vs. ${defender.forme}: 0 damage (0%) -- ${reason}`,
      koChance: "No KO"
    };
  }
  const details = options.details !== false;
  const nativeKo = details ? result.kochance().text : "";
  const koChance = details ? nativeKo || approximateHitsToKo(defendingPokemon.curHP(), min, max) : "";
  const description = details ? result.fullDesc() : "";
  return {
    min, max,
    minPercent: roundPercent(min, maxHp),
    maxPercent: roundPercent(max, maxHp),
    rolls: damageRolls(result.damage),
    description: details && !nativeKo && !description.includes(" -- ") ? `${description} -- ${koChance}` : description,
    koChance
  };
}

export function buildOpponentPreset(
  member: TeamMember,
  forme: string,
  strategy: "bulky" | "fast" | "offensive",
  variant: "physically" | "specially" | "balanced" | "min" | "medium"
): { evs: PokemonSpread; nature: PokemonNature } {
  const species = champions.species.get(toID(forme));
  if (!species) throw new Error(`Unknown Pokemon form: ${forme}`);
  const physicalMoves = member.moves.filter((move) => getMoveInfo(move)?.category === "Physical").length;
  const specialMoves = member.moves.filter((move) => getMoveInfo(move)?.category === "Special").length;
  const mixed = physicalMoves > 0 && specialMoves > 0;
  const physical = physicalMoves === specialMoves
    ? species.baseStats.atk >= species.baseStats.spa
    : physicalMoves > specialMoves;
  const offense = physical ? "atk" : "spa";
  const droppedNatureStat = physical ? "spa" : "atk";
  const weakerOffense = species.baseStats.atk >= species.baseStats.spa ? "spa" : "atk";
  const strongerOffense = weakerOffense === "spa" ? "atk" : "spa";
  const hasLargeOffenseGap = species.baseStats[weakerOffense] < species.baseStats[strongerOffense] * 0.7;
  const mixedDrop = hasLargeOffenseGap ? weakerOffense : "spe";

  if (strategy === "bulky") {
    if (variant === "physically") {
      return { evs: { hp: 32, def: 32, spd: 2 }, nature: mixed ? getNatureForStats("def", mixedDrop)! : physical ? "Impish" : "Bold" };
    }
    if (variant === "specially") {
      return { evs: { hp: 32, spd: 32, def: 2 }, nature: mixed ? getNatureForStats("spd", mixedDrop)! : physical ? "Careful" : "Calm" };
    }
    const physicalBulk = species.baseStats.hp + species.baseStats.def;
    const specialBulk = species.baseStats.hp + species.baseStats.spd;
    const difference = Math.max(-24, Math.min(24, specialBulk - physicalBulk));
    const defense = Math.max(2, Math.min(32, 17 + Math.round(difference / 2)));
    return {
      evs: { hp: 32, def: defense, spd: 34 - defense },
      nature: mixed ? getNatureForStats(physicalBulk <= specialBulk ? "def" : "spd", mixedDrop)! : physicalBulk <= specialBulk ? (physical ? "Impish" : "Bold") : (physical ? "Careful" : "Calm")
    };
  }

  if (strategy === "fast") {
    return {
      evs: variant === "medium" ? { spe: 32, [offense]: 20, hp: 14 } : { spe: 32, [offense]: 32, hp: 2 },
      nature: mixed ? getNatureForStats("spe", weakerOffense)! : physical ? "Jolly" : "Timid"
    };
  }

  const evs = variant === "medium"
    ? { [offense]: 32, hp: 20, spe: 14 }
    : { [offense]: 32, spe: 32, hp: 2 };
  return { evs, nature: mixed ? getNatureForStats(hasLargeOffenseGap ? strongerOffense : offense, mixedDrop)! : droppedNatureStat === "spa" ? "Adamant" : "Modest" };
}

export function getEndTurnHpChange(pokemon: BattlePokemon, side: FieldSideState) {
  const hp = getMaxHp(pokemon);
  let change = 0;
  if (side.leechSeed) change -= Math.floor(hp / 8);
  if (side.saltCure) change -= Math.floor(hp / ((pokemon.typeOverride ?? getPokemonTypes(pokemon.forme)).some((type) => type === "Water" || type === "Steel") ? 4 : 8));
  if (side.curse) change -= Math.floor(hp / 4);
  if (side.binding) change -= Math.floor(hp / 8);
  if (side.ingrain) change += Math.floor(hp / 16);
  if (side.aquaRing) change += Math.floor(hp / 16);
  return change;
}

function toCalcPokemon(pokemon: BattlePokemon) {
  const member = pokemon.member;
  return new Pokemon(champions, pokemon.forme, {
    level: 50,
    ability: getBattleAbility(pokemon),
    item: member.item,
    nature: member.nature,
    evs: member.evs,
    ivs: member.ivs,
    boosts: pokemon.boosts,
    overrides: pokemon.typeOverride ? { types: pokemon.typeOverride } : undefined,
    status: pokemon.status,
    curHP: Math.max(1, Math.min(getMaxHp(pokemon), pokemon.currentHp))
  });
}

function toCalcSide(side: FieldSideState) {
  return {
    isProtected: side.protect,
    isHelpingHand: side.helpingHand,
    isAuroraVeil: side.auroraVeil,
    isReflect: side.reflect,
    isLightScreen: side.lightScreen,
    isTailwind: side.tailwind,
    isSeeded: side.leechSeed,
    isFriendGuard: side.friendGuard,
    isSR: side.stealthRock,
    spikes: side.spikes,
    isSteelySpirit: side.steelySpirit,
    isSaltCured: side.saltCure,
    isCharge: side.charge
  };
}

function damageRolls(damage: number | number[] | number[][]): number[] {
  if (typeof damage === "number") return [damage];
  if (typeof damage[0] === "number") return damage as number[];
  const hits = damage as number[][];
  return Array.from({ length: Math.max(...hits.map((hit) => hit.length)) }, (_, index) =>
    hits.reduce((total, hit) => total + (hit[index] ?? hit[hit.length - 1] ?? 0), 0)
  );
}

function roundPercent(damage: number, maxHp: number) {
  return Math.round((damage / Math.max(1, maxHp)) * 1000) / 10;
}

function approximateHitsToKo(currentHp: number, min: number, max: number) {
  const earliest = Math.ceil(currentHp / Math.max(1, max));
  const latest = Math.ceil(currentHp / Math.max(1, min));
  return earliest === latest ? `about ${earliest} hits to KO` : `about ${earliest}–${latest} hits to KO`;
}
