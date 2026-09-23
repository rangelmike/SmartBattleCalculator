import { describe, expect, it } from "vitest";
import {
  addPokemonToRoster,
  addPokemonBatchToRoster,
  captureInitialStats,
  emptyCalculatorSession,
  loadRoster,
  readCalculatorSession,
  restoreInitialStats,
  startNewBattle,
  updateRosterPokemon,
  writeCalculatorSession
} from "@/lib/pokemon/calculator-session";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import type { TeamMember } from "@/lib/pokemon/types";

const member: TeamMember = {
  name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry",
  nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"]
};

const team: SavedTeam = {
  id: "team-1", ownerId: "user-1", name: "Rain", source: "Regional",
  pasteText: "", teamHash: "a".repeat(32), createdAt: "", updatedAt: "",
  team: { format: "champions", members: [member] }
};

describe("calculator session", () => {
  it("loads a saved roster and appends individual Pokemon, dropping the last at six", () => {
    let session = loadRoster(emptyCalculatorSession(), "own", team);
    expect(session.own.slots).toHaveLength(1);
    expect(session.own.teamId).toBe(team.id);
    for (let index = 0; index < 6; index += 1) session = addPokemonToRoster(session, "own", member);
    expect(session.own.slots).toHaveLength(6);
    expect(session.own.slots[0].id).toBe("team-1:0");
    expect(session.own.slots.at(-1)?.id).toBe(session.own.selectedId);
    expect(session.own.teamId).toBeNull();
  });

  it("keeps every searched Pokemon when adding several to a full roster", () => {
    let session = emptyCalculatorSession();
    for (let index = 0; index < 6; index += 1) {
      session = addPokemonToRoster(session, "opponent", member, `existing-${index}`);
    }
    const additions = [
      { id: "pelipper-new", member },
      { id: "archaludon-new", member: { ...member, name: "Archaludon", species: "Archaludon", ability: "Stamina" } }
    ];
    const next = addPokemonBatchToRoster(session, "opponent", additions);
    expect(next.opponent.slots.map((slot) => slot.id)).toEqual([
      "existing-0", "existing-1", "existing-2", "existing-3", "pelipper-new", "archaludon-new"
    ]);
    expect(next.opponent.selectedId).toBe("archaludon-new");
    expect(next.opponent.teamId).toBeNull();
  });

  it("starts a new battle without clearing My Team", () => {
    const own = loadRoster(emptyCalculatorSession(), "own", team);
    const both = loadRoster(own, "opponent", team);
    const next = startNewBattle({ ...both, observations: [{ id: "record" }] as never });
    expect(next.own.slots).toHaveLength(1);
    expect(next.opponent.slots).toHaveLength(0);
    expect(next.observations).toEqual([]);
  });

  it("restores the loaded EVs and nature from an in-memory snapshot", () => {
    const loaded = { ...member, nature: "Modest" as const, evs: { hp: 32, spa: 32, spe: 2 } };
    const initial = captureInitialStats(loaded);
    const pokemon = loadRoster(emptyCalculatorSession(), "own", { ...team, team: { ...team.team, members: [loaded] } }).own.slots[0];
    const edited = { ...pokemon, member: { ...pokemon.member, nature: "Timid" as const, evs: { spe: 32 } } };
    const restored = restoreInitialStats(edited, initial);
    expect(restored.member.evs).toEqual({ hp: 32, spa: 32, spe: 2 });
    expect(restored.member.nature).toBe("Modest");
    expect(initial.evs).toEqual({ hp: 32, spa: 32, spe: 2 });
  });

  it("never persists battle stages, temporary HP or observations recorded under them", () => {
    const loaded = loadRoster(emptyCalculatorSession(), "own", team);
    const slot = loaded.own.slots[0];
    const boosted = { ...slot, boosts: { spa: 2 } };
    const updated = updateRosterPokemon(loaded, "own", boosted);
    expect(updated.own.slots[0].boosts).toBeUndefined();
    expect(updated.own.slots[0].currentHp).toBe(slot.currentHp);
    const session = {
      ...updated,
      observations: [{
        id: "boosted", opponentId: "opponent", own: boosted, opponent: slot,
        attackerSide: "own" as const, move: "Hurricane", damage: 20, unit: "percent" as const,
        field: updated.field
      }]
    };
    writeCalculatorSession("stage-test", session);
    expect(readCalculatorSession("stage-test").own.slots[0].boosts).toBeUndefined();
    expect(readCalculatorSession("stage-test").observations).toEqual([]);
    writeCalculatorSession("stage-test", {
      ...loaded,
      own: { ...loaded.own, slots: [{ ...slot, currentHp: 4 }] },
      observations: [{
        id: "temporary-hp", opponentId: "opponent", own: { ...slot, currentHp: 4 }, opponent: slot,
        attackerSide: "own", move: "Hurricane", damage: 20, unit: "percent",
        temporaryBattleState: true, field: loaded.field
      }]
    });
    expect(readCalculatorSession("stage-test").own.slots[0].currentHp).toBe(slot.currentHp);
    expect(readCalculatorSession("stage-test").observations).toEqual([]);
    localStorage.removeItem("sbc.calculator-session.stage-test");
  });

  it("repairs obsolete Mega abilities in a previously saved calculator session", () => {
    const cases = [
      { species: "Golisopod", item: "Golisopite", old: "Emergency Exit", expected: "Tough Claws" },
      { species: "Lucario", item: "Lucarionite Z", old: "Adaptability", expected: "Aura Guard" },
      { species: "Absol", item: "Absolite Z", old: "Magic Bounce", expected: "Sharpness" }
    ];
    const slots = cases.map(({ species, item, old }, index) => {
      const pokemon = loadRoster(emptyCalculatorSession(), "own", {
        ...team, team: { ...team.team, members: [{ ...member, name: species, species, item }] }
      }).own.slots[0];
      return { ...pokemon, id: `old-${index}`, abilityOverride: old };
    });
    const saved = emptyCalculatorSession();
    saved.own = { slots, selectedId: slots[0].id, teamId: null };
    localStorage.setItem("sbc.calculator-session.old-mega-abilities", JSON.stringify(saved));

    expect(readCalculatorSession("old-mega-abilities").own.slots.map((slot) => slot.abilityOverride))
      .toEqual(cases.map(({ expected }) => expected));
    localStorage.removeItem("sbc.calculator-session.old-mega-abilities");
  });

  it("drops a stale Mega override on the regular form", () => {
    const loaded = loadRoster(emptyCalculatorSession(), "own", team);
    const regular = { ...loaded.own.slots[0], abilityOverride: "Tough Claws" };
    const updated = updateRosterPokemon(loaded, "own", regular);
    expect(updated.own.slots[0].abilityOverride).toBeUndefined();
    expect(updated.own.slots[0].member.ability).toBe("Drizzle");
  });
});
