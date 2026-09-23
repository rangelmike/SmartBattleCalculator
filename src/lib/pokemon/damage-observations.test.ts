import { describe, expect, it } from "vitest";
import { calculateDamage, defaultBattleField, getMaxHp, makeBattlePokemon } from "@/lib/pokemon/damage-calculation";
import { estimateOpponentSet, type DamageObservation } from "@/lib/pokemon/damage-observations";
import { getNatureModifiers } from "@/lib/pokemon/champions-data";
import type { TeamMember } from "@/lib/pokemon/types";

const pelipper: TeamMember = {
  name: "Pelipper", species: "Pelipper", level: 50, item: "Sitrus Berry", ability: "Drizzle",
  nature: "Modest", evs: { hp: 32, spa: 5 }, ivs: {}, moves: ["Hurricane", "Weather Ball"]
};
const archaludon: TeamMember = {
  name: "Archaludon", species: "Archaludon", level: 50, item: "Leftovers", ability: "Stamina",
  nature: "Modest", evs: { hp: 32, spd: 29, spa: 1 }, ivs: {}, moves: ["Electro Shot", "Dragon Pulse"]
};
const metagross: TeamMember = {
  name: "Metagross", species: "Metagross", level: 50, item: "Metagrossite",
  ability: "Clear Body", nature: "Jolly", evs: { atk: 27, spe: 25, hp: 14 }, ivs: {}, moves: ["Iron Head"]
};

describe("damage observations", () => {
  it("fits damage given and received by the same rival across known team members", () => {
    const field = defaultBattleField();
    field.weather = "Rain";
    const own = makeBattlePokemon(pelipper, "own-pelipper");
    const secondOwn = makeBattlePokemon(metagross, "own-metagross");
    const trueOpponent = makeBattlePokemon(archaludon, "opponent-archaludon");
    const unknown = makeBattlePokemon({ ...archaludon, nature: "Serious", evs: {} }, "opponent-archaludon");
    const dealt = calculateDamage(own, trueOpponent, "Hurricane", "own", field)!;
    const received = calculateDamage(trueOpponent, own, "Electro Shot", "opponent", field)!;
    const secondDealt = calculateDamage(secondOwn, trueOpponent, "Iron Head", "own", field)!;
    const observations: DamageObservation[] = [
      { id: "given", opponentId: trueOpponent.id, own, opponent: trueOpponent, attackerSide: "own", move: "Hurricane", damage: percent(dealt.rolls[6], trueOpponent), unit: "percent", field },
      { id: "received", opponentId: trueOpponent.id, own, opponent: trueOpponent, attackerSide: "opponent", move: "Electro Shot", damage: Math.min(received.rolls[9], own.currentHp), unit: "hp", field },
      { id: "second-own", opponentId: trueOpponent.id, own: secondOwn, opponent: trueOpponent, attackerSide: "own", move: "Iron Head", damage: percent(secondDealt.rolls[3], trueOpponent), unit: "percent", field }
    ];
    const estimate = estimateOpponentSet(unknown, observations);
    expect(estimate?.total).toBe(3);
    expect(estimate?.matched).toBe(3);
    expect(estimate?.member.level).toBe(50);
    expect(Object.values(estimate?.member.evs ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)).toBe(66);
  });

  it("treats a knockout as HP actually lost rather than uncapped theoretical damage", () => {
    const own = makeBattlePokemon(pelipper, "own-pelipper");
    const opponent = { ...makeBattlePokemon(archaludon, "opponent-archaludon"), currentHp: 10 };
    const observation: DamageObservation = {
      id: "ko", opponentId: opponent.id, own, opponent, attackerSide: "own",
      move: "Hurricane", damage: percent(10, opponent), unit: "percent", field: defaultBattleField()
    };
    expect(estimateOpponentSet(opponent, [observation])?.matched).toBe(1);
  });

  it("uses a full EV spread and a nature appropriate for special, physical, or mixed attacks", () => {
    const own = makeBattlePokemon(pelipper, "own");
    for (const [member, forbiddenMinus] of [
      [archaludon, "spa"], [metagross, "atk"], [{ ...archaludon, moves: ["Electro Shot", "Body Press"] }, "spe"]
    ] as [TeamMember, string][]) {
      const opponent = makeBattlePokemon(member, `opponent-${forbiddenMinus}`);
      const observation: DamageObservation = {
        id: forbiddenMinus, opponentId: opponent.id, own, opponent,
        attackerSide: "opponent", move: member.moves[0], damage: 1, unit: "hp", field: defaultBattleField()
      };
      const estimate = estimateOpponentSet(opponent, [observation]);
      expect(Object.values(estimate?.member.evs ?? {}).reduce((sum, ev) => sum + (ev ?? 0), 0)).toBe(66);
      const minus = getNatureModifiers(estimate?.member.nature).minus;
      if (forbiddenMinus === "spe") expect(minus).toBe("spe");
      else expect(minus).not.toBe(forbiddenMinus);
    }
  });
});

function percent(damage: number, pokemon: ReturnType<typeof makeBattlePokemon>) {
  return Math.round(Math.min(damage, pokemon.currentHp) / getMaxHp(pokemon) * 1000) / 10;
}
