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
import { recoveryAwareKoChance } from "@/lib/pokemon/hp-effects";
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
    const result = calculateDamage(makeBattlePokemon(pelipper), makeBattlePokemon({ ...archaludon, item: "" }), "Acrobatics", "own", defaultBattleField());
    expect(result?.koChance).toContain("hits to KO");
    expect(result?.description).toContain(" -- ");
  });

  it("does not claim a finite KO when passive healing offsets a weak attack", () => {
    const result = calculateDamage(makeBattlePokemon(pelipper), makeBattlePokemon(archaludon), "Acrobatics", "own", defaultBattleField());
    expect(result?.koChance).toContain("no KO within 30 hits after Leftovers recovery");
  });

  it("shows damage-based recoil and draining as percentages of the user's HP", () => {
    const attacker = makeBattlePokemon({ ...pelipper, moves: ["Wave Crash", "Giga Drain"], item: "" });
    const defender = makeBattlePokemon({ ...archaludon, item: "" });
    const field = defaultBattleField();
    const recoil = calculateDamage(attacker, defender, "Wave Crash", "own", field)!;
    const drain = calculateDamage(attacker, defender, "Giga Drain", "own", field)!;
    expect(recoil.recoil?.minPercent).toBeGreaterThan(0);
    expect(recoil.recoil?.maxPercent).toBeGreaterThanOrEqual(recoil.recoil!.minPercent);
    expect(recoil.healing).toBeUndefined();
    expect(drain.healing?.minPercent).toBeGreaterThan(0);
    expect(drain.recoil).toBeUndefined();
  });

  it("shows self-healing moves, including weather and delayed healing, without attributing Heal Pulse to the user", () => {
    const attacker = makeBattlePokemon({ ...pelipper, moves: ["Recover", "Synthesis", "Wish", "Heal Pulse"] });
    const defender = makeBattlePokemon(archaludon);
    const field = defaultBattleField();
    expect(calculateDamage(attacker, defender, "Recover", "own", field)?.healing?.minPercent).toBeGreaterThan(49);
    expect(calculateDamage(attacker, defender, "Roost", "own", field)?.healing?.minPercent).toBeGreaterThan(49);
    expect(calculateDamage(attacker, defender, "Life Dew", "own", field)?.healing?.minPercent).toBeGreaterThan(24);
    expect(calculateDamage(attacker, defender, "Rest", "own", field)?.healing?.minPercent).toBe(100);
    expect(calculateDamage(attacker, defender, "Wish", "own", field)?.healing?.timing).toBe("next turn");
    expect(calculateDamage(attacker, defender, "Heal Pulse", "own", field)?.healing).toBeUndefined();
    const clear = calculateDamage(attacker, defender, "Synthesis", "own", field)!.healing!.minPercent;
    field.weather = "Rain";
    const rainy = calculateDamage(attacker, defender, "Synthesis", "own", field)!.healing!.minPercent;
    field.weather = "Sun";
    const sunny = calculateDamage(attacker, defender, "Synthesis", "own", field)!.healing!.minPercent;
    expect(rainy).toBeLessThan(clear);
    expect(sunny).toBeGreaterThan(clear);
  });

  it("handles fixed HP cost and Strength Sap's target-dependent recovery", () => {
    const attacker = makeBattlePokemon({ ...pelipper, item: "" });
    const defender = makeBattlePokemon({ ...archaludon, item: "" });
    const field = defaultBattleField();
    expect(calculateDamage(attacker, defender, "Steel Beam", "own", field)?.recoil).toEqual({ minPercent: 50, maxPercent: 50 });
    const unboosted = calculateDamage(attacker, defender, "Strength Sap", "own", field)?.healing?.minPercent;
    const boosted = calculateDamage(attacker, { ...defender, boosts: { atk: 2 } }, "Strength Sap", "own", field)?.healing?.minPercent;
    expect(unboosted).toBeGreaterThan(0);
    expect(boosted).toBeGreaterThanOrEqual(unboosted!);
  });

  it("includes one-use Sitrus Berry and passive recovery in hits-to-KO projections", () => {
    const attacker = makeBattlePokemon({ ...pelipper, item: "" });
    const base = makeBattlePokemon({ ...archaludon, item: "", ability: "Stamina" });
    const defender = { ...base, currentHp: 100 };
    const field = defaultBattleField();
    const plain = calculateDamage(attacker, defender, "Hurricane", "own", field)!;
    const sitrus = calculateDamage(attacker, { ...defender, member: { ...defender.member, item: "Sitrus Berry" } }, "Hurricane", "own", field)!;
    const leftovers = calculateDamage(attacker, { ...defender, member: { ...defender.member, item: "Leftovers" } }, "Hurricane", "own", field)!;
    expect(plain.koChance).toContain("HKO");
    expect(sitrus.koChance).toContain("Sitrus Berry recovery");
    expect(leftovers.koChance).toContain("Leftovers recovery");
    expect(Number(sitrus.koChance.match(/(\d+)HKO/)?.[1])).toBeGreaterThan(Number(plain.koChance.match(/(\d+)HKO/)?.[1]));
    expect(sitrus.description).toContain(sitrus.koChance);
  });

  it("consumes Sitrus Berry only once and combines independent recovery sources", () => {
    const gen = Generations.get(0);
    const attacker = new Pokemon(gen, "Pelipper", { level: 50 });
    const defender = new Pokemon(gen, "Archaludon", {
      level: 50, ability: "Rain Dish", item: "Sitrus Berry", curHP: 100
    });
    const move = new Move(gen, "Hurricane");
    const field = defaultBattleField();
    expect(recoveryAwareKoChance([40], attacker, defender, move, field, field.opponent))
      .toBe("guaranteed 4HKO after Sitrus Berry recovery");

    field.weather = "Rain";
    field.terrain = "Grassy";
    const combined = recoveryAwareKoChance([40], attacker, defender, move, field, field.opponent);
    expect(combined).toContain("Sitrus Berry + Rain Dish + Grassy Terrain recovery");
    expect(Number(combined?.match(/(\d+)HKO/)?.[1])).toBeGreaterThan(4);
  });

  it("applies Grassy Terrain only while grounded and Rain Dish only in rain", () => {
    const attacker = makeBattlePokemon({ ...pelipper, item: "" });
    const groundDefender = makeBattlePokemon({ ...archaludon, item: "", ability: "Rain Dish" });
    const flyingDefender = makeBattlePokemon({ ...pelipper, item: "", ability: "Drizzle" });
    const field = defaultBattleField();
    field.terrain = "Grassy";
    expect(calculateDamage(attacker, groundDefender, "Hurricane", "own", field)?.koChance).toContain("Grassy Terrain recovery");
    expect(calculateDamage(attacker, flyingDefender, "Hurricane", "own", field)?.koChance).not.toContain("Grassy Terrain recovery");
    field.terrain = "";
    field.weather = "Rain";
    expect(calculateDamage(attacker, groundDefender, "Hurricane", "own", field)?.koChance).toContain("Rain Dish recovery");
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
