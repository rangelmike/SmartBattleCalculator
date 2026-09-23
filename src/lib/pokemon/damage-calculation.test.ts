import { describe, expect, it } from "vitest";
import { calculate, Field, Generations, Move, Pokemon } from "@smogon/calc";
import {
  buildOpponentPreset,
  calculateDamage,
  defaultBattleField,
  getChampionsFormes,
  getDefaultForme,
  getFormeDefaultAbility,
  getMaxHp,
  getBattleAbility,
  makeBattlePokemon
} from "@/lib/pokemon/damage-calculation";
import { calculateLevel50Stats } from "@/lib/pokemon/team-stats";
import type { TeamMember } from "@/lib/pokemon/types";

const pelipper: TeamMember = {
  name: "Pelipper", species: "Pelipper", level: 50, item: "Sitrus Berry",
  ability: "Drizzle", nature: "Modest", evs: { hp: 32, spa: 5 }, ivs: {},
  moves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"]
};
const archaludon: TeamMember = {
  name: "Archaludon", species: "Archaludon", level: 50, item: "Leftovers",
  ability: "Stamina", nature: "Modest", evs: { hp: 32, spd: 29 }, ivs: {},
  moves: ["Electro Shot", "Dragon Pulse", "Flash Cannon", "Protect"]
};

