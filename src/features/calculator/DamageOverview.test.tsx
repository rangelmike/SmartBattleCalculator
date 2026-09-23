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
      onSelectMove={vi.fn()} onRecord={onRecord} onRemoveObservation={vi.fn()} onPreset={vi.fn()} onNature={vi.fn()} onToggleEstimate={vi.fn()} />);
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
});
