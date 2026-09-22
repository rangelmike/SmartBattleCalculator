import { describe, expect, it } from "vitest";
import {
  completePokemonTerm,
  filterTeams,
  getPokemonSuggestions,
  getSourceSuggestions,
  getTeamSources
} from "@/lib/pokemon/team-search";
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

  it("ranks source suggestions by the number of saved teams", () => {
    const another = savedTeam("rain-2", "Rain 2", "Torneo CDMX", ["Pelipper"]);
    const rare = savedTeam("rare", "Rare", "Torneo Norte", ["Persian"]);
    expect(getSourceSuggestions([rain, sun, another, rare], "tor")).toEqual([
      { name: "Torneo CDMX", teamCount: 2 },
      { name: "Torneo Norte", teamCount: 1 }
    ]);
    expect(getSourceSuggestions([rain, sun, another, rare], "")).toEqual([]);
  });

  it("ranks Pokemon suggestions and completes the active comma-separated term", () => {
    const another = savedTeam("rain-2", "Rain 2", "Ladder", ["Pelipper", "Archaludon"]);
    const rare = savedTeam("rare", "Rare", "Ladder", ["Persian"]);
    const choices = getPokemonSuggestions([rain, another, sun, rare], "P");
    expect(choices[0]).toEqual({ name: "Pelipper", teamCount: 2 });
    expect(choices[1]).toEqual({ name: "Persian", teamCount: 1 });
    expect(getPokemonSuggestions([rain, another, sun], "Pelipper, Arch")).toEqual([
      { name: "Archaludon", teamCount: 2 }
    ]);
    const completed = completePokemonTerm("Pelipper, Arch", "Archaludon");
    expect(completed.value).toBe("Pelipper, Archaludon");
    expect(filterTeams([rain, another, sun], { text: "", pokemon: completed.value })).toEqual([rain, another]);
  });

  it("completes a Pokemon term in the middle without changing other terms", () => {
    const query = "Pelipper, Arch, Torkoal";
    const caret = query.indexOf("Arch") + 4;
    expect(completePokemonTerm(query, "Archaludon", caret).value).toBe("Pelipper, Archaludon, Torkoal");
    expect(getPokemonSuggestions([rain, sun], "Pelipper, Peli")).toEqual([]);
  });
});
