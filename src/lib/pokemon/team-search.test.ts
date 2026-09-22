import { describe, expect, it } from "vitest";
import { filterTeams, getTeamSources } from "@/lib/pokemon/team-search";
import type { SavedTeam, TeamLibrary } from "@/lib/pokemon/team-import";

function savedTeam(id: string, name: string, source: string, species: string[]): SavedTeam {
  return {
    id,
    ownerId: "user-1",
    name,
    source,
    pasteText: "paste",
    teamHash: `hash-${id}`,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    team: {
      format: "vgc",
      members: species.map((name) => ({ name, species: name, level: 50, evs: {}, ivs: {}, moves: ["Protect"] }))
    }
  };
}

const rain = savedTeam("rain", "Lluvia regional", "Torneo CDMX", ["Pelipper", "Archaludon"]);
const sun = savedTeam("sun", "Sol ofensivo", "Ladder", ["Torkoal", "Lilligant"]);

describe("team search", () => {
  it("filters by team name or source", () => {
    expect(filterTeams([rain, sun], { text: "regional", pokemon: "" })).toEqual([rain]);
    expect(filterTeams([rain, sun], { text: "cdmx", pokemon: "" })).toEqual([rain]);
  });

  it("requires every comma-separated Pokemon", () => {
    expect(filterTeams([rain, sun], { text: "", pokemon: "Pelipper, Archaludon" })).toEqual([rain]);
    expect(filterTeams([rain, sun], { text: "", pokemon: "Pelipper, Torkoal" })).toEqual([]);
  });

  it("returns unique reusable sources", () => {
    const library: TeamLibrary = { own: [rain], opponent: [rain, sun] };
    expect(getTeamSources(library)).toEqual(["Ladder", "Torneo CDMX"]);
  });
});
