import { describe, expect, it } from "vitest";
import {
  battleBoostKey, clearBattleBoost, clearSideBattleBoosts, getBoostedStat, setBattleBoost, withBattleBoosts
} from "@/lib/pokemon/battle-boosts";
import { makeBattlePokemon } from "@/lib/pokemon/damage-calculation";

const pokemon = makeBattlePokemon({
  name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry",
  nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"]
}, "pelipper");

describe("temporary battle stages", () => {
  it("keeps each Pokemon's stages independently and clears only the requested scope", () => {
    let state = setBattleBoost({}, "own", "pelipper", "spa", 2);
    state = setBattleBoost(state, "own", "charizard", "atk", -3);
    state = setBattleBoost(state, "opponent", "pelipper", "def", 6);
    expect(state[battleBoostKey("own", "pelipper")]).toEqual({ spa: 2 });
    expect(withBattleBoosts(pokemon, state[battleBoostKey("own", "pelipper")]).boosts).toEqual({ spa: 2 });
    expect(setBattleBoost(state, "own", "pelipper", "spa", 7)).toBe(state);
    expect(setBattleBoost(state, "own", "pelipper", "spa", -7)).toBe(state);
    state = clearBattleBoost(state, "own", "pelipper");
    expect(state[battleBoostKey("own", "pelipper")]).toBeUndefined();
    expect(state[battleBoostKey("own", "charizard")]).toEqual({ atk: -3 });
    state = clearSideBattleBoosts(state, "own");
    expect(state).toEqual({ [battleBoostKey("opponent", "pelipper")]: { def: 6 } });
  });

  it("shows the standard stat-stage multipliers", () => {
    expect(getBoostedStat(100, -6)).toBe(25);
    expect(getBoostedStat(100, -2)).toBe(50);
    expect(getBoostedStat(100, 0)).toBe(100);
    expect(getBoostedStat(100, 2)).toBe(200);
    expect(getBoostedStat(100, 6)).toBe(400);
  });
});
