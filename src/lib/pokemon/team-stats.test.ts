import { describe, expect, it } from "vitest";
import {
  calculateLevel50Stats,
  getChampionsMegaSpecies,
  getChampionsMoveDetails,
  getPokemonSpriteUrl,
  inferPokemonStatModel
} from "@/lib/pokemon/team-stats";
import type { TeamMember } from "@/lib/pokemon/types";

describe("team stats", () => {
  it("calculates standard level 50 stats with EVs, IVs and nature", () => {
    const member: TeamMember = {
      name: "Miraidon",
      species: "Miraidon",
      level: 50,
      nature: "Timid",
      evs: { hp: 4, spa: 252, spe: 252 },
      ivs: {},
      moves: ["Electro Drift"]
    };

    expect(calculateLevel50Stats(member)).toMatchObject({
      model: "standard",
      stats: { hp: 176, spa: 187, spe: 205 }
    });
  });

  it("uses the Pokemon Champions stat model for 0-32 point spreads", () => {
    const member: TeamMember = {
      name: "Grimmsnarl",
      species: "Grimmsnarl",
      level: 50,
      nature: "Calm",
      evs: { hp: 32, def: 20, spd: 14 },
      ivs: {},
      moves: ["Reflect"]
    };

    expect(inferPokemonStatModel(member.evs)).toBe("champions");
    expect(calculateLevel50Stats(member)).toMatchObject({
      model: "champions",
      stats: { hp: 202, atk: 126, def: 105, spa: 115, spd: 119, spe: 80 }
    });
  });

  it("builds a sprite URL from Pokedex data", () => {
    expect(getPokemonSpriteUrl("Pelipper")).toBe("https://play.pokemonshowdown.com/sprites/ani/pelipper.gif");
    expect(getPokemonSpriteUrl("Swampert-Mega")).toBe("https://play.pokemonshowdown.com/sprites/ani/swampert-mega.gif");
  });

  it("offers Mega only for a matching stone and a Champions form", () => {
    expect(getChampionsMegaSpecies({ species: "Swampert", item: "Swampertite" })).toBe("Swampert-Mega");
    expect(getChampionsMegaSpecies({ species: "Metagross", item: "Metagrossite" })).toBe("Metagross-Mega");
    expect(getChampionsMegaSpecies({ species: "Swampert", item: "Light Clay" })).toBeNull();
    expect(getChampionsMegaSpecies({ species: "Swampert", item: "Salamencite" })).toBeNull();
    expect(getChampionsMegaSpecies({ species: "Grimmsnarl", item: "Grimmsnarlite" })).toBeNull();
  });

  it("recalculates level 50 stats using the selected Mega form", () => {
    const member: TeamMember = {
      name: "Swampert",
      species: "Swampert",
      item: "Swampertite",
      level: 50,
      nature: "Adamant",
      evs: { hp: 18, atk: 30, spe: 18 },
      ivs: {},
      moves: ["Wave Crash"]
    };

    const normal = calculateLevel50Stats(member, { model: "champions" }).stats;
    const mega = calculateLevel50Stats(member, { model: "champions", species: "Swampert-Mega" }).stats;
    expect(mega.hp).toBe(normal.hp);
    expect(mega.atk).toBeGreaterThan(normal.atk);
    expect(mega.spe).toBeGreaterThan(normal.spe);
  });

  it("shows Champions move power and accuracy, including format overrides", () => {
    expect(getChampionsMoveDetails("Hurricane")).toEqual({ power: "110", accuracy: "70%" });
    expect(getChampionsMoveDetails("Gear Grind")).toEqual({ power: "60", accuracy: "90%" });
    expect(getChampionsMoveDetails("Protect")).toEqual({ power: "—", accuracy: "Always" });
    expect(getChampionsMoveDetails("Tailwind")).toEqual({ power: "—", accuracy: "Always" });
  });
});
