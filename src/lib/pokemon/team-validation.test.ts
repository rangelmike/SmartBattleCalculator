import { describe, expect, it } from "vitest";
import { validatePokemonTeam } from "@/lib/pokemon/team-validation";
import type { PokemonTeam } from "@/lib/pokemon/types";

const validTeam: PokemonTeam = {
  format: "vgc",
  members: [
    {
      name: "Miraidon",
      species: "Miraidon",
      level: 50,
      evs: { hp: 4, spa: 252, spe: 252 },
      ivs: {},
      moves: ["Electro Drift", "Protect"]
    }
  ]
};

describe("validatePokemonTeam", () => {
  it("accepts a valid imported team", () => {
    expect(validatePokemonTeam(validTeam)).toEqual({ ok: true, errors: [] });
  });

  it("rejects teams with invalid EV totals", () => {
    const result = validatePokemonTeam({
      ...validTeam,
      members: [
        {
          ...validTeam.members[0],
          evs: { hp: 252, atk: 252, def: 252 }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/total EV limit/i);
  });

  it("rejects Pokemon without moves", () => {
    const result = validatePokemonTeam({
      ...validTeam,
      members: [{ ...validTeam.members[0], moves: [] }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/move/i);
  });
});
