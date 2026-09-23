import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalculatorTeamPicker } from "@/features/calculator/CalculatorTeamPicker";
import type { SavedTeam, TeamLibrary } from "@/lib/pokemon/team-import";

const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/supabase/popular-teams", () => ({
  searchPopularTeams: mocks.search,
  suggestPopularPokemon: vi.fn().mockResolvedValue([]),
  suggestPopularSources: vi.fn().mockResolvedValue([])
}));

function team(id: string, name: string, species: string): SavedTeam {
  return {
    id, ownerId: "user-1", name, source: "Regional", pasteText: "",
    teamHash: id.repeat(32), createdAt: "", updatedAt: "",
    team: { format: "champions", members: [{ name: species, species, level: 50, evs: {}, ivs: {}, moves: ["Protect"] }] }
  };
}

const own = team("1", "My rain", "Pelipper");
const opponent = team("2", "Opponent steel", "Archaludon");
const popular = team("3", "Popular rain", "Pelipper");
const library: TeamLibrary = { own: [own], opponent: [opponent] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue({ teams: [popular], hasMore: false });
});

describe("calculator team picker", () => {
  it("limits My Team to the user's own saved teams", () => {
    render(<CalculatorTeamPicker open side="own" library={library} onClose={vi.fn()} onSelect={vi.fn()} onAddPokemon={vi.fn()} isAdding={false} />);
    expect(screen.getByRole("button", { name: /My rain/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Opponent steel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Popular teams" })).not.toBeInTheDocument();
  });

  it("searches popular opponents on the server with source and Pokemon filters", async () => {
    const onSelect = vi.fn();
    render(<CalculatorTeamPicker open side="opponent" library={library} onClose={vi.fn()} onSelect={onSelect} onAddPokemon={vi.fn()} isAdding={false} />);
    fireEvent.click(screen.getByRole("tab", { name: "Popular teams" }));
    expect(await screen.findByRole("button", { name: /Popular rain/ })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Name or source" }), { target: { value: "Regional" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Included Pokemon" }), { target: { value: "Pelipper" } });
    await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith({ text: "Regional", pokemon: "Pelipper" }));
    fireEvent.click(screen.getByRole("button", { name: /Popular rain/ }));
    expect(onSelect).toHaveBeenCalledWith(popular);
  });

  it("adds all completed Pokemon filter terms to My Team without selecting a saved team", async () => {
    const onAddPokemon = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CalculatorTeamPicker open side="own" library={library} onClose={onClose} onSelect={vi.fn()} onAddPokemon={onAddPokemon} isAdding={false} />);
    const filter = screen.getByRole("combobox", { name: "Included Pokemon" });
    fireEvent.change(filter, { target: { value: "Pelipper, Arch" } });
    expect(screen.getByRole("button", { name: "Add searched Pokemon" })).toBeDisabled();
    fireEvent.change(filter, { target: { value: "Pelipper," } });
    expect(screen.getByRole("button", { name: "Add searched Pokemon" })).toBeDisabled();
    fireEvent.change(filter, { target: { value: "Pelipper, Archaludon" } });
    fireEvent.click(screen.getByRole("button", { name: "Add searched Pokemon" }));
    await waitFor(() => expect(onAddPokemon).toHaveBeenCalledWith(["Pelipper", "Archaludon"]));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("adds Pokemon filters from popular opponents and keeps the dialog open on failure", async () => {
    const onAddPokemon = vi.fn().mockRejectedValue(new Error("Could not load set."));
    const onClose = vi.fn();
    render(<CalculatorTeamPicker open side="opponent" library={library} onClose={onClose} onSelect={vi.fn()} onAddPokemon={onAddPokemon} isAdding={false} />);
    fireEvent.click(screen.getByRole("tab", { name: "Popular teams" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Included Pokemon" }), { target: { value: "Pelipper, Archaludon" } });
    fireEvent.click(screen.getByRole("button", { name: "Add searched Pokemon" }));
    await waitFor(() => expect(onAddPokemon).toHaveBeenCalledWith(["Pelipper", "Archaludon"]));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load set.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("suggests a second Pokemon even when no saved team contains both", () => {
    render(<CalculatorTeamPicker open side="own" library={library} onClose={vi.fn()} onSelect={vi.fn()} onAddPokemon={vi.fn()} isAdding={false} />);
    const filter = screen.getByRole("combobox", { name: "Included Pokemon" });
    fireEvent.change(filter, { target: { value: "Pelipper, Arch" } });
    expect(screen.getByText("No teams match your search.")).toBeVisible();
    expect(screen.getByRole("option", { name: /Archaludon/ })).toBeVisible();
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(filter).toHaveValue("Pelipper, Archaludon");
    fireEvent.change(filter, { target: { value: "Pelipper, Archaludon, Garch" } });
    expect(screen.getByRole("option", { name: /^Garchomp0 teams$/ })).toBeVisible();
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(filter).toHaveValue("Pelipper, Archaludon, Garchomp");
  });

  it("suggests Champions Pokemon while a popular-team combination has no results", async () => {
    render(<CalculatorTeamPicker open side="opponent" library={library} onClose={vi.fn()} onSelect={vi.fn()} onAddPokemon={vi.fn()} isAdding={false} />);
    fireEvent.click(screen.getByRole("tab", { name: "Popular teams" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Included Pokemon" }), { target: { value: "Pelipper, Arch" } });
    expect(await screen.findByRole("option", { name: /Archaludon/ })).toBeVisible();
  });
});