describe("Champions damage calculation", () => {
  it("uses the Champions generation, level 50 stats and field modifiers", () => {
    const attacker = makeBattlePokemon(pelipper, "own-1");
    const defender = makeBattlePokemon(archaludon, "opponent-1");
    const field = defaultBattleField();
    field.weather = "Rain";
    const result = calculateDamage(attacker, defender, "Hurricane", "own", field);
    expect(result?.min).toBe(36);
    expect(result?.max).toBe(43);
    expect(result?.rolls).toHaveLength(16);
    expect(result?.description).toContain("32 HP / 29 SpD Archaludon");

    field.opponent.protect = true;
    expect(calculateDamage(attacker, defender, "Hurricane", "own", field)?.max).toBe(0);
    expect(calculateDamage(attacker, defender, "Tailwind", "own", field)?.max).toBe(0);
  });

  it("applies critical hits and battle-only type changes", () => {
    const attacker = makeBattlePokemon(pelipper);
    const defender = makeBattlePokemon(archaludon);
    const field = defaultBattleField();
    const normal = calculateDamage(attacker, defender, "Hurricane", "own", field)!;
    const critical = calculateDamage({ ...attacker, criticalMoves: ["hurricane"] }, defender, "Hurricane", "own", field)!;
    const changedType = calculateDamage(attacker, { ...defender, typeOverride: ["Grass"] as typeof defender.typeOverride }, "Hurricane", "own", field)!;
    expect(critical.max).toBeGreaterThan(normal.max);
    expect(changedType.max).toBeGreaterThan(normal.max);
  });

  it("applies attack and defense stages through the damage engine", () => {
    const attacker = makeBattlePokemon(pelipper);
    const defender = makeBattlePokemon(archaludon);
    const field = defaultBattleField();
    const normal = calculateDamage(attacker, defender, "Hurricane", "own", field)!.max;
    expect(calculateDamage({ ...attacker, boosts: { spa: 2 } }, defender, "Hurricane", "own", field)!.max).toBeGreaterThan(normal);
    expect(calculateDamage({ ...attacker, boosts: { spa: -2 } }, defender, "Hurricane", "own", field)!.max).toBeLessThan(normal);
    expect(calculateDamage(attacker, { ...defender, boosts: { spd: 2 } }, "Hurricane", "own", field)!.max).toBeLessThan(normal);
    expect(calculateDamage(attacker, { ...defender, boosts: { spd: -2 } }, "Hurricane", "own", field)!.max).toBeGreaterThan(normal);
  });

  it("still reports hits to KO for very weak moves", () => {
    const result = calculateDamage(makeBattlePokemon(pelipper), makeBattlePokemon(archaludon), "Acrobatics", "own", defaultBattleField());
    expect(result?.koChance).toContain("hits to KO");
    expect(result?.description).toContain(" -- ");
  });

  it("changes the default Mega form and its real stats", () => {
    const charizard: TeamMember = {
      name: "Charizard", species: "Charizard", level: 50, item: "Charizardite Y",
      ability: "Blaze", nature: "Modest", evs: { spa: 32 }, ivs: {}, moves: ["Heat Wave"]
    };
    const pokemon = makeBattlePokemon(charizard);
    expect(getDefaultForme(charizard)).toBe("Charizard-Mega-Y");
    expect(pokemon.abilityOverride).toBe("Drought");
    expect(pokemon.member.ability).toBe("Blaze");
    expect(getChampionsFormes("Charizard")).toContain("Charizard-Mega-Y");
    expect(calculateLevel50Stats(pokemon.member, { species: pokemon.forme, model: "champions" }).stats.spa)
      .toBeGreaterThan(calculateLevel50Stats(pokemon.member, { species: "Charizard", model: "champions" }).stats.spa);
    expect(getMaxHp(pokemon)).toBeGreaterThan(0);
  });

  it("loads the correct Z Mega ability into the battle set", () => {
    const lucario: TeamMember = {
      name: "Lucario", species: "Lucario", level: 50, item: "Lucarionite Z",
      ability: "Inner Focus", nature: "Modest", evs: { spa: 32 }, ivs: {}, moves: ["Aura Sphere"]
    };
    const pokemon = makeBattlePokemon(lucario);
    expect(pokemon.forme).toBe("Lucario-Mega-Z");
    expect(pokemon.abilityOverride).toBe("Aura Guard");
    expect(pokemon.member.ability).toBe("Inner Focus");
    expect(getFormeDefaultAbility("Golisopod-Mega")).toBe("Tough Claws");
    expect(getFormeDefaultAbility("Absol-Mega-Z")).toBe("Sharpness");
  });

  it("applies Mega Golisopod's Tough Claws to contact damage", () => {
    const golisopod: TeamMember = {
      name: "Golisopod", species: "Golisopod", level: 50, item: "Golisopite",
      ability: "Emergency Exit", nature: "Adamant", evs: { atk: 32 }, ivs: {}, moves: ["First Impression"]
    };
    const mega = makeBattlePokemon(golisopod);
    const stale = { ...mega, abilityOverride: "Emergency Exit" };
    const defender = makeBattlePokemon(archaludon);
    expect(mega.forme).toBe("Golisopod-Mega");
    expect(mega.abilityOverride).toBe("Tough Claws");
    expect(getBattleAbility(stale)).toBe("Tough Claws");
    const result = calculateDamage(stale, defender, "First Impression", "own", defaultBattleField())!;
    expect(result.description).toContain("Tough Claws");
    expect(result.max).toBeGreaterThan(rawDamageWithoutMegaAbility(mega, defender, "First Impression", "Emergency Exit"));
  });

  it("applies Mega Absol Z's Sharpness and repairs an old ability override", () => {
    const absol: TeamMember = {
      name: "Absol", species: "Absol", level: 50, item: "Absolite Z",
      ability: "Super Luck", nature: "Adamant", evs: { atk: 32 }, ivs: {}, moves: ["Night Slash"]
    };
    const mega = makeBattlePokemon(absol);
    const stale = { ...mega, abilityOverride: "Magic Bounce" };
    const defender = makeBattlePokemon(archaludon);
    expect(mega.forme).toBe("Absol-Mega-Z");
    expect(getBattleAbility(stale)).toBe("Sharpness");
    const result = calculateDamage(stale, defender, "Night Slash", "own", defaultBattleField())!;
    expect(result.description).toContain("Sharpness");
    expect(result.max).toBeGreaterThan(rawDamageWithoutMegaAbility(mega, defender, "Night Slash", "Magic Bounce"));
  });

  it("applies Mega Lucario Z's Aura Guard to incoming contact damage", () => {
    const lucario: TeamMember = {
      name: "Lucario", species: "Lucario", level: 50, item: "Lucarionite Z",
      ability: "Inner Focus", nature: "Bold", evs: { hp: 32, def: 32 }, ivs: {}, moves: ["Aura Sphere"]
    };
    const mega = makeBattlePokemon(lucario);
    const stale = { ...mega, abilityOverride: "Adaptability" };
    const attacker = makeBattlePokemon(archaludon);
    expect(mega.forme).toBe("Lucario-Mega-Z");
    expect(getBattleAbility(stale)).toBe("Aura Guard");
    const result = calculateDamage(attacker, stale, "Body Press", "own", defaultBattleField())!;
    expect(result.description).toContain("Aura Guard");
    expect(result.max).toBeLessThan(rawDamageWithoutMegaAbility(attacker, mega, "Body Press", undefined, "Adaptability"));
  });

  it("builds valid 66-point presets from role and base stats", () => {
    const fast = buildOpponentPreset(archaludon, "Archaludon", "fast", "min");
    expect(fast).toEqual({ evs: { spe: 32, spa: 32, hp: 2 }, nature: "Timid" });
    const balanced = buildOpponentPreset(archaludon, "Archaludon", "bulky", "balanced");
    expect(Object.values(balanced.evs).reduce((sum, value) => sum + (value ?? 0), 0)).toBe(66);
    expect(Object.values(balanced.evs).every((value) => value !== undefined && value <= 32)).toBe(true);
  });

  it("raises Speed for every fast mixed attacker and lowers its weaker base offense", () => {
    const balanced = { ...archaludon, moves: ["Earthquake", "Electro Shot"] };
    const physical = { ...archaludon, moves: ["First Impression", "Surf"] };
    const special = { ...archaludon, moves: ["Iron Head", "Shadow Ball"] };
    expect(buildOpponentPreset(balanced, "Archaludon", "fast", "min").nature).toBe("Timid");
    expect(buildOpponentPreset(physical, "Golisopod-Mega", "fast", "medium").nature).toBe("Jolly");
    expect(buildOpponentPreset(special, "Gholdengo", "fast", "min").nature).toBe("Timid");
  });

  it("drops the weaker offense for mixed sets below the 70% base-stat threshold", () => {
    const physical = { ...archaludon, moves: ["First Impression", "Surf"] };
    const special = { ...archaludon, moves: ["Iron Head", "Shadow Ball"] };
    expect(buildOpponentPreset(physical, "Golisopod-Mega", "bulky", "physically").nature).toBe("Impish");
    expect(buildOpponentPreset(physical, "Golisopod-Mega", "bulky", "specially").nature).toBe("Careful");
    expect(buildOpponentPreset(physical, "Golisopod-Mega", "offensive", "min").nature).toBe("Adamant");
    expect(buildOpponentPreset(special, "Gholdengo", "bulky", "physically").nature).toBe("Bold");
    expect(buildOpponentPreset(special, "Gholdengo", "bulky", "specially").nature).toBe("Calm");
    expect(buildOpponentPreset(special, "Gholdengo", "offensive", "min").nature).toBe("Modest");
  });

  it("keeps the former Speed drop at exactly 70% and for balanced mixed sets", () => {
    const atThreshold = { ...archaludon, moves: ["Close Combat", "Focus Blast"] };
    const balanced = { ...archaludon, moves: ["Earthquake", "Electro Shot"] };
    expect(buildOpponentPreset(atThreshold, "Falinks", "bulky", "physically").nature).toBe("Relaxed");
    expect(buildOpponentPreset(atThreshold, "Falinks", "offensive", "min").nature).toBe("Brave");
    expect(buildOpponentPreset(balanced, "Archaludon", "bulky", "specially").nature).toBe("Sassy");
    expect(buildOpponentPreset(balanced, "Archaludon", "offensive", "medium").nature).toBe("Quiet");
  });
});

function rawDamageWithoutMegaAbility(
  attacker: ReturnType<typeof makeBattlePokemon>, defender: ReturnType<typeof makeBattlePokemon>,
  move: string, attackerAbility?: string, defenderAbility?: string
) {
  const gen = Generations.get(0);
  const toPokemon = (battle: ReturnType<typeof makeBattlePokemon>, ability: string | undefined) => new Pokemon(gen, battle.forme, {
    level: 50, ability, item: battle.member.item, nature: battle.member.nature,
    evs: battle.member.evs, ivs: battle.member.ivs
  });
  return calculate(gen, toPokemon(attacker, attackerAbility ?? attacker.abilityOverride), toPokemon(defender, defenderAbility ?? defender.abilityOverride), new Move(gen, move), new Field({ gameType: "Doubles" })).range()[1];
}
