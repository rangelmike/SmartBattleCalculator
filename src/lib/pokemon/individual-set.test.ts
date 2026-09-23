import { describe, expect, it } from "vitest";
import { createChampionsMember, loadChampionsPokemonRules } from "@/lib/pokemon/champions-data";
import { makeBattlePokemon } from "@/lib/pokemon/damage-calculation";
import { applyIndividualSetDefault, memberForSavedTeam } from "@/lib/pokemon/individual-set";

describe("individual Pokemon defaults", () => {
  it("loads all saved popular-set fields as the individual default", async () => {
    const rules = await loadChampionsPokemonRules("Pelipper");
    const base = await createChampionsMember("Pelipper");
    const selected = applyIndividualSetDefault(base, rules, {
      item: "Sitrus Berry", ability: "Drizzle", nature: "Modest",
      evs: { hp: 32, def: 1, spa: 5, spd: 17, spe: 11 },
      moves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"]
    }, []);
    expect(selected).toMatchObject({
      species: "Pelipper", item: "Sitrus Berry", ability: "Drizzle", nature: "Modest",
      evs: { hp: 32, def: 1, spa: 5, spd: 17, spe: 11 },
      moves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"]
    });
  });

  it("starts with a legal item and four learnable moves when no popular set exists", async () => {
    const rules = await loadChampionsPokemonRules("Pelipper");
    const base = await createChampionsMember("Pelipper");
    const selected = applyIndividualSetDefault(base, rules, null, ["Sitrus Berry"]);
    expect(selected.item).toBe("Leftovers");
    expect(selected.nature).toBe("Modest");
    expect(selected.evs).toEqual({ spa: 32, hp: 32, spd: 2 });
    expect(selected.moves).toHaveLength(4);
    expect(selected.moves.every((move) => rules.moves.includes(move))).toBe(true);
  });

  it("uses Speed at 75 base or above and breaks an offensive tie toward Attack", async () => {
    const rules = await loadChampionsPokemonRules("Altaria");
    const base = await createChampionsMember("Altaria");
    const selected = applyIndividualSetDefault(base, rules, null, []);
    expect(selected.nature).toBe("Adamant");
    expect(selected.evs).toEqual({ atk: 32, spe: 32, hp: 2 });
    const exactThresholdRules = await loadChampionsPokemonRules("Absol");
    const exactThreshold = applyIndividualSetDefault(await createChampionsMember("Absol"), exactThresholdRules, null, []);
    expect(exactThreshold.evs).toEqual({ atk: 32, spe: 32, hp: 2 });
  });

  it("breaks a defensive tie toward Defense, assigning the two spare points to SpD", async () => {
    const rules = await loadChampionsPokemonRules("Beartic");
    const base = await createChampionsMember("Beartic");
    const selected = applyIndividualSetDefault(base, rules, null, []);
    expect(selected.nature).toBe("Adamant");
    expect(selected.evs).toEqual({ atk: 32, hp: 32, spd: 2 });
  });

  it("keeps a Mega stone set on its base species when saved", async () => {
    const base = await createChampionsMember("Charizard");
    const mega = makeBattlePokemon({ ...base, item: "Charizardite Y", moves: ["Heat Wave"] });
    expect(mega.forme).toBe("Charizard-Mega-Y");
    expect(memberForSavedTeam(mega).species).toBe("Charizard");
    expect(memberForSavedTeam(mega).ability).toBe(base.ability);
  });
});
