import { describe, expect, it } from "vitest";
import { parseShowdownPaste } from "@/lib/pokemon/showdown-parser";

describe("parseShowdownPaste", () => {
  it("parses a basic Showdown/Pokepaste export", () => {
    const team = parseShowdownPaste(`Miraidon @ Choice Specs
Ability: Hadron Engine
Level: 50
Tera Type: Electric
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Electro Drift
- Draco Meteor
- Volt Switch
- Protect`);

    expect(team.members).toHaveLength(1);
    expect(team.members[0]).toMatchObject({
      species: "Miraidon",
      item: "Choice Specs",
      ability: "Hadron Engine",
      teraType: "Electric",
      nature: "Timid"
    });
    expect(team.members[0].moves).toContain("Electro Drift");
    expect(team.members[0].evs.spa).toBe(252);
  });

  it("parses nicknames without losing the species", () => {
    const team = parseShowdownPaste(`Bulky Bike (Miraidon) @ Assault Vest
Ability: Hadron Engine
Level: 50
EVs: 252 HP / 4 Def / 252 SpA
Modest Nature
- Electro Drift`);

    expect(team.members[0]).toMatchObject({
      name: "Bulky Bike",
      species: "Miraidon",
      item: "Assault Vest"
    });
  });

  it("rejects empty input", () => {
    expect(() => parseShowdownPaste("   ")).toThrow(/empty/i);
  });
});
