import { describe, expect, it } from "vitest";
import {
  battleHpKey, clearBattleCurrentHp, clearSideBattleHp, setBattleCurrentHp, withBattleCurrentHp
} from "@/lib/pokemon/battle-hp";
import { getMaxHp, makeBattlePokemon } from "@/lib/pokemon/damage-calculation";

const pelipper = makeBattlePokemon({
  name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry",
  nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"]
}, "pelipper");

describe("temporary current HP", () => {
  it("keeps each Pokemon's HP independently until reset or a new battle", () => {
    let state = setBattleCurrentHp({}, "own", pelipper, 47);
    state = setBattleCurrentHp(state, "opponent", pelipper, 20);
    expect(withBattleCurrentHp(pelipper, state[battleHpKey("own", pelipper.id)]).currentHp).toBe(47);
    expect(withBattleCurrentHp(pelipper, state[battleHpKey("opponent", pelipper.id)]).currentHp).toBe(20);
    state = clearBattleCurrentHp(state, "own", pelipper.id);
    expect(withBattleCurrentHp(pelipper, state[battleHpKey("own", pelipper.id)]).currentHp).toBe(getMaxHp(pelipper));
    expect(state[battleHpKey("opponent", pelipper.id)]).toBeDefined();
    expect(clearSideBattleHp(state, "opponent")).toEqual({});
  });

  it("scales temporary HP when maximum HP changes and removes a full-HP override", () => {
    const half = Math.round(getMaxHp(pelipper) / 2);
    const state = setBattleCurrentHp({}, "own", pelipper, half);
    const bulkier = { ...pelipper, member: { ...pelipper.member, evs: { hp: 32 } } };
    expect(withBattleCurrentHp(bulkier, state[battleHpKey("own", pelipper.id)]).currentHp)
      .toBe(Math.round(getMaxHp(bulkier) * half / getMaxHp(pelipper)));
    expect(setBattleCurrentHp(state, "own", pelipper, getMaxHp(pelipper))).toEqual({});
    expect(setBattleCurrentHp(state, "own", pelipper, -5)[battleHpKey("own", pelipper.id)]).toBe(0);
  });
});
