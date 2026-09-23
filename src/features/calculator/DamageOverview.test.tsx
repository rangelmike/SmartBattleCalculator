import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DamageOverview } from "@/features/calculator/DamageOverview";
import { defaultBattleField, makeBattlePokemon } from "@/lib/pokemon/damage-calculation";

describe("recorded damage units", () => {
  it("records My Team damage as percent and opponent damage as HP", () => {
    const own = makeBattlePokemon({ name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry", nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"] });
    const opponent = makeBattlePokemon({ name: "Archaludon", species: "Archaludon", level: 50, ability: "Stamina", item: "Leftovers", nature: "Modest", evs: {}, ivs: {}, moves: ["Electro Shot"] });
    const onRecord = vi.fn();
    render(<DamageOverview own={own} opponent={opponent} field={defaultBattleField()} selectedMove={null} observations={[]} estimate={null} usingEstimate={false}
      onSelectMove={vi.fn()} onRecord={onRecord} onRemoveObservation={vi.fn()} onPreset={vi.fn()} onNature={vi.fn()} onToggleEstimate={vi.fn()} onChangeBoost={vi.fn()} />);
    const ownInput = screen.getByRole("spinbutton", { name: "My Team Hurricane observed damage (%)" });
    const opponentInput = screen.getByRole("spinbutton", { name: "Opponent Electro Shot observed damage (HP)" });
    expect(ownInput).toHaveAttribute("placeholder", "%");
    expect(opponentInput).toHaveAttribute("placeholder", "HP");
    fireEvent.change(ownInput, { target: { value: "31.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Hurricane damage" }));
    expect(onRecord).toHaveBeenCalledWith("own", "Hurricane", 31.5);
    fireEvent.change(opponentInput, { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Electro Shot damage" }));
    expect(onRecord).toHaveBeenCalledWith("opponent", "Electro Shot", 42);
  });

  it("provides five bounded stage controls beside each selected Pokemon", () => {
    const own = makeBattlePokemon({ name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry", nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"] });
    const opponent = { ...makeBattlePokemon({ name: "Archaludon", species: "Archaludon", level: 50, ability: "Stamina", item: "Leftovers", nature: "Modest", evs: {}, ivs: {}, moves: ["Electro Shot"] }), boosts: { spd: -6 } };
    const onChangeBoost = vi.fn();
    render(<DamageOverview own={own} opponent={opponent} field={defaultBattleField()} selectedMove={null} observations={[]} estimate={null} usingEstimate={false}
      onSelectMove={vi.fn()} onRecord={vi.fn()} onRemoveObservation={vi.fn()} onPreset={vi.fn()} onNature={vi.fn()} onToggleEstimate={vi.fn()} onChangeBoost={onChangeBoost} />);
    expect(screen.getByRole("group", { name: "My Team stat stages" }).querySelectorAll("select")).toHaveLength(5);
    expect(screen.getByRole("group", { name: "Opponent stat stages" }).querySelectorAll("select")).toHaveLength(5);
    expect(screen.queryByRole("combobox", { name: /HP stage near sprite/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Raise My Team Atk stage" }));
    expect(onChangeBoost).toHaveBeenCalledWith("own", own.id, "atk", 1);
    expect(screen.getByRole("button", { name: "Lower Opponent SpD stage" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Opponent Spe stage near sprite" }), { target: { value: "-2" } });
    expect(onChangeBoost).toHaveBeenCalledWith("opponent", opponent.id, "spe", -2);
  });

  it("places recoil and healing percentages beside each move's damage", () => {
    const own = makeBattlePokemon({ name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "", nature: "Modest", evs: {}, ivs: {}, moves: ["Wave Crash", "Giga Drain", "Recover", "Wish"] });
    const opponent = makeBattlePokemon({ name: "Archaludon", species: "Archaludon", level: 50, ability: "Stamina", item: "", nature: "Modest", evs: {}, ivs: {}, moves: ["Protect"] });
    render(<DamageOverview own={own} opponent={opponent} field={defaultBattleField()} selectedMove={null} observations={[]} estimate={null} usingEstimate={false}
      onSelectMove={vi.fn()} onRecord={vi.fn()} onRemoveObservation={vi.fn()} onPreset={vi.fn()} onNature={vi.fn()} onToggleEstimate={vi.fn()} onChangeBoost={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Wave Crash/ })).toHaveTextContent(/Recoil -[\d.]+/);
    expect(screen.getByRole("button", { name: /^Giga Drain/ })).toHaveTextContent(/Heal \+[\d.]+/);
    expect(screen.getByRole("button", { name: /^Recover/ })).toHaveTextContent(/Heal \+[\d.]+/);
    expect(screen.getByRole("button", { name: /^Wish/ })).toHaveTextContent(/Next turn \+[\d.]+/);
  });
});
