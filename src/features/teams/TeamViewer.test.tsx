import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamViewer } from "@/features/teams/TeamViewer";
import type { SavedTeam } from "@/lib/pokemon/team-import";

const team: SavedTeam = {
  id: "team-1",
  ownerId: "user-1",
  name: "Rain",
  source: "Regional",
  pasteText: "",
  teamHash: "hash-1",
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
  team: {
    format: "champions",
    members: [{
      name: "Swampert",
      species: "Swampert",
      item: "Swampertite",
      ability: "Damp",
      level: 50,
      nature: "Adamant",
      evs: { hp: 18, atk: 30, spe: 18 },
      ivs: {},
      moves: ["Protect"]
    }]
  }
};

describe("team viewer", () => {
  it("defaults to Mega stats and can switch to the regular form", () => {
    render(<TeamViewer team={team} />);
    expect(screen.getByRole("button", { name: "Mega" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Base 150")).toBeVisible();
    expect(screen.getByText("Level 50 · Champions")).toBeVisible();
    expect(screen.getByRole("img", { name: "Swampert-Mega" })).toHaveAttribute(
      "src", "https://play.pokemonshowdown.com/sprites/ani/swampert-mega.gif"
    );
    fireEvent.click(screen.getByRole("button", { name: "Normal" }));
    expect(screen.getByText("Base 110")).toBeVisible();
  });

  it("keeps the form switch for older teams saved with a VGC format", () => {
    render(<TeamViewer team={{ ...team, team: { ...team.team, format: "vgc" } }} />);
    expect(screen.getByRole("button", { name: "Mega" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Swampert-Mega" })).toHaveAttribute(
      "src", "https://play.pokemonshowdown.com/sprites/ani/swampert-mega.gif"
    );
    expect(screen.getByText("Base 150")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Normal" }));
    expect(screen.getByRole("img", { name: "Swampert" })).toHaveAttribute(
      "src", "https://play.pokemonshowdown.com/sprites/ani/swampert.gif"
    );
    expect(screen.getByText("Base 110")).toBeVisible();
  });

  it.each([
    ["Charizard", "Charizardite X", "Charizard-Mega-X"],
    ["Charizard", "Charizardite Y", "Charizard-Mega-Y"],
    ["Lucario", "Lucarionite Z", "Lucario-Mega-Z"]
  ])("defaults to %s Mega form with %s", (species, item, megaSpecies) => {
    const member = { ...team.team.members[0], name: species, species, item };
    render(<TeamViewer team={{ ...team, team: { ...team.team, members: [member] } }} />);
    expect(screen.getByRole("button", { name: "Mega" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: megaSpecies })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Normal" }));
    expect(screen.getByRole("img", { name: species })).toBeVisible();
  });
});
