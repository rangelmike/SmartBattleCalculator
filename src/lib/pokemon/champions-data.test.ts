import { describe, expect, it } from "vitest";
import { parseShowdownPaste } from "@/lib/pokemon/showdown-parser";
import {
  createChampionsMember,
  getChampionsFormeAbility,
  getChampionsItemIconUrl,
  loadChampionsPokemonRules,
  validateChampionsTeam
} from "@/lib/pokemon/champions-data";

const validPaste = `Grimmsnarl @ Light Clay
Ability: Prankster
Level: 50
EVs: 32 HP / 20 Def / 14 SpD
Calm Nature
- Foul Play
- Parting Shot
- Reflect
- Light Screen`;

describe("Pokemon Champions legality", () => {
  it.each([
    ["Golisopod-Mega", "Tough Claws"],
    ["Lucario-Mega-Z", "Aura Guard"],
    ["Absol-Mega-Z", "Sharpness"],
    ["Garchomp-Mega-Z", "Levitate"],
    ["Baxcalibur-Mega", "Thermal Exchange"],
    ["Hawlucha-Mega", "No Guard"],
    ["Skarmory-Mega", "Stalwart"]
  ])("uses the Champions ability for %s", async (forme, ability) => {
    expect((await loadChampionsPokemonRules(forme)).abilities).toEqual([ability]);
    expect(getChampionsFormeAbility(forme)).toBe(ability);
  });

  it("loads abilities and learned moves for a Champions Pokemon", async () => {
    const rules = await loadChampionsPokemonRules("Grimmsnarl");
    expect(rules.abilities).toContain("Prankster");
    expect(rules.moves).toEqual(expect.arrayContaining(["Foul Play", "Reflect", "Light Screen"]));
  });

  it("accepts a legal level 50 Champions set", async () => {
    await expect(validateChampionsTeam(parseShowdownPaste(validPaste, "champions"))).resolves.toEqual({ ok: true, errors: [] });
  });

  it("rejects illegal species, moves, abilities and SP totals", async () => {
    const team = parseShowdownPaste(validPaste, "champions");
    team.members[0] = {
      ...team.members[0],
      ability: "Overgrow",
      moves: ["Spacial Rend"],
      evs: { hp: 32, atk: 32, def: 32 }
    };

    const result = await validateChampionsTeam(team);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/total 66 SP\/EV limit/i);
    expect(result.errors.join(" ")).toMatch(/ability/i);
    expect(result.errors.join(" ")).toMatch(/cannot learn/i);
  });

  it("uses the requested Pokemon Showdown item icon directory", () => {
    expect(getChampionsItemIconUrl("Light Clay")).toBe("https://play.pokemonshowdown.com/sprites/itemicons/light-clay.png");
    expect(getChampionsItemIconUrl("Swampertite")).toBe("https://play.pokemonshowdown.com/sprites/misc/mega.png");
  });

  it("resets a set when a new Champions species is selected", async () => {
    const member = await createChampionsMember("Pelipper");

    expect(member).toMatchObject({
      name: "Pelipper",
      species: "Pelipper",
      level: 50,
      nature: "Serious",
      evs: {},
      ivs: {},
      moves: []
    });
    expect(member.ability).toBeTruthy();
    expect(member.item).toBeUndefined();
  });
});
