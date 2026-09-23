import { describe, expect, it } from "vitest";
import { moveTeamMember, movedSelectedIndex } from "@/lib/pokemon/team-order";

describe("team member order", () => {
  it("moves members without mutating the saved team and keeps the selection", () => {
    const members = ["Pelipper", "Swampert", "Archaludon", "Metagross"];
    const reordered = moveTeamMember(members, 0, 2);
    expect(reordered).toEqual(["Swampert", "Archaludon", "Pelipper", "Metagross"]);
    expect(members).toEqual(["Pelipper", "Swampert", "Archaludon", "Metagross"]);
    expect(movedSelectedIndex(0, 0, 2)).toBe(2);
    expect(movedSelectedIndex(2, 0, 2)).toBe(1);
    expect(movedSelectedIndex(3, 0, 2)).toBe(3);
  });

  it("ignores invalid drops", () => {
    const members = ["Pelipper", "Swampert"];
    expect(moveTeamMember(members, -1, 0)).toBe(members);
    expect(moveTeamMember(members, 0, 2)).toBe(members);
  });
});
