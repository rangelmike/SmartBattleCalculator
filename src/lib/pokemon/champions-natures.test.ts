import { describe, expect, it } from "vitest";
import { championsNatures, getNatureForStats, getNatureOptionLabel, getNatureStatPair, natureStatIds } from "@/lib/pokemon/champions-data";
import type { PokemonNature } from "@/lib/pokemon/types";

describe("Champions nature controls", () => {
  it("maps every allowed raise/lower pair to exactly one valid nature", () => {
    const selected = natureStatIds.flatMap((plus) => natureStatIds.map((minus) => getNatureForStats(plus, minus)));
    expect(selected).toHaveLength(25);
    expect(new Set(selected).size).toBe(25);
    expect(selected.every((nature) => nature !== null && championsNatures.includes(nature))).toBe(true);
    expect(getNatureForStats("hp", "atk")).toBeNull();
    expect(getNatureForStats("atk", "hp")).toBeNull();
  });

  it("shows both stat abbreviations, including the neutral same-stat pair", () => {
    expect(getNatureOptionLabel("Adamant")).toBe("Adamant (+Atk / -SpA)");
    expect(getNatureStatPair("Serious")).toEqual({ plus: "spe", minus: "spe" });
    expect(getNatureForStats("spe", "spe")).toBe("Serious" satisfies PokemonNature);
    expect(getNatureOptionLabel("Serious")).toBe("Serious (+Spe / -Spe)");
  });
});
