import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalculatorWorkspace } from "@/features/calculator/CalculatorWorkspace";
import { addPokemonToRoster, emptyCalculatorSession, readCalculatorSession, writeCalculatorSession } from "@/lib/pokemon/calculator-session";

const mocks = vi.hoisted(() => ({ loadLibrary: vi.fn(), commonSet: vi.fn() }));
vi.mock("@/lib/supabase/teams", () => ({
  loadTeamLibrary: mocks.loadLibrary,
  saveTeamToLibrary: vi.fn()
}));
vi.mock("@/lib/supabase/popular-common-sets", () => ({ getPopularPokemonCommonSet: mocks.commonSet }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("sbc.calculator-session.batch-test");
  mocks.loadLibrary.mockResolvedValue({ own: [], opponent: [] });
  mocks.commonSet.mockImplementation((species: string) => Promise.resolve(species === "Pelipper" ? {
    item: "Sitrus Berry", ability: "Drizzle", nature: "Modest",
    evs: { hp: 32, spa: 32, spe: 2 }, moves: ["Hurricane", "Tailwind"]
  } : {
    item: "Leftovers", ability: "Stamina", nature: "Calm",
    evs: { hp: 32, spd: 32, def: 2 }, moves: ["Electro Shot", "Protect"]
  }));
});

describe("calculator Pokemon search batch", () => {
  it("adds every searched Pokemon with its saved common set", async () => {
    render(<CalculatorWorkspace profile={{ id: "batch-test", email: "trainer@example.com", username: "Trainer", isLocal: false }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Select team" })[0]);
    fireEvent.change(screen.getByRole("combobox", { name: "Included Pokemon" }), {
      target: { value: "Pelipper, Archaludon" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add searched Pokemon" }));

    await waitFor(() => expect(screen.getByRole("list", { name: "My Team roster" }).querySelectorAll('[role="listitem"]')).toHaveLength(2));
    expect(mocks.commonSet).toHaveBeenCalledWith("Pelipper");
    expect(mocks.commonSet).toHaveBeenCalledWith("Archaludon");
    const stored = readCalculatorSession("batch-test");
    expect(stored.own.slots.map((slot) => slot.member.species)).toEqual(["Pelipper", "Archaludon"]);
    expect(stored.own.slots[0].member).toMatchObject({
      item: "Sitrus Berry", ability: "Drizzle", nature: "Modest",
      evs: { hp: 32, spa: 32, spe: 2 }, moves: ["Hurricane", "Tailwind"]
    });
    expect(stored.own.slots[1].member).toMatchObject({
      item: "Leftovers", ability: "Stamina", nature: "Calm",
      evs: { hp: 32, spd: 32, def: 2 }, moves: ["Electro Shot", "Protect"]
    });
  }, 10000);

  it("keeps sprite-side stage controls synchronized with the stat tables", async () => {
    const own = {
      name: "Pelipper", species: "Pelipper", level: 50, item: "Sitrus Berry", ability: "Drizzle",
      nature: "Modest" as const, evs: {}, ivs: {}, moves: ["Hurricane"]
    };
    const opponent = {
      name: "Archaludon", species: "Archaludon", level: 50, item: "Leftovers", ability: "Stamina",
      nature: "Modest" as const, evs: {}, ivs: {}, moves: ["Electro Shot"]
    };
    const withOwn = addPokemonToRoster(emptyCalculatorSession(), "own", own, "own-1");
    writeCalculatorSession("batch-test", addPokemonToRoster(withOwn, "opponent", opponent, "opponent-1"));
    await act(async () => {
      render(<CalculatorWorkspace profile={{ id: "batch-test", email: "trainer@example.com", username: "Trainer", isLocal: true }} />);
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Raise My Team SpA stage" }));
    expect(screen.getByRole("combobox", { name: "My Team SpA stage near sprite" })).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "My Team SpA stage" })).toHaveValue("1");
    fireEvent.change(screen.getByRole("combobox", { name: "Opponent SpD stage near sprite" }), { target: { value: "-2" } });
    expect(screen.getByRole("combobox", { name: "Opponent Team SpD stage" })).toHaveValue("-2");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Opponent SpD stage near sprite" })).toHaveValue("-2"));
  }, 10000);
});
