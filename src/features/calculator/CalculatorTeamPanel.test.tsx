import { fireEvent, render, screen } from "@testing-library/react";
import { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CalculatorTeamPanel } from "@/features/calculator/CalculatorTeamPanel";
import { battleBoostKey, clearBattleBoost, setBattleBoost, withBattleBoosts, type BattleBoostState } from "@/lib/pokemon/battle-boosts";
import { battleHpKey, clearBattleCurrentHp, setBattleCurrentHp, withBattleCurrentHp, type BattleHpState } from "@/lib/pokemon/battle-hp";
import { makeBattlePokemon } from "@/lib/pokemon/damage-calculation";
import type { BattlePokemon } from "@/lib/pokemon/damage-calculation";

const charizard = makeBattlePokemon({
  name: "Charizard", species: "Charizard", level: 50, item: "Charizardite Y",
  ability: "Blaze", nature: "Modest", evs: { spa: 32 }, ivs: {}, moves: ["Heat Wave"]
}, "charizard");

describe("calculator team forms", () => {
  it("switches the battle ability with the Mega form and exposes stat reset", async () => {
    const onResetStats = vi.fn();
    function Harness() {
      const [selected, setSelected] = useState<BattlePokemon>(charizard);
      return <CalculatorTeamPanel
        side="own" roster={{ slots: [selected], selectedId: selected.id, teamId: null }} selected={selected} isAdding={false}
        onOpenTeamPicker={vi.fn()} onAddPokemon={vi.fn()} onSelectPokemon={vi.fn()}
        onUpdatePokemon={setSelected} onChangeCurrentHp={vi.fn()} onChangeBoost={vi.fn()} canResetStats onResetStats={onResetStats}
        onRemovePokemon={vi.fn()} onSave={vi.fn()}
      />;
    }
    await act(async () => { render(<Harness />); await Promise.resolve(); });
    expect(screen.getByLabelText("Ability")).toHaveValue("Drought");
    const nature = screen.getByLabelText("Nature");
    expect(nature.querySelector('option[value="Modest"]')).toHaveTextContent("Modest (+SpA / -Atk)");
    const raised = screen.getByLabelText("Nature raises");
    const lowered = screen.getByLabelText("Nature lowers");
    expect(raised.querySelector('option[value="hp"]')).toBeNull();
    fireEvent.change(raised, { target: { value: "spe" } });
    expect(nature).toHaveValue("Timid");
    fireEvent.change(lowered, { target: { value: "spe" } });
    expect(nature).toHaveValue("Serious");
    await act(async () => { fireEvent.change(screen.getByLabelText("Forme"), { target: { value: "Charizard" } }); await Promise.resolve(); });
    expect(screen.getByLabelText("Ability")).toHaveValue("Blaze");
    await act(async () => { fireEvent.change(screen.getByLabelText("Forme"), { target: { value: "Charizard-Mega-Y" } }); await Promise.resolve(); });
    expect(screen.getByLabelText("Ability")).toHaveValue("Drought");
    fireEvent.click(screen.getByRole("button", { name: "Reset stats" }));
    expect(onResetStats).toHaveBeenCalledWith(expect.objectContaining({ forme: "Charizard-Mega-Y" }));
  }, 10000);

  it("keeps stages and HP when switching Pokemon and clears them on Reset stats", async () => {
    const pelipper = makeBattlePokemon({
      name: "Pelipper", species: "Pelipper", level: 50, ability: "Drizzle", item: "Sitrus Berry",
      nature: "Modest", evs: {}, ivs: {}, moves: ["Hurricane"]
    }, "pelipper");
    function Harness() {
      const [selectedId, setSelectedId] = useState(charizard.id);
      const [boosts, setBoosts] = useState<BattleBoostState>({});
      const [hp, setHp] = useState<BattleHpState>({});
      const selected = [charizard, pelipper].find((slot) => slot.id === selectedId)!;
      const key = battleBoostKey("own", selectedId);
      const hpKey = battleHpKey("own", selectedId);
      return <CalculatorTeamPanel
        side="own" roster={{ slots: [charizard, pelipper], selectedId, teamId: null }}
        selected={withBattleCurrentHp(withBattleBoosts(selected, boosts[key]), hp[hpKey])} isAdding={false}
        onOpenTeamPicker={vi.fn()} onAddPokemon={vi.fn()} onSelectPokemon={(id) => id && setSelectedId(id)}
        onUpdatePokemon={vi.fn()} onChangeCurrentHp={(pokemon, value) => setHp((current) => setBattleCurrentHp(current, "own", pokemon, value))}
        onChangeBoost={(id, stat, stage) => setBoosts((current) => setBattleBoost(current, "own", id, stat, stage))}
        canResetStats={Boolean(boosts[key] || hp[hpKey] !== undefined)} onResetStats={() => {
          setBoosts((current) => clearBattleBoost(current, "own", selectedId));
          setHp((current) => clearBattleCurrentHp(current, "own", selectedId));
        }}
        onRemovePokemon={vi.fn()} onSave={vi.fn()}
      />;
    }
    await act(async () => { render(<Harness />); await Promise.resolve(); });
    const stage = screen.getByRole("combobox", { name: "My Team SpA stage" });
    expect(stage).toHaveValue("0");
    expect(stage.querySelectorAll("option")).toHaveLength(13);
    expect(screen.queryByRole("combobox", { name: "My Team HP stage" })).not.toBeInTheDocument();
    fireEvent.change(stage, { target: { value: "3" } });
    expect(screen.getByRole("combobox", { name: "My Team SpA stage" })).toHaveValue("3");
    const slider = screen.getByRole("slider", { name: "My Team HP slider" });
    expect(slider).toHaveAttribute("min", "0");
    fireEvent.change(slider, { target: { value: "50" } });
    expect(slider).toHaveValue("50");
    expect(screen.getByRole("spinbutton", { name: "My Team current HP" })).toHaveValue(50);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Edit Pelipper" })); await Promise.resolve(); });
    expect(screen.getByRole("combobox", { name: "My Team SpA stage" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "My Team HP slider" })).not.toHaveValue("50");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Edit Charizard" })); await Promise.resolve(); });
    expect(screen.getByRole("combobox", { name: "My Team SpA stage" })).toHaveValue("3");
    expect(screen.getByRole("slider", { name: "My Team HP slider" })).toHaveValue("50");
    fireEvent.change(screen.getByRole("spinbutton", { name: "My Team current HP" }), { target: { value: "25" } });
    expect(screen.getByRole("slider", { name: "My Team HP slider" })).toHaveValue("25");
    fireEvent.click(screen.getByRole("button", { name: "Reset stats" }));
    expect(screen.getByRole("combobox", { name: "My Team SpA stage" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "My Team HP slider" })).not.toHaveValue("25");
  });
});
